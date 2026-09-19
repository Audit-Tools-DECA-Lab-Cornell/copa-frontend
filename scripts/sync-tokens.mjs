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

	/** Serialise a token group, dropping the `_note` prose key. */
	const group = name =>
		entries(Object.fromEntries(Object.entries(tokens[name] ?? {}).filter(([key]) => !key.startsWith("_"))), 1);

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

/**
 * Default appearance for this platform, resolved from brand/tokens.json. The palette
 * a first-time visitor sees is part of the brand, so it lives with the colours rather
 * than as a literal in design-system.ts.
 */
export const GENERATED_DEFAULTS: {
\treadonly theme: "light" | "dark";
\treadonly contrast: "standard" | "high";
} = {
\ttheme: ${JSON.stringify(tokens.web.defaultTheme)},
\tcontrast: ${JSON.stringify(tokens.web.defaultContrast)}
};

export const GENERATED_PALETTES = {
${modes.join(",\n")}
} as const;

/** Canonical PV scale accents for this platform, resolved from brand/tokens.json. */
export const GENERATED_SCALE_ACCENTS = {
${scaleEntries}
} as const;

/** Headline construct accents (Play Value / Usability), shared verbatim with copa-mobile. */
export const GENERATED_CONSTRUCT_ACCENTS = {
${entries(tokens.scales?.constructs ?? {}, 1)}
} as const;

/** Row tints distinguishing Place Audit from Place Survey rows in combined reports. */
export const GENERATED_REPORT_SOURCE_COLORS = {
${group("reportSource")}
} as const;

/** Inlined into the server-rendered static-map placeholder SVG, which cannot read CSS variables. */
export const GENERATED_MAP_PLACEHOLDER_COLORS = {
${group("mapPlaceholder")}
} as const;

/** Decorative wash and hero scrims on the public pages, emitted as CSS custom properties. */
export const GENERATED_LANDING_COLORS = {
${group("landing")}
} as const;

/** Always-dark code pane for the raw-JSON inspector. Does not follow the app theme. */
export const GENERATED_CODE_VIEWER_COLORS = {
${group("codeViewer")}
} as const;

/** Badges on a scrim over an arbitrary image. Always dark - neither half follows the theme. */
export const GENERATED_OVERLAY_BADGE_COLORS = {
${group("overlayBadge")}
} as const;

/** Cloudinary upload widget frame overlay - the widget takes a plain colour string. */
export const GENERATED_UPLOAD_WIDGET_COLORS = {
${group("uploadWidget")}
} as const;
`;
}

/**
 * Recognised CSS colour forms. The generator emits these verbatim into TypeScript
 * and, on web, into CSS custom properties - where a malformed value fails silently
 * (the declaration is dropped and the element inherits). Nothing downstream can
 * catch that: `tsc` sees a string, and the baseline tests only reject empty values.
 * Phase 3 hand-edits ~300 of these, so the gate belongs here.
 */
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNCTIONAL = /^(rgb|rgba|hsl|hsla)\(([^()]*)\)$/;

/**
 * Groups whose consumers parse the value as hex rather than handing it to CSS.
 *
 * `withAlpha()` and `hexToRgb()` in scale-colors, `hexToXlsxRgb()` in the XLSX
 * export, and the native config all assume `#RRGGBB`. Accepting `rgb()` or
 * `hsl()` here would let a future palette change pass `tokens:check` and then
 * throw at render time, inside the PDF and export paths - exactly where a
 * failure is least visible.
 */
const HEX_ONLY_GROUPS = new Set(["reportSource", "exportDocument", "nativeSplash"]);

/**
 * Exactly six digits. The general HEX matcher above also admits 3-, 4- and 8-digit
 * forms, which are valid CSS but not valid input to the consumers of the groups in
 * HEX_ONLY_GROUPS: parseHexColor throws on anything but six, and the XLSX writer
 * silently produces a wrong fill from eight.
 */
const HEX6 = /^#[0-9a-fA-F]{6}$/;

/** @returns An error string when `value` is not a usable CSS colour, else null. */
function colorError(value) {
	if (typeof value !== "string") return `expected a string, got ${typeof value}`;
	const trimmed = value.trim();
	if (trimmed === "") return "empty string";
	if (trimmed !== value) return "has leading or trailing whitespace";
	if (HEX.test(trimmed)) return null;

	const functional = FUNCTIONAL.exec(trimmed);
	if (!functional) return "not a hex or rgb()/rgba()/hsl()/hsla() colour";

	const [, fn, body] = functional;
	const parts = body
		.split(/[,/]/)
		.map(part => part.trim())
		.filter(part => part !== "");
	if (parts.length < 3 || parts.length > 4) return `${fn}() needs 3 or 4 components, got ${parts.length}`;
	for (const part of parts) {
		if (!/^[+-]?(?:\d+\.?\d*|\.\d+)%?$/.test(part)) return `${fn}() component "${part}" is not a number`;
	}
	if (fn.startsWith("hsl") && !parts[1].endsWith("%")) return "hsl() saturation must be a percentage";
	if (fn.startsWith("hsl") && !parts[2].endsWith("%")) return "hsl() lightness must be a percentage";
	return null;
}

