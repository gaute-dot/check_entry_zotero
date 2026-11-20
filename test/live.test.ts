/**
 * Checks against the real online services. Skipped unless LIVE=1:
 *   LIVE=1 npx vitest run test/live.test.ts
 */
import { describe, expect, it } from "vitest";
import { checkItem } from "../src/core/check";
import { item } from "./helpers";
import { liveEnv } from "./live-env";

const live = process.env.LIVE === "1" ? describe : describe.skip;
const T = 60_000;

async function check(it: ReturnType<typeof item>) {
	const res = await checkItem(it, liveEnv);
	const by: Record<string, string> = {};
	for (const s of res.suggestions) if (!(s.field in by)) by[s.field] = s.suggested;
	const failed = res.issues.filter((i) => /source-(failed|no-match)/.test(i.message.id)).map((i) => JSON.stringify(i.message.args));
	return { res, by, failed };
}

live("live sources", () => {
	it("Crossref", async () => {
		const r = await check(item("journalArticle", { title: "", DOI: "10.1093/ojls/gqi001" }));
		expect(r.failed).toEqual([]);
		expect(r.by.publicationTitle).toMatch(/Oxford Journal of Legal Studies/);
	}, T);

	it("OpenAlex (Crossref switched off)", async () => {
		const r = await checkItem(item("journalArticle", { title: "", DOI: "10.1093/ojls/gqi001" }), { ...liveEnv, enabledSources: { crossref: false } });
		expect(r.suggestions.find((s) => s.field === "title")?.suggested).toBeTruthy();
	}, T);

	it("Open Library", async () => {
		const r = await check(item("book", { title: "", ISBN: "9780198848325" }));
		expect(r.failed).toEqual([]);
		expect(r.by.title).toBeTruthy();
	}, T);

	it("legislation.gov.uk by title", async () => {
		const r = await check(item("statute", { nameOfAct: "Equality Act 2010" }));
		expect(r.failed).toEqual([]);
		expect(r.by.dateEnacted).toBe("2010-04-08");
		expect(r.by.url).toBe("https://www.legislation.gov.uk/ukpga/2010/15");
	}, T);

	it("Find Case Law by neutral citation", async () => {
		const r = await check(item("case", { caseName: "", docketNumber: "[2015] UKSC 11" }));
		expect(r.failed).toEqual([]);
		expect(r.by.caseName).toMatch(/Montgomery/);
		expect(r.by.dateDecided).toBe("2015-03-11");
	}, T);

	it("EUR-Lex case and regulation", async () => {
		const c = await check(item("case", { caseName: "", docketNumber: "C-176/03" }));
		expect(c.failed).toEqual([]);
		expect(c.by.dateDecided).toBe("2005-09-13");
		const r = await check(item("statute", { nameOfAct: "Regulation (EU) 2016/679" }));
		expect(r.failed).toEqual([]);
		expect(r.by.dateEnacted).toBe("2016-04-27");
	}, T);

	it("HUDOC", async () => {
		const r = await check(item("case", { caseName: "", docketNumber: "App no 23452/94", court: "ECtHR" }));
		expect(r.failed).toEqual([]);
		expect(r.by.caseName).toMatch(/Osman/);
		expect(r.by.dateDecided).toBe("1998-10-28");
	}, T);

	it("Lovdata", async () => {
		const r = await check(item("statute", { nameOfAct: "", publicLawNumber: "LOV-2005-06-17-62" }));
		expect(r.failed).toEqual([]);
		expect(r.by.nameOfAct).toMatch(/^Lov 17\. juni 2005 nr\. 62 om arbeidsmiljø/);
	}, T);
});
