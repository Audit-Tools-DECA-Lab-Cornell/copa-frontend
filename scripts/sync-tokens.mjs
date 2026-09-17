#!/usr/bin/env node
/**
 * Generates `src/lib/design-system.generated.ts` from `brand/tokens.json`.
 *
 * `brand/tokens.json` is the canonical colour source for BOTH copa-frontend and
 * copa-mobile. copa-mobile vendors a byte-identical copy of it; the two are
 * compared by the `meta.checksum` line this script maintains.
 *
 * Usage:
 *   node scripts/sync-tokens.mjs           # write the generated file
 *   node scripts/sync-tokens.mjs --check   # fail if the file is stale (CI)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = resolve(ROOT, "brand/tokens.json");
const TARGET = resolve(ROOT, "src/lib/design-system.generated.ts");
const CHECK = process.argv.includes("--check");

/** Stable checksum over the token payload, ignoring `meta` (which holds the checksum itself). */
function checksum(tokens) {
	const { meta: _meta, ...payload } = tokens;
	return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

/** Serialise a flat `{key: "value"}` map as TS object entries at the given indent depth. */
function entries(map, depth) {
	const pad = "\t".repeat(depth);
	return Object.entries(map)
		.map(([key, value]) => `${pad}${key}: ${JSON.stringify(value)}`)
		.join(",\n");
}

function render(tokens) {
	const { palettes } = tokens.web;
	const modes = [];
	for (const theme of Object.keys(palettes)) {
		const contrasts = Object.keys(palettes[theme])
			.map(contrast => `\t\t${contrast}: {\n${entries(palettes[theme][contrast], 3)}\n\t\t}`)
			.join(",\n");
		modes.push(`\t${theme}: {\n${contrasts}\n\t}`);
	}

	const scales = { ...tokens.scales.shared };
	for (const [key, value] of Object.entries(tokens.scales.platformOverrides ?? {})) {
		if (value.web !== null && value.web !== undefined) scales[key] = value.web;
	}
	const ordered = ["provision", "variety", "challenge", "sociability"];
	const scaleEntries = entries(Object.fromEntries(ordered.filter(k => k in scales).map(k => [k, scales[k]])), 1);

	return `/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source:      brand/tokens.json (checksum ${checksum(tokens)})
 * Regenerate:  pnpm tokens:build
 * Verify:      pnpm tokens:check
 *
 * Colour is defined once, in brand/tokens.json, and shared with copa-mobile.
 * Editing this file by hand will be reverted by the next generator run and
 * will fail the \`tokens:check\` job in CI.
 */

export const GENERATED_PALETTES = {
${modes.join(",\n")}
} as const;

/** Canonical PV scale accents for this platform, resolved from brand/tokens.json. */
export const GENERATED_SCALE_ACCENTS = {
${scaleEntries}
} as const;
`;
}

const tokens = JSON.parse(readFileSync(TOKENS, "utf8"));
const expected = checksum(tokens);
const output = render(tokens);

if (CHECK) {
	// The stamp is what copa-mobile trusts. If it drifted from the payload here,
	// every vendored copy taken since is suspect, so fail before anything else.
	if (tokens.meta?.checksum !== expected) {
		console.error(
			"tokens:check - brand/tokens.json meta.checksum is missing or stale " +
				`(stamped ${tokens.meta?.checksum ?? "none"}, payload ${expected}). Run \`pnpm tokens:build\`.`
		);
		process.exit(1);
	}

	let current = "";
	try {
		current = readFileSync(TARGET, "utf8");
	} catch {
		console.error("tokens:check - src/lib/design-system.generated.ts is missing. Run `pnpm tokens:build`.");
		process.exit(1);
	}
	if (current !== output) {
		console.error(
			"tokens:check - design-system.generated.ts is stale. Run `pnpm tokens:build` and commit the result."
		);
		process.exit(1);
	}
	console.log(`tokens:check - up to date (brand/tokens.json checksum ${expected}).`);
} else {
	if (tokens.meta?.checksum !== expected) {
		tokens.meta = { ...tokens.meta, checksum: expected };
		writeFileSync(TOKENS, JSON.stringify(tokens, null, "\t") + "\n");
		console.log(`tokens:build - stamped brand/tokens.json meta.checksum ${expected}.`);
	}
	writeFileSync(TARGET, output);
	console.log(`tokens:build - wrote src/lib/design-system.generated.ts (checksum ${expected}).`);
}
