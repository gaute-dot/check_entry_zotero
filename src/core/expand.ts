/**
 * Make sure a proposed item has at least a title, an author and a year.
 * When the first pass leaves any of them empty, the search is widened:
 *   1. more pages of the file are read and title/authors/year guessed from them;
 *   2. Open Library (books) and Crossref (articles) are searched by title and author.
 */
import { detect } from "./detect";
import { fieldForBase } from "./schema";
import { guessMeta } from "./textmeta";
import type { Candidate, Env, ItemData, Suggestion } from "./types";
import { openlibrary, crossref } from "../resolvers/scholarly";

export type Basic = "title" | "creators" | "date";

const titleField = (t: string) => fieldForBase(t, "title") ?? "title";
const dateField = (t: string) => fieldForBase(t, "date") ?? "date";

export function missingBasics(item: ItemData): Basic[] {
	const out: Basic[] = [];
	if (!item.fields[titleField(item.itemType)]?.trim()) out.push("title");
	if (!item.creators.length && !/^(case|statute)$/.test(item.itemType)) out.push("creators");
	if (!/\d{4}/.test(item.fields[dateField(item.itemType)] ?? "")) out.push("date");
	return out;
}

/** The item described by the first row of each field (ticked or not). */
export function itemFromRows(rows: Suggestion[]): ItemData {
	const type = rows.find((r) => r.field === "itemType")?.suggested ?? "document";
	const item: ItemData = { itemType: type, fields: {}, creators: [] };
	for (const r of rows) {
		if (r.field === "itemType") continue;
		if (r.field === "creators") {
			if (!item.creators.length) item.creators = r.creators ?? [];
		} else if (!(r.field in item.fields)) item.fields[r.field] = r.suggested;
	}
	return item;
}

export interface Expanded {
	item: ItemData;
	/** A matching record was found online */
	foundOnline: boolean;
	/** Some values were only guessed from the text */
	guessed: boolean;
}

export async function expandSearch(base: ItemData, moreText: string, env: Env): Promise<Expanded> {
	let item: ItemData = { itemType: base.itemType, fields: { ...base.fields }, creators: [...base.creators] };
	let guessed = false;
	let foundOnline = false;
	const tf = () => titleField(item.itemType);
	const df = () => dateField(item.itemType);

	// 1. Read more of the file
	let missing = missingBasics(item);
	if (missing.length && moreText) {
		const g = guessMeta(moreText);
		if (missing.includes("title") && g.title) (item.fields[tf()] = g.title), (guessed = true);
		if (missing.includes("creators") && g.creators?.length) (item.creators = g.creators), (guessed = true);
		if (missing.includes("date") && g.year) (item.fields[df()] = g.year), (guessed = true);
	}

	// 2. Search online by title (and author)
	missing = missingBasics(item);
	const title = item.fields[tf()];
	const generic = ["document", "webpage", "manuscript"].includes(item.itemType);
	if ((missing.length || generic) && title) {
		const tries: [typeof openlibrary, string][] = [
			[openlibrary, "book"],
			[crossref, "journalArticle"],
		];
		let best: { c: Candidate; type: string } | null = null;
		for (const [resolver, type] of tries) {
			if (env.enabledSources?.[resolver.id] === false) continue;
			if (!generic && item.itemType !== type && !(type === "book" && item.itemType === "bookSection")) continue;
			const probe: ItemData = { itemType: type, fields: { title }, creators: item.creators };
			try {
				const c = await resolver.resolve(probe, detect(probe), env);
				if (c && c.confidence >= 0.85 && (!best || c.confidence > best.c.confidence)) best = { c, type };
			} catch {
				// a source that cannot be reached is simply skipped here
			}
		}
		if (best) {
			foundOnline = true;
			if (generic) item = { itemType: best.type, fields: { title, ...(item.fields[df()] ? { date: item.fields[df()] } : {}) }, creators: item.creators };
			for (const [k, v] of Object.entries(best.c.fields)) {
				if (v && !item.fields[k]?.trim()) item.fields[k] = v;
			}
			if (!item.creators.length && best.c.creators?.length) item.creators = best.c.creators;
			// values guessed from the text give way to the record found online
			if (guessed && best.c.fields.date && missing.length === 0) item.fields[df()] = item.fields[df()] || best.c.fields.date;
		}
	}
	return { item, foundOnline, guessed };
}
