// Builds the plugin into build/addon and packages build/oscola-check-<version>.xpi
import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const out = "build/addon";
rmSync("build", { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync("addon", out, { recursive: true });

const common = { bundle: true, target: "firefox128", format: "iife", logLevel: "info", charset: "utf8" };
await build({
	...common,
	entryPoints: ["src/zotero/main.ts"],
	outfile: join(out, "content/scripts/oscola-check.js"),
	globalName: "OscolaCheck",
});
await build({ ...common, entryPoints: ["src/zotero/dialog.ts"], outfile: join(out, "content/scripts/review.js") });

const manifestPath = join(out, "manifest.json");
writeFileSync(manifestPath, readFileSync(manifestPath, "utf8").replace("__VERSION__", pkg.version));

const xpi = `oscola-check-${pkg.version}.xpi`;
execFileSync("zip", ["-qr", join("..", xpi), "."], { cwd: out });
console.log(`Built build/${xpi}`);
