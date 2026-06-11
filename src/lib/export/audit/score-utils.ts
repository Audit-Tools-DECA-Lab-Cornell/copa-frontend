/**
 * Score calculation utilities for the audit export pipeline.
 *
 * Provides helpers for computing per-question scores and accumulating them
 * into section/overall `AuditScoreTotals`. All functions are pure and have no
 * side effects.
 */

import type {
	AuditScoreTotals,
	AuditSession,
	ExecutionMode,
	InstrumentQuestion,
	MultiplierScaleScore,
	QuestionResponsePayload,
	QuestionScale,
	ScaleOption
} from "./types";

// ── AuditScoreTotals helpers ─────────────────────────────────────────────────

const EMPTY_SCORE_TOTALS: AuditScoreTotals = {
	provision_total: 0,
	provision_total_max: 0,
	variety_total: 0,
	variety_total_max: 0,
	challenge_total: 0,
	challenge_total_max: 0,
	sociability_total: 0,
	sociability_total_max: 0,
	play_value_total: 0,
	play_value_total_max: 0,
	usability_total: 0,
	usability_total_max: 0
};

/** Returns a fresh zero-filled `AuditScoreTotals`. */
export function createEmptyScoreTotals(): AuditScoreTotals {
	return { ...EMPTY_SCORE_TOTALS };
}

/** Sums two `AuditScoreTotals` field by field, returning a new object. */
export function addScoreTotals(left: AuditScoreTotals, right: AuditScoreTotals): AuditScoreTotals {
	return {
		provision_total: left.provision_total + right.provision_total,
		provision_total_max: left.provision_total_max + right.provision_total_max,
		variety_total: left.variety_total + right.variety_total,
		variety_total_max: left.variety_total_max + right.variety_total_max,
		challenge_total: left.challenge_total + right.challenge_total,
		challenge_total_max: left.challenge_total_max + right.challenge_total_max,
		sociability_total: left.sociability_total + right.sociability_total,
		sociability_total_max: left.sociability_total_max + right.sociability_total_max,
		play_value_total: left.play_value_total + right.play_value_total,
		play_value_total_max: left.play_value_total_max + right.play_value_total_max,
		usability_total: left.usability_total + right.usability_total,
		usability_total_max: left.usability_total_max + right.usability_total_max
	};
}

/**
 * Derives a single numeric summary score from an audit session.
 * Returns `"Pending"` when scores have not yet been computed (overall is null).
 */
export function deriveSummaryScore(auditSession: AuditSession): number | string {
	const overall = auditSession.scores.overall;
	if (overall === null) {
		return "Pending";
	}
	return Math.round((overall.play_value_total + overall.usability_total) * 100) / 100;
}

// ── Scale traversal helpers ───────────────────────────────────────────────────

function findScale(question: InstrumentQuestion, scaleKey: QuestionScale["key"]): QuestionScale | undefined {
	return question.scales.find(scale => scale.key === scaleKey);
}

function findScaleOption(scale: QuestionScale, optionKey: string): ScaleOption | undefined {
	return scale.options.find(option => option.key === optionKey);
}

// ── Per-scale score readers ───────────────────────────────────────────────────

function readProvisionScaleMaximum(question: InstrumentQuestion): number {
	const scale = findScale(question, "provision");
	if (scale === undefined) {
		return 0;
	}
	return scale.options.reduce((max, option) => Math.max(max, option.addition_value), 0);
}

function readMultiplierScaleScore(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	scaleKey: "variety" | "challenge"
): MultiplierScaleScore {
	const scale = findScale(question, scaleKey);
	const rawAnswer = answers[scaleKey];
	const answerKey = typeof rawAnswer === "string" ? rawAnswer : undefined;

	if (scale === undefined || answerKey === undefined) {
		return { columnTotal: 0, boostValue: 1 };
	}

	const selectedOption = findScaleOption(scale, answerKey);
	if (selectedOption === undefined) {
		return { columnTotal: 0, boostValue: 1 };
	}

	const columnTotal = Math.max(selectedOption.addition_value - 1, 0);
	if (selectedOption.addition_value <= 0) {
		return { columnTotal, boostValue: 1 };
	}

	return { columnTotal, boostValue: selectedOption.boost_value };
}

