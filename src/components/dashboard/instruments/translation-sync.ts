/**
 * Keeping translations answerable with the same keys as the base language.
 *
 * Answers are stored by key, so a translation whose option list has different
 * keys, a different order, or different scoring would score an audit
 * differently from the language it was written in. Structure, identity, scoring
 * and flags therefore come from the base language; each translation keeps only
 * its own display copy.
 */

import type { ChoiceOption, PlayspaceInstrument, ScaleOption } from "@/types/audit";

import { type OptionOwnerScope, scopeId } from "./option-keys";
import type { InstrumentContent, Lang } from "./types";

/** Every answer list in one language, keyed the same way in every language. */
function optionKeyFingerprint(
	instrument: PlayspaceInstrument
): Map<string, { scope: OptionOwnerScope; keys: string[] }> {
	const fingerprint = new Map<string, { scope: OptionOwnerScope; keys: string[] }>();
	const add = (scope: OptionOwnerScope, options: readonly { key: string }[]) => {
		fingerprint.set(scopeId(scope), { scope, keys: options.map(option => option.key) });
	};
	for (const guidance of instrument.scale_guidance) {
		add({ kind: "scaleGuidance", scaleKey: guidance.key }, guidance.options);
	}
	for (const section of instrument.sections) {
		for (const question of section.questions) {
			for (const scale of question.scales) {
				add(
					{
						kind: "questionScale",
						sectionKey: section.section_key,
						questionKey: question.question_key,
						scaleKey: scale.key
					},
					scale.options
				);
			}
			if (question.options.length > 0) {
				add(
					{ kind: "checklist", sectionKey: section.section_key, questionKey: question.question_key },
					question.options
				);
			}
		}
	}
	for (const question of instrument.pre_audit_questions) {
		if (question.options.length > 0) {
			add({ kind: "preAudit", questionKey: question.key }, question.options);
		}
	}
	return fingerprint;
}

/**
 * One answer list where a translation disagrees with the base language. It
 * carries the list's structured address so the editor can open it and describe
 * it in the admin's terms, not as an internal path.
 */
export type LocaleMismatch = Readonly<{
	locale: string;
	scope: OptionOwnerScope;
	reason: "missing" | "extra" | "different";
}>;

/**
 * List the answer lists where a translation disagrees with the base language.
 *
 * An empty result means structural edits can safely be mirrored into every
 * translation. Anything else has to be resolved deliberately, because matching
 * lists by position or by label would guess at which answer is which.
 */
export function findLocaleMismatches(content: InstrumentContent, baseLang: string): LocaleMismatch[] {
	const base = content[baseLang as Lang];
	if (!base) return [];
	const baseFingerprint = optionKeyFingerprint(base);
	const mismatches: LocaleMismatch[] = [];

	for (const [locale, instrument] of Object.entries(content)) {
		if (locale === baseLang || !instrument) continue;
		const fingerprint = optionKeyFingerprint(instrument);
		for (const [owner, { scope, keys: baseKeys }] of baseFingerprint) {
			const keys = fingerprint.get(owner)?.keys;
			if (keys === undefined) {
				mismatches.push({ locale, scope, reason: "missing" });
				continue;
			}
			if (keys.length !== baseKeys.length || keys.some((key, index) => key !== baseKeys[index])) {
				mismatches.push({ locale, scope, reason: "different" });
			}
		}
		for (const [owner, { scope }] of fingerprint) {
			if (!baseFingerprint.has(owner)) {
				mismatches.push({ locale, scope, reason: "extra" });
			}
		}
	}
	return mismatches;
}

function mergeScaleOptions(baseOptions: ScaleOption[], translated: ScaleOption[]): ScaleOption[] {
	const byKey = new Map(translated.map(option => [option.key, option]));
	return baseOptions.map(option => {
		const existing = byKey.get(option.key);
		// Identity, order, scoring and flags come from the base; only the label is
		// the translation's own. A brand-new answer shows the base wording until
		// it is translated.
		return { ...option, label: existing?.label ?? option.label };
	});
}

