/**
 * Repairing a copy of an instrument whose answers cannot be told apart.
 *
 * Published versions are never patched: the admin works on a copy, sees the
 * exact rows that will change before anything happens, and keeps every label,
 * score, flag, order and valid key. Rows are found by position within their
 * owning list, because their keys - blank, repeated, or left on the placeholder -
 * are precisely what cannot be trusted to identify them.
 */

import type { PlayspaceInstrument } from "@/types/audit";

import { collectOwningLists, scopeOwnerLabel } from "./instrument-issues";
import {
	checkStoredOptionKey,
	defaultKeyGenerator,
	isScaleOptionScope,
	type KeyGenerator,
	mintOptionKey,
	type OptionKeyIssueCode,
	type OptionOwnerScope,
	scopeId
} from "./option-keys";
import { findLocaleMismatches, type LocaleMismatch } from "./translation-sync";
import type { InstrumentContent, Lang } from "./types";

export type OptionKeyRepair = Readonly<{
	id: string;
	scope: OptionOwnerScope;
	optionIndex: number;
	oldKey: string;
	newKey: string;
	label: string;
	reason: OptionKeyIssueCode;
	location: string;
}>;

/**
 * A follow-up question that points at a key several answers share. Which answer
 * was meant cannot be read from the file, so the admin picks it.
 */
export type ConditionChoice = Readonly<{
	id: string;
	sectionKey: string;
	questionKey: string;
	ambiguousKey: string;
	sourceQuestionKey: string;
	candidates: ReadonlyArray<{ newKey: string; label: string; position: number }>;
}>;

export type RepairPlan = Readonly<{
	repairs: readonly OptionKeyRepair[];
	conditionChoices: readonly ConditionChoice[];
	/** Translations whose answer lists do not line up; repairing would have to guess. */
	blockedMismatches: readonly LocaleMismatch[];
	/** True when no new key could be minted at all, so nothing could be planned. */
	generatorUnavailable: boolean;
	repairable: boolean;
}>;

function repairLocation(scope: OptionOwnerScope, index: number): string {
	return `${scopeOwnerLabel(scope)} · row ${index + 1}`;
}

/**
 * Work out the smallest set of changes that makes every answer addressable.
 *
 * Only rows that fail a rule get a new key. A duplicate group has every one of
 * its rows renamed: designating the first as "the intended answer" would be a
 * guess about which audits meant what.
 */
