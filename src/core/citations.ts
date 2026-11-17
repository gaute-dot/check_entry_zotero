/**
 * Parsers for legal citations and identifiers that appear in item fields.
 * All functions are pure and return null when nothing is recognised.
 */

// ---------------------------------------------------------------- UK / Irish neutral citations

/** Courts that use medium neutral citations, with Find Case Law URL paths. */
const NCN_COURTS: Record<string, { fcl?: string; divisions?: boolean }> = {
	"UKSC": { fcl: "uksc" },
	"UKPC": { fcl: "ukpc" },
	"UKHL": {},
	"EWCA Civ": { fcl: "ewca/civ" },
	"EWCA Crim": { fcl: "ewca/crim" },
	"EWHC": { fcl: "ewhc", divisions: true },
	"EWCOP": { fcl: "ewcop" },
	"EWFC": { fcl: "ewfc" },
	"UKUT": { fcl: "ukut", divisions: true },
	"UKFTT": { fcl: "ukftt", divisions: true },
	"UKEAT": { fcl: "eat" },
	"EAT": { fcl: "eat" },
	"UKIPTrib": { fcl: "ukiptrib" },
	"UKAIT": {},
	"CSIH": {},
	"CSOH": {},
	"HCJAC": {},
	"SAC": {},
	"NICA": {},
	"NIQB": {},
	"NIKB": {},
	"NICh": {},
	"NIFam": {},
	"IESC": {},
	"IECA": {},
	"IEHC": {},
};

const NCN_RE = new RegExp(
	"\\[(\\d{4})\\]\\s+(" +
		Object.keys(NCN_COURTS)
			.sort((a, b) => b.length - a.length)
			.map((c) => c.replace(" ", "\\s+"))
			.join("|") +
		")\\s+(B?\\s?\\d+)(?:\\s*\\(([A-Za-z]+)\\))?",
);

export interface NeutralCitation {
	year: string;
	/** Normalised court code, e.g. "EWCA Civ" */
	court: string;
	number: string;
	/** Division in brackets, e.g. "Ch" for "[2018] EWHC 456 (Ch)" */
	division?: string;
	/** The citation as matched */
	text: string;
	/** Canonical form, e.g. "[2018] EWHC 456 (Ch)" */
	canonical: string;
}

export function parseNeutralCitation(s: string | undefined): NeutralCitation | null {
	if (!s) return null;
	const m = NCN_RE.exec(s);
	if (!m) return null;
	const court = m[2].replace(/\s+/g, " ");
	const number = m[3].replace(/\s+/g, "");
	const division = m[4];
	const canonical = `[${m[1]}] ${court} ${number}` + (division ? ` (${division})` : "");
	return { year: m[1], court, number, division, text: m[0], canonical };
}

/** Find Case Law path, e.g. "ewhc/ch/2018/456", or null if the court is not covered. */
export function findCaseLawPath(ncn: NeutralCitation): string | null {
	const info = NCN_COURTS[ncn.court];
	if (!info?.fcl) return null;
	let path = info.fcl;
	if (info.divisions) {
		if (!ncn.division) return null;
		path += "/" + ncn.division.toLowerCase();
	}
	return `${path}/${ncn.year}/${ncn.number.toLowerCase()}`;
}

// ---------------------------------------------------------------- Law report citations

/**
 * Report series. `square` = the year is part of the citation and goes in
 * square brackets (e.g. [1932] AC 562); otherwise volumes are numbered and
 * the year goes in round brackets (e.g. (1998) 29 EHRR 245).
 */
