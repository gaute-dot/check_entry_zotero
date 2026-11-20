import type { Detected } from "../core/detect";
import type { Candidate, Env, ItemData, SourceId } from "../core/types";
import { icj, unDigitalLibrary, untc } from "./international";
import { eurLex, findCaseLaw, hudoc, legislationGovUk, lovdata } from "./legal";
import { crossref, openalex, openlibrary } from "./scholarly";

export interface Resolver {
	id: SourceId;
	/** Skip this resolver when the named one already produced a match */
	fallbackFor?: SourceId;
	applies(item: ItemData, d: Detected): boolean;
	resolve(item: ItemData, d: Detected, env: Env): Promise<Candidate | null>;
}

/** In priority order: earlier resolvers win when two of them fill the same field. */
export const RESOLVERS: Resolver[] = [
	findCaseLaw,
	hudoc,
	eurLex,
	legislationGovUk,
	lovdata,
	unDigitalLibrary,
	untc,
	icj,
	crossref,
	openalex,
	openlibrary,
];