export function planOptionKeyRepairs(
	content: InstrumentContent,
	baseLang: string,
	generate: KeyGenerator = defaultKeyGenerator
): RepairPlan {
	const base = content[baseLang as Lang];
	const blockedMismatches = findLocaleMismatches(content, baseLang);
	if (!base) {
		return {
			repairs: [],
			conditionChoices: [],
			blockedMismatches,
			generatorUnavailable: false,
			repairable: false
		};
	}

	const repairs: OptionKeyRepair[] = [];
	const minted = new Set<string>();
	// Per owner: the replacement keys assigned to each broken source key, which the
	// condition pass below needs to rewrite references.
	const replacementsByOwner = new Map<string, Map<string, OptionKeyRepair[]>>();

	for (const { scope, options } of collectOwningLists(base)) {
		const scaleOption = isScaleOptionScope(scope);
		const seen = new Set<string>();
		const firstIndexByKey = new Map<string, number>();
		const brokenIndexes: { index: number; reason: OptionKeyIssueCode }[] = [];

		options.forEach((option, index) => {
			const check = checkStoredOptionKey(option.key, seen, { scaleOption });
			// The first row to use a key is recorded whether or not it passed on its
			// own: once a later row repeats it, neither row is identifiable and both
			// need a fresh key. Leaving the first one alone would silently declare it
			// the answer every existing audit meant.
			const firstIndex = firstIndexByKey.get(option.key);
			if (firstIndex === undefined) {
				firstIndexByKey.set(option.key, index);
			}
			if (check.ok) {
				seen.add(option.key);
				return;
			}
			if (
				check.code === "duplicate" &&
				firstIndex !== undefined &&
				!brokenIndexes.some(entry => entry.index === firstIndex)
			) {
				brokenIndexes.push({ index: firstIndex, reason: "duplicate" });
			}
			brokenIndexes.push({ index, reason: check.code });
		});

		// Keys already present in this list stay reserved so a replacement can never
		// collide with a row that is being kept.
		const taken = new Set([...options.map(option => option.key), ...minted]);
		const ownerId = scopeId(scope);
		for (const { index, reason } of brokenIndexes.sort((a, b) => a.index - b.index)) {
			const option = options[index];
			const newKey = mintOptionKey(taken, generate);
			if (newKey === null) {
				// Distinct from "nothing to repair": the problems are real, but this
				// browser cannot produce an identifier to replace them with.
				return {
					repairs: [],
					conditionChoices: [],
					blockedMismatches,
					generatorUnavailable: true,
					repairable: false
				};
			}
			taken.add(newKey);
			minted.add(newKey);
			const repair: OptionKeyRepair = {
				id: `${ownerId}:${index}`,
				scope,
				optionIndex: index,
				oldKey: option.key,
				newKey,
				label: option.label,
				reason,
				location: repairLocation(scope, index)
			};
			repairs.push(repair);
			const ownerBucket = replacementsByOwner.get(ownerId) ?? new Map<string, OptionKeyRepair[]>();
			const keyBucket = ownerBucket.get(option.key) ?? [];
			keyBucket.push(repair);
			ownerBucket.set(option.key, keyBucket);
			replacementsByOwner.set(ownerId, ownerBucket);
		}
	}

	const conditionChoices = planConditionChoices(base, replacementsByOwner);
	return {
		repairs,
		conditionChoices,
		blockedMismatches,
		generatorUnavailable: false,
		repairable: repairs.length > 0 && blockedMismatches.length === 0
	};
}

function ownerIdForCondition(
	instrument: PlayspaceInstrument,
	sectionKey: string,
	sourceQuestionKey: string,
	responseKey: string
): string | null {
	const section = instrument.sections.find(candidate => candidate.section_key === sectionKey);
	const question = section?.questions.find(candidate => candidate.question_key === sourceQuestionKey);
	if (!question) return null;
	if ((question.question_type ?? "scaled") === "checklist") {
		return scopeId({ kind: "checklist", sectionKey, questionKey: sourceQuestionKey });
	}
	const scale = question.scales.find(candidate => candidate.key === responseKey);
	if (!scale) return null;
	return scopeId({ kind: "questionScale", sectionKey, questionKey: sourceQuestionKey, scaleKey: scale.key });
}

function planConditionChoices(
	instrument: PlayspaceInstrument,
	replacementsByOwner: Map<string, Map<string, OptionKeyRepair[]>>
): ConditionChoice[] {
	const choices: ConditionChoice[] = [];
	for (const section of instrument.sections) {
		for (const question of section.questions) {
			const condition = question.display_if;
			if (!condition) continue;
			const ownerId = ownerIdForCondition(
				instrument,
				section.section_key,
				condition.question_key,
				condition.response_key
			);
			if (ownerId === null) continue;
			const replacements = replacementsByOwner.get(ownerId);
			if (!replacements) continue;

			for (const referencedKey of condition.any_of_option_keys) {
				const candidates = replacements.get(referencedKey);
				// One replacement means the reference can be rewritten without guessing.
				if (!candidates || candidates.length < 2) continue;
				choices.push({
					id: `${section.section_key}:${question.question_key}:${referencedKey}`,
					sectionKey: section.section_key,
					questionKey: question.question_key,
					sourceQuestionKey: condition.question_key,
					ambiguousKey: referencedKey,
					candidates: candidates.map(candidate => ({
						newKey: candidate.newKey,
						label: candidate.label,
						position: candidate.optionIndex + 1
					}))
				});
			}
		}
	}
	return choices;
}