export const REPORTERS: Record<string, { square: boolean }> = {
	"AC": { square: true },
	"QB": { square: true },
	"KB": { square: true },
	"Ch": { square: true },
	"Fam": { square: true },
	"P": { square: true },
	"WLR": { square: true },
	"All ER": { square: true },
	"All ER (D)": { square: true },
	"All ER (Comm)": { square: true },
	"Lloyd's Rep": { square: true },
	"BCLC": { square: true },
	"BCC": { square: true },
	"ICR": { square: true },
	"IRLR": { square: true },
	"FLR": { square: true },
	"FCR": { square: true },
	"FSR": { square: true },
	"RPC": { square: true },
	"EMLR": { square: true },
	"UKHRR": { square: true },
	"HRLR": { square: true },
	"PNLR": { square: true },
	"STC": { square: true },
	"Env LR": { square: true },
	"Med LR": { square: true },
	"Lloyd's Rep Med": { square: true },
	"ECR": { square: true },
	"SC": { square: false },
	"SLT": { square: false },
	"NI": { square: true },
	"Cr App R": { square: false },
	"Cr App R (S)": { square: false },
	"EHRR": { square: false },
	"CMLR": { square: false },
	"BMLR": { square: false },
	"HLR": { square: false },
	"P & CR": { square: false },
	"LGR": { square: false },
	"Rt": { square: true },
};

const REPORTER_RE_PART = Object.keys(REPORTERS)
	.sort((a, b) => b.length - a.length)
	.map((r) =>
		r
			.split("")
			.map((ch) =>
				ch === " " ? "\\.?\\s*" : ch === "'" ? "['’]" : /[A-Za-z]/.test(ch) ? ch + "\\.?" : ch.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&"),
			)
			.join(""),
	)
	.join("|");

const REPORT_RE = new RegExp(
	"([\\[(])(\\d{4})[\\])]\\s+(?:(\\d+)\\s+)?(" + REPORTER_RE_PART + ")\\.?\\s+(I-)?(\\d+)",
);

export interface ReportCitation {
	year: string;
	bracket: "square" | "round";
	volume?: string;
	reporter: string;
	page: string;
	text: string;
}

export function parseReportCitation(s: string | undefined): ReportCitation | null {
	if (!s) return null;
	const m = REPORT_RE.exec(s);
	if (!m) return null;
	const raw = m[4].replace(/\./g, "").replace(/\s+/g, " ").replace(/’/g, "'").trim();
	const reporter = Object.keys(REPORTERS).find((r) => r.toLowerCase() === raw.toLowerCase()) ?? raw;
	return {
		year: m[2],
		bracket: m[1] === "[" ? "square" : "round",
		volume: m[3],
		reporter,
		page: (m[5] ?? "") + m[6],
		text: m[0],
	};
}

// ---------------------------------------------------------------- EU

export interface EUCase {
	court: "C" | "T" | "F";
	number: string;
	year: string;
	/** "C-176/03" */
	caseNumber: string;
	/** CELEX of the judgment, e.g. "62003CJ0176" */
	celex: string;
}

export function fullYear(twoOrFour: string): string {
	if (twoOrFour.length === 4) return twoOrFour;
	const n = parseInt(twoOrFour, 10);
	return String(n >= 50 ? 1900 + n : 2000 + n);
}

export function parseEUCase(s: string | undefined): EUCase | null {
	if (!s) return null;
	const m = /\b(?:Case\s+|Sak\s+)?([CTF])\s*[-‑–]\s*(\d{1,4})\s*\/\s*(\d{2})\b/.exec(s);
	if (!m) return null;
	const court = m[1] as "C" | "T" | "F";
	const year = fullYear(m[3]);
	const celexType = court === "C" ? "CJ" : court === "T" ? "TJ" : "FJ";
	return {
		court,
		number: m[2],
		year,
		caseNumber: `${court}-${m[2]}/${m[3]}`,
		celex: `6${year}${celexType}${m[2].padStart(4, "0")}`,
	};
}

export function parseECLI(s: string | undefined): string | null {
	if (!s) return null;
	const m = /\bECLI:[A-Z]{2}:[A-Z0-9]+:\d{4}:[A-Z0-9.]+[A-Z0-9]/i.exec(s);
	return m ? m[0].toUpperCase() : null;
}

