import { describe, expect, it } from "vitest";
import { editionNumber } from "../src/core/rules";
import { item, rulesOnly } from "./helpers";

describe("UK cases", () => {
	it("splits a neutral citation and a report out of the case name", async () => {
		const r = await rulesOnly(
			item("case", { caseName: "Montgomery v Lanarkshire Health Board [2015] UKSC 11, [2015] AC 1430", dateDecided: "" }),
		);
		expect(r.by.caseName.suggested).toBe("Montgomery v Lanarkshire Health Board");
		expect(r.by.court.suggested).toBe("UKSC");
		expect(r.by.docketNumber.suggested).toBe("11");
		expect(r.by.dateDecided.suggested).toBe("2015");
		// with a neutral citation the volume must carry the bracketed year
		expect(r.by.reporterVolume.suggested).toBe("[2015]");
		expect(r.by.reporter.suggested).toBe("AC");
		expect(r.by.firstPage.suggested).toBe("1430");
	});

	it("square-bracket series without neutral citation: empty volume, number goes with reporter", async () => {
		const r = await rulesOnly(item("case", { caseName: "Caparo Industries plc v Dickman", reporter: "WLR", reporterVolume: "[1990] 1", dateDecided: "1990", firstPage: "358", court: "HL" }));
		expect(r.by.reporterVolume.suggested).toBe("");
		expect(r.by.reporter.suggested).toBe("1 WLR");
	});

	it("round-bracket series keeps the volume", async () => {
		const r = await rulesOnly(item("case", { caseName: "R v Brown (1993) 97 Cr App R 44", court: "HL" }));
		expect(r.by.reporter.suggested).toBe("Cr App R");
		expect(r.by.reporterVolume.suggested).toBe("97");
		expect(r.by.firstPage.suggested).toBe("44");
		expect(r.by.caseName.suggested).toBe("R v Brown");
	});

	it("division goes into the docket number", async () => {
		const r = await rulesOnly(item("case", { caseName: "X v Y", docketNumber: "[2018] EWHC 456 (Ch)", dateDecided: "2018-03-01" }));
		expect(r.by.docketNumber.suggested).toBe("456 (Ch)");
		expect(r.by.court.suggested).toBe("EWHC");
		expect(r.by.dateDecided).toBeUndefined();
	});

	it("'v.' becomes 'v'", async () => {
		const r = await rulesOnly(item("case", { caseName: "Donoghue v. Stevenson", reporter: "AC", firstPage: "562", dateDecided: "1932", court: "HL" }));
		expect(r.by.caseName.suggested).toBe("Donoghue v Stevenson");
	});

	it("flags a year mismatch instead of overwriting", async () => {
		const r = await rulesOnly(item("case", { caseName: "A v B", docketNumber: "[2015] UKSC 11", dateDecided: "2014" }));
		expect(r.issueIds).toContain("oc-issue-ncn-year-mismatch");
		expect(r.by.dateDecided).toBeUndefined();
	});

	it("warns when there is no citation at all", async () => {
		const r = await rulesOnly(item("case", { caseName: "A v B", dateDecided: "2001" }));
		expect(r.issueIds).toContain("oc-issue-case-no-citation");
	});
});

describe("EU, ECHR and Norwegian cases", () => {
	it("EU: case number goes first in the name, docket is cleared", async () => {
		const r = await rulesOnly(item("case", { caseName: "Commission v Council", docketNumber: "C-176/03", court: "ECJ", dateDecided: "2005" }));
		expect(r.by.caseName.suggested).toBe("Case C-176/03 Commission v Council");
		expect(r.by.docketNumber.suggested).toBe("");
		expect(r.by.extra.suggested).toBe("CELEX: 62003CJ0176");
	});

	it("ECHR: tidies HUDOC-style names and sets the application number", async () => {
		const r = await rulesOnly(item("case", { caseName: "CASE OF BALOGH v. HUNGARY", court: "European Court of Human Rights", docketNumber: "47940/99", dateDecided: "2004-07-20" }));
		expect(r.by.caseName.suggested).toBe("Balogh v Hungary");
		expect(r.by.court.suggested).toBe("ECtHR");
		expect(r.by.docketNumber.suggested).toBe("App no 47940/99");
	});

	it("Norway: Rt. citation goes into reporter fields", async () => {
		const r = await rulesOnly(item("case", { caseName: "Rt. 2005 s. 1234", dateDecided: "" }));
		expect(r.by.reporter.suggested).toBe("Rt");
		expect(r.by.firstPage.suggested).toBe("1234");
		expect(r.by.dateDecided.suggested).toBe("2005");
		expect(r.by.court.suggested).toBe("Høyesterett");
	});

	it("Norway: HR case ID is put in front of a popular name (unticked)", async () => {
		const r = await rulesOnly(item("case", { caseName: "Tolkesaken", docketNumber: "HR-2020-1234-A", dateDecided: "2020-06-10", court: "Høyesterett" }));
		expect(r.by.caseName.suggested).toBe("HR-2020-1234-A (Tolkesaken)");
		expect(r.by.caseName.preselect).toBe(false);
		expect(r.by.docketNumber.suggested).toBe("");
	});
});

