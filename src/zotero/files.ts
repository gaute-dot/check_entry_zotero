/**
 * Files without a Zotero item (standalone attachments): read the file, try
 * Zotero's own recognition first, then the plugin's identification, and
 * propose a new parent item. Nothing is saved until the user applies it.
 */
import { checkItem } from "../core/check";
import { identifyFile } from "../core/identify";
import { newItemRows } from "../core/newitem";
import { expandSearch, itemFromRows, missingBasics } from "../core/expand";
import type { Creator, Env, ItemData, Suggestion } from "../core/types";
import type { Issue } from "../core/types";

declare const Zotero: any;
declare const ZOTERO_CONFIG: any;

/** Text of an existing item's best attachment (its PDF), for the widened search. */
export async function itemText(item: any, pages = 12): Promise<string> {
	try {
		const att = await item.getBestAttachment();
		return att && (att.isPDFAttachment() || att.isEPUBAttachment?.() || att.isSnapshotAttachment?.()) ? await fileText(att, pages) : "";
	} catch {
		return "";
	}
}

/** Attachments that are files and have no parent item */
export function isStandaloneFile(item: any): boolean {
	return !!item.isAttachment?.() && item.isTopLevelItem() && !item.isNote?.() && item.attachmentLinkMode !== Zotero.Attachments.LINK_MODE_LINKED_URL;
}

export async function fileText(att: any, pages = 3): Promise<string> {
	try {
		if (att.isPDFAttachment()) {
			const res = await Zotero.PDFWorker.getFullText(att.id, pages, true);
			return res?.text ?? "";
		}
		return (await att.attachmentText) ?? "";
	} catch (e) {
		Zotero.debug("OSCOLA Check: could not read file text: " + e);
		return "";
	}
}

/** Zotero's own document recognizer, as used by "Retrieve Metadata for PDF", without saving. */
async function zoteroRecognize(att: any): Promise<ItemData | null> {
	if (!att.isPDFAttachment()) return null;
	let res: any;
	try {
		const json = await Zotero.PDFWorker.getRecognizerData(att.id, true);
		let base = Zotero.Prefs.get("recognize.url");
		if (!base) {
			const services = Zotero.Prefs.get("services.url") || (typeof ZOTERO_CONFIG !== "undefined" ? ZOTERO_CONFIG.SERVICES_URL : "https://services.zotero.org/");
			base = services.replace(/\/?$/, "/") + "recognizer/";
		}
		const client = Zotero.Sync.Runner.getAPIClient();
		const req = await client.makeRequest("POST", base.replace(/\/?$/, "/") + "recognize", {
			successCodes: [200],
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(json),
			noAPIKey: true,
		});
		res = JSON.parse(req.responseText);
	} catch (e) {
		Zotero.debug("OSCOLA Check: Zotero recognizer failed: " + e);
		return null;
	}
	if (!res) return null;
	// Only trust an identifier; a bare title match is left to the plugin's own identification
	const translate = new Zotero.Translate.Search();
	if (res.doi) translate.setIdentifier({ DOI: res.doi });
	else if (res.arxiv) translate.setIdentifier({ arXiv: res.arxiv });
	else if (res.isbn) translate.setSearch({ itemType: "book", ISBN: res.isbn });
	else return null;
	try {
		const translators = await translate.getTranslators();
		if (!translators?.length) return null;
		translate.setTranslator(translators);
		translate.setHandler("select", (_t: any, items: Record<string, string>, callback: (x: any) => void) => {
			const first = Object.keys(items)[0];
			callback(first ? { [first]: items[first] } : {});
		});
		const items = await translate.translate({ libraryID: false, saveAttachments: false });
		return items?.length ? fromTranslatorJSON(items[0]) : null;
	} catch (e) {
		Zotero.debug("OSCOLA Check: translation failed: " + e);
		return null;
	}
}

/** Translator output (Zotero item JSON) -> ItemData */
export function fromTranslatorJSON(j: any): ItemData {
	const skip = new Set(["itemType", "creators", "tags", "notes", "attachments", "seeAlso", "relations", "collections", "key", "version", "complete", "itemID", "libraryCatalog", "accessDate"]);
	const fields: Record<string, string> = {};
	for (const [k, v] of Object.entries(j)) if (!skip.has(k) && typeof v === "string" && v) fields[k] = v;
	const creators: Creator[] = (j.creators ?? []).map((c: any) =>
		c.fieldMode === 1 || c.name ? { creatorType: c.creatorType, name: c.name ?? c.lastName } : { creatorType: c.creatorType, firstName: c.firstName ?? "", lastName: c.lastName ?? "" },
	);
	return { itemType: j.itemType, fields, creators };
}