export interface EULegislation {
	kind: "R" | "L" | "D";
	year: string;
	number: string;
	celex: string;
}

/** Regulation (EU) 2016/679, Regulation (EC) No 139/2004, Directive 2000/78/EC, CELEX 32016R0679 */
export function parseEULegislation(s: string | undefined): EULegislation | null {
	if (!s) return null;
	const celex = /\b3(\d{4})([RLD])(\d{4})\b/.exec(s);
	if (celex) {
		return { kind: celex[2] as "R" | "L" | "D", year: celex[1], number: String(parseInt(celex[3], 10)), celex: celex[0] };
	}
	const m =
		/\b(Regulation|Directive|Decision|Forordning|Direktiv|Beslutning)\s*(?:\((?:EU|EC|EEC|EF|EØF|Euratom)(?:,\s*Euratom)?\))?\s*(?:No\.?\s*|nr\.?\s*)?(\d{1,4})\s*\/\s*(\d{1,4})/i.exec(
			s,
		);
	if (!m) return null;
	const word = m[1].toLowerCase();
	const kind: "R" | "L" | "D" = /^(regulation|forordning)$/.test(word) ? "R" : /^(directive|direktiv)$/.test(word) ? "L" : "D";
	let [a, b] = [m[2], m[3]];
	let year: string;
	let number: string;
	const isYear = (x: string) => /^(19[5-9]\d|20\d\d)$/.test(x);
	if (kind === "L") {
		// Directives have always been year/number
		year = fullYear(a);
		number = b;
	} else if (isYear(a) && !isYear(b)) {
		year = a;
		number = b;
	} else if (isYear(b) || b.length === 2) {
		year = fullYear(b);
		number = a;
	} else {
		year = fullYear(a);
		number = b;
	}
	return { kind, year, number: String(parseInt(number, 10)), celex: `3${year}${kind}${number.padStart(4, "0")}` };
}

// ---------------------------------------------------------------- ECHR

export function parseECHRAppNo(s: string | undefined, allowBare = false): string | null {
	if (!s) return null;
	const m = /\b(?:App(?:lication)?s?\.?\s*(?:no|nos|nr)\.?\s*|Klage\s*nr\.?\s*)(\d{1,6}\/\d{2})\b/i.exec(s);
	if (m) return m[1];
	if (allowBare) {
		const b = /\b(\d{1,6}\/\d{2})\b/.exec(s);
		if (b) return b[1];
	}
	return null;
}

// ---------------------------------------------------------------- Norway

export interface NorwegianCase {
	kind: "HR" | "Rt" | "lagmannsrett";
	/** "HR-2020-1234-A", "Rt. 2005 s. 1234", "LB-2019-12345" */
	canonical: string;
	year: string;
	page?: string;
}

export function parseNorwegianCase(s: string | undefined): NorwegianCase | null {
	if (!s) return null;
	let m = /\bHR-(\d{4})-(\d{1,5})-([AUP])\b/.exec(s);
	if (m) return { kind: "HR", canonical: `HR-${m[1]}-${m[2]}-${m[3]}`, year: m[1] };
	m = /\bRt\.?\s*-?\s*(\d{4})\s*[-.]?\s*(?:s\.\s*|s\s+)?(\d+)\b/.exec(s);
	if (m) return { kind: "Rt", canonical: `Rt. ${m[1]} s. ${m[2]}`, year: m[1], page: m[2] };
	m = /\b(L[ABEFGH])-(\d{4})-(\d+)(?:-\d+)?\b/.exec(s);
	if (m) return { kind: "lagmannsrett", canonical: m[0], year: m[2] };
	return null;
}

const NO_MONTHS = [
	"januar",
	"februar",
	"mars",
	"april",
	"mai",
	"juni",
	"juli",
	"august",
	"september",
	"oktober",
	"november",
	"desember",
];

