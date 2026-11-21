import { describe, expect, it } from "vitest";
import { findBook } from "../src/resolvers/catalogues";
import { fakeEnv } from "./helpers";

const ol = (docs: object[]) => JSON.stringify({ docs });
const nb = (items: object[]) => JSON.stringify({ _embedded: { items: items.map((metadata) => ({ metadata })) } });
const oa = (results: object[]) => JSON.stringify({ results });

const HART_OL = { title: "The concept of law", author_name: ["H. L. A. Hart"], first_publish_year: 1961, publisher: ["Clarendon Press"], publish_place: ["New York"] };
const HART_NB = { title: "The  concept of law  : with a postscript", creators: ["Hart, H.L.A. (Herbert Lionel Adolphus)"], originInfo: { issued: "1994", publisher: "Clarendon Press" } };
const HART_OA = { display_name: "The Concept of Law", publication_year: 1961, authorships: [{ author: { display_name: "Herbert Lionel Adolphus Hart" } }] };
const POKOL_NB = { title: "The  concept of law  : the multi-layered legal system", creators: ["Pokol, Béla"], originInfo: { issued: "2001", publisher: "Rejtjel" } };

describe("book catalogues", () => {
	it("without an author: accepts the author two catalogues agree on", async () => {
		const env = fakeEnv({ "openlibrary.org": ol([HART_OL]), "api.nb.no": nb([POKOL_NB, HART_NB]), "api.openalex.org": oa([HART_OA]) });
		const c = await findBook(env, "The Concept of Law", []);
		expect(c?.creators?.[0]).toMatchObject({ lastName: "Hart" });
		expect(c?.fields).toEqual({ date: "1961", publisher: "Clarendon Press" });
	});

	it("without an author: one catalogue alone is not enough when the title is shared", async () => {
		const env = fakeEnv({ "openlibrary.org": ol([]), "api.nb.no": nb([POKOL_NB, HART_NB]), "api.openalex.org": oa([]) });
		expect(await findBook(env, "The Concept of Law", [])).toBeNull();
	});

	it("with an author: only that author's book", async () => {
		const env = fakeEnv({ "openlibrary.org": ol([]), "api.nb.no": nb([POKOL_NB, HART_NB]), "api.openalex.org": oa([]) });
		expect((await findBook(env, "The Concept of Law", [{ creatorType: "author", firstName: "Béla", lastName: "Pokol" }]))?.fields.date).toBe("2001");
		expect(await findBook(env, "The Concept of Law", [{ creatorType: "author", firstName: "X", lastName: "Nobody" }])).toBeNull();
	});

	it("a catalogue that cannot be reached is skipped", async () => {
		const env = fakeEnv({ "openlibrary.org": new Error("HTTP 503"), "api.nb.no": nb([HART_NB]), "api.openalex.org": oa([HART_OA]) });
		expect((await findBook(env, "The Concept of Law", []))?.creators?.[0]).toMatchObject({ lastName: "Hart" });
	});

	it("respects switched-off sources", async () => {
		const env = { ...fakeEnv({ "openlibrary.org": ol([HART_OL]), "api.nb.no": nb([HART_NB]), "api.openalex.org": oa([HART_OA]) }), enabledSources: { nb: false, openalex: false } };
		await findBook(env, "The Concept of Law", []);
		expect(env.requested.every((u) => u.includes("openlibrary.org"))).toBe(true);
	});
});
