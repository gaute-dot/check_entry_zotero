/** Resolvers for secondary sources: Crossref, OpenAlex and Open Library. */
import type { Detected } from "../core/detect";
import { isoDate, similarity, stripTags } from "../core/text";
import type { Candidate, Creator, Env, ItemData } from "../core/types";
import type { Resolver } from "./index";
import { getJSON, splitName } from "./util";

const SCHOLARLY_TYPES = ["journalArticle", "bookSection", "book", "report", "conferencePaper", "thesis"];

function titleOf(item: ItemData): string {
	return item.fields.title ?? "";
}

function firstAuthorLast(item: ItemData): string {
	const a = item.creators.find((c) => c.creatorType === "author") ?? item.creators[0];
	return a ? (a.lastName ?? a.name ?? "") : "";
}

// ---------------------------------------------------------------- Crossref

interface CrossrefWork {
	DOI: string;
	type?: string;
	title?: string[];
	subtitle?: string[];
	author?: { given?: string; family?: string; name?: string }[];
	editor?: { given?: string; family?: string; name?: string }[];
	"container-title"?: string[];
	"short-container-title"?: string[];
	volume?: string;
	issue?: string;
	page?: string;
	publisher?: string;
	"publisher-location"?: string;
	ISSN?: string[];
	ISBN?: string[];
	issued?: { "date-parts"?: (number | null)[][] };
	edition?: string;
}

function crossrefCreators(w: CrossrefWork, itemType: string): Creator[] {
	const map = (list: CrossrefWork["author"], type: string): Creator[] =>
		(list ?? []).map((p) =>
			p.family ? { creatorType: type, firstName: p.given ?? "", lastName: p.family } : { creatorType: type, name: p.name ?? "" },
		);
	const out = map(w.author, "author");
	if (itemType === "bookSection" || (itemType === "book" && out.length === 0)) out.push(...map(w.editor, "editor"));
	return out;
}

export function crossrefToCandidate(w: CrossrefWork, itemType: string, confidence: number): Candidate {
	const dp = w.issued?.["date-parts"]?.[0];
	const date = dp && dp[0] ? isoDate(dp[0], dp[1] ?? undefined, dp[2] ?? undefined) : "";
	const title = stripTags([w.title?.[0], w.subtitle?.[0]].filter(Boolean).join(": "));
	const container = stripTags(w["container-title"]?.[0] ?? "");
	const f: Record<string, string> = { title, date, DOI: w.DOI };
	switch (itemType) {
		case "journalArticle":
			Object.assign(f, {
				publicationTitle: container,
				journalAbbreviation: w["short-container-title"]?.[0] ?? "",
				volume: w.volume ?? "",
				issue: w.issue ?? "",
				pages: w.page ?? "",
				ISSN: w.ISSN?.[0] ?? "",
			});
			break;
		case "bookSection":
			Object.assign(f, {
				bookTitle: container,
				pages: w.page ?? "",
				publisher: w.publisher ?? "",
				place: w["publisher-location"] ?? "",
				ISBN: w.ISBN?.[0] ?? "",
			});
			break;
		case "book":
			Object.assign(f, {
				publisher: w.publisher ?? "",
				place: w["publisher-location"] ?? "",
				ISBN: w.ISBN?.[0] ?? "",
				edition: w.edition ?? "",
			});
			break;
		default:
			Object.assign(f, { publisher: w.publisher ?? "" });
	}
	return { source: "crossref", fields: f, creators: crossrefCreators(w, itemType), confidence };
}

export const crossref: Resolver = {
	id: "crossref",
	applies: (item: ItemData, d: Detected) =>
		SCHOLARLY_TYPES.includes(item.itemType) && (!!d.doi || (item.itemType === "journalArticle" && !!titleOf(item))),
	async resolve(item: ItemData, d: Detected, env: Env) {
		const mailto = env.contactEmail ? `mailto=${encodeURIComponent(env.contactEmail)}` : "";
		if (d.doi) {
			const res = await getJSON<{ message: CrossrefWork }>(
				env,
				`https://api.crossref.org/works/${encodeURIComponent(d.doi)}${mailto ? "?" + mailto : ""}`,
			);
			return crossrefToCandidate(res.message, item.itemType, 1);
		}
		const q = [titleOf(item), firstAuthorLast(item)].filter(Boolean).join(" ");
		const res = await getJSON<{ message: { items: CrossrefWork[] } }>(
			env,
			`https://api.crossref.org/works?rows=5&query.bibliographic=${encodeURIComponent(q)}${mailto ? "&" + mailto : ""}`,
		);
		return bestMatch(item, res.message.items ?? [], (w) => [w.title?.[0], w.subtitle?.[0]].filter(Boolean).join(": "), (w, conf) =>
			crossrefToCandidate(w, item.itemType, conf),
		);
	},
};

