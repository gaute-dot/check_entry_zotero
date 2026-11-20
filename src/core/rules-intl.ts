/**
 * OSCOLA rules for international materials: UN documents and resolutions,
 * treaties (UN Treaty Series, Council of Europe) and ICJ decisions.
 *
 * Field conventions (see README, "International materials"):
 *
 *  UN document (item type Report)
 *    Author (single field) = issuing body in OSCOLA form ("UNGA", "UNHRC")
 *    Report Type = "UN Doc", Report Number = the symbol, Date = date of the document
 *    -> UNHRC, 'Title' (2020) UN Doc A/HRC/43/52
 *  UN resolution: as above, plus Series Title = "Res", Series Number = "70/1"
 *    and Date = the adoption date
 *    -> UNGA Res 70/1 (21 October 2015) UN Doc A/RES/70/1   (adjusted style)
 *  Treaty (item type Statute, Extra "Type: treaty")
 *    Name of Act = title, Date Enacted = adoption date,
 *    Extra "event-date: <entry into force>", Code = "UNTS", Code Number = volume, Pages = first page
 *    (Council of Europe: Code = "ETS"/"CETS", Public Law Number = treaty number)
 *    -> Title (adopted 10 December 1984, entered into force 26 June 1987) 1465 UNTS 85
 *  ICJ decision (item type Case)
 *    Case Name = "Title (Parties) (Phase)", Reporter = "ICJ Rep", First Page, Date Decided,
 *    Court and Docket Number empty (the style would otherwise print them)
 *    -> Legality of the Threat or Use of Nuclear Weapons (Advisory Opinion) [1996] ICJ Rep 226
 */
import { parseICJReport, type UNSymbol } from "./citations";
import type { Detected } from "./detect";
import type { Draft } from "./draft";

const R = (id: string, args?: Record<string, string | number>) => ({ id, args });

/** Long forms of UN bodies that OSCOLA abbreviates. */
const BODY_ALIASES: [RegExp, string][] = [
	[/^(?:UN\.?\s*|United Nations\s*)?General Assembly\b.*$/i, "UNGA"],
	[/^(?:UN\.?\s*|United Nations\s*)?Security Council\b.*$/i, "UNSC"],
	[/^(?:UN\.?\s*|United Nations\s*)?Human Rights Council\b.*$/i, "UNHRC"],
	[/^(?:UN\.?\s*|United Nations\s*)?Commission on Human Rights\b.*$/i, "UNCHR"],
	[/^(?:UN\.?\s*|United Nations\s*)?Economic and Social Council\b.*$/i, "ECOSOC"],
	[/^(?:UN\.?\s*|United Nations\s*)?International Law Commission\b.*$/i, "ILC"],
	[/^(?:UN|U\.N\.)\s*G\.?A\.?$/i, "UNGA"],
	[/^(?:UN|U\.N\.)\s*S\.?C\.?$/i, "UNSC"],
];

export function oscolaBody(name: string): string | null {
	for (const [re, abbr] of BODY_ALIASES) if (re.test(name.trim())) return abbr;
	return null;
}

// ---------------------------------------------------------------- UN documents

export function unDocRules(draft: Draft, d: Detected): void {
	const un = d.unSymbol as UNSymbol;
	requireField(draft, "title");
	requireField(draft, "date");

	if (draft.get("reportType") !== "UN Doc") draft.set("reportType", "UN Doc", "rules", R("oc-reason-un-doc-type"));
	const number = draft.get("reportNumber");
	if (!number) draft.set("reportNumber", un.symbol, "rules", R("oc-reason-un-symbol"));
	else if (number.replace(/\s/g, "") !== un.symbol.replace(/\s/g, "")) {
		draft.set("reportNumber", un.symbol, "rules", R("oc-reason-un-symbol"), !/\d/.test(number));
	}

	// OSCOLA names the issuing body, not "United Nations" as publisher
	if (/^(UN|United Nations|De forente nasjoner|FN)$/i.test(draft.get("institution").trim())) {
		draft.set("institution", "", "rules", R("oc-reason-un-institution"));
	}

	const creators = draft.creators();
	if (creators.length === 0) {
		draft.setCreators([{ creatorType: "author", name: un.body }], "rules", R("oc-reason-un-body", { body: un.body }));
	} else if (creators.length === 1 && creators[0].name) {
		const abbr = oscolaBody(creators[0].name);
		if (abbr && abbr !== creators[0].name) {
			draft.setCreators([{ ...creators[0], name: abbr }], "rules", R("oc-reason-un-body", { body: abbr }));
		}
	} else if (creators.some((c) => c.lastName && !c.name)) {
		draft.issue("info", "oc-issue-un-personal-author", { body: un.body }, "creators");
	}

	if (un.resolution) {
		const reason = R("oc-reason-un-resolution", { number: un.resolution });
		if (draft.get("seriesTitle") !== "Res") draft.set("seriesTitle", "Res", "rules", reason);
		if (draft.get("seriesNumber") !== un.resolution) draft.set("seriesNumber", un.resolution, "rules", reason);
		draft.issue("info", "oc-issue-intl-style");
	}
}

