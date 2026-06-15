/**
 * Spreadsheet row builders for the audit export pipeline.
 *
 * Produces the ordered rows that populate the Overview and Responses
 * worksheets/pages. All functions are pure: given the same inputs they return
 * identical outputs with no side effects.
 */

import { buildVisibleQuestionEntries } from "@/lib/audit/report-helpers";
import {
	getCombinedReportLegend,
	getCombinedReportSources,
	getReportSourceLabel,
	type ReportSourceComponent
} from "@/lib/audit/report-source-sessions";
import { getEffectiveScoreTotals, hasUnsureVariants, type ScoreVariantKey } from "@/lib/audit/score-mode-helpers";
import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";

import {
	formatAuditStatusLabel,
	formatChecklistAnswer,
	formatConstructLabel,
	formatExecutionModeLabel,
	formatLocality,
	formatPercentage,
	formatQuestionAnswer,
	formatQuestionDomainLabel,
	formatQuestionModeLabel,
	formatTimestampForDisplay,
	questionDomainFallback,
	stripPromptMarkup
} from "./format-utils";
import { addScoreTotals, calculateQuestionScores, createEmptyScoreTotals, deriveSummaryScore } from "./score-utils";
import type {
	AuditScoreTotals,
	ExportableAudit,
	PlayspaceInstrument,
	SpreadsheetRow,
	WorkbookRowMetadata
} from "./types";

interface ResponseTableBuildResult {
	readonly rows: readonly SpreadsheetRow[];
	readonly rowMetadata: readonly (WorkbookRowMetadata | null)[];
}

function formatVariantScoreRow(
	label: string,
	variant: ScoreVariantKey,
	auditSession: ExportableAudit["auditSession"]
): SpreadsheetRow {
	const totals = getEffectiveScoreTotals(auditSession.scores, variant);
	if (totals === null) {
		return [label, "--"];
	}
	const summaryTotal = totals.play_value_total + totals.usability_total;
	const summaryMax = totals.play_value_total_max + totals.usability_total_max;
	return [
		label,
		`PV ${totals.play_value_total}/${totals.play_value_total_max} (${formatPercentage(totals.play_value_total, totals.play_value_total_max)}) · U ${totals.usability_total}/${totals.usability_total_max} (${formatPercentage(totals.usability_total, totals.usability_total_max)}) · Summary ${summaryTotal}/${summaryMax} (${formatPercentage(summaryTotal, summaryMax)})`
	];
}

// ── Overview sheet ────────────────────────────────────────────────────────────

/**
 * Builds the full row set for the "Overview" worksheet.
 * The first row is the header; subsequent rows are key/value pairs.
 */
export function buildOverviewRows(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument
): readonly SpreadsheetRow[] {
	const { auditSession, context, auditorProfile } = exportableAudit;
	const overallScores = auditSession.scores.overall;
	const combinedSources = getCombinedReportSources(auditSession);
	const finalComments = auditSession.meta.final_comments?.trim() ?? "";

	const sourceRows: SpreadsheetRow[] =
		combinedSources === null
			? []
			: [
					["Report Type", "Combined place report"],
					["Place Audit Submission", combinedSources.audit.audit_code],
					["Place Audit Auditor", combinedSources.audit.auditor_code],
					["Place Audit Started", formatTimestampForDisplay(combinedSources.audit.started_at)],
					["Place Audit Submitted", formatTimestampForDisplay(combinedSources.audit.submitted_at)],
					["Place Survey Submission", combinedSources.survey.audit_code],
					["Place Survey Auditor", combinedSources.survey.auditor_code],
					["Place Survey Started", formatTimestampForDisplay(combinedSources.survey.started_at)],
					["Place Survey Submitted", formatTimestampForDisplay(combinedSources.survey.submitted_at)],
					["Component Legend", getCombinedReportLegend()]
				];

	const auditorRows: SpreadsheetRow[] =
		combinedSources === null
			? [
					["Auditor Code", auditorProfile?.auditorCode ?? ""],
					["Auditor Country", auditorProfile?.country ?? ""],
					["Auditor Gender", auditorProfile?.gender ?? ""],
					["Auditor Age", auditorProfile?.ageRange ?? ""],
					["Auditor Role", auditorProfile?.role ?? ""]
				]
			: [];

	const summaryMetadataRows: SpreadsheetRow[] =
		combinedSources === null
			? [
					["Execution Mode", formatExecutionModeLabel(auditSession, instrument)],
					["Started At", formatTimestampForDisplay(auditSession.started_at)],
					["Submitted At", formatTimestampForDisplay(auditSession.submitted_at)]
				]
			: [];

	const unsureRows: SpreadsheetRow[] = hasUnsureVariants(auditSession.scores)
		? [
				["Unsure Answers", auditSession.scores.unsure_answer_count],
				formatVariantScoreRow("Unsure Excluded", "canonical", auditSession),
				formatVariantScoreRow("Unsure As Zero", "unsure_as_zero", auditSession),
				formatVariantScoreRow("Unsure As Maximum", "unsure_as_max", auditSession)
			]
		: [];

	return [
		["Field", "Value"],
		["Instrument", `${instrument.instrument_name} v${instrument.instrument_version}`],
		["Audit Code", auditSession.audit_code],
		["Place Name", auditSession.place_name],
		["Project Name", auditSession.project_name],
		["Locality", formatLocality(context)],
		["Status", formatAuditStatusLabel(auditSession.status)],
		...summaryMetadataRows,
		["Total Minutes", auditSession.total_minutes ?? "Pending"],
		...(finalComments.length > 0 ? ([["Final Comments", finalComments]] as SpreadsheetRow[]) : []),
		...sourceRows,
		["Summary Score", deriveSummaryScore(auditSession)],
		["Play Value Total", overallScores?.play_value_total ?? "Pending"],
		["Usability Total", overallScores?.usability_total ?? "Pending"],
		["Provision Total", overallScores?.provision_total ?? "Pending"],
		["Variety Total", overallScores?.variety_total ?? "Pending"],
		["Sociability Total", overallScores?.sociability_total ?? "Pending"],
		["Challenge Total", overallScores?.challenge_total ?? "Pending"],
		...unsureRows,
		...auditorRows
	];
}