export interface NorwegianAct {
	kind: "lov" | "forskrift";
	/** ISO date */
	date: string;
	number: string;
	/** Lovdata ID, e.g. "LOV-2005-06-17-62" */
	id: string;
}

export function parseNorwegianAct(s: string | undefined): NorwegianAct | null {
	if (!s) return null;
	const mk = (kind: "lov" | "forskrift", y: string, mo: string, d: string, n: string): NorwegianAct => {
		const date = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
		return { kind, date, number: n, id: `${kind === "lov" ? "LOV" : "FOR"}-${date}-${n}` };
	};
	let m = /\b(LOV|FOR)-(\d{4})-(\d{2})-(\d{2})-(\d+)\b/i.exec(s);
	if (m) return mk(m[1].toUpperCase() === "LOV" ? "lov" : "forskrift", m[2], m[3], m[4], m[5]);
	m = /lovdata\.no\/(?:dokument\/(?:NL|SF)\/)?(lov|forskrift)\/(\d{4})-(\d{2})-(\d{2})-(\d+)/i.exec(s);
	if (m) return mk(m[1].toLowerCase() as "lov" | "forskrift", m[2], m[3], m[4], m[5]);
	m = new RegExp(
		"\\b(lov|forskrift)\\s+(?:av\\s+)?(\\d{1,2})\\.\\s*(" + NO_MONTHS.join("|") + ")\\s+(\\d{4})\\s+nr\\.?\\s*(\\d+)",
		"i",
	).exec(s);
	if (m) {
		const month = String(NO_MONTHS.indexOf(m[3].toLowerCase()) + 1);
		return mk(m[1].toLowerCase() as "lov" | "forskrift", m[4], month, m[2], m[5]);
	}
	return null;
}

/** "2005-06-17" -> "17. juni 2005" */
export function norwegianDate(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return iso;
	return `${parseInt(m[3], 10)}. ${NO_MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

// ---------------------------------------------------------------- UK legislation

export interface UKLegislationRef {
	/** legislation.gov.uk type, e.g. "ukpga", "uksi" */
	type: string;
	year: string;
	number: string;
}

const UK_LEG_TYPES = "ukpga|ukla|uksi|asp|ssi|nia|nisr|asc|anaw|wsi|mwa|ukcm|aep|apgb|gbla|nisi|ukmo";

export function parseUKLegislationRef(s: string | undefined): UKLegislationRef | null {
	if (!s) return null;
	let m = new RegExp("legislation\\.gov\\.uk\\/(?:id\\/)?(" + UK_LEG_TYPES + ")\\/(\\d{4})\\/(\\d+)", "i").exec(s);
	if (m) return { type: m[1].toLowerCase(), year: m[2], number: m[3] };
	m = /\bS\.?\s?I\.?\s+(\d{4})\s*\/\s*(\d+)\b/.exec(s);
	if (m) return { type: "uksi", year: m[1], number: m[2] };
	m = /\bS\.?\s?S\.?\s?I\.?\s+(\d{4})\s*\/\s*(\d+)\b/.exec(s);
	if (m) return { type: "ssi", year: m[1], number: m[2] };
	return null;
}

// ---------------------------------------------------------------- Generic identifiers

export function normalizeDOI(s: string | undefined): string | null {
	if (!s) return null;
	const m = /\b(10\.\d{4,9}\/[^\s"<>]+)/.exec(s);
	if (!m) return null;
	return m[1].replace(/[.,;)\]]+$/, "");
}

export function normalizeISBN(s: string | undefined): string | null {
	if (!s) return null;
	for (const token of s.split(/[\s,;]+/)) {
		const digits = token.replace(/[-‐‑]/g, "").toUpperCase();
		if (/^\d{13}$/.test(digits) || /^\d{9}[\dX]$/.test(digits)) return digits;
	}
	return null;
}

export function yearOf(date: string | undefined): string | null {
	if (!date) return null;
	const m = /\b(1[5-9]\d\d|20\d\d)\b/.exec(date);
	return m ? m[1] : null;
}
