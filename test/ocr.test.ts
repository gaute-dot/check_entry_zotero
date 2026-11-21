/**
 * OCR with the real programs (tesseract, pdftoppm) on a generated scan.
 * Skipped when the programs are not installed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findTool, looksLikeScan, ocrPDF, type OcrHost } from "../src/ocr";
import { guessMeta } from "../src/core/textmeta";

export const nodeHost: OcrHost = {
	exists: async (p) => existsSync(p),
	run: async (cmd, args) => {
		execFileSync(cmd, args, { stdio: "ignore" });
	},
	tempDir: async () => mkdtempSync(join(tmpdir(), "oscola-ocr-")),
	join: (...p) => join(...p),
	list: async (dir) => readdirSync(dir).map((f) => join(dir, f)),
	readText: async (p) => readFileSync(p, "utf8"),
	remove: async (dir) => rmSync(dir, { recursive: true, force: true }),
};

const SCAN = join(__dirname, "fixtures/files/hart-scan.pdf");
const haveTools = existsSync("/usr/bin/tesseract") || existsSync("/opt/homebrew/bin/tesseract") || existsSync("/usr/local/bin/tesseract");
const withTools = haveTools ? describe : describe.skip;

describe("OCR helpers", () => {
	it("recognises an empty text layer", () => {
		expect(looksLikeScan("\f\f")).toBe(true);
		expect(looksLikeScan("THE CONCEPT OF LAW by H. L. A. Hart, Professor of Jurisprudence in Oxford")).toBe(false);
	});

	it("reports missing programs", async () => {
		const none: OcrHost = { ...nodeHost, exists: async () => false };
		expect(await findTool(none, "tesseract")).toBeNull();
		expect(await ocrPDF(none, SCAN)).toEqual({ ok: false, reason: "missing-tools", detail: "tesseract, pdftoppm" });
	});

	it("uses a path set in the settings first", async () => {
		const calls: string[] = [];
		const host: OcrHost = { ...nodeHost, exists: async (p) => (calls.push(p), p === "/my/tesseract") };
		expect(await findTool(host, "tesseract", "/my/tesseract")).toBe("/my/tesseract");
		expect(calls).toEqual(["/my/tesseract"]);
	});
});

withTools("OCR on a scanned title page (real tesseract)", () => {
	it("the scan has no text layer", () => {
		expect(looksLikeScan(execFileSync("pdftotext", [SCAN, "-"]).toString())).toBe(true);
	});

	it("recognises title, author and year", async () => {
		const r = await ocrPDF(nodeHost, SCAN, { pages: 2 });
		expect(r.ok).toBe(true);
		const text = (r as { text: string }).text;
		expect(text).toMatch(/H\. L\. A\. HART/);
		const g = guessMeta(text);
		expect(g.creators).toEqual([{ creatorType: "author", firstName: "H. L. A.", lastName: "Hart" }]);
		expect(g.year).toBe("1961");
		expect(g.title).toMatch(/^The Concep.? of Law/);
	}, 60_000);
});
