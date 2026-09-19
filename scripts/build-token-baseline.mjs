/**
 * Regenerates tests/fixtures/design-tokens-baseline.json from brand/tokens.json.
 *
 * The fixture is a drift guard, not a design document: design-tokens.test.ts asserts
 * the generated palettes still resolve to exactly these values, so an accidental edit
 * to a palette fails a test instead of silently changing the UI. When the palette
 * changes on purpose, run this and commit the fixture alongside the token change.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(resolve(root, "brand/tokens.json"), "utf8"));
const target = resolve(root, "tests/fixtures/design-tokens-baseline.json");

const scaleAccents = { ...tokens.scales.shared };
for (const [name, platforms] of Object.entries(tokens.scales.platformOverrides ?? {})) {
	if (platforms.web) scaleAccents[name] = platforms.web;
}

const existing = JSON.parse(readFileSync(target, "utf8"));
const baseline = {
	_comment: existing._comment,
	palettes: tokens.web.palettes,
	scaleAccents: Object.fromEntries(
		["provision", "variety", "challenge", "sociability"].map(key => [key, scaleAccents[key]])
	),
	constructAccents: tokens.scales.constructs,
	defaults: { theme: tokens.web.defaultTheme, contrast: tokens.web.defaultContrast }
};

writeFileSync(target, `${JSON.stringify(baseline, null, "\t")}\n`);
console.log(`token baseline - wrote ${target}`);
