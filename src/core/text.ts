/** Small text helpers used for comparing and cleaning values. */

export function collapse(s: string): string {
	return s.replace(/[\s ]+/g, " ").trim();
}

/** Lowercase, strip diacritics and punctuation — for "is this the same value?" checks. */
export function normalizeForCompare(s: string | undefined): string {
	if (!s) return "";
	return s
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "and")
		.replace(/[^a-z0-9æøå]+/g, " ")
		.trim();
}

export function sameValue(a: string | undefined, b: string | undefined): boolean {
	return normalizeForCompare(a) === normalizeForCompare(b);
}

/** Dice coefficient on word bigrams, 0..1. Used to decide whether a search hit is the same work. */
export function similarity(a: string | undefined, b: string | undefined): number {
	const x = normalizeForCompare(a);
	const y = normalizeForCompare(b);
	if (!x || !y) return 0;
	if (x === y) return 1;
	const grams = (s: string) => {
		const w = s.split(" ");
		if (w.length === 1) return [s];
		const out: string[] = [];
		for (let i = 0; i < w.length - 1; i++) out.push(w[i] + " " + w[i + 1]);
		return out;
	};
	const ga = grams(x);
	const gb = grams(y);
	const counts = new Map<string, number>();
	for (const g of ga) counts.set(g, (counts.get(g) ?? 0) + 1);
	let hits = 0;
	for (const g of gb) {
		const c = counts.get(g) ?? 0;
		if (c > 0) {
			hits++;
			counts.set(g, c - 1);
		}
	}
	return (2 * hits) / (ga.length + gb.length);
}

/** Strip HTML/JATS tags that Crossref sometimes includes in titles. */
export function stripTags(s: string): string {
	return collapse(
		s
			.replace(/<[^>]+>/g, "")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'"),
	);
}

/** "CASE OF OSMAN v. THE UNITED KINGDOM" -> "Osman v the United Kingdom" */
export function tidyCaseName(s: string): string {
	let t = collapse(s)
		.replace(/^(CASE OF|AFFAIRE|CASE)\s+/i, "")
		.replace(/\s+(?:vs?\.?|versus)\s+/gi, " v ")
		.replace(/\s*\.$/, "");
	if (t.replace(/ v /g, " V ") === t.replace(/ v /g, " V ").toUpperCase()) {
		const small = new Set(["v", "and", "of", "the", "for", "in", "on", "a", "an", "de", "la", "le", "du"]);
		t = t
			.toLowerCase()
			.split(" ")
			.map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
			.join(" ")
			.replace(/\bUk\b/g, "UK");
	}
	return t;
}

export function isoDate(y: number | string, m?: number | string, d?: number | string): string {
	let s = String(y);
	if (m) s += "-" + String(m).padStart(2, "0");
	if (m && d) s += "-" + String(d).padStart(2, "0");
	return s;
}