/**
 * Validates the whole token file - shape and colour syntax - before anything is
 * generated from it. Runs in both modes, so a malformed token can neither be
 * built nor pass CI.
 */
function validate(tokens) {
	const errors = [];
	const check = (path, value, hexOnly = false) => {
		const error = colorError(value);
		if (error) errors.push(`${path}: ${JSON.stringify(value)} - ${error}`);
		else if (hexOnly && !HEX6.test(value.trim())) {
			errors.push(
				`${path}: ${JSON.stringify(value)} - must be a six-digit hex colour; this group is parsed as hex by its consumers, not handed to CSS`
			);
		}
	};

	// The defaults are emitted into TypeScript as a narrow union, so a typo here would
	// produce a file that does not compile rather than one that renders the wrong theme.
	// Catch it at the source instead.
	if (!["light", "dark"].includes(tokens.web?.defaultTheme)) {
		errors.push(`web.defaultTheme: ${JSON.stringify(tokens.web?.defaultTheme)} - must be "light" or "dark"`);
	}
	if (!["standard", "high"].includes(tokens.web?.defaultContrast)) {
		errors.push(
			`web.defaultContrast: ${JSON.stringify(tokens.web?.defaultContrast)} - must be "standard" or "high"`
		);
	}
	if (!["light", "dark"].includes(tokens.mobile?.defaultTheme)) {
		errors.push(`mobile.defaultTheme: ${JSON.stringify(tokens.mobile?.defaultTheme)} - must be "light" or "dark"`);
	}

	const web = tokens.web?.palettes ?? {};
	let webKeys = null;
	for (const [theme, contrasts] of Object.entries(web)) {
		for (const [contrast, palette] of Object.entries(contrasts)) {
			const keys = Object.keys(palette).sort();
			if (webKeys === null) webKeys = keys;
			else if (keys.join() !== webKeys.join()) {
				errors.push(`web.palettes.${theme}.${contrast}: token set differs from the other modes`);
			}
			for (const [token, value] of Object.entries(palette)) {
				check(`web.palettes.${theme}.${contrast}.${token}`, value);
			}
		}
	}

	const mobile = tokens.mobile?.palettes ?? {};
	let mobileKeys = null;
	for (const [mode, palette] of Object.entries(mobile)) {
		const keys = Object.keys(palette).sort();
		if (mobileKeys === null) mobileKeys = keys;
		else if (keys.join() !== mobileKeys.join()) {
			errors.push(`mobile.palettes.${mode}: token set differs from the other modes`);
		}
		for (const [token, value] of Object.entries(palette)) {
			check(`mobile.palettes.${mode}.${token}`, value);
		}
	}

	for (const [name, ramp] of Object.entries(tokens.mobile?.tamaguiRamp ?? {})) {
		if (!Array.isArray(ramp) || ramp.length !== 12) {
			errors.push(`mobile.tamaguiRamp.${name}: expected 12 steps, got ${ramp?.length ?? "none"}`);
		}
		(ramp ?? []).forEach((value, index) => check(`mobile.tamaguiRamp.${name}[${index}]`, value));
	}

	for (const [token, value] of Object.entries(tokens.scales?.shared ?? {})) {
		check(`scales.shared.${token}`, value, true);
	}
	for (const [token, platforms] of Object.entries(tokens.scales?.platformOverrides ?? {})) {
		for (const [platform, value] of Object.entries(platforms)) {
			if (value !== null && value !== undefined)
				check(`scales.platformOverrides.${token}.${platform}`, value, true);
		}
	}
	for (const [token, value] of Object.entries(tokens.scales?.constructs ?? {})) {
		check(`scales.constructs.${token}`, value, true);
	}

	// Flat groups. `_note` keys carry prose, not colour, so they are skipped.
	for (const group of [
		"reportSource",
		"mapPlaceholder",
		"exportDocument",
		"codeViewer",
		"overlayBadge",
		"nativeSplash",
		"landing",
		"mobileSurface",
		"uploadWidget"
	]) {
		for (const [token, value] of Object.entries(tokens[group] ?? {})) {
			if (token.startsWith("_")) continue;
			check(`${group}.${token}`, value, HEX_ONLY_GROUPS.has(group));
		}
	}

	if (errors.length > 0) {
		console.error(`tokens: brand/tokens.json has ${errors.length} invalid token(s):`);
		for (const error of errors) console.error(`  ${error}`);
		process.exit(1);
	}
}

const tokens = JSON.parse(readFileSync(TOKENS, "utf8"));
validate(tokens);
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
