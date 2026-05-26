import { expect, test } from "@playwright/test";

import { mergeAuditSessions } from "@/components/dashboard/place-report-merge";
import { buildDomainReportRows } from "@/lib/audit/report-helpers";
import { buildOverviewRows } from "@/lib/export/audit/row-builders";
import { buildSingleAuditResponseRows } from "@/lib/export/audit/row-builders";
import { auditSessionSchema, playspaceInstrumentSchema } from "@/lib/api/playspace-types";

const PROJECT_ID = "11111111-1111-4111-8111-111111111110";
const PLACE_ID = "22222222-2222-4222-8222-222222222220";

function buildInstrument() {
	return playspaceInstrumentSchema.parse({
		instrument_key: "pvua-v-test",
		instrument_name: "PVUA",
		instrument_version: "5.2",
		current_sheet: "sheet-1",
		source_files: ["instrument.json"],
		preamble: [],
		execution_modes: [
			{ key: "audit", label: "Place Audit" },
			{ key: "survey", label: "Place Survey" },
			{ key: "both", label: "Full Assessment" }
		],
		pre_audit_questions: [],
		scale_guidance: [],
		sections: [
			{
				section_key: "section_play",
				title: "Play",
				description: "Play section",
				instruction: "Answer the questions",
				notes_prompt: "Add notes",
				questions: [
					{
						question_key: "q_1_1",
						mode: "both",
						constructs: ["play_value"],
						domains: ["movement"],
						section_key: "section_play",
						prompt: "Shared prompt",
						question_type: "scaled",
						scales: [
							{
								key: "provision",
								title: "Provision",
								prompt: "Provision",
								options: [
									{
										key: "audit_answer",
										label: "Audit answer",
										addition_value: 1,
										boost_value: 1,
										allows_follow_up_scales: false,
										is_not_applicable: false
									},
									{
										key: "survey_answer",
										label: "Survey answer",
										addition_value: 2,
										boost_value: 1,
										allows_follow_up_scales: false,
										is_not_applicable: false
									}
								]
							}
						],
						options: [],
						required: true,
						display_if: null,
						notes_prompt: null
					},
					{
						question_key: "q_1_1_1",
						mode: "both",
						constructs: [],
						domains: [],
						section_key: "section_play",
						prompt: "Checklist follow-up prompt",
						question_type: "checklist",
						scales: [],
						options: [
							{
								key: "swing",
								label: "Swing"
							},
							{
								key: "slide",
								label: "Slide"
							},
							{
								key: "other",
								label: "Other"
							}
						],
						required: false,
						display_if: {
							question_key: "q_1_1",
							response_key: "provision",
							any_of_option_keys: ["audit_answer", "survey_answer"]
						},
						notes_prompt: null
					},
					{
						question_key: "q_1_2",
						mode: "audit",
						constructs: ["play_value"],
						domains: ["movement"],
						section_key: "section_play",
						prompt: "Audit-only prompt",
						question_type: "scaled",
						scales: [
							{
								key: "provision",
								title: "Provision",
								prompt: "Provision",
								options: [
									{
										key: "audit_answer",
										label: "Audit answer",
										addition_value: 1,
										boost_value: 1,
										allows_follow_up_scales: false,
										is_not_applicable: false
									}
								]
							}
						],
						options: [],
						required: true,
						display_if: null,
						notes_prompt: null
					},
					{
						question_key: "q_1_3",
						mode: "survey",
						constructs: ["usability"],
						domains: ["movement"],
						section_key: "section_play",
						prompt: "Survey-only prompt",
						question_type: "scaled",
						scales: [
							{
								key: "provision",
								title: "Provision",
								prompt: "Provision",
								options: [
									{
										key: "survey_answer",
										label: "Survey answer",
										addition_value: 2,
										boost_value: 1,
										allows_follow_up_scales: false,
										is_not_applicable: false
									}
								]
							}
						],
						options: [],
						required: true,
						display_if: null,
						notes_prompt: null
					}
				]
			}
		],
		legal_documents: []
	});
}

