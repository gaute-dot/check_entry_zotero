/**
 * Identify a file that has no Zotero item yet, from its text (first pages)
 * and file name. The result is a minimal item holding the identifier that was
 * found; checkItem() then looks it up online and fills in the rest.
 */
import {
	normalizeDOI,
	normalizeISBN,
	parseECHRAppNo,
	parseECLI,
	parseEUCase,
	parseEULegislation,
	parseNeutralCitation,
	parseNorwegianAct,
	parseNorwegianCase,
	parseUNSymbol,
	looksLikeTreatyTitle,
	parseTreatySeries,
} from "./citations";
import { parseCoverPage, ssrnDOI } from "./cover";
import { collapse, englishDateToISO } from "./text";
import { guessMeta } from "./textmeta";
import type { ItemData } from "./types";

export interface FileInfo {
	/** Text of the first pages */
	text: string;
	/** File name, e.g. "A_HRC_43_52-EN.pdf" */
	filename: string;
	/** Attachment title in Zotero, if any */
	title?: string;
}

export interface Identified {
	item: ItemData;
	/** True when an identifier was found that an online source can look up */
	identified: boolean;
	/** What was recognised, for the review dialog, e.g. "A/HRC/43/52" */
	via: string;
}

const item = (itemType: string, fields: Record<string, string>): ItemData => ({ itemType, fields, creators: [] });

/** "A_HRC_43_52-EN.pdf" -> "A/HRC/43/52" (UN Digital Library and ODS file names) */
export function unSymbolFromFilename(filename: string): string | null {
	const base = filename.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_ ](?:AR|EN|ES|FR|RU|ZH|E|F|S)$/i, "");
	if (!/_/.test(base)) return null;
	const un = parseUNSymbol(base.replace(/_/g, "/"));
	return un && un.symbol.replace(/\s/g, "") === base.replace(/_/g, "/").replace(/\s/g, "") ? un.symbol : null;
}

/** Non-empty lines, trimmed */
function lines(text: string, max: number): string[] {
	return text
		.split(/\r?\n/)
		.map((l) => collapse(l))
		.filter(Boolean)
		.slice(0, max);
}

