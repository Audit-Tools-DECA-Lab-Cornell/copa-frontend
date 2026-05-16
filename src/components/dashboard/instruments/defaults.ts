import type {
	ChoiceOption,
	InstrumentQuestion,
	InstrumentSection,
	LegalDocument,
	LegalSection,
	PreAuditQuestion,
	QuestionScale,
	ScaleDefinition,
	ScaleOption
} from "@/types/audit";

export function makeDefaultScaleOption(): ScaleOption {
	return {
		key: "new_option",
		label: "New Option",
		addition_value: 0,
		boost_value: 0,
		allows_follow_up_scales: false,
		is_not_applicable: false
	};
}

export function makeDefaultChoiceOption(): ChoiceOption {
	return { key: "new_option", label: "New Option", description: null };
}

export function makeDefaultQuestionScale(): QuestionScale {
	return {
		key: "provision",
		title: "Provision",
		prompt: "How many?",
		options: [makeDefaultScaleOption()]
	};
}

export function makeDefaultQuestion(sectionKey: string, index: number): InstrumentQuestion {
	return {
		question_key: `q_${sectionKey.match(/\\d+/)?.[0] ?? "0"}_${index + 1}`,
		mode: "both",
		constructs: ["play_value"],
		domains: [],
		section_key: sectionKey,
		prompt: "New question prompt",
		question_type: "scaled",
		scales: [],
		options: [],
		required: true,
		display_if: null,
		notes_prompt: null
	};
}

export function makeDefaultSection(index: number): InstrumentSection {
	return {
		section_key: `section_${index + 1}_new`,
		title: "New Section",
		description: "",
		instruction: "Section instruction",
		notes_prompt: null,
		questions: []
	};
}

export function makeDefaultScaleDefinition(): ScaleDefinition {
	return {
		key: "provision",
		title: "New Scale",
		prompt: "Scale prompt",
		description: "Scale description",
		options: [makeDefaultScaleOption()]
	};
}

export function makeDefaultPreAuditQuestion(): PreAuditQuestion {
	return {
		key: "new_pre_audit_q",
		label: "New Pre-Audit Question",
		description: null,
		input_type: "single_select",
		required: false,
		options: [],
		page_key: "space_setup",
		visible_modes: ["audit", "survey", "both"],
		group_key: null
	};
}

export function makeDefaultExecutionMode(): ChoiceOption {
	return { key: "new_mode", label: "New Mode", description: null };
}

export function makeDefaultLegalSection(): LegalSection {
	return {
		key: "new_section",
		title: "New Section",
		body: [""],
		bullets: []
	};
}

export function makeDefaultLegalDocument(): LegalDocument {
	return {
		key: "new_document",
		short_title: "New Doc",
		title: "New Document",
		eyebrow: "Document category",
		last_updated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
		summary: "",
		sections: [makeDefaultLegalSection()]
	};
}
