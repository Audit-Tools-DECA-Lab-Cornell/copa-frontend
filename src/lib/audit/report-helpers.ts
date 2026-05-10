import type {
	AuditScoreTotals,
	AuditSession,
	InstrumentQuestion,
	PlayspaceInstrument,
	QuestionResponsePayload,
	QuestionScale,
	ScaleOption
} from "@/types/audit";

// ---------------------------------------------------------------------------
// Exported interfaces
// ---------------------------------------------------------------------------

/**
 * One domain bucket with data for short and extended report views.
 */
export interface DomainReportRow {
	readonly domainKey: string;
	readonly domainTitle: string;
	readonly scoreTotals: AuditScoreTotals | null;
	readonly itemCount: number;
	readonly sectionNotes: string[];
	readonly questions: DomainQuestionRow[];
}

/**
 * One instrument question row for the extended report items table.
 */
export interface DomainQuestionRow {
	readonly questionKey: string;
	readonly questionText: string;
	readonly provisionLabel: string | null;
	readonly diversityLabel: string | null;
	/** When `false`, the challenge column must show N/A (scale not present on question). */
	readonly challengeApplicable: boolean;
	readonly challengeLabel: string | null;
	readonly sociabilityLabel: string | null;
	readonly playValueScore: number | null;
	readonly playValueMax: number | null;
	readonly usabilityScore: number | null;
	readonly usabilityMax: number | null;
}

/**
 * Best/worst domain ranking for one scoring construct.
 */
export interface ConstructRanking {
	readonly constructKey: "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";
	readonly bestDomain: {
		domainTitle: string;
		score: number;
		max: number;
	} | null;
	readonly worstDomain: {
		domainTitle: string;
		score: number;
		max: number;
	} | null;
}

// ---------------------------------------------------------------------------
// Internal types & constants
// ---------------------------------------------------------------------------

type ConstructAccessor = {
	readonly key: ConstructRanking["constructKey"];
	readonly value: (totals: AuditScoreTotals) => number;
	readonly max: (totals: AuditScoreTotals) => number;
};

interface MultiplierScaleScore {
	readonly columnTotal: number;
	readonly boostValue: number;
}

const CONSTRUCT_ACCESSORS: readonly ConstructAccessor[] = [
	{
		key: "provision",
		value: t => t.provision_total,
		max: t => t.provision_total_max
	},
	{
		key: "diversity",
		value: t => t.diversity_total,
		max: t => t.diversity_total_max
	},
	{
		key: "challenge",
		value: t => t.challenge_total,
		max: t => t.challenge_total_max
	},
	{
		key: "sociability",
		value: t => t.sociability_total,
		max: t => t.sociability_total_max
	},
	{
		key: "play_value",
		value: t => t.play_value_total,
		max: t => t.play_value_total_max
	},
	{
		key: "usability",
		value: t => t.usability_total,
		max: t => t.usability_total_max
	}
];

const EMPTY_SCORE_TOTALS: AuditScoreTotals = {
	provision_total: 0,
	provision_total_max: 0,
	diversity_total: 0,
	diversity_total_max: 0,
	challenge_total: 0,
	challenge_total_max: 0,
	sociability_total: 0,
	sociability_total_max: 0,
	play_value_total: 0,
	play_value_total_max: 0,
	usability_total: 0,
	usability_total_max: 0
};

// ---------------------------------------------------------------------------
// Score calculation helpers (ported from mobile score-helpers.ts)
// ---------------------------------------------------------------------------

function createEmptyScoreTotals(): AuditScoreTotals {
	return { ...EMPTY_SCORE_TOTALS };
}

