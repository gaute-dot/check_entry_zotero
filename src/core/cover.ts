/**
 * Cover pages that databases put in front of downloaded PDFs:
 *  - HeinOnline: ready-made citations in several styles (Bluebook, APA, Chicago …)
 *  - JSTOR: title, authors, "Source: Journal, Vol. 25, No. 1 (2005), pp. 1-24"
 *  - SSRN: "Electronic copy available at: https://ssrn.com/abstract=123456"
 * Each citation on a Hein cover page has gaps or OCR errors, so the item is
 * assembled from several of them.
 */
import { collapse } from "./text";
import type { Creator, ItemData } from "./types";

export interface CoverResult {
	item: ItemData;
	/** Which database, for the review dialog */
	via: string;
	/** Text of the document without the cover page */
	body: string;
}

/** "Raphael Lemkin", "John Smith & Jane Doe", "A. B. Smith, C. Jones & D. Brown" -> creators */
export function namesToCreators(s: string, creatorType = "author"): Creator[] {
	return s
		.replace(/\s+et al\.?$/i, "")
		.split(/\s*(?:,\s*(?:and|&)\s*|\s+(?:and|&)\s+|,\s+)\s*/)
		.map((n) => n.trim())
		.filter((n) => n.length > 1 && /[A-Za-zÀ-ÿ]/.test(n))
		.map((n) => {
			const parts = n.split(/\s+/);
			if (parts.length === 1) return { creatorType, name: n };
			let i = parts.length - 1;
			while (i > 1 && /^(van|von|de|der|den|da|di|du|la|le)$/i.test(parts[i - 1])) i--;
			return { creatorType, firstName: parts.slice(0, i).join(" "), lastName: parts.slice(i).join(" ") };
		});
}

/** APA author list "Lemkin, R., & Smith, J." -> surnames, used only to check other sources */
function apaSurnames(s: string): string[] {
	return [...s.matchAll(/([A-ZÀ-Þ][\p{L}'’-]+(?: [A-ZÀ-Þ][\p{L}'’-]+)*),\s*(?:[A-Z]\.\s*)+/gu)].map((m) => m[1]);
}

const subtitle = (t: string) => collapse(t).replace(/\s*;\s+/, ": ").replace(/[.,]\s*$/, "");

// ---------------------------------------------------------------- HeinOnline

const HEIN_LABEL = /^(Bluebook|ALWD|APA|Chicago|McGill Guide|AGLC|MLA|OSCOLA)\b[^\n]*\bed\.\s*$/;

export function parseHeinCover(text: string): CoverResult | null {
	if (!/heinonline\.org/i.test(text.slice(0, 400)) || !/CITATIONS:/.test(text.slice(0, 1500))) return null;
	const end = /HeinOnline is a product of[^\n]*\n|Terms, Conditions & Use of PDF Document:[\s\S]*?\n\n/.exec(text);
	const cover = end ? text.slice(0, end.index + end[0].length) : text.slice(0, 4000);
	const body = end ? text.slice(end.index + end[0].length) : text;

	// Collect "Label\ncitation lines…"
	const cites: Record<string, string> = {};
	let label: string | null = null;
	for (const line of cover.split(/\r?\n/)) {
		const m = HEIN_LABEL.exec(line.trim());
		if (m) {
			label = m[1];
			cites[label] = "";
		} else if (label && line.trim() && !/^Date Downloaded/i.test(line)) {
			cites[label] += " " + line.trim();
		} else if (/^Date Downloaded/i.test(line)) label = null;
	}
	for (const k of Object.keys(cites)) cites[k] = collapse(cites[k]);
	const bb = cites.Bluebook ?? cites.ALWD ?? "";
	const apa = cites.APA ?? "";
	const chicago = cites.Chicago ?? "";
	const source = /Source:\s*(https?:\/\/heinonline\.org\/\S+)/.exec(cover)?.[1] ?? "";
	const extra = source ? [`HeinOnline: ${source}`] : [];

	// Journal article: Bluebook "Author, Title, 25 Oxford J. Legal Stud. 1 (2005)." / APA "…, Journal, 25(1), 1-24."
	const bbArt = /^(.+?), (.+), (\d+) ([^,]+?) (\d+) \((\d{4})\)\.?$/.exec(bb);
	const apaArt = /^(.+?) \((\d{4})\)\. (.+?)\. ([^.]+?), (\d+)(?:\((\d+)\))?, (\d+)(?:\s*[-–]\s*(\d+))?\.?/.exec(apa);
	if (bbArt || apaArt) {
		const fields: Record<string, string> = {
			title: subtitle(bbArt?.[2] ?? apaArt![3]),
			date: bbArt?.[6] ?? apaArt![2],
			publicationTitle: apaArt?.[4] ?? bbArt![4],
			volume: bbArt?.[3] ?? apaArt![5],
			pages: apaArt ? apaArt[7] + (apaArt[8] ? `-${apaArt[8]}` : "") : bbArt![5],
		};
		if (apaArt?.[6]) fields.issue = apaArt[6];
		if (bbArt) fields.journalAbbreviation = bbArt[4];
		fields.extra = extra.join("\n");
		const creators = bbArt ? namesToCreators(bbArt[1]) : apaSurnames(apaArt![1]).map((n) => ({ creatorType: "author", lastName: n, firstName: "" }));
		return { item: { itemType: "journalArticle", fields, creators }, via: "HeinOnline", body };
	}

	// Book: Bluebook "Author, Title (2d ed. 1944)." / APA "Author (1944). Title. Place, Publisher."
	const bbBook = /^(.+?), (.+?) \((?:([^()]*?)\s)?(\d{4})\)\.?$/.exec(bb);
	const apaBook = /^(.+?) \((\d{4})\)\. (.+?)\. (.+?)\.?$/.exec(apa);
	if (bbBook || apaBook) {
		const fields: Record<string, string> = {
			title: subtitle(bbBook?.[2] ?? apaBook![3]),
			date: bbBook?.[4] ?? apaBook![2],
		};
		const edition = /(\d+)(?:st|nd|rd|th|d) ed\./.exec(bbBook?.[3] ?? "")?.[1];
		if (edition) fields.edition = edition;
		// "Washington, Carnegie Endowment …" (APA/Chicago put place, publisher after the title)
		const tail = apaBook?.[4] ?? /\.\s([^.]+,[^.]+)\.?$/.exec(chicago)?.[1] ?? "";
		const pp = /^([A-Z][A-Za-z .]+?), (.+)$/.exec(tail);
		if (pp && pp[1].split(" ").length <= 3) {
			fields.place = pp[1];
			fields.publisher = pp[2].replace(/\.$/, "");
		} else if (tail) fields.publisher = tail.replace(/\.$/, "");
		fields.extra = extra.join("\n");
		const creators = bbBook ? namesToCreators(bbBook[1]) : apaSurnames(apaBook![1]).map((n) => ({ creatorType: "author", lastName: n, firstName: "" }));
		return { item: { itemType: "book", fields, creators }, via: "HeinOnline", body };
	}
	return null;
}

