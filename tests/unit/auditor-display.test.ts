import assert from "node:assert/strict";
import test from "node:test";

import {
	buildAuditorNameLookup,
	getAuditorCodeSubtitle,
	getAuditorTableLabel
} from "@/components/dashboard/auditor-display";

/**
 * The table lookup should only retain usable names so manager pages can
 * enrich already-fetched audit rows without extra API requests.
 */
test("buildAuditorNameLookup stores non-empty names by auditor code", () => {
	const lookup = buildAuditorNameLookup([
		{ auditorCode: "AKL-01", fullName: "Ariana Ngata" },
		{ auditorCode: "AKL-02", fullName: "  " },
		{ auditorCode: "AKL-03", fullName: null }
	]);

	assert.equal(lookup.get("AKL-01"), "Ariana Ngata");
	assert.equal(lookup.has("AKL-02"), false);
	assert.equal(lookup.has("AKL-03"), false);
});

/**
 * Manager tables should prefer the resolved display name while all other
 * views continue to fall back to the existing auditor code.
 */
test("getAuditorTableLabel prefers the display name when available", () => {
	assert.equal(getAuditorTableLabel("AKL-01", "Ariana Ngata"), "Ariana Ngata");
	assert.equal(getAuditorTableLabel("AKL-01", "   "), "AKL-01");
	assert.equal(getAuditorTableLabel("AKL-01", null), "AKL-01");
});

/**
 * When the manager tables show a full name, they should still retain the code
 * as supporting context. Code-only views should not duplicate the same value.
 */
test("getAuditorCodeSubtitle only returns code when a display name exists", () => {
	assert.equal(getAuditorCodeSubtitle("AKL-01", "Ariana Ngata"), "AKL-01");
	assert.equal(getAuditorCodeSubtitle("AKL-01", "   "), null);
	assert.equal(getAuditorCodeSubtitle("AKL-01", null), null);
});
