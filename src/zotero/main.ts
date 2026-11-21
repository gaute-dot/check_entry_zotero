/**
 * Zotero glue: menu, reading items, running the check, opening the review
 * dialog and writing the ticked changes back.
 *
 * Bundled by esbuild into addon/content/scripts/oscola-check.js and loaded
 * by bootstrap.js, which calls the hooks on the global `OscolaCheck`.
 */
import { checkItem } from "../core/check";
import type { Creator, Env, ItemData, Message, SourceId, Suggestion } from "../core/types";
import { ensureBasics } from "../core/basics";
import { createParent, isStandaloneFile, itemText, proposeForFile } from "./files";
import type { DialogIO, DialogItem, ShownMessage, ShownSuggestion } from "./shared";

declare const Zotero: any;

const PREF = "extensions.oscola-check.";
const MENU_ID = "oscola-check-item-menu";
const SOURCES: SourceId[] = ["crossref", "openalex", "openlibrary", "legislation-gov-uk", "find-case-law", "eur-lex", "hudoc", "lovdata", "un-digital-library", "untc", "icj", "nb"];

let pluginID = "";
let rootURI = "";
let prefPaneID: string | null = null;
let l10n: any = null;

function t(id: string, args?: Record<string, unknown>): string {
	try {
		// Localization is a window global; create it lazily from the main window
		l10n ??= new (Zotero.getMainWindow().Localization)(["oscola-check.ftl"], true);
		return l10n.formatValueSync(id, args) ?? id;
	} catch {
		return id;
	}
}

// ---------------------------------------------------------------- lifecycle

export async function startup(data: { id: string; rootURI: string }): Promise<void> {
	pluginID = data.id;
	rootURI = data.rootURI;

	Zotero.MenuManager.registerMenu({
		menuID: MENU_ID,
		pluginID,
		target: "main/library/item",
		menus: [
			{
				menuType: "menuitem",
				l10nID: "oc-menu-check",
				icon: rootURI + "content/icons/icon.svg",
				onShowing: (_ev: Event, ctx: any) => {
					ctx.setVisible(!!ctx.items?.some((i: any) => i.isRegularItem() || isStandaloneFile(i)));
				},
				onCommand: (_ev: Event, ctx: any) => {
					run(ctx.items ?? []).catch((e) => Zotero.logError(e));
				},
			},
		],
	});

	prefPaneID = await Zotero.PreferencePanes.register({
		pluginID,
		src: rootURI + "content/preferences.xhtml",
		scripts: [rootURI + "content/preferences.js"],
		image: rootURI + "content/icons/icon.svg",
	});
}

export function onMainWindowLoad(win: any): void {
	win.MozXULElement?.insertFTLIfNeeded("oscola-check.ftl");
}

export function onMainWindowUnload(win: any): void {
	win.document.querySelector('[href="oscola-check.ftl"]')?.remove();
}

export function shutdown(): void {
	Zotero.MenuManager.unregisterMenu(MENU_ID);
	if (prefPaneID) Zotero.PreferencePanes.unregister(prefPaneID);
	for (const win of Zotero.getMainWindows()) onMainWindowUnload(win);
}

/**
 * Install the adjusted OSCOLA style shipped with the plugin. Zotero shows
 * its usual confirmation dialog first.
 */
export async function installStyle(): Promise<void> {
	await Zotero.Styles.install({ url: rootURI + "content/styles/oscola-international.csl" }, "OSCOLA Check", false);
}

// ---------------------------------------------------------------- environment for the core

