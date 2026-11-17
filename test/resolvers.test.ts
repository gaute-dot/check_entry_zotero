import { describe, expect, it } from "vitest";
import { checkItem } from "../src/core/check";
import { fakeEnv, fixture, item } from "./helpers";

const byField = (res: Awaited<ReturnType<typeof checkItem>>) => Object.fromEntries(res.suggestions.map((s) => [s.field, s]));

describe("Crossref / OpenAlex", () => {
	it("fills a journal article from its DOI", async () => {
		const env = fakeEnv({ "api.crossref.org/works/10.1093": fixture("crossref-work.json") });
		const res = await checkItem(item("journalArticle", { title: "The rule of law and its virtue", DOI: "10.1093/ojls/gqi001" }), env);
		const s = byField(res);
		expect(s.publicationTitle.suggested).toBe("Oxford Journal of Legal Studies");
		expect(s.volume.suggested).toBe("25");
		expect(s.pages.suggested).toBe("1-24");
		expect(s.date.suggested).toBe("2005-03-01");
		expect(s.creators.creators).toEqual([{ creatorType: "author", firstName: "Joseph", lastName: "Raz" }]);
		expect(s.publicationTitle.preselect).toBe(true);
		// same title, different case/markup -> no suggestion
		expect(s.title).toBeUndefined();
		// OpenAlex is only a fallback
		expect(env.requested.some((u) => u.includes("openalex"))).toBe(false);
	});

	it("searches by title and accepts only a close match by the same author", async () => {
		const env = fakeEnv({ "query.bibliographic": fixture("crossref-search.json") });
		const res = await checkItem(
			item("journalArticle", { title: "Proportionality and the Human Rights Act" }, [{ creatorType: "author", lastName: "Smith", firstName: "J" }]),
			env,
		);
		expect(byField(res).DOI.suggested).toBe("10.1111/1468-2230.12345");

		const other = await checkItem(
			item("journalArticle", { title: "Proportionality and the Human Rights Act" }, [{ creatorType: "author", lastName: "Jones", firstName: "K" }]),
			env,
		);
		expect(byField(other).DOI).toBeUndefined();
		expect(other.issues.map((i) => i.message.id)).toContain("oc-issue-source-low-confidence");
	});

	it("an existing different value is offered unticked", async () => {
		const env = fakeEnv({ "api.crossref.org/works/": fixture("crossref-work.json") });
		const res = await checkItem(item("journalArticle", { title: "x", DOI: "10.1093/ojls/gqi001", volume: "26" }), env);
		expect(byField(res).volume).toMatchObject({ suggested: "25", preselect: false });
	});

	it("falls back to OpenAlex when Crossref fails, and reports the failure", async () => {
		const env = fakeEnv({
			"api.crossref.org": new Error("HTTP 503"),
			"api.openalex.org": JSON.stringify({ display_name: "T", publication_year: 2005, biblio: { volume: "25", first_page: "1", last_page: "24" }, authorships: [{ author: { display_name: "Joseph Raz" } }], primary_location: { source: { display_name: "Oxford Journal of Legal Studies" } } }),
		});
		const res = await checkItem(item("journalArticle", { title: "T", DOI: "10.1093/ojls/gqi001" }), env);
		expect(byField(res).pages.suggested).toBe("1–24");
		expect(byField(res).creators.creators?.[0]).toMatchObject({ firstName: "Joseph", lastName: "Raz" });
		expect(res.issues.find((i) => i.message.id === "oc-issue-source-failed")?.message.args).toMatchObject({ source: "crossref" });
	});
});

describe("Open Library", () => {
	it("fills a book from its ISBN", async () => {
		const env = fakeEnv({ "openlibrary.org": fixture("openlibrary.json") });
		const res = await checkItem(item("book", { title: "", ISBN: "978-0-19-884832-5" }), env);
		const s = byField(res);
		expect(s.title.suggested).toBe("Constitutional and Administrative Law");
		expect(s.publisher.suggested).toBe("Oxford University Press");
		expect(s.date.suggested).toBe("2022");
		expect(s.creators.creators).toHaveLength(2);
	});
});

describe("legislation.gov.uk", () => {
	it("looks up an Act by URL", async () => {
		const env = fakeEnv({ "ukpga/2010/15/data.xml": fixture("leg-ukpga-2010-15.xml") });
		const res = await checkItem(item("statute", { nameOfAct: "", url: "https://www.legislation.gov.uk/ukpga/2010/15" }), env);
		const s = byField(res);
		expect(s.nameOfAct.suggested).toBe("Equality Act");
		expect(s.dateEnacted.suggested).toBe("2010-04-08");
	});

	it("searches by title and picks the right year", async () => {
		const env = fakeEnv({ "data.feed": fixture("leg-search.feed"), "ukpga/2010/15/data.xml": fixture("leg-ukpga-2010-15.xml") });
		const res = await checkItem(item("statute", { nameOfAct: "Equality Act 2010" }), env);
		const s = byField(res);
		expect(env.requested[0]).toContain("year=2010");
		expect(s.nameOfAct.suggested).toBe("Equality Act");
		expect(s.dateEnacted.suggested).toBe("2010-04-08");
		expect(s.url.suggested).toBe("https://www.legislation.gov.uk/ukpga/2010/15");
	});
});

