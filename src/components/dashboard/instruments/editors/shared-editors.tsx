import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	Check,
	ChevronDown,
	GitBranch,
	GripVertical,
	ListChecks,
	Minus,
	Plus,
	Ruler,
	Trash2
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
	ChoiceOption,
	InstrumentQuestion,
	QuestionDisplayCondition,
	QuestionScale,
	ScaleDefinition,
	ScaleOption,
	SelectionMode
} from "@/types/audit";

import { AiTranslateFieldButton } from "../ai-translate-button";
import { CONSTRUCT_OPTIONS, MODE_OPTIONS, QUESTION_TYPE_OPTIONS, SCALE_KEY_OPTIONS } from "../constants";
import {
	makeChoiceOptionTemplate,
	makeDefaultQuestionScale,
	makeScaleOptionTemplate,
	makeUnsureOptionTemplate
} from "../defaults";
import { useInstrumentEdit } from "../instrument-edit-context";
import { CHECKLIST_CONDITION_RESPONSE_KEY, issueElementId } from "../instrument-issues";
import { OptionKeyChip, OptionKeyOverridePanel } from "../option-key-field";
import { useOptionKeySessionOrNoop } from "../option-key-session";
import {
	appendChoiceOption,
	appendScaleOption,
	defaultKeyGenerator,
	type KeyGenerator,
	mintOptionKey,
	type OptionOwnerScope,
	SEMANTIC_OPTION_KEYS
} from "../option-keys";
import { DisplayConditionBadge, EditableField } from "../shared-components";
import { formatQuestionKeyForDisplay, isScaleCustomized, moveArrayItem, renderInlineMarkdown } from "../utils";

/** Shown when an answer could not be given its own key, so no row was added. */
function AddFailureNotice({ scopeKey }: Readonly<{ scopeKey: string }>) {
	const t = useTranslations("admin.instruments.content");
	const session = useOptionKeySessionOrNoop();
	if (session.addFailure?.scopeId !== scopeKey) return null;
	return (
		<p role="alert" className="flex items-start gap-1.5 text-[11px] leading-4 text-destructive">
			<AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
			{t("addOptionFailed")}
		</p>
	);
}