function makeEnv(): Env {
	const enabledSources: Partial<Record<SourceId, boolean>> = {};
	for (const s of SOURCES) enabledSources[s] = Zotero.Prefs.get(PREF + "source." + s, true) !== false;
	return {
		async fetchText(url, opts) {
			const xhr = await Zotero.HTTP.request("GET", url, {
				headers: { Accept: opts?.accept ?? "*/*", ...(opts?.headers ?? {}) },
				responseType: "text",
				timeout: 20000,
				errorDelayMax: 0,
			});
			return xhr.responseText as string;
		},
		parseXML(text) {
			const win = Zotero.getMainWindow();
			return new win.DOMParser().parseFromString(text, "application/xml");
		},
		contactEmail: String(Zotero.Prefs.get(PREF + "contactEmail", true) ?? "").trim(),
		apiKeys: { openalex: String(Zotero.Prefs.get(PREF + "openalexKey", true) ?? "").trim() },
		enabledSources,
	};
}

// ---------------------------------------------------------------- reading and writing items

export function toItemData(item: any): ItemData {
	const fields: Record<string, string> = {};
	for (const fieldID of Zotero.ItemFields.getItemTypeFields(item.itemTypeID)) {
		const name = Zotero.ItemFields.getName(fieldID);
		fields[name] = item.getField(name) ?? "";
	}
	const creators: Creator[] = item.getCreators().map((c: any) => {
		const creatorType = Zotero.CreatorTypes.getName(c.creatorTypeID);
		return c.fieldMode === 1 ? { creatorType, name: c.lastName } : { creatorType, firstName: c.firstName, lastName: c.lastName };
	});
	return { itemType: Zotero.ItemTypes.getName(item.itemTypeID), fields, creators };
}

/** Map a field name from one item type to the equivalent field of another (via base fields). */
function mapField(fromTypeID: number, toTypeID: number, field: string): string | null {
	const fieldID = Zotero.ItemFields.getID(field);
	if (!fieldID) return null;
	if (Zotero.ItemFields.isValidForType(fieldID, toTypeID)) return field;
	const baseID = Zotero.ItemFields.getBaseIDFromTypeAndField(fromTypeID, fieldID) || fieldID;
	const mapped = Zotero.ItemFields.getFieldIDFromTypeAndBase(toTypeID, baseID);
	if (mapped) return Zotero.ItemFields.getName(mapped);
	return Zotero.ItemFields.isValidForType(baseID, toTypeID) ? Zotero.ItemFields.getName(baseID) : null;
}

async function applyChanges(itemID: number, changes: Suggestion[]): Promise<void> {
	const item = await Zotero.Items.getAsync(itemID);
	const originalTypeID = item.itemTypeID;
	const typeChange = changes.find((c) => c.field === "itemType");
	if (typeChange) item.setType(Zotero.ItemTypes.getID(typeChange.suggested));
	for (const c of changes) {
		if (c.field === "itemType") continue;
		if (c.field === "creators") {
			item.setCreators(c.creators ?? []);
			continue;
		}
		const field = mapField(originalTypeID, item.itemTypeID, c.field);
		if (field) item.setField(field, c.suggested);
	}
	await item.saveTx();
}

// ---------------------------------------------------------------- running a check

function fieldLabel(field: string, _itemType: string): string {
	if (field === "creators") return t("oc-field-creators");
	if (field === "itemType") return t("oc-field-itemType");
	try {
		// field names are already type-specific ("caseName", "nameOfAct"), so this gives e.g. "Case Name"
		return Zotero.ItemFields.getLocalizedString(field) || field;
	} catch {
		return field;
	}
}

function typeLabel(itemType: string): string {
	try {
		return Zotero.ItemTypes.getLocalizedString(itemType) || itemType;
	} catch {
		return itemType;
	}
}

function creatorLabel(creatorType: string): string {
	try {
		return (Zotero.CreatorTypes.getLocalizedString(creatorType) || creatorType).toLowerCase();
	} catch {
		return creatorType;
	}
}

/** Replace raw IDs in message arguments with readable, localised labels. */
function show(m: Message, itemType: string): ShownMessage {
	const args: Record<string, string | number> = { ...(m.args ?? {}) };
	if (typeof args.source === "string") args.source = t("oc-source-" + args.source);
	if (typeof args.field === "string") args.field = fieldLabel(args.field, itemType);
	if (typeof args.type === "string") args.type = Zotero.ItemTypes.getID(args.type) ? typeLabel(args.type) : creatorLabel(args.type);
	return { id: m.id, args };
}

