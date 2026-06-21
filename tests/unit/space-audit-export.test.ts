import assert from "node:assert/strict";
import test from "node:test";

import { buildSpaceAuditRows } from "@/lib/export/audit/row-builders";
import type { ExportableAudit, PlayspaceInstrument } from "@/lib/export/audit/types";

/**
 * Minimal instrument carrying both a `space_setup` block (which the Space Audit
 * table renders) and an `audit_info` question (which it must skip). Only the
 * fields read by `buildSpaceAuditRows` are populated.
 */
const INSTRUMENT = {
	pre_audit_questions: [
		{
			key: "place_size",
			label: "Approximate size of the playspace",
			input_type: "single_select",
			required: true,
			page_key: "space_setup",
			options: [
				{ key: "small", label: "Small (under 500 m²)" },
				{ key: "large", label: "Large (over 2000 m²)" }
			]
		},
		{
			key: "weather_conditions",
			label: "Weather during the audit",
			input_type: "multi_select",
			required: false,
			page_key: "space_setup",
			options: [
				{ key: "sun", label: "Sunny" },
				{ key: "rain", label: "Rain" }
			]
		},
		{
			key: "wind_conditions",
			label: "Wind during the audit",
			input_type: "single_select",
			required: false,
			page_key: "space_setup",
			options: []
		},
		{
			key: "auditor_code",
			label: "Auditor code",
			input_type: "single_select",
			required: true,
			page_key: "audit_info",
			options: []
		}
	]
} as unknown as PlayspaceInstrument;

function makeExportableAudit(preAudit: Record<string, unknown>): ExportableAudit {
	return {
		auditSession: { pre_audit: preAudit },
		context: null,
		auditorProfile: null
	} as unknown as ExportableAudit;
}

test("buildSpaceAuditRows resolves option labels and skips audit_info questions", () => {
	const rows = buildSpaceAuditRows(
		makeExportableAudit({
			place_size: "large",
			weather_conditions: ["sun", "rain"],
			wind_conditions: "Breezy"
		}),
		INSTRUMENT
	);

	// audit_info question is excluded; the three space_setup questions remain in order.
	assert.deepEqual(rows, [
		["Approximate size of the playspace", "Large (over 2000 m²)"],
		["Weather during the audit", "Sunny | Rain"],
		// No options on the question → raw recorded value passes through unchanged.
		["Wind during the audit", "Breezy"]
	]);
});

test("buildSpaceAuditRows renders blank answers for unrecorded fields", () => {
	const rows = buildSpaceAuditRows(
		makeExportableAudit({
			place_size: null,
			weather_conditions: [],
			wind_conditions: null
		}),
		INSTRUMENT
	);

	assert.deepEqual(rows, [
		["Approximate size of the playspace", ""],
		["Weather during the audit", ""],
		["Wind during the audit", ""]
	]);
});

test("buildSpaceAuditRows returns no rows when the instrument has no space_setup questions", () => {
	const instrumentWithoutSpace = {
		pre_audit_questions: [
			{
				key: "auditor_code",
				label: "Auditor code",
				input_type: "single_select",
				required: true,
				page_key: "audit_info",
				options: []
			}
		]
	} as unknown as PlayspaceInstrument;

	const rows = buildSpaceAuditRows(makeExportableAudit({}), instrumentWithoutSpace);
	assert.equal(rows.length, 0);
});
