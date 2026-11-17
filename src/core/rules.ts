/**
 * OSCOLA rules. They are written against the behaviour of Zotero's
 * "OSCOLA 4th edition" citation style (styles/oscola.csl), which decides
 * how each field is printed:
 *
 *  - Cases with a neutral citation need Court = the court code ("UKSC") and
 *    Docket Number = the number ("11"); the style then prints
 *    "[2015] UKSC 11". Any report citation after it needs the bracketed year
 *    in Reporter Volume ("[2015] 1" + "WLR").
 *  - Cases without a neutral citation print "(year) volume Reporter page"
 *    when Reporter Volume is filled, and "[year] Reporter page" when it is
 *    empty — so square-bracket series must have an empty volume.
 *  - Statutes print Title + the year of Date Enacted, so the title must not
 *    end with the year.
 *  - Editions are printed as "2nd edn", so the field must hold a number.
 */
import { REPORTERS, norwegianDate, yearOf, type ReportCitation } from "./citations";
import { detect, type Detected } from "./detect";
import { Draft } from "./draft";
import { collapse, tidyCaseName } from "./text";

const R = (id: string, args?: Record<string, string | number>) => ({ id, args });

export function applyRules(draft: Draft, d: Detected = detect(draft.original)): void {
	generalRules(draft, d);
	switch (draft.itemType) {
		case "case":
			caseRules(draft, d);
			break;
		case "statute":
			statuteRules(draft, d);
			break;
		case "journalArticle":
			journalRules(draft);
			break;
		case "book":
		case "bookSection":
			bookRules(draft);
			break;
		case "thesis":
			requireFields(draft, ["title", "thesisType", "university", "date"]);
			requireCreators(draft, ["author"]);
			break;
		case "report":
			requireFields(draft, ["title", "date"]);
			if (!draft.has("institution") && draft.creators().length === 0) {
				draft.issue("warning", "oc-issue-report-no-author", undefined, "institution");
			}
			break;
		case "webpage":
			requireFields(draft, ["title", "url", "accessDate"]);
			if (!draft.has("websiteTitle")) draft.issue("info", "oc-issue-missing-field", { field: "websiteTitle" }, "websiteTitle");
			break;
		default:
			requireFields(draft, ["title", "date"]);
	}
	if (d.impliedType) {
		draft.suggestItemType(d.impliedType, R("oc-reason-item-type", { type: d.impliedType }));
		draft.issue("warning", "oc-issue-item-type", { type: d.impliedType });
	}
}

// ---------------------------------------------------------------- general

function generalRules(draft: Draft, d: Detected): void {
	for (const field of Object.keys(draft.original.fields)) {
		const value = draft.get(field);
		if (!value || field === "extra" || field === "abstractNote") continue;
		const tidy = collapse(value);
		if (tidy !== value) draft.set(field, tidy, "rules", R("oc-reason-whitespace"));
	}

	if (draft.isValid("DOI")) {
		const current = draft.get("DOI");
		if (current && d.doi && current !== d.doi) {
			draft.set("DOI", d.doi, "rules", R("oc-reason-doi-normalise"));
		} else if (!current && d.doi) {
			draft.set("DOI", d.doi, "rules", R("oc-reason-doi-from-url"));
		}
	}

	if (draft.isValid("pages")) {
		const p = draft.get("pages");
		const fixed = p.replace(/^\s*(?:pp?\.?|s\.)\s*/i, "");
		if (fixed !== p) draft.set("pages", fixed, "rules", R("oc-reason-pages-prefix"));
	}

	// OSCOLA prints the access date after URLs/DOIs for secondary sources
	const legal = ["case", "statute", "bill", "hearing"].includes(draft.itemType);
	if (!legal && draft.itemType !== "webpage" && draft.has("url") && !draft.has("DOI") && !draft.has("accessDate")) {
		draft.issue("info", "oc-issue-access-date", undefined, "accessDate");
	}
}

function requireFields(draft: Draft, fields: string[]): void {
	for (const f of fields) {
		if (draft.isValid(f) && !draft.has(f)) draft.issue("warning", "oc-issue-missing-field", { field: f }, f);
	}
}

