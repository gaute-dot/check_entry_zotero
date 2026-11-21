/**
 * Turn an identified file into the rows of a proposed new item for the review
 * dialog: every field gets a row (current value empty), filled from the
 * check result where online sources or rules gave a value, otherwise from
 * what was read in the file.
 */
import { convertItem } from "./convert";
import { formatCreators } from "./draft";
import type { CheckResult, ItemData, Message, SourceId, Suggestion } from "./types";

export function newItemRows(base: ItemData, result: CheckResult, baseSource: SourceId, identified: boolean, via: string): Suggestion[] {
	const typeRow = result.suggestions.find((s) => s.field === "itemType");
	const itemType = typeRow?.suggested ?? base.itemType;
	const start = itemType === base.itemType ? base : convertItem(base, itemType);
	const fromFile: Message = { id: baseSource === "zotero" ? "oc-reason-from-zotero" : "oc-reason-from-file" };

	const rows: Suggestion[] = [
		{
			field: "itemType",
			current: "",
			suggested: itemType,
			source: baseSource,
			reason: identified ? { id: "oc-reason-new-item", args: { via } } : { id: "oc-reason-new-item-draft" },
			preselect: identified,
		},
	];

	// Group the check's suggestions per field: the first is the main one, the rest are alternatives
	const byField = new Map<string, Suggestion[]>();
	for (const s of result.suggestions) {
		if (s.field === "itemType") continue;
		byField.set(s.field, [...(byField.get(s.field) ?? []), s]);
	}
	const fields = new Set<string>([...Object.keys(start.fields).filter((f) => start.fields[f]), ...byField.keys()]);
	if (start.creators.length) fields.add("creators");

	for (const field of fields) {
		const [main, ...alternatives] = byField.get(field) ?? [];
		const own = field === "creators" ? formatCreators(start.creators) : (start.fields[field] ?? "");
		if (main && (main.preselect || !own)) {
			if (main.suggested) rows.push({ ...main, current: "", preselect: identified && main.preselect });
			if (own && own !== main.suggested && !main.preselect) rows.push(ownRow(field, own, start, baseSource, fromFile, false));
		} else if (own) {
			rows.push(ownRow(field, own, start, baseSource, fromFile, identified));
			if (main?.suggested) rows.push({ ...main, current: "", preselect: false });
		}
		for (const a of alternatives) if (a.suggested) rows.push({ ...a, current: "", preselect: false });
	}
	return rows;
}

function ownRow(field: string, value: string, item: ItemData, source: SourceId, reason: Message, preselect: boolean): Suggestion {
	return field === "creators"
		? { field, current: "", suggested: value, creators: item.creators, source, reason, preselect }
		: { field, current: "", suggested: value, source, reason, preselect };
}
