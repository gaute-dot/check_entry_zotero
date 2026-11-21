import { describe, expect, it } from "vitest";
import { checkItem } from "../src/core/check";
import { namesToCreators, parseHeinCover, parseJstorCover, ssrnDOI } from "../src/core/cover";
import { expandSearch, itemFromRows, missingBasics } from "../src/core/expand";
import { identifyFile } from "../src/core/identify";
import { newItemRows } from "../src/core/newitem";
import { guessMeta } from "../src/core/textmeta";
import { fakeEnv, fixture, item } from "./helpers";

const HEIN_ARTICLE = `https://heinonline.org | holsupport@wshein.com

CITATIONS:
Bluebook 22nd ed.
Joseph Raz, The Rule of Law and Its Virtue, 93 Law Q. Rev. 195 (1977).
APA 7th ed.
Raz, J. (1977). The Rule of Law and Its Virtue. Law Quarterly Review, 93(2), 195-
211.
Chicago 18th ed.
Raz, Joseph. "The Rule of Law and Its Virtue." Law Quarterly Review 93, no. 2 (1977): 195-211.
OSCOLA 4th ed.
Joseph Raz, 'The Rule of Law and Its Virtue' (1977) 93 LQR 195

Date Downloaded:
Sun Mar 22 15:30:53 2026

Source: https://heinonline.org/HOL/Page?handle=hein.journals/lqr93&id=207
HeinOnline is a product of William S. Hein & Co., Inc. | 2350 North Forest Road, Getzville, NY 14068
THE RULE OF LAW AND ITS VIRTUE
`;

const JSTOR = `The Rule of Law as a Theory of Adjudication
Author(s): Jeremy Waldron and Joseph Raz
Source: The Yale Law Journal, Vol. 115, No. 6 (Apr., 2006), pp. 1346-1406
Published by: The Yale Law Journal Company, Inc.
Stable URL: https://www.jstor.org/stable/20455656
Accessed: 01/02/2024 10:00

JSTOR is a not-for-profit service that helps scholars.

Body text`;

describe("cover pages", () => {
	it("HeinOnline book (the cover page of the uploaded PDF)", () => {
		const r = parseHeinCover(fixture("files/hein-cover-book.txt"))!;
		expect(r.item).toEqual({
			itemType: "book",
			fields: {
				title: "Axis Rule in Occupied Europe: Laws of Occupation, Analysis of Government, Proposals for Redress",
				date: "1944",
				place: "Washington",
				publisher: "Carnegie Endowment for International Peace, Division of International Law",
				extra: "HeinOnline: https://heinonline.org/HOL/Page?handle=hein.cow/axisrul0001&id=9",
			},
			creators: [{ creatorType: "author", firstName: "Raphael", lastName: "Lemkin" }],
		});
		expect(r.body.startsWith("PREFACE")).toBe(true);
	});

	it("HeinOnline journal article", () => {
		const r = parseHeinCover(HEIN_ARTICLE)!;
		expect(r.item).toMatchObject({
			itemType: "journalArticle",
			fields: { title: "The Rule of Law and Its Virtue", date: "1977", publicationTitle: "Law Quarterly Review", volume: "93", issue: "2", pages: "195-211", journalAbbreviation: "Law Q. Rev." },
			creators: [{ firstName: "Joseph", lastName: "Raz" }],
		});
	});

	it("JSTOR and SSRN", () => {
		expect(parseJstorCover(JSTOR)!.item).toMatchObject({
			itemType: "journalArticle",
			fields: { title: "The Rule of Law as a Theory of Adjudication", publicationTitle: "The Yale Law Journal", volume: "115", issue: "6", date: "2006", pages: "1346-1406", url: "https://www.jstor.org/stable/20455656" },
			creators: [{ lastName: "Waldron" }, { lastName: "Raz" }],
		});
		expect(ssrnDOI("Electronic copy available at: https://ssrn.com/abstract=955815")).toBe("10.2139/ssrn.955815");
	});

	it("author lists", () => {
		expect(namesToCreators("John Smith, Jane Doe & Ludwig van Beethoven").map((c) => c.lastName)).toEqual(["Smith", "Doe", "van Beethoven"]);
	});

	it("the uploaded file is identified with title, author and year ticked", async () => {
		const id = identifyFile({ text: fixture("files/hein-cover-book.txt"), filename: "85071237-httpsheinonline.org_holsupportwshein.com.pdf" });
		expect(id).toMatchObject({ identified: true, via: "HeinOnline" });
		const env = fakeEnv({ "openlibrary.org/search.json": fixture("openlibrary-search-lemkin.json") });
		const rows = newItemRows(id.item, await checkItem(id.item, env), "file", id.identified, id.via);
		const ticked = Object.fromEntries(rows.filter((r) => r.preselect).map((r) => [r.field, r.suggested]));
		expect(ticked).toMatchObject({
			itemType: "book",
			title: "Axis Rule in Occupied Europe: Laws of Occupation, Analysis of Government, Proposals for Redress",
			creators: "Lemkin, Raphael",
			date: "1944",
			publisher: "Carnegie Endowment for International Peace, Division of International Law",
		});
		expect(missingBasics(itemFromRows(rows))).toEqual([]);
	});
});