/** The admin's answer to each ambiguous reference: choice id to chosen replacement key. */
export type ConditionResolutions = Readonly<Record<string, string>>;

/**
 * Produce the repaired copy.
 *
 * Rows are rewritten at the same owner and position in every language, which is
 * only safe because a misaligned bundle is refused up front rather than matched
 * by label or by position alone.
 */
export function applyOptionKeyRepairs(
	content: InstrumentContent,
	plan: RepairPlan,
	resolutions: ConditionResolutions
): InstrumentContent {
	const byOwner = new Map<string, Map<number, OptionKeyRepair>>();
	for (const repair of plan.repairs) {
		const ownerId = scopeId(repair.scope);
		const bucket = byOwner.get(ownerId) ?? new Map<number, OptionKeyRepair>();
		bucket.set(repair.optionIndex, repair);
		byOwner.set(ownerId, bucket);
	}

	const rewriteOptions = <T extends { key: string }>(scope: OptionOwnerScope, options: T[]): T[] => {
		const bucket = byOwner.get(scopeId(scope));
		if (!bucket) return options;
		return options.map((option, index) => {
			const repair = bucket.get(index);
			return repair ? { ...option, key: repair.newKey } : option;
		});
	};

	const next: InstrumentContent = {};
	for (const [locale, instrument] of Object.entries(content)) {
		if (!instrument) continue;
		next[locale as Lang] = {
			...instrument,
			scale_guidance: instrument.scale_guidance.map(guidance => ({
				...guidance,
				options: rewriteOptions({ kind: "scaleGuidance", scaleKey: guidance.key }, guidance.options)
			})),
			pre_audit_questions: instrument.pre_audit_questions.map(question => ({
				...question,
				options: rewriteOptions({ kind: "preAudit", questionKey: question.key }, question.options)
			})),
			sections: instrument.sections.map(section => ({
				...section,
				questions: section.questions.map(question => ({
					...question,
					options: rewriteOptions(
						{ kind: "checklist", sectionKey: section.section_key, questionKey: question.question_key },
						question.options
					),
					scales: question.scales.map(scale => ({
						...scale,
						options: rewriteOptions(
							{
								kind: "questionScale",
								sectionKey: section.section_key,
								questionKey: question.question_key,
								scaleKey: scale.key
							},
							scale.options
						)
					}))
				}))
			}))
		};
	}

	return rewriteConditions(next, plan, resolutions, byOwner);
}

function rewriteConditions(
	content: InstrumentContent,
	plan: RepairPlan,
	resolutions: ConditionResolutions,
	byOwner: Map<string, Map<number, OptionKeyRepair>>
): InstrumentContent {
	const choiceById = new Map(plan.conditionChoices.map(choice => [choice.id, choice]));
	const next: InstrumentContent = {};

	for (const [locale, instrument] of Object.entries(content)) {
		if (!instrument) continue;
		next[locale as Lang] = {
			...instrument,
			sections: instrument.sections.map(section => ({
				...section,
				questions: section.questions.map(question => {
					const condition = question.display_if;
					if (!condition) return question;
					const ownerId = ownerIdForCondition(
						instrument,
						section.section_key,
						condition.question_key,
						condition.response_key
					);
					const bucket = ownerId === null ? undefined : byOwner.get(ownerId);
					if (!bucket) return question;

					const rewritten = condition.any_of_option_keys.map(referencedKey => {
						const choiceId = `${section.section_key}:${question.question_key}:${referencedKey}`;
						if (choiceById.has(choiceId)) {
							return resolutions[choiceId] ?? referencedKey;
						}
						const match = [...bucket.values()].find(repair => repair.oldKey === referencedKey);
						return match ? match.newKey : referencedKey;
					});

					return {
						...question,
						display_if: { ...condition, any_of_option_keys: Array.from(new Set(rewritten)) }
					};
				})
			}))
		};
	}
	return next;
}
