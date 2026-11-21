import { describe, expect, it } from "vitest";
import { ensureBasics } from "../src/core/basics";
import { checkItem } from "../src/core/check";
import { fakeEnv, fixture, item } from "./helpers";

const run = async (it: ReturnType<typeof item>, env: ReturnType<typeof fakeEnv>, text?: string) =>
	ensureBasics(it, await checkItem(it, env), env, text === undefined ? undefined : async () => text);
const by = (r: Awaited<ReturnType<typeof run>>) => Object.fromEntries(r.suggestions.map((s) => [s.field, s]));

describe("existing items: title, author and year", () => {
	it("a book without author and year is completed from Open Library", async () => {
		const env = fakeEnv({ "openlibrary.org/search.json": fixture("openlibrary-search-lemkin.json") });
		const r = await run(item("book", { title: "Axis Rule in Occupied Europe" }), env);
		// the normal check already searches Open Library for books without ISBN; the result must be complete
		expect(by(r).date.suggested).toBe("1944");
		expect(by(r).creators.creators?.[0]).toMatchObject({ lastName: "Lemkin" });
		expect(r.issues.map((i) => i.message.id)).not.toContain("oc-issue-basics-missing");
	});

	it("a Document with only a title becomes a book, with author and year", async () => {
		const env = fakeEnv({ "openlibrary.org/search.json": fixture("openlibrary-search-lemkin.json"), "api.crossref.org": '{"message":{"items":[]}}' });
		const r = await run(item("document", { title: "Axis Rule in Occupied Europe", url: "https://example.org/x" }), env, "AXIS RULE IN\nOCCUPIED EUROPE\nBy\nRAPHAEL LEMKIN\n");
		const s = by(r);
		expect(s.itemType).toMatchObject({ suggested: "book", preselect: true });
		expect(s.creators).toMatchObject({ suggested: "Lemkin, Raphael", preselect: true });
		expect(s.date).toMatchObject({ suggested: "1944", source: "openlibrary" });
	});

	it("values guessed from the PDF are marked when nothing is found online", async () => {
		const env = fakeEnv({ "openlibrary.org": '{"docs":[]}', "api.crossref.org": '{"message":{"items":[]}}' });
		const r = await run(item("thesis", { title: "Minority Rights in Norway", university: "UiO" }), env, "MINORITY RIGHTS IN NORWAY\nBy\nKARI NORDMANN\n© 2019\n");
		expect(by(r).creators).toMatchObject({ suggested: "Nordmann, Kari", source: "file", reason: { id: "oc-reason-basics-guessed" } });
		expect(by(r).date).toMatchObject({ suggested: "2019", source: "file" });
		expect(r.issues.map((i) => i.message.id)).toContain("oc-issue-basics-guessed-item");
	});

	it("names what is still missing", async () => {
		const env = fakeEnv({ "openlibrary.org": '{"docs":[]}', "api.crossref.org": '{"message":{"items":[]}}' });
		const r = await run(item("book", { title: "Unknown book", publisher: "X" }), env);
		expect(r.issues.find((i) => i.message.id === "oc-issue-basics-missing")?.message.args).toEqual({ fields: "creators, date" });
	});

	it("leaves complete items and legal material alone", async () => {
		const env = fakeEnv({});
		const done = item("book", { title: "T", date: "2001", publisher: "P" }, [{ creatorType: "author", firstName: "A", lastName: "B" }]);
		expect((await run(done, env, "x")).suggestions).toEqual((await checkItem(done, env)).suggestions);
		const c = item("case", { caseName: "Donoghue v Stevenson", reporter: "AC", firstPage: "562", court: "HL" });
		expect((await run(c, env, "x")).issues.map((i) => i.message.id)).not.toContain("oc-issue-basics-missing");
	});
});
