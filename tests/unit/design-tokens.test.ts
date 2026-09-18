import assert from "node:assert/strict";
import test from "node:test";

import { REPORT_SOURCE_STYLES } from "@/lib/audit/report-source-sessions";
import { CONSTRUCT_ACCENT_COLORS, SCALE_ACCENT_COLORS, withAlpha } from "@/lib/audit/scale-colors";
import { DESIGN_SYSTEM, getDesignSystemCssVariables } from "@/lib/design-system";
import {
	GENERATED_FEEDBACK_COLORS,
	GENERATED_MAP_PLACEHOLDER_COLORS,
	GENERATED_REPORT_SOURCE_COLORS
} from "@/lib/design-system.generated";

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

/**
 * Phase 2 moved colour literals that were scattered across components into
 * `brand/tokens.json`. Like phase 1, it is meant to be a no-op: the tokens must
 * still resolve to exactly the values those components hard-coded, so the only
 * thing that changed is where the value lives.
 *
 * The literals below are transcribed from the pre-phase-2 source. They are
 * expected to change in phase 3 - deliberately, in the same commit as the tokens.
 */
test("phase 2 tokens preserve the literals they replaced", () => {
	assert.deepEqual(CONSTRUCT_ACCENT_COLORS, { playValue: "#2E7D78", usability: "#C7972F" });

	assert.deepEqual(GENERATED_FEEDBACK_COLORS, {
		progressSuccess: "#00a85a",
		progressSuccessHover: "#008f4c",
		progressSuccessStrong: "#007a40",
		progressWarning: "#b45309"
	});

	assert.deepEqual(GENERATED_REPORT_SOURCE_COLORS, { auditTint: "#FEF3C7", surveyTint: "#DBEAFE" });

	assert.deepEqual(GENERATED_MAP_PLACEHOLDER_COLORS, {
		surface: "#f8fafc",
		panel: "#eef2ff",
		panelBorder: "#c7d2fe",
		title: "#3730a3",
		body: "#475569"
	});
});

/** The PDF export fills source rows from these, so the tuples must not shift. */
test("report source rgb tuples still match the literals the PDF export used", () => {
	assert.deepEqual([...REPORT_SOURCE_STYLES.audit.rgb], [254, 243, 199]);
	assert.deepEqual([...REPORT_SOURCE_STYLES.survey.rgb], [219, 234, 254]);
});

/**
 * Translucent fills derive from the same token as their solid counterpart.
 * These are the exact strings the components used to inline; a change here is a
 * rendered change, not a refactor.
 */
test("withAlpha reproduces the inlined rgba strings", () => {
	const success = GENERATED_FEEDBACK_COLORS.progressSuccess;
	assert.equal(withAlpha(success, 0.07), "rgba(0, 168, 90, 0.07)");
	assert.equal(withAlpha(success, 0.1), "rgba(0, 168, 90, 0.1)");
	assert.equal(withAlpha(success, 0.12), "rgba(0, 168, 90, 0.12)");
	assert.equal(withAlpha(success, 0.25), "rgba(0, 168, 90, 0.25)");
	assert.equal(withAlpha(success, 0.28), "rgba(0, 168, 90, 0.28)");
	assert.equal(withAlpha(GENERATED_FEEDBACK_COLORS.progressWarning, 0.12), "rgba(180, 83, 9, 0.12)");
});
