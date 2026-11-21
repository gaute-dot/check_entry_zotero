/**
 * Existing items: after the normal check, make sure title, author and year
 * will be filled in. If the item (with the ticked suggestions applied) still
 * lacks any of them, the search is widened as for new files: the item's
 * PDF is read, then Open Library and Crossref are searched by title.
 * The result is offered as extra suggestions for the empty fields only.
 */
import { convertItem } from "./convert";
import { expandSearch, missingBasics, type Basic } from "./expand";
import { formatCreators } from "./draft";
import type { CheckResult, Env, ItemData, Suggestion } from "./types";

/** Legal material has its own sources and rules; author and year guesses would do more harm than good. */
const SKIP = ["case", "statute", "bill", "hearing", "patent", "standard"];
const GENERIC = ["document", "webpage", "manuscript"];

/** The item as it would be after applying the ticked suggestions. */
export function applyTicked(original: ItemData, result: CheckResult): ItemData {
	const type = result.suggestions.find((s) => s.field === "itemType" && s.preselect)?.suggested;
	const item = type ? convertItem(original, type) : { ...original, fields: { ...original.fields }, creators: [...original.creators] };
	const done = new Set<string>();
	for (const s of result.suggestions) {
		if (s.field === "itemType" || !s.preselect || done.has(s.field)) continue;
		done.add(s.field);
		if (s.field === "creators") item.creators = s.creators ?? [];
		else item.fields[s.field] = s.suggested;
	}
	return item;
}

export async function ensureBasics(original: ItemData, result: CheckResult, env: Env, getText?: () => Promise<string>): Promise<CheckResult> {
	const current = applyTicked(original, result);
	if (SKIP.includes(current.itemType) || current.fields.reportType === "UN Doc") return result;
	const missing: Basic[] = missingBasics(current);
	if (!missing.length) return result;

	const text = getText ? await getText().catch(() => "") : "";
	const exp = await expandSearch(current, text, env);
	const suggestions = [...result.suggestions];
	const issues = [...result.issues];

	// Item type found online for a generic item (e.g. a Document that is a book)
	if (exp.item.itemType !== current.itemType) {
		const i = suggestions.findIndex((s) => s.field === "itemType");
		const row: Suggestion = {
			field: "itemType",
			current: original.itemType,
			suggested: exp.item.itemType,
			source: exp.sources[Object.keys(exp.sources).find((k) => exp.sources[k] !== "file") ?? ""] ?? "rules",
			reason: { id: "oc-reason-item-type", args: { type: exp.item.itemType } },
			preselect: GENERIC.includes(original.itemType),
		};
		if (i >= 0) suggestions[i] = row;
		else suggestions.unshift(row);
	}

	// Only fields that are empty in the item get a suggestion
	for (const [field, source] of Object.entries(exp.sources)) {
		const reason = source === "file" ? { id: "oc-reason-basics-guessed" } : { id: "oc-reason-filled", args: { source } };
		if (field === "creators") {
			if (current.creators.length || !exp.item.creators.length) continue;
			const i = suggestions.findIndex((s) => s.field === "creators");
			const row: Suggestion = { field, current: formatCreators(original.creators), suggested: formatCreators(exp.item.creators), creators: exp.item.creators, source, reason, preselect: true };
			if (i >= 0) suggestions[i] = row;
			else suggestions.push(row);
			continue;
		}
		const value = exp.item.fields[field];
		if (!value || current.fields[field]?.trim()) continue;
		const i = suggestions.findIndex((s) => s.field === field);
		const row: Suggestion = { field, current: original.fields[field] ?? "", suggested: value, source, reason, preselect: true };
		if (i >= 0) suggestions[i] = row;
		else suggestions.push(row);
	}

	const still = missingBasics(exp.item);
	if (exp.guessed) issues.push({ severity: "warning", message: { id: "oc-issue-basics-guessed-item" } });
	if (still.length) issues.push({ severity: "warning", message: { id: "oc-issue-basics-missing", args: { fields: still.join(", ") } } });
	return { suggestions, issues };
}