// ── Responses sheet ───────────────────────────────────────────────────────────

/**
 * Builds the full row set for the PVUA Response Matrix.
 *
 * Each visible question in each section produces one data row. The section is
 * preceded by a header row and followed by per-section summary rows. An
 * overall summary block is appended after the last section.
 *
 * The header row (`SINGLE_RESPONSE_HEADERS`) is NOT prepended here - callers
 * add it as needed to support both XLSX (sheet prepend) and CSV (array prepend).
 */
function buildSingleAuditResponseTable(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument
): ResponseTableBuildResult {
	const { auditSession } = exportableAudit;
	const combinedSources = getCombinedReportSources(auditSession);
	const rows: SpreadsheetRow[] = [];
	const rowMetadata: Array<WorkbookRowMetadata | null> = [];
	let overallTotals = createEmptyScoreTotals();

	for (const [sectionIndex, section] of instrument.sections.entries()) {
		const visibleEntries = buildVisibleQuestionEntries(auditSession, section);

		if (visibleEntries.length === 0) {
			continue;
		}

		let sectionTotals = createEmptyScoreTotals();

		rows.push(buildSectionHeaderRow(sectionIndex, section.title, section.description, section.instruction));
		rowMetadata.push(null);

		for (const [questionIndex, visibleEntry] of visibleEntries.entries()) {
			const { question, answers, sourceComponent } = visibleEntry;
			const questionScores = calculateQuestionScores(question, answers);

			rows.push(buildQuestionResponseRow(sectionIndex, questionIndex, question, answers, questionScores));
			rowMetadata.push(sourceComponent === null ? null : { sourceComponent });

			// Per-question auditor comment row - emitted directly after the
			// question item row, before score rows, matching the PDF layout.
			const questionComment = typeof answers.question_note === "string" ? answers.question_note.trim() : "";
			if (questionComment.length > 0) {
				rows.push(
					buildQuestionCommentRow(
						sectionIndex,
						questionIndex,
						questionComment,
						formatQuestionKeyForDisplay(question.question_key),
						sourceComponent
					)
				);
				rowMetadata.push(null);
			}

			sectionTotals = addScoreTotals(sectionTotals, questionScores);
		}

		const notesPrompt = typeof section.notes_prompt === "string" ? stripPromptMarkup(section.notes_prompt) : "";

		if (notesPrompt.length > 0) {
			const notePromptRows = buildSectionNoteRow(
				sectionIndex,
				visibleEntries.length + 1,
				questionDomainFallback(section.title),
				notesPrompt,
				""
			);
			rows.push(...notePromptRows);
			rowMetadata.push(...Array.from({ length: notePromptRows.length }, () => null));
		}

		if (combinedSources === null) {
			const sectionNote = auditSession.sections[section.section_key]?.note ?? "";
			if (sectionNote.trim().length > 0) {
				const noteRows = buildSectionNoteRow(
					sectionIndex,
					visibleEntries.length + 1,
					questionDomainFallback(section.title),
					"",
					sectionNote
				);
				rows.push(...noteRows);
				rowMetadata.push(...Array.from({ length: noteRows.length }, () => null));
			}
		} else {
			(["audit", "survey"] as const).forEach(sourceComponent => {
				const sourceSession = combinedSources[sourceComponent];
				const sectionNote = sourceSession.sections[section.section_key]?.note ?? "";
				if (sectionNote.trim().length === 0) {
					return;
				}
				const noteRows = buildSectionNoteRow(
					sectionIndex,
					visibleEntries.length + 1,
					questionDomainFallback(section.title),
					"",
					`${getReportSourceLabel(sourceComponent)}: ${sectionNote}`
				);
				rows.push(...noteRows);
				rowMetadata.push(...Array.from({ length: noteRows.length }, () => null));
			});
		}

		rows.push(...buildSectionSummaryRows(sectionTotals));
		rowMetadata.push(null, null, null);
		overallTotals = addScoreTotals(overallTotals, sectionTotals);
	}

	if (rows.length > 0) {
		rows.push(buildEmptyResponseRow());
		rows.push(...buildOverallSummaryRows(overallTotals));
		rowMetadata.push(null, null, null, null);
	}

	return {
		rows,
		rowMetadata
	};
}

