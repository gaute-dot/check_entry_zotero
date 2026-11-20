/**
 * Resolvers for primary legal sources.
 *
 * None of these services could be reached from the environment this plugin
 * was developed in, so the response formats below are taken from their
 * public documentation and tested against hand-written fixtures. Each
 * resolver fails soft: a network or parsing error becomes an "info" issue in
 * the review dialog rather than stopping the check.
 */
import { findCaseLawPath, norwegianDate, parseNeutralCitation } from "../core/citations";
import type { Detected } from "../core/detect";
import { collapse, similarity, tidyCaseName } from "../core/text";
import type { Candidate, Env, ItemData } from "../core/types";
import type { Resolver } from "./index";
import { byLocalName, firstByLocalName, getJSON, getXML, textOf } from "./util";

// ---------------------------------------------------------------- legislation.gov.uk

const LEG = "https://www.legislation.gov.uk";

function ukLegCandidate(doc: Document, type: string, year: string, number: string): Candidate | null {
	const title = textOf(firstByLocalName(doc, "title"));
	if (!title) return null;
	const enacted =
		firstByLocalName(doc, "EnactmentDate")?.getAttribute("Date") ??
		firstByLocalName(doc, "Made")?.getAttribute("Date") ??
		"";
	const isPrimary = !/si$|sr$/.test(type);
	const fields: Record<string, string> = {
		// The OSCOLA style appends the year itself
		nameOfAct: isPrimary ? title.replace(/\s+\d{4}$/, "") : title,
		dateEnacted: enacted || year,
		url: `${LEG}/${type}/${year}/${number}`,
	};
	if (!isPrimary) fields.publicLawNumber = `${type === "ssi" ? "SSI" : type === "nisr" ? "SR" : "SI"} ${year}/${number}`;
	return { source: "legislation-gov-uk", fields, confidence: 1 };
}

export const legislationGovUk: Resolver = {
	id: "legislation-gov-uk",
	applies: (item, d) =>
		item.itemType === "statute" && (!!d.ukLegislation || (d.jurisdiction === "unknown" && /\b(Act|Regulations|Order|Rules)\b/.test(item.fields.nameOfAct ?? ""))),
	async resolve(item, d, env) {
		if (d.ukLegislation) {
			const { type, year, number } = d.ukLegislation;
			return ukLegCandidate(await getXML(env, `${LEG}/${type}/${year}/${number}/data.xml`), type, year, number);
		}
		// Search by title (and year, if known)
		const name = (item.fields.nameOfAct ?? "").trim();
		const year = /\b(1[2-9]\d\d|20\d\d)\b/.exec(item.fields.dateEnacted ?? "")?.[1] ?? /\b(1[2-9]\d\d|20\d\d)$/.exec(name)?.[1];
		const bare = name.replace(/\s+\d{4}$/, "");
		const kind = /\bAct\b/.test(bare) ? "primary" : "secondary";
		const feed = await getXML(env, `${LEG}/${kind}/data.feed?title=${encodeURIComponent(bare)}${year ? `&year=${year}` : ""}`);
		let best: { score: number; id: string } | null = null;
		for (const entry of byLocalName(feed, "entry")) {
			const t = textOf(firstByLocalName(entry, "title"));
			const id = textOf(firstByLocalName(entry, "id"));
			const score = similarity(year ? `${bare} ${year}` : bare, t);
			if (!best || score > best.score) best = { score, id };
		}
		if (!best || best.score < 0.85) return null;
		const m = /\/(?:id\/)?([a-z]+)\/(\d{4})\/(\d+)/.exec(best.id);
		if (!m) return null;
		const c = ukLegCandidate(await getXML(env, `${LEG}/${m[1]}/${m[2]}/${m[3]}/data.xml`), m[1], m[2], m[3]);
		return c && { ...c, confidence: best.score };
	},
};

// ---------------------------------------------------------------- Find Case Law (The National Archives)

