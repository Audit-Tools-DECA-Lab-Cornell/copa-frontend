import assert from "node:assert/strict";
import test from "node:test";

import { REPORT_SOURCE_STYLES } from "@/lib/audit/report-source-sessions";
import { CONSTRUCT_ACCENT_COLORS, SCALE_ACCENT_COLORS, withAlpha } from "@/lib/audit/scale-colors";
import { DESIGN_SYSTEM, getDesignSystemCssVariables } from "@/lib/design-system";
import {
	GENERATED_FEEDBACK_COLORS,
	GENERATED_LANDING_COLORS,
	GENERATED_MAP_PLACEHOLDER_COLORS,
	GENERATED_REPORT_SOURCE_COLORS
} from "@/lib/design-system.generated";

import baseline from "../fixtures/design-tokens-baseline.json" with { type: "json" };

const THEMES = ["light", "dark"] as const;
const CONTRASTS = ["standard", "high"] as const;

/**
 * The fixture is a drift guard: the generated tokens must resolve to exactly the
 * values the palette shipped with. It is expected - and required - to fail when the
 * palette changes on purpose; regenerate it with `node scripts/build-token-baseline.mjs`
 * in the same commit as the token change.
 */
test("generated palettes match the committed baseline", () => {
	for (const theme of THEMES) {
		for (const contrast of CONTRASTS) {
			assert.deepEqual(
				DESIGN_SYSTEM.palettes[theme][contrast],
				baseline.palettes[theme][contrast],
				`palette drift in ${theme}/${contrast}`
			);
		}
	}
});

/** Every mode must carry the full token set - a generator that drops a key is a silent theme break. */
test("every palette mode defines the same token set", () => {
	const expected = Object.keys(baseline.palettes.light.standard).sort();
	assert.ok(expected.length > 0, "fixture must define tokens");

	for (const theme of THEMES) {
		for (const contrast of CONTRASTS) {
			assert.deepEqual(
				Object.keys(DESIGN_SYSTEM.palettes[theme][contrast]).sort(),
				expected,
				`${theme}/${contrast} does not carry the full token set`
			);
		}
	}
});

/** PV scale accents are shared with copa-mobile and must resolve through the token file. */
test("scale accents resolve from the generated tokens", () => {
	assert.deepEqual(SCALE_ACCENT_COLORS, baseline.scaleAccents);
});

/** The CSS custom properties are what the browser actually paints. */
test("css custom properties resolve for every mode without holes", () => {
	for (const theme of THEMES) {
		for (const contrast of CONTRASTS) {
			const variables = getDesignSystemCssVariables({ theme, contrast });
			const empty = Object.entries(variables).filter(([, value]) => !value);
			assert.deepEqual(empty, [], `${theme}/${contrast} produced empty custom properties`);
			assert.equal(variables["--background"], baseline.palettes[theme][contrast].canvas);
			assert.equal(variables["--foreground"], baseline.palettes[theme][contrast].textPrimary);
		}
	}
});

/**
 * Phases 1-2 froze the pre-migration literals to prove the token pipeline was a
 * no-op refactor. Phase 3 changed them all on purpose, so transcribing the new
 * values here would only assert that the generator agrees with itself.
 *
 * What is worth pinning is the intent behind the phase-3 values, which no
 * accidental edit can satisfy: they were chosen so the palette clears WCAG AA.
 * These are the checks the palette was built against.
 */
const CONTRAST_FLOOR = 4.5;
/** WCAG 1.4.11: interactive component boundaries need 3:1, not 4.5:1. */
const NON_TEXT_FLOOR = 3;