export function buildSingleAuditResponseRows(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument
): readonly SpreadsheetRow[] {
	return buildSingleAuditResponseTable(exportableAudit, instrument).rows;
}

export function buildSingleAuditResponseRowMetadata(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument
): readonly (WorkbookRowMetadata | null)[] {
	return buildSingleAuditResponseTable(exportableAudit, instrument).rowMetadata;
}

// ── Individual row factories ──────────────────────────────────────────────────

/** Produces the full-width section header row (ID col = section number only). */
export function buildSectionHeaderRow(
	sectionIndex: number,
	title: string,
	description: string | null | undefined,
	instruction: string
): SpreadsheetRow {
	return [
		(sectionIndex + 1).toString(),
		"",
		"",
		questionDomainFallback(title),
		typeof description === "string" ? stripPromptMarkup(description) : "",
		stripPromptMarkup(instruction),
		"",
		"",
		"",
		"",
		"",
		"",
		""
	];
}

/** Produces the data row for a single question + its recorded answers. */
export function buildQuestionResponseRow(
	_sectionIndex: number,
	_questionIndex: number,
	question: import("@/types/audit").InstrumentQuestion,
	answers: import("@/types/audit").QuestionResponsePayload,
	questionScores: AuditScoreTotals
): SpreadsheetRow {
	if (question.question_type === "checklist") {
		return [
			formatQuestionKeyForDisplay(question.question_key),
			formatQuestionModeLabel(question.mode),
			formatConstructLabel(question.constructs),
			formatQuestionDomainLabel(question),
			"",
			"",
			stripPromptMarkup(question.prompt),
			formatChecklistAnswer(question, answers),
			"",
			"",
			"",
			"N/A",
			"N/A"
		];
	}

	const rawProvision = answers.provision;
	const rawVariety = answers.variety;
	const rawSociability = answers.sociability;
	const rawChallenge = answers.challenge;

	return [
		formatQuestionKeyForDisplay(question.question_key),
		formatQuestionModeLabel(question.mode),
		formatConstructLabel(question.constructs),
		formatQuestionDomainLabel(question),
		"",
		"",
		stripPromptMarkup(question.prompt),
		formatQuestionAnswer(question, "provision", typeof rawProvision === "string" ? rawProvision : undefined),
		formatQuestionAnswer(question, "variety", typeof rawVariety === "string" ? rawVariety : undefined),
		formatQuestionAnswer(question, "sociability", typeof rawSociability === "string" ? rawSociability : undefined),
		formatQuestionAnswer(question, "challenge", typeof rawChallenge === "string" ? rawChallenge : undefined),
		question.constructs.includes("play_value") ? questionScores.play_value_total : "N/A",
		question.constructs.includes("usability") ? questionScores.usability_total : "N/A"
	];
}

/**
 * Sentinel placed in col 1 so the XLSX styler can identify per-question
 * auditor comment rows without a fragile text scan.
 * @internal
 */
export const COMMENT_ROW_SENTINEL = "__comment__" as const;

/**
 * Sentinel placed in col 1 for the bold Notes Prompt banner row.
 * @internal
 */
export const SECTION_NOTE_SENTINEL = "__section_note__" as const;

/**
 * Sentinel placed in col 1 for the normal-weight Auditor Note response row.
 * @internal
 */
export const SECTION_NOTE_RESPONSE_SENTINEL = "__section_note_response__" as const;

/**
 * Produces a per-question auditor comment row.
 * Placed immediately after the question's data row and before score rows.
 * Col 6 ("Items") carries the comment text; all other data cells are blank.
 */