function mergeChoiceOptions(baseOptions: ChoiceOption[], translated: ChoiceOption[]): ChoiceOption[] {
	const byKey = new Map(translated.map(option => [option.key, option]));
	return baseOptions.map(option => {
		const existing = byKey.get(option.key);
		return {
			...option,
			label: existing?.label ?? option.label,
			description: existing?.description ?? option.description
		};
	});
}

/**
 * Rebuild every translation from the base language's structure.
 *
 * Only runs when the bundle already lines up; a misaligned import is sent to the
 * repair flow instead, where the differences are shown before anything changes.
 */
export function syncTranslationsToBase(content: InstrumentContent, baseLang: string): InstrumentContent {
	const base = content[baseLang as Lang];
	if (!base) return content;

	const next: InstrumentContent = { ...content };
	for (const [locale, instrument] of Object.entries(content)) {
		if (locale === baseLang || !instrument) continue;

		const translatedSections = new Map(instrument.sections.map(section => [section.section_key, section]));
		const translatedPreAudit = new Map(instrument.pre_audit_questions.map(question => [question.key, question]));
		const translatedGuidance = new Map(instrument.scale_guidance.map(guidance => [guidance.key, guidance]));
		const translatedModes = new Map(instrument.execution_modes.map(mode => [mode.key, mode]));
		const translatedDocuments = new Map(instrument.legal_documents.map(document => [document.key, document]));

		next[locale as Lang] = {
			...base,
			instrument_name: instrument.instrument_name,
			current_sheet: instrument.current_sheet,
			// Paragraphs and legal text carry no keys, so they follow the base
			// language's shape while each translation keeps the wording it has.
			preamble: base.preamble.map((paragraph, index) => instrument.preamble[index] ?? paragraph),
			legal_documents: base.legal_documents.map(document => {
				const existing = translatedDocuments.get(document.key);
				return existing ?? document;
			}),
			execution_modes: base.execution_modes.map(mode => {
				const existing = translatedModes.get(mode.key);
				return {
					...mode,
					label: existing?.label ?? mode.label,
					description: existing?.description ?? mode.description
				};
			}),
			scale_guidance: base.scale_guidance.map(guidance => {
				const existing = translatedGuidance.get(guidance.key);
				return {
					...guidance,
					title: existing?.title ?? guidance.title,
					prompt: existing?.prompt ?? guidance.prompt,
					description: existing?.description ?? guidance.description,
					options: mergeScaleOptions(guidance.options, existing?.options ?? [])
				};
			}),
			pre_audit_questions: base.pre_audit_questions.map(question => {
				const existing = translatedPreAudit.get(question.key);
				return {
					...question,
					label: existing?.label ?? question.label,
					description: existing?.description ?? question.description,
					options: mergeChoiceOptions(question.options, existing?.options ?? [])
				};
			}),
			sections: base.sections.map(section => {
				const existingSection = translatedSections.get(section.section_key);
				const translatedQuestions = new Map(
					(existingSection?.questions ?? []).map(question => [question.question_key, question])
				);
				return {
					...section,
					title: existingSection?.title ?? section.title,
					description: existingSection?.description ?? section.description,
					instruction: existingSection?.instruction ?? section.instruction,
					notes_prompt: existingSection?.notes_prompt ?? section.notes_prompt,
					questions: section.questions.map(question => {
						const existingQuestion = translatedQuestions.get(question.question_key);
						const translatedScales = new Map(
							(existingQuestion?.scales ?? []).map(scale => [scale.key, scale])
						);
						return {
							...question,
							prompt: existingQuestion?.prompt ?? question.prompt,
							notes_prompt: existingQuestion?.notes_prompt ?? question.notes_prompt,
							options: mergeChoiceOptions(question.options, existingQuestion?.options ?? []),
							scales: question.scales.map(scale => {
								const existingScale = translatedScales.get(scale.key);
								return {
									...scale,
									title: existingScale?.title ?? scale.title,
									prompt: existingScale?.prompt ?? scale.prompt,
									options: mergeScaleOptions(scale.options, existingScale?.options ?? [])
								};
							})
						};
					})
				};
			})
		};
	}
	return next;
}
