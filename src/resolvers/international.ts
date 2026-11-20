/**
 * Resolvers for international materials:
 *  - UN Digital Library (resolutions, reports, treaty body documents) by document symbol
 *  - UN Treaty Collection (multilateral treaties deposited with the Secretary-General)
 *  - International Court of Justice (judgments and advisory opinions)
 *
 * All three were checked against the live services; test/fixtures holds
 * trimmed copies of real responses.
 */
import { collapse, similarity } from "../core/text";
import type { Message } from "../core/types";
import UNTC_INDEX from "./data/untc-index.json";
import type { Resolver } from "./index";
import { byLocalName, getXML } from "./util";

const MONTHS: Record<string, number> = {
	jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "10 December 1984", "8 Jan. 2016", "3 Sept. 2019" -> ISO date; "" if not recognised */
export function englishDateToISO(s: string | undefined): string {
	if (!s) return "";
	const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(s);
	if (iso) return iso[0];
	const m = /\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})\b/.exec(s);
	if (!m || !MONTHS[m[2].toLowerCase()]) return "";
	return `${m[3]}-${String(MONTHS[m[2].toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

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

export const unDigitalLibrary: Resolver = {
	id: "un-digital-library",
	applies: (_item, d) => d.jurisdiction === "un" && !!d.unSymbol,
	async resolve(item, d, env) {
		const un = d.unSymbol!;
		const doc = await getXML(env, `https://digitallibrary.un.org/search?p=${encodeURIComponent(`191__q:${un.key}`)}&of=xm&rg=10`);
		const target = un.symbol.replace(/\s/g, "").toUpperCase();
		const rec = marcRecords(doc).find((r) =>
			r.fields
				.filter((f) => f.tag === "191")
				.some((f) => (f.sub.a ?? []).some((a) => a.replace(/\s/g, "").toUpperCase() === target) || (f.sub.q ?? []).includes(un.key)),
		);
		if (!rec) return null;
		const symbol = first(rec.fields, "191", "a") || un.symbol;
		const adopted = un.resolution ? first(rec.fields, "992", "a") : "";
		const date = adopted || englishDateToISO(first(rec.fields, "269", "a")) || englishDateToISO(first(rec.fields, "260", "c"));
		const fields: Record<string, string> = {
			title: undlTitle(rec.fields),
			date,
			reportType: "UN Doc",
			reportNumber: symbol.replace(/\s?\(/, " ("),
		};
		return {
			source: "un-digital-library",
			fields,
			creators: [{ creatorType: "author", name: un.body }],
			extraLines: rec.id ? [`UN Digital Library: https://digitallibrary.un.org/record/${rec.id}`] : [],
			confidence: 1,
		};
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

