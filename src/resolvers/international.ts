/**
 * Resolvers for international materials:
 *  - UN Digital Library (resolutions, reports, treaty body documents) by document symbol
 *  - UN Treaty Collection (multilateral treaties deposited with the Secretary-General)
 *  - International Court of Justice (judgments and advisory opinions)
 *
 * All three were checked against the live services; test/fixtures holds
 * trimmed copies of real responses.
 */
import { collapse, englishDateToISO, similarity } from "../core/text";

export { englishDateToISO };
import type { Candidate, Env, Message } from "../core/types";
import UNTC_INDEX from "./data/untc-index.json";
import UN_GENERAL_COMMENTS from "./data/un-general-comments.json";
import { parseUNSymbol, type UNSymbol } from "../core/citations";
import type { Resolver } from "./index";
import { byLocalName, getXML } from "./util";

function htmlText(html: string): string {
	return collapse(
		html
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<[^>]+>/g, " | ")
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&#39;|&rsquo;/g, "'")
			.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))),
	).replace(/(\s*\|\s*)+/g, " | ");
}

// ---------------------------------------------------------------- UN Digital Library

interface MarcField {
	tag: string;
	sub: Record<string, string[]>;
}

function marcRecords(doc: Document): { id: string; fields: MarcField[] }[] {
	return byLocalName(doc, "record").map((rec) => {
		const id = byLocalName(rec, "controlfield").find((c) => c.getAttribute("tag") === "001")?.textContent ?? "";
		const fields = byLocalName(rec, "datafield").map((df) => {
			const sub: Record<string, string[]> = {};
			for (const sf of byLocalName(df, "subfield")) {
				const code = sf.getAttribute("code") ?? "";
				(sub[code] ??= []).push(collapse(sf.textContent ?? ""));
			}
			return { tag: df.getAttribute("tag") ?? "", sub };
		});
		return { id, fields };
	});
}

const first = (fields: MarcField[], tag: string, code: string) => fields.find((f) => f.tag === tag)?.sub[code]?.[0] ?? "";

