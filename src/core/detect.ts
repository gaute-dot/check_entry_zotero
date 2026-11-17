import {
	normalizeDOI,
	normalizeISBN,
	parseECHRAppNo,
	parseECLI,
	parseEUCase,
	parseEULegislation,
	parseNeutralCitation,
	parseNorwegianAct,
	parseNorwegianCase,
	parseReportCitation,
	parseUKLegislationRef,
	type EUCase,
	type EULegislation,
	type NeutralCitation,
	type NorwegianAct,
	type NorwegianCase,
	type ReportCitation,
	type UKLegislationRef,
} from "./citations";
import type { ItemData } from "./types";

export type Jurisdiction = "uk" | "eu" | "echr" | "no" | "unknown";

/** Everything recognisable about an item, gathered from all of its fields. */
export interface Detected {
	jurisdiction: Jurisdiction;
	ncn: NeutralCitation | null;
	report: ReportCitation | null;
	euCase: EUCase | null;
	ecli: string | null;
	euLegislation: EULegislation | null;
	echrAppNo: string | null;
	noCase: NorwegianCase | null;
	noAct: NorwegianAct | null;
	ukLegislation: UKLegislationRef | null;
	doi: string | null;
	isbn: string | null;
	/** Item type the identifiers point to, if different from the current one */
	impliedType: string | null;
}

const ECHR_COURT_RE = /\b(ECtHR|ECHR|EMD|European Court of Human Rights|Den europeiske menneskerettsdomstol(?:en)?)\b/i;
const CJEU_COURT_RE = /\b(CJEU|ECJ|EUCJ|Court of Justice|General Court|EU-domstolen)\b/i;

export function detect(item: ItemData): Detected {
	const f: Record<string, string | undefined> = { ...item.fields, title: item.fields.title || item.fields.caseName || item.fields.nameOfAct || "" };
	const all = Object.values(f).join("\n");
	const legalText = [f.title, f.docketNumber, f.reporter, f.court, f.history, f.extra, f.publicationTitle, f.url]
		.filter(Boolean)
		.join("\n");

	const courtField = f.court ?? "";
	const isECHRCourt = ECHR_COURT_RE.test(courtField) || /hudoc\.echr\.coe\.int/.test(f.url ?? "");

	const d: Detected = {
		jurisdiction: "unknown",
		ncn: parseNeutralCitation(legalText),
		report: parseReportCitation(legalText),
		euCase: parseEUCase([f.title, f.docketNumber, f.extra].filter(Boolean).join("\n")),
		ecli: parseECLI(all),
		euLegislation: null,
		echrAppNo: parseECHRAppNo([f.title, f.docketNumber, f.extra].filter(Boolean).join("\n"), false),
		noCase: parseNorwegianCase(legalText),
		noAct: parseNorwegianAct(all),
		ukLegislation: parseUKLegislationRef(all),
		doi: normalizeDOI(f.DOI) ?? normalizeDOI(f.url) ?? normalizeDOI(f.extra),
		isbn: normalizeISBN(f.ISBN),
		impliedType: null,
	};

	if (!d.echrAppNo && isECHRCourt) d.echrAppNo = parseECHRAppNo(f.docketNumber, true);
	if (item.itemType === "statute" || item.itemType === "bill" || /eur-lex/i.test(f.url ?? "")) {
		d.euLegislation = parseEULegislation([f.title, f.publicLawNumber, f.extra, f.url].filter(Boolean).join("\n"));
	}
	// An EU case number inside an ECHR application number ("C-1/99" is unlikely there, but be safe)
	if (d.euCase && isECHRCourt) d.euCase = null;

	if (d.noCase || d.noAct || /lovdata\.no/.test(f.url ?? "") || /^(no|nb|nn|nob|nno)\b/i.test(f.language ?? "")) {
		d.jurisdiction = "no";
	} else if (d.echrAppNo || isECHRCourt) {
		d.jurisdiction = "echr";
	} else if (
		d.euCase ||
		d.euLegislation ||
		(d.ecli && d.ecli.startsWith("ECLI:EU:")) ||
		CJEU_COURT_RE.test(courtField) ||
		/eur-lex|curia\.europa/.test(f.url ?? "")
	) {
		d.jurisdiction = "eu";
	} else if (d.ncn || d.report || d.ukLegislation) {
		d.jurisdiction = "uk";
	}

	d.impliedType = impliedType(item, d);
	return d;
}

const CASE_URL_RE = /caselaw\.nationalarchives\.gov\.uk|bailii\.org\/[a-z]+\/cases|hudoc\.echr\.coe\.int|curia\.europa\.eu|lovdata\.no\/(?:dokument\/)?(?:HR|LB|LG|LA|LE|LF|LH|RG)/i;
const LEG_URL_RE = /legislation\.gov\.uk\/(?:id\/)?[a-z]+\/\d{4}\/\d+|lovdata\.no\/(?:dokument\/(?:NL|SF)\/)?(?:lov|forskrift)\//i;

function impliedType(item: ItemData, d: Detected): string | null {
	const t = item.itemType;
	if (t === "case" || t === "statute" || t === "bill" || t === "hearing") return null;
	const url = item.fields.url ?? "";
	const title = item.fields.title || item.fields.caseName || item.fields.nameOfAct || "";
	const looksLikeCase =
		CASE_URL_RE.test(url) ||
		!!parseNeutralCitation(title) ||
		!!parseReportCitation(title) ||
		!!parseNorwegianCase(title) ||
		(!!parseEUCase(title) && / v\.? /.test(title));
	if (looksLikeCase) return "case";
	const looksLikeLegislation =
		LEG_URL_RE.test(url) ||
		(!!d.noAct && /^(lov|forskrift)\b/i.test(title)) ||
		(!!d.euLegislation && /^(?:(?:Council|Commission)\s+)?(Regulation|Directive)/i.test(title)) ||
		(/\bAct\s+\d{4}$/.test(title) && item.creators.length === 0);
	if (looksLikeLegislation) return "statute";
	return null;
}
