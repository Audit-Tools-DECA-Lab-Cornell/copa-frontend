/**
 * Regenerates the colour tables in docs/brand-kit.md from brand/tokens.json.
 *
 * The tables used to be transcribed by hand, and by phase 3 they were two
 * generations stale - they still listed values that no palette had shipped since
 * before the token pipeline existed. A document that quietly disagrees with the
 * code is worse than one that says nothing, so the tables are generated between
 * the markers below and `pnpm docs:check` fails CI when they drift.
 *
 * Everything outside the markers is prose and is edited by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "docs/brand-kit.md");
const tokens = JSON.parse(readFileSync(resolve(root, "brand/tokens.json"), "utf8"));

const OPEN = "<!-- generated:colour-tables -->";
const CLOSE = "<!-- /generated:colour-tables -->";

const light = tokens.web.palettes.light.standard;
const dark = tokens.web.palettes.dark.standard;

/** @returns The WCAG 2.x relative luminance of an opaque `#rrggbb`. */
function luminance(hex) {
	const [red, green, blue] = [1, 3, 5]
		.map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
		.map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function ratio(a, b) {
	const values = [luminance(a), luminance(b)];
	return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

const row = cells => `| ${cells.join(" | ")} |`;

const SURFACES = [
	["App canvas", "`bg-background` (`--canvas`)", "canvas"],
	["Card surface", "`bg-card` (`--surface`)", "surface"],
	["Raised surface (popovers)", "`bg-surface-raised`", "surfaceRaised"],
	["Sunken surface (wells, inputs)", "`bg-surface-sunken`", "surfaceSunken"],
	["Primary text", "`text-foreground` (`--text-primary`)", "textPrimary"],
	["Secondary text", "`text-text-secondary`", "textSecondary"],
	["Muted text", "`text-muted-foreground`", "textMuted"],
	["Structural edge", "`border-edge` (use `/40`–`/60` opacity)", "edge"],
	["Input border", "`border-input-border`", "inputBorder"],
	["Focus ring", "`ring-ring` (`--focus`)", "focus"]
];

const ACCENTS = [
	[
		"Deep navy (primary)",
		"`--accent-terracotta` / `bg-primary`",
		"accentTerracotta",
		"Primary accent, focus, selection, section-header accent tick"
	],
	["Moss", "`--accent-moss`", "accentMoss", "Success-adjacent, categorical"],
	["Steel blue", "`--accent-slate`", "accentSlate", "Info, categorical; paired `-surface`/`-border` for soft badges"],
	["Indigo", "`--accent-violet`", "accentViolet", "Categorical, stat tones; paired `-surface`/`-border`"]
];

const BARS = {
	...tokens.scales.shared,
	challenge: tokens.scales.platformOverrides.challenge.web,
	...tokens.scales.constructs
};
const BAR_ORDER = ["provision", "variety", "challenge", "sociability", "playValue", "usability"];
const BAR_LABELS = {
	provision: "Provision",
	variety: "Variety",
	challenge: "Challenge",
	sociability: "Sociability",
	playValue: "Play Value (construct total)",
	usability: "Usability (construct total)"
};

const generated = [
	OPEN,
	"",
	"### Surfaces & text (semantic roles)",
	"",
	row(["Role", "Token / utility", "Light (standard)", "Dark (standard)"]),
	row(["---", "---", "---", "---"]),
	...SURFACES.map(([role, token, key]) => row([role, token, `\`${light[key]}\``, `\`${dark[key]}\``])),
	"",
	"Text contrast in the standard palettes, against the surface each role sits on:",
	"",
	row(["Role", "Light", "Dark"]),
	row(["---", "---", "---"]),
	...["textPrimary", "textSecondary", "textMuted"].map(key =>
		row([
			`\`--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}\``,
			`${ratio(light[key], light.surface).toFixed(2)}:1`,
			`${ratio(dark[key], dark.surface).toFixed(2)}:1`
		])
	),
	"",
	"### Accents",
	"",
	row(["Accent", "Token", "Light", "Dark", "Use"]),
	row(["---", "---", "---", "---", "---"]),
	...ACCENTS.map(([name, token, key, use]) => row([name, token, `\`${light[key]}\``, `\`${dark[key]}\``, use])),
	"",
	"### Categorical colour (audit report bars)",
	"",
	"All six render side by side in one chart, so they carry two requirements at once:",
	"each readable on the report's white page, and no two collapsing into each other for a",
	"colour-blind reader. Both floors are asserted in `tests/unit/design-tokens.test.ts`.",
	"",
	row(["Bar", "Value", "On white"]),
	row(["---", "---", "---"]),
	...BAR_ORDER.map(key => row([BAR_LABELS[key], `\`${BARS[key]}\``, `${ratio(BARS[key], "#FFFFFF").toFixed(2)}:1`])),
	"",
	CLOSE
].join("\n");

const current = readFileSync(target, "utf8");
const start = current.indexOf(OPEN);
const end = current.indexOf(CLOSE);
if (start === -1 || end === -1) {
	console.error(`brand-kit - markers ${OPEN} / ${CLOSE} not found in ${target}`);
	process.exit(1);
}

const next = current.slice(0, start) + generated + current.slice(end + CLOSE.length);

if (process.argv.includes("--check")) {
	if (next !== current) {
		console.error("docs:check - docs/brand-kit.md colour tables are stale. Run `pnpm docs:build`.");
		process.exit(1);
	}
	console.log("docs:check - docs/brand-kit.md colour tables are up to date.");
} else {
	writeFileSync(target, next);
	console.log(`brand-kit - regenerated the colour tables in ${target}`);
}
