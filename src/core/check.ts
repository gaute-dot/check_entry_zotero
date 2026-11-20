import { RESOLVERS } from "../resolvers/index";
import { convertItem } from "./convert";
import { detect } from "./detect";
import { Draft } from "./draft";
import { applyRules } from "./rules";
import type { CheckResult, Env, ItemData, SourceId } from "./types";

/** Minimum confidence for a search hit to be offered at all. */
const MIN_CONFIDENCE = 0.8;

/**
 * Check one item: look it up in the applicable online sources, merge what
 * was found, apply the OSCOLA rules and return the proposed changes.
 * Nothing is written to Zotero here.
 */
/** Generic item types: when such an item is clearly something else, the type change starts ticked. */
const GENERIC_TYPES = ["document", "webpage", "manuscript"];

export async function checkItem(original: ItemData, env: Env, opts: { online?: boolean } = {}): Promise<CheckResult> {
	// If the item should have another type (a UN resolution saved as a Document, say),
	// check it as that type, so every field can be suggested in one go.
	const first = detect(original);
	const target = first.impliedType;
	const item = target ? convertItem(original, target) : original;
	const d = target ? { ...detect(item), impliedType: null } : first;
	const draft = target
		? new Draft(item, original.itemType, { id: "oc-reason-item-type", args: { type: target } }, GENERIC_TYPES.includes(original.itemType))
		: new Draft(item);
	const matched = new Set<SourceId>();
	let lookedUp = false;

	// First pass: tidy the user's own values, so online data is compared
	// against the cleaned-up version. Its notes are recomputed in pass two.
	applyRules(draft, d);
	draft.clearIssues();

	if (opts.online !== false) {
		for (const r of RESOLVERS) {
			if (env.enabledSources?.[r.id] === false) continue;
			if (r.fallbackFor && matched.has(r.fallbackFor)) continue;
			if (!r.applies(item, d)) continue;
			lookedUp = true;
			try {
				const c = await r.resolve(item, d, env);
				if (!c) {
					draft.issue("info", "oc-issue-source-no-match", { source: r.id });
				} else if (c.confidence < MIN_CONFIDENCE) {
					draft.issue("info", "oc-issue-source-low-confidence", { source: r.id });
				} else {
					draft.mergeCandidate(c);
					matched.add(r.id);
				}
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				draft.issue("info", "oc-issue-source-failed", { source: r.id, error: msg.slice(0, 200) });
			}
		}
	}

	// Second pass: also tidy values filled in from online sources
	draft.finalPass = true;
	applyRules(draft, d);
	if (target) draft.issue("warning", "oc-issue-item-type", { type: target });

	// Never let an item that nothing recognised look "fine"
	if (opts.online !== false && !lookedUp) draft.issue("info", "oc-issue-no-lookup");
	return draft.result();
}