const FCL = "https://caselaw.nationalarchives.gov.uk";

export function parseFCLJudgment(doc: Document): { name: string; date: string; ncn: string } {
	const name = firstByLocalName(doc, "FRBRname")?.getAttribute("value") ?? "";
	const dates = byLocalName(doc, "FRBRdate");
	const judgmentDate = dates.find((e) => /judgment|decision/i.test(e.getAttribute("name") ?? "")) ?? dates[0];
	const ncn = textOf(firstByLocalName(doc, "cite"));
	// Find Case Law tags appeals from Scotland/Northern Ireland in the name; OSCOLA does not
	const tidy = collapse(name).replace(/\s*\((?:Scotland|Northern Ireland|NI)\)\s*$/, "");
	return { name: tidy, date: judgmentDate?.getAttribute("date") ?? "", ncn };
}

export const findCaseLaw: Resolver = {
	id: "find-case-law",
	applies: (item, d) => item.itemType === "case" && d.jurisdiction === "uk" && (!!d.ncn || !!item.fields.caseName),
	async resolve(item, d, env) {
		const path = d.ncn ? findCaseLawPath(d.ncn) : null;
		if (path) {
			const j = parseFCLJudgment(await getXML(env, `${FCL}/${path}/data.xml`));
			return {
				source: "find-case-law",
				fields: { caseName: j.name, dateDecided: j.date, url: `${FCL}/${path}` },
				confidence: 1,
			};
		}
		if (d.ncn) return null; // court not covered by Find Case Law
		// No neutral citation: search by name and only accept a near-exact match
		const name = item.fields.caseName ?? "";
		const feed = await getXML(env, `${FCL}/atom.xml?query=${encodeURIComponent(`"${name}"`)}&per_page=10`);
		const year = /\b(\d{4})\b/.exec(item.fields.dateDecided ?? "")?.[1];
		let best: { score: number; entry: Element } | null = null;
		for (const entry of byLocalName(feed, "entry")) {
			const score = similarity(name, textOf(firstByLocalName(entry, "title")));
			if (!best || score > best.score) best = { score, entry };
		}
		if (!best || best.score < 0.9) return null;
		const e = best.entry;
		const ncn = parseNeutralCitation(e.textContent ?? "");
		const published = textOf(firstByLocalName(e, "published")) || textOf(firstByLocalName(e, "updated"));
		if (year && ncn && ncn.year !== year) return null;
		const link = byLocalName(e, "link").find((l) => !l.getAttribute("type") || l.getAttribute("rel") === "alternate");
		const fields: Record<string, string> = {
			caseName: textOf(firstByLocalName(e, "title")),
			url: link?.getAttribute("href") ?? "",
			dateDecided: published.slice(0, 10),
		};
		const extraLines: string[] = [];
		if (ncn) {
			fields.court = ncn.court;
			fields.docketNumber = ncn.number + (ncn.division ? ` (${ncn.division})` : "");
		}
		return { source: "find-case-law", fields, extraLines, confidence: best.score };
	},
};

// ---------------------------------------------------------------- EUR-Lex (Publications Office SPARQL endpoint)

const SPARQL = "https://publications.europa.eu/webapi/rdf/sparql";

interface SparqlRow {
	[k: string]: { value: string } | undefined;
}

async function sparql(env: Env, query: string): Promise<SparqlRow[]> {
	const url = `${SPARQL}?query=${encodeURIComponent(query)}&format=${encodeURIComponent("application/sparql-results+json")}`;
	// The endpoint answers 406 to a plain "application/json" Accept header
	const res = await getJSON<{ results: { bindings: SparqlRow[] } }>(env, url, "application/sparql-results+json");
	return res.results?.bindings ?? [];
}

