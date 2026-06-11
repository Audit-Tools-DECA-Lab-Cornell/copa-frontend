/**
 * Score calculation utilities for the audit export pipeline.
 *
 * Export code shares question-level scoring with report rendering so backend,
 * web reports, and exported files use the same Unsure/N/A denominator rules.
 */

import {
	addScoreTotals,
	calculateQuestionScores,
	createEmptyScoreTotals,
	deriveSummaryScore
} from "@/lib/audit/question-scoring";
import type { ExecutionMode, InstrumentQuestion, QuestionResponsePayload } from "./types";

export { addScoreTotals, calculateQuestionScores, createEmptyScoreTotals, deriveSummaryScore };

// ── Visibility filter ────────────────────────────────────────────────────────

/**
 * Determines whether a question should appear in an export given:
 * - the audit's execution mode (null means show all)
 * - the sibling responses in the same section (for conditional display logic)
 */
export function isQuestionVisible(
	question: InstrumentQuestion,
	executionMode: ExecutionMode | null,
	sectionResponses: Record<string, QuestionResponsePayload>
): boolean {
	if (executionMode !== null && question.mode !== "both" && question.mode !== executionMode) {
		return false;
	}

	if (question.display_if === null || question.display_if === undefined) {
		return true;
	}

	const parentAnswers = sectionResponses[question.display_if.question_key];
	if (parentAnswers === undefined) {
		return false;
	}

	const selectedValue = parentAnswers[question.display_if.response_key];

	if (typeof selectedValue === "string") {
		return question.display_if.any_of_option_keys.includes(selectedValue);
	}

	if (Array.isArray(selectedValue)) {
		const displayCondition = question.display_if;
		return selectedValue.some(
			entry => typeof entry === "string" && displayCondition.any_of_option_keys.includes(entry)
		);
	}

	return false;
}
