#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

// The catalog regenerates these structured area folders from scratch each run.
// Clearing them first avoids leaving stale frames behind when a page changes
// from a single file to a scroll-frame folder (or vice versa). Flat docs assets
// at the root of public/screenshots are left untouched.
const STRUCTURED_AREAS = ["auth", "admin", "manager", "auditor"];
for (const area of STRUCTURED_AREAS) {
	rmSync(path.join(process.cwd(), "public", "screenshots", area), { recursive: true, force: true });
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = ["exec", "playwright", "test", "--project=visual-chromium", "--workers=1"];
const env = {
	...process.env,
	CAPTURE_LOCAL_SCREENSHOTS: "1",
	E2E_BASE_URL: process.env.E2E_BASE_URL ?? "http://localhost:3000"
};

console.log("Capturing curated web screenshots via Playwright visual specs...");
console.log(`Base URL: ${env.E2E_BASE_URL}`);

const result = spawnSync(command, args, {
	cwd: process.cwd(),
	env,
	stdio: "inherit"
});

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
