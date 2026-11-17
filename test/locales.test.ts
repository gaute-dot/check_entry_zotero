import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const ids = (file: string) =>
	new Set([...readFileSync(file, "utf8").matchAll(/^([a-z][a-z0-9-]*)\s*=/gm)].map((m) => m[1]));

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.(ts|xhtml)$/.test(e.name) ? [join(dir, e.name)] : [],
	);
}

describe("localisation", () => {
	const en = ids(join(root, "addon/locale/en-US/oscola-check.ftl"));
	const nb = ids(join(root, "addon/locale/nb-NO/oscola-check.ftl"));

	it("English and Norwegian define the same messages", () => {
		expect([...en].filter((i) => !nb.has(i))).toEqual([]);
		expect([...nb].filter((i) => !en.has(i))).toEqual([]);
	});

	it("every message ID used in the code exists", () => {
		const used = new Set<string>();
		for (const f of [...sourceFiles(join(root, "src")), ...sourceFiles(join(root, "addon/content"))]) {
			for (const m of readFileSync(f, "utf8").matchAll(/["'](oc-(?:issue|reason|dialog|prefs|menu|progress|severity|field)-[a-z0-9-]*[a-z0-9])["']/g)) used.add(m[1]);
		}
		expect(used.size).toBeGreaterThan(50);
		expect([...used].filter((i) => !en.has(i))).toEqual([]);
	});

	it("every source has a label", () => {
		for (const s of ["rules", "crossref", "openalex", "openlibrary", "legislation-gov-uk", "find-case-law", "eur-lex", "hudoc", "lovdata"]) {
			expect(en.has("oc-source-" + s)).toBe(true);
		}
	});
});
