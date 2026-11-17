import { RESOLVERS } from "../resolvers/index";
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
export async function checkItem(item: ItemData, env: Env, opts: { online?: boolean } = {}): Promise<CheckResult> {
	const d = detect(item);
	const draft = new Draft(item);
	const matched = new Set<SourceId>();

	// First pass: tidy the user's own values, so online data is compared
	// against the cleaned-up version. Its notes are recomputed in pass two.
	applyRules(draft, d);
	draft.clearIssues();

	if (opts.online !== false) {
		for (const r of RESOLVERS) {
			if (env.enabledSources?.[r.id] === false) continue;
			if (r.fallbackFor && matched.has(r.fallbackFor)) continue;
			if (!r.applies(item, d)) continue;
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
	applyRules(draft, d);
	return draft.result();
}
