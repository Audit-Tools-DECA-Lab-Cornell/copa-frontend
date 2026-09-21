/**
 * The editor's own read of whether an instrument can be saved and published.
 *
 * It mirrors the backend rules so an admin sees the problem next to the field
 * that causes it, instead of a rejected save. Every issue carries the address
 * the editor needs to open it: language, tab, section, question, scale, and the
 * row's position - never the key alone, which is exactly what a duplicate makes
 * ambiguous.
 */

import type { InstrumentQuestion, PlayspaceInstrument } from "@/types/audit";

import {
	checkStoredOptionKey,
	isScaleOptionScope,
	OPTION_KEY_MAX_LENGTH,
	type OptionKeyIssueCode,
	type OptionOwnerScope,
	scopeId
} from "./option-keys";
import { findLocaleMismatches } from "./translation-sync";
import type { InstrumentContent, Lang } from "./types";
import { formatQuestionKeyForDisplay } from "./utils";

export type EditorTab = "overview" | "sections" | "spreadsheet" | "preAudit" | "scales" | "legalDocuments";

/** How strongly an issue blocks: on every save, only on publication, or not at all. */
export type IssueSeverity = "save" | "publish" | "warning";

export type IssueField = "optionKey" | "optionLabel" | "ownerKey" | "condition" | "structure";

export type IssueTarget = Readonly<{
	locale: string;
	tab: EditorTab;
	sectionKey?: string;
	questionKey?: string;
	scaleKey?: string;
	optionIndex?: number;
	field: IssueField;
}>;

export type InstrumentIssue = Readonly<{
	id: string;
	severity: IssueSeverity;
	/** Message key under `admin.instruments.content.issues`. */
	code: string;
	values: Record<string, string | number>;
	/** Identifiers of the place this issue lives, for the issue list. */
	location: string;
	target: IssueTarget;
}>;

const OPTION_KEY_CODE_MESSAGES: Record<OptionKeyIssueCode, string> = {
	blank: "optionKeyBlank",
	padded: "optionKeyPadded",
	tooLong: "optionKeyTooLong",
	placeholder: "optionKeyPlaceholder",
	reserved: "optionKeyReserved",
	semantic: "optionKeySemantic",
	duplicate: "optionKeyDuplicate",
	syntax: "optionKeySyntax"
};

/** Stable DOM id for the control an issue points at, so Review can focus it. */
export function issueElementId(target: IssueTarget): string {
	const parts = [
		target.locale,
		target.tab,
		target.sectionKey ?? "-",
		target.questionKey ?? "-",
		target.scaleKey ?? "-",
		target.optionIndex === undefined ? "-" : String(target.optionIndex),
		target.field
	];
	return `instrument-issue-${parts.join("--").replace(/[^a-zA-Z0-9-]/g, "_")}`;
}

/** The workflows a question is shown in, so a follow-up can be compared with its parent. */
function visibleModes(mode: InstrumentQuestion["mode"]): Set<string> {
	return mode === "both" ? new Set(["audit", "survey"]) : new Set([mode]);
}

function scopeTab(scope: OptionOwnerScope): EditorTab {
	switch (scope.kind) {
		case "questionScale":
		case "checklist":
			return "sections";
		case "scaleGuidance":
			return "scales";
		case "preAudit":
			return "preAudit";
		case "executionModes":
			return "overview";
	}
}

function scopeTarget(
	scope: OptionOwnerScope,
	locale: string,
	optionIndex: number | undefined,
	field: IssueField
): IssueTarget {
	const base = { locale, tab: scopeTab(scope), optionIndex, field };
	switch (scope.kind) {
		case "questionScale":
			return { ...base, sectionKey: scope.sectionKey, questionKey: scope.questionKey, scaleKey: scope.scaleKey };
		case "checklist":
			return { ...base, sectionKey: scope.sectionKey, questionKey: scope.questionKey };
		case "scaleGuidance":
			return { ...base, scaleKey: scope.scaleKey };
		case "preAudit":
			return { ...base, questionKey: scope.questionKey };
		case "executionModes":
			return base;
	}
}