export function ChoiceOptionsEditor({
	options,
	scope,
	onChange,
	generateKey = defaultKeyGenerator
}: Readonly<{
	options: ChoiceOption[];
	scope: OptionOwnerScope;
	onChange: (opts: ChoiceOption[]) => void;
	generateKey?: KeyGenerator;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode, activeLang } = useInstrumentEdit();
	const session = useOptionKeySessionOrNoop();
	const scopeKey = scopeKeyOf(scope);

	function updateOption(i: number, field: "label" | "description", val: string) {
		const next = options.map((option, index) => (index === i ? { ...option, [field]: val } : option));
		onChange(next);
	}

	function addOption() {
		session.clearAddFailure();
		const result = appendChoiceOption(
			options,
			makeChoiceOptionTemplate(t("newOptionLabel")),
			session.retiredKeys(scope),
			generateKey
		);
		if (!result.ok) {
			session.reportAddFailure(scope);
			return;
		}
		session.noteCreated(scope, result.key);
		onChange(result.options);
	}

	function removeOption(i: number) {
		const removed = options[i];
		if (removed) {
			session.noteRetired(scope, [removed.key]);
		}
		onChange(options.filter((_, idx) => idx !== i));
	}

	if (options.length === 0) {
		return (
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs text-muted-foreground">{t("noOptionsYet")}</span>
					{!translationMode && (
						<Button variant="ghost" size="sm" onClick={addOption} className="h-7 gap-1 text-xs">
							<Plus className="h-3 w-3" aria-hidden="true" />
							{t("addOption")}
						</Button>
					)}
				</div>
				<AddFailureNotice scopeKey={scopeKey} />
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{t("options")} ({options.length})
				</span>
				{!translationMode && (
					<Button variant="ghost" size="sm" onClick={addOption} className="h-7 gap-1 text-xs">
						<Plus className="h-3 w-3" aria-hidden="true" />
						{t("addOption")}
					</Button>
				)}
			</div>

			<AddFailureNotice scopeKey={scopeKey} />

			<div className="space-y-1.5">
				{options.map((opt, i) => (
					<div
						key={`${opt.key}-${i.toString()}`}
						data-testid={`choice-option-row-${i.toString()}`}
						className="space-y-1.5 rounded-lg border border-edge/30 bg-muted/30 px-2 py-1.5">
						<div className="grid grid-cols-[1fr_auto] items-start gap-x-2">
							<div className="min-w-0 space-y-1">
								<Input
									id={issueElementId({
										locale: activeLang,
										tab: scope.kind === "preAudit" ? "preAudit" : "sections",
										sectionKey: "sectionKey" in scope ? scope.sectionKey : undefined,
										questionKey: "questionKey" in scope ? scope.questionKey : undefined,
										optionIndex: i,
										field: "optionLabel"
									})}
									value={opt.label}
									onChange={e => updateOption(i, "label", e.target.value)}
									placeholder={t("optionLabel")}
									aria-label={t("optionLabel")}
									className="h-7 border-edge/50 bg-background text-xs"
								/>
								<OptionKeyChip scope={scope} optionKey={opt.key} optionIndex={i} locale={activeLang} />
							</div>
							{translationMode ? (
								<AiTranslateFieldButton className="h-7 w-7" />
							) : (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => removeOption(i)}
									className="h-7 w-7 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
									aria-label={t("removeOption")}>
									<Trash2 className="h-3 w-3" aria-hidden="true" />
								</Button>
							)}
						</div>
						{session.isOverrideOpenFor(scope, opt.key) ? (
							<OptionKeyOverridePanel scope={scope} options={options} onApply={onChange} />
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}

function scopeKeyOf(scope: OptionOwnerScope): string {
	switch (scope.kind) {
		case "questionScale":
			return `questionScale:${scope.sectionKey}/${scope.questionKey}/${scope.scaleKey}`;
		case "checklist":
			return `checklist:${scope.sectionKey}/${scope.questionKey}`;
		case "scaleGuidance":
			return `scaleGuidance:${scope.scaleKey}`;
		case "preAudit":
			return `preAudit:${scope.questionKey}`;
		case "executionModes":
			return "executionModes";
	}
}

export function ScaleOptionsEditor({
	options,
	scope,
	onChange,
	generateKey = defaultKeyGenerator
}: Readonly<{
	options: ScaleOption[];
	scope: OptionOwnerScope;
	onChange: (options: ScaleOption[]) => void;
	generateKey?: KeyGenerator;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode, activeLang } = useInstrumentEdit();
	const session = useOptionKeySessionOrNoop();
	const scopeKey = scopeKeyOf(scope);

	function updateOption(index: number, updater: (opt: ScaleOption) => void) {
		const next = structuredClone(options);
		updater(next[index]);
		onChange(next);
	}

	function addOption() {
		session.clearAddFailure();
		const result = appendScaleOption(
			options,
			makeScaleOptionTemplate(t("newOptionLabel")),
			session.retiredKeys(scope),
			generateKey
		);
		if (!result.ok) {
			session.reportAddFailure(scope);
			return;
		}
		session.noteCreated(scope, result.key);
		onChange(result.options);
	}

	// The ready-made "I don't know" answer keeps its fixed key: clients and scoring
	// recognise it by that key, so it is a preset rather than a custom answer.
	function addUnsureOption() {
		onChange([...options, { ...makeUnsureOptionTemplate(), key: "unsure" }]);
	}

	function removeOption(index: number) {
		const removed = options[index];
		if (removed) {
			session.noteRetired(scope, [removed.key]);
		}
		onChange(options.filter((_, i) => i !== index));
	}

	const hasUnsureOption = options.some(o => o.is_unsure || o.key === "unsure");

	function moveOption(index: number, direction: "up" | "down") {
		onChange(moveArrayItem(options, index, direction));
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("scaleOptions")} ({options.length})
				</Label>
				{!translationMode && (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={addUnsureOption}
							disabled={hasUnsureOption}
							title={hasUnsureOption ? t("unsureOptionExists") : t("isUnsure")}
							className="text-accent-slate hover:bg-status-info-surface">
							<Plus className="mr-1 h-3 w-3" aria-hidden="true" />
							{t("addUnsureOption")}
						</Button>
						<Button variant="ghost" size="sm" onClick={addOption}>
							<Plus className="mr-1 h-3 w-3" aria-hidden="true" />
							{t("addOption")}
						</Button>
					</div>
				)}
			</div>

			<AddFailureNotice scopeKey={scopeKey} />

			{options.length > 0 && (
				<div className="overflow-hidden rounded-lg border border-edge/40">
					{/* Header - same grid template + padding as data rows so columns align exactly */}
					<div className="grid grid-cols-[28px_1fr_80px_80px_130px_32px] items-center gap-x-2 border-b border-edge/30 bg-muted/50 px-2 py-1.5">
						<span />
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{t("optionLabel")}
						</span>
						<span className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{t("additionValue")}
						</span>
						<span className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{t("boostValue")}
						</span>
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							{t("flags")}
						</span>
						<span />
					</div>

					{options.map((opt, oIdx) => (
						<div
							key={`${opt.key}-${oIdx.toString()}`}
							data-testid={`scale-option-row-${oIdx.toString()}`}
							className={`space-y-2 px-2 py-2 ${oIdx < options.length - 1 ? " border-b border-edge/25" : ""}`}>
							<div className="grid grid-cols-[28px_1fr_80px_80px_130px_32px] items-center-safe gap-x-2">
								{/* Reorder controls - self-center keeps the grip aligned to the row's midline */}
								{translationMode ? (
									<span />
								) : (
									<div className="flex flex-col items-center gap-0.5 self-center">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-5 w-5 text-muted-foreground/60 hover:text-muted-foreground"
											disabled={oIdx === 0}
											onClick={() => moveOption(oIdx, "up")}
											aria-label={t("moveOptionUp")}>
											<ArrowUp className="h-3 w-3" aria-hidden="true" />
										</Button>
										<GripVertical
											className="h-3.5 w-3.5 text-muted-foreground/30"
											aria-hidden="true"
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-5 w-5 text-muted-foreground/60 hover:text-muted-foreground"
											disabled={oIdx === options.length - 1}
											onClick={() => moveOption(oIdx, "down")}
											aria-label={t("moveOptionDown")}>
											<ArrowDown className="h-3 w-3" aria-hidden="true" />
										</Button>
									</div>
								)}

								{/* Label (the answer auditors read) with its stored key underneath */}
								<div className="min-w-0 space-y-1">
									<Input
										id={issueElementId({
											locale: activeLang,
											tab: scope.kind === "scaleGuidance" ? "scales" : "sections",
											sectionKey: "sectionKey" in scope ? scope.sectionKey : undefined,
											questionKey: "questionKey" in scope ? scope.questionKey : undefined,
											scaleKey: "scaleKey" in scope ? scope.scaleKey : undefined,
											optionIndex: oIdx,
											field: "optionLabel"
										})}
										className="h-7 px-2 text-xs"
										value={opt.label}
										placeholder={t("optionLabel")}
										aria-label={t("optionLabel")}
										onChange={e =>
											updateOption(oIdx, o => {
												o.label = e.target.value;
											})
										}
									/>
									<OptionKeyChip
										scope={scope}
										optionKey={opt.key}
										optionIndex={oIdx}
										locale={activeLang}
									/>
								</div>

								{/* Addition value (scoring - owned by the base language) */}
								<Input
									type="number"
									className="h-7 px-2 text-center font-mono text-xs"
									value={opt.addition_value}
									disabled={translationMode}
									aria-label={t("additionValue")}
									onChange={e =>
										updateOption(oIdx, o => {
											o.addition_value = Number(e.target.value) || 0;
										})
									}
								/>

								{/* Boost value (scoring - owned by the base language) */}
								<Input
									type="number"
									className="h-7 px-2 text-center font-mono text-xs"
									value={opt.boost_value}
									disabled={translationMode}
									aria-label={t("boostValue")}
									onChange={e =>
										updateOption(oIdx, o => {
											o.boost_value = Number(e.target.value) || 0;
										})
									}
								/>

								{/* Flag toggles */}
								<div className="flex flex-wrap items-center gap-1.5">
									<button
										type="button"
										disabled={translationMode}
										aria-pressed={opt.is_not_applicable}
										onClick={() =>
											updateOption(oIdx, o => {
												o.is_not_applicable = !o.is_not_applicable;
											})
										}
										className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
											opt.is_not_applicable
												? "border-status-warning-border bg-status-warning-surface text-status-warning"
												: "border-edge/40 bg-transparent text-muted-foreground hover:border-edge/40/80"
										}`}
										title={t("isNotApplicable")}>
										{opt.is_not_applicable && (
											<Check className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
										)}
										{t("notApplicable")}
									</button>
									<button
										type="button"
										disabled={translationMode}
										aria-pressed={opt.is_unsure}
										onClick={() =>
											updateOption(oIdx, o => {
												o.is_unsure = !o.is_unsure;
											})
										}
										className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
											opt.is_unsure
												? "border-status-info-border bg-status-info-surface text-accent-slate"
												: "border-edge/40 bg-transparent text-muted-foreground hover:border-edge/40/80"
										}`}
										title={t("isUnsure")}>
										{opt.is_unsure && <Check className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />}
										{t("unsure")}
									</button>
									<button
										type="button"
										disabled={translationMode}
										aria-pressed={opt.allows_follow_up_scales}
										onClick={() =>
											updateOption(oIdx, o => {
												o.allows_follow_up_scales = !o.allows_follow_up_scales;
											})
										}
										className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
											opt.allows_follow_up_scales
												? "border-accent-violet-border bg-accent-violet-surface text-accent-violet"
												: "border-edge/40 bg-transparent text-muted-foreground hover:border-edge/40/80"
										}`}
										title={t("allowsFollowUp")}>
										{opt.allows_follow_up_scales && (
											<Check className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
										)}
										{t("followUpBadge")}
									</button>
								</div>

								{/* Delete (translating: per-label AI translate affordance instead) */}
								{translationMode ? (
									<AiTranslateFieldButton className="h-6 w-6" />
								) : (
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
										aria-label={t("removeOption")}
										onClick={() => removeOption(oIdx)}>
										<Minus className="h-3.5 w-3.5" aria-hidden="true" />
									</Button>
								)}
							</div>
							{session.isOverrideOpenFor(scope, opt.key) ? (
								<OptionKeyOverridePanel scope={scope} options={options} onApply={onChange} />
							) : null}
						</div>
					))}
				</div>
			)}

			{/* Legend for active flag pills */}
			{options.some(o => o.is_not_applicable || o.is_unsure || o.allows_follow_up_scales) && (
				<div className="flex flex-wrap items-center gap-3 pl-1 pt-1">
					<span className="text-[10px] text-muted-foreground/60">{t("flags")}:</span>
					<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
						<span className="rounded-full border border-status-warning-border bg-status-warning-surface px-1.5 text-status-warning">
							{t("notApplicable")}
						</span>
						= {t("notApplicableDesc")}
					</span>
					<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
						<span className="rounded-full border border-status-info-border bg-status-info-surface px-1.5 text-accent-slate">
							{t("unsure")}
						</span>
						= {t("unsureDesc")}
					</span>
					<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
						<span className="rounded-full border border-accent-violet-border bg-accent-violet-surface px-1.5 text-accent-violet">
							{t("followUpBadge")}
						</span>
						= {t("allowsFollowUpDesc")}
					</span>
				</div>
			)}
		</div>
	);
}

/**
 * Build a follow-up rule by choosing a question and its answers by name.
 *
 * Answers are stored by key, but keys are an implementation detail here: the
 * admin picks the question and ticks the answers that should reveal the
 * follow-up. A reference that no longer resolves is shown as such rather than
 * silently dropped.
 */
export function DisplayConditionEditor({
	condition,
	sectionQuestions,
	currentQuestionKey,
	onChange
}: Readonly<{
	condition: QuestionDisplayCondition | null;
	sectionQuestions: readonly InstrumentQuestion[];
	currentQuestionKey: string;
	onChange: (condition: QuestionDisplayCondition | null) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode, activeLang } = useInstrumentEdit();

	const candidates = sectionQuestions.filter(question => question.question_key !== currentQuestionKey);

	if (!condition) {
		// Display conditions are structural references to other keys; while
		// translating there's nothing to localize, so the editor is hidden.
		if (translationMode) return null;
		const first = candidates[0];
		return (
			<Button
				variant="outline"
				size="sm"
				disabled={candidates.length === 0}
				title={candidates.length === 0 ? t("conditionNeedsAnotherQuestion") : undefined}
				onClick={() =>
					onChange({
						question_key: first?.question_key ?? "",
						response_key: responseKeysOf(first)[0] ?? "provision",
						any_of_option_keys: []
					})
				}>
				<GitBranch className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
				{t("setCondition")}
			</Button>
		);
	}

	const source = candidates.find(question => question.question_key === condition.question_key) ?? null;
	const responseKeys = responseKeysOf(source);
	const answerOptions = answerOptionsOf(source, condition.response_key);
	const unresolvedAnswers = condition.any_of_option_keys.filter(
		key => !answerOptions.some(option => option.key === key)
	);

	function updateSource(questionKey: string) {
		const next = candidates.find(question => question.question_key === questionKey) ?? null;
		// A different source question answers with different keys, so the chosen
		// answers cannot carry over.
		onChange({
			question_key: questionKey,
			response_key: responseKeysOf(next)[0] ?? "provision",
			any_of_option_keys: []
		});
	}

	return (
		<div
			id={issueElementId({
				locale: activeLang,
				tab: "sections",
				sectionKey: sectionQuestions[0]?.section_key,
				questionKey: currentQuestionKey,
				field: "condition"
			})}
			tabIndex={-1}
			className="space-y-3 rounded-md border border-status-warning-border bg-status-warning-surface/30 p-3">
			<div className="flex items-center justify-between">
				<Label className="flex items-center gap-1.5 text-xs font-semibold text-status-warning">
					<GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
					{t("displayCondition")}
				</Label>
				{!translationMode && (
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground hover:text-destructive"
						onClick={() => onChange(null)}>
						{t("clearCondition")}
					</Button>
				)}
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">{t("conditionSourceQuestion")}</Label>
					<Select value={condition.question_key} disabled={translationMode} onValueChange={updateSource}>
						<SelectTrigger className="w-full text-sm data-[size=default]:h-10">
							<SelectValue placeholder={t("conditionPickQuestion")} />
						</SelectTrigger>
						<SelectContent>
							{candidates.map(question => (
								<SelectItem key={question.question_key} value={question.question_key}>
									{formatQuestionKeyForDisplay(question.question_key)} — {shorten(question.prompt)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{source === null && (
						<p className="text-[11px] leading-4 text-destructive" role="alert">
							{t("conditionSourceMissing", { questionKey: condition.question_key })}
						</p>
					)}
				</div>

				<div className="space-y-1">
					<Label className="text-xs text-muted-foreground">{t("conditionResponse")}</Label>
					<Select
						value={condition.response_key}
						disabled={translationMode || source === null}
						onValueChange={value =>
							onChange({ ...condition, response_key: value, any_of_option_keys: [] })
						}>
						<SelectTrigger className="w-full text-sm data-[size=default]:h-10">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{responseKeys.map(key => (
								<SelectItem key={key} value={key}>
									{key === CHECKLIST_CONDITION_RESPONSE_KEY
										? t("conditionChecklistAnswers")
										: t.has(`scaleLabels.${key}`)
											? t(`scaleLabels.${key}`)
											: key}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="space-y-1.5">
				<Label className="text-xs text-muted-foreground">{t("conditionAnswers")}</Label>
				{answerOptions.length === 0 ? (
					<p className="text-[11px] leading-4 text-muted-foreground">{t("conditionNoAnswersAvailable")}</p>
				) : (
					<div className="flex flex-wrap gap-1.5">
						{answerOptions.map(option => {
							const checked = condition.any_of_option_keys.includes(option.key);
							return (
								<button
									key={option.key}
									type="button"
									disabled={translationMode}
									aria-pressed={checked}
									title={option.key}
									onClick={() =>
										onChange({
											...condition,
											any_of_option_keys: checked
												? condition.any_of_option_keys.filter(key => key !== option.key)
												: [...condition.any_of_option_keys, option.key]
										})
									}
									className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
										checked
											? "border-primary bg-primary text-primary-foreground"
											: "border-edge/40 bg-background text-muted-foreground hover:border-primary/50"
									}`}>
									{checked ? (
										<Check className="h-3 w-3 shrink-0" aria-hidden="true" />
									) : (
										<Plus className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
									)}
									<span className="truncate">{option.label || option.key}</span>
								</button>
							);
						})}
					</div>
				)}
				{unresolvedAnswers.length > 0 && (
					<p className="text-[11px] leading-4 text-destructive" role="alert">
						{t("conditionAnswersMissing", { keys: unresolvedAnswers.join(", ") })}
					</p>
				)}
				{condition.any_of_option_keys.length === 0 && unresolvedAnswers.length === 0 && (
					<p className="text-[11px] leading-4 text-muted-foreground">{t("conditionPickAnswers")}</p>
				)}
			</div>
		</div>
	);
}

