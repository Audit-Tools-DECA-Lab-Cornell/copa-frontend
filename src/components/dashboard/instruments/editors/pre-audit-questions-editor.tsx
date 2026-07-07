import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { PreAuditQuestion } from "@/types/audit";

import { INPUT_TYPE_OPTIONS, MODE_OPTIONS, PAGE_KEY_OPTIONS } from "../constants";
import { makeDefaultPreAuditQuestion } from "../defaults";
import { useInstrumentEdit } from "../instrument-edit-context";
import { EditableField } from "../shared-components";
import { ChoiceOptionsEditor } from "./shared-editors";

// Add this new component below PreAuditQuestionsEditor

function QuestionCard({
	question,
	index,
	onUpdate,
	onRemove
}: {
	question: PreAuditQuestion;
	index: number;
	onUpdate: (updater: (q: PreAuditQuestion) => void) => void;
	onRemove: () => void;
}) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();
	const [showGroup, setShowGroup] = useState(false);

	return (
		<div className="rounded-xl border border-edge/40 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.04] flex flex-col">
			{/* Card top bar */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-edge/50 bg-muted/30 rounded-t-xl">
				<div className="flex items-center gap-2">
					<GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Question {index + 1}
					</span>
					{question.required && (
						<Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
							Required
						</Badge>
					)}
				</div>
				{!translationMode && (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
						onClick={onRemove}
						aria-label="Remove question">
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				)}
			</div>

			{/* Card body */}
			<div className="px-4 py-4 flex-1 space-y-4">
				<div className="grid sm:grid-cols-2 gap-3">
					<EditableField
						label={t("questionKey")}
						value={question.key}
						mono
						isKey
						onChange={v =>
							onUpdate(q => {
								q.key = v;
							})
						}
					/>
					<EditableField
						label={t("questionLabel")}
						value={question.label}
						onChange={v =>
							onUpdate(q => {
								q.label = v;
							})
						}
					/>
				</div>

				<EditableField
					label={t("questionDescription")}
					value={question.description ?? ""}
					onChange={v =>
						onUpdate(q => {
							q.description = v || null;
						})
					}
				/>

				<Separator className="opacity-50" />

				<div className="grid sm:grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label className="text-xs font-medium text-muted-foreground">{t("inputType")}</Label>
						<Select
							value={question.input_type}
							disabled={translationMode}
							onValueChange={v =>
								onUpdate(q => {
									q.input_type = v as PreAuditQuestion["input_type"];
								})
							}>
							<SelectTrigger className="h-8 text-sm bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{INPUT_TYPE_OPTIONS.map(opt => (
									<SelectItem key={opt} value={opt}>
										{t(`preAuditInputTypes.${opt}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs font-medium text-muted-foreground">{t("pageKey")}</Label>
						<Select
							value={question.page_key}
							disabled={translationMode}
							onValueChange={v =>
								onUpdate(q => {
									q.page_key = v as PreAuditQuestion["page_key"];
								})
							}>
							<SelectTrigger className="h-8 text-sm bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PAGE_KEY_OPTIONS.map(opt => (
									<SelectItem key={opt} value={opt}>
										{opt}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Group key - hidden until needed */}
				{question.group_key || (showGroup && !translationMode) ? (
					<EditableField
						label={t("groupKey")}
						value={question.group_key ?? ""}
						mono
						isKey
						onChange={v =>
							onUpdate(q => {
								q.group_key = v || null;
							})
						}
					/>
				) : (
					!translationMode && (
						<button
							type="button"
							onClick={() => setShowGroup(true)}
							className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2">
							+ Set group key
						</button>
					)
				)}

				<Separator className="opacity-50" />

				{/* Visible modes */}
				<div className="space-y-2">
					<Label className="text-xs font-medium text-muted-foreground">{t("visibleModes")}</Label>
					<div className="flex flex-wrap gap-1.5">
						{MODE_OPTIONS.map(m => {
							const checked = question.visible_modes.includes(m);
							return (
								<button
									key={m}
									type="button"
									disabled={translationMode}
									onClick={() =>
										onUpdate(q => {
											q.visible_modes = checked
												? q.visible_modes.filter(x => x !== m)
												: [...q.visible_modes, m];
										})
									}
									className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${
										checked
											? "border-primary bg-primary text-primary-foreground shadow-sm"
											: "border-edge/40 bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
									}`}>
									{t.has(`modes.${m}`) ? t(`modes.${m}`) : m}
								</button>
							);
						})}
					</div>
				</div>

				{/* Required */}
				<div
					className={`flex items-center justify-between rounded-lg border border-edge/40 bg-muted/20 px-3 py-2.5 transition-colors ${
						translationMode ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-muted/40"
					}`}
					onClick={() => {
						if (translationMode) return;
						onUpdate(q => {
							q.required = !q.required;
						});
					}}>
					<div>
						<p className="text-sm font-medium leading-none">{t("required")}</p>
						<p className="text-xs text-muted-foreground mt-0.5">Respondents must answer this question</p>
					</div>
					<input
						type="checkbox"
						checked={question.required}
						disabled={translationMode}
						onChange={e =>
							onUpdate(q => {
								q.required = e.target.checked;
							})
						}
						onClick={e => e.stopPropagation()}
						className="h-4 w-4 rounded border-edge/40 accent-primary cursor-pointer"
					/>
				</div>
			</div>

			{/* Options */}
			{(question.options?.length > 0 || ["select", "radio", "checkbox"].includes(question.input_type)) && (
				<div className="border-t-2 border-edge/50 px-4 py-3 bg-muted/10 rounded-b-xl">
					<ChoiceOptionsEditor
						options={question.options}
						onChange={opts =>
							onUpdate(q => {
								q.options = opts;
							})
						}
					/>
				</div>
			)}
		</div>
	);
}

export function PreAuditQuestionsEditor({
	questions,
	onChange
}: Readonly<{
	questions: PreAuditQuestion[];
	onChange: (questions: PreAuditQuestion[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();

	function updateQuestion(index: number, updater: (q: PreAuditQuestion) => void) {
		const next = structuredClone(questions);
		updater(next[index]);
		onChange(next);
	}

	function addQuestion() {
		onChange([...questions, makeDefaultPreAuditQuestion()]);
	}

	function removeQuestion(index: number) {
		onChange(questions.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-6">
			<SectionHeader
				as="h3"
				title={t("preAudit")}
				description={`${questions.length} ${questions.length === 1 ? "question" : "questions"} configured`}
				actions={
					!translationMode ? (
						<Button onClick={addQuestion} size="sm" className="gap-1.5">
							<Plus className="h-4 w-4" />
							{t("addQuestion")}
						</Button>
					) : undefined
				}
			/>

			{/* Empty state */}
			{questions.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-edge/50 bg-muted/20 py-12 text-center">
					<p className="text-sm font-medium text-muted-foreground">No questions yet</p>
					<p className="text-xs text-muted-foreground/70 mt-1">
						Click &ldquo;Add question&ldquo; to get started
					</p>
				</div>
			)}

			{/* Question cards grid */}
			<div className="grid gap-4 lg:grid-cols-2">
				{questions.map((q, qIdx) => (
					<QuestionCard
						key={qIdx}
						question={q}
						index={qIdx}
						onUpdate={updater => updateQuestion(qIdx, updater)}
						onRemove={() => removeQuestion(qIdx)}
					/>
				))}
			</div>
		</div>
	);
}
