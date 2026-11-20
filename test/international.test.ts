import { describe, expect, it } from "vitest";
import { checkItem } from "../src/core/check";
import { looksLikeTreatyTitle, parseICJReport, parseTreatySeries, parseUNSymbol } from "../src/core/citations";
import { englishDateToISO, findUNTCEntry, parseICJCase, parseICJList, parseUNTCDetails } from "../src/resolvers/international";
import { fakeEnv, fixture, item, rulesOnly } from "./helpers";

const byField = (res: Awaited<ReturnType<typeof checkItem>>) => {
	const out: Record<string, (typeof res.suggestions)[number]> = {};
	for (const s of res.suggestions) if (!(s.field in out)) out[s.field] = s;
	return out;
};

describe("parsers", () => {
	it.each([
		["UN Doc A/RES/70/1", "A/RES/70/1", "UNGA", "70/1"],
		["S/RES/2334(2016)", "S/RES/2334 (2016)", "UNSC", "2334"],
		["A/HRC/RES/31/32", "A/HRC/RES/31/32", "UNHRC", "31/32"],
		["A/RES/2625(XXV)", "A/RES/2625 (XXV)", "UNGA", "2625 (XXV)"],
		["A/HRC/43/52", "A/HRC/43/52", "UNHRC", undefined],
		["CCPR/C/GC/36", "CCPR/C/GC/36", "UN Human Rights Committee", undefined],
		["E/C.12/GC/14", "E/C.12/GC/14", "UN Committee on Economic, Social and Cultural Rights", undefined],
		["E/CN.4/2003/67", "E/CN.4/2003/67", "UNCHR", undefined],
	])("UN symbol %s", (s, symbol, body, res) => {
		expect(parseUNSymbol(s)).toMatchObject({ symbol, body, resolution: res });
	});

	it("does not mistake other identifiers for UN symbols", () => {
		for (const s of ["C-176/03", "10.1093/ojls/gqi001", "23452/94", "SI 1998/3132", "Something A/B", "2016/679"]) expect(parseUNSymbol(s)).toBeNull();
	});

	it("treaty series and ICJ reports", () => {
		expect(parseTreatySeries("1465 UNTS 85")).toMatchObject({ series: "UNTS", volume: "1465", page: "85" });
		expect(parseTreatySeries("United Nations, Treaty Series, vol. 999, p. 171")).toMatchObject({ volume: "999", page: "171" });
		expect(parseTreatySeries("CETS No. 210")).toMatchObject({ series: "CETS", number: "210" });
		expect(parseTreatySeries("ETS 5")).toMatchObject({ series: "ETS", number: "5" });
		expect(parseICJReport("I.C.J. Reports 1996, p. 226")).toMatchObject({ year: "1996", page: "226" });
		expect(parseICJReport("[1986] ICJ Rep 14")).toMatchObject({ year: "1986", page: "14" });
		expect(looksLikeTreatyTitle("International Covenant on Civil and Political Rights")).toBe(true);
		expect(looksLikeTreatyTitle("Equality Act")).toBe(false);
	});

	it("dates", () => {
		expect(englishDateToISO("10 December 1984")).toBe("1984-12-10");
		expect(englishDateToISO("8 Jan. 2016")).toBe("2016-01-08");
		expect(englishDateToISO("3 Sept. 2019")).toBe("2019-09-03");
	});

	it("UN Treaty Collection pages and index", () => {
		expect(parseUNTCDetails(fixture("untc-iv-9.html"))).toEqual({
			title: "Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment",
			place: "New York",
			adopted: "1984-12-10",
			entryIntoForce: "1987-06-26",
			volume: "1465",
			page: "85",
		});
		expect(findUNTCEntry("International Covenant on Civil and Political Rights")!.entry.no).toBe("IV-4");
		expect(findUNTCEntry("Vienna Convention on the Law of Treaties")!.entry.no).toBe("XXIII-1");
	});

	it("ICJ pages", () => {
		const list = parseICJList(fixture("icj-list.html"));
		expect(list).toContainEqual({ id: "95", title: "Legality of the Threat or Use of Nuclear Weapons", type: "Advisory" });
		const nic = parseICJCase(fixture("icj-case-70.html"));
		expect(nic.title).toBe("Military and Paramilitary Activities in and against Nicaragua (Nicaragua v. United States of America)");
		expect(nic.decisions).toEqual([
			{ kind: "Judgment", date: "1984-11-26", phase: "Jurisdiction and Admissibility" },
			{ kind: "Judgment", date: "1986-06-27", phase: "Merits" },
		]);
		expect(parseICJCase(fixture("icj-case-95.html")).decisions).toEqual([{ kind: "Advisory Opinion", date: "1996-07-08", phase: "Advisory Opinion" }]);
	});
});