function relativeLuminance(hex: string): number {
	const channels = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
	const [red, green, blue] = channels.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2.x contrast ratio. Both arguments must be opaque `#rrggbb`. */
function contrastRatio(a: string, b: string): number {
	const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
	return (high + 0.05) / (low + 0.05);
}

test("every palette clears AA for text on each of its own surfaces", () => {
	for (const theme of THEMES) {
		for (const contrast of CONTRASTS) {
			const palette = DESIGN_SYSTEM.palettes[theme][contrast];
			for (const text of ["textPrimary", "textSecondary", "textMuted"] as const) {
				for (const surface of ["canvas", "surface", "surfaceRaised", "surfaceSunken"] as const) {
					const ratio = contrastRatio(palette[text], palette[surface]);
					assert.ok(
						ratio >= CONTRAST_FLOOR,
						`${theme}/${contrast}: ${text} on ${surface} is ${ratio.toFixed(2)}:1, below ${CONTRAST_FLOOR}:1`
					);
				}
			}
		}
	}
});

test("status and accent colours stay readable on the surfaces they sit on", () => {
	const foregrounds = [
		"statusSuccess",
		"statusWarning",
		"statusDanger",
		"statusPending",
		"statusInProgress",
		"accentTerracotta",
		"accentMoss",
		"accentSlate",
		"accentViolet",
		"focus"
	] as const;

	for (const theme of THEMES) {
		for (const contrast of CONTRASTS) {
			const palette = DESIGN_SYSTEM.palettes[theme][contrast];
			for (const token of foregrounds) {
				for (const surface of ["canvas", "surface", "surfaceSunken"] as const) {
					const ratio = contrastRatio(palette[token], palette[surface]);
					assert.ok(
						ratio >= CONTRAST_FLOOR,
						`${theme}/${contrast}: ${token} on ${surface} is ${ratio.toFixed(2)}:1, below ${CONTRAST_FLOOR}:1`
					);
				}
			}
			const inputBorder = contrastRatio(palette.inputBorder, palette.surface);
			assert.ok(
				inputBorder >= NON_TEXT_FLOOR,
				`${theme}/${contrast}: inputBorder on surface is ${inputBorder.toFixed(2)}:1, below ${NON_TEXT_FLOOR}:1`
			);
		}
	}
});

test("filled blocks carry a legible label", () => {
	const pairs = [
		["solidPrimaryText", "solidPrimary"],
		["solidNeutralText", "solidNeutral"],
		["solidDangerText", "solidDanger"],
		["solidDraftText", "solidDraft"],
		["solidOrphanText", "solidOrphan"],
		["primaryForeground", "accentTerracotta"]
	] as const;

	for (const theme of THEMES) {
		for (const contrast of CONTRASTS) {
			const palette = DESIGN_SYSTEM.palettes[theme][contrast];
			for (const [text, fill] of pairs) {
				const ratio = contrastRatio(palette[text], palette[fill]);
				assert.ok(
					ratio >= CONTRAST_FLOOR,
					`${theme}/${contrast}: ${text} on ${fill} is ${ratio.toFixed(2)}:1, below ${CONTRAST_FLOOR}:1`
				);
			}
		}
	}
});

/**
 * All six render as bars in one chart in the audit report, so they carry two
 * requirements at once: each must be readable against the report's white page,
 * and no two may collapse into each other for a colour-blind reader. The bars are
 * labelled and in a fixed order, so colour is redundant encoding - but the
 * pre-migration palette put two oranges side by side, and this stops that
 * returning. Separation is measured in the deuteranope and protanope simulations
 * because that is where the pre-migration set failed, not in normal vision.
 */
test("the six audit bars stay readable and mutually distinguishable", () => {
	const bars = { ...SCALE_ACCENT_COLORS, ...CONSTRUCT_ACCENT_COLORS };

	for (const [name, colour] of Object.entries(bars)) {
		const ratio = contrastRatio(colour, "#FFFFFF");
		assert.ok(ratio >= CONTRAST_FLOOR, `bar ${name} is ${ratio.toFixed(2)}:1 on white, below ${CONTRAST_FLOOR}:1`);
	}

	/** Brettel/Vienot-style dichromat simulation in linear RGB. */
	const simulate = (hex: string, deuteranope: boolean): readonly number[] => {
		const channels = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
		const [red, green, blue] = channels.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
		let long = 17.8824 * red + 43.5161 * green + 4.11935 * blue;
		let medium = 3.45565 * red + 27.1554 * green + 3.86714 * blue;
		const short = 0.0299566 * red + 0.184309 * green + 1.46709 * blue;
		if (deuteranope) medium = 0.494207 * long + 1.24827 * short;
		else long = 2.02344 * medium - 2.52581 * short;
		return [
			0.0809444479 * long - 0.130504409 * medium + 0.116721066 * short,
			-0.0102485335 * long + 0.0540193266 * medium - 0.113614708 * short,
			-0.000365296938 * long - 0.00412161469 * medium + 0.693511405 * short
		].map(v => {
			const clamped = Math.min(1, Math.max(0, v));
			return 255 * (clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055);
		});
	};

	// The pre-migration set put variety (#D2691E) next to challenge (#B45309); both
	// simulate to the same olive, 34.5 apart. The phase-3 set must not go below that.
	const SEPARATION_FLOOR = 34.5;
	for (const deuteranope of [true, false]) {
		const simulated = Object.fromEntries(
			Object.entries(bars).map(([name, colour]) => [name, simulate(colour, deuteranope)])
		);
		const names = Object.keys(simulated);
		for (let i = 0; i < names.length; i++) {
			for (let j = i + 1; j < names.length; j++) {
				const [a, b] = [simulated[names[i]], simulated[names[j]]];
				const separation = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
				assert.ok(
					separation >= SEPARATION_FLOOR,
					`${names[i]} and ${names[j]} are ${separation.toFixed(1)} apart for a ` +
						`${deuteranope ? "deuteranope" : "protanope"} reader, below ${SEPARATION_FLOOR}`
				);
			}
		}
	}
});

/** The accents are shared with copa-mobile, so a change here changes both clients. */
test("chart accents resolve to the committed values", () => {
	assert.deepEqual(CONSTRUCT_ACCENT_COLORS, baseline.constructAccents);
	assert.deepEqual({ theme: DESIGN_SYSTEM.defaultTheme, contrast: DESIGN_SYSTEM.defaultContrast }, baseline.defaults);
});

/** Auxiliary groups still resolve through the token file rather than a stray literal. */
test("phase 2 groups still resolve from the tokens", () => {
	for (const group of [
		GENERATED_FEEDBACK_COLORS,
		GENERATED_REPORT_SOURCE_COLORS,
		GENERATED_LANDING_COLORS,
		GENERATED_MAP_PLACEHOLDER_COLORS
	]) {
		for (const [key, value] of Object.entries(group)) {
			assert.ok(value, `${key} resolved empty`);
		}
	}
});

/**
 * The PDF export fills source rows from the tuple, not the hex, so a tuple that
 * stops tracking its token would keep printing the old tint with nothing to show
 * for it on screen. Derived rather than transcribed, so this survives a recolour.
 */
test("report source rgb tuples track their tokens", () => {
	const channels = (hex: string) => [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));

	assert.deepEqual([...REPORT_SOURCE_STYLES.audit.rgb], channels(GENERATED_REPORT_SOURCE_COLORS.auditTint));
	assert.deepEqual([...REPORT_SOURCE_STYLES.survey.rgb], channels(GENERATED_REPORT_SOURCE_COLORS.surveyTint));
	assert.equal(REPORT_SOURCE_STYLES.audit.hex, GENERATED_REPORT_SOURCE_COLORS.auditTint);
	assert.equal(REPORT_SOURCE_STYLES.survey.hex, GENERATED_REPORT_SOURCE_COLORS.surveyTint);
});