function buildScoreTotals(playValueTotal: number, usabilityTotal: number) {
	return {
		provision_total: playValueTotal + usabilityTotal,
		provision_total_max: playValueTotal + usabilityTotal,
		diversity_total: 0,
		diversity_total_max: 0,
		challenge_total: 0,
		challenge_total_max: 0,
		sociability_total: 0,
		sociability_total_max: 0,
		play_value_total: playValueTotal,
		play_value_total_max: playValueTotal,
		usability_total: usabilityTotal,
		usability_total_max: usabilityTotal
	};
}

function buildAuditSession(options: {
	auditId: string;
	auditCode: string;
	executionMode: "audit" | "survey" | "both";
	sharedAnswer: "audit_answer" | "survey_answer";
	includeAuditOnly: boolean;
	includeSurveyOnly: boolean;
}) {
	const responses: Record<string, Record<string, string | string[] | Record<string, string>>> = {
		q_1_1: { provision: options.sharedAnswer },
		q_1_1_1: { selected_option_keys: ["swing", "slide"] }
	};

	if (options.includeAuditOnly) {
		responses.q_1_2 = { provision: "audit_answer" };
	}

	if (options.includeSurveyOnly) {
		responses.q_1_3 = { provision: "survey_answer" };
	}

	const playValueTotal = (options.sharedAnswer === "survey_answer" ? 2 : 1) + (options.includeAuditOnly ? 1 : 0);
	const usabilityTotal = options.includeSurveyOnly ? 2 : 0;
	const totals = buildScoreTotals(playValueTotal, usabilityTotal);

	return auditSessionSchema.parse({
		audit_id: options.auditId,
		audit_code: options.auditCode,
		auditor_code: `${options.auditCode}-AUDITOR`,
		project_id: PROJECT_ID,
		project_name: "Project Alpha",
		place_id: PLACE_ID,
		place_name: "Place One",
		place_type: "Public Playspace",
		allowed_execution_modes: ["audit", "survey", "both"],
		selected_execution_mode: options.executionMode,
		status: "SUBMITTED",
		instrument_key: "pvua-v-test",
		instrument_version: "5.2",
		schema_version: 1,
		revision: 1,
		started_at: "2026-05-20T12:00:00.000Z",
		submitted_at: "2026-05-20T12:30:00.000Z",
		total_minutes: 30,
		meta: { execution_mode: options.executionMode },
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
			section_play: {
				section_key: "section_play",
				responses,
				note: `${options.executionMode} note`
			}
		},
		aggregate: {
			schema_version: 1,
			revision: 1,
			meta: { execution_mode: options.executionMode },
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
				section_play: {
					section_key: "section_play",
					responses,
					note: `${options.executionMode} note`
				}
			}
		},
		scores: {
			draft_progress_percent: 100,
			execution_mode: options.executionMode,
			audit: options.executionMode === "audit" ? totals : null,
			survey: options.executionMode === "survey" ? totals : null,
			overall: totals,
			by_section: { section_play: totals },
			by_domain: { movement: totals }
		},
		progress: {
			required_pre_audit_complete: true,
			visible_section_count: 1,
			completed_section_count: 1,
			total_visible_questions: Object.keys(responses).length,
			answered_visible_questions: Object.keys(responses).length,
			ready_to_submit: true,
			sections: [
				{
					section_key: "section_play",
					title: "Play",
					visible_question_count: Object.keys(responses).length,
					answered_question_count: Object.keys(responses).length,
					is_complete: true
				}
			]
		}
	});
}

