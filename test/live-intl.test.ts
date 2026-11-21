/** Live checks for international sources. Skipped unless LIVE=1. */
import { describe, expect, it } from "vitest";
import { checkItem } from "../src/core/check";
import { item } from "./helpers";
import { liveEnv } from "./live-env";

const live = process.env.LIVE === "1" ? describe : describe.skip;
const T = 90_000;

async function check(it: ReturnType<typeof item>) {
	const res = await checkItem(it, liveEnv);
	const by: Record<string, string> = {};
	for (const s of res.suggestions) if (!(s.field in by)) by[s.field] = s.suggested;
	if (process.env.SHOW) console.log(JSON.stringify({ by, issues: res.issues.map((i) => i.message) }, null, 1));
	const failed = res.issues.filter((i) => /source-(failed|no-match|low)/.test(i.message.id)).map((i) => JSON.stringify(i.message.args));
	return { res, by, failed };
}

live("live international sources", () => {
	it("UN Digital Library: GA resolution", async () => {
		const r = await check(item("report", { title: "", reportNumber: "A/RES/70/1" }));
		expect(r.failed).toEqual([]);
		expect(r.by.title).toMatch(/Transforming our world/i);
		expect(r.by.date).toBe("2015-09-25");
		expect(r.by.seriesNumber).toBe("70/1");
		expect(r.by.creators).toBe("UNGA");
	}, T);

	it("UN Digital Library: SC resolution entered as a document", async () => {
		const r = await check(item("document", { title: "S/RES/2334 (2016)" }));
		expect(r.by.itemType).toBe("report");
	}, T);

	it("UN Digital Library: Special Rapporteur report and general comment", async () => {
		const a = await check(item("report", { title: "", reportNumber: "A/HRC/43/52" }));
		expect(a.failed).toEqual([]);
		expect(a.by.creators).toBe("UNHRC");
		expect(a.by.date).toBe("2020-03-24");
		const g = await check(item("report", { title: "", reportNumber: "CCPR/C/GC/36" }));
		expect(g.failed).toEqual([]);
		expect(g.by.title).toMatch(/^General comment no\. 36/);
		expect(g.by.creators).toBe("UN Human Rights Committee");
	}, T);

	it("UN Treaty Collection by title", async () => {
		const r = await check(item("statute", { nameOfAct: "Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment" }));
		expect(r.failed).toEqual([]);
		expect(r.by.dateEnacted).toBe("1984-12-10");
		expect(r.by.code).toBe("UNTS");
		expect(r.by.codeNumber).toBe("1465");
		expect(r.by.pages).toBe("85");
		expect(r.by.extra).toMatch(/Type: treaty\nevent-date: 1987-06-26/);
	}, T);

	it("ICJ advisory opinion and contentious case", async () => {
		const a = await check(item("case", { caseName: "Legality of the Threat or Use of Nuclear Weapons", court: "ICJ" }));
		expect(a.failed).toEqual([]);
		expect(a.by.caseName).toBe("Legality of the Threat or Use of Nuclear Weapons (Advisory Opinion)");
		expect(a.by.dateDecided).toBe("1996-07-08");
		const n = await check(item("case", { caseName: "Military and Paramilitary Activities in and against Nicaragua (Nicaragua v. United States of America)", court: "International Court of Justice", dateDecided: "1986" }));
		expect(n.failed).toEqual([]);
		expect(n.by.caseName).toBe("Military and Paramilitary Activities in and against Nicaragua (Nicaragua v United States of America) (Merits)");
		expect(n.by.dateDecided).toBe("1986-06-27");
	}, T);
});

live("live: UN documents without a symbol", () => {
	it("the item from the screenshot: a whole citation in the Title of a Document", async () => {
		const res = await checkItem(item("document", { title: "UN Human Rights Committee (HRC), 'General Comment No 22' (30 July 1993)" }), liveEnv);
		const by: Record<string, (typeof res.suggestions)[number]> = {};
		for (const s of res.suggestions) if (!(s.field in by)) by[s.field] = s;
		if (process.env.SHOW) console.log(JSON.stringify({ s: res.suggestions.map((s) => [s.field, s.suggested, s.preselect, s.source]), i: res.issues.map((i) => i.message) }, null, 1));
		expect(by.itemType).toMatchObject({ suggested: "report", preselect: true });
		expect(by.title).toMatchObject({ suggested: "General Comment No 22", preselect: true });
		expect(by.date).toMatchObject({ suggested: "1993-07-30", preselect: true });
		expect(by.creators.creators).toEqual([{ creatorType: "author", name: "UN Human Rights Committee" }]);
		expect(by.reportNumber).toMatchObject({ suggested: "CCPR/C/21/Rev.1/Add.4", preselect: true });
		expect(by.reportType).toMatchObject({ suggested: "UN Doc", preselect: true });
	}, T);

	it("a Special Rapporteur report found by title", async () => {
		const res = await checkItem(item("report", { title: "Right to privacy: Report of the Special Rapporteur on the Right to Privacy", date: "2020" }, [{ creatorType: "author", name: "Human Rights Council" }]), liveEnv);
		expect(res.suggestions.find((s) => s.field === "reportNumber")?.suggested).toBe("A/HRC/43/52");
	}, T);
});

live("live: files without an item (text of real PDFs)", () => {
	const cases: [string, string, Record<string, string>][] = [
		["A_HRC_43_52-EN.txt", "report", { reportNumber: "A/HRC/43/52", reportType: "UN Doc" }],
		["CCPR_C_21_Rev.1_Add.4-EN.txt", "report", { reportNumber: "CCPR/C/21/Rev.1/Add.4" }],
		["A_RES_70_1-EN.txt", "report", { reportNumber: "A/RES/70/1", seriesNumber: "70/1", date: "2015-09-25" }],
		["uksc-2015-11.txt", "case", { court: "UKSC", docketNumber: "11", dateDecided: "2015-03-11" }],
		["ukpga-2010-15.txt", "statute", { nameOfAct: "Equality Act", dateEnacted: "2010-04-08" }],
	];
	it.each(cases)("%s", async (name, type, expected) => {
		const { identifyFile } = await import("../src/core/identify");
		const { newItemRows } = await import("../src/core/newitem");
		const { fixture } = await import("./helpers");
		const id = identifyFile({ text: fixture(`files/${name}`), filename: "download.pdf" });
		const rows = newItemRows(id.item, await checkItem(id.item, liveEnv), "file", id.identified, id.via);
		const ticked = Object.fromEntries(rows.filter((r) => r.preselect).map((r) => [r.field, r.suggested]));
		expect(ticked.itemType).toBe(type);
		expect(ticked).toMatchObject(expected);
	}, T);
});