/**
 * Translucent fills derive from the same token as their solid counterpart, so a
 * tint can never drift away from the colour it is meant to be a tint of.
 */
test("withAlpha tints the token it is given", () => {
	const success = GENERATED_FEEDBACK_COLORS.progressSuccess;
	const [red, green, blue] = [1, 3, 5].map(offset => Number.parseInt(success.slice(offset, offset + 2), 16));

	for (const alpha of [0.07, 0.1, 0.12, 0.25, 0.28]) {
		assert.equal(withAlpha(success, alpha), `rgba(${red}, ${green}, ${blue}, ${alpha})`);
	}

	const warning = GENERATED_FEEDBACK_COLORS.progressWarning;
	const warningChannels = [1, 3, 5].map(offset => Number.parseInt(warning.slice(offset, offset + 2), 16));
	assert.equal(withAlpha(warning, 0.12), `rgba(${warningChannels.join(", ")}, 0.12)`);
});

/**
 * The landing tints live inside Tailwind arbitrary-value class strings, which
 * cannot take a JS constant - they reference `var(--landing-*)`. If those custom
 * properties stop being emitted the classes silently resolve to nothing, so the
 * wash and hero shadows would just disappear with no error anywhere.
 */
test("landing custom properties are emitted for every mode", () => {
	for (const theme of THEMES) {
		for (const contrast of CONTRASTS) {
			const variables = getDesignSystemCssVariables({ theme, contrast });
			assert.equal(variables["--landing-texture-warm"], GENERATED_LANDING_COLORS.textureWarm);
			assert.equal(variables["--landing-texture-cool"], GENERATED_LANDING_COLORS.textureCool);
			assert.equal(variables["--landing-hero-shadow-soft"], GENERATED_LANDING_COLORS.heroShadowSoft);
			assert.equal(variables["--landing-hero-shadow-deep"], GENERATED_LANDING_COLORS.heroShadowDeep);
		}
	}
});
