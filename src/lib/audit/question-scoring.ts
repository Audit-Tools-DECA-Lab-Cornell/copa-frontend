import type {
	AuditScoreTotals,
	AuditSession,
	InstrumentQuestion,
	QuestionResponsePayload,
	QuestionScale,
	ScaleOption
} from "@/types/audit";

export type UnsurePolicy = "unsure_as_excluded" | "unsure_as_zero" | "unsure_as_max";

interface MultiplierScaleResult {
	readonly columnTotal: number;
	readonly columnTotalMax: number;
	readonly boostValue: number;
	readonly boostValueMax: number;
}

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

export function createEmptyScoreTotals(): AuditScoreTotals {
	return { ...EMPTY_SCORE_TOTALS };
}

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

export function deriveSummaryScore(auditSession: AuditSession): number | string {
	const overall = auditSession.scores.overall;
	if (overall === null) {
		return "Pending";
	}
	return Math.round((overall.play_value_total + overall.usability_total) * 100) / 100;
}

export function findScale(question: InstrumentQuestion, scaleKey: QuestionScale["key"]): QuestionScale | undefined {
	return question.scales.find(scale => scale.key === scaleKey);
}

export function findScaleOption(scale: QuestionScale, optionKey: string): ScaleOption | undefined {
	return scale.options.find(option => option.key === optionKey);
}

function isExcludingOption(option: ScaleOption, unsurePolicy: UnsurePolicy): boolean {
	return option.is_not_applicable === true || (option.is_unsure === true && unsurePolicy === "unsure_as_excluded");
}

function maxCandidateOptions(options: readonly ScaleOption[]): readonly ScaleOption[] {
	return options.filter(option => option.is_not_applicable !== true && option.is_unsure !== true);
}

function readProvisionScaleMaximum(question: InstrumentQuestion): number {
	const scale = findScale(question, "provision");
	if (scale === undefined) {
		return 0;
	}
	return maxCandidateOptions(scale.options).reduce((max, option) => Math.max(max, option.addition_value), 0);
}

function readMultiplierScaleMaximum(
	question: InstrumentQuestion,
	scaleKey: "variety" | "challenge"
): Pick<MultiplierScaleResult, "columnTotalMax" | "boostValueMax"> {
	const scale = findScale(question, scaleKey);
	if (scale === undefined) {
		return { columnTotalMax: 0, boostValueMax: 1 };
	}
	const candidates = maxCandidateOptions(scale.options);
	return {
		columnTotalMax: candidates.reduce((max, option) => Math.max(max, Math.max(option.addition_value - 1, 0)), 0),
		boostValueMax: candidates.reduce((max, option) => Math.max(max, option.boost_value), 1)
	};
}

function readMultiplierScaleResult(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	scaleKey: "variety" | "challenge",
	unsurePolicy: UnsurePolicy
): MultiplierScaleResult {
	const scale = findScale(question, scaleKey);
	if (scale === undefined) {
		return { columnTotal: 0, columnTotalMax: 0, boostValue: 1, boostValueMax: 1 };
	}

	const maximum = readMultiplierScaleMaximum(question, scaleKey);
	const rawAnswer = answers[scaleKey];
	const answerKey = typeof rawAnswer === "string" ? rawAnswer : undefined;
	if (answerKey === undefined) {
		return {
			columnTotal: 0,
			columnTotalMax: maximum.columnTotalMax,
			boostValue: 1,
			boostValueMax: maximum.boostValueMax
		};
	}

	const selectedOption = findScaleOption(scale, answerKey);
	if (selectedOption === undefined) {
		return {
			columnTotal: 0,
			columnTotalMax: maximum.columnTotalMax,
			boostValue: 1,
			boostValueMax: maximum.boostValueMax
		};
	}

	if (isExcludingOption(selectedOption, unsurePolicy)) {
		return { columnTotal: 0, columnTotalMax: 0, boostValue: 1, boostValueMax: 1 };
	}

	if (selectedOption.is_unsure === true) {
		if (unsurePolicy === "unsure_as_max") {
			return {
				columnTotal: maximum.columnTotalMax,
				columnTotalMax: maximum.columnTotalMax,
				boostValue: maximum.boostValueMax,
				boostValueMax: maximum.boostValueMax
			};
		}
		return {
			columnTotal: 0,
			columnTotalMax: maximum.columnTotalMax,
			boostValue: 1,
			boostValueMax: maximum.boostValueMax
		};
	}

	const columnTotal = Math.max(selectedOption.addition_value - 1, 0);
	return {
		columnTotal,
		columnTotalMax: maximum.columnTotalMax,
		boostValue: selectedOption.addition_value <= 0 ? 1 : selectedOption.boost_value,
		boostValueMax: maximum.boostValueMax
	};
}