function readMultiplierScaleMaximum(
	question: InstrumentQuestion,
	scaleKey: "variety" | "challenge"
): MultiplierScaleScore {
	const scale = findScale(question, scaleKey);
	if (scale === undefined) {
		return { columnTotal: 0, boostValue: 1 };
	}

	const columnTotal = scale.options.reduce((max, option) => Math.max(max, Math.max(option.addition_value - 1, 0)), 0);
	const boostValue = scale.options.reduce((max, option) => Math.max(max, option.boost_value), 1);
	return { columnTotal, boostValue };
}

function readSociabilityScaleScore(question: InstrumentQuestion, answers: QuestionResponsePayload): number {
	const scale = findScale(question, "sociability");
	const rawAnswer = answers.sociability;
	const answerKey = typeof rawAnswer === "string" ? rawAnswer : undefined;

	if (scale === undefined || answerKey === undefined) {
		return 0;
	}

	const selectedOption = findScaleOption(scale, answerKey);
	if (selectedOption === undefined) {
		return 0;
	}

	return Math.max(selectedOption.addition_value - 1, 0);
}

function readSociabilityScaleMaximum(question: InstrumentQuestion): number {
	const scale = findScale(question, "sociability");
	if (scale === undefined) {
		return 0;
	}
	return scale.options.reduce((max, option) => Math.max(max, Math.max(option.addition_value - 1, 0)), 0);
}

// ── Per-question score calculation ───────────────────────────────────────────

/**
 * Computes the full `AuditScoreTotals` contribution for a single question
 * given its recorded answers.
 *
 * Only `"scaled"` questions with at least one scale contribute scores;
 * all other question types return zeroes.
 */
export function calculateQuestionScores(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload
): AuditScoreTotals {
	if (question.question_type !== "scaled" || question.scales.length === 0) {
		return createEmptyScoreTotals();
	}

	const provisionScale = findScale(question, "provision");
	const rawProvisionAnswer = answers.provision;
	const provisionAnswerKey = typeof rawProvisionAnswer === "string" ? rawProvisionAnswer : undefined;
	const provisionOption =
		provisionScale === undefined || provisionAnswerKey === undefined
			? undefined
			: findScaleOption(provisionScale, provisionAnswerKey);

	const provisionTotal = provisionOption?.addition_value ?? 0;
	const provisionTotalMax = readProvisionScaleMaximum(question);
	const shouldReadFollowUpScales = provisionOption?.allows_follow_up_scales === true;

	const varietyScore = shouldReadFollowUpScales
		? readMultiplierScaleScore(question, answers, "variety")
		: { columnTotal: 0, boostValue: 1 };
	const challengeScore = shouldReadFollowUpScales
		? readMultiplierScaleScore(question, answers, "challenge")
		: { columnTotal: 0, boostValue: 1 };
	const sociabilityTotal = shouldReadFollowUpScales ? readSociabilityScaleScore(question, answers) : 0;

	const varietyMaximum = readMultiplierScaleMaximum(question, "variety");
	const challengeMaximum = readMultiplierScaleMaximum(question, "challenge");
	const sociabilityTotalMax = readSociabilityScaleMaximum(question);

	const constructTotal = provisionTotal * varietyScore.boostValue * challengeScore.boostValue;
	const constructTotalMax = provisionTotalMax * varietyMaximum.boostValue * challengeMaximum.boostValue;

	return {
		provision_total: provisionTotal,
		provision_total_max: provisionTotalMax,
		variety_total: varietyScore.columnTotal,
		variety_total_max: varietyMaximum.columnTotal,
		challenge_total: challengeScore.columnTotal,
		challenge_total_max: challengeMaximum.columnTotal,
		sociability_total: sociabilityTotal,
		sociability_total_max: sociabilityTotalMax,
		play_value_total: question.constructs.includes("play_value") ? constructTotal : 0,
		play_value_total_max: question.constructs.includes("play_value") ? constructTotalMax : 0,
		usability_total: question.constructs.includes("usability") ? constructTotal : 0,
		usability_total_max: question.constructs.includes("usability") ? constructTotalMax : 0
	};
}

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