describe("UN documents (rules)", () => {
	it("resolution saved as a report: body, UN Doc, Res number", async () => {
		const r = await rulesOnly(item("report", { title: "Transforming our world", reportNumber: "A/RES/70/1", date: "2015-09-25", institution: "United Nations" }));
		expect(r.by.reportType.suggested).toBe("UN Doc");
		expect(r.by.institution.suggested).toBe("");
		expect(r.by.creators.creators).toEqual([{ creatorType: "author", name: "UNGA" }]);
		expect(r.by.seriesTitle.suggested).toBe("Res");
		expect(r.by.seriesNumber.suggested).toBe("70/1");
		expect(r.issueIds).toContain("oc-issue-intl-style");
	});

	it("abbreviates a long body name", async () => {
		const r = await rulesOnly(item("report", { title: "T", reportNumber: "S/RES/1373 (2001)", reportType: "UN Doc", date: "2001-09-28" }, [{ creatorType: "author", name: "United Nations Security Council" }]));
		expect(r.by.creators.creators?.[0].name).toBe("UNSC");
		expect(r.by.seriesNumber.suggested).toBe("1373");
	});

	it("a UN document saved as a web page or statute is suggested as a report", async () => {
		expect((await rulesOnly(item("webpage", { title: "A/HRC/43/52", url: "https://undocs.org/A/HRC/43/52" }))).by.itemType.suggested).toBe("report");
		expect((await rulesOnly(item("statute", { nameOfAct: "UNGA Res 60/147" , publicLawNumber: "A/RES/60/147"}))).by.itemType.suggested).toBe("report");
	});

	it("a UN publication with an ISBN stays a book", async () => {
		const r = await rulesOnly(item("book", { title: "Yearbook of the International Law Commission 2001 A/CN.4/SER.A/2001", ISBN: "9789211336096", publisher: "UN", date: "2007" }));
		expect(r.by.itemType).toBeUndefined();
	});
});

describe("UN Digital Library (fixtures from the live service)", () => {
	it("General Assembly resolution", async () => {
		const env = fakeEnv({ "191__q%3AARES701": fixture("undl-ares701.xml") });
		const s = byField(await checkItem(item("report", { title: "", reportNumber: "A/RES/70/1" }), env));
		expect(s.title.suggested).toBe("Transforming our world: the 2030 Agenda for Sustainable Development");
		expect(s.date.suggested).toBe("2015-09-25"); // adoption date, not publication date
		expect(s.creators.suggested).toBe("UNGA");
		expect(s.extra.suggested).toMatch(/^UN Digital Library: https:\/\/digitallibrary\.un\.org\/record\/\d+$/);
	});

	it("picks the exact symbol, not A/RES/701(VII)", async () => {
		const env = fakeEnv({ "191__q%3AARES701": fixture("undl-ares701.xml") });
		const s = byField(await checkItem(item("report", { title: "", reportNumber: "A/RES/70/1" }), env));
		expect(s.date.suggested).not.toMatch(/^195/);
	});

	it("Security Council resolution", async () => {
		const env = fakeEnv({ "191__q%3ASRES23342016": fixture("undl-sres23342016.xml") });
		const s = byField(await checkItem(item("report", { title: "", reportNumber: "S/RES/2334 (2016)" }), env));
		expect(s.date.suggested).toBe("2016-12-23");
		expect(s.creators.suggested).toBe("UNSC");
		expect(s.seriesNumber.suggested).toBe("2334");
	});

	it("Special Rapporteur report and treaty body general comment", async () => {
		const env = fakeEnv({ AHRC4352: fixture("undl-ahrc4352.xml"), CCPRCGC36: fixture("undl-ccprcgc36.xml") });
		const a = byField(await checkItem(item("report", { title: "", reportNumber: "A/HRC/43/52" }), env));
		expect(a.title.suggested).toBe("Right to privacy: Report of the Special Rapporteur on the Right to Privacy");
		expect(a.date.suggested).toBe("2020-03-24");
		expect(a.seriesNumber).toBeUndefined();
		const g = byField(await checkItem(item("report", { title: "", reportNumber: "CCPR/C/GC/36" }), env));
		expect(g.title.suggested).toBe("General comment no. 36: Article 6, Right to life");
		expect(g.creators.suggested).toBe("UN Human Rights Committee");
	});
});

