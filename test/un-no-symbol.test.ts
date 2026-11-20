import { describe, expect, it } from "vitest";
import { checkItem } from "../src/core/check";
import { parseCitationInTitle, parseGeneralComment, unBodyFromText } from "../src/core/citations";
import { convertItem } from "../src/core/convert";
import { findGeneralComment } from "../src/resolvers/international";
import { fakeEnv, fixture, item, rulesOnly } from "./helpers";

describe("citations typed into the Title field", () => {
	it.each([
		[
			"UN Human Rights Committee (HRC), 'General Comment No 22' (30 July 1993)",
			{ author: "UN Human Rights Committee (HRC)", title: "General Comment No 22", date: "30 July 1993" },
		],
		[
			"UNHRC, ‘Report of the Special Rapporteur on the Right to Privacy’ (24 March 2020) UN Doc A/HRC/43/52.",
			{ author: "UNHRC", title: "Report of the Special Rapporteur on the Right to Privacy", date: "24 March 2020", symbol: "A/HRC/43/52" },
		],
		["UNGA Res 70/1 (25 September 2015) UN Doc A/RES/70/1", { author: "UNGA", title: "", resolution: "70/1", date: "25 September 2015", symbol: "A/RES/70/1" }],
		["UNSC Res 2334 (23 December 2016)", { author: "UNSC", resolution: "2334", date: "23 December 2016" }],
	])("%s", (s, expected) => {
		expect(parseCitationInTitle(s)).toMatchObject(expected);
	});

	it("ordinary titles are left alone", () => {
		expect(parseCitationInTitle("The Concept of Law")).toBeNull();
		expect(parseCitationInTitle("Transforming our world: the 2030 Agenda")).toBeNull();
	});
});

describe("UN bodies and general comments", () => {
	it("recognises bodies by name or abbreviation", () => {
		expect(unBodyFromText("UN Human Rights Committee (HRC)")).toEqual({ body: "UN Human Rights Committee", committee: "CCPR" });
		expect(unBodyFromText("Committee on Economic, Social and Cultural Rights")).toMatchObject({ committee: "CESCR" });
		expect(unBodyFromText("Human Rights Council")).toEqual({ body: "UNHRC" });
		expect(unBodyFromText("United Nations General Assembly")).toEqual({ body: "UNGA" });
		expect(unBodyFromText("Oxford University Press")).toBeNull();
	});

	it("general comment numbers and the bundled list", () => {
		expect(parseGeneralComment("General Comment No 22")).toEqual({ kind: "comment", number: 22 });
		expect(parseGeneralComment("general recommendation no. 35 on gender-based violence")).toEqual({ kind: "recommendation", number: 35 });
		expect(findGeneralComment("CCPR", 22)?.symbol).toBe("CCPR/C/21/Rev.1/Add.4");
		expect(findGeneralComment("CCPR", 36)?.symbol).toBe("CCPR/C/GC/36");
		expect(findGeneralComment("CESCR", 14)?.symbol).toBe("E/C.12/2000/4");
	});
});

describe("item type conversion", () => {
	it("moves fields through their base fields", () => {
		const r = convertItem(item("document", { title: "T", publisher: "UN", date: "2020", extra: "x" }, [{ creatorType: "author", name: "UNGA" }]), "report");
		expect(r).toEqual({ itemType: "report", fields: { title: "T", institution: "UN", date: "2020", extra: "x" }, creators: [{ creatorType: "author", name: "UNGA" }] });
	});
});

describe("the item from the screenshot", () => {
	const it0 = item("document", { title: "UN Human Rights Committee (HRC), 'General Comment No 22' (30 July 1993)" });

	it("offline: splits the citation, suggests Report, notes the missing symbol", async () => {
		const r = await rulesOnly(it0);
		expect(r.by.itemType).toMatchObject({ suggested: "report", preselect: true });
		expect(r.by.title.suggested).toBe("General Comment No 22");
		expect(r.by.date.suggested).toBe("1993-07-30");
		expect(r.by.creators.creators).toEqual([{ creatorType: "author", name: "UN Human Rights Committee" }]);
		expect(r.issueIds).toContain("oc-issue-un-no-symbol");
	});

	it("online: finds the symbol through the general-comment list and keeps the user's date", async () => {
		const env = fakeEnv({ "191__q%3ACCPRC21REV1ADD4": fixture("undl-ccprc21rev1add4.xml") });
		const res = await checkItem(it0, env);
		const rows = (f: string) => res.suggestions.filter((s) => s.field === f);
		expect(rows("reportNumber")[0]).toMatchObject({ suggested: "CCPR/C/21/Rev.1/Add.4", preselect: true });
		expect(rows("reportType")[0]).toMatchObject({ suggested: "UN Doc", preselect: true });
		expect(rows("title")[0]).toMatchObject({ suggested: "General Comment No 22", preselect: true });
		expect(rows("title")[1]).toMatchObject({ suggested: "General comment no. 22 (article 18), Freedom of thought, conscience or religion", preselect: false });
		expect(rows("date")[0]).toMatchObject({ suggested: "1993-07-30", preselect: true });
		expect(rows("date")[1]).toMatchObject({ suggested: "1993-09-27", preselect: false });
		expect(res.issues.map((i) => i.message.id)).not.toContain("oc-issue-un-no-symbol");
	});

	it("a general comment that is not in the list gets a note", async () => {
		const res = await checkItem(item("document", { title: "UN Human Rights Committee, 'General Comment No 20' (10 March 1992)" }), fakeEnv({}));
		expect(res.issues.find((i) => i.message.id === "oc-issue-un-gc-not-listed")?.message.args).toEqual({ number: 20 });
	});
});

describe("items nothing could be looked up for", () => {
	it("get a note instead of 'No problems found'", async () => {
		const res = await checkItem(item("document", { title: "Internal memo", date: "2020" }), fakeEnv({}));
		expect(res.issues.map((i) => i.message.id)).toContain("oc-issue-no-lookup");
	});

	it("but not when a source was tried", async () => {
		const res = await checkItem(item("journalArticle", { title: "Something", DOI: "10.1/x" }), fakeEnv({}));
		expect(res.issues.map((i) => i.message.id)).not.toContain("oc-issue-no-lookup");
	});
});
