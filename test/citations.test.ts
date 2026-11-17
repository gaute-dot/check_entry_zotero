import { describe, expect, it } from "vitest";
import {
	findCaseLawPath,
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
} from "../src/core/citations";

describe("neutral citations", () => {
	it.each([
		["[2015] UKSC 11", "UKSC", "11", undefined, "uksc/2015/11"],
		["Smith v Jones [2019] EWCA  Civ 123", "EWCA Civ", "123", undefined, "ewca/civ/2019/123"],
		["[2018] EWHC 456 (Ch)", "EWHC", "456", "Ch", "ewhc/ch/2018/456"],
		["[2020] UKUT 100 (IAC)", "UKUT", "100", "IAC", "ukut/iac/2020/100"],
		["[2014] EWFC B12", "EWFC", "B12", undefined, "ewfc/2014/b12"],
	])("%s", (s, court, number, division, path) => {
		const n = parseNeutralCitation(s)!;
		expect(n.court).toBe(court);
		expect(n.number).toBe(number);
		expect(n.division).toBe(division);
		expect(findCaseLawPath(n)).toBe(path);
	});

	it("EWHC without division has no Find Case Law path", () => {
		expect(findCaseLawPath(parseNeutralCitation("[2018] EWHC 456")!)).toBeNull();
	});

	it("ignores law reports", () => {
		expect(parseNeutralCitation("[1932] AC 562")).toBeNull();
	});
});

describe("law reports", () => {
	it.each([
		["[1932] AC 562", "square", undefined, "AC", "562"],
		["[2015] 1 WLR 123", "square", "1", "WLR", "123"],
		["(1998) 29 EHRR 245", "round", "29", "EHRR", "245"],
		["[2005] ECR I-7879", "square", undefined, "ECR", "I-7879"],
		["[1990] 2 All E.R. 908", "square", "2", "All ER", "908"],
		["(2003) 1 Cr App R 12", "round", "1", "Cr App R", "12"],
	])("%s", (s, bracket, volume, reporter, page) => {
		const r = parseReportCitation(s)!;
		expect(r.bracket).toBe(bracket);
		expect(r.volume).toBe(volume);
		expect(r.reporter).toBe(reporter);
		expect(r.page).toBe(page);
	});
});

describe("EU", () => {
	it("case numbers and CELEX", () => {
		expect(parseEUCase("Case C-176/03 Commission v Council")).toMatchObject({ caseNumber: "C-176/03", celex: "62003CJ0176" });
		expect(parseEUCase("T-201/04")).toMatchObject({ celex: "62004TJ0201" });
		expect(parseEUCase("C‑131/12")!.year).toBe("2012");
	});
	it("ECLI", () => {
		expect(parseECLI("see ECLI:EU:C:2014:317.")).toBe("ECLI:EU:C:2014:317");
	});
	it.each([
		["Regulation (EU) 2016/679 of the European Parliament", "32016R0679"],
		["Council Regulation (EC) No 139/2004 on the control", "32004R0139"],
		["Regulation (EEC) No 1612/68", "31968R1612"],
		["Council Directive 2000/78/EC", "32000L0078"],
		["Directive (EU) 2019/1937", "32019L1937"],
		["CELEX 32016R0679", "32016R0679"],
	])("%s", (s, celex) => {
		expect(parseEULegislation(s)!.celex).toBe(celex);
	});
});

describe("ECHR", () => {
	it("application numbers", () => {
		expect(parseECHRAppNo("Osman v UK App no 23452/94")).toBe("23452/94");
		expect(parseECHRAppNo("Application no. 47940/99")).toBe("47940/99");
		expect(parseECHRAppNo("23452/94")).toBeNull();
		expect(parseECHRAppNo("23452/94", true)).toBe("23452/94");
	});
});

describe("Norway", () => {
	it("cases", () => {
		expect(parseNorwegianCase("HR-2020-1234-A")).toMatchObject({ kind: "HR", year: "2020" });
		expect(parseNorwegianCase("Rt. 2005 s. 1234")).toMatchObject({ kind: "Rt", canonical: "Rt. 2005 s. 1234", page: "1234" });
		expect(parseNorwegianCase("Rt-2005-1234")).toMatchObject({ kind: "Rt", page: "1234" });
		expect(parseNorwegianCase("LB-2019-12345")).toMatchObject({ kind: "lagmannsrett" });
	});
	it("acts", () => {
		expect(parseNorwegianAct("LOV-2005-06-17-62")).toMatchObject({ kind: "lov", date: "2005-06-17", number: "62" });
		expect(parseNorwegianAct("https://lovdata.no/dokument/NL/lov/2005-06-17-62")!.id).toBe("LOV-2005-06-17-62");
		expect(parseNorwegianAct("lov 17. juni 2005 nr. 62 om arbeidsmiljø")!.id).toBe("LOV-2005-06-17-62");
		expect(parseNorwegianAct("https://lovdata.no/forskrift/2006-12-07-1357")!.id).toBe("FOR-2006-12-07-1357");
	});
});

describe("UK legislation and identifiers", () => {
	it("legislation refs", () => {
		expect(parseUKLegislationRef("https://www.legislation.gov.uk/ukpga/2010/15/contents")).toEqual({ type: "ukpga", year: "2010", number: "15" });
		expect(parseUKLegislationRef("SI 1998/3132")).toEqual({ type: "uksi", year: "1998", number: "3132" });
	});
	it("DOI / ISBN", () => {
		expect(normalizeDOI("https://doi.org/10.1093/ojls/gqi001.")).toBe("10.1093/ojls/gqi001");
		expect(normalizeISBN("978-0-19-884832-5")).toBe("9780198848325");
		expect(normalizeISBN("nope")).toBeNull();
	});
});