/** Name one answer list the way the editor shows it, e.g. `Q 12.13 · provision`. */
export function scopeOwnerLabel(scope: OptionOwnerScope): string {
	switch (scope.kind) {
		case "questionScale":
			return `${formatQuestionKeyForDisplay(scope.questionKey)} · ${scope.scaleKey}`;
		case "checklist":
			return `${formatQuestionKeyForDisplay(scope.questionKey)} · checklist`;
		case "scaleGuidance":
			return `Scale guidance · ${scope.scaleKey}`;
		case "preAudit":
			return `Pre-audit · ${scope.questionKey}`;
		case "executionModes":
			return "Execution modes";
	}
}

function scopeLocation(scope: OptionOwnerScope, optionIndex: number): string {
	return `${scopeOwnerLabel(scope)} · row ${optionIndex + 1}`;
}

type OwningList = Readonly<{ scope: OptionOwnerScope; options: readonly { key: string; label: string }[] }>;

/** Every list of answers in one language, in the order the editor shows them. */
export function collectOwningLists(instrument: PlayspaceInstrument): OwningList[] {
	const lists: OwningList[] = [];
	for (const guidance of instrument.scale_guidance) {
		lists.push({ scope: { kind: "scaleGuidance", scaleKey: guidance.key }, options: guidance.options });
	}
	for (const section of instrument.sections) {
		for (const question of section.questions) {
			for (const scale of question.scales) {
				lists.push({
					scope: {
						kind: "questionScale",
						sectionKey: section.section_key,
						questionKey: question.question_key,
						scaleKey: scale.key
					},
					options: scale.options
				});
			}
			if (question.options.length > 0) {
				lists.push({
					scope: {
						kind: "checklist",
						sectionKey: section.section_key,
						questionKey: question.question_key
					},
					options: question.options
				});
			}
		}
	}
	for (const question of instrument.pre_audit_questions) {
		if (question.options.length > 0) {
			lists.push({ scope: { kind: "preAudit", questionKey: question.key }, options: question.options });
		}
	}
	return lists;
}

function pushOwnerIssues(
	issues: InstrumentIssue[],
	locale: string,
	tab: EditorTab,
	label: string,
	entries: readonly { key: string; sectionKey?: string; questionKey?: string; scaleKey?: string }[]
): void {
	const seen = new Map<string, number>();
	entries.forEach((entry, index) => {
		const target: IssueTarget = {
			locale,
			tab,
			sectionKey: entry.sectionKey,
			questionKey: entry.questionKey,
			scaleKey: entry.scaleKey,
			field: "ownerKey"
		};
		if (entry.key.trim().length === 0) {
			issues.push({
				id: `${locale}:owner-blank:${label}:${index}`,
				severity: "save",
				code: "ownerKeyBlank",
				values: { owner: label, position: index + 1 },
				location: `${label} ${index + 1}`,
				target
			});
			return;
		}
		const first = seen.get(entry.key);
		if (first !== undefined) {
			issues.push({
				id: `${locale}:owner-duplicate:${label}:${index}`,
				severity: "save",
				code: "ownerKeyDuplicate",
				values: { owner: label, key: entry.key, position: index + 1, firstPosition: first + 1 },
				location: `${label} ${index + 1} · ${entry.key}`,
				target
			});
			return;
		}
		seen.set(entry.key, index);
	});
}

/**
 * Scan one instrument bundle.
 *
 * Owners are checked before their answers: with two questions sharing a key,
 * an answer error below them cannot be pointed at one of them.
 */