describe("treaties", () => {
	it("rules: UNTS reference in the title is split out and the item marked as a treaty", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "International Covenant on Civil and Political Rights 999 UNTS 171", dateEnacted: "1966-12-16" }));
		expect(r.by.nameOfAct.suggested).toBe("International Covenant on Civil and Political Rights");
		expect(r.by.code.suggested).toBe("UNTS");
		expect(r.by.codeNumber.suggested).toBe("999");
		expect(r.by.pages.suggested).toBe("171");
		expect(r.by.extra.suggested).toBe("Type: treaty");
		expect(r.issueIds).toContain("oc-issue-treaty-eif");
	});

	it("rules: Council of Europe treaty number", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "Council of Europe Convention on preventing and combating violence against women and domestic violence", extra: "CETS No. 210", dateEnacted: "2011-05-11" }));
		expect(r.by.code.suggested).toBe("CETS");
		expect(r.by.publicLawNumber.suggested).toBe("210");
	});

	it("a treaty saved as a document is suggested as a statute", async () => {
		const r = await rulesOnly(item("document", { title: "Convention on the Rights of the Child" }));
		expect(r.by.itemType.suggested).toBe("statute");
	});

	it("UN Treaty Collection fills dates and the UNTS reference", async () => {
		const env = fakeEnv({ "mtdsg_no=IV-9&": fixture("untc-iv-9.html") });
		const s = byField(await checkItem(item("statute", { nameOfAct: "Convention against Torture and Other Cruel, Inhuman or Degrading Treatment or Punishment" }), env));
		expect(s.dateEnacted.suggested).toBe("1984-12-10");
		expect(s.code.suggested).toBe("UNTS");
		expect(s.codeNumber.suggested).toBe("1465");
		expect(s.pages.suggested).toBe("85");
		expect(s.extra.suggested.split("\n").slice(0, 2)).toEqual(["Type: treaty", "event-date: 1987-06-26"]);
	});

	it("UK statutes are not treated as treaties", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "Human Rights Act 1998" }));
		expect(r.by.extra).toBeUndefined();
		expect(r.by.nameOfAct.suggested).toBe("Human Rights Act");
	});
});

describe("ICJ", () => {
	it("rules: ICJ Reports citation, court and docket cleared", async () => {
		const r = await rulesOnly(item("case", { caseName: "Legality of the Threat or Use of Nuclear Weapons (Advisory Opinion) I.C.J. Reports 1996, p. 226", court: "International Court of Justice", docketNumber: "95" }));
		expect(r.by.caseName.suggested).toBe("Legality of the Threat or Use of Nuclear Weapons (Advisory Opinion)");
		expect(r.by.reporter.suggested).toBe("ICJ Rep");
		expect(r.by.firstPage.suggested).toBe("226");
		expect(r.by.dateDecided.suggested).toBe("1996");
		expect(r.by.court.suggested).toBe("");
		expect(r.by.docketNumber.suggested).toBe("");
		expect(r.issueIds).not.toContain("oc-issue-icj-phase");
	});

	it("picks the decision from the year and adds the phase", async () => {
		const env = fakeEnv({ "list-of-all-cases": fixture("icj-list.html"), "icj-cij.org/case/70": fixture("icj-case-70.html") });
		const s = byField(await checkItem(item("case", { caseName: "Military and Paramilitary Activities in and against Nicaragua (Nicaragua v. United States of America)", court: "ICJ", dateDecided: "1986" }), env));
		expect(s.caseName.suggested).toBe("Military and Paramilitary Activities in and against Nicaragua (Nicaragua v United States of America) (Merits)");
		expect(s.dateDecided.suggested).toBe("1986-06-27");
	});

	it("asks for the year when a case has several decisions", async () => {
		const env = fakeEnv({ "list-of-all-cases": fixture("icj-list.html"), "icj-cij.org/case/70": fixture("icj-case-70.html") });
		const res = await checkItem(item("case", { caseName: "Military and Paramilitary Activities in and against Nicaragua", court: "ICJ" }), env);
		expect(res.issues.find((i) => i.message.id === "oc-issue-icj-several")?.message.args?.dates).toContain("1986-06-27 (Merits)");
		expect(byField(res).dateDecided).toBeUndefined();
	});
});
