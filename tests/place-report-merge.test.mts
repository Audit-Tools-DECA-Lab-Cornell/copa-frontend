import test from "node:test";
import assert from "node:assert/strict";

import { mergeAuditSessions } from "@/components/dashboard/place-report-merge";
import type { AuditSession, ExecutionMode, ScoreTotals } from "@/lib/api/playspace-types";

/**
 * Build one reusable score total object for the synthetic merge tests.
 */
function createScoreTotals(seed: number): ScoreTotals {
	return {
		provision_total: seed + 1,
		provision_total_max: seed + 11,
		variety_total: seed + 2,
		variety_total_max: seed + 12,
		challenge_total: seed + 3,
		challenge_total_max: seed + 13,
		sociability_total: seed + 4,
		sociability_total_max: seed + 14,
		play_value_total: seed + 5,
		play_value_total_max: seed + 15,
		usability_total: seed + 6,
		usability_total_max: seed + 16
	};
}

/**
 * Create a minimal submitted session for merge testing.
 */
function createSession(mode: ExecutionMode, id: string, scoreSeed: number): AuditSession {
	const scoreTotals = createScoreTotals(scoreSeed);
	const zeroTotals = createScoreTotals(scoreSeed + 100);
	const maxTotals = createScoreTotals(scoreSeed + 200);

	return {
		audit_id: id,
		audit_code: `FIELDTESTS-${id}`,
		auditor_code: `AUD-${id}`,
		project_id: "11111111-1111-1111-1111-111111111111",
		project_name: "Project",
		place_id: "22222222-2222-2222-2222-222222222222",
		place_name: "Place",
		place_type: null,
		allowed_execution_modes: ["audit", "survey", "both"],
		selected_execution_mode: mode,
		status: "SUBMITTED",
		instrument_key: "pvua",
		instrument_version: "1.0.0",
		schema_version: 1,
		revision: 0,
		aggregate: {
			schema_version: 1,
			revision: 0,
			meta: {
				execution_mode: mode,
				final_comments: null
			},
			pre_audit: {
				place_size: null,
				current_users_0_5: null,
				current_users_6_12: null,
				current_users_13_17: null,
				current_users_18_plus: null,
				playspace_busyness: null,
				season: null,
				weather_conditions: [],
				wind_conditions: null
			},
			sections: {
				[`${mode}-section`]: {
					section_key: `${mode}-section`,
					responses: {},
					note: null
				}
			}
		},
		started_at: "2026-05-01T12:00:00.000Z",
		submitted_at: "2026-05-02T12:00:00.000Z",
		total_minutes: 30,
		meta: {
			execution_mode: mode,
			final_comments: null
		},
		pre_audit: {
			place_size: null,
			current_users_0_5: null,
			current_users_6_12: null,
			current_users_13_17: null,
			current_users_18_plus: null,
			playspace_busyness: null,
			season: null,
			weather_conditions: [],
			wind_conditions: null
		},
		sections: {
			[`${mode}-section`]: {
				section_key: `${mode}-section`,
				responses: {},
				note: null
			}
		},
		scores: {
			draft_progress_percent: null,
			execution_mode: mode,
			audit: mode === "audit" ? scoreTotals : null,
			survey: mode === "survey" ? scoreTotals : null,
			overall: scoreTotals,
			by_section: {
				[`${mode}-section`]: scoreTotals
			},
			by_domain: {
				[`${mode}-domain`]: scoreTotals
			},
			unsure_answer_count: 1,
			unsure_variants: {
				unsure_as_zero: {
					execution_mode: mode,
					audit: mode === "audit" ? zeroTotals : null,
					survey: mode === "survey" ? zeroTotals : null,
					overall: zeroTotals,
					by_section: {
						[`${mode}-section`]: zeroTotals
					},
					by_domain: {
						[`${mode}-domain`]: zeroTotals
					}
				},
				unsure_as_max: {
					execution_mode: mode,
					audit: mode === "audit" ? maxTotals : null,
					survey: mode === "survey" ? maxTotals : null,
					overall: maxTotals,
					by_section: {
						[`${mode}-section`]: maxTotals
					},
					by_domain: {
						[`${mode}-domain`]: maxTotals
					}
				}
			}
		},
		progress: {
			required_pre_audit_complete: true,
			visible_section_count: 1,
			completed_section_count: 1,
			total_visible_questions: 10,
			answered_visible_questions: 10,
			ready_to_submit: true,
			sections: []
		}
	};
}

test("mergeAuditSessions keeps both audit and survey score partitions for combined reports", () => {
	const auditSession = createSession("audit", "audit-source", 10);
	const surveySession = createSession("survey", "survey-source", 40);

	const mergedSession = mergeAuditSessions(auditSession, surveySession);

	assert.deepEqual(mergedSession.scores.audit, auditSession.scores.audit);
	assert.deepEqual(mergedSession.scores.survey, surveySession.scores.survey);
	assert.equal(mergedSession.scores.execution_mode, "both");
	assert.ok(mergedSession.scores.overall !== null);
	assert.deepEqual(Object.keys(mergedSession.sections).sort(), ["audit-section", "survey-section"]);
});

test("mergeAuditSessions merges unsure variant buckets for combined reports", () => {
	const auditSession = createSession("audit", "audit-source", 10);
	const surveySession = createSession("survey", "survey-source", 40);

	const mergedSession = mergeAuditSessions(auditSession, surveySession);

	assert.equal(mergedSession.scores.unsure_answer_count, 2);
	assert.ok(mergedSession.scores.unsure_variants?.unsure_as_zero?.overall !== null);
	assert.ok(mergedSession.scores.unsure_variants?.unsure_as_max?.overall !== null);
	assert.equal(mergedSession.scores.unsure_variants?.unsure_as_zero?.overall?.play_value_total, 260);
	assert.equal(mergedSession.scores.unsure_variants?.unsure_as_max?.overall?.play_value_total, 460);
});