export interface FileProposal {
	rows: Suggestion[];
	issues: Issue[];
	itemType: string;
}

/** Identify one standalone file and propose a parent item. */
export async function proposeForFile(att: any, env: Env): Promise<FileProposal> {
	const issues: Issue[] = [];
	const filename = att.attachmentFilename ?? att.getField("title") ?? "";

	// 1. Zotero's own recognition (articles, books, arXiv)
	const fromZotero = await zoteroRecognize(att);
	if (fromZotero) {
		const result = await checkItem(fromZotero, env);
		return { rows: newItemRows(fromZotero, result, "zotero", true, "Zotero"), issues: result.issues, itemType: fromZotero.itemType };
	}

	// 2. The plugin's identification from text and file name (cover pages, legal and UN material)
	const text = await fileText(att);
	if (!text.trim()) issues.push({ severity: "warning", message: { id: "oc-issue-file-no-text" } });
	const id = identifyFile({ text, filename, title: att.getField("title") });
	let result = await checkItem(id.item, env);
	let rows = newItemRows(id.item, result, "file", id.identified, id.via);

	// 3. Title, author and year are the minimum. If any is missing, widen the search.
	let proposed = itemFromRows(rows);
	if (missingBasics(proposed).length || !id.identified) {
		const more = await fileText(att, 12);
		const exp = await expandSearch(proposed, more || text, env);
		const complete = missingBasics(exp.item).length === 0;
		result = await checkItem(exp.item, env);
		const via = exp.foundOnline ? exp.item.itemType : id.via;
		rows = newItemRows(exp.item, result, "file", id.identified || exp.foundOnline || complete, via || "text");
		if (exp.guessed) issues.push({ severity: "warning", message: { id: "oc-issue-basics-guessed" } });
		proposed = itemFromRows(rows);
	}
	const missing = missingBasics(proposed);
	if (missing.length) issues.push({ severity: "warning", message: { id: "oc-issue-basics-missing", args: { fields: missing.join(", ") } } });
	if (!id.identified && !missing.length) issues.push({ severity: "info", message: { id: "oc-issue-file-not-identified" } });
	return { rows, issues: [...issues, ...result.issues.filter((i) => i.message.id !== "oc-issue-item-type")], itemType: proposed.itemType };
}

/** Create the parent item from the ticked rows and put the file under it. */
export async function createParent(attachmentID: number, rows: Suggestion[]): Promise<boolean> {
	const typeRow = rows.find((r) => r.field === "itemType");
	if (!typeRow) return false;
	const att = await Zotero.Items.getAsync(attachmentID);
	if (!att || att.parentItemID) return false;
	const item = new Zotero.Item(typeRow.suggested);
	item.libraryID = att.libraryID;
	for (const r of rows) {
		if (r.field === "itemType") continue;
		if (r.field === "creators") {
			item.setCreators(r.creators ?? []);
			continue;
		}
		const fieldID = Zotero.ItemFields.getID(r.field);
		if (fieldID && Zotero.ItemFields.isValidForType(fieldID, item.itemTypeID)) item.setField(r.field, r.suggested);
	}
	await Zotero.DB.executeTransaction(async () => {
		for (const collectionID of att.getCollections()) item.addToCollection(collectionID);
		await item.save();
		att.parentID = item.id;
		await att.save();
	});
	// Rename the file like Zotero does for recognised files, if the user has that switched on
	try {
		if (Zotero.Prefs.get("autoRenameFiles") && att.isFileAttachment()) {
			const path = await att.getFilePathAsync();
			if (path) {
				const ext = /\.[^.\/\\]+$/.exec(path)?.[0] ?? "";
				const base = await Zotero.Attachments.getFileBaseNameFromItem(item);
				if (base) await att.renameAttachmentFile(base + ext);
			}
		}
	} catch (e) {
		Zotero.debug("OSCOLA Check: could not rename file: " + e);
	}
	return true;
}