function requireCreators(draft: Draft, types: string[]): void {
	if (!draft.creators().some((c) => types.includes(c.creatorType))) {
		draft.issue("warning", "oc-issue-missing-creator", { type: types[0] }, "creators");
	}
}

// ---------------------------------------------------------------- journals

function journalRules(draft: Draft): void {
	requireFields(draft, ["title", "publicationTitle", "date", "pages"]);
	requireCreators(draft, ["author"]);
	if (!draft.has("volume") && !draft.has("issue")) draft.issue("warning", "oc-issue-missing-field", { field: "volume" }, "volume");

	for (const field of ["publicationTitle", "journalAbbreviation"]) {
		const v = draft.get(field);
		// "L.Q.R." -> "LQR": OSCOLA uses no full stops in abbreviations
		if (/^([A-Z][a-z]{0,3}\.\s?){2,}$/.test(v)) {
			draft.set(field, v.replace(/\.\s?/g, (m) => (m.endsWith(" ") ? " " : "")).trim(), "rules", R("oc-reason-full-stops"));
		}
	}
}

// ---------------------------------------------------------------- books

const ORDINAL_WORDS: Record<string, string> = {
	first: "1", second: "2", third: "3", fourth: "4", fifth: "5", sixth: "6", seventh: "7", eighth: "8", ninth: "9", tenth: "10",
	første: "1", andre: "2", tredje: "3", fjerde: "4", femte: "5", sjette: "6", sjuende: "7", syvende: "7", åttende: "8", niende: "9", tiende: "10",
};

export function editionNumber(s: string): string | null {
	const t = s.trim().toLowerCase();
	let m = /^(\d+)\s*(?:st|nd|rd|th|\.)?\s*(?:ed(?:n|ition)?|utg(?:ave|\.)?|opplag)?\.?$/.exec(t);
	if (m) return m[1];
	m = /^([a-zæøå]+)\s+(?:ed(?:n|ition)?|utgave)\.?$/.exec(t);
	if (m && ORDINAL_WORDS[m[1]]) return ORDINAL_WORDS[m[1]];
	return null;
}

function bookRules(draft: Draft): void {
	if (draft.itemType === "book") {
		requireFields(draft, ["title", "publisher", "date"]);
		requireCreators(draft, ["author", "editor"]);
	} else {
		requireFields(draft, ["title", "bookTitle", "publisher", "date"]);
		requireCreators(draft, ["author"]);
		if (!draft.creators().some((c) => c.creatorType === "editor")) {
			draft.issue("info", "oc-issue-missing-creator", { type: "editor" }, "creators");
		}
	}
	const ed = draft.get("edition");
	if (ed) {
		const n = editionNumber(ed);
		if (n === "1") {
			draft.set("edition", "", "rules", R("oc-reason-first-edition"), false);
		} else if (n && n !== ed) {
			draft.set("edition", n, "rules", R("oc-reason-edition-number"));
		}
	}
}

// ---------------------------------------------------------------- legislation

