import type { Creator, Env } from "../core/types";

export async function getJSON<T = any>(env: Env, url: string, headers?: Record<string, string>): Promise<T> {
	const text = await env.fetchText(url, { accept: "application/json", headers });
	return JSON.parse(text) as T;
}

export async function getXML(env: Env, url: string): Promise<Document> {
	const text = await env.fetchText(url, { accept: "application/xml" });
	return env.parseXML(text);
}

/** All elements with this local name, whatever their namespace prefix. */
export function byLocalName(root: Document | Element, name: string): Element[] {
	const out: Element[] = [];
	const all = root.getElementsByTagName("*");
	for (let i = 0; i < all.length; i++) {
		const el = all[i];
		if ((el.localName ?? el.nodeName.replace(/^.*:/, "")) === name) out.push(el);
	}
	return out;
}

export function firstByLocalName(root: Document | Element, name: string): Element | null {
	return byLocalName(root, name)[0] ?? null;
}

export function textOf(el: Element | null | undefined): string {
	return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** "Jane Q. Smith" -> {firstName: "Jane Q.", lastName: "Smith"} */
export function splitName(full: string, creatorType = "author"): Creator {
	const t = full.replace(/\s+/g, " ").trim();
	if (t.includes(",")) {
		const [last, first] = t.split(",", 2).map((s) => s.trim());
		return { creatorType, lastName: last, firstName: first };
	}
	const parts = t.split(" ");
	if (parts.length === 1) return { creatorType, name: t };
	// keep particles with the surname: "Ludwig van Beethoven" -> "van Beethoven"
	let i = parts.length - 1;
	while (i > 1 && /^(van|von|de|der|den|da|di|du|la|le|af|av)$/i.test(parts[i - 1])) i--;
	return { creatorType, firstName: parts.slice(0, i).join(" "), lastName: parts.slice(i).join(" ") };
}