describe("legislation", () => {
	it("moves the year out of a UK Act title", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "Equality Act 2010" }));
		expect(r.by.nameOfAct.suggested).toBe("Equality Act");
		expect(r.by.dateEnacted.suggested).toBe("2010");
	});

	it("does not touch the title when the years disagree", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "Equality Act 2010", dateEnacted: "2006" }));
		expect(r.by.nameOfAct).toBeUndefined();
		expect(r.issueIds).toContain("oc-issue-statute-year-mismatch");
	});

	it("SI number", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "Civil Procedure Rules", dateEnacted: "1998", url: "https://www.legislation.gov.uk/uksi/1998/3132/contents" }));
		expect(r.by.publicLawNumber.suggested).toBe("SI 1998/3132");
	});

	it("Norwegian act: date, ID and Norwegian-style title", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "Lov om arbeidsmiljø, arbeidstid og stillingsvern mv. (arbeidsmiljøloven)", url: "https://lovdata.no/lov/2005-06-17-62" }));
		expect(r.by.dateEnacted.suggested).toBe("2005-06-17");
		expect(r.by.publicLawNumber.suggested).toBe("LOV-2005-06-17-62");
		expect(r.by.nameOfAct.suggested).toBe("Lov 17. juni 2005 nr. 62 om arbeidsmiljø, arbeidstid og stillingsvern mv. (arbeidsmiljøloven)");
	});

	it("EU regulation gets its CELEX number", async () => {
		const r = await rulesOnly(item("statute", { nameOfAct: "Regulation (EU) 2016/679 on the protection of natural persons", dateEnacted: "2016-04-27" }));
		expect(r.by.extra.suggested).toBe("CELEX: 32016R0679");
		expect(r.by.nameOfAct).toBeUndefined();
	});
});

describe("secondary sources", () => {
	it("journal article: full stops, pages prefix, DOI from URL, missing fields", async () => {
		const r = await rulesOnly(
			item("journalArticle", { title: "A title", publicationTitle: "L.Q.R.", pages: "pp. 12-30", url: "https://doi.org/10.1000/xyz123", date: "2004" }, [
				{ creatorType: "author", firstName: "A", lastName: "B" },
			]),
		);
		expect(r.by.publicationTitle.suggested).toBe("LQR");
		expect(r.by.pages.suggested).toBe("12-30");
		expect(r.by.DOI.suggested).toBe("10.1000/xyz123");
		expect(r.issueIds).toContain("oc-issue-missing-field"); // volume
	});

	it("book editions", async () => {
		expect(editionNumber("2nd edn")).toBe("2");
		expect(editionNumber("3rd ed.")).toBe("3");
		expect(editionNumber("Fourth edition")).toBe("4");
		expect(editionNumber("2. utg.")).toBe("2");
		expect(editionNumber("Revised")).toBeNull();
		const r = await rulesOnly(item("book", { title: "T", publisher: "OUP", date: "2019", edition: "1st ed." }, [{ creatorType: "author", lastName: "X", firstName: "Y" }]));
		expect(r.by.edition.suggested).toBe("");
		expect(r.by.edition.preselect).toBe(false);
	});

	it("suggests item type 'case' for a web page from Find Case Law", async () => {
		const r = await rulesOnly(item("webpage", { title: "R (Miller) v Secretary of State [2017] UKSC 5", url: "https://caselaw.nationalarchives.gov.uk/uksc/2017/5" }));
		expect(r.by.itemType.suggested).toBe("case");
		// a web page is a generic type, so the change starts ticked
		expect(r.by.itemType.preselect).toBe(true);
	});

	it("collapses stray whitespace", async () => {
		const r = await rulesOnly(item("book", { title: "  Too   many  spaces ", publisher: "OUP", date: "2019" }));
		expect(r.by.title.suggested).toBe("Too many spaces");
	});
});
