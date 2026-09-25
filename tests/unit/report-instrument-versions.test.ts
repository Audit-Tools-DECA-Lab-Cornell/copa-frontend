import assert from "node:assert/strict";
import test from "node:test";

import { mergeAuditSessions } from "../../src/components/dashboard/place-report-merge";
import { calculateQuestionScores } from "../../src/lib/audit/question-scoring";
import type { ReportResultFilter } from "../../src/lib/audit/report-filter";
import {
	buildDomainReportRows,
	buildReportScoreProjection,
	buildVisibleQuestionEntries
} from "../../src/lib/audit/report-helpers";
import { buildSingleAuditResponseRows } from "../../src/lib/export/audit/row-builders";
import type { ExportableAudit } from "../../src/lib/export/audit/types";
import type {
	AuditScoreTotals,
	AuditSession,
	ParsedInstrumentQuestion,
	PlayspaceInstrument
} from "../../src/types/audit";
import { SOCIABILITY_DIMENSION_KEYS } from "../../src/types/sociability";

/*
 * A combined place report can pair a Place Audit and a Place Survey answered under
 * different instrument versions. Sociability is single-choice up to 5.31 and
 * multi-choice from 5.32, so the same question stores a string in one source and a
 * list in the other. These fixtures copy the production scale shapes of q_8_1 in
 * 5.29 (single) and 5.33 (multiple).
 */

const PROVISION_SCALE = {
	key: "provision",
	title: "Provision",
	prompt: "Provision",
	selection_mode: "single",
	options: [
		{
			key: "some",
			label: "Some",
			addition_value: 1,
			boost_value: 1,
			allows_follow_up_scales: true,
			is_not_applicable: false,
			is_unsure: false
		}
	]
} as const;

function socialQuestion(selectionMode: "single" | "multiple"): ParsedInstrumentQuestion {
	return {
		question_key: "q_8_1",
		mode: "both",
		constructs: ["play_value"],
		domains: ["social_play"],
		section_key: "social",
		prompt: "Side by side play",
		question_type: "scaled",
		required: true,
		display_if: null,
		notes_prompt: null,
		options: [],
		scales: [
			{ ...PROVISION_SCALE, options: [...PROVISION_SCALE.options] },
			{
				key: "sociability",
				title: "Sociability Support",
				prompt: "Sociability",
				selection_mode: selectionMode,
				options:
					selectionMode === "multiple"
						? SOCIABILITY_DIMENSION_KEYS.map(key => ({
								key,
								label: `Dimension ${key}`,
								addition_value: 1,
								boost_value: 1,
								allows_follow_up_scales: false,
								is_not_applicable: false,
								is_unsure: false
							}))
						: [
								{
									key: "no",
									label: "No side by side use",
									addition_value: 0,
									boost_value: 1,
									allows_follow_up_scales: false,
									is_not_applicable: false,
									is_unsure: false
								},
								{
									key: "yes_a_pair",
									label: "Yes - 2 users side by side",
									addition_value: 1,
									boost_value: 2,
									allows_follow_up_scales: false,
									is_not_applicable: false,
									is_unsure: false
								},
								{
									key: "yes_more_than_two_children",
									label: "Yes - 3+ users side by side",
									addition_value: 2,
									boost_value: 3,
									allows_follow_up_scales: false,
									is_not_applicable: false,
									is_unsure: false
								}
							]
			}
		]
	};
}

function instrumentVersion(version: string, selectionMode: "single" | "multiple"): PlayspaceInstrument {
	return {
		instrument_key: "pvua_v5_2",
		instrument_name: "PVUA",
		instrument_version: version,
		current_sheet: "PVUA",
		source_files: [],
		preamble: [],
		execution_modes: [],
		pre_audit_questions: [],
		scale_guidance: [],
		sections: [
			{
				section_key: "social",
				title: "Social play",
				description: null,
				instruction: "Answer",
				notes_prompt: null,
				questions: [socialQuestion(selectionMode)]
			}
		],
		legal_documents: []
	} as PlayspaceInstrument;
}

