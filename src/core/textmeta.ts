/**
 * Last-resort guesses of title, authors and year from the text of a
 * document, for files without a cover page or identifier.
 */
import { namesToCreators } from "./cover";
import { collapse } from "./text";
import type { Creator } from "./types";

export interface Guess {
	title?: string;
	creators?: Creator[];
	year?: string;
}

const JUNK = /https?:|www\.|@|©|copyright|all rights reserved|downloaded|\bvol(?:ume)?\.?\s*\d|\bissue\b|\bpage\s*\d|\bdoi\b|\bissn\b|\bisbn\b|^\d+$|^[ivxlc]+$|^(abstract|contents|table of contents|introduction|preface|summary|chapter \d+)$/i;

function titleCase(s: string): string {
	if (s !== s.toUpperCase()) return s;
	const small = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "v", "with"]);
	return s
		.toLowerCase()
		.split(" ")
		.map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
		.join(" ");
}

const NAME = "(?:[A-ZÀ-Þ][\\p{L}'’-]+|[A-Z]\\.)(?:\\s+(?:[A-ZÀ-Þ][\\p{L}'’-]+|[A-Z]\\.|van|von|de|der|da|di|du|la|le)){1,4}";
const AUTHOR_LINE = new RegExp(`^(?:by\\s+)?(${NAME}(?:\\s*(?:,|,?\\s+and|&)\\s*${NAME})*)\\s*[*†‡\\d]*$`, "u");

export function guessMeta(text: string): Guess {
	const lines = text
		.split(/\r?\n/)
		.map((l) => collapse(l))
		.filter(Boolean)
		.slice(0, 80);
	const g: Guess = {};

	// Prose is not a title: long lines that run on into the next line in lower case
	const isProse = (i: number) => lines[i].split(" ").length > 14 || (lines[i].length > 60 && /^[a-z]/.test(lines[i + 1] ?? ""));
	const isTitle = (l: string, i: number) =>
		/^[A-ZÀ-Þ0-9"'‘“(]/.test(l) && l.length >= 10 && l.length <= 160 && l.split(" ").length >= 2 && /[a-zA-Z]{3}/.test(l) && !JUNK.test(l) && !/[.;,]$/.test(l) && !isProse(i);
	const caps = (x: string) => x === x.toUpperCase() && /[A-Z]/.test(x);
	const STOP_RE = /\b(IN|OF|THE|AND|FOR|ON|TO|AT|A|AN|AS|BY|WITH|FROM|UNDER|BETWEEN)\b/;
	const isBy = (l: string) => /^by$/i.test(l);
	const isAuthor = (l: string) => AUTHOR_LINE.test(l) && l.length < 120 && !/\d{4}/.test(l) && !/\b(for|of|the|in|on|to|from|under|law|rights|press|university|europe|international)\b/i.test(l);

	const ti = lines.slice(0, 25).findIndex((l, i) => isTitle(l, i));
	if (ti >= 0) {
		let title = lines[ti];
		let used = 1;
		// the title continues on the next line: in lower case, or after a small word ("AXIS RULE IN / OCCUPIED EUROPE")
		const next = lines[ti + 1];
		// (a continuation may be short: "OF LAW")
		const isCont = (l: string, i: number) => /[A-Za-z]{2}/.test(l) && l.length <= 160 && !JUNK.test(l) && !/[.;,]$/.test(l) && !isProse(i);
		if (next && isCont(next, ti + 1) && !isBy(next) && (/^[a-z:–-]/.test(next) || /\b(in|of|the|and|for|on|to|a|an)$/i.test(title) || (caps(title) && caps(next) && STOP_RE.test(next) && !isAuthor(next)))) {
			title += " " + next;
			used = 2;
		}
		// subtitle lines in capitals, before the author ("LAWS OF OCCUPATION · ANALYSIS OF GOVERNMENT")
		const sub: string[] = [];
		while (sub.length < 2 && caps(title)) {
			const l = lines[ti + used];
			if (!l || isBy(l) || isAuthor(l) || !caps(l) || !isTitle(l, ti + used)) break;
			sub.push(l.replace(/\s*[·•]\s*/g, ", "));
			used++;
		}
		g.title = titleCase(title.replace(/[*†‡]+$/, "")).replace(/\s+:/, ":") + (sub.length ? ": " + titleCase(sub.join(", ")) : "");

		const after = lines.slice(ti + used, ti + used + 6);
		const byAt = after.findIndex(isBy);
		const candidates = byAt >= 0 ? [after[byAt + 1] ?? ""] : after;
		for (const l of candidates) {
			const m = AUTHOR_LINE.exec(l.replace(/^by\s+/i, "By "));
			if (m && (byAt >= 0 || isAuthor(l))) {
				const creators = namesToCreators(titleCase(m[1]));
				if (creators.length && creators.length <= 6 && creators.every((c) => c.lastName)) {
					g.creators = creators;
					break;
				}
			}
		}
	}

	const now = new Date().getFullYear();
	const ok = (y: string) => Number(y) >= 1500 && Number(y) <= now + 1;
	const copy = /(?:©|copyright|\(c\))\s*(?:\w+\s+){0,3}?(1[5-9]\d\d|20\d\d)/i.exec(text.slice(0, 20000))?.[1];
	if (copy && ok(copy)) g.year = copy;
	else {
		for (const l of lines.slice(0, 40)) {
			const y = /\b(1[5-9]\d\d|20\d\d)\b/.exec(l)?.[1];
			if (y && ok(y)) {
				g.year = y;
				break;
			}
		}
	}
	return g;
}