export function scanInstrumentIssues(content: InstrumentContent, baseLang: string): InstrumentIssue[] {
	const issues: InstrumentIssue[] = [];

	for (const [locale, instrument] of Object.entries(content)) {
		if (!instrument) continue;

		pushOwnerIssues(
			issues,
			locale,
			"sections",
			"Section",
			instrument.sections.map(section => ({ key: section.section_key, sectionKey: section.section_key }))
		);
		pushOwnerIssues(
			issues,
			locale,
			"sections",
			"Question",
			instrument.sections.flatMap(section =>
				section.questions.map(question => ({
					key: question.question_key,
					sectionKey: section.section_key,
					questionKey: question.question_key
				}))
			)
		);
		pushOwnerIssues(
			issues,
			locale,
			"preAudit",
			"Pre-audit question",
			instrument.pre_audit_questions.map(question => ({ key: question.key, questionKey: question.key }))
		);
		pushOwnerIssues(
			issues,
			locale,
			"scales",
			"Scale guidance",
			instrument.scale_guidance.map(guidance => ({ key: guidance.key, scaleKey: guidance.key }))
		);
		for (const section of instrument.sections) {
			for (const question of section.questions) {
				pushOwnerIssues(
					issues,
					locale,
					"sections",
					"Scale",
					question.scales.map(scale => ({
						key: scale.key,
						sectionKey: section.section_key,
						questionKey: question.question_key,
						scaleKey: scale.key
					}))
				);
			}
		}

		for (const { scope, options } of collectOwningLists(instrument)) {
			const seenKeys = new Set<string>();
			const firstIndexByKey = new Map<string, number>();
			const seenLabels = new Map<string, number>();
			options.forEach((option, index) => {
				const check = checkStoredOptionKey(option.key, seenKeys, {
					scaleOption: isScaleOptionScope(scope)
				});
				if (check.ok) {
					seenKeys.add(option.key);
					firstIndexByKey.set(option.key, index);
				} else {
					issues.push({
						id: `${locale}:${scopeId(scope)}:key:${index}`,
						severity: "save",
						code: OPTION_KEY_CODE_MESSAGES[check.code],
						values: {
							key: option.key,
							position: index + 1,
							// Which row it collides with, so both ends of the clash are named.
							firstPosition: (firstIndexByKey.get(option.key) ?? index) + 1,
							limit: OPTION_KEY_MAX_LENGTH
						},
						location: scopeLocation(scope, index),
						target: scopeTarget(scope, locale, index, "optionKey")
					});
				}

				if (option.label.trim().length === 0) {
					issues.push({
						id: `${locale}:${scopeId(scope)}:label:${index}`,
						severity: "publish",
						code: "optionLabelBlank",
						values: { position: index + 1 },
						location: scopeLocation(scope, index),
						target: scopeTarget(scope, locale, index, "optionLabel")
					});
					return;
				}
				const normalizedLabel = option.label.trim().toLowerCase();
				const firstLabelIndex = seenLabels.get(normalizedLabel);
				if (firstLabelIndex !== undefined) {
					issues.push({
						id: `${locale}:${scopeId(scope)}:label-dup:${index}`,
						severity: "warning",
						code: "optionLabelDuplicate",
						values: {
							label: option.label.trim(),
							position: index + 1,
							firstPosition: firstLabelIndex + 1
						},
						location: scopeLocation(scope, index),
						target: scopeTarget(scope, locale, index, "optionLabel")
					});
					return;
				}
				seenLabels.set(normalizedLabel, index);
			});
		}

		issues.push(...scanConditions(locale, instrument));
	}

	for (const mismatch of findLocaleMismatches(content, baseLang)) {
		const owner = scopeOwnerLabel(mismatch.scope);
		issues.push({
			id: `${mismatch.locale}:locale:${scopeId(mismatch.scope)}:${mismatch.reason}`,
			severity: "publish",
			code: "localeMismatch",
			values: { locale: mismatch.locale.toUpperCase(), owner, base: baseLang.toUpperCase() },
			location: `${mismatch.locale.toUpperCase()} · ${owner}`,
			// Opens the translation at the list that differs. A list the translation
			// is missing entirely has nothing there to open, so it lands on the owner.
			target: scopeTarget(mismatch.scope, mismatch.locale, undefined, "structure")
		});
	}

	return issues;
}

/** Clients read a checklist answer from this field of the stored question payload. */
export const CHECKLIST_CONDITION_RESPONSE_KEY = "selected_option_keys";

