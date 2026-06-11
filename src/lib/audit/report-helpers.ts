import type {
	AuditScoreTotals,
	AuditSession,
	InstrumentSection,
	InstrumentQuestion,
	PlayspaceInstrument,
	QuestionResponsePayload
} from "@/types/audit";
import { calculateQuestionScores, findScale, findScaleOption } from "@/lib/audit/question-scoring";
import {
	getCombinedReportSources,
	getReportSourceLabel,
	type ReportSourceComponent
} from "@/lib/audit/report-source-sessions";

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
	readonly rowKey: string;
	readonly questionKey: string;
	readonly questionText: string;
	readonly sourceComponent: ReportSourceComponent | null;
	readonly sourceLabel: string | null;
	readonly provisionLabel: string | null;
	readonly provisionApplicable: boolean;
	readonly provisionAnswered: boolean;
	readonly provisionIsNotApplicable: boolean;
	readonly provisionIsUnsure: boolean;
	readonly varietyLabel: string | null;
	readonly varietyApplicable: boolean;
	readonly varietyAnswered: boolean;
	readonly varietyIsNotApplicable: boolean;
	readonly varietyIsUnsure: boolean;
	/** When `false`, the challenge column must show N/A (scale not present on question). */
	readonly challengeApplicable: boolean;
	readonly challengeLabel: string | null;
	readonly challengeAnswered: boolean;
	readonly challengeIsNotApplicable: boolean;
	readonly challengeIsUnsure: boolean;
	readonly sociabilityLabel: string | null;
	readonly sociabilityApplicable: boolean;
	readonly sociabilityAnswered: boolean;
	readonly sociabilityIsNotApplicable: boolean;
	readonly sociabilityIsUnsure: boolean;
	readonly followUpScalesAsked: boolean;
	readonly playValueScore: number | null;
	readonly playValueMax: number | null;
	readonly usabilityScore: number | null;
	readonly usabilityMax: number | null;
	readonly checklistAnswerLabel: string | null;
}

/**
 * One visible question row resolved against either a full-assessment session or one
 * source session inside a combined place report.
 */
export interface VisibleQuestionEntry {
	readonly rowKey: string;
	readonly question: InstrumentQuestion;
	readonly answers: QuestionResponsePayload;
	readonly sourceComponent: ReportSourceComponent | null;
	readonly sourceLabel: string | null;
}

/**
 * Best/worst domain ranking for one scoring construct.
 */