describe("guesses from the text", () => {
	it("title, authors and year from a typical first page", () => {
		const g = guessMeta("\n\nTHE PROTECTION OF MINORITIES\nIN INTERNATIONAL LAW\nPatrick Thornberry and Jane Doe\nClarendon Press, Oxford\n© 1991 Patrick Thornberry\n");
		expect(g).toEqual({
			title: "The Protection of Minorities in International Law",
			creators: [
				{ creatorType: "author", firstName: "Patrick", lastName: "Thornberry" },
				{ creatorType: "author", firstName: "Jane", lastName: "Doe" },
			],
			year: "1991",
		});
	});
});

describe("title pages and prose", () => {
	it("a scanned title page with subtitle lines and 'By'", () => {
		const g = guessMeta("AXIS RULE IN\nOCCUPIED EUROPE\nLAWS OF OCCUPATION · ANALYSIS OF GOVERNMENT\nPROPOSALS FOR REDRESS\nBy\nRAPHAEL LEMKIN\nWASHINGTON\nCARNEGIE ENDOWMENT FOR INTERNATIONAL PEACE\n1944\n");
		expect(g).toEqual({
			title: "Axis Rule in Occupied Europe: Laws of Occupation, Analysis of Government, Proposals for Redress",
			creators: [{ creatorType: "author", firstName: "Raphael", lastName: "Lemkin" }],
			year: "1944",
		});
	});

	it("running text gives no title rather than a wrong one", () => {
		const g = guessMeta("PREFACE\nThe present book grew out of a desire to give an analysis, based upon\nobjective information and evidence, of the rule imposed upon the occupied\ncountries of Europe by the Axis Powers.");
		expect(g.title).toBeUndefined();
	});

	it("meaningless file names are not used as titles", () => {
		const r = identifyFile({ text: "", filename: "85071237-httpsheinonline.org_holsupportwshein.com.pdf", title: "Full Text PDF" });
		expect(r.item.fields.title).toBe("");
		expect(identifyFile({ text: "", filename: "Lemkin_Axis_Rule_Occupied_Europe.pdf" }).item.fields.title).toBe("Lemkin Axis Rule Occupied Europe");
	});
});

describe("widening the search", () => {
	it("a file without a cover page or identifier: guesses, then Open Library confirms", async () => {
		const env = fakeEnv({ "openlibrary.org/search.json": fixture("openlibrary-search-lemkin.json") });
		const draft = item("document", { title: "Axis Rule in Occupied Europe" });
		const exp = await expandSearch(draft, "AXIS RULE IN OCCUPIED EUROPE\nRaphael Lemkin\n", env);
		expect(exp.foundOnline).toBe(true);
		expect(exp.item.itemType).toBe("book");
		expect(exp.item.creators[0]).toMatchObject({ lastName: "Lemkin" });
		expect(exp.item.fields.date).toBe("1944");
		expect(missingBasics(exp.item)).toEqual([]);
	});

	it("a title match by a different author is not accepted", async () => {
		const env = fakeEnv({ "openlibrary.org/search.json": fixture("openlibrary-search-lemkin.json"), "api.crossref.org": '{"message":{"items":[]}}' });
		const exp = await expandSearch(item("document", { title: "Axis Rule in Occupied Europe" }, [{ creatorType: "author", firstName: "A", lastName: "Nobody" }]), "", env);
		expect(exp.foundOnline).toBe(false);
		expect(missingBasics(exp.item)).toEqual(["date"]);
	});
});