// ---------------------------------------------------------------- Treaties

export function treatyRules(draft: Draft, d: Detected): void {
	requireField(draft, "nameOfAct");
	draft.addExtraLine("Type: treaty", "rules", R("oc-reason-treaty-type"));

	const ts = d.treatySeries;
	if (ts) {
		const reason = R("oc-reason-treaty-series", { citation: ts.text });
		draft.set("code", ts.series, "rules", reason);
		if (ts.volume) {
			draft.set("codeNumber", ts.volume, "rules", reason);
			draft.set("pages", ts.page ?? "", "rules", reason);
		} else if (ts.number) {
			draft.set("publicLawNumber", ts.number, "rules", reason);
		}
		const title = draft.get("nameOfAct");
		if (title.includes(ts.text)) {
			draft.set("nameOfAct", title.replace(ts.text, "").replace(/[\s,;()]+$/, "").trim(), "rules", R("oc-reason-citation-in-name"));
		}
	} else if (!draft.has("code")) {
		draft.issue("info", "oc-issue-treaty-series", undefined, "code");
	}

	if (!draft.has("dateEnacted")) draft.issue("warning", "oc-issue-treaty-adopted", undefined, "dateEnacted");
	if (!/^\s*event-date:/im.test(draft.get("extra"))) draft.issue("info", "oc-issue-treaty-eif", undefined, "extra");
	draft.issue("info", "oc-issue-intl-style");
}

// ---------------------------------------------------------------- ICJ

export function icjRules(draft: Draft, d: Detected): void {
	const text = [draft.get("caseName"), draft.get("reporter"), draft.get("history"), draft.get("extra")].join("\n");
	const rep = parseICJReport(text) ?? (d.report?.reporter === "ICJ Rep" ? { year: d.report.year, page: d.report.page, text: d.report.text } : null);
	if (rep) {
		const reason = R("oc-reason-icj-report", { citation: rep.text });
		draft.set("reporter", "ICJ Rep", "rules", reason);
		draft.set("reporterVolume", "", "rules", reason);
		draft.set("firstPage", rep.page, "rules", reason);
		if (!/\d{4}/.test(draft.get("dateDecided"))) draft.set("dateDecided", rep.year, "rules", reason);
		const name = draft.get("caseName");
		if (name.includes(rep.text)) {
			draft.set("caseName", name.replace(rep.text, "").replace(/[\s,;]+$/, "").trim(), "rules", R("oc-reason-citation-in-name"));
		}
	} else if (/^I\.?C\.?J\.? Rep(orts)?\.?$/i.test(draft.get("reporter")) && draft.get("reporter") !== "ICJ Rep") {
		draft.set("reporter", "ICJ Rep", "rules", R("oc-reason-full-stops"));
	}
	if (!draft.has("reporter")) draft.issue("info", "oc-issue-icj-no-report", undefined, "reporter");

	// The style prints "(Court)" after the page, or "[year] Court Docket" when both are set
	if (draft.has("court")) draft.set("court", "", "rules", R("oc-reason-icj-court"));
	if (draft.has("docketNumber")) draft.set("docketNumber", "", "rules", R("oc-reason-icj-court"));

	const name = draft.get("caseName");
	if (name && !/\((?:[^()]*\b(Advisory Opinion|Merits|Judgment|Preliminary Objections?|Provisional Measures|Jurisdiction|Compensation|Interpretation|Revision|Order|Admissibility|Counter-Claims?)\b[^()]*)\)\s*$/i.test(name)) {
		draft.issue("info", "oc-issue-icj-phase", undefined, "caseName");
	}
	requireField(draft, "dateDecided");
}

function requireField(draft: Draft, field: string): void {
	if (draft.isValid(field) && !draft.has(field)) draft.issue("warning", "oc-issue-missing-field", { field }, field);
}

