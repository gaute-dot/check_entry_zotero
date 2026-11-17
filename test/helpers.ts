import { DOMParser } from "@xmldom/xmldom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkItem } from "../src/core/check";
import type { Creator, Env, ItemData, Suggestion } from "../src/core/types";

export function item(itemType: string, fields: Record<string, string>, creators: Creator[] = []): ItemData {
	return { itemType, fields, creators };
}

export function fixture(name: string): string {
	return readFileSync(join(__dirname, "fixtures", name), "utf8");
}

/** An Env that serves fixtures by URL substring and records requested URLs. */
export function fakeEnv(routes: Record<string, string | Error>): Env & { requested: string[] } {
	const requested: string[] = [];
	return {
		requested,
		async fetchText(url: string) {
			requested.push(url);
			for (const [needle, body] of Object.entries(routes)) {
				if (url.includes(needle)) {
					if (body instanceof Error) throw body;
					return body;
				}
			}
			throw new Error(`HTTP 404 (no fixture for ${url})`);
		},
		parseXML: (text: string) => new DOMParser().parseFromString(text, "text/xml") as unknown as Document,
	};
}

export const offline: Env = {
	fetchText: async () => {
		throw new Error("offline");
	},
	parseXML: (text: string) => new DOMParser().parseFromString(text, "text/xml") as unknown as Document,
};

/** Run rules only (no network) and return suggestions keyed by field. */
export async function rulesOnly(it: ItemData) {
	const res = await checkItem(it, offline, { online: false });
	const by: Record<string, Suggestion> = {};
	for (const s of res.suggestions) by[s.field] = s;
	return { ...res, by, issueIds: res.issues.map((i) => i.message.id) };
}