export function eurLexQuery(by: { celex?: string; ecli?: string }, lang = "ENG"): string {
	const subject = by.celex
		? `?work cdm:resource_legal_id_celex "${by.celex}"^^xsd:string .`
		: `?work cdm:case-law_ecli "${by.ecli}"^^xsd:string .`;
	return `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?celex ?date ?ecli ?title WHERE {
  ${subject}
  OPTIONAL { ?work cdm:resource_legal_id_celex ?celex . }
  OPTIONAL { ?work cdm:work_date_document ?date . }
  OPTIONAL { ?work cdm:case-law_ecli ?ecli . }
  OPTIONAL {
    ?expr cdm:expression_belongs_to_work ?work ;
          cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/${lang}> ;
          cdm:expression_title ?title .
  }
} LIMIT 1`;
}

/**
 * EUR-Lex case titles look like
 * "Judgment of the Court (Grand Chamber) of 13 September 2005.#Commission ... v Council ...#Environmental protection ...#Case C-176/03."
 */
export function eurLexCaseParties(title: string): string {
	const parts = title.split("#").map((s) => s.trim().replace(/\.$/, ""));
	return parts.find((p) => / v /.test(p)) ?? "";
}

export const eurLex: Resolver = {
	id: "eur-lex",
	applies: (item, d) =>
		(item.itemType === "case" && (!!d.euCase || !!d.ecli?.startsWith("ECLI:EU:"))) ||
		(item.itemType === "statute" && !!d.euLegislation),
	async resolve(item, d, env) {
		if (item.itemType === "statute") {
			const celex = d.euLegislation!.celex;
			const row = (await sparql(env, eurLexQuery({ celex })))[0];
			if (!row) return null;
			const title = collapse((row.title?.value ?? "").replace(/\(Text with EEA relevance\)/i, ""));
			return {
				source: "eur-lex",
				fields: {
					nameOfAct: title,
					dateEnacted: (row.date?.value ?? "").slice(0, 10),
					url: `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`,
				},
				extraLines: [`CELEX: ${celex}`],
				confidence: 1,
			};
		}
		const by = d.euCase ? { celex: d.euCase.celex } : { ecli: d.ecli! };
		const row = (await sparql(env, eurLexQuery(by)))[0];
		if (!row) return null;
		const celex = row.celex?.value ?? d.euCase?.celex ?? "";
		const fields: Record<string, string> = {
			dateDecided: (row.date?.value ?? "").slice(0, 10),
			url: celex ? `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}` : "",
		};
		const parties = eurLexCaseParties(row.title?.value ?? "");
		if (!item.fields.caseName && parties) fields.caseName = d.euCase ? `Case ${d.euCase.caseNumber} ${parties}` : parties;
		const extraLines = [] as string[];
		if (celex) extraLines.push(`CELEX: ${celex}`);
		if (row.ecli?.value) extraLines.push(`ECLI: ${row.ecli.value}`);
		return { source: "eur-lex", fields, extraLines, confidence: 1 };
	},
};

// ---------------------------------------------------------------- HUDOC (European Court of Human Rights)

interface HudocResult {
	columns: {
		itemid?: string;
		docname?: string;
		appno?: string;
		kpdate?: string;
		ecli?: string;
		languageisocode?: string;
		doctypebranch?: string;
		documentcollectionid2?: string;
	};
}

export function parseHudocDate(s: string | undefined): string {
	if (!s) return "";
	let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
	if (m) return `${m[1]}-${m[2]}-${m[3]}`;
	m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); // M/D/YYYY
	if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
	return "";
}