/** Which stored answer field of a question a condition can read. */
function responseKeysOf(question: InstrumentQuestion | null | undefined): string[] {
	if (!question) return [];
	if ((question.question_type ?? "scaled") === "checklist") {
		return [CHECKLIST_CONDITION_RESPONSE_KEY];
	}
	return question.scales.map(scale => scale.key);
}

function answerOptionsOf(
	question: InstrumentQuestion | null | undefined,
	responseKey: string
): ReadonlyArray<{ key: string; label: string }> {
	if (!question) return [];
	if ((question.question_type ?? "scaled") === "checklist") {
		return responseKey === CHECKLIST_CONDITION_RESPONSE_KEY ? question.options : [];
	}
	return question.scales.find(scale => scale.key === responseKey)?.options ?? [];
}

function shorten(text: string): string {
	const flat = text.replace(/\s+/g, " ").trim();
	return flat.length > 70 ? `${flat.slice(0, 69)}…` : flat;
}

/**
 * Choose whether a scale accepts one answer or any combination of its answers.
 *
 * `single` is the backward-compatible default: an instrument that omits the field is read as
 * single-select everywhere, so switching to `multiple` is always an explicit act.
 */
export function SelectionModeField({
	value,
	disabled,
	onChange
}: Readonly<{
	value: SelectionMode;
	disabled: boolean;
	onChange: (mode: SelectionMode) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	return (
		<div className="space-y-1">
			<Label className="text-xs text-muted-foreground">{t("selectionMode")}</Label>
			<Select value={value} disabled={disabled} onValueChange={v => onChange(v as SelectionMode)}>
				<SelectTrigger className="w-full text-sm data-[size=default]:h-10">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="single">{t("selectionModeSingle")}</SelectItem>
					<SelectItem value="multiple">{t("selectionModeMultiple")}</SelectItem>
				</SelectContent>
			</Select>
			<p className="text-[11px] leading-4 text-muted-foreground">
				{value === "multiple" ? t("selectionModeMultipleHint") : t("selectionModeSingleHint")}
			</p>
		</div>
	);
}

export function QuestionScalesEditor({
	scales,
	scaleGuidanceMap,
	sectionKey,
	questionKey,
	onChange
}: Readonly<{
	scales: QuestionScale[];
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	sectionKey: string;
	questionKey: string;
	onChange: (scales: QuestionScale[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();
	const session = useOptionKeySessionOrNoop();

	function updateScale(index: number, updater: (s: QuestionScale) => void) {
		const next = structuredClone(scales);
		updater(next[index]);
		onChange(next);
	}

	function addScale() {
		const firstOptionKey = mintOptionKey(new Set());
		if (firstOptionKey === null) return;
		const scale = makeDefaultQuestionScale(firstOptionKey, t("newOptionLabel"));
		session.noteCreated({ kind: "questionScale", sectionKey, questionKey, scaleKey: scale.key }, firstOptionKey);
		onChange([...scales, scale]);
	}

	function removeScale(index: number) {
		const removed = scales[index];
		if (removed) {
			session.noteRetired(
				{ kind: "questionScale", sectionKey, questionKey, scaleKey: removed.key },
				removed.options.map(option => option.key)
			);
		}
		onChange(scales.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("scales")} ({scales.length})
				</Label>
				{!translationMode && (
					<Button variant="ghost" size="sm" onClick={addScale}>
						<Plus className="mr-1 h-3 w-3" aria-hidden="true" />
						{t("addScale")}
					</Button>
				)}
			</div>

			{scales.map((scale, sIdx) => {
				const defaultScale = scaleGuidanceMap.get(scale.key);
				const customized = isScaleCustomized(scale, defaultScale);

				return (
					<div
						key={`${scale.key}-${sIdx.toString()}`}
						className={`space-y-3 rounded-lg border p-3 ${
							customized
								? "border-accent-terracotta/30 bg-accent-terracotta/5"
								: "border-edge/40 bg-card/30"
						}`}>
						<div className="flex items-start justify-between gap-2">
							<div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3">
								<div className="space-y-1">
									<Label className="text-xs text-muted-foreground">{t("scaleKey")}</Label>
									<Select
										value={scale.key}
										disabled={translationMode}
										onValueChange={v =>
											updateScale(sIdx, s => {
												s.key = v as QuestionScale["key"];
											})
										}>
										<SelectTrigger className="w-full text-sm data-[size=default]:h-10">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{SCALE_KEY_OPTIONS.map(k => (
												<SelectItem key={k} value={k}>
													{t.has(`scaleLabels.${k}`) ? t(`scaleLabels.${k}`) : k}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<EditableField
									label={t("scaleTitle")}
									value={scale.title}
									onChange={v =>
										updateScale(sIdx, s => {
											s.title = v;
										})
									}
								/>
								<EditableField
									label={t("scalePrompt")}
									value={scale.prompt}
									onChange={v =>
										updateScale(sIdx, s => {
											s.prompt = v;
										})
									}
								/>
								<SelectionModeField
									value={scale.selection_mode ?? "single"}
									disabled={translationMode}
									onChange={mode =>
										updateScale(sIdx, s => {
											s.selection_mode = mode;
										})
									}
								/>
							</div>
							<div className="mt-5 flex items-center gap-1">
								{customized && (
									<span className="inline-flex items-center gap-1 rounded-full border border-accent-terracotta/40 bg-accent-terracotta/10 px-2 py-0.5 text-[10px] font-medium text-accent-terracotta">
										<span
											className="h-1.5 w-1.5 rounded-full bg-accent-terracotta/70"
											aria-hidden="true"
										/>
										{t("customOptions")}
									</span>
								)}
								{!translationMode && (
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
										aria-label={t("removeScale")}
										onClick={() => removeScale(sIdx)}>
										<Trash2 className="h-4 w-4" aria-hidden="true" />
									</Button>
								)}
							</div>
						</div>

						<ScaleOptionsEditor
							options={scale.options}
							scope={{ kind: "questionScale", sectionKey, questionKey, scaleKey: scale.key }}
							onChange={opts =>
								updateScale(sIdx, s => {
									s.options = opts;
								})
							}
						/>
					</div>
				);
			})}
		</div>
	);
}

export function QuestionEditor({
	question,
	sectionQuestions,
	scaleGuidanceMap,
	expandRequest,
	onUpdate,
	onRemove
}: Readonly<{
	question: InstrumentQuestion;
	sectionQuestions: readonly InstrumentQuestion[];
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	/** Bumped when an issue in this question should be opened. */
	expandRequest?: number;
	onUpdate: (updater: (q: InstrumentQuestion) => void) => void;
	onRemove: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();
	const session = useOptionKeySessionOrNoop();
	const [expanded, setExpanded] = useState(false);
	// Seeded at 0, never from the prop: a question that is already the review
	// target when it first mounts still has to expand. Review nonces start at 1.
	const [handledExpandRequest, setHandledExpandRequest] = useState(0);
	const questionLabel = formatQuestionKeyForDisplay(question.question_key);
	const questionType = question.question_type ?? "scaled";
	const isChecklist = questionType === "checklist";

	// Opening an issue has to reveal the control it points at, so a collapsed
	// question expands itself when it is the one being reviewed. Adjusted during
	// render so the field exists on the same frame the issue is opened.
	if (expandRequest !== undefined && expandRequest !== handledExpandRequest) {
		setHandledExpandRequest(expandRequest);
		setExpanded(true);
	}

	function removeQuestion() {
		for (const scale of question.scales) {
			session.noteRetired(
				{
					kind: "questionScale",
					sectionKey: question.section_key,
					questionKey: question.question_key,
					scaleKey: scale.key
				},
				scale.options.map(option => option.key)
			);
		}
		if (question.options.length > 0) {
			session.noteRetired(
				{ kind: "checklist", sectionKey: question.section_key, questionKey: question.question_key },
				question.options.map(option => option.key)
			);
		}
		onRemove();
	}

	return (
		<div className="rounded-lg border border-edge/40 bg-card p-3 shadow-sm">
			{/* Collapsed header */}
			<div className="flex items-start gap-2">
				<Button
					variant="ghost"
					size="icon"
					className="mt-0.5 h-6 w-6 shrink-0"
					aria-expanded={expanded}
					aria-label={expanded ? t("collapseQuestion") : t("expandQuestion")}
					onClick={() => setExpanded(!expanded)}>
					<ChevronDown
						className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
						aria-hidden="true"
					/>
				</Button>
				<Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs tabular-nums">
					{questionLabel}
				</Badge>
				<div className="min-w-0 flex-1">
					<p className="line-clamp-2 text-sm font-medium leading-relaxed">
						{renderInlineMarkdown(question.prompt)}
					</p>
					<div className="mt-1 flex flex-wrap gap-1.5">
						<Badge variant={isChecklist ? "secondary" : "default"} className="gap-1 text-xs">
							{isChecklist ? (
								<ListChecks className="h-3 w-3" aria-hidden="true" />
							) : (
								<Ruler className="h-3 w-3" aria-hidden="true" />
							)}
							{t(`questionTypes.${questionType}`)}
						</Badge>
						<Badge variant="outline" className="text-xs">
							{t(`modes.${question.mode}`)}
						</Badge>
						{question.constructs.map(c => (
							<Badge key={c} variant="secondary" className="text-xs">
								{t(`constructLabels.${c}`)}
							</Badge>
						))}
						{question.required === false && (
							<Badge variant="outline" className="text-xs">
								{t("optional")}
							</Badge>
						)}
						{question.display_if && (
							<DisplayConditionBadge
								condition={question.display_if}
								sectionQuestions={sectionQuestions}
							/>
						)}
						{question.scales.map(scale => {
							const defaultScale = scaleGuidanceMap.get(scale.key);
							const customized = isScaleCustomized(scale, defaultScale);
							if (!customized) return null;
							return (
								<Badge
									key={`custom-${scale.key}`}
									variant="outline"
									className="gap-1 border-accent-terracotta/40 bg-accent-terracotta/10 px-1.5 py-0 text-[10px] text-accent-terracotta">
									{t.has(`scaleLabels.${scale.key}`) ? t(`scaleLabels.${scale.key}`) : scale.key}:{" "}
									{t("customOptions")}
								</Badge>
							);
						})}
					</div>
				</div>
				{/*
				 * Delete button toned down from always-red to muted with hover transition.
				 * Prevents it from being the dominant colour in a list of questions.
				 * Hidden while translating - removing a question is a structural change
				 * owned by the base language.
				 */}
				{!translationMode && (
					<Button
						variant="ghost"
						size="icon"
						className="shrink-0 text-muted-foreground hover:text-destructive"
						aria-label={t("removeQuestion")}
						onClick={removeQuestion}>
						<Trash2 className="h-4 w-4" aria-hidden="true" />
					</Button>
				)}
			</div>

			{/* Expanded editor */}
			{expanded && (
				<div className="mt-4 space-y-4 border-t border-edge/25 pl-8 pt-4">
					<div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
						<EditableField
							label={t("questionKey")}
							value={question.question_key}
							mono
							isKey
							onChange={v =>
								onUpdate(q => {
									q.question_key = v;
								})
							}
						/>
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">{t("questionType")}</Label>
							<Select
								value={questionType}
								disabled={translationMode}
								onValueChange={v =>
									onUpdate(q => {
										q.question_type = v as InstrumentQuestion["question_type"];
									})
								}>
								<SelectTrigger className="w-full text-sm data-[size=default]:h-10">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{QUESTION_TYPE_OPTIONS.map(qt => (
										<SelectItem key={qt} value={qt}>
											{t.has(`questionTypes.${qt}`) ? t(`questionTypes.${qt}`) : qt}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">{t("mode")}</Label>
							<Select
								value={question.mode}
								disabled={translationMode}
								onValueChange={v =>
									onUpdate(q => {
										q.mode = v as InstrumentQuestion["mode"];
									})
								}>
								<SelectTrigger className="w-full text-sm data-[size=default]:h-10">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MODE_OPTIONS.map(m => (
										<SelectItem key={m} value={m}>
											{t.has(`modes.${m}`) ? t(`modes.${m}`) : m}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<EditableField
						label={t("prompt")}
						value={question.prompt}
						multiline
						onChange={v =>
							onUpdate(q => {
								q.prompt = v;
							})
						}
					/>
					<EditableField
						label={t("questionNotesPrompt")}
						value={question.notes_prompt ?? ""}
						multiline
						onChange={v =>
							onUpdate(q => {
								q.notes_prompt = v || null;
							})
						}
					/>

					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">{t("constructs")}</Label>
						<div className="flex flex-wrap gap-2">
							{CONSTRUCT_OPTIONS.map(c => {
								const checked = question.constructs.includes(c);
								return (
									<button
										key={c}
										type="button"
										disabled={translationMode}
										aria-pressed={checked}
										onClick={() => {
											onUpdate(q => {
												if (checked) {
													q.constructs = q.constructs.filter(x => x !== c);
												} else {
													q.constructs = [...q.constructs, c];
												}
											});
										}}
										className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
											checked
												? "border-primary bg-primary text-primary-foreground"
												: "border-edge/40 bg-muted/40 text-muted-foreground hover:border-primary/50"
										}`}>
										{checked ? (
											<Check className="h-3 w-3 shrink-0" aria-hidden="true" />
										) : (
											<Plus className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
										)}
										{t.has(`constructLabels.${c}`) ? t(`constructLabels.${c}`) : c}
									</button>
								);
							})}
						</div>
					</div>

					{/* Metadata row: Required + display condition grouped together */}
					<div className="flex flex-wrap items-start gap-4">
						<label
							className={`flex items-center gap-2 pt-0.5 text-sm ${translationMode ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
							<input
								type="checkbox"
								checked={question.required !== false}
								disabled={translationMode}
								onChange={e =>
									onUpdate(q => {
										q.required = e.target.checked;
									})
								}
								className="rounded border-edge/40"
							/>
							{t("required")}
						</label>

						<div className="min-w-0 flex-1">
							<DisplayConditionEditor
								condition={question.display_if ?? null}
								sectionQuestions={sectionQuestions}
								currentQuestionKey={question.question_key}
								onChange={c =>
									onUpdate(q => {
										q.display_if = c;
									})
								}
							/>
						</div>
					</div>

					<Separator />

					{!isChecklist && (
						<QuestionScalesEditor
							scales={question.scales}
							scaleGuidanceMap={scaleGuidanceMap}
							sectionKey={question.section_key}
							questionKey={question.question_key}
							onChange={scales =>
								onUpdate(q => {
									q.scales = scales;
								})
							}
						/>
					)}

					{isChecklist && (
						<ChoiceOptionsEditor
							options={question.options}
							scope={{
								kind: "checklist",
								sectionKey: question.section_key,
								questionKey: question.question_key
							}}
							onChange={opts =>
								onUpdate(q => {
									q.options = opts;
								})
							}
						/>
					)}
				</div>
			)}
		</div>
	);
}

export { SEMANTIC_OPTION_KEYS };
