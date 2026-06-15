"use client";

import { useTranslations } from "next-intl";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parsePromptSegments } from "@/lib/audit/prompt-segments";
import { getActiveScaleKeysForQuestion } from "@/lib/audit/selectors";
import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";
import { cn } from "@/lib/utils";
import type { InstrumentQuestion, QuestionResponsePayload, ScaleKey } from "@/types/audit";

interface QuestionTableRow {
	readonly question: InstrumentQuestion;
	readonly selectedAnswers: QuestionResponsePayload;
}

export interface SectionQuestionTableProps {
	readonly rows: readonly QuestionTableRow[];
	readonly disabled?: boolean;
	readonly onSelectAnswer: (questionKey: string, scaleKey: string, optionKey: string) => void;
	readonly onChangeQuestionNote?: (questionKey: string, nextNote: string) => void;
}

const SCALE_COLUMN_ORDER: readonly ScaleKey[] = ["provision", "variety", "challenge", "sociability"];

/**
 * Desktop and tablet matrix layout for audit questions.
 */
export function SectionQuestionTable({
	rows,
	disabled = false,
	onSelectAnswer,
	onChangeQuestionNote
}: Readonly<SectionQuestionTableProps>) {
	const t = useTranslations("auditor.execute.sectionTable");
	const visibleScaleKeys = getVisibleScaleKeys(rows);

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto">
				<div
					className="grid min-w-[980px] rounded-card border border-edge/40 bg-card"
					style={{
						gridTemplateColumns: [
							"minmax(320px, 1.8fr)",
							...visibleScaleKeys.map(() => "minmax(170px, 1fr)")
						].join(" ")
					}}>
					<div className="border-r border-edge/40 bg-secondary/50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
						{t("itemColumn")}
					</div>
					{visibleScaleKeys.map(scaleKey => (
						<div
							key={scaleKey}
							className="border-r border-edge/40 bg-secondary/50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary last:border-r-0">
							{t(`scaleColumns.${scaleKey}`)}
						</div>
					))}

					{rows.map((row, rowIndex) => {
						const activeScaleKeys = getActiveScaleKeysForQuestion(row.question, row.selectedAnswers);

						return (
							<Fragment key={row.question.question_key}>
								<div
									className={cn(
										"border-r border-t border-edge/40 px-4 py-4",
										rowIndex % 2 === 0 ? "bg-card" : "bg-secondary/20"
									)}>
									<QuestionPrompt
										question={row.question}
										selectedAnswers={row.selectedAnswers}
										disabled={disabled}
										onChangeQuestionNote={onChangeQuestionNote}
									/>
								</div>
								{visibleScaleKeys.map(scaleKey => {
									const scale = row.question.scales.find(
										currentScale => currentScale.key === scaleKey
									);
									const cellClassName = cn(
										"border-r border-t border-edge/40 px-3 py-4 last:border-r-0",
										rowIndex % 2 === 0 ? "bg-card" : "bg-secondary/20"
									);

									if (!scale) {
										return (
											<div
												key={`${row.question.question_key}.${scaleKey}`}
												className={cellClassName}>
												<p className="text-sm text-muted-foreground">{t("notAvailable")}</p>
											</div>
										);
									}

									if (scaleKey !== "provision" && !activeScaleKeys.includes(scaleKey)) {
										return (
											<div
												key={`${row.question.question_key}.${scaleKey}`}
												className={cellClassName}>
												<p className="text-sm text-muted-foreground">{t("followUpPending")}</p>
											</div>
										);
									}

									return (
										<div key={`${row.question.question_key}.${scaleKey}`} className={cellClassName}>
											<div className="space-y-3">
												<p className="text-xs leading-5 text-muted-foreground">
													{scale.prompt}
												</p>
												<div className="space-y-2">
													{scale.options.map(option => {
														const isSelected =
															typeof row.selectedAnswers[scale.key] === "string" &&
															row.selectedAnswers[scale.key] === option.key;

														return (
															<Button
																key={`${row.question.question_key}.${scale.key}.${option.key}`}
																type="button"
																variant="outline"
																disabled={disabled}
																className={cn(
																	"h-auto w-full justify-start whitespace-normal rounded-field px-3 py-2 text-left leading-5",
																	isSelected
																		? "border-primary bg-primary/12 text-primary"
																		: "border-action-outline-border bg-background text-foreground hover:bg-secondary/60"
																)}
																onClick={() => {
																	onSelectAnswer(
																		row.question.question_key,
																		scale.key,
																		option.key
																	);
																}}>
																<span className="inline-flex items-center gap-2">
																	<span
																		className={cn(
																			"size-4 rounded-full border-2",
																			isSelected
																				? "border-primary bg-primary"
																				: "border-edge/40 bg-background"
																		)}
																	/>
																	<span>{option.label}</span>
																</span>
															</Button>
														);
													})}
												</div>
											</div>
										</div>
									);
								})}
							</Fragment>
						);
					})}
				</div>
			</div>
		</div>
	);
}

interface QuestionPromptProps {
	readonly question: InstrumentQuestion;
	readonly selectedAnswers: QuestionResponsePayload;
	readonly disabled: boolean;
	readonly onChangeQuestionNote?: (questionKey: string, nextNote: string) => void;
}

/**
 * Render the left prompt cell for one matrix row.
 */
function QuestionPrompt({ question, selectedAnswers, disabled, onChangeQuestionNote }: Readonly<QuestionPromptProps>) {
	const t = useTranslations("auditor.execute.questionCard");
	const promptSegments = parsePromptSegments(question.prompt);

	return (
		<div className="space-y-2">
			<p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
				{formatQuestionKeyForDisplay(question.question_key)}
			</p>
			<p className="text-sm leading-6 text-foreground">
				<span className="block text-sm font-bold tracking-[0.04em] text-primary">{t("thisPlayspace")}</span>
				{promptSegments.map((segment, index) => (
					<Fragment key={`${question.question_key}-${index.toString()}`}>
						<span className={segment.bold ? "font-semibold text-primary" : "font-semibold"}>
							{segment.text}
						</span>
					</Fragment>
				))}
			</p>
			{question.notes_prompt ? (
				<div className="space-y-2 rounded-field border border-edge/50 bg-secondary/30 p-3">
					<p className="text-xs font-medium leading-5 text-foreground">{question.notes_prompt}</p>
					<Textarea
						rows={4}
						disabled={disabled}
						value={typeof selectedAnswers.question_note === "string" ? selectedAnswers.question_note : ""}
						onChange={event => {
							onChangeQuestionNote?.(question.question_key, event.target.value);
						}}
						placeholder={t("enterComments")}
					/>
				</div>
			) : null}
		</div>
	);
}

/**
 * Resolve the ordered scale columns that appear for this section.
 */
function getVisibleScaleKeys(rows: readonly QuestionTableRow[]): ScaleKey[] {
	return SCALE_COLUMN_ORDER.filter(scaleKey => {
		return rows.some(row => row.question.scales.some(scale => scale.key === scaleKey));
	});
}
