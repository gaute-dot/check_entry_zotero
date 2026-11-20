import { DOMParser } from "@xmldom/xmldom";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Env } from "../src/core/types";

const run = promisify(execFile);

/** An Env that really goes online (through curl, so proxy settings apply). Used by test/live.test.ts only. */
export const liveEnv: Env & { log: string[] } = {
	log: [],
	async fetchText(url, opts) {
		liveEnv.log.push(url);
		const args = ["-sS", "-L", "--max-time", "30", "-w", "\n%{http_code}", "-H", `Accept: ${opts?.accept ?? "*/*"}`, "-A", "OSCOLA-Check-Zotero-plugin-tests"];
		for (const [k, v] of Object.entries(opts?.headers ?? {})) args.push("-H", `${k}: ${v}`);
		const { stdout } = await run("curl", [...args, url], { maxBuffer: 50 * 1024 * 1024 });
		const i = stdout.lastIndexOf("\n");
		const code = Number(stdout.slice(i + 1));
		if (code < 200 || code >= 300) throw new Error(`HTTP ${code}`);
		return stdout.slice(0, i);
	},
	parseXML: (text) => new DOMParser().parseFromString(text, "text/xml") as unknown as Document,
};
