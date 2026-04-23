/**
 * run-tests.mjs
 * Resolves the real (non-symlink) CWD before spawning vitest, so Vite's
 * internal loadAndTransform works correctly even when the project folder
 * is accessed via a Windows junction with non-ASCII characters.
 */
import { realpathSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

// Step 1: cd to the real physical folder (e.g. مرکز فرماندهی کیو)
const realRoot = realpathSync(process.cwd());
process.chdir(realRoot);

// Step 2: Run vitest from there, inheriting stdio
const vitestBin = resolve(realRoot, "node_modules", "vitest", "vitest.mjs");
const args = process.argv.slice(2).length ? process.argv.slice(2) : ["run"];

const child = spawn("node", [vitestBin, ...args], {
  cwd: realRoot,
  stdio: "inherit",
  env: { ...process.env, FORCE_COLOR: "1" },
});

child.on("exit", (code) => process.exit(code ?? 0));