/** Title from MARC 245 $a/$b without the cataloguing punctuation and generic subtitles. */
export function undlTitle(fields: MarcField[]): string {
	const strip = (s: string) => s.replace(/\s*[:/;,.]\s*$/, "").trim();
	// Older general comments: 245 is generic ("General comment adopted by the Human Rights
	// Committee under article 40 …"); the numbered title is in 246
	const alt = fields.filter((f) => f.tag === "246").map((f) => f.sub.a?.[0] ?? "").find((t) => /general (comment|recommendation) no/i.test(t));
	if (alt && !/\bno\.? ?\d/i.test(first(fields, "245", "a"))) return tidyGeneralCommentTitle(strip(alt));
	const a = strip(first(fields, "245", "a"));
	let b = strip(first(fields, "245", "b"));
	// "resolution / adopted by the General Assembly" carries no title information
	if (/^resolution$/i.test(b)) b = "";
	// "Article 6, Right to life : Human Rights Committee": drop the trailing body name
	const body = first(fields, "710", "a").replace(/^UN\.\s*/, "").replace(/\s*\(.*$/, "");
	if (body) b = b.replace(new RegExp("\\s*:\\s*" + body.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i"), "");
	const tidy = (x: string) => x.replace(/\s+:\s+/g, ": ").replace(/\s+;\s+/g, "; ");
	if (!b) return tidy(a);
	return tidy(`${a}: ${b.charAt(0).toUpperCase()}${b.slice(1)}`);
}

interface UNGeneralComment {
	committee: string;
	number: number;
	symbol: string;
	date: string;
	title: string;
}

/** Symbol of a treaty body's general comment/recommendation, from the bundled list. */
export function findGeneralComment(committee: string, number: number): UNGeneralComment | null {
	return (UN_GENERAL_COMMENTS as UNGeneralComment[]).find((g) => g.committee === committee && g.number === number) ?? null;
}

/** "General comment no. 22 (48) (article 18), Freedom of …": drop the session number "(48)". */
export function tidyGeneralCommentTitle(t: string): string {
	return collapse(t.replace(/^(general (?:comment|recommendation) no\.? ?\d+)\s*\(\d{1,3}\)/i, "$1").replace(/\s+:\s+/g, ": "));
}

const undlSearch = (env: Env, q: string) => getXML(env, `https://digitallibrary.un.org/search?p=${encodeURIComponent(q)}&of=xm&rg=10`);

function recordToCandidate(rec: { id: string; fields: MarcField[] }, symbolHint: UNSymbol | null, titleOverride?: string): Candidate {
	const symbol = (first(rec.fields, "191", "a") || symbolHint?.symbol || "").replace(/\s?\(/, " (");
	const un = parseUNSymbol(symbol) ?? symbolHint;
	const adopted = un?.resolution ? first(rec.fields, "992", "a") : "";
	const date = adopted || englishDateToISO(first(rec.fields, "269", "a")) || englishDateToISO(first(rec.fields, "260", "c"));
	return {
		source: "un-digital-library",
		fields: { title: titleOverride ?? undlTitle(rec.fields), date, reportType: "UN Doc", reportNumber: symbol },
		creators: un ? [{ creatorType: "author", name: un.body }] : undefined,
		extraLines: rec.id ? [`UN Digital Library: https://digitallibrary.un.org/record/${rec.id}`] : [],
		confidence: 1,
		// a catalogue title is not a reason to replace the user's own title
		tickExtensions: false,
	};
}

async function bySymbol(env: Env, un: UNSymbol) {
	const doc = await undlSearch(env, `191__q:${un.key}`);
	const target = un.symbol.replace(/\s/g, "").toUpperCase();
	return (
		marcRecords(doc).find((r) =>
			r.fields
				.filter((f) => f.tag === "191")
				.some((f) => (f.sub.a ?? []).some((a) => a.replace(/\s/g, "").toUpperCase() === target) || (f.sub.q ?? []).includes(un.key)),
		) ?? null
	);
}

export const unDigitalLibrary: Resolver = {
	id: "un-digital-library",
	applies: (item, d) => d.jurisdiction === "un" && (!!d.unSymbol || !!d.generalComment || !!(d.titleCitation?.title || item.fields.title)),
	async resolve(item, d, env) {
		// 1. By symbol
		if (d.unSymbol) {
			const rec = await bySymbol(env, d.unSymbol);
			return rec ? recordToCandidate(rec, d.unSymbol) : null;
		}
		// 2. General comments and recommendations: symbol from the bundled list
		if (d.generalComment) {
			const gc = findGeneralComment(d.generalComment.committee, d.generalComment.number);
			if (gc) {
				const un = parseUNSymbol(gc.symbol)!;
				const rec = await bySymbol(env, un);
				const title = tidyGeneralCommentTitle(gc.title);
				if (rec) return recordToCandidate(rec, un, title);
				return { source: "un-digital-library", fields: { title, date: gc.date, reportType: "UN Doc", reportNumber: gc.symbol }, confidence: 1, tickExtensions: false };
			}
			return {
				source: "un-digital-library",
				fields: {},
				confidence: 1,
				notes: [{ id: "oc-issue-un-gc-not-listed", args: { number: d.generalComment.number } }],
			};
		}
		// 3. Search by title (and body, and year when known); accept only one clear match
		const title = d.titleCitation?.title || item.fields.title || "";
		if (title.length < 8) return null;
		const year = /\b(19[4-9]\d|20\d\d)\b/.exec([item.fields.date, d.titleCitation?.date].filter(Boolean).join(" "))?.[1];
		// (the body is only used to filter the hits: the catalogue does not know "UNHRC")
		const doc = await undlSearch(env, [title, year ? `269__a:${year}*` : ""].filter(Boolean).join(" "));
		const hits: { rec: { id: string; fields: MarcField[] }; score: number; symbol: string }[] = [];
		for (const rec of marcRecords(doc)) {
			const symbol = first(rec.fields, "191", "a");
			const sym = parseUNSymbol(symbol);
			if (d.unBody && sym && sym.body !== "UN" && sym.body !== d.unBody.body) continue;
			const titles = [undlTitle(rec.fields), first(rec.fields, "245", "a"), ...rec.fields.filter((f) => f.tag === "246").map((f) => f.sub.a?.[0] ?? "")];
			const score = Math.max(...titles.map((t) => similarity(title, t)));
			if (score >= 0.85) hits.push({ rec, score, symbol });
		}
		hits.sort((a, b) => b.score - a.score);
		const best = hits[0];
		if (!best) return null;
		// Recurring reports share a title; without a year two documents may match equally well
		if (hits.some((h) => h.symbol !== best.symbol && best.score - h.score < 0.05)) {
			return { source: "un-digital-library", fields: {}, confidence: 1, notes: [{ id: "oc-issue-un-ambiguous", args: { symbols: hits.slice(0, 4).map((h) => h.symbol).join(", ") } }] };
		}
		return { ...recordToCandidate(best.rec, null), confidence: best.score };
	},
};

// ---------------------------------------------------------------- UN Treaty Collection

interface UNTCEntry {
	no: string;
	chapter: number;
	title: string;
	place: string;
	date: string;
}

export function findUNTCEntry(title: string, year?: string): { entry: UNTCEntry; score: number } | null {
	let best: { entry: UNTCEntry; score: number } | null = null;
	for (const entry of UNTC_INDEX as UNTCEntry[]) {
		let score = similarity(title, entry.title);
		if (year && entry.date && !entry.date.endsWith(year)) score -= 0.2;
		if (!best || score > best.score) best = { entry, score };
	}
	return best;
}

export function parseUNTCDetails(html: string): { title: string; adopted: string; place: string; entryIntoForce: string; volume: string; page: string } {
	const t = htmlText(html);
	const head = /CHAPTER [IVXL]+ \| [^|]+ \| (?:\d+\.\s*[a-z]?\.?\s*)?([^|]+?) \| ([^|,]+), (\d{1,2} \w+ \d{4})/.exec(t);
	const eif = /Entry into force \| : \| ([^|]+)/.exec(t)?.[1] ?? "";
	const unts = /Treaty Series \| , \| vol\. (\d+) \| , p\. (\d+)/.exec(t) ?? /Treaty Series,? vol\. (\d+),? p\. (\d+)/.exec(t);
	return {
		title: head?.[1].trim() ?? "",
		place: head?.[2].trim() ?? "",
		adopted: englishDateToISO(head?.[3]),
		entryIntoForce: englishDateToISO(eif),
		volume: unts?.[1] ?? "",
		page: unts?.[2] ?? "",
	};
}

export const untc: Resolver = {
	id: "untc",
	applies: (item, d) => d.jurisdiction === "treaty" && (!!d.untcNo || !!(item.fields.nameOfAct || item.fields.title)),
	async resolve(item, d, env) {
		let no = d.untcNo;
		let confidence = 1;
		if (!no) {
			const title = (item.fields.nameOfAct || item.fields.title || "").replace(/\s*\(.*$/, "");
			const year = /\b(1[89]\d\d|20\d\d)\b/.exec(item.fields.dateEnacted ?? item.fields.date ?? "")?.[1];
			const hit = findUNTCEntry(title, year);
			if (!hit || hit.score < 0.85) return null;
			no = { no: hit.entry.no, chapter: String(hit.entry.chapter) };
			confidence = hit.score;
		}
		const url = `https://treaties.un.org/Pages/ViewDetails.aspx?src=TREATY&mtdsg_no=${no.no}&chapter=${no.chapter}&clang=_en`;
		const t = parseUNTCDetails(await env.fetchText(url, { accept: "text/html" }));
		if (!t.title && !t.adopted) return null;
		const fields: Record<string, string> = { nameOfAct: t.title, dateEnacted: t.adopted };
		if (t.volume) Object.assign(fields, { code: "UNTS", codeNumber: t.volume, pages: t.page });
		const extraLines = ["Type: treaty"];
		if (t.entryIntoForce) extraLines.push(`event-date: ${t.entryIntoForce}`);
		extraLines.push(`UN Treaty Collection: ${url}`);
		return { source: "untc", fields, extraLines, confidence };
	},
};

// ---------------------------------------------------------------- International Court of Justice

const ICJ = "https://www.icj-cij.org";

export function parseICJList(html: string): { id: string; title: string; type: string }[] {
	const out: { id: string; title: string; type: string }[] = [];
	const re = /<a href="(?:\/|https:\/\/www\.icj-cij\.org\/)?case\/(\d+)">([\s\S]*?)<\/a>[\s\S]*?field-case-[^"]*">\s*(?:﻿)?\s*([A-Za-z]+)/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) out.push({ id: m[1], title: collapse(m[2].replace(/<[^>]+>/g, " ")), type: m[3] });
	return out;
}

export interface ICJDecision {
	kind: "Judgment" | "Advisory Opinion";
	date: string;
	phase: string;
}

export function parseICJCase(html: string): { title: string; decisions: ICJDecision[] } {
	const title = collapse((/field--name-title[^>]*>([\s\S]*?)<\/span>/.exec(html)?.[1] ?? "").replace(/<[^>]+>/g, ""));
	const t = htmlText(html);
	const decisions: ICJDecision[] = [];
	const re = /(Summary of the |Request for )?\b(Judgment|Advisory Opinion) of (\d{1,2} \w+ \d{4})(?: \| ([^|]{3,120}?) \|)?/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(t))) {
		if (m[1]) continue;
		const date = englishDateToISO(m[3]);
		if (!date || decisions.some((x) => x.date === date && x.kind === m![2])) continue;
		let phase = m[2] === "Advisory Opinion" ? "Advisory Opinion" : (m[4] ?? "").trim();
		if (/^Available in/i.test(phase) || /\d{4}/.test(phase)) phase = m[2] === "Advisory Opinion" ? "Advisory Opinion" : "";
		decisions.push({ kind: m[2] as ICJDecision["kind"], date, phase: shortPhase(phase) });
	}
	return { title, decisions };
}

/** OSCOLA uses short phase names: "(Jurisdiction and Admissibility)", "(Merits)". */
function shortPhase(p: string): string {
	return p
		.replace(/^Jurisdiction of the Court and Admissibility of the Application$/i, "Jurisdiction and Admissibility")
		.replace(/^Jurisdiction of the Court$/i, "Jurisdiction")
		.trim();
}

export const icj: Resolver = {
	id: "icj",
	applies: (item, d) => d.jurisdiction === "icj" && (!!d.icjCaseId || !!item.fields.caseName),
	async resolve(item, d, env) {
		let id = d.icjCaseId;
		let confidence = 1;
		const name = item.fields.caseName ?? "";
		if (!id) {
			const bare = name.replace(/\s*\((?:[^()]*(?:Advisory|Merits|Judgment|Objection|Measures|Jurisdiction|Order)[^()]*)\)\s*$/i, "");
			const cases = parseICJList(await env.fetchText(`${ICJ}/list-of-all-cases`, { accept: "text/html" }));
			let best: { id: string; score: number } | null = null;
			for (const c of cases) {
				const score = Math.max(similarity(bare, c.title), similarity(bare.replace(/\s*\(.*\)\s*$/, ""), c.title.replace(/\s*\(.*\)\s*$/, "")));
				if (!best || score > best.score) best = { id: c.id, score };
			}
			if (!best || best.score < 0.85) return null;
			id = best.id;
			confidence = best.score;
		}
		const url = `${ICJ}/case/${id}`;
		const c = parseICJCase(await env.fetchText(url, { accept: "text/html" }));
		if (!c.title) return null;

		const year = /\b(\d{4})\b/.exec(item.fields.dateDecided ?? "")?.[1];
		const inYear = year ? c.decisions.filter((x) => x.date.startsWith(year)) : c.decisions;
		const decision = inYear.length === 1 ? inYear[0] : null;
		const notes: Message[] = [];
		if (!decision && c.decisions.length > 1) {
			notes.push({ id: "oc-issue-icj-several", args: { dates: c.decisions.map((x) => `${x.date}${x.phase ? ` (${x.phase})` : ""}`).join("; ") } });
		}
		const title = c.title.replace(/\s+v\.\s+/g, " v ");
		const fields: Record<string, string> = {
			caseName: decision?.phase ? `${title} (${decision.phase})` : title,
			dateDecided: decision?.date ?? "",
			url,
		};
		return { source: "icj", fields, confidence, notes };
	},
};

