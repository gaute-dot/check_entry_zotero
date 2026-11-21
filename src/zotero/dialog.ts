/**
 * Review dialog. Shows, per item, the notes found and a table of suggested
 * changes with a checkbox on each row. Only ticked rows are applied.
 */
import type { Suggestion } from "../core/types";
import type { DialogIO, DialogItem, ShownMessage } from "./shared";

const HTML = "http://www.w3.org/1999/xhtml";

declare const window: Window & { arguments: [DialogIO] };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
	const e = document.createElementNS(HTML, tag) as HTMLElementTagNameMap[K];
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
	if (text !== undefined) e.textContent = text;
	return e;
}

function l10n(e: Element, m: ShownMessage | string, args?: Record<string, string | number>): Element {
	const msg = typeof m === "string" ? { id: m, args: args ?? {} } : m;
	(document as any).l10n.setAttributes(e, msg.id, msg.args);
	return e;
}

function valueCell(value: string): HTMLElement {
	const td = el("td", { class: "value" });
	if (value === "") l10n(td.appendChild(el("span", { class: "empty" })), "oc-dialog-empty-value");
	else td.textContent = value;
	return td;
}

const boxes: { box: HTMLInputElement; itemID: number; suggestion: Suggestion }[] = [];

function renderItem(item: DialogItem): HTMLElement {
	const section = el("section", { class: "item" });
	const h = section.appendChild(el("h2"));
	if (item.newForFile) {
		l10n(h.appendChild(el("span", { class: "title" })), "oc-dialog-new-item", { file: item.newForFile });
		l10n(section.appendChild(el("p", { class: "note" })), "oc-dialog-new-item-help");
	} else {
		h.appendChild(el("span", { class: "title" }, item.title));
		h.appendChild(el("span", { class: "type" }, item.itemTypeLabel));
	}

	if (item.issues.length) {
		const ul = section.appendChild(el("ul", { class: "issues" }));
		for (const issue of item.issues) {
			const li = ul.appendChild(el("li", { class: issue.severity }));
			l10n(li.appendChild(el("span", { class: "severity" })), "oc-severity-" + issue.severity);
			l10n(li.appendChild(el("span", { class: "message" })), issue.message);
		}
	}

	if (!item.suggestions.length) {
		l10n(section.appendChild(el("p", { class: "none" })), item.issues.length ? "oc-dialog-no-changes" : "oc-dialog-no-issues");
		return section;
	}

	const table = section.appendChild(el("table"));
	const head = table.appendChild(el("thead")).appendChild(el("tr"));
	head.appendChild(el("th", { class: "check" }));
	for (const id of ["oc-dialog-col-field", "oc-dialog-col-current", "oc-dialog-col-suggested", "oc-dialog-col-why"]) {
		l10n(head.appendChild(el("th")), id);
	}
	const body = table.appendChild(el("tbody"));
	for (const s of item.suggestions) {
		const tr = body.appendChild(el("tr", { class: s.preselect ? "" : "unticked" }));
		const box = el("input", { type: "checkbox" });
		box.checked = s.preselect;
		boxes.push({ box, itemID: item.itemID, suggestion: s });
		const label = el("label");
		label.appendChild(box);
		tr.appendChild(el("td", { class: "check" })).appendChild(label);
		tr.appendChild(el("td", { class: "field" }, s.fieldLabel));
		tr.appendChild(valueCell(s.current));
		tr.appendChild(valueCell(s.suggestedLabel));
		const why = tr.appendChild(el("td", { class: "why" }));
		l10n(why.appendChild(el("div")), s.shownReason);
		why.appendChild(el("div", { class: "source" }, s.sourceLabel));
		if (s.field === "itemType") l10n(why.appendChild(el("div", { class: "note" })), "oc-dialog-type-change-note");
		const exclusive = () => {
			// Only one value per field can be applied
			if (!box.checked) return;
			for (const other of boxes) {
				if (other.box !== box && other.itemID === item.itemID && other.suggestion.field === s.field) other.box.checked = false;
			}
		};
		box.addEventListener("change", exclusive);
		tr.addEventListener("click", (ev) => {
			if (ev.target !== box && (ev.target as Element).localName !== "label") {
				box.checked = !box.checked;
				exclusive();
			}
		});
	}
	return section;
}

function init(): void {
	const io = window.arguments[0];
	const root = document.getElementById("oc-root")!;
	const issues = io.items.reduce((n, i) => n + i.issues.length, 0);
	const suggestions = io.items.reduce((n, i) => n + i.suggestions.length, 0);
	l10n(root.appendChild(el("p", { class: "intro" })), "oc-dialog-intro");
	l10n(root.appendChild(el("p", { class: "summary" })), "oc-dialog-summary", { items: io.items.length, suggestions, issues });
	for (const item of io.items) root.appendChild(renderItem(item));

	document.getElementById("oc-select-all")!.addEventListener("command", () => {
		// tick the first row of each field; alternatives below it stay unticked
		const seen = new Set<string>();
		for (const b of boxes) {
			const key = b.itemID + "\u0000" + b.suggestion.field;
			b.box.checked = !seen.has(key);
			seen.add(key);
		}
	});
	document.getElementById("oc-select-none")!.addEventListener("command", () => boxes.forEach((b) => (b.box.checked = false)));
	document.getElementById("oc-cancel")!.addEventListener("command", () => window.close());
	const apply = document.getElementById("oc-apply") as any;
	apply.addEventListener("command", async () => {
		apply.disabled = true;
		const byItem = new Map<number, Suggestion[]>();
		for (const b of boxes) {
			if (!b.box.checked) continue;
			// strip the display-only properties before handing back
			const { field, current, suggested, creators, source, reason, preselect } = b.suggestion;
			const list = byItem.get(b.itemID) ?? [];
			list.push({ field, current, suggested, creators, source, reason, preselect });
			byItem.set(b.itemID, list);
		}
		try {
			await io.apply([...byItem].map(([itemID, suggestions]) => ({ itemID, suggestions })));
			window.close();
		} catch (e) {
			apply.disabled = false;
			(window as any).alert(String(e));
		}
	});
}

window.addEventListener("load", init);