function statuteRules(draft: Draft, d: Detected): void {
	requireFields(draft, ["nameOfAct"]);
	const title = draft.get("nameOfAct");

	if (d.jurisdiction === "no" && d.noAct) {
		statuteNorway(draft, d);
		return;
	}
	if (d.jurisdiction === "eu" && d.euLegislation) {
		draft.addExtraLine(`CELEX: ${d.euLegislation.celex}`, "rules", R("oc-reason-celex"));
		draft.issue("info", "oc-issue-eu-oj-reference");
		requireFields(draft, ["dateEnacted"]);
		return;
	}

	// UK and other common-law statutes: "Equality Act" + 2010 -> "Equality Act 2010"
	const m = /^(.*\S)\s+(1[2-9]\d\d|20\d\d)$/.exec(title);
	if (m) {
		const enactedYear = yearOf(draft.get("dateEnacted"));
		if (!enactedYear || enactedYear === m[2]) {
			draft.set("nameOfAct", m[1], "rules", R("oc-reason-statute-year-in-title", { year: m[2] }));
			if (!enactedYear) draft.set("dateEnacted", m[2], "rules", R("oc-reason-statute-year-from-title"));
		} else {
			draft.issue("warning", "oc-issue-statute-year-mismatch", { titleYear: m[2], dateYear: enactedYear }, "dateEnacted");
		}
	}
	if (!draft.has("dateEnacted")) draft.issue("warning", "oc-issue-missing-field", { field: "dateEnacted" }, "dateEnacted");

	if (d.ukLegislation && /^(uksi|ssi|wsi|nisr)$/.test(d.ukLegislation.type)) {
		const label = d.ukLegislation.type === "ssi" ? "SSI" : d.ukLegislation.type === "wsi" ? "SI" : d.ukLegislation.type === "nisr" ? "SR" : "SI";
		draft.set("publicLawNumber", `${label} ${d.ukLegislation.year}/${d.ukLegislation.number}`, "rules", R("oc-reason-si-number"));
		draft.issue("info", "oc-issue-si-number-not-printed");
	}
	if (/\bs(?:ection)?\.\s*\d/.test(draft.get("section"))) {
		draft.set("section", draft.get("section").replace(/\bs(?:ection)?\.\s*/, "s "), "rules", R("oc-reason-full-stops"));
	}
}

function statuteNorway(draft: Draft, d: Detected): void {
	const act = d.noAct!;
	if (!draft.has("dateEnacted")) draft.set("dateEnacted", act.date, "rules", R("oc-reason-no-act-date"));
	if (!draft.has("publicLawNumber")) draft.set("publicLawNumber", act.id, "rules", R("oc-reason-no-act-id"));
	// Norwegian practice: "Lov 17. juni 2005 nr. 62 om ..."
	const title = draft.get("nameOfAct");
	const prefix = `${act.kind === "lov" ? "Lov" : "Forskrift"} ${norwegianDate(act.date)} nr. ${act.number}`;
	if (title && !title.startsWith(prefix)) {
		const rest = title.replace(/^(lov|forskrift)\s+(?:av\s+)?(\d{1,2}\.\s*\S+\s+\d{4}\s+nr\.?\s*\d+\s*)?/i, "");
		const body = rest ? " " + rest.replace(/^om\b/i, "om") : "";
		draft.set("nameOfAct", prefix + body, "rules", R("oc-reason-no-act-title"), false);
	}
	draft.issue("info", "oc-issue-no-act-year");
}

// ---------------------------------------------------------------- cases

function caseRules(draft: Draft, d: Detected): void {
	requireFields(draft, ["caseName", "dateDecided"]);

	// "Smith v. Jones" -> "Smith v Jones"
	const name = draft.get("caseName");
	if (name) {
		const tidy = name
			.replace(/\s+(?:vs?\.|vs|versus)\s+/gi, " v ")
			.replace(/\bR\.\s+v\b/, "R v")
			.replace(/\s*\.$/, "");
		if (tidy !== name) draft.set("caseName", tidy, "rules", R("oc-reason-case-name-v"));
	}

	switch (d.jurisdiction) {
		case "no":
			caseNorway(draft, d);
			return;
		case "echr":
			caseECHR(draft, d);
			return;
		case "eu":
			caseEU(draft, d);
			return;
	}

	if (d.ncn) {
		const ncn = d.ncn;
		const docket = ncn.number + (ncn.division ? ` (${ncn.division})` : "");
		if (draft.get("court") !== ncn.court) draft.set("court", ncn.court, "rules", R("oc-reason-ncn-court", { ncn: ncn.canonical }));
		if (draft.get("docketNumber") !== docket) {
			draft.set("docketNumber", docket, "rules", R("oc-reason-ncn-docket", { ncn: ncn.canonical }));
		}
		const y = yearOf(draft.get("dateDecided"));
		if (!y) draft.set("dateDecided", ncn.year, "rules", R("oc-reason-ncn-year"));
		else if (y !== ncn.year) draft.issue("warning", "oc-issue-ncn-year-mismatch", { ncn: ncn.canonical, year: y }, "dateDecided");
		removeFromName(draft, ncn.text);
	}

	const report = d.report;
	if (report) {
		applyReport(draft, report, !!d.ncn);
		removeFromName(draft, report.text);
	} else {
		fixStructuredReport(draft, !!d.ncn);
	}

	const fp = draft.get("firstPage");
	const fpFixed = fp.replace(/^(?:p\.?\s*|s\.\s*)/i, "").replace(/^(\S+?)\s*[-–]\s*\S+$/, "$1");
	if (fpFixed !== fp) draft.set("firstPage", fpFixed, "rules", R("oc-reason-first-page"));

	if (!d.ncn && !draft.has("reporter")) {
		draft.issue("warning", "oc-issue-case-no-citation", undefined, "reporter");
	}
	if (!d.ncn && draft.has("reporter") && !draft.has("court")) {
		draft.issue("info", "oc-issue-case-court", undefined, "court");
	}
}