export function buildQuestionCommentRow(
	_sectionIndex: number,
	_questionIndex: number,
	comment: string,
	questionKey: string,
	sourceComponent: ReportSourceComponent | null
): SpreadsheetRow {
	const sourcePrefix = sourceComponent === null ? "" : `${getReportSourceLabel(sourceComponent)}: `;
	return [questionKey, COMMENT_ROW_SENTINEL, "", "", "", "", `${sourcePrefix}${comment}`, "", "", "", "", "", ""];
}

/**
 * Produces one or two full-width banner rows for the section note block.
 *
 * - When a Notes Prompt is present: a bold header row (`SECTION_NOTE_SENTINEL`)
 *   carrying `"Notes Prompt: <text>"`.
 * - When an Auditor Note is present: a normal-weight response row
 *   (`SECTION_NOTE_RESPONSE_SENTINEL`) carrying `"Auditor Note: <text>"`.
 *
 * Both row types are detected by the XLSX styler for merge + banner styling.
 */
export function buildSectionNoteRow(
	_sectionIndex: number,
	_noteIndex: number,
	_domainLabel: string,
	notesPrompt: string,
	submittedComment: string
): readonly SpreadsheetRow[] {
	const BLANK = ["", "", "", "", "", "", "", "", "", "", ""] as const;
	const rows: SpreadsheetRow[] = [];

	if (notesPrompt.length > 0) {
		rows.push([`Notes Prompt: ${notesPrompt}`, SECTION_NOTE_SENTINEL, ...BLANK]);
	}

	if (submittedComment.trim().length > 0) {
		rows.push([`Auditor Note: ${submittedComment.trim()}`, SECTION_NOTE_RESPONSE_SENTINEL, ...BLANK]);
	}

	return rows;
}

/**
 * Col index that holds the score row kind label
 * ("Raw Scores" / "Max Possible" / "Final Percentage").
 * Used by the XLSX styler to pick the correct fill variant.
 *
 * @internal
 */
export const SCORE_ROW_KIND_COL = 1;

/** Produces the three per-section summary rows (raw, max, percentage). */
export function buildSectionSummaryRows(totals: AuditScoreTotals): readonly SpreadsheetRow[] {
	return [
		buildScoreSummaryRow("Total", "Raw Scores", totals, "raw"),
		buildScoreSummaryRow("Max", "Max Possible", totals, "maximum"),
		buildScoreSummaryRow("%", "Final Percentage", totals, "percentage")
	];
}

/** Produces the three overall summary rows appended at the end of the matrix. */
export function buildOverallSummaryRows(totals: AuditScoreTotals): readonly SpreadsheetRow[] {
	return [
		buildScoreSummaryRow("Overall Total", "Raw Scores", totals, "raw"),
		buildScoreSummaryRow("Overall Max", "Max Possible", totals, "maximum"),
		buildScoreSummaryRow("Overall %", "Final Percentage", totals, "percentage")
	];
}

/**
 * Sentinel placed in col 2 so the XLSX styler can identify score summary rows.
 * Variants allow per-kind fill differentiation (Total vs Max vs %).
 *
 * @internal Not part of the public row-data contract; used only by excel.ts.
 */
export const SCORE_ROW_SENTINEL = "Summary" as const;
export type ScoreRowKind = "raw" | "maximum" | "percentage";

/**
 * Produces a single score summary row.
 * @param rowKind - `"raw"` emits actual totals, `"maximum"` emits max values,
 *   `"percentage"` emits formatted percentages.
 */
export function buildScoreSummaryRow(
	idLabel: string,
	modeLabel: string,
	totals: AuditScoreTotals,
	rowKind: ScoreRowKind
): SpreadsheetRow {
	const base = [idLabel, modeLabel, SCORE_ROW_SENTINEL, "", "", "", ""] as const;

	if (rowKind === "raw") {
		return [
			...base,
			totals.provision_total,
			totals.variety_total,
			totals.sociability_total,
			totals.challenge_total,
			totals.play_value_total,
			totals.usability_total
		];
	}

	if (rowKind === "maximum") {
		return [
			...base,
			totals.provision_total_max,
			totals.variety_total_max,
			totals.sociability_total_max,
			totals.challenge_total_max,
			totals.play_value_total_max,
			totals.usability_total_max
		];
	}

	return [
		...base,
		formatPercentage(totals.provision_total, totals.provision_total_max),
		formatPercentage(totals.variety_total, totals.variety_total_max),
		formatPercentage(totals.sociability_total, totals.sociability_total_max),
		formatPercentage(totals.challenge_total, totals.challenge_total_max),
		formatPercentage(totals.play_value_total, totals.play_value_total_max),
		formatPercentage(totals.usability_total, totals.usability_total_max)
	];
}

/** Produces a blank separator row (13 empty cells). */
export function buildEmptyResponseRow(): SpreadsheetRow {
	return ["", "", "", "", "", "", "", "", "", "", "", "", ""];
}