test.describe("Combined report export", () => {
	test("keeps both source answers for shared combined-report questions", () => {
		const instrument = buildInstrument();
		const auditSession = buildAuditSession({
			auditId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
			auditCode: "AUDIT-101",
			executionMode: "audit",
			sharedAnswer: "audit_answer",
			includeAuditOnly: true,
			includeSurveyOnly: false
		});
		const surveySession = buildAuditSession({
			auditId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02",
			auditCode: "SURVEY-102",
			executionMode: "survey",
			sharedAnswer: "survey_answer",
			includeAuditOnly: false,
			includeSurveyOnly: true
		});

		const combinedSession = mergeAuditSessions(auditSession, surveySession);
		const domainRows = buildDomainReportRows(combinedSession, instrument);
		const movementDomain = domainRows.find(row => row.domainKey === "movement");

		expect(movementDomain).toBeDefined();
		const sharedQuestionRows = movementDomain?.questions.filter(question => question.questionKey === "q_1_1") ?? [];
		expect(sharedQuestionRows).toHaveLength(2);
		expect(sharedQuestionRows.map(question => question.provisionLabel).sort()).toEqual(
			["Audit answer", "Survey answer"].sort()
		);
	});

	test("inherits the parent domain for checklist follow-up rows without explicit domains", () => {
		const instrument = buildInstrument();
		const fullAssessmentSession = buildAuditSession({
			auditId: "12121212-1212-4121-8121-121212121212",
			auditCode: "FULL-204",
			executionMode: "both",
			sharedAnswer: "survey_answer",
			includeAuditOnly: true,
			includeSurveyOnly: true
		});

		const domainRows = buildDomainReportRows(fullAssessmentSession, instrument);
		const movementDomain = domainRows.find(row => row.domainKey === "movement");

		expect(movementDomain).toBeDefined();
		const checklistQuestion = movementDomain?.questions.find(question => question.questionKey === "q_1_1_1");
		expect(checklistQuestion).toBeDefined();
		expect(checklistQuestion?.checklistAnswerLabel).toBe("Swing | Slide");
	});

	test("adds combined-source context to export rows while leaving full assessments plain", () => {
		const instrument = buildInstrument();
		const auditSession = buildAuditSession({
			auditId: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
			auditCode: "AUDIT-201",
			executionMode: "audit",
			sharedAnswer: "audit_answer",
			includeAuditOnly: true,
			includeSurveyOnly: false
		});
		const surveySession = buildAuditSession({
			auditId: "dddddddd-dddd-4ddd-8ddd-dddddddddd02",
			auditCode: "SURVEY-202",
			executionMode: "survey",
			sharedAnswer: "survey_answer",
			includeAuditOnly: false,
			includeSurveyOnly: true
		});
		const combinedSession = mergeAuditSessions(auditSession, surveySession);

		const combinedOverviewRows = buildOverviewRows(
			{
				auditSession: combinedSession,
				context: {
					projectName: combinedSession.project_name,
					city: null,
					province: null,
					country: null
				},
				auditorProfile: {
					auditorCode: combinedSession.auditor_code,
					ageRange: null,
					gender: null,
					country: null,
					role: null
				}
			},
			instrument
		);
		const combinedResponseRows = buildSingleAuditResponseRows(
			{
				auditSession: combinedSession,
				context: null,
				auditorProfile: null
			},
			instrument
		);

		expect(combinedOverviewRows).toContainEqual([
			"Component Legend",
			"Warm item highlight = Place Audit source; cool item highlight = Place Survey source."
		]);

		const sharedExportRows = combinedResponseRows.filter(row => row[0] === "Q 1.1");
		expect(sharedExportRows).toHaveLength(2);
		expect(sharedExportRows.map(row => String(row[1])).sort()).toEqual(
			["Place Audit source · Survey + Audit", "Place Survey source · Survey + Audit"].sort()
		);

		const fullAssessmentOverviewRows = buildOverviewRows(
			{
				auditSession: buildAuditSession({
					auditId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03",
					auditCode: "FULL-203",
					executionMode: "both",
					sharedAnswer: "survey_answer",
					includeAuditOnly: true,
					includeSurveyOnly: true
				}),
				context: null,
				auditorProfile: null
			},
			instrument
		);

		expect(fullAssessmentOverviewRows.some(row => row[0] === "Component Legend")).toBeFalsy();
	});
});
