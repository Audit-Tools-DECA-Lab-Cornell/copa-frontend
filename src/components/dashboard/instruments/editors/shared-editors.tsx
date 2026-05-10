import { useState } from "react";
import { useTranslations } from "next-intl";
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	GitBranch,
	GripVertical,
	ListChecks,
	Minus,
	Plus,
	Ruler,
	Sparkles,
	Trash2
} from "lucide-react";
import type {
	ChoiceOption,
	InstrumentQuestion,
	QuestionDisplayCondition,
	QuestionScale,
	ScaleDefinition,
	ScaleOption
} from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { EditableField, DisplayConditionBadge } from "../shared-components";
import { makeDefaultChoiceOption, makeDefaultScaleOption, makeDefaultQuestionScale } from "../defaults";
import { moveArrayItem, isScaleCustomized, formatQuestionKeyForDisplay, renderInlineMarkdown } from "../utils";
import { CONSTRUCT_OPTIONS, MODE_OPTIONS, QUESTION_TYPE_OPTIONS, SCALE_KEY_OPTIONS } from "../constants";

export function ChoiceOptionsEditor({
	options,
	onChange
}: Readonly<{
	options: ChoiceOption[];
	onChange: (options: ChoiceOption[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateOption(index: number, field: keyof ChoiceOption, value: string | null) {
		const next = structuredClone(options);
		(next[index] as Record<string, string | null | undefined>)[field] = value;
		onChange(next);
	}

	function addOption() {
		onChange([...options, makeDefaultChoiceOption()]);
	}

	function removeOption(index: number) {
		onChange(options.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("options")} ({options.length})
				</Label>
				<Button variant="ghost" size="sm" onClick={addOption}>
					<Plus className="mr-1 h-3 w-3" />
					{t("addOption")}
				</Button>
			</div>
			{options.map((opt, oIdx) => (
				<div key={oIdx} className="flex items-start gap-2 rounded border border-border/40 bg-muted/20 p-2">
					<div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-3">
						<EditableField
							label={t("optionKey")}
							value={opt.key}
							mono
							onChange={v => updateOption(oIdx, "key", v)}
						/>
						<EditableField
							label={t("optionLabel")}
							value={opt.label}
							onChange={v => updateOption(oIdx, "label", v)}
						/>
						<EditableField
							label={t("optionDescription")}
							value={opt.description ?? ""}
							onChange={v => updateOption(oIdx, "description", v || null)}
						/>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
						onClick={() => removeOption(oIdx)}>
						<Minus className="h-4 w-4" />
					</Button>
				</div>
			))}
		</div>
	);
}

export function ScaleOptionsEditor({
	options,
	onChange
}: Readonly<{
	options: ScaleOption[];
	onChange: (options: ScaleOption[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateOption(index: number, updater: (opt: ScaleOption) => void) {
		const next = structuredClone(options);
		updater(next[index]);
		onChange(next);
	}

	function addOption() {
		onChange([...options, makeDefaultScaleOption()]);
	}

	function removeOption(index: number) {
		onChange(options.filter((_, i) => i !== index));
	}

	function moveOption(index: number, direction: "up" | "down") {
		onChange(moveArrayItem(options, index, direction));
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("scaleOptions")} ({options.length})
				</Label>
				<Button variant="ghost" size="sm" onClick={addOption}>
					<Plus className="mr-1 h-3 w-3" />
					{t("addOption")}
				</Button>
			</div>

			{/*
			 * Column header row gives the table structure an explicit header, making it
			 * easier to scan across multiple option rows without re-reading field labels
			 * in each row.
			 */}
			{options.length > 0 && (
				<div className="grid grid-cols-[28px_1fr_80px_80px_auto_32px] gap-x-2 items-center px-2 pb-1">
					<span /> {/* drag handle column */}
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Key → Label
					</span>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
						{t("additionValue")}
					</span>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
						{t("boostValue")}
					</span>
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Flags
					</span>
					<span /> {/* delete column */}
				</div>
			)}

			{options.map((opt, oIdx) => (
				/*
				 * Each option is now a single compact row instead of a stacked block.
				 * Key is shown as small monospace text above the label input (not a
				 * separate full-width field) — reducing the row from 4 fields to 2 visible
				 * inputs (label + two number inputs), which is much easier to scan.
				 *
				 * Flags (allows_follow_up_scales, is_not_applicable) are surfaced as
				 * togglable pill badges instead of buried checkboxes at the bottom of each
				 * block. Active state is visually distinct so the full option list can be
				 * scanned at a glance.
				 *
				 * Move up/down are now icon-only buttons (no text label), saving significant
				 * horizontal space and reducing visual noise.
				 */
				<div
					key={oIdx}
					className="grid grid-cols-[28px_1fr_80px_80px_auto_32px] gap-x-2 items-center rounded border border-border/40 bg-muted/20 px-2 py-2">
					{/* Drag handle / reorder controls */}
					<div className="flex flex-col items-center gap-0.5">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-5 w-5 text-muted-foreground/60 hover:text-muted-foreground"
							disabled={oIdx === 0}
							onClick={() => moveOption(oIdx, "up")}
							aria-label={t("moveOptionUp")}>
							<ArrowUp className="h-3 w-3" />
						</Button>
						<GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" aria-hidden />
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-5 w-5 text-muted-foreground/60 hover:text-muted-foreground"
							disabled={oIdx === options.length - 1}
							onClick={() => moveOption(oIdx, "down")}
							aria-label={t("moveOptionDown")}>
							<ArrowDown className="h-3 w-3" />
						</Button>
					</div>

					{/* Key (readonly display) + Label (editable) */}
					<div className="min-w-0">
						<p className="font-mono text-[10px] text-muted-foreground/70 mb-0.5 truncate">
							{opt.key || "—"}
						</p>
						<Input
							className="h-7 text-xs px-2"
							value={opt.label}
							placeholder={t("optionLabel")}
							onChange={e =>
								updateOption(oIdx, o => {
									o.label = e.target.value;
								})
							}
						/>
					</div>

					{/* Addition value */}
					<Input
						type="number"
						className="h-7 text-xs font-mono px-2 text-center"
						value={opt.addition_value}
						onChange={e =>
							updateOption(oIdx, o => {
								o.addition_value = Number(e.target.value) || 0;
							})
						}
					/>

					{/* Boost value */}
					<Input
						type="number"
						className="h-7 text-xs font-mono px-2 text-center"
						value={opt.boost_value}
						onChange={e =>
							updateOption(oIdx, o => {
								o.boost_value = Number(e.target.value) || 0;
							})
						}
					/>

					{/* Flag toggles as pills */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={() =>
								updateOption(oIdx, o => {
									o.is_not_applicable = !o.is_not_applicable;
								})
							}
							className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
								opt.is_not_applicable
									? "border-amber-400/60 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-300"
									: "border-border bg-transparent text-muted-foreground hover:border-border/80"
							}`}
							title={t("isNotApplicable")}>
							N/A
						</button>
						<button
							type="button"
							onClick={() =>
								updateOption(oIdx, o => {
									o.allows_follow_up_scales = !o.allows_follow_up_scales;
								})
							}
							className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
								opt.allows_follow_up_scales
									? "border-violet-400/60 bg-violet-100 text-violet-800 dark:border-violet-500/40 dark:bg-violet-900/30 dark:text-violet-300"
									: "border-border bg-transparent text-muted-foreground hover:border-border/80"
							}`}
							title={t("allowsFollowUp")}>
							Follow-up
						</button>
					</div>

					{/* Delete */}
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
						onClick={() => removeOption(oIdx)}>
						<Minus className="h-3.5 w-3.5" />
					</Button>
				</div>
			))}

			{/* Legend for flag pills */}
			{options.some(o => o.is_not_applicable || o.allows_follow_up_scales) && (
				<div className="flex items-center gap-3 pt-1 pl-1">
					<span className="text-[10px] text-muted-foreground/60">Flags:</span>
					<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
						<span className="rounded-full border border-amber-400/60 bg-amber-100 dark:bg-amber-900/30 px-1.5 text-amber-800 dark:text-amber-300">
							N/A
						</span>
						= not applicable option
					</span>
					<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
						<span className="rounded-full border border-violet-400/60 bg-violet-100 dark:bg-violet-900/30 px-1.5 text-violet-800 dark:text-violet-300">
							Follow-up
						</span>
						= unlocks follow-up scales
					</span>
				</div>
			)}
		</div>
	);
}

export function DisplayConditionEditor({
	condition,
	onChange
}: Readonly<{
	condition: QuestionDisplayCondition | null;
	onChange: (condition: QuestionDisplayCondition | null) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	if (!condition) {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange({ question_key: "", response_key: "provision", any_of_option_keys: [] })}>
				<GitBranch className="mr-1.5 h-3.5 w-3.5" />
				{t("setCondition")}
			</Button>
		);
	}

	return (
		<div className="rounded-md border border-status-warning-border bg-status-warning-surface/30 p-3 space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold text-status-warning flex items-center gap-1.5">
					<GitBranch className="h-3.5 w-3.5" />
					{t("displayCondition")}
				</Label>
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-destructive"
					onClick={() => onChange(null)}>
					{t("clearCondition")}
				</Button>
			</div>
			<div className="grid gap-3 md:grid-cols-3">
				<EditableField
					label={t("questionKey")}
					value={condition.question_key}
					mono
					onChange={v => onChange({ ...condition, question_key: v })}
				/>
				<EditableField
					label={t("responseKey")}
					value={condition.response_key}
					mono
					onChange={v => onChange({ ...condition, response_key: v })}
				/>
				<EditableField
					label={t("anyOfOptionKeys")}
					value={condition.any_of_option_keys.join(", ")}
					mono
					onChange={v =>
						onChange({
							...condition,
							any_of_option_keys: v
								.split(",")
								.map(s => s.trim())
								.filter(Boolean)
						})
					}
				/>
			</div>
		</div>
	);
}

export function QuestionScalesEditor({
	scales,
	scaleGuidanceMap,
	onChange
}: Readonly<{
	scales: QuestionScale[];
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	onChange: (scales: QuestionScale[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateScale(index: number, updater: (s: QuestionScale) => void) {
		const next = structuredClone(scales);
		updater(next[index]);
		onChange(next);
	}

	function addScale() {
		onChange([...scales, makeDefaultQuestionScale()]);
	}

	function removeScale(index: number) {
		onChange(scales.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("scales")} ({scales.length})
				</Label>
				<Button variant="ghost" size="sm" onClick={addScale}>
					<Plus className="mr-1 h-3 w-3" />
					{t("addScale")}
				</Button>
			</div>

			{scales.map((scale, sIdx) => {
				const defaultScale = scaleGuidanceMap.get(scale.key);
				const customized = isScaleCustomized(scale, defaultScale);

				return (
					<div
						key={sIdx}
						className={`rounded-lg border p-3 space-y-3 ${
							customized
								? "border-accent-terracotta/30 bg-accent-terracotta/5"
								: "border-border/50 bg-card/30"
						}`}>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1 grid gap-3 md:grid-cols-3">
								<div className="space-y-1">
									<Label className="text-xs text-muted-foreground">{t("scaleKey")}</Label>
									<Select
										value={scale.key}
										onValueChange={v =>
											updateScale(sIdx, s => {
												s.key = v as QuestionScale["key"];
											})
										}>
										<SelectTrigger className="text-sm">
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
							</div>
							<div className="flex items-center gap-1 mt-5">
								{customized && (
									<Badge
										variant="outline"
										className="gap-1 border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta text-[10px] px-1.5 py-0">
										<Sparkles className="h-3 w-3" />
										{t("customOptions")}
									</Badge>
								)}
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
									onClick={() => removeScale(sIdx)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<ScaleOptionsEditor
							options={scale.options}
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
	scaleGuidanceMap,
	onUpdate,
	onRemove
}: Readonly<{
	question: InstrumentQuestion;
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	onUpdate: (updater: (q: InstrumentQuestion) => void) => void;
	onRemove: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const [expanded, setExpanded] = useState(false);
	const questionLabel = formatQuestionKeyForDisplay(question.question_key);
	const questionType = question.question_type ?? "scaled";
	const isChecklist = questionType === "checklist";

	return (
		<div className="rounded-lg border border-border/50 bg-card/40 p-3">
			{/* Collapsed header */}
			<div className="flex items-start gap-2">
				<Button
					variant="ghost"
					size="icon"
					className="mt-0.5 h-6 w-6 shrink-0"
					onClick={() => setExpanded(!expanded)}>
					<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
				</Button>
				<Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs tabular-nums">
					{questionLabel}
				</Badge>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium leading-relaxed line-clamp-2">
						{renderInlineMarkdown(question.prompt)}
					</p>
					<div className="mt-1 flex flex-wrap gap-1.5">
						<Badge variant={isChecklist ? "secondary" : "default"} className="gap-1 text-xs">
							{isChecklist ? <ListChecks className="h-3 w-3" /> : <Ruler className="h-3 w-3" />}
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
						{question.display_if && <DisplayConditionBadge condition={question.display_if} />}
						{question.scales.map(scale => {
							const defaultScale = scaleGuidanceMap.get(scale.key);
							const customized = isScaleCustomized(scale, defaultScale);
							if (!customized) return null;
							return (
								<Badge
									key={`custom-${scale.key}`}
									variant="outline"
									className="gap-1 border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta text-[10px] px-1.5 py-0">
									<Sparkles className="h-3 w-3" />
									{t.has(`scaleLabels.${scale.key}`)
										? t(`scaleLabels.${scale.key}`)
										: scale.key}: {t("customOptions")}
								</Badge>
							);
						})}
					</div>
				</div>
				{/*
				 * Delete button toned down from always-red to muted with hover transition.
				 * Prevents it from being the dominant colour in a list of questions.
				 */}
				<Button
					variant="ghost"
					size="icon"
					className="shrink-0 text-muted-foreground hover:text-destructive"
					onClick={onRemove}>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>

			{/* Expanded editor */}
			{expanded && (
				<div className="mt-4 space-y-4 border-t border-border/30 pt-4 pl-8">
					<div className="grid gap-3 md:grid-cols-3">
						<EditableField
							label={t("questionKey")}
							value={question.question_key}
							mono
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
								onValueChange={v =>
									onUpdate(q => {
										q.question_type = v as InstrumentQuestion["question_type"];
									})
								}>
								<SelectTrigger className="text-sm">
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
								onValueChange={v =>
									onUpdate(q => {
										q.mode = v as InstrumentQuestion["mode"];
									})
								}>
								<SelectTrigger className="text-sm">
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
										onClick={() => {
											onUpdate(q => {
												if (checked) {
													q.constructs = q.constructs.filter(x => x !== c);
												} else {
													q.constructs = [...q.constructs, c];
												}
											});
										}}
										className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
											checked
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-muted/40 text-muted-foreground hover:border-primary/50"
										}`}>
										{t.has(`constructLabels.${c}`) ? t(`constructLabels.${c}`) : c}
									</button>
								);
							})}
						</div>
					</div>

					<label className="flex items-center gap-2 text-sm cursor-pointer">
						<input
							type="checkbox"
							checked={question.required !== false}
							onChange={e =>
								onUpdate(q => {
									q.required = e.target.checked;
								})
							}
							className="rounded border-border"
						/>
						{t("required")}
					</label>

					<DisplayConditionEditor
						condition={question.display_if ?? null}
						onChange={c =>
							onUpdate(q => {
								q.display_if = c;
							})
						}
					/>

					<Separator />

					{!isChecklist && (
						<QuestionScalesEditor
							scales={question.scales}
							scaleGuidanceMap={scaleGuidanceMap}
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
