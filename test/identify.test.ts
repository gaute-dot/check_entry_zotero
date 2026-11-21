import { describe, expect, it } from "vitest";
import { checkItem } from "../src/core/check";
import { identifyFile, unSymbolFromFilename } from "../src/core/identify";
import { newItemRows } from "../src/core/newitem";
import { fakeEnv, fixture } from "./helpers";

const file = (name: string) => fixture(`files/${name}`);

describe("identifying files without an item", () => {
	it("UN file names", () => {
		expect(unSymbolFromFilename("A_HRC_43_52-EN.pdf")).toBe("A/HRC/43/52");
		expect(unSymbolFromFilename("CCPR_C_21_Rev.1_Add.4-EN.pdf")).toBe("CCPR/C/21/Rev.1/Add.4");
		expect(unSymbolFromFilename("A_RES_70_1-EN.pdf")).toBe("A/RES/70/1");
		expect(unSymbolFromFilename("my_notes_2020.pdf")).toBeNull();
		expect(unSymbolFromFilename("report.pdf")).toBeNull();
	});

	it("a UN report, by its header even with a meaningless file name", () => {
		const r = identifyFile({ text: file("A_HRC_43_52-EN.txt"), filename: "download.pdf" });
		expect(r).toMatchObject({ identified: true, via: "A/HRC/43/52", item: { itemType: "report", fields: { reportNumber: "A/HRC/43/52", date: "2020-03-24" } } });
	});

	it("an old treaty-body document with the symbol on line 3", () => {
		const r = identifyFile({ text: file("CCPR_C_21_Rev.1_Add.4-EN.txt"), filename: "gc22.pdf" });
		expect(r.via).toBe("CCPR/C/21/Rev.1/Add.4");
	});

	it("a GA resolution", () => {
		expect(identifyFile({ text: file("A_RES_70_1-EN.txt"), filename: "A_RES_70_1-EN.pdf" }).via).toBe("A/RES/70/1");
	});

	it("a UK Supreme Court judgment", () => {
		const r = identifyFile({ text: file("uksc-2015-11.txt"), filename: "data.pdf" });
		expect(r).toMatchObject({ via: "[2015] UKSC 11", item: { itemType: "case", fields: { docketNumber: "[2015] UKSC 11" } } });
	});

	it("a UK Act", () => {
		const r = identifyFile({ text: file("ukpga-2010-15.txt"), filename: "ukpga_20100015_en.pdf" });
		expect(r).toMatchObject({ item: { itemType: "statute", fields: { nameOfAct: "Equality Act 2010", url: "https://www.legislation.gov.uk/ukpga/2010/15" } } });
	});

	it("an ICJ decision, from its official citation", () => {
		const r = identifyFile({ text: file("icj-sample.txt"), filename: "095-19960708-ADV-01-00-EN.pdf" });
		expect(r.item).toMatchObject({
			itemType: "case",
			fields: { caseName: "Legality of the Threat or Use of Nuclear Weapons (Advisory Opinion)", reporter: "ICJ Rep", firstPage: "226", dateDecided: "1996" },
		});
	});

	it("ECtHR, CJEU, Norwegian and academic files", () => {
		expect(identifyFile({ text: "EUROPEAN COURT OF HUMAN RIGHTS\nGRAND CHAMBER\nCASE OF OSMAN v. THE UNITED KINGDOM\n(Application no. 23452/94)\nJUDGMENT", filename: "x.pdf" }).item.fields)
			.toMatchObject({ court: "ECtHR", docketNumber: "App no 23452/94" });
		expect(identifyFile({ text: "JUDGMENT OF THE COURT (Grand Chamber)\n13 September 2005\nIn Case C-176/03,\nECLI:EU:C:2005:542", filename: "x.pdf" }).item.fields)
			.toMatchObject({ docketNumber: "C-176/03", extra: "ECLI: ECLI:EU:C:2005:542" });
		expect(identifyFile({ text: "NORGES HØYESTERETT\nDen 10. juni 2020 avsa Høyesterett dom i\nHR-2020-1234-A, (sak nr. 19-123456SIV-HRET)", filename: "x.pdf" }).via).toBe("HR-2020-1234-A");
		expect(identifyFile({ text: "Oxford Journal of Legal Studies, Vol. 25\ndoi:10.1093/ojls/gqi001\nThe Rule of Law", filename: "x.pdf" }).item).toMatchObject({ itemType: "journalArticle", fields: { DOI: "10.1093/ojls/gqi001" } });
	});

	it("unknown text becomes an unticked draft", () => {
		const r = identifyFile({ text: "\n\nMinutes of the faculty meeting\n12 March 2024\nPresent: ...", filename: "minutes.pdf" });
		expect(r).toMatchObject({ identified: false, item: { itemType: "document", fields: { title: "Minutes of the faculty meeting", date: "2024-03-12" } } });
	});
});

describe("proposed new item", () => {
	it("a UN report file becomes a complete Report (fixture responses)", async () => {
		const id = identifyFile({ text: file("A_HRC_43_52-EN.txt"), filename: "A_HRC_43_52-EN.pdf" });
		const env = fakeEnv({ AHRC4352: fixture("undl-ahrc4352.xml") });
		const rows = newItemRows(id.item, await checkItem(id.item, env), "file", id.identified, id.via);
		const by = Object.fromEntries(rows.map((r) => [r.field, r]));
		expect(by.itemType).toMatchObject({ suggested: "report", preselect: true, current: "" });
		expect(by.title).toMatchObject({ suggested: "Right to privacy: Report of the Special Rapporteur on the Right to Privacy", preselect: true });
		expect(by.creators.creators).toEqual([{ creatorType: "author", name: "UNHRC" }]);
		expect(by.reportNumber).toMatchObject({ suggested: "A/HRC/43/52", preselect: true });
		expect(by.reportType).toMatchObject({ suggested: "UN Doc", preselect: true });
		expect(by.date).toMatchObject({ suggested: "2020-03-24", preselect: true });
		expect(rows.every((r) => r.current === "")).toBe(true);
	});

	it("an unidentified file: every row unticked", async () => {
		const id = identifyFile({ text: "Minutes of the faculty meeting\n12 March 2024", filename: "minutes.pdf" });
		const rows = newItemRows(id.item, await checkItem(id.item, fakeEnv({})), "file", id.identified, id.via);
		expect(rows.length).toBeGreaterThan(1);
		expect(rows.every((r) => !r.preselect)).toBe(true);
	});
});