/** Put a parsed law report citation into Reporter / Reporter Volume / First Page. */
function applyReport(draft: Draft, r: ReportCitation, hasNCN: boolean): void {
	const series = REPORTERS[r.reporter];
	const square = series ? series.square : r.bracket === "square";
	let volume: string;
	let reporter: string;
	if (hasNCN) {
		// After a neutral citation the style prints the volume field verbatim
		volume = square ? `[${r.year}]` + (r.volume ? ` ${r.volume}` : "") : `(${r.year})` + (r.volume ? ` ${r.volume}` : "");
		reporter = r.reporter;
	} else if (square) {
		// The style prints "[year]" itself when Reporter Volume is empty
		volume = "";
		reporter = (r.volume ? `${r.volume} ` : "") + r.reporter;
	} else {
		volume = r.volume ?? "";
		reporter = r.reporter;
	}
	const reason = R("oc-reason-report-split", { citation: r.text });
	draft.set("reporter", reporter, "rules", reason);
	draft.set("reporterVolume", volume, "rules", reason);
	draft.set("firstPage", r.page, "rules", reason);
	if (!yearOf(draft.get("dateDecided"))) draft.set("dateDecided", r.year, "rules", reason);
}

/** Fix report fields that are already split but entered in a way the style prints wrongly. */
function fixStructuredReport(draft: Draft, hasNCN: boolean): void {
	const reporter = draft.get("reporter");
	const volume = draft.get("reporterVolume");
	if (!reporter) return;
	const tidyReporter = reporter.replace(/\./g, "").replace(/\s+/g, " ").trim();
	if (tidyReporter !== reporter && REPORTERS[tidyReporter]) {
		draft.set("reporter", tidyReporter, "rules", R("oc-reason-full-stops"));
	}
	const series = REPORTERS[tidyReporter];
	if (!series || hasNCN) return;
	const year = yearOf(draft.get("dateDecided"));
	// "[1990]" or "[1990] 1" in Reporter Volume with no neutral citation prints as "(1990) [1990] 1 WLR"
	const m = /^\[?(\d{4})\]?(?:\s+(\d+))?$/.exec(volume);
	if (series.square && m && (!year || year === m[1])) {
		const reason = R("oc-reason-square-volume");
		draft.set("reporterVolume", "", "rules", reason);
		if (m[2]) draft.set("reporter", `${m[2]} ${tidyReporter}`, "rules", reason);
		if (!year) draft.set("dateDecided", m[1], "rules", reason);
	}
}

function removeFromName(draft: Draft, text: string): void {
	const name = draft.get("caseName");
	if (!name.includes(text)) return;
	const stripped = name
		.replace(text, "")
		.replace(/\s*[,;]\s*(?=[,;]|$)/g, "")
		.replace(/\s{2,}/g, " ")
		.replace(/[\s,;]+$/, "")
		.trim();
	if (stripped) draft.set("caseName", stripped, "rules", R("oc-reason-citation-in-name"));
}

