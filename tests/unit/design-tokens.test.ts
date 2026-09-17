import assert from "node:assert/strict";
import test from "node:test";

import { SCALE_ACCENT_COLORS } from "@/lib/audit/scale-colors";
import { DESIGN_SYSTEM, getDesignSystemCssVariables } from "@/lib/design-system";

import baseline from "../fixtures/design-tokens-baseline.json" with { type: "json" };

const THEMES = ["light", "dark"] as const;
const CONTRASTS = ["standard", "high"] as const;

/**
 * Phase 1 of the colour migration moved every palette value into
 * `brand/tokens.json` and generates `design-system.generated.ts` from it.
 *
 * This test is what makes that refactor provable rather than hopeful: the
 * generated tokens must resolve to exactly the values the hand-written palettes
 * produced before the move. It is expected - and required - to fail when the
 * palette itself changes; update the fixture in the same commit as the tokens.
 */
test("generated palettes match the frozen pre-migration values", () => {
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
