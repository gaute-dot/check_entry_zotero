// Regenerates src/resolvers/data/untc-index.json: the titles of all multilateral
// treaties deposited with the UN Secretary-General (MTDSG), by chapter.
// The UN Treaty Collection has no search API, so the plugin matches titles
// against this index and then fetches the treaty's details page live.
//   node scripts/build-untc-index.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const get = (url) => execFileSync("curl", ["-sSL", "--max-time", "60", url], { maxBuffer: 20 * 1024 * 1024 }).toString("utf8");
const clean = (s) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

const out = [];
for (let chapter = 1; chapter <= 29; chapter++) {
	const html = get(`https://treaties.un.org/Pages/Treaties.aspx?id=${chapter}&subid=A&clang=_en`);
	const re = /href="ViewDetails\.aspx\?src=TREATY&(?:amp;)?mtdsg_no=([^&"]+)&(?:amp;)?chapter=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
	let m;
	let n = 0;
	while ((m = re.exec(html))) {
		const text = clean(m[3]);
		// "Convention against Torture ... . New York, 10 December 1984"
		const parts = /^(.*?)\.\s+([^.,]+(?:,[^.,]+)*),\s+(\d{1,2} \w+ \d{4})$/.exec(text);
		out.push({ no: m[1], chapter: Number(m[2]), title: parts ? parts[1] : text, place: parts?.[2] ?? "", date: parts?.[3] ?? "" });
		n++;
	}
	console.log(`chapter ${chapter}: ${n}`);
}
for (const t of out) t.title = t.title.trim();
writeFileSync("src/resolvers/data/untc-index.json", JSON.stringify(out));
console.log(`${out.length} treaties`);
