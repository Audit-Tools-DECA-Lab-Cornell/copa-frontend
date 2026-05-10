/**
 * Spreadsheet row builders for the audit export pipeline.
 *
 * Produces the ordered rows that populate the Overview and Responses
 * worksheets/pages. All functions are pure: given the same inputs they return
 * identical outputs with no side effects.
 */

import type { AuditScoreTotals, ExportableAudit, PlayspaceInstrument, SpreadsheetRow } from "./types";
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
	stripPromptMarkup,
	resolveExecutionMode
} from "./format-utils";
import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";
import {
	addScoreTotals,
	calculateQuestionScores,
	createEmptyScoreTotals,
	deriveSummaryScore,
	isQuestionVisible
} from "./score-utils";

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

	return [
		["Field", "Value"],
		["Instrument", `${instrument.instrument_name} v${instrument.instrument_version}`],
		["Audit Code", auditSession.audit_code],
		["Place Name", auditSession.place_name],
		["Project Name", auditSession.project_name],
		["Locality", formatLocality(context)],
		["Status", formatAuditStatusLabel(auditSession.status)],
		["Execution Mode", formatExecutionModeLabel(auditSession, instrument)],
		["Started At", formatTimestampForDisplay(auditSession.started_at)],
		["Submitted At", formatTimestampForDisplay(auditSession.submitted_at)],
		["Total Minutes", auditSession.total_minutes ?? "Pending"],
		["Summary Score", deriveSummaryScore(auditSession)],
		["Play Value Total", overallScores?.play_value_total ?? "Pending"],
		["Usability Total", overallScores?.usability_total ?? "Pending"],
		["Provision Total", overallScores?.provision_total ?? "Pending"],
		["Diversity Total", overallScores?.diversity_total ?? "Pending"],
		["Sociability Total", overallScores?.sociability_total ?? "Pending"],
		["Challenge Total", overallScores?.challenge_total ?? "Pending"],
		["Auditor Code", auditorProfile?.auditorCode ?? ""],
		["Auditor Country", auditorProfile?.country ?? ""],
		["Auditor Gender", auditorProfile?.gender ?? ""],
		["Auditor Age", auditorProfile?.ageRange ?? ""],
		["Auditor Role", auditorProfile?.role ?? ""]
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
 * The header row (`SINGLE_RESPONSE_HEADERS`) is NOT prepended here — callers
 * add it as needed to support both XLSX (sheet prepend) and CSV (array prepend).
 */
export function buildSingleAuditResponseRows(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument
): readonly SpreadsheetRow[] {
	const { auditSession } = exportableAudit;
	const executionMode = resolveExecutionMode(auditSession);
	const rows: SpreadsheetRow[] = [];
	let overallTotals = createEmptyScoreTotals();

	for (const [sectionIndex, section] of instrument.sections.entries()) {
		const sectionResponses = auditSession.sections[section.section_key]?.responses ?? {};
		const visibleQuestions = section.questions.filter(question =>
			isQuestionVisible(question, executionMode, sectionResponses)
		);

		if (visibleQuestions.length === 0) {
			continue;
		}

		const sectionState = auditSession.sections[section.section_key];
		let sectionTotals = createEmptyScoreTotals();

		rows.push(buildSectionHeaderRow(sectionIndex, section.title, section.description, section.instruction));

		for (const [questionIndex, question] of visibleQuestions.entries()) {
			const questionAnswers = sectionState?.responses[question.question_key] ?? {};
			const questionScores = calculateQuestionScores(question, questionAnswers);

			rows.push(buildQuestionResponseRow(sectionIndex, questionIndex, question, questionAnswers, questionScores));

			// Per-question auditor comment row — emitted directly after the
			// question item row, before score rows, matching the PDF layout.
			const questionComment =
				typeof questionAnswers.question_note === "string" ? questionAnswers.question_note.trim() : "";
			if (questionComment.length > 0) {
				rows.push(
					buildQuestionCommentRow(
						sectionIndex,
						questionIndex,
						questionComment,
						formatQuestionKeyForDisplay(question.question_key)
					)
				);
			}

			sectionTotals = addScoreTotals(sectionTotals, questionScores);
		}

		const sectionNote = sectionState?.note ?? "";
		const notesPrompt = typeof section.notes_prompt === "string" ? stripPromptMarkup(section.notes_prompt) : "";

		if (notesPrompt.length > 0 || sectionNote.trim().length > 0) {
			rows.push(
				...buildSectionNoteRow(
					sectionIndex,
					visibleQuestions.length + 1,
					questionDomainFallback(section.title),
					notesPrompt,
					sectionNote
				)
			);
		}

		rows.push(...buildSectionSummaryRows(sectionTotals));
		overallTotals = addScoreTotals(overallTotals, sectionTotals);
	}

	if (rows.length > 0) {
		rows.push(buildEmptyResponseRow());
		rows.push(...buildOverallSummaryRows(overallTotals));
	}

	return rows;
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
	const rawDiversity = answers.diversity;
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
		formatQuestionAnswer(question, "diversity", typeof rawDiversity === "string" ? rawDiversity : undefined),
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
	questionKey: string
): SpreadsheetRow {
	return [questionKey, COMMENT_ROW_SENTINEL, "", "", "", "", comment, "", "", "", "", "", ""];
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
			totals.diversity_total,
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
			totals.diversity_total_max,
			totals.sociability_total_max,
			totals.challenge_total_max,
			totals.play_value_total_max,
			totals.usability_total_max
		];
	}

	return [
		...base,
		formatPercentage(totals.provision_total, totals.provision_total_max),
		formatPercentage(totals.diversity_total, totals.diversity_total_max),
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