export interface ConstructRanking {
	readonly constructKey: "provision" | "variety" | "challenge" | "sociability" | "play_value" | "usability";
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

const CONSTRUCT_ACCESSORS: readonly ConstructAccessor[] = [
	{
		key: "provision",
		value: t => t.provision_total,
		max: t => t.provision_total_max
	},
	{
		key: "variety",
		value: t => t.variety_total,
		max: t => t.variety_total_max
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

function formatScoreValue(value: number): string {
	return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatChecklistAnswerLabel(question: InstrumentQuestion, answers: QuestionResponsePayload): string | null {
	const selectedOptionKeys = answers.selected_option_keys;
	if (!Array.isArray(selectedOptionKeys) || selectedOptionKeys.length === 0) {
		return null;
	}

	const labels = selectedOptionKeys
		.filter((key): key is string => typeof key === "string")
		.map(key => question.options.find(option => option.key === key)?.label ?? key);
	const otherDetails = answers.other_details;
	if (typeof otherDetails === "object" && otherDetails !== null && !Array.isArray(otherDetails)) {
		const text = otherDetails.text;
		if (typeof text === "string" && text.trim().length > 0) {
			labels.push(`Other: ${text.trim()}`);
		}
	}

	return labels.length > 0 ? labels.join(" | ") : null;
}

function buildDomainQuestionRow(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	sourceComponent: ReportSourceComponent | null
): DomainQuestionRow {
	const scores = calculateQuestionScores(question, answers);
	const provisionAnswerKey = readStringAnswer(answers, "provision");
	const provisionInfo = resolveScaleOptionInfo(question, "provision", provisionAnswerKey);
	const provisionScale = findScale(question, "provision");
	const provisionApplicable = provisionScale !== undefined;
	const provisionOption =
		provisionScale === undefined || provisionAnswerKey === undefined
			? undefined
			: findScaleOption(provisionScale, provisionAnswerKey);
	const followUpScalesAsked = provisionOption?.allows_follow_up_scales === true;
	const varietyInfo = resolveScaleOptionInfo(question, "variety", readStringAnswer(answers, "variety"));
	const varietyApplicable = findScale(question, "variety") !== undefined;
	const challengeInfo = resolveScaleOptionInfo(question, "challenge", readStringAnswer(answers, "challenge"));
	const challengeApplicable = findScale(question, "challenge") !== undefined;
	const sociabilityInfo = resolveScaleOptionInfo(question, "sociability", readStringAnswer(answers, "sociability"));
	const sociabilityApplicable = findScale(question, "sociability") !== undefined;

	const playValueMax = scores.play_value_total_max;
	const usabilityMax = scores.usability_total_max;

	return {
		rowKey: buildQuestionRowKey(question.question_key, sourceComponent),
		questionKey: question.question_key,
		questionText: question.prompt,
		sourceComponent,
		sourceLabel: sourceComponent === null ? null : getReportSourceLabel(sourceComponent),
		provisionLabel: provisionInfo.label,
		provisionApplicable,
		provisionAnswered: provisionInfo.answered,
		provisionIsNotApplicable: provisionInfo.isNotApplicable,
		provisionIsUnsure: provisionInfo.isUnsure,
		varietyLabel: varietyInfo.label,
		varietyApplicable,
		varietyAnswered: varietyInfo.answered,
		varietyIsNotApplicable: varietyInfo.isNotApplicable,
		varietyIsUnsure: varietyInfo.isUnsure,
		challengeApplicable,
		challengeLabel: challengeInfo.label,
		challengeAnswered: challengeInfo.answered,
		challengeIsNotApplicable: challengeInfo.isNotApplicable,
		challengeIsUnsure: challengeInfo.isUnsure,
		sociabilityLabel: sociabilityInfo.label,
		sociabilityApplicable,
		sociabilityAnswered: sociabilityInfo.answered,
		sociabilityIsNotApplicable: sociabilityInfo.isNotApplicable,
		sociabilityIsUnsure: sociabilityInfo.isUnsure,
		followUpScalesAsked,
		playValueScore: playValueMax <= 0 ? null : scores.play_value_total,
		playValueMax: playValueMax <= 0 ? null : playValueMax,
		usabilityScore: usabilityMax <= 0 ? null : scores.usability_total,
		usabilityMax: usabilityMax <= 0 ? null : usabilityMax,
		checklistAnswerLabel:
			question.question_type === "checklist" ? formatChecklistAnswerLabel(question, answers) : null
	};
}

function compareReportSourceComponents(
	left: ReportSourceComponent | null,
	right: ReportSourceComponent | null
): number {
	const order: Record<ReportSourceComponent, number> = {
		audit: 0,
		survey: 1
	};
	if (left === right) {
		return 0;
	}
	if (left === null) {
		return -1;
	}
	if (right === null) {
		return 1;
	}
	return order[left] - order[right];
}

function collectSectionNote(
	auditSession: AuditSession,
	sectionKey: string,
	sectionIndex: number,
	sectionTitle: string,
	sourceLabel: string | null
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
	const sourceSuffix = sourceLabel === null ? "" : ` (${sourceLabel})`;
	return `${sectionIndex}. ${sectionTitle}${sourceSuffix}: ${trimmed}`;
}

function collectQuestionNote(
	question: InstrumentQuestion,
	answers: QuestionResponsePayload,
	sectionIndex: number,
	sourceLabel: string | null
): string | null {
	const raw = answers.question_note;
	if (typeof raw !== "string") {
		return null;
	}
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return null;
	}
	const questionIdentifier = `${sectionIndex}.${parseQuestionKeyParts(question.question_key).at(-1) ?? "?"}`;
	const sourcePrefix = sourceLabel === null ? "" : `${sourceLabel} `;
	return `${questionIdentifier} ${sourcePrefix}${question.prompt.replaceAll("**", "")}: ${trimmed}`;
}

function parseQuestionKeyParts(questionKey: string): number[] {
	const matches = questionKey.match(/\d+/g);
	if (matches === null) {
		return [];
	}
	return matches.map(part => Number.parseInt(part, 10)).filter(value => Number.isFinite(value));
}

function buildQuestionRowKey(questionKey: string, sourceComponent: ReportSourceComponent | null): string {
	if (sourceComponent === null) {
		return questionKey;
	}
	return `${questionKey}::${sourceComponent}`;
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

	const byQuestionKey = a.questionKey.localeCompare(b.questionKey);
	if (byQuestionKey !== 0) {
		return byQuestionKey;
	}

	const bySource = compareReportSourceComponents(a.sourceComponent, b.sourceComponent);
	if (bySource !== 0) {
		return bySource;
	}

	return a.rowKey.localeCompare(b.rowKey);
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
 * Resolve the human label and state for a selected scale option.
 *
 * @param question - Instrument question definition.
 * @param scaleKey - Scale key (provision, variety, etc.).
 * @param answerKey - Selected option key from responses.
 * @returns Label and answer-state metadata for report rendering.
 */
export function resolveScaleOptionInfo(
	question: InstrumentQuestion,
	scaleKey: string,
	answerKey: string | undefined
): { label: string | null; answered: boolean; isNotApplicable: boolean; isUnsure: boolean } {
	if (answerKey === undefined || answerKey.length === 0) {
		return { label: null, answered: false, isNotApplicable: false, isUnsure: false };
	}
	const scale = question.scales.find(candidate => candidate.key === scaleKey);
	if (scale === undefined) {
		return { label: null, answered: false, isNotApplicable: false, isUnsure: false };
	}
	const option = scale.options.find(candidate => candidate.key === answerKey);
	return {
		label: option?.label ?? null,
		answered: option !== undefined,
		isNotApplicable: option?.is_not_applicable === true,
		isUnsure: option?.is_unsure === true
	};
}

function resolveQuestionDomainKeys(
	question: InstrumentQuestion,
	questionLookup: Readonly<Record<string, InstrumentQuestion>> | undefined,
	visitedQuestionKeys: Set<string>
): string[] {
	const ordered: string[] = [];
	const seen = new Set<string>();
	question.domains.forEach(domainKey => {
		const normalized = normalizeDomainKey(domainKey);
		if (normalized.length === 0 || seen.has(normalized)) {
			return;
		}
		seen.add(normalized);
		ordered.push(normalized);
	});
	if (ordered.length > 0) {
		return ordered;
	}

	const parentQuestionKey = question.display_if?.question_key;
	if (questionLookup === undefined || parentQuestionKey === undefined || visitedQuestionKeys.has(parentQuestionKey)) {
		return ordered;
	}

	const parentQuestion = questionLookup[parentQuestionKey];
	if (parentQuestion === undefined) {
		return ordered;
	}

	const nextVisitedQuestionKeys = new Set(visitedQuestionKeys);
	nextVisitedQuestionKeys.add(parentQuestionKey);
	return resolveQuestionDomainKeys(parentQuestion, questionLookup, nextVisitedQuestionKeys);
}

/**
 * Return distinct non-empty domain keys for a question, preserving instrument order.
 * Questions may list multiple domains; each is included once.
 *
 * @param question - Instrument question with a `domains` array.
 * @param questionLookup - Optional lookup used when a domain-less child question
 * inherits its domain assignment from a conditional parent question.
 * @returns Normalized domain keys in first-seen order.
 */
export function getQuestionDomainKeys(
	question: InstrumentQuestion,
	questionLookup?: Readonly<Record<string, InstrumentQuestion>>
): string[] {
	return resolveQuestionDomainKeys(question, questionLookup, new Set([question.question_key]));
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
	const questionLookup = Object.fromEntries(
		instrument.sections.flatMap(section =>
			section.questions.map(question => [question.question_key, question] as const)
		)
	) as Readonly<Record<string, InstrumentQuestion>>;
	const questionKeys = new Set<string>();
	instrument.sections.forEach(section => {
		section.questions.forEach(question => {
			if (question.question_type !== "scaled") {
				return;
			}
			if (getQuestionDomainKeys(question, questionLookup).length === 0) {
				return;
			}
			questionKeys.add(question.question_key);
		});
	});
	return questionKeys.size;
}

function resolveExecutionMode(auditSession: AuditSession): "audit" | "survey" | "both" | null {
	return auditSession.selected_execution_mode ?? auditSession.meta.execution_mode;
}

/**
 * Mirrors the execution/runtime question visibility rules, including conditional children.
 */
function isQuestionVisibleForSession(
	question: InstrumentQuestion,
	executionMode: "audit" | "survey" | "both" | null,
	sectionResponses: Record<string, QuestionResponsePayload>
): boolean {
	if (
		executionMode !== null &&
		executionMode !== "both" &&
		question.mode !== "both" &&
		question.mode !== executionMode
	) {
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
		return selectedValue.some(
			entry => typeof entry === "string" && question.display_if?.any_of_option_keys.includes(entry)
		);
	}

	return false;
}

function buildVisibleQuestionEntriesForSession(
	auditSession: AuditSession,
	section: InstrumentSection,
	sourceComponent: ReportSourceComponent | null
): VisibleQuestionEntry[] {
	const sectionState = auditSession.aggregate.sections[section.section_key];
	const sectionResponses = sectionState?.responses ?? {};
	const executionMode = resolveExecutionMode(auditSession);
	const visibleEntries: VisibleQuestionEntry[] = [];

	section.questions.forEach(question => {
		if (!isQuestionVisibleForSession(question, executionMode, sectionResponses)) {
			return;
		}
		visibleEntries.push({
			rowKey: buildQuestionRowKey(question.question_key, sourceComponent),
			question,
			answers: sectionResponses[question.question_key] ?? {},
			sourceComponent,
			sourceLabel: sourceComponent === null ? null : getReportSourceLabel(sourceComponent)
		});
	});

	return visibleEntries;
}

/**
 * Resolve the visible question rows for one section, preserving instrument order while
 * duplicating shared questions when a combined report has separate audit and survey sources.
 */
export function buildVisibleQuestionEntries(
	auditSession: AuditSession,
	section: InstrumentSection
): VisibleQuestionEntry[] {
	const combinedSources = getCombinedReportSources(auditSession);
	if (combinedSources === null) {
		return buildVisibleQuestionEntriesForSession(auditSession, section, null);
	}

	const visibleEntries: VisibleQuestionEntry[] = [];
	section.questions.forEach(question => {
		(["audit", "survey"] as const).forEach(sourceComponent => {
			const sourceSession = combinedSources[sourceComponent];
			const sectionState = sourceSession.aggregate.sections[section.section_key];
			const sectionResponses = sectionState?.responses ?? {};
			const executionMode = resolveExecutionMode(sourceSession);
			if (!isQuestionVisibleForSession(question, executionMode, sectionResponses)) {
				return;
			}
			visibleEntries.push({
				rowKey: buildQuestionRowKey(question.question_key, sourceComponent),
				question,
				answers: sectionResponses[question.question_key] ?? {},
				sourceComponent,
				sourceLabel: getReportSourceLabel(sourceComponent)
			});
		});
	});

	return visibleEntries;
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
	const questionLookup = Object.fromEntries(
		instrument.sections.flatMap(section =>
			section.questions.map(question => [question.question_key, question] as const)
		)
	) as Readonly<Record<string, InstrumentQuestion>>;
	const byDomain = auditSession.scores.by_domain;
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

		buildVisibleQuestionEntries(auditSession, section).forEach(({ question }) => {
			getQuestionDomainKeys(question, questionLookup).forEach(domainKey => {
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
			const visibleEntries = buildVisibleQuestionEntries(auditSession, section);
			visibleEntries.forEach(({ question, answers, sourceComponent, sourceLabel }) => {
				const domainKeysForQuestion = getQuestionDomainKeys(question, questionLookup);
				if (!domainKeysForQuestion.includes(domainKey)) {
					return;
				}
				sectionTouchesDomain = true;
				itemCount += 1;
				if (question.question_type === "scaled" || question.question_type === "checklist") {
					questions.push(buildDomainQuestionRow(question, answers, sourceComponent));
				}
				const questionNote = collectQuestionNote(question, answers, sectionIndex + 1, sourceLabel);
				if (questionNote !== null) {
					sectionNotes.push(questionNote);
				}
			});
			if (sectionTouchesDomain) {
				const combinedSources = getCombinedReportSources(auditSession);
				if (combinedSources === null) {
					const note = collectSectionNote(
						auditSession,
						section.section_key,
						sectionIndex + 1,
						section.title,
						null
					);
					if (note !== null) {
						sectionNotes.push(note);
					}
				} else {
					(["audit", "survey"] as const).forEach(sourceComponent => {
						const note = collectSectionNote(
							combinedSources[sourceComponent],
							section.section_key,
							sectionIndex + 1,
							section.title,
							getReportSourceLabel(sourceComponent)
						);
						if (note !== null) {
							sectionNotes.push(note);
						}
					});
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
 * Bar color band from percentage: 66.6+ high, 33.3+ mid, below low, null → not assessed.
 * Matches the Playspace report bar visualization across web and mobile.
 */
export type ReportBarScoreTier = "na" | "high" | "mid" | "low";

export function reportBarScoreTier(percent: number | null): ReportBarScoreTier {
	if (percent === null) {
		return "na";
	}
	if (percent >= 66.6) {
		return "high";
	}
	if (percent >= 33.3) {
		return "mid";
	}
	return "low";
}
