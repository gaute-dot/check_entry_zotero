import { isValidField } from "./schema";
import { normalizeForCompare, sameValue } from "./text";
import type { Candidate, Creator, Issue, ItemData, Message, Severity, SourceId, Suggestion } from "./types";

interface Change {
	value: string;
	creators?: Creator[];
	source: SourceId;
	reason: Message;
	preselect: boolean;
}

export function formatCreators(creators: Creator[]): string {
	return creators
		.map((c) => (c.name ? c.name : [c.lastName, c.firstName].filter(Boolean).join(", ")))
		.join("; ");
}

/**
 * A working copy of an item. Rules and resolvers write proposed values into
 * it; `result()` turns the differences from the original into suggestions.
 */
export class Draft {
	readonly original: ItemData;
	readonly issues: Issue[] = [];
	private changes = new Map<string, Change>();
	/** Differing values from online sources, offered next to (not instead of) the main change */
	private alternatives = new Map<string, Change[]>();
	private suggestedType?: Change;

	constructor(item: ItemData) {
		this.original = item;
	}

	get itemType(): string {
		return this.original.itemType;
	}

	/** Current (possibly already changed) value of a field. */
	get(field: string): string {
		const c = this.changes.get(field);
		if (c) return c.value;
		return this.original.fields[field] ?? "";
	}

	has(field: string): boolean {
		return this.get(field).trim() !== "";
	}

	originalValue(field: string): string {
		return this.original.fields[field] ?? "";
	}

	isValid(field: string): boolean {
		return isValidField(this.itemType, field);
	}

	/**
	 * Propose a new value. When a fetched value is later tidied by a rule, the
	 * suggestion keeps the fetched source and reason so the user sees where the
	 * data came from.
	 */
	set(field: string, value: string, source: SourceId, reason: Message, preselect = true): void {
		if (!this.isValid(field)) return;
		if (value === this.get(field)) return;
		const prev = this.changes.get(field);
		if (value === this.originalValue(field)) {
			this.changes.delete(field);
			return;
		}
		if (prev && prev.source !== "rules" && source === "rules") {
			this.changes.set(field, { ...prev, value, preselect: prev.preselect && preselect });
		} else {
			this.changes.set(field, { value, source, reason, preselect });
		}
	}

	creators(): Creator[] {
		return this.changes.get("creators")?.creators ?? this.original.creators;
	}

	setCreators(creators: Creator[], source: SourceId, reason: Message, preselect = true): void {
		this.changes.set("creators", { value: formatCreators(creators), creators, source, reason, preselect });
	}

	suggestItemType(itemType: string, reason: Message): void {
		if (itemType === this.itemType) return;
		this.suggestedType = { value: itemType, source: "rules", reason, preselect: false };
	}

	/** Forget the issues found so far (used between the two rule passes). */
	clearIssues(): void {
		this.issues.length = 0;
	}

	issue(severity: Severity, id: string, args?: Record<string, string | number>, field?: string): void {
		if (this.issues.some((i) => i.message.id === id && i.field === field)) return;
		this.issues.push({ severity, field, message: { id, args } });
	}

	/** Add a line to Extra unless an equivalent line is already there. */
	addExtraLine(line: string, source: SourceId, reason: Message): void {
		const extra = this.get("extra");
		const key = line.split(":")[0].trim().toLowerCase();
		const exists = extra
			.split("\n")
			.some((l) => l.trim().toLowerCase() === line.toLowerCase() || l.split(":")[0].trim().toLowerCase() === key);
		if (exists) return;
		this.set("extra", extra ? extra.replace(/\s+$/, "") + "\n" + line : line, source, reason);
	}

	/**
	 * Merge metadata from a resolver. Empty fields are filled (ticked by
	 * default); fields that already hold a different value are offered as an
	 * unticked alternative.
	 */
	mergeCandidate(c: Candidate): void {
		for (const [field, value] of Object.entries(c.fields)) {
			if (!value || !this.isValid(field)) continue;
			const current = this.get(field);
			const changedByOtherSource = this.changes.has(field) && this.changes.get(field)!.source !== "rules";
			if (changedByOtherSource) continue;
			// Empty in the item (even if a rule derived a value): the fetched value wins
			if (!current.trim() || !this.originalValue(field).trim()) {
				this.set(field, value, c.source, { id: "oc-reason-filled", args: { source: c.source } }, true);
			} else if (extends_(current, value)) {
				// The source adds to what is there (e.g. a subtitle, or the phase of an ICJ case)
				this.set(field, value, c.source, { id: "oc-reason-extended", args: { source: c.source } }, true);
			} else if (
				!sameValue(current, value) &&
				!sameValue(this.originalValue(field), value) &&
				!equivalentDate(field, current, value) &&
				!(this.alternatives.get(field) ?? []).some((a) => sameValue(a.value, value))
			) {
				const list = this.alternatives.get(field) ?? [];
				list.push({ value, source: c.source, reason: { id: "oc-reason-differs", args: { source: c.source } }, preselect: false });
				this.alternatives.set(field, list);
			}
		}
		if (c.creators?.length && this.creators().length === 0) {
			this.setCreators(c.creators, c.source, { id: "oc-reason-filled", args: { source: c.source } });
		}
		for (const note of c.notes ?? []) this.issue("info", note.id, note.args);
		for (const line of c.extraLines ?? []) {
			this.addExtraLine(line, c.source, { id: "oc-reason-extra", args: { source: c.source } });
		}
	}

	result(): { issues: Issue[]; suggestions: Suggestion[] } {
		const suggestions: Suggestion[] = [];
		if (this.suggestedType) {
			suggestions.push({
				field: "itemType",
				current: this.itemType,
				suggested: this.suggestedType.value,
				source: "rules",
				reason: this.suggestedType.reason,
				preselect: false,
			});
		}
		for (const [field, c] of this.changes) {
			if (field === "creators") {
				suggestions.push({
					field,
					current: formatCreators(this.original.creators),
					suggested: c.value,
					creators: c.creators,
					source: c.source,
					reason: c.reason,
					preselect: c.preselect,
				});
			} else {
				suggestions.push({
					field,
					current: this.originalValue(field),
					suggested: c.value,
					source: c.source,
					reason: c.reason,
					preselect: c.preselect,
				});
			}
		}
		// Put each field's alternatives right after its main suggestion (or at the end)
		for (const [field, list] of this.alternatives) {
			if (!this.isValid(field)) continue;
			let at = suggestions.findIndex((s) => s.field === field);
			at = at === -1 ? suggestions.length : at + 1;
			const rows: Suggestion[] = list
				.filter((a) => a.value !== this.get(field))
				.map((a) => ({ field, current: this.originalValue(field), suggested: a.value, source: a.source, reason: a.reason, preselect: false }));
			suggestions.splice(at, 0, ...rows);
		}
		return { issues: this.issues, suggestions };
	}
}

/** True when `value` is `current` plus more text, ignoring case and punctuation. */
function extends_(current: string, value: string): boolean {
	const a = normalizeForCompare(current);
	const b = normalizeForCompare(value);
	return a.length >= 8 && b.length > a.length && b.startsWith(a + " ");
}

/** "2015" vs "2015-03-11": don't offer a less precise date as a change. */
function equivalentDate(field: string, current: string, value: string): boolean {
	if (!/date/i.test(field)) return false;
	const norm = (s: string) => s.replace(/[^0-9]/g, "");
	const a = norm(current);
	const b = norm(value);
	return a === b || (b.length < a.length && a.startsWith(b));
}