function caseNorway(draft: Draft, d: Detected): void {
	const c = d.noCase;
	if (!c) {
		draft.issue("info", "oc-issue-no-case-unrecognised");
		return;
	}
	const reason = R("oc-reason-no-case", { citation: c.canonical });
	if (c.kind === "Rt") {
		draft.set("reporter", "Rt", "rules", reason);
		draft.set("reporterVolume", "", "rules", reason);
		draft.set("firstPage", c.page!, "rules", reason);
		if (!yearOf(draft.get("dateDecided"))) draft.set("dateDecided", c.year, "rules", reason);
		removeFromName(draft, c.canonical);
	} else {
		// HR-2020-1234-A: the case ID goes first in the name, with any popular name after it
		const name = draft.get("caseName");
		if (!name.includes(c.canonical)) {
			draft.set("caseName", name ? `${c.canonical} (${name})` : c.canonical, "rules", reason, false);
		}
		if (draft.get("docketNumber") === c.canonical) draft.set("docketNumber", "", "rules", reason);
		if (!yearOf(draft.get("dateDecided"))) draft.set("dateDecided", c.year, "rules", reason);
	}
	if (!draft.has("court")) {
		const court = c.kind === "lagmannsrett" ? "" : "Høyesterett";
		if (court) draft.set("court", court, "rules", reason);
	}
}

function caseECHR(draft: Draft, d: Detected): void {
	const reason = R("oc-reason-echr");
	const name = draft.get("caseName");
	if (name && /^CASE OF\b|\bv\.\s|^[^a-z]+$/.test(name)) draft.set("caseName", tidyCaseName(name), "rules", reason);
	if (draft.get("court") !== "ECtHR") draft.set("court", "ECtHR", "rules", reason);
	if (d.report) {
		applyReport(draft, d.report, false);
		removeFromName(draft, d.report.text);
		// With a docket number the style prints "[year] ECtHR <docket>" in front of the report
		if (draft.has("docketNumber")) draft.set("docketNumber", "", "rules", R("oc-reason-echr-docket-with-report"), false);
	} else if (d.echrAppNo) {
		const docket = `App no ${d.echrAppNo}`;
		if (draft.get("docketNumber") !== docket) draft.set("docketNumber", docket, "rules", reason);
		removeFromName(draft, d.echrAppNo);
	} else {
		draft.issue("warning", "oc-issue-echr-no-appno", undefined, "docketNumber");
	}
	if (!/\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4}/.test(draft.get("dateDecided"))) {
		draft.issue("info", "oc-issue-echr-full-date", undefined, "dateDecided");
	}
}

function caseEU(draft: Draft, d: Detected): void {
	if (d.euCase) {
		const prefix = `Case ${d.euCase.caseNumber}`;
		const name = draft.get("caseName");
		if (name && !name.startsWith(prefix)) {
			const rest = name
				.replace(/^(?:Case|Sak)\s+/i, "")
				.replace(/^[CTF]\s*[-‑–]\s*\d+\s*\/\s*\d{2}\s*,?\s*/, "")
				.trim();
			draft.set("caseName", `${prefix} ${rest}`.trim(), "rules", R("oc-reason-eu-case-prefix"));
		}
		const docket = draft.get("docketNumber");
		if (docket && docket.replace(/\s/g, "").includes(d.euCase.caseNumber.replace(/\s/g, ""))) {
			draft.set("docketNumber", "", "rules", R("oc-reason-eu-docket"));
		}
		draft.addExtraLine(`CELEX: ${d.euCase.celex}`, "rules", R("oc-reason-celex"));
	}
	if (d.report) {
		applyReport(draft, d.report, false);
		removeFromName(draft, d.report.text);
	} else if (d.ecli) {
		draft.addExtraLine(`ECLI: ${d.ecli}`, "rules", R("oc-reason-ecli"));
		draft.issue("info", "oc-issue-eu-ecli");
	} else {
		draft.issue("warning", "oc-issue-case-no-citation", undefined, "reporter");
	}
	if (draft.has("court")) {
		draft.issue("info", "oc-issue-eu-court");
	}
}