const LEGACY_INSTRUMENT = instrumentVersion("5.29", "single");
const CURRENT_INSTRUMENT = instrumentVersion("5.33", "multiple");

function totals(): AuditScoreTotals {
	return {
		provision_total: 1,
		provision_total_max: 1,
		variety_total: 0,
		variety_total_max: 0,
		challenge_total: 0,
		challenge_total_max: 0,
		sociability_total: 1,
		sociability_total_max: 1,
		sociability_breakdown: null,
		play_value_total: 1,
		play_value_total_max: 1,
		usability_total: 0,
		usability_total_max: 0
	};
}

function submission(
	mode: "audit" | "survey",
	sociabilityAnswer: string | string[],
	instrument: PlayspaceInstrument | undefined
): AuditSession {
	const sectionState = {
		section_key: "social",
		note: null,
		responses: { q_8_1: { provision: "some", sociability: sociabilityAnswer } }
	};
	const scoreTotals = totals();
	return {
		audit_id: `${mode === "audit" ? "a" : "b"}0000000-0000-4000-8000-000000000001`,
		audit_code: `${mode}-code`,
		auditor_code: `auditor-${mode}`,
		instrument_key: "pvua_v5_2",
		instrument_version: instrument?.instrument_version ?? "unknown",
		...(instrument === undefined ? {} : { instrument }),
		selected_execution_mode: mode,
		meta: { execution_mode: mode, final_comments: null },
		aggregate: {
			sections: { social: sectionState },
			meta: { execution_mode: mode, final_comments: null }
		},
		sections: { social: sectionState },
		scores: {
			draft_progress_percent: 100,
			execution_mode: mode,
			audit: mode === "audit" ? scoreTotals : null,
			survey: mode === "survey" ? scoreTotals : null,
			overall: scoreTotals,
			by_domain: { social_play: scoreTotals },
			by_section: { social: scoreTotals },
			unsure_answer_count: 0,
			unsure_variants: null
		},
		status: "SUBMITTED"
	} as unknown as AuditSession;
}

function combinedReport(surveyInstrument: PlayspaceInstrument | null = LEGACY_INSTRUMENT): AuditSession {
	const auditSession = submission("audit", ["large_group", "play_alone"], CURRENT_INSTRUMENT);
	const surveySession = submission("survey", "yes_more_than_two_children", surveyInstrument ?? undefined);
	return mergeAuditSessions(
		auditSession as unknown as Parameters<typeof mergeAuditSessions>[0],
		surveySession as unknown as Parameters<typeof mergeAuditSessions>[1]
	) as unknown as AuditSession;
}

/** Filtering out Usability forces every domain to recompute its totals from the question rows. */
const PLAY_VALUE_ONLY: ReportResultFilter = {
	overall: { playValue: true, usability: false },
	domainOverrides: {}
};

test("reading a single-choice Sociability answer with the multi-choice question is the production crash", () => {
	assert.throws(
		() =>
			calculateQuestionScores(socialQuestion("multiple"), {
				provision: "some",
				sociability: "yes_more_than_two_children"
			}),
		/Invalid multiple Sociability answer: expected_array/
	);
});

test("combined report reads each source's answers with that source's own instrument version", () => {
	const entries = buildVisibleQuestionEntries(combinedReport(), CURRENT_INSTRUMENT.sections[0]!);
	const auditEntry = entries.find(entry => entry.sourceComponent === "audit");
	const surveyEntry = entries.find(entry => entry.sourceComponent === "survey");

	assert.equal(entries.length, 2);
	assert.equal(auditEntry?.question.scales[1]?.selection_mode, "multiple");
	assert.equal(surveyEntry?.question.scales[1]?.selection_mode, "single");
	assert.deepEqual(surveyEntry?.answers, { provision: "some", sociability: "yes_more_than_two_children" });
});