export const hudoc: Resolver = {
	id: "hudoc",
	applies: (item, d) => item.itemType === "case" && d.jurisdiction === "echr" && !!d.echrAppNo,
	async resolve(item, d, env) {
		const query = `contentsitename:ECHR AND (appno:"${d.echrAppNo}") AND (documentcollectionid2:"JUDGMENTS" OR documentcollectionid2:"DECISIONS")`;
		const url =
			"https://hudoc.echr.coe.int/app/query/results?query=" +
			encodeURIComponent(query) +
			"&select=itemid,docname,appno,kpdate,ecli,languageisocode,doctypebranch,documentcollectionid2&sort=&start=0&length=50";
		const res = await getJSON<{ results?: HudocResult[] }>(env, url);
		const rows = (res.results ?? []).map((r) => r.columns);
		// Prefer the English judgment over admissibility decisions and translations
		const isJudgment = (r: HudocResult["columns"]) => /(^|;)JUDGMENTS(;|$)/.test(r.documentcollectionid2 ?? "");
		const row =
			rows.find((r) => r.languageisocode === "ENG" && isJudgment(r)) ??
			rows.find((r) => r.languageisocode === "ENG") ??
			rows[0];
		if (!row) return null;
		const extraLines = row.ecli ? [`ECLI: ${row.ecli}`] : [];
		return {
			source: "hudoc",
			fields: {
				caseName: tidyCaseName(row.docname ?? ""),
				dateDecided: parseHudocDate(row.kpdate),
				court: "ECtHR",
				url: row.itemid ? `https://hudoc.echr.coe.int/eng?i=${row.itemid}` : "",
			},
			extraLines,
			confidence: 1,
		};
	},
};

// ---------------------------------------------------------------- Lovdata (Norwegian statutes and regulations)

/** Pull "<th>Label</th><td>Value</td>" pairs out of a Lovdata document page. */
export function parseLovdataPage(html: string): { title: string; meta: Record<string, string> } {
	const strip = (s: string) =>
		collapse(
			s
				.replace(/<[^>]+>/g, " ")
				.replace(/&nbsp;/g, " ")
				.replace(/&amp;/g, "&")
				.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))),
		);
	const meta: Record<string, string> = {};
	const re = /<(?:th|dt)[^>]*>([\s\S]*?)<\/(?:th|dt)>\s*<(?:td|dd)[^>]*>([\s\S]*?)<\/(?:td|dd)>/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) meta[strip(m[1]).replace(/:$/, "")] = strip(m[2]);
	// Lovdata pages have several screen-reader <h1>s ("Hovedmeny"); the <title> is reliable
	const t = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1];
	const h1 = /<h1(?![^>]*sr-only)[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
	const title = strip(meta["Tittel"] ?? (t ? t.replace(/\s*-\s*Lovdata\s*$/i, "") : h1 ?? ""));
	return { title, meta };
}

export const lovdata: Resolver = {
	id: "lovdata",
	applies: (item, d) => item.itemType === "statute" && !!d.noAct,
	async resolve(item, d, env) {
		const act = d.noAct!;
		const path = `${act.kind}/${act.date}-${act.number}`;
		const html = await env.fetchText(`https://lovdata.no/dokument/${act.kind === "lov" ? "NL" : "SF"}/${path}`, {
			accept: "text/html",
		});
		const { title, meta } = parseLovdataPage(html);
		if (!title) return null;
		const body = title.replace(/^(lov|forskrift)\s+(?:av\s+)?(?:\d{1,2}\.\s*\S+\s+\d{4}\s+nr\.?\s*\d+\s*)?/i, "");
		const prefix = `${act.kind === "lov" ? "Lov" : "Forskrift"} ${norwegianDate(act.date)} nr. ${act.number}`;
		const shortTitle = (meta["Korttittel"] ?? "").split(/\s+[–-]\s+/)[0];
		return {
			source: "lovdata",
			fields: {
				nameOfAct: `${prefix} ${body}`.trim(),
				dateEnacted: act.date,
				publicLawNumber: act.id,
				shortTitle: act.kind === "lov" && shortTitle ? shortTitle.charAt(0).toLowerCase() + shortTitle.slice(1) : shortTitle,
				url: `https://lovdata.no/${path}`,
				language: "nb",
			},
			confidence: 1,
		};
	},
};
