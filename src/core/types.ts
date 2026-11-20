/**
 * Plain data model shared by the rules engine, the resolvers and the
 * Zotero glue code. Nothing in src/core or src/resolvers touches Zotero
 * directly, so all of it can be unit-tested in Node.
 */

export interface Creator {
	creatorType: string;
	firstName?: string;
	lastName?: string;
	/** Single-field name (institutions, courts) */
	name?: string;
}

export interface ItemData {
	itemType: string;
	/** Zotero field name -> value. Missing and "" both mean empty. */
	fields: Record<string, string>;
	creators: Creator[];
}

export type Severity = "error" | "warning" | "info";

/**
 * A message is a Fluent ID (defined in addon/locale/<lang>/oscola-check.ftl)
 * plus arguments, so the dialog can show it in English or Norwegian.
 */
export interface Message {
	id: string;
	args?: Record<string, string | number>;
}

/** A problem that has no automatic fix. */
export interface Issue {
	severity: Severity;
	field?: string;
	message: Message;
}

/** Where a proposed value came from. "rules" = local OSCOLA normalisation. */
export type SourceId =
	| "rules"
	| "crossref"
	| "openalex"
	| "openlibrary"
	| "legislation-gov-uk"
	| "find-case-law"
	| "eur-lex"
	| "hudoc"
	| "lovdata"
	| "un-digital-library"
	| "untc"
	| "icj";

/** A proposed change to one field of one item. */
export interface Suggestion {
	/** Zotero field name, or the pseudo-fields "creators" / "itemType" */
	field: string;
	current: string;
	suggested: string;
	/** Only for field === "creators" */
	creators?: Creator[];
	source: SourceId;
	reason: Message;
	/** Whether the checkbox starts ticked in the review dialog */
	preselect: boolean;
}

export interface CheckResult {
	issues: Issue[];
	suggestions: Suggestion[];
}

/** Metadata found by a resolver, expressed as Zotero fields. */
export interface Candidate {
	source: SourceId;
	fields: Record<string, string>;
	creators?: Creator[];
	/** Lines to add to Extra, e.g. "CELEX: 32016R0679" */
	extraLines?: string[];
	/** 0..1 — how sure the resolver is that this is the same work */
	confidence: number;
	/** Notes for the user (shown as "info" in the review dialog) */
	notes?: Message[];
	/** Tick a fetched value that only adds to the user's value (default true) */
	tickExtensions?: boolean;
}

/**
 * Network/parsing services injected by the caller. In Zotero these wrap
 * Zotero.HTTP and DOMParser; in tests they return saved fixtures.
 */
export interface Env {
	fetchText(url: string, opts?: { headers?: Record<string, string>; accept?: string }): Promise<string>;
	parseXML(text: string): Document;
	/** Optional e-mail for Crossref's "polite pool". Empty = not sent. */
	contactEmail?: string;
	/** Which sources are enabled (all by default) */
	enabledSources?: Partial<Record<SourceId, boolean>>;
}
