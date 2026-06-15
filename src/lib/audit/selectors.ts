import type {
	AuditSession,
	ExecutionMode,
	InstrumentQuestion,
	InstrumentSection,
	PlayspaceInstrument,
	PreAuditQuestion,
	QuestionResponsePayload,
	QuestionScale
} from "@/types/audit";

export interface InstrumentSectionLocalProgress {
	readonly visibleQuestionCount: number;
	readonly answeredQuestionCount: number;
	readonly isComplete: boolean;
}

/**
 * Filter instrument sections down to those visible in the active execution mode.
 */
export function getVisibleSections(
	instrument: PlayspaceInstrument,
	executionMode: ExecutionMode | null,
	sectionResponsesBySection: Record<string, Record<string, QuestionResponsePayload>> = {}
): InstrumentSection[] {
	if (executionMode === null) {
		return [];
	}

	return instrument.sections
		.map(section => ({
			...section,
			questions: getVisibleQuestions(
				section.questions,
				executionMode,
				sectionResponsesBySection[section.section_key] ?? {}
			)
		}))
		.filter(section => section.questions.length > 0);
}

/**
 * Filter questions down to those visible for one execution mode.
 */
export function getVisibleQuestions(
	questions: readonly InstrumentQuestion[],
	executionMode: ExecutionMode,
	sectionResponses: Record<string, QuestionResponsePayload> = {}
): InstrumentQuestion[] {
	return questions.filter(question => {
		if (executionMode !== "both" && question.mode !== "both" && question.mode !== executionMode) {
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
			return selectedValue.some(entry => question.display_if?.any_of_option_keys.includes(entry));
		}

		return false;
	});
}

/**
 * Read the stored pre-audit values from the raw audit payload.
 */
export function getPreAuditValues(auditSession: AuditSession): Record<string, string | string[]> {
	return {
		place_size: auditSession.pre_audit.place_size ?? "",
		current_users_0_5: auditSession.pre_audit.current_users_0_5 ?? "",
		current_users_6_12: auditSession.pre_audit.current_users_6_12 ?? "",
		current_users_13_17: auditSession.pre_audit.current_users_13_17 ?? "",
		current_users_18_plus: auditSession.pre_audit.current_users_18_plus ?? "",
		playspace_busyness: auditSession.pre_audit.playspace_busyness ?? "",
		season: auditSession.pre_audit.season ?? "",
		weather_conditions: [...auditSession.pre_audit.weather_conditions],
		wind_conditions: auditSession.pre_audit.wind_conditions ?? ""
	};
}

/**
 * Filter setup questions down to those visible for one execution mode.
 */
export function getVisiblePreAuditQuestions(
	questions: readonly PreAuditQuestion[],
	executionMode: ExecutionMode | null
): PreAuditQuestion[] {
	if (executionMode === null) {
		return [...questions];
	}

	return questions.filter(question => question.visible_modes.includes(executionMode));
}

/**
 * Read one question's selected scale answers.
 */
export function getQuestionAnswers(
	auditSession: AuditSession,
	sectionKey: string,
	questionKey: string
): QuestionResponsePayload {
	return auditSession.sections[sectionKey]?.responses[questionKey] ?? {};
}

/**
 * List scale keys the user must answer for one question, given current selections.
 */
export function getActiveScaleKeysForQuestion(
	question: InstrumentQuestion,
	selectedAnswers: QuestionResponsePayload
): readonly string[] {
	if (question.question_type !== "scaled" || question.scales.length === 0) {
		return [];
	}

	const provisionScale = question.scales[0];
	if (provisionScale === undefined) {
		return [];
	}

	const selectedProvisionKey = selectedAnswers[provisionScale.key];
	const selectedProvisionOption = provisionScale.options.find(option => option.key === selectedProvisionKey);
	const showFollowUpScales = selectedProvisionOption?.allows_follow_up_scales === true;
	const keys: string[] = [provisionScale.key];

	if (showFollowUpScales) {
		for (let index = 1; index < question.scales.length; index += 1) {
			const scale = question.scales[index];
			if (scale !== undefined) {
				keys.push(scale.key);
			}
		}
	}

	return keys;
}

