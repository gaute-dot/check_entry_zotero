/**
 * Text recognition (OCR) for scanned PDFs, using two free programs installed
 * on the user's computer (on a Mac: `brew install tesseract poppler`):
 *   pdftoppm  renders the first pages of the PDF as images
 *   tesseract recognises the text in each image
 * The same approach as the UB Mannheim "Zotero OCR" plugin. Nothing is
 * uploaded anywhere. The file system and process calls go through `OcrHost`,
 * so the logic can be tested outside Zotero.
 */

export interface OcrHost {
	exists(path: string): Promise<boolean>;
	/** Run a program; rejects if it fails */
	run(cmd: string, args: string[]): Promise<void>;
	tempDir(): Promise<string>;
	join(...parts: string[]): string;
	list(dir: string): Promise<string[]>;
	readText(path: string): Promise<string>;
	remove(dir: string): Promise<void>;
}

export interface OcrSettings {
	/** User-set paths (empty = look in the usual places) */
	tesseractPath?: string;
	pdftoppmPath?: string;
	/** Number of pages to recognise */
	pages?: number;
	/** Tesseract language codes, e.g. "eng" or "eng+nor" */
	lang?: string;
}

/** Where Homebrew (Apple silicon and Intel), Linux packages and the Windows installers put the programs */
export const CANDIDATES: Record<"tesseract" | "pdftoppm", string[]> = {
	tesseract: [
		"/opt/homebrew/bin/tesseract",
		"/usr/local/bin/tesseract",
		"/opt/local/bin/tesseract",
		"/usr/bin/tesseract",
		"C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
	],
	pdftoppm: [
		"/opt/homebrew/bin/pdftoppm",
		"/usr/local/bin/pdftoppm",
		"/opt/local/bin/pdftoppm",
		"/usr/bin/pdftoppm",
		"C:\\Program Files\\poppler\\Library\\bin\\pdftoppm.exe",
		"C:\\Program Files\\poppler\\bin\\pdftoppm.exe",
	],
};

export async function findTool(host: OcrHost, name: "tesseract" | "pdftoppm", userPath?: string): Promise<string | null> {
	for (const p of [userPath, ...CANDIDATES[name]].filter(Boolean) as string[]) {
		if (await host.exists(p)) return p;
	}
	return null;
}

export type OcrResult = { ok: true; text: string } | { ok: false; reason: "missing-tools" | "failed"; detail?: string };

/** Recognise the text of the first pages of a PDF. */
export async function ocrPDF(host: OcrHost, pdfPath: string, settings: OcrSettings = {}): Promise<OcrResult> {
	const tesseract = await findTool(host, "tesseract", settings.tesseractPath);
	const pdftoppm = await findTool(host, "pdftoppm", settings.pdftoppmPath);
	if (!tesseract || !pdftoppm) {
		return { ok: false, reason: "missing-tools", detail: [!tesseract && "tesseract", !pdftoppm && "pdftoppm"].filter(Boolean).join(", ") };
	}
	const pages = Math.max(1, Math.min(settings.pages ?? 4, 20));
	const dir = await host.tempDir();
	try {
		// 300 dpi greyscale is what Tesseract recognises best
		await host.run(pdftoppm, ["-f", "1", "-l", String(pages), "-r", "300", "-gray", "-png", pdfPath, host.join(dir, "page")]);
		const images = (await host.list(dir)).filter((f) => /\.png$/i.test(f)).sort((a, b) => pageNo(a) - pageNo(b));
		const texts: string[] = [];
		for (const image of images) {
			const base = image.replace(/\.png$/i, "");
			await host.run(tesseract, [image, base, "-l", settings.lang || "eng"]);
			texts.push(await host.readText(base + ".txt"));
		}
		return { ok: true, text: texts.join("\n\f\n") };
	} catch (e) {
		return { ok: false, reason: "failed", detail: e instanceof Error ? e.message : String(e) };
	} finally {
		await host.remove(dir).catch(() => undefined);
	}
}

function pageNo(path: string): number {
	return Number(/-(\d+)\.png$/i.exec(path)?.[1] ?? 0);
}

/** A PDF counts as a scan without text when its first pages give (almost) no letters. */
export function looksLikeScan(text: string): boolean {
	return (text.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0) < 40;
}