function shownSuggestions(list: Suggestion[], itemType: string): ShownSuggestion[] {
	return list.map((s) => ({
		...s,
		fieldLabel: fieldLabel(s.field, itemType),
		current: s.field === "itemType" ? (s.current ? typeLabel(s.current) : "") : s.current,
		suggestedLabel: s.field === "itemType" ? typeLabel(s.suggested) : s.suggested,
		sourceLabel: t("oc-source-" + s.source),
		shownReason: show(s.reason, itemType),
	}));
}

async function run(selected: any[]): Promise<void> {
	const items = selected.filter((i) => i.isRegularItem());
	const files = selected.filter((i) => isStandaloneFile(i));
	const progress = new Zotero.ProgressWindow({ closeOnClick: false });
	progress.changeHeadline(t("oc-progress-headline"));
	if (!items.length && !files.length) {
		progress.addDescription(t("oc-progress-none"));
		progress.show();
		progress.startCloseTimer(4000);
		return;
	}
	const line = new progress.ItemProgress(rootURI + "content/icons/icon.svg", "");
	progress.show();

	const env = makeEnv();
	const results: DialogItem[] = [];
	const total = items.length + files.length;
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const data = toItemData(item);
		const title = item.getDisplayTitle();
		line.setText(t("oc-progress-item", { current: i + 1, total, title }));
		line.setProgress(Math.round((i / total) * 100));
		let res;
		try {
			res = await checkItem(data, env);
			// title, author and year are the minimum: widen the search if any is still missing
			res = await ensureBasics(data, res, env, () => itemText(item));
		} catch (e) {
			Zotero.logError(e);
			res = { issues: [{ severity: "error" as const, message: { id: "oc-issue-source-failed", args: { source: "rules", error: String(e) } } }], suggestions: [] };
		}
		results.push({
			itemID: item.id,
			title,
			itemTypeLabel: typeLabel(data.itemType),
			issues: res.issues.map((i) => ({ severity: i.severity, fieldLabel: i.field ? fieldLabel(i.field, data.itemType) : "", message: show(i.message, data.itemType) })),
			suggestions: shownSuggestions(res.suggestions, data.itemType),
		});
	}
	for (let i = 0; i < files.length; i++) {
		const att = files[i];
		const name = att.attachmentFilename || att.getDisplayTitle();
		line.setText(t("oc-progress-file", { current: items.length + i + 1, total, file: name }));
		line.setProgress(Math.round(((items.length + i) / total) * 100));
		try {
			const p = await proposeForFile(att, env);
			results.push({
				itemID: att.id,
				title: name,
				itemTypeLabel: "",
				newForFile: name,
				issues: p.issues.map((x) => ({ severity: x.severity, fieldLabel: x.field ? fieldLabel(x.field, p.itemType) : "", message: show(x.message, p.itemType) })),
				suggestions: shownSuggestions(p.rows, p.itemType),
			});
		} catch (e) {
			Zotero.logError(e);
		}
	}
	line.setProgress(100);
	progress.close();

	const io: DialogIO = {
		items: results,
		apply: async (selection) => {
			let count = 0;
			const newFor = new Set(results.filter((r) => r.newForFile).map((r) => r.itemID));
			for (const { itemID, suggestions } of selection) {
				if (!suggestions.length) continue;
				if (newFor.has(itemID)) {
					if (await createParent(itemID, suggestions)) count++;
					continue;
				}
				await applyChanges(itemID, suggestions);
				count++;
			}
			const done = new Zotero.ProgressWindow();
			done.changeHeadline(t("oc-progress-headline"));
			done.addDescription(t("oc-progress-applied", { count }));
			done.show();
			done.startCloseTimer(3000);
		},
	};
	Zotero.getMainWindow().openDialog(
		"chrome://oscola-check/content/review.xhtml",
		"oscola-check-review",
		"chrome,centerscreen,resizable,dialog=no",
		io,
	);
}