function formatScoreValue(value: number): string {
	return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function findScale(question: InstrumentQuestion, scaleKey: QuestionScale["key"]): QuestionScale | undefined {
	return question.scales.find(scale => scale.key === scaleKey);
}

function findScaleOption(scale: QuestionScale, optionKey: string): ScaleOption | undefined {
	return scale.options.find(option => option.key === optionKey);
}

function readProvisionScaleMaximum(question: InstrumentQuestion): number {
	const scale = findScale(question, "provision");
	if (scale === undefined) {
		return 0;
	}
	return scale.options.reduce((currentMaximum, option) => Math.max(currentMaximum, option.addition_value), 0);
}

function readMultiplierScaleScore(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	scaleKey: "diversity" | "challenge"
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
	scaleKey: "diversity" | "challenge"
): MultiplierScaleScore {
	const scale = findScale(question, scaleKey);
	if (scale === undefined) {
		return { columnTotal: 0, boostValue: 1 };
	}

	const columnTotal = scale.options.reduce(
		(currentMaximum, option) => Math.max(currentMaximum, Math.max(option.addition_value - 1, 0)),
		0
	);
	const boostValue = scale.options.reduce(
		(currentMaximum, option) => Math.max(currentMaximum, option.boost_value),
		1
	);
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

	return scale.options.reduce(
		(currentMaximum, option) => Math.max(currentMaximum, Math.max(option.addition_value - 1, 0)),
		0
	);
}

/**
 * Calculate one question's raw and maximum score totals using the same rules
 * as the backend response payload.
 *
 * @param question - Instrument question definition.
 * @param answers - Stored answer payload for the question.
 * @returns Question-level raw and maximum score totals.
 */
function calculateQuestionScores(question: InstrumentQuestion, answers: QuestionResponsePayload): AuditScoreTotals {
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

	const diversityScore = shouldReadFollowUpScales
		? readMultiplierScaleScore(question, answers, "diversity")
		: { columnTotal: 0, boostValue: 1 };
	const challengeScore = shouldReadFollowUpScales
		? readMultiplierScaleScore(question, answers, "challenge")
		: { columnTotal: 0, boostValue: 1 };
	const sociabilityTotal = shouldReadFollowUpScales ? readSociabilityScaleScore(question, answers) : 0;

	const diversityMaximum = readMultiplierScaleMaximum(question, "diversity");
	const challengeMaximum = readMultiplierScaleMaximum(question, "challenge");
	const sociabilityTotalMax = readSociabilityScaleMaximum(question);

	const constructTotal = provisionTotal * diversityScore.boostValue * challengeScore.boostValue;
	const constructTotalMax = provisionTotalMax * diversityMaximum.boostValue * challengeMaximum.boostValue;

	return {
		provision_total: provisionTotal,
		provision_total_max: provisionTotalMax,
		diversity_total: diversityScore.columnTotal,
		diversity_total_max: diversityMaximum.columnTotal,
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

// ---------------------------------------------------------------------------
// Domain/report helper internals
// ---------------------------------------------------------------------------

function normalizeDomainKey(domainKey: string): string {
	return domainKey.trim().toLowerCase().replace(/\s+/g, "_");
}

function toTokenSet(value: string): Set<string> {
	return new Set(
		value
			.toLowerCase()
			.replace(/[^a-z0-9\s_]/g, " ")
			.split(/[\s_]+/)
			.map(part => part.trim())
			.filter(part => part.length > 0)
	);
}

function countTokenOverlap(a: Set<string>, b: Set<string>): number {
	let count = 0;
	a.forEach(token => {
		if (b.has(token)) {
			count += 1;
		}
	});
	return count;
}

function readStringAnswer(answers: QuestionResponsePayload, key: string): string | undefined {
	const raw = answers[key];
	return typeof raw === "string" ? raw : undefined;
}

function buildDomainQuestionRow(question: InstrumentQuestion, answers: QuestionResponsePayload): DomainQuestionRow {
	const scores = calculateQuestionScores(question, answers);
	const provisionLabel = resolveScaleOptionLabel(question, "provision", readStringAnswer(answers, "provision"));
	const diversityLabel = resolveScaleOptionLabel(question, "diversity", readStringAnswer(answers, "diversity"));
	const challengeScale = question.scales.find(scale => scale.key === "challenge");
	const challengeApplicable = challengeScale !== undefined;
	const challengeLabel = challengeApplicable
		? resolveScaleOptionLabel(question, "challenge", readStringAnswer(answers, "challenge"))
		: null;
	const sociabilityLabel = resolveScaleOptionLabel(question, "sociability", readStringAnswer(answers, "sociability"));

	const playValueMax = scores.play_value_total_max;
	const usabilityMax = scores.usability_total_max;

	return {
		questionKey: question.question_key,
		questionText: question.prompt,
		provisionLabel,
		diversityLabel,
		challengeApplicable,
		challengeLabel,
		sociabilityLabel,
		playValueScore: playValueMax <= 0 ? null : scores.play_value_total,
		playValueMax: playValueMax <= 0 ? null : playValueMax,
		usabilityScore: usabilityMax <= 0 ? null : scores.usability_total,
		usabilityMax: usabilityMax <= 0 ? null : usabilityMax
	};
}

function collectSectionNote(
	auditSession: AuditSession,
	sectionKey: string,
	sectionIndex: number,
	sectionTitle: string
): string | null {
	const sectionState = auditSession.aggregate.sections[sectionKey];
	const raw = sectionState?.note;
	if (raw === null || raw === undefined) {
		return null;
	}
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return null;
	}
	return `${sectionIndex}. ${sectionTitle}: ${trimmed}`;
}

function collectQuestionNote(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	sectionIndex: number
): string | null {
	const raw = answers.question_note;
	if (typeof raw !== "string") {
		return null;
	}
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return null;
	}
	return `${sectionIndex}.${parseQuestionKeyParts(question.question_key).at(-1) ?? "?"} ${question.prompt.replaceAll("**", "")}: ${trimmed}`;
}

function parseQuestionKeyParts(questionKey: string): number[] {
	const matches = questionKey.match(/\d+/g);
	if (matches === null) {
		return [];
	}
	return matches.map(part => Number.parseInt(part, 10)).filter(value => Number.isFinite(value));
}

function compareQuestionRowsByIdentifier(a: DomainQuestionRow, b: DomainQuestionRow): number {
	const aParts = parseQuestionKeyParts(a.questionKey);
	const bParts = parseQuestionKeyParts(b.questionKey);
	const maxLength = Math.max(aParts.length, bParts.length);

	for (let index = 0; index < maxLength; index += 1) {
		const aValue = aParts[index];
		const bValue = bParts[index];
		if (aValue === undefined && bValue === undefined) {
			break;
		}
		if (aValue === undefined) {
			return -1;
		}
		if (bValue === undefined) {
			return 1;
		}
		if (aValue !== bValue) {
			return aValue - bValue;
		}
	}

	return a.questionKey.localeCompare(b.questionKey);
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Convert a snake_case domain key to a human title.
 *
 * @param domainKey - Backend domain identifier (e.g. `"cognitive_play"`).
 * @returns Title-cased label (e.g. `"Cognitive Play"`).
 */
export function toDomainTitle(domainKey: string): string {
	return domainKey
		.split("_")
		.map(word => (word.length === 0 ? "" : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
		.join(" ");
}

/**
 * Resolve the human label for a selected scale option.
 *
 * @param question - Instrument question definition.
 * @param scaleKey - Scale key (provision, diversity, etc.).
 * @param answerKey - Selected option key from responses.
 * @returns Option label or null when not applicable.
 */
export function resolveScaleOptionLabel(
	question: InstrumentQuestion,
	scaleKey: string,
	answerKey: string | undefined
): string | null {
	if (answerKey === undefined || answerKey.length === 0) {
		return null;
	}
	const scale = question.scales.find(candidate => candidate.key === scaleKey);
	if (scale === undefined) {
		return null;
	}
	const option = scale.options.find(candidate => candidate.key === answerKey);
	return option?.label ?? null;
}

/**
 * Return distinct non-empty domain keys for a question, preserving instrument order.
 * Questions may list multiple domains; each is included once.
 *
 * @param question - Instrument question with a `domains` array.
 * @returns Normalized domain keys in first-seen order.
 */
export function getQuestionDomainKeys(question: InstrumentQuestion): string[] {
	const ordered: string[] = [];
	const seen = new Set<string>();
	question.domains.forEach(domainKey => {
		const normalized = normalizeDomainKey(domainKey);
		if (normalized.length === 0) {
			return;
		}
		if (seen.has(normalized)) {
			return;
		}
		seen.add(normalized);
		ordered.push(normalized);
	});
	return ordered;
}

/**
 * Count distinct scaled questions that carry at least one domain (for the
 * overall score table row). Avoids double-counting questions that appear
 * under multiple domain sections.
 *
 * @param instrument - Full instrument definition.
 * @returns Number of unique scaled questions with assigned domains.
 */
export function countUniqueScaledQuestionsWithDomains(instrument: PlayspaceInstrument): number {
	const questionKeys = new Set<string>();
	instrument.sections.forEach(section => {
		section.questions.forEach(question => {
			if (question.question_type !== "scaled") {
				return;
			}
			if (getQuestionDomainKeys(question).length === 0) {
				return;
			}
			questionKeys.add(question.question_key);
		});
	});
	return questionKeys.size;
}

/**
 * Determine whether an instrument question is applicable to a given execution mode.
 * Mirrors the backend `_get_visible_questions` mode-gate logic.
 *
 * @param questionMode - The mode field on the instrument question ("audit" | "survey" | "both").
 * @param executionMode - The submission's execution mode, or null when not set.
 * @returns `true` when the question should be shown for the given execution mode.
 */
function isQuestionApplicableToMode(
	questionMode: "audit" | "survey" | "both",
	executionMode: "audit" | "survey" | "both" | null
): boolean {
	if (executionMode === null || executionMode === "both") {
		return true;
	}
	return questionMode === "both" || questionMode === executionMode;
}

/**
 * Build ordered domain rows from session scores and the instrument definition.
 *
 * @param auditSession - Loaded audit with scores and aggregate responses.
 * @param instrument - Localized instrument definition.
 * @returns One row per domain in first-seen instrument order, plus orphan `by_domain` keys.
 *          Questions may belong to multiple domains; each domain row lists every question
 *          that includes that domain, filtered to the submission's execution mode so that
 *          survey-only questions are excluded from Place Audit rows and vice versa.
 */
export function buildDomainReportRows(auditSession: AuditSession, instrument: PlayspaceInstrument): DomainReportRow[] {
	const byDomain = auditSession.scores.by_domain;
	const executionMode = auditSession.scores.execution_mode;
	const normalizedScoreByDomain = new Map<string, AuditScoreTotals | null>();
	Object.entries(byDomain).forEach(([rawDomainKey, totals]) => {
		const normalizedKey = normalizeDomainKey(rawDomainKey);
		if (normalizedKey.length === 0) {
			return;
		}
		const existing = normalizedScoreByDomain.get(normalizedKey) ?? null;
		if (existing === null && totals !== null) {
			normalizedScoreByDomain.set(normalizedKey, totals);
			return;
		}
		if (!normalizedScoreByDomain.has(normalizedKey)) {
			normalizedScoreByDomain.set(normalizedKey, totals);
		}
	});

	const firstSeenDomainOrder: string[] = [];
	const firstSeenSet = new Set<string>();
	const dominantDomainOrder: string[] = [];
	const dominantSet = new Set<string>();

	instrument.sections.forEach(section => {
		const sectionDomainCounts = new Map<string, number>();
		const sectionFirstSeenIndex = new Map<string, number>();
		let sectionOrderCounter = 0;

		section.questions.forEach(question => {
			if (!isQuestionApplicableToMode(question.mode, executionMode)) {
				return;
			}
			getQuestionDomainKeys(question).forEach(domainKey => {
				sectionDomainCounts.set(domainKey, (sectionDomainCounts.get(domainKey) ?? 0) + 1);
				if (!sectionFirstSeenIndex.has(domainKey)) {
					sectionFirstSeenIndex.set(domainKey, sectionOrderCounter);
					sectionOrderCounter += 1;
				}
				if (!firstSeenSet.has(domainKey)) {
					firstSeenSet.add(domainKey);
					firstSeenDomainOrder.push(domainKey);
				}
			});
		});

		let dominantDomain: string | null = null;
		let dominantCount = -1;
		let dominantIndex = Number.POSITIVE_INFINITY;
		const sectionTitleTokens = toTokenSet(section.title);
		let dominantTitleOverlap = -1;
		sectionDomainCounts.forEach((count, domainKey) => {
			const candidateIndex = sectionFirstSeenIndex.get(domainKey) ?? Number.POSITIVE_INFINITY;
			const domainTitleTokens = toTokenSet(toDomainTitle(domainKey));
			const titleOverlap = countTokenOverlap(sectionTitleTokens, domainTitleTokens);

			if (count > dominantCount) {
				dominantDomain = domainKey;
				dominantCount = count;
				dominantIndex = candidateIndex;
				dominantTitleOverlap = titleOverlap;
				return;
			}

			if (count === dominantCount) {
				if (titleOverlap > dominantTitleOverlap) {
					dominantDomain = domainKey;
					dominantCount = count;
					dominantIndex = candidateIndex;
					dominantTitleOverlap = titleOverlap;
					return;
				}
				if (titleOverlap === dominantTitleOverlap && candidateIndex < dominantIndex) {
					dominantDomain = domainKey;
					dominantCount = count;
					dominantIndex = candidateIndex;
					dominantTitleOverlap = titleOverlap;
				}
			}
		});

		if (dominantDomain !== null && !dominantSet.has(dominantDomain)) {
			dominantSet.add(dominantDomain);
			dominantDomainOrder.push(dominantDomain);
		}
	});

	const domainOrder: string[] = [...dominantDomainOrder];
	firstSeenDomainOrder.forEach(domainKey => {
		if (!dominantSet.has(domainKey)) {
			domainOrder.push(domainKey);
			dominantSet.add(domainKey);
		}
	});
	normalizedScoreByDomain.forEach((_totals, domainKey) => {
		if (!dominantSet.has(domainKey)) {
			domainOrder.push(domainKey);
			dominantSet.add(domainKey);
		}
	});

	return domainOrder.map(domainKey => {
		const scoreTotals = normalizedScoreByDomain.get(domainKey) ?? null;
		let itemCount = 0;
		const questions: DomainQuestionRow[] = [];
		const sectionNotes: string[] = [];

		instrument.sections.forEach((section, sectionIndex) => {
			let sectionTouchesDomain = false;
			section.questions.forEach(question => {
				if (!isQuestionApplicableToMode(question.mode, executionMode)) {
					return;
				}
				const domainKeysForQuestion = getQuestionDomainKeys(question);
				if (!domainKeysForQuestion.includes(domainKey)) {
					return;
				}
				sectionTouchesDomain = true;
				itemCount += 1;
				const responses =
					auditSession.aggregate.sections[section.section_key]?.responses[question.question_key] ?? {};
				if (question.question_type === "scaled") {
					questions.push(buildDomainQuestionRow(question, responses));
				}
				const questionNote = collectQuestionNote(question, responses, sectionIndex + 1);
				if (questionNote !== null) {
					sectionNotes.push(questionNote);
				}
			});
			if (sectionTouchesDomain) {
				const note = collectSectionNote(auditSession, section.section_key, sectionIndex + 1, section.title);
				if (note !== null) {
					sectionNotes.push(note);
				}
			}
		});

		questions.sort(compareQuestionRowsByIdentifier);

		return {
			domainKey,
			domainTitle: toDomainTitle(domainKey),
			scoreTotals,
			itemCount,
			sectionNotes,
			questions
		};
	});
}

/**
 * Build best- and worst-domain rankings for each construct.
 *
 * @param domainRows - Domain rows with titles and score totals.
 * @returns Six construct rankings in a stable order.
 */
export function buildConstructRankings(domainRows: DomainReportRow[]): ConstructRanking[] {
	return CONSTRUCT_ACCESSORS.map(accessor => {
		const candidates: {
			title: string;
			score: number;
			max: number;
			ratio: number;
		}[] = [];
		domainRows.forEach(row => {
			if (row.scoreTotals === null) {
				return;
			}
			const maximum = accessor.max(row.scoreTotals);
			if (maximum <= 0) {
				return;
			}
			const value = accessor.value(row.scoreTotals);
			const ratio = value / maximum;
			candidates.push({
				title: row.domainTitle,
				score: value,
				max: maximum,
				ratio
			});
		});

		if (candidates.length === 0) {
			return {
				constructKey: accessor.key,
				bestDomain: null,
				worstDomain: null
			};
		}

		const firstCandidate = candidates[0];
		if (firstCandidate === undefined) {
			return {
				constructKey: accessor.key,
				bestDomain: null,
				worstDomain: null
			};
		}

		let best = firstCandidate;
		let worst = firstCandidate;
		for (let index = 1; index < candidates.length; index += 1) {
			const current = candidates[index];
			if (current === undefined) {
				continue;
			}
			if (current.ratio > best.ratio) {
				best = current;
			}
			if (current.ratio < worst.ratio) {
				worst = current;
			}
		}

		return {
			constructKey: accessor.key,
			bestDomain: {
				domainTitle: best.title,
				score: best.score,
				max: best.max
			},
			worstDomain: {
				domainTitle: worst.title,
				score: worst.score,
				max: worst.max
			}
		};
	});
}

/**
 * Format a construct score line for best/worst cells.
 *
 * @param score - Raw score total.
 * @param max - Maximum score.
 * @returns Compact text for tables (e.g. `"12 / 20"` or `"3.5 / 6"`).
 */
export function formatConstructDomainLine(score: number, max: number): string {
	return `${formatScoreValue(score)} / ${formatScoreValue(max)}`;
}

/**
 * Rounded percent of max (0–100), used for report bar fill tiering (aligned with web UI).
 * @returns `null` when `max <= 0`.
 */
export function roundedPercentOfMax(value: number, max: number): number | null {
	if (max <= 0) {
		return null;
	}
	return Math.round((value / max) * 100);
}

/**
 * Bar color band from percentage: 70+ high, 40+ mid, below low, null → not assessed.
 * Matches the Playspace report bar visualization across web and mobile.
 */
export type ReportBarScoreTier = "na" | "high" | "mid" | "low";

export function reportBarScoreTier(percent: number | null): ReportBarScoreTier {
	if (percent === null) {
		return "na";
	}
	if (percent >= 70) {
		return "high";
	}
	if (percent >= 40) {
		return "mid";
	}
	return "low";
}
