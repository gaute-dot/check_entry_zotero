// Regenerates src/resolvers/data/un-general-comments.json: general comments and
// general recommendations of the UN treaty bodies, with their document symbols.
// Older ones are catalogued in the UN Digital Library under generic titles
// ("General comment adopted by the Human Rights Committee under article 40 …"),
// so the plugin uses this list to find the symbol from "General Comment No 22".
//   node scripts/build-un-gc-index.mjs
import { DOMParser } from "@xmldom/xmldom";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

export const COMMITTEES = [
	{ id: "CCPR", name: "Human Rights Committee", prefixes: ["CCPR/"], kind: "general comment" },
	{ id: "CESCR", name: "Committee on Economic, Social and Cultural Rights", prefixes: ["E/C.12/", "E/1"], kind: "general comment" },
	{ id: "CERD", name: "Committee on the Elimination of Racial Discrimination", prefixes: ["CERD/"], kind: "general recommendation" },
	{ id: "CEDAW", name: "Committee on the Elimination of Discrimination against Women", prefixes: ["CEDAW/"], kind: "general recommendation" },
	{ id: "CRC", name: "Committee on the Rights of the Child", prefixes: ["CRC/"], kind: "general comment" },
	{ id: "CAT", name: "Committee against Torture", prefixes: ["CAT/"], kind: "general comment" },
	{ id: "CMW", name: "Committee on Migrant Workers", prefixes: ["CMW/"], kind: "general comment" },
	{ id: "CRPD", name: "Committee on the Rights of Persons with Disabilities", prefixes: ["CRPD/"], kind: "general comment" },
	{ id: "CED", name: "Committee on Enforced Disappearances", prefixes: ["CED/"], kind: "general comment" },
];

const NS = "http://www.loc.gov/MARC21/slim";
const get = (url) => execFileSync("curl", ["-sS", "--max-time", "120", url], { maxBuffer: 100 * 1024 * 1024 }).toString("utf8");

function records(q) {
	const out = [];
	for (let jrec = 1; jrec < 2000; jrec += 200) {
		const xml = get(`https://digitallibrary.un.org/search?p=${encodeURIComponent(q)}&of=xm&rg=200&jrec=${jrec}`);
		const doc = new DOMParser().parseFromString(xml, "text/xml");
		const recs = Array.from(doc.getElementsByTagNameNS(NS, "record"));
		for (const r of recs) {
			const f = {};
			for (const df of Array.from(r.getElementsByTagNameNS(NS, "datafield"))) {
				const subs = {};
				for (const sf of Array.from(df.getElementsByTagNameNS(NS, "subfield"))) (subs[sf.getAttribute("code")] ??= []).push(sf.textContent.trim());
				(f[df.getAttribute("tag")] ??= []).push(subs);
			}
			out.push(f);
		}
		if (recs.length < 200) break;
	}
	return out;
}

const index = [];
for (const c of COMMITTEES) {
	const found = new Map(); // number -> entry
	const seen = new Set();
	for (const q of [`"${c.kind}" "${c.name}"`, `${c.kind} ${c.name}`]) {
		for (const f of records(q)) {
			const symbol = f["191"]?.[0]?.a?.[0] ?? "";
			if (!symbol || seen.has(symbol)) continue;
			seen.add(symbol);
			if (!c.prefixes.some((p) => symbol.startsWith(p))) continue;
			// drafts, corrigenda, conference room papers, compilations
			if (/\/(CRP|R)\.|\/R\/|Corr\.|\/WP\.|\/DGC\//.test(symbol)) continue;
			const titles = [...(f["245"] ?? []), ...(f["246"] ?? []), ...(f["505"] ?? [])].map((s) => [s.a?.[0], s.b?.[0]].filter(Boolean).join(" "));
			const all = titles.join(" | ");
			if (/\bdraft\b/i.test(titles[0] ?? "")) continue;
			// "General comments under article 40 …" = a compilation of several comments
			if (/^general (comments|recommendations)\b/i.test(titles[0] ?? "")) continue;
			// "Joint general recommendation No. 31 of CEDAW / general comment No. 18 of CRC" counts for both
			const re = new RegExp(`(?:${c.kind}|joint ${c.kind})s?\\s*(?:no\\.?|number)?\\s*(\\d+)`, "gi");
			const nums = [...new Set([...all.matchAll(re)].map((m) => m[1]))];
			if (nums.length !== 1) continue; // compilations and reports list many
			const num = Number(nums[0]);
			const date = f["269"]?.[0]?.a?.[0] ?? "";
			const title = (f["246"]?.[0]?.a?.[0] ?? titles[0] ?? "").replace(/\s*[:/;.]\s*$/, "");
			const entry = { committee: c.id, number: num, symbol, date, title };
			const prev = found.get(num);
			// prefer the dedicated /GC/ or /GR/ symbol, then the earliest document
			const rank = (e) => (/\/G[CR]\//.test(e.symbol) ? 0 : 1);
			if (!prev || rank(entry) < rank(prev) || (rank(entry) === rank(prev) && entry.date < prev.date)) found.set(num, entry);
		}
	}
	const list = [...found.values()].sort((a, b) => a.number - b.number);
	console.log(`${c.id}: ${list.length} (${list.map((e) => e.number).join(",")})`);
	index.push(...list);
}
writeFileSync("src/resolvers/data/un-general-comments.json", JSON.stringify(index));
console.log(`${index.length} entries`);