function readSociabilityScaleMaximum(question: InstrumentQuestion): number {
	const scale = findScale(question, "sociability");
	if (scale === undefined) {
		return 0;
	}
	return maxCandidateOptions(scale.options).reduce(
		(max, option) => Math.max(max, Math.max(option.addition_value - 1, 0)),
		0
	);
}

function readSociabilityScaleResult(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	unsurePolicy: UnsurePolicy
): { readonly total: number; readonly totalMax: number } {
	const scale = findScale(question, "sociability");
	if (scale === undefined) {
		return { total: 0, totalMax: 0 };
	}

	const totalMax = readSociabilityScaleMaximum(question);
	const rawAnswer = answers.sociability;
	const answerKey = typeof rawAnswer === "string" ? rawAnswer : undefined;
	if (answerKey === undefined) {
		return { total: 0, totalMax };
	}

	const selectedOption = findScaleOption(scale, answerKey);
	if (selectedOption === undefined) {
		return { total: 0, totalMax };
	}

	if (isExcludingOption(selectedOption, unsurePolicy)) {
		return { total: 0, totalMax: 0 };
	}

	if (selectedOption.is_unsure === true) {
		return unsurePolicy === "unsure_as_max" ? { total: totalMax, totalMax } : { total: 0, totalMax };
	}

	return { total: Math.max(selectedOption.addition_value - 1, 0), totalMax };
}

export function calculateQuestionScores(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	unsurePolicy: UnsurePolicy = "unsure_as_excluded"
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

	if (provisionOption === undefined || isExcludingOption(provisionOption, unsurePolicy)) {
		return createEmptyScoreTotals();
	}

	const provisionTotalMax = readProvisionScaleMaximum(question);
	const varietyMaximum = readMultiplierScaleMaximum(question, "variety");
	const challengeMaximum = readMultiplierScaleMaximum(question, "challenge");
	const sociabilityTotalMax = readSociabilityScaleMaximum(question);

	let provisionTotal = provisionOption.addition_value;
	let varietyTotal = 0;
	let varietyTotalMax = varietyMaximum.columnTotalMax;
	let varietyBoost = 1;
	let varietyBoostMax = varietyMaximum.boostValueMax;
	let challengeTotal = 0;
	let challengeTotalMax = challengeMaximum.columnTotalMax;
	let challengeBoost = 1;
	let challengeBoostMax = challengeMaximum.boostValueMax;
	let sociabilityTotal = 0;
	let effectiveSociabilityTotalMax = sociabilityTotalMax;

	if (provisionOption.is_unsure === true && unsurePolicy === "unsure_as_max") {
		provisionTotal = provisionTotalMax;
		varietyTotal = varietyTotalMax;
		varietyBoost = varietyBoostMax;
		challengeTotal = challengeTotalMax;
		challengeBoost = challengeBoostMax;
		sociabilityTotal = sociabilityTotalMax;
	} else if (provisionOption.allows_follow_up_scales === true) {
		const varietyResult = readMultiplierScaleResult(question, answers, "variety", unsurePolicy);
		const challengeResult = readMultiplierScaleResult(question, answers, "challenge", unsurePolicy);
		const sociabilityResult = readSociabilityScaleResult(question, answers, unsurePolicy);
		varietyTotal = varietyResult.columnTotal;
		varietyTotalMax = varietyResult.columnTotalMax;
		varietyBoost = varietyResult.boostValue;
		varietyBoostMax = varietyResult.boostValueMax;
		challengeTotal = challengeResult.columnTotal;
		challengeTotalMax = challengeResult.columnTotalMax;
		challengeBoost = challengeResult.boostValue;
		challengeBoostMax = challengeResult.boostValueMax;
		sociabilityTotal = sociabilityResult.total;
		effectiveSociabilityTotalMax = sociabilityResult.totalMax;
	}

	const constructTotal = provisionTotal * varietyBoost * challengeBoost;
	const constructTotalMax = provisionTotalMax * varietyBoostMax * challengeBoostMax;

	return {
		provision_total: provisionTotal,
		provision_total_max: provisionTotalMax,
		variety_total: varietyTotal,
		variety_total_max: varietyTotalMax,
		challenge_total: challengeTotal,
		challenge_total_max: challengeTotalMax,
		sociability_total: sociabilityTotal,
		sociability_total_max: effectiveSociabilityTotalMax,
		play_value_total: question.constructs.includes("play_value") ? constructTotal : 0,
		play_value_total_max: question.constructs.includes("play_value") ? constructTotalMax : 0,
		usability_total: question.constructs.includes("usability") ? constructTotal : 0,
		usability_total_max: question.constructs.includes("usability") ? constructTotalMax : 0
	};
}