describe("Find Case Law", () => {
	it("fetches a judgment by neutral citation", async () => {
		const env = fakeEnv({ "uksc/2015/11/data.xml": fixture("fcl-uksc-2015-11.xml") });
		const res = await checkItem(item("case", { caseName: "", docketNumber: "[2015] UKSC 11" }), env);
		const s = byField(res);
		expect(s.caseName.suggested).toBe("Montgomery v Lanarkshire Health Board (Scotland)");
		expect(s.dateDecided.suggested).toBe("2015-03-11");
		expect(s.court.suggested).toBe("UKSC");
		expect(s.docketNumber.suggested).toBe("11");
	});
});

describe("EUR-Lex", () => {
	it("fetches a CJEU judgment by case number", async () => {
		const env = fakeEnv({ "publications.europa.eu": fixture("eurlex-case.json") });
		const res = await checkItem(item("case", { caseName: "", docketNumber: "C-176/03" }), env);
		const s = byField(res);
		expect(decodeURIComponent(env.requested[0])).toContain('"62003CJ0176"^^xsd:string');
		expect(s.caseName.suggested).toBe("Case C-176/03 Commission of the European Communities v Council of the European Union");
		expect(s.dateDecided.suggested).toBe("2005-09-13");
		expect(s.extra.suggested).toBe("CELEX: 62003CJ0176\nECLI: ECLI:EU:C:2005:542");
	});

	it("fetches a regulation", async () => {
		const env = fakeEnv({ "publications.europa.eu": fixture("eurlex-reg.json") });
		const res = await checkItem(item("statute", { nameOfAct: "Regulation (EU) 2016/679" }), env);
		const s = byField(res);
		expect(s.nameOfAct.suggested).toMatch(/^Regulation \(EU\) 2016\/679 of the European Parliament.*\(General Data Protection Regulation\)$/);
		expect(s.nameOfAct.preselect).toBe(false); // differs from what the user typed
		expect(s.dateEnacted.suggested).toBe("2016-04-27");
	});
});

describe("HUDOC", () => {
	it("fetches an ECtHR judgment by application number", async () => {
		const env = fakeEnv({ "hudoc.echr.coe.int": fixture("hudoc.json") });
		const res = await checkItem(item("case", { caseName: "", docketNumber: "App no 23452/94" }), env);
		const s = byField(res);
		expect(s.caseName.suggested).toBe("Osman v the United Kingdom");
		expect(s.dateDecided.suggested).toBe("1998-10-28");
		expect(s.court.suggested).toBe("ECtHR");
		expect(s.url.suggested).toBe("https://hudoc.echr.coe.int/eng?i=001-58257");
	});
});

describe("Lovdata", () => {
	it("fetches a Norwegian Act", async () => {
		const env = fakeEnv({ "lovdata.no/dokument/NL/lov/2005-06-17-62": fixture("lovdata-aml.html") });
		const res = await checkItem(item("statute", { nameOfAct: "", publicLawNumber: "LOV-2005-06-17-62" }), env);
		const s = byField(res);
		expect(s.nameOfAct.suggested).toBe("Lov 17. juni 2005 nr. 62 om arbeidsmiljø, arbeidstid og stillingsvern mv. (arbeidsmiljøloven)");
		expect(s.shortTitle.suggested).toBe("arbeidsmiljøloven");
		expect(s.dateEnacted.suggested).toBe("2005-06-17");
		expect(s.url.suggested).toBe("https://lovdata.no/lov/2005-06-17-62");
	});
});

describe("source settings", () => {
	it("skips disabled sources", async () => {
		const env = { ...fakeEnv({}), enabledSources: { crossref: false, openalex: false } };
		const res = await checkItem(item("journalArticle", { title: "T", DOI: "10.1/x" }), env);
		expect(env.requested).toHaveLength(0);
		expect(res.issues.some((i) => i.message.id === "oc-issue-source-failed")).toBe(false);
	});
});

describe("rules and online data together", () => {
	it("keeps the tidied user value ticked and offers the online value as an unticked alternative", async () => {
		const env = fakeEnv({ "uksc/2015/11/data.xml": fixture("fcl-uksc-2015-11.xml") });
		const res = await checkItem(item("case", { caseName: "Montgomery v. Lanarkshire Health Board [2015] UKSC 11, [2015] AC 1430" }), env);
		const names = res.suggestions.filter((s) => s.field === "caseName");
		expect(names).toHaveLength(2);
		expect(names[0]).toMatchObject({ suggested: "Montgomery v Lanarkshire Health Board", preselect: true, source: "rules" });
		expect(names[1]).toMatchObject({ suggested: "Montgomery v Lanarkshire Health Board (Scotland)", preselect: false, source: "find-case-law" });
		// the precise date from the source replaces the year derived from the citation
		expect(res.suggestions.find((s) => s.field === "dateDecided")).toMatchObject({ suggested: "2015-03-11", preselect: true });
		expect(res.issues.map((i) => i.message.id)).not.toContain("oc-issue-missing-field");
	});
});