test("mixed-version combined report scores both sources without throwing", () => {
	const entries = buildVisibleQuestionEntries(combinedReport(), CURRENT_INSTRUMENT.sections[0]!);
	const [auditScores, surveyScores] = (["audit", "survey"] as const).map(sourceComponent => {
		const entry = entries.find(candidate => candidate.sourceComponent === sourceComponent);
		assert.ok(entry !== undefined);
		return calculateQuestionScores(entry.question, entry.answers);
	});

	assert.equal(auditScores?.sociability_total, 2);
	assert.equal(auditScores?.sociability_total_max, 3);
	assert.equal(auditScores?.sociability_breakdown?.captured_question_count, 1);
	assert.equal(surveyScores?.sociability_total, 1);
	assert.equal(surveyScores?.sociability_total_max, 1);
	assert.equal(surveyScores?.sociability_breakdown, null);
});

test("mixed-version combined report builds its item rows, filtered totals, and projection", () => {
	const report = combinedReport();

	const rows = buildDomainReportRows(report, CURRENT_INSTRUMENT);
	const questions = rows.find(row => row.domainKey === "social_play")?.questions ?? [];
	const surveyRow = questions.find(row => row.sourceComponent === "survey");
	const auditRow = questions.find(row => row.sourceComponent === "audit");
	assert.equal(surveyRow?.sociabilityLabel, "Yes - 3+ users side by side");
	assert.equal(surveyRow?.sociabilitySelections, null);
	assert.deepEqual(auditRow?.sociabilitySelections, ["play_alone", "large_group"]);

	const filteredRows = buildDomainReportRows(report, CURRENT_INSTRUMENT, { filter: PLAY_VALUE_ONLY });
	const filteredTotals = filteredRows.find(row => row.domainKey === "social_play")?.scoreTotals;
	assert.equal(filteredTotals?.sociability_total, 3);
	assert.equal(filteredTotals?.sociability_total_max, 4);

	assert.doesNotThrow(() => buildReportScoreProjection(report, CURRENT_INSTRUMENT, PLAY_VALUE_ONLY));
});

test("mixed-version combined report exports the legacy survey answer next to the multi-choice audit answer", () => {
	const exportableAudit = { auditSession: combinedReport(), context: null, auditorProfile: null } as ExportableAudit;
	const rows = buildSingleAuditResponseRows(exportableAudit, CURRENT_INSTRUMENT);
	const questionRows = rows.filter(row => String(row[0]).includes("8.1"));
	const legacyRow = questionRows.find(row => String(row[9]).includes("Yes - 3+ users side by side"));
	const multiRow = questionRows.find(row => String(row[9]).includes("Dimension play_alone"));

	assert.deepEqual(legacyRow?.slice(10, 13), ["Not captured", "Not captured", "Not captured"]);
	assert.deepEqual(multiRow?.slice(10, 13), ["Selected", "Not selected", "Selected"]);
});

test("a source without an embedded instrument falls back to the report instrument's question", () => {
	const entries = buildVisibleQuestionEntries(combinedReport(null), CURRENT_INSTRUMENT.sections[0]!);
	const surveyEntry = entries.find(entry => entry.sourceComponent === "survey");

	assert.equal(surveyEntry?.question.scales[1]?.selection_mode, "multiple");
});

test("a single-submission report reads its answers with the instrument it is given", () => {
	const legacyAudit = submission("audit", "yes_a_pair", LEGACY_INSTRUMENT);
	const rows = buildDomainReportRows(legacyAudit, LEGACY_INSTRUMENT, { filter: PLAY_VALUE_ONLY });
	const questionRow = rows.find(row => row.domainKey === "social_play")?.questions[0];

	assert.equal(questionRow?.sociabilityLabel, "Yes - 2 users side by side");
	assert.equal(rows.find(row => row.domainKey === "social_play")?.scoreTotals?.sociability_total, 0);
});