/**
 * Whether every visible scale for the question has a selected option.
 */
export function isInstrumentQuestionComplete(
	question: InstrumentQuestion,
	selectedAnswers: QuestionResponsePayload
): boolean {
	if (question.question_type === "checklist") {
		const selectedOptionKeys = selectedAnswers["selected_option_keys"];
		return Array.isArray(selectedOptionKeys) && selectedOptionKeys.length > 0;
	}

	if (question.scales.length === 0) {
		return false;
	}

	const requiredKeys = getActiveScaleKeysForQuestion(question, selectedAnswers);
	if (requiredKeys.length === 0) {
		return false;
	}

	return requiredKeys.every(scaleKey => {
		const value = selectedAnswers[scaleKey];
		return typeof value === "string" && value.trim().length > 0;
	});
}

/**
 * Aggregate answered count and completion for one section using local draft responses.
 */
export function getInstrumentSectionLocalProgress(
	section: InstrumentSection,
	responses: Record<string, QuestionResponsePayload>
): InstrumentSectionLocalProgress {
	const completionQuestions = section.questions.filter(question => question.required);
	const visibleQuestionCount = completionQuestions.length;
	let answeredQuestionCount = 0;

	for (const question of completionQuestions) {
		const selectedAnswers = responses[question.question_key] ?? {};
		if (isInstrumentQuestionComplete(question, selectedAnswers)) {
			answeredQuestionCount += 1;
		}
	}

	return {
		visibleQuestionCount,
		answeredQuestionCount,
		isComplete: visibleQuestionCount === 0 || answeredQuestionCount === visibleQuestionCount
	};
}

/**
 * Determine whether one pre-audit question is complete.
 */
export function isPreAuditQuestionComplete(question: PreAuditQuestion, value: string | string[] | undefined): boolean {
	if (!question.required) {
		return true;
	}

	if (question.input_type === "auto_timestamp") {
		return true;
	}

	if (question.input_type === "multi_select") {
		return Array.isArray(value) && value.some(optionValue => optionValue.trim().length > 0);
	}

	return typeof value === "string" && value.trim().length > 0;
}

/**
 * Determine whether every required pre-audit field is complete.
 */
export function isRequiredPreAuditComplete(
	questions: readonly PreAuditQuestion[],
	values: Record<string, string | string[]>,
	executionMode: ExecutionMode | null
): boolean {
	if (executionMode === null) {
		return false;
	}

	return getVisiblePreAuditQuestions(questions, executionMode).every(question =>
		isPreAuditQuestionComplete(question, values[question.key])
	);
}

/**
 * Apply one option selection and clear gated follow-up answers when needed.
 */
export function buildNextQuestionAnswers(
	currentAnswers: QuestionResponsePayload,
	question: { readonly scales: readonly QuestionScale[] },
	scaleKey: string,
	optionKey: string
): QuestionResponsePayload {
	const nextAnswers: QuestionResponsePayload = {
		...currentAnswers,
		[scaleKey]: optionKey
	};

	if (scaleKey !== "provision") {
		return nextAnswers;
	}

	const provisionScale = question.scales.find(scale => scale.key === "provision");
	const selectedOption = provisionScale?.options.find(option => option.key === optionKey);
	if (selectedOption?.allows_follow_up_scales !== false) {
		return nextAnswers;
	}

	const questionNote = typeof currentAnswers.question_note === "string" ? currentAnswers.question_note : null;
	return questionNote === null ? { provision: optionKey } : { provision: optionKey, question_note: questionNote };
}

/**
 * Format a backend question key (e.g. `q_8_1`) like the execution question card (`Q 8.1`).
 */
export function formatQuestionKeyForDisplay(questionKey: string): string {
	if (!questionKey.startsWith("q_")) {
		return questionKey;
	}
	const sections = questionKey.slice(2).split("_");
	return `Q ${sections.map(section => section.toUpperCase()).join(".")}`;
}
