/**
 * Renders items with the adjusted style (styles/oscola-international.csl)
 * through citeproc-js, the engine Zotero uses, to check the output.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error citeproc has no type definitions
import CSL from "citeproc";

const root = join(__dirname, "..");
const style = readFileSync(join(root, "styles/oscola-international.csl"), "utf8");
const locale = readFileSync(join(__dirname, "fixtures/csl-locales-en-GB.xml"), "utf8");

/** CSL-JSON as Zotero produces it from the fields the plugin fills in. */
const items: Record<string, any> = {
	res: { id: "res", type: "report", author: [{ literal: "UNGA" }], title: "Transforming our world", issued: { "date-parts": [[2015, 9, 25]] }, genre: "UN Doc", number: "A/RES/70/1", "collection-title": "Res", "collection-number": "70/1" },
	doc: { id: "doc", type: "report", author: [{ literal: "UNHRC" }], title: "Right to privacy: Report of the Special Rapporteur on the Right to Privacy", issued: { "date-parts": [[2020, 3, 24]] }, genre: "UN Doc", number: "A/HRC/43/52" },
	cat: { id: "cat", type: "treaty", title: "Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment", issued: { "date-parts": [[1984, 12, 10]] }, "event-date": { "date-parts": [[1987, 6, 26]] }, "container-title": "UNTS", volume: "1465", page: "85" },
	ist: { id: "ist", type: "treaty", title: "Council of Europe Convention on preventing and combating violence against women and domestic violence", issued: { "date-parts": [[2011, 5, 11]] }, "event-date": { "date-parts": [[2014, 8, 1]] }, "container-title": "CETS", number: "210" },
	icj: { id: "icj", type: "legal_case", title: "Legality of the Threat or Use of Nuclear Weapons (Advisory Opinion)", issued: { "date-parts": [[1996, 7, 8]] }, "container-title": "ICJ Rep", page: "226" },
	corr: { id: "corr", type: "legal_case", title: "Corr v IBC Vehicles Ltd", authority: "UKHL", number: "13", "container-title": "AC", volume: "[2008] 1", page: "884", issued: { "date-parts": [[2008]] } },
};

function notes(ids: [string, string?][]): string[] {
	const engine = new CSL.Engine({ retrieveLocale: () => locale, retrieveItem: (id: string) => items[id] }, style, "en-GB");
	const out: string[] = [];
	const pre: [string, number][] = [];
	ids.forEach(([id, para], i) => {
		const citation = { citationItems: [{ id, ...(para ? { locator: para, label: "paragraph" } : {}) }], properties: { noteIndex: i + 1 } };
		const [, updates] = engine.processCitationCluster(citation, pre, []);
		const mine = updates.find((u: any[]) => u[0] === i) ?? updates[updates.length - 1];
		pre.push([mine[2], i + 1]);
		out.push(String(mine[1]).replace(/<[^>]+>/g, ""));
	});
	return out;
}

describe("adjusted OSCOLA style", () => {
	it("prints UN resolutions, documents, treaties and ICJ decisions as OSCOLA requires", () => {
		expect(notes([["res"], ["doc"], ["cat"], ["ist"], ["icj"]])).toEqual([
			"UNGA Res 70/1 (25 September 2015) UN Doc A/RES/70/1.",
			"UNHRC, ‘Right to Privacy: Report of the Special Rapporteur on the Right to Privacy’ (2020) UN Doc A/HRC/43/52.",
			"Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment (adopted 10 December 1984, entered into force 26 June 1987) 1465 UNTS 85.",
			"Council of Europe Convention on preventing and combating violence against women and domestic violence (adopted 11 May 2011, entered into force 1 August 2014) CETS 210.",
			"Legality of the Threat or Use of Nuclear Weapons (Advisory Opinion) [1996] ICJ Rep 226.",
		]);
	});

	it("pinpoints and subsequent notes for resolutions", () => {
		expect(notes([["res", "3"], ["corr"], ["res", "5"]])).toEqual([
			"UNGA Res 70/1 (25 September 2015) UN Doc A/RES/70/1, para 3.",
			"Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884.",
			"UNGA Res 70/1 (n 1) para 5.",
		]);
	});

	it("leaves ordinary cases unchanged", () => {
		expect(notes([["corr"]])).toEqual(["Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884."]);
	});
});