function scanConditions(locale: string, instrument: PlayspaceInstrument): InstrumentIssue[] {
	const issues: InstrumentIssue[] = [];

	for (const section of instrument.sections) {
		const byKey = new Map(section.questions.map(question => [question.question_key, question]));
		const parentOf = new Map<string, string>();

		for (const question of section.questions) {
			const condition = question.display_if;
			if (!condition) continue;
			const target: IssueTarget = {
				locale,
				tab: "sections",
				sectionKey: section.section_key,
				questionKey: question.question_key,
				field: "condition"
			};
			const location = `${formatQuestionKeyForDisplay(question.question_key)} · condition`;
			const base = { severity: "publish" as const, location, target };

			if (condition.question_key.trim().length === 0) {
				issues.push({
					id: `${locale}:cond-empty:${question.question_key}`,
					code: "conditionNoSource",
					values: {},
					...base
				});
				continue;
			}
			if (condition.question_key === question.question_key) {
				issues.push({
					id: `${locale}:cond-self:${question.question_key}`,
					code: "conditionSelf",
					values: {},
					...base
				});
				continue;
			}
			const parent = byKey.get(condition.question_key);
			if (!parent) {
				issues.push({
					id: `${locale}:cond-missing:${question.question_key}`,
					code: "conditionOutsideSection",
					values: { questionKey: formatQuestionKeyForDisplay(condition.question_key) },
					...base
				});
				continue;
			}

			const isChecklistParent = (parent.question_type ?? "scaled") === "checklist";
			let optionKeys: Set<string>;
			if (isChecklistParent) {
				if (condition.response_key !== CHECKLIST_CONDITION_RESPONSE_KEY) {
					issues.push({
						id: `${locale}:cond-response:${question.question_key}`,
						code: "conditionChecklistResponse",
						values: { questionKey: formatQuestionKeyForDisplay(parent.question_key) },
						...base
					});
					continue;
				}
				optionKeys = new Set(parent.options.map(option => option.key));
			} else {
				const scale = parent.scales.find(candidate => candidate.key === condition.response_key);
				if (!scale) {
					issues.push({
						id: `${locale}:cond-scale:${question.question_key}`,
						code: "conditionUnknownScale",
						values: {
							responseKey: condition.response_key,
							questionKey: formatQuestionKeyForDisplay(parent.question_key)
						},
						...base
					});
					continue;
				}
				optionKeys = new Set(scale.options.map(option => option.key));
			}

			if (condition.any_of_option_keys.length === 0) {
				issues.push({
					id: `${locale}:cond-noopts:${question.question_key}`,
					code: "conditionNoAnswers",
					values: {},
					...base
				});
			} else {
				const unknown = condition.any_of_option_keys.filter(key => !optionKeys.has(key));
				if (unknown.length > 0) {
					issues.push({
						id: `${locale}:cond-unknown:${question.question_key}`,
						code: "conditionUnknownAnswer",
						values: {
							keys: unknown.join(", "),
							questionKey: formatQuestionKeyForDisplay(parent.question_key)
						},
						...base
					});
				}
			}

			const childModes = visibleModes(question.mode);
			const parentModes = visibleModes(parent.mode);
			if (![...childModes].every(mode => parentModes.has(mode))) {
				issues.push({
					id: `${locale}:cond-mode:${question.question_key}`,
					code: "conditionModeMismatch",
					values: {
						questionKey: formatQuestionKeyForDisplay(parent.question_key),
						childMode: question.mode,
						parentMode: parent.mode
					},
					...base
				});
			}

			parentOf.set(question.question_key, condition.question_key);
		}

		for (const start of parentOf.keys()) {
			const seen = new Set([start]);
			let current = parentOf.get(start);
			while (current !== undefined && parentOf.has(current)) {
				if (seen.has(current)) {
					issues.push({
						id: `${locale}:cond-cycle:${start}`,
						severity: "publish",
						code: "conditionLoop",
						values: { questionKey: formatQuestionKeyForDisplay(start) },
						location: `${section.section_key}`,
						target: {
							locale,
							tab: "sections",
							sectionKey: section.section_key,
							questionKey: start,
							field: "condition"
						}
					});
					break;
				}
				seen.add(current);
				current = parentOf.get(current);
			}
		}
	}

	return issues;
}

/** Issues that stop a draft from being saved at all. */
export function saveBlockers(issues: readonly InstrumentIssue[]): InstrumentIssue[] {
	return issues.filter(issue => issue.severity === "save");
}

/** Issues that stop a version from being published. */
export function publishBlockers(issues: readonly InstrumentIssue[]): InstrumentIssue[] {
	return issues.filter(issue => issue.severity === "save" || issue.severity === "publish");
}

/** Group issues by language and then by the place they live, so long lists stay readable. */
export function groupIssues(issues: readonly InstrumentIssue[]): Map<string, InstrumentIssue[]> {
	const grouped = new Map<string, InstrumentIssue[]>();
	for (const issue of issues) {
		const bucket = grouped.get(issue.target.locale);
		if (bucket) {
			bucket.push(issue);
		} else {
			grouped.set(issue.target.locale, [issue]);
		}
	}
	return grouped;
}

/** True when the content can be sent to the server without a certain rejection. */
export function contentBlocksSave(content: InstrumentContent, baseLang: string): boolean {
	return saveBlockers(scanInstrumentIssues(content, baseLang)).length > 0;
}

export type { Lang };
