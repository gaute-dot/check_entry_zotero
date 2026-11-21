/**
 * Book catalogues searched by title (and author): Open Library, the
 * Norwegian National Library (wide coverage of English books too) and
 * OpenAlex. Used when a book's author or year is missing, e.g. because its
 * PDF is a scan.
 *
 * With an author to compare, the best title match by that author wins.
 * Without one, an author is only accepted when two catalogues agree on it
 * (or one catalogue has a single, exact title match).
 */
import { collapse, normalizeForCompare, similarity } from "../core/text";
import type { Candidate, Creator, Env, SourceId } from "../core/types";
import { getJSON, splitName } from "./util";

export interface CatalogueHit {
	source: SourceId;
	title: string;
	creators: Creator[];
	year: string;
	publisher?: string;
	place?: string;
}

const short = (t: string) => t.split(/\s*[:;]\s*/)[0].trim();

/** "Hart, H.L.A. (Herbert Lionel Adolphus)" -> {firstName: "H.L.A.", lastName: "Hart"} */
function catalogueName(n: string): Creator {
	const clean = n.replace(/\s*\([^)]*\)/g, "").replace(/,?\s*\d{4}-?\d{0,4}\.?$/, "").trim();
	return clean.includes(",") ? splitName(clean) : splitName(clean);
}

export async function openLibraryHits(env: Env, title: string, author?: string): Promise<CatalogueHit[]> {
	const url =
		`https://openlibrary.org/search.json?title=${encodeURIComponent(short(title))}` +
		(author ? `&author=${encodeURIComponent(author)}` : "") +
		"&limit=10&fields=title,subtitle,author_name,first_publish_year,publisher,publish_place";
	const res = await getJSON<{ docs?: any[] }>(env, url);
	return (res.docs ?? []).map((d) => ({
		source: "openlibrary" as const,
		title: [d.title, d.subtitle].filter(Boolean).join(": "),
		creators: (d.author_name ?? []).map((a: string) => catalogueName(a)),
		year: d.first_publish_year ? String(d.first_publish_year) : "",
		publisher: d.publisher?.[0],
		place: d.publish_place?.[0],
	}));
}

export async function nbHits(env: Env, title: string, author?: string): Promise<CatalogueHit[]> {
	const q = `title:"${short(title).replace(/"/g, "")}"` + (author ? ` AND creator:${author.replace(/[^\p{L} -]/gu, "")}` : "");
	const res = await getJSON<any>(env, `https://api.nb.no/catalog/v1/items?q=${encodeURIComponent(q)}&size=10&filter=mediatype:b%C3%B8ker`);
	return (res._embedded?.items ?? []).map((it: any) => {
		const m = it.metadata ?? {};
		return {
			source: "nb" as const,
			title: collapse((m.title ?? "").replace(/\s+:\s+/g, ": ")),
			creators: (m.creators ?? []).map((a: string) => catalogueName(a)),
			year: /\b(1[5-9]\d\d|20\d\d)\b/.exec(m.originInfo?.issued ?? "")?.[1] ?? "",
			publisher: m.originInfo?.publisher,
		};
	});
}

export async function openAlexBookHits(env: Env, title: string): Promise<CatalogueHit[]> {
	const key = env.apiKeys?.openalex ? `&api_key=${encodeURIComponent(env.apiKeys.openalex)}` : "";
	const res = await getJSON<any>(
		env,
		`https://api.openalex.org/works?search=${encodeURIComponent(short(title))}&filter=type:book&per-page=10&select=display_name,publication_year,authorships${key}`,
	);
	return (res.results ?? []).map((w: any) => ({
		source: "openalex" as const,
		title: w.display_name ?? "",
		creators: (w.authorships ?? []).map((a: any) => splitName(a.author?.display_name ?? "")).filter((c: Creator) => c.lastName || c.name),
		year: w.publication_year ? String(w.publication_year) : "",
	}));
}

const surname = (c: Creator | undefined) => normalizeForCompare(c?.lastName ?? c?.name ?? "");

/** Search the catalogues and decide on one book, or none. */
export async function findBook(env: Env, title: string, creators: Creator[]): Promise<Candidate | null> {
	const author = creators[0]?.lastName ?? creators[0]?.name;
	const searches: [SourceId, () => Promise<CatalogueHit[]>][] = [
		["openlibrary", () => openLibraryHits(env, title, author)],
		["nb", () => nbHits(env, title, author)],
		["openalex", () => openAlexBookHits(env, title)],
	];
	const hits: (CatalogueHit & { score: number })[] = [];
	for (const [id, search] of searches) {
		if (env.enabledSources?.[id] === false) continue;
		try {
			for (const h of await search()) {
				const score = Math.max(similarity(title, h.title), similarity(short(title), short(h.title)));
				if (score >= 0.85 && h.creators.length) hits.push({ ...h, score });
			}
		} catch {
			// an unreachable catalogue is skipped
		}
	}
	if (!hits.length) return null;

	let chosen: (CatalogueHit & { score: number })[];
	if (author) {
		const a = normalizeForCompare(author);
		chosen = hits.filter((h) => h.creators.some((c) => surname(c) === a || surname(c).endsWith(" " + a)));
		if (!chosen.length) return null;
	} else {
		// group by first author; accept an author two catalogues agree on, or one exact, unique match
		const groups = new Map<string, typeof hits>();
		for (const h of hits) groups.set(surname(h.creators[0]), [...(groups.get(surname(h.creators[0])) ?? []), h]);
		const ranked = [...groups.values()].sort((x, y) => new Set(y.map((h) => h.source)).size - new Set(x.map((h) => h.source)).size);
		const top = ranked[0];
		const sources = new Set(top.map((h) => h.source)).size;
		const exactUnique = groups.size === 1 && top.some((h) => h.score >= 0.97) && top.length === 1;
		const secondSources = ranked[1] ? new Set(ranked[1].map((h) => h.source)).size : 0;
		if (!((sources >= 2 && sources > secondSources) || exactUnique)) return null;
		chosen = top;
	}
	chosen.sort((x, y) => y.score - x.score);
	const best = chosen[0];
	// the fullest form of the name (e.g. "Herbert Lionel Adolphus Hart" over "H.L.A. Hart" is not wanted; prefer initials as printed)
	const names = chosen.map((h) => h.creators).find((c) => c.every((x) => x.firstName)) ?? best.creators;
	// Year and publisher from the same record, so they belong to the same edition. Catalogue places
	// mix editions (and OSCOLA does not print the place), so no place is suggested.
	const dated = chosen.find((h) => h.year);
	const fields: Record<string, string> = {
		date: dated?.year ?? "",
		publisher: dated?.publisher ?? "",
	};
	// don't offer a shorter form of a title the item already has
	if (!normalizeForCompare(title).startsWith(normalizeForCompare(best.title))) fields.title = best.title;
	return { source: best.source, fields, creators: names, confidence: author ? best.score : 0.9 };
}