export function identifyFile(f: FileInfo): Identified {
	// Database cover pages (HeinOnline, JSTOR) carry the citation itself
	const cover = parseCoverPage(f.text);
	if (cover && cover.item.fields.title) return { item: cover.item, identified: true, via: cover.via };
	const ssrn = ssrnDOI(f.text);
	if (ssrn) return { item: item("journalArticle", { title: "", DOI: ssrn }), identified: true, via: `SSRN ${ssrn}` };
	if (cover) f = { ...f, text: cover.body };

	const head = f.text.slice(0, 4000);
	const top = lines(f.text, 12);
	const topText = top.join("\n");

	// ---- UN documents: the symbol is printed at the top and is in UN file names
	const fileSymbol = unSymbolFromFilename(f.filename);
	const headerSymbol = parseUNSymbol(top.slice(0, 8).join("\n"));
	const symbol = fileSymbol ?? (headerSymbol && /United Nations|Distr\.?|GENERAL|Nations Unies/i.test(topText) ? headerSymbol.symbol : null);
	if (symbol) {
		const fields: Record<string, string> = { reportNumber: symbol, title: "" };
		// Resolutions are cited with the adoption date, not the issue date in the header
		const date = parseUNSymbol(symbol)?.resolution
			? /adopted by the [^\n]*?(?:on|,)\s*(\d{1,2} \w+ \d{4})/i.exec(head.replace(/\n/g, " "))?.[1]
			: /Distr\.?:?\s*(?:General|GENERAL|Limited|LIMITED|Restricted)?\s*\n?\s*(\d{1,2} \w+\.? \d{4})/.exec(head)?.[1];
		if (date) fields.date = englishDateToISO(date);
		return { item: item("report", fields), identified: true, via: symbol };
	}

	// ---- ICJ: the Court prints the official citation in its decisions
	const icj = /Official citation\s*:?\s*([\s\S]{5,400}?),\s*(Advisory Opinion|Judgment|Order|Preliminary Objections?|Provisional Measures)[^,]*,\s*I\.\s?C\.\s?J\.\s*Reports\s+(\d{4}),?\s*p\.\s*(\d+)/i.exec(head.replace(/\s+/g, " "));
	if (icj) {
		const phase = icj[2].replace(/^Judgment$/i, "Judgment");
		return {
			item: item("case", {
				caseName: `${collapse(icj[1]).replace(/\s+v\.\s+/g, " v ")} (${phase})`,
				reporter: "ICJ Rep",
				firstPage: icj[4],
				dateDecided: icj[3],
				court: "ICJ",
			}),
			identified: true,
			via: `I.C.J. Reports ${icj[3]}, p. ${icj[4]}`,
		};
	}

	// ---- UK and Irish judgments: neutral citation at the top
	const ncn = parseNeutralCitation(topText) ?? parseNeutralCitation(/Neutral Citation(?: Number)?\s*:?\s*(\[[^\]]+\][^\n]+)/i.exec(head)?.[1]);
	if (ncn) return { item: item("case", { caseName: "", docketNumber: ncn.canonical }), identified: true, via: ncn.canonical };

	// ---- European Court of Human Rights
	if (/EUROPEAN COURT OF HUMAN RIGHTS|COUR EUROP[ÉE]ENNE DES DROITS DE L/i.test(head)) {
		const app = parseECHRAppNo(head);
		if (app) return { item: item("case", { caseName: "", court: "ECtHR", docketNumber: `App no ${app}` }), identified: true, via: `App no ${app}` };
	}

	// ---- Court of Justice of the EU
	const ecli = parseECLI(head);
	const euCase = /JUDGMENT OF THE (?:COURT|GENERAL COURT)|OPINION OF ADVOCATE GENERAL|ORDER OF THE COURT|In Case/i.test(head) ? parseEUCase(head) : null;
	if (euCase || ecli?.startsWith("ECLI:EU:")) {
		const fields: Record<string, string> = { caseName: "", docketNumber: euCase?.caseNumber ?? "" };
		if (ecli) fields.extra = `ECLI: ${ecli}`;
		return { item: item("case", fields), identified: true, via: euCase?.caseNumber ?? ecli! };
	}

	// ---- Norway
	const noCase = parseNorwegianCase(topText);
	if (noCase && noCase.kind === "HR") return { item: item("case", { caseName: "", docketNumber: noCase.canonical }), identified: true, via: noCase.canonical };
	const noAct = parseNorwegianAct(head);
	if (noAct) return { item: item("statute", { nameOfAct: "", publicLawNumber: noAct.id }), identified: true, via: noAct.id };

	// ---- UK legislation: "Equality Act 2010 / CHAPTER 15", "STATUTORY INSTRUMENTS / 2010 No. 1234"
	const act = /^(.{3,150}? Act \d{4})\n(?:\d{4} )?CHAPTER (\d+)\b/m.exec(top.join("\n"));
	if (act) {
		const year = /(\d{4})$/.exec(act[1])![1];
		return {
			item: item("statute", { nameOfAct: act[1], url: `https://www.legislation.gov.uk/ukpga/${year}/${act[2]}` }),
			identified: true,
			via: `${act[1]} c ${act[2]}`,
		};
	}
	const si = /STATUTORY INSTRUMENTS\s*\n?\s*(\d{4}) No\.\s*(\d+)/i.exec(head);
	if (si) {
		return {
			item: item("statute", { nameOfAct: "", url: `https://www.legislation.gov.uk/uksi/${si[1]}/${si[2]}` }),
			identified: true,
			via: `SI ${si[1]}/${si[2]}`,
		};
	}

	// ---- EU legislation
	if (/Official Journal of the European Union|Journal officiel de l'Union/i.test(head)) {
		const leg = parseEULegislation(head);
		if (leg) return { item: item("statute", { nameOfAct: `CELEX ${leg.celex}`, extra: `CELEX: ${leg.celex}` }), identified: true, via: leg.celex };
	}

	// ---- Treaties: title on the first lines, or a UNTS reference
	const treatyLine = top.slice(0, 4).find((l) => looksLikeTreatyTitle(l) && l.length < 250);
	if (treatyLine) {
		const fields: Record<string, string> = { nameOfAct: treatyLine, extra: "Type: treaty" };
		const ts = parseTreatySeries(head);
		if (ts?.volume) Object.assign(fields, { code: ts.series, codeNumber: ts.volume, pages: ts.page ?? "" });
		return { item: item("statute", fields), identified: true, via: treatyLine };
	}

	// ---- Academic material
	const doi = normalizeDOI(head);
	if (doi) return { item: item("journalArticle", { title: "", DOI: doi }), identified: true, via: `DOI ${doi}` };
	const isbn = /ISBN[\s:-]*([\d\s-]{10,17}[\dX])/i.exec(f.text.slice(0, 12000))?.[1];
	if (isbn && normalizeISBN(isbn)) return { item: item("book", { title: "", ISBN: normalizeISBN(isbn)! }), identified: true, via: `ISBN ${normalizeISBN(isbn)}` };

	// ---- Nothing recognised: a draft from what the text suggests
	const g = guessMeta(f.text);
	// fall back on the attachment title or file name, unless it is meaningless ("Full Text PDF", "download", "85071237-https…")
	const name = (f.title && !/^(Full Text PDF|PDF|Snapshot|Attachment)$/i.test(f.title) ? f.title : f.filename.replace(/\.[a-z0-9]{2,5}$/i, "")).replace(/[_-]+/g, " ").trim();
	const meaningful = name.split(" ").filter((w) => /^[A-Za-zÀ-ÿ]{3,}$/.test(w)).length >= 2 && !/https?|www|download|scan|untitled|document\b/i.test(name);
	const title = g.title ?? (meaningful ? name : "");
	const full = englishDateToISO(head);
	const draft = item("document", { title, date: full && (!g.year || full.startsWith(g.year)) ? full : (g.year ?? "") });
	if (g.creators) draft.creators = g.creators;
	return { item: draft, identified: false, via: "" };
}