// ---------------------------------------------------------------- JSTOR

export function parseJstorCover(text: string): CoverResult | null {
	const head = text.slice(0, 3000);
	if (!/jstor\.org\/stable\//i.test(head)) return null;
	const lines = head.split(/\r?\n/).map((l) => l.trim());
	const ai = lines.findIndex((l) => /^Author\(s\):/i.test(l));
	const si = lines.findIndex((l) => /^Source:/i.test(l));
	if (si < 0) return null;
	const titleEnd = ai >= 0 ? ai : si;
	const title = collapse(lines.slice(0, titleEnd).filter(Boolean).join(" "));
	const authors = ai >= 0 ? collapse(lines.slice(ai, si).join(" ").replace(/^Author\(s\):\s*/i, "")) : "";
	let src = lines[si].replace(/^Source:\s*/i, "");
	for (let i = si + 1; i < lines.length && lines[i] && !/^(Published by|Stable URL|Accessed|Your use)/i.test(lines[i]); i++) src += " " + lines[i];
	const m = /^(.+?),\s*Vol\.\s*(\w+)(?:,\s*No\.\s*([\w/ -]+?))?\s*\(([^)]*?(\d{4}))\)(?:,\s*pp?\.\s*([\d]+(?:-\d+)?))?/.exec(src);
	const stable = /(https?:\/\/www\.jstor\.org\/stable\/\d+)/.exec(head)?.[1] ?? "";
	const publisher = /^Published by:\s*(.+)$/m.exec(head)?.[1]?.trim() ?? "";
	const fields: Record<string, string> = { title: subtitle(title) };
	if (m) Object.assign(fields, { publicationTitle: m[1], volume: m[2], issue: m[3] ?? "", date: m[5], pages: m[6] ?? "" });
	if (publisher) fields.publisher = publisher;
	if (stable) fields.url = stable;
	const end = /(?:JSTOR is a not-for-profit|Your use of the JSTOR archive)[\s\S]*?\n\n/.exec(text);
	return { item: { itemType: "journalArticle", fields, creators: namesToCreators(authors) }, via: "JSTOR", body: end ? text.slice(end.index + end[0].length) : text };
}

// ---------------------------------------------------------------- SSRN

export function ssrnDOI(text: string): string | null {
	const m = /ssrn\.com\/abstract[=_](\d{4,9})/i.exec(text.slice(0, 20000));
	return m ? `10.2139/ssrn.${m[1]}` : null;
}

export function parseCoverPage(text: string): CoverResult | null {
	return parseHeinCover(text) ?? parseJstorCover(text);
}