/**
 * Pick the search hit whose title matches best. Requires a near-identical
 * title and, if the item has an author, the same first-author surname.
 */
function bestMatch<T>(item: ItemData, hits: T[], title: (t: T) => string, toCandidate: (t: T, conf: number) => Candidate): Candidate | null {
	let best: { hit: T; score: number } | null = null;
	for (const h of hits) {
		const t = title(h);
		const score = Math.max(similarity(titleOf(item), t), similarity(titleOf(item), t.split(":")[0]));
		if (!best || score > best.score) best = { hit: h, score };
	}
	if (!best || best.score < 0.85) return null;
	const c = toCandidate(best.hit, best.score);
	const last = firstAuthorLast(item);
	if (last && c.creators?.length) {
		const theirs = c.creators.map((x) => (x.lastName ?? x.name ?? "").toLowerCase());
		if (!theirs.some((n) => n.includes(last.toLowerCase()) || last.toLowerCase().includes(n))) return { ...c, confidence: 0.5 };
	}
	return c;
}

// ---------------------------------------------------------------- OpenAlex (fallback when Crossref has nothing)

interface OpenAlexWork {
	display_name?: string;
	publication_date?: string;
	publication_year?: number;
	doi?: string;
	authorships?: { author?: { display_name?: string } }[];
	primary_location?: { source?: { display_name?: string; issn_l?: string } };
	biblio?: { volume?: string; issue?: string; first_page?: string; last_page?: string };
}

export const openalex: Resolver = {
	id: "openalex",
	fallbackFor: "crossref",
	applies: (item, d) => SCHOLARLY_TYPES.includes(item.itemType) && !!d.doi,
	async resolve(item, d, env) {
		const w = await getJSON<OpenAlexWork>(env, `https://api.openalex.org/works/doi:${encodeURIComponent(d.doi!)}`);
		const b = w.biblio ?? {};
		const pages = b.first_page ? b.first_page + (b.last_page && b.last_page !== b.first_page ? "–" + b.last_page : "") : "";
		const fields: Record<string, string> = {
			title: stripTags(w.display_name ?? ""),
			date: w.publication_date ?? (w.publication_year ? String(w.publication_year) : ""),
			DOI: d.doi!,
			pages,
		};
		if (item.itemType === "journalArticle") {
			Object.assign(fields, {
				publicationTitle: w.primary_location?.source?.display_name ?? "",
				volume: b.volume ?? "",
				issue: b.issue ?? "",
				ISSN: w.primary_location?.source?.issn_l ?? "",
			});
		}
		const creators = (w.authorships ?? []).map((a) => splitName(a.author?.display_name ?? "")).filter((c) => c.lastName || c.name);
		return { source: "openalex", fields, creators, confidence: 1 };
	},
};

// ---------------------------------------------------------------- Open Library (books by ISBN)

interface OpenLibraryBook {
	title?: string;
	subtitle?: string;
	authors?: { name: string }[];
	publishers?: { name: string }[];
	publish_places?: { name: string }[];
	publish_date?: string;
	number_of_pages?: number;
}

export const openlibrary: Resolver = {
	id: "openlibrary",
	applies: (item, d) => (item.itemType === "book" || item.itemType === "bookSection") && !!d.isbn,
	async resolve(item, d, env) {
		const key = `ISBN:${d.isbn}`;
		const res = await getJSON<Record<string, OpenLibraryBook>>(
			env,
			`https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`,
		);
		const b = res[key];
		if (!b) return null;
		const title = [b.title, b.subtitle].filter(Boolean).join(": ");
		const year = /\b(1[5-9]\d\d|20\d\d)\b/.exec(b.publish_date ?? "")?.[1] ?? "";
		const fields: Record<string, string> = {
			publisher: b.publishers?.[0]?.name ?? "",
			place: b.publish_places?.[0]?.name ?? "",
			date: year,
		};
		if (item.itemType === "book") {
			fields.title = title;
			fields.numPages = b.number_of_pages ? String(b.number_of_pages) : "";
			return { source: "openlibrary", fields, creators: (b.authors ?? []).map((a) => splitName(a.name)), confidence: 1 };
		}
		fields.bookTitle = title;
		return { source: "openlibrary", fields, confidence: 1 };
	},
};
