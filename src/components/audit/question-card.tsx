"use client";

import { Fragment } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

import type { InstrumentQuestion, QuestionResponsePayload, QuestionScale } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parsePromptSegments } from "@/lib/audit/prompt-segments";

export interface AuditQuestionCardProps {
	question: InstrumentQuestion;
	selectedAnswers: QuestionResponsePayload;
	onChangeAnswers: (questionKey: string, nextAnswers: QuestionResponsePayload) => void;
	disabled?: boolean;
}

/**
 * Render one playspace question with vertically stacked scales and gated follow-ups.
 */
export function AuditQuestionCard({
	question,
	selectedAnswers,
	onChangeAnswers,
	disabled = false
}: Readonly<AuditQuestionCardProps>) {
	const t = useTranslations("auditor.execute.questionCard");
	const provisionScale = question.scales[0];
	const selectedProvisionKey = provisionScale && selectedAnswers[provisionScale.key];
	const selectedProvisionOption = provisionScale?.options.find(option => option.key === selectedProvisionKey);
	const showFollowUpScales = selectedProvisionOption?.allows_follow_up_scales === true;
	const promptSegments = parsePromptSegments(question.prompt);
	const selectedChecklistOptionKeys = readChecklistOptionKeys(selectedAnswers);
	const otherChecklistText = readChecklistOtherText(selectedAnswers);

	return (
		<div className="field-card">
			<div className="field-card-body space-y-5">
				<p className="text-base leading-7 text-foreground">
					<span className="block text-sm font-bold text-primary">{t("thisPlayspace")}</span>
					{promptSegments.map((segment, index) => (
						<Fragment key={`${question.question_key}-segment-${index.toString()}`}>
							<span className={segment.bold ? "font-semibold text-primary" : "font-semibold"}>
								{segment.text}
							</span>
						</Fragment>
					))}
				</p>

				{question.question_type === "checklist" ? (
					<ChecklistSelector
						question={question}
						selectedOptionKeys={selectedChecklistOptionKeys}
						otherText={otherChecklistText}
						currentAnswers={selectedAnswers}
						onChangeAnswers={onChangeAnswers}
						disabled={disabled}
					/>
				) : (
					<>
						{question.scales.map((scale, scaleIndex) => {
							if (scaleIndex > 0 && !showFollowUpScales) {
								return null;
							}

							const selectedScaleValue = selectedAnswers[scale.key];

							return (
								<ScaleSelector
									key={`${question.question_key}.${scale.key}`}
									questionKey={question.question_key}
									question={question}
									scale={scale}
									selectedOptionKey={
										typeof selectedScaleValue === "string" ? selectedScaleValue : undefined
									}
									currentAnswers={selectedAnswers}
									onChangeAnswers={onChangeAnswers}
									disabled={disabled}
								/>
							);
						})}
					</>
				)}

				{question.question_type === "scaled" && question.scales.length > 1 && !showFollowUpScales ? (
					<p className="text-xs text-muted-foreground">{t("followUpScalesHidden")}</p>
				) : null}

				{question.notes_prompt ? (
					<div className="space-y-2 rounded-field border border-edge/50 bg-secondary/30 p-4">
						<p className="text-sm font-medium text-foreground">{question.notes_prompt}</p>
						<Textarea
							rows={4}
							disabled={disabled}
							value={
								typeof selectedAnswers.question_note === "string" ? selectedAnswers.question_note : ""
							}
							onChange={event => {
								onChangeAnswers(question.question_key, {
									...selectedAnswers,
									question_note: event.target.value || null
								});
							}}
							placeholder={t("enterComments")}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}

interface ScaleSelectorProps {
	readonly questionKey: string;
	readonly question: InstrumentQuestion;
	readonly scale: QuestionScale;
	readonly selectedOptionKey: string | undefined;
	readonly currentAnswers: QuestionResponsePayload;
	readonly onChangeAnswers: (questionKey: string, nextAnswers: QuestionResponsePayload) => void;
	readonly disabled: boolean;
}

/**
 * Render one scale selector inside a playspace question card.
 */
function ScaleSelector({
	questionKey,
	question,
	scale,
	selectedOptionKey,
	currentAnswers,
	onChangeAnswers,
	disabled
}: Readonly<ScaleSelectorProps>) {
	return (
		<div className="space-y-3 rounded-field border border-edge/50 bg-secondary/40 p-4 md:p-5">
			<div className="space-y-1">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{scale.title}</p>
				<p className="text-sm leading-5 text-muted-foreground">{scale.prompt}</p>
			</div>

			<div className="grid gap-2.5 sm:grid-cols-2">
				{scale.options.map(option => {
					const isSelected = selectedOptionKey === option.key;

					return (
						<Button
							key={`${scale.key}.${option.key}`}
							type="button"
							variant="outline"
							className={cn(
								"h-auto min-h-12 justify-center whitespace-normal rounded-field px-4 py-3 text-center leading-5",
								isSelected
									? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
									: "border-action-outline-border bg-background text-foreground hover:border-foreground/35 hover:bg-secondary/70"
							)}
							disabled={disabled}
							onClick={() => {
								onChangeAnswers(
									questionKey,
									buildNextScaledQuestionAnswers(currentAnswers, question, scale.key, option.key)
								);
							}}>
							{option.label}
						</Button>
					);
				})}
			</div>
		</div>
	);
}

interface ChecklistSelectorProps {
	readonly question: InstrumentQuestion;
	readonly selectedOptionKeys: readonly string[];
	readonly otherText: string;
	readonly currentAnswers: QuestionResponsePayload;
	readonly onChangeAnswers: (questionKey: string, nextAnswers: QuestionResponsePayload) => void;
	readonly disabled: boolean;
}

function ChecklistSelector({
	question,
	selectedOptionKeys,
	otherText,
	currentAnswers,
	onChangeAnswers,
	disabled
}: Readonly<ChecklistSelectorProps>) {
	return (
		<div className="space-y-3 rounded-field border border-edge/50 bg-secondary/40 p-4 md:p-5">
			<div className="grid gap-2.5 sm:grid-cols-2">
				{question.options.map(option => {
					const isSelected = selectedOptionKeys.includes(option.key);

					return (
						<Button
							key={`${question.question_key}.${option.key}`}
							type="button"
							variant="outline"
							disabled={disabled}
							className={cn(
								"h-auto min-h-12 justify-center whitespace-normal rounded-field px-4 py-3 text-center leading-5",
								isSelected
									? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
									: "border-action-outline-border bg-background text-foreground hover:border-foreground/35 hover:bg-secondary/70"
							)}
							onClick={() => {
								onChangeAnswers(
									question.question_key,
									toggleChecklistOption(selectedOptionKeys, option.key, otherText, currentAnswers)
								);
							}}>
							{option.label}
						</Button>
					);
				})}
			</div>
			{selectedOptionKeys.includes("other") ? (
				<Textarea
					rows={3}
					disabled={disabled}
					value={otherText}
					onChange={event => {
						onChangeAnswers(
							question.question_key,
							setChecklistOtherText(selectedOptionKeys, event.target.value, currentAnswers)
						);
					}}
					placeholder="Describe other"
				/>
			) : null}
		</div>
	);
}

function readChecklistOptionKeys(selectedAnswers: QuestionResponsePayload): string[] {
	const selectedOptionKeys = selectedAnswers["selected_option_keys"];
	if (!Array.isArray(selectedOptionKeys)) {
		return [];
	}

	return selectedOptionKeys.filter((entry): entry is string => typeof entry === "string");
}

function readChecklistOtherText(selectedAnswers: QuestionResponsePayload): string {
	const otherDetails = selectedAnswers["other_details"];
	if (typeof otherDetails !== "object" || otherDetails === null || Array.isArray(otherDetails)) {
		return "";
	}

	const text = otherDetails["text"];
	return typeof text === "string" ? text : "";
}

function toggleChecklistOption(
	selectedOptionKeys: readonly string[],
	optionKey: string,
	otherText: string,
	currentAnswers: QuestionResponsePayload
): QuestionResponsePayload {
	const nextSelectedOptionKeys = selectedOptionKeys.includes(optionKey)
		? selectedOptionKeys.filter(currentKey => currentKey !== optionKey)
		: [...selectedOptionKeys, optionKey];

	const nextAnswers: QuestionResponsePayload = {
		selected_option_keys: nextSelectedOptionKeys
	};

	if (nextSelectedOptionKeys.includes("other") && otherText.trim().length > 0) {
		nextAnswers.other_details = { text: otherText };
	}

	const questionNote = typeof currentAnswers.question_note === "string" ? currentAnswers.question_note : null;
	if (questionNote !== null) {
		nextAnswers.question_note = questionNote;
	}

	return nextAnswers;
}

function setChecklistOtherText(
	selectedOptionKeys: readonly string[],
	nextText: string,
	currentAnswers: QuestionResponsePayload
): QuestionResponsePayload {
	const nextAnswers: QuestionResponsePayload = {
		selected_option_keys: [...selectedOptionKeys]
	};

	if (nextText.trim().length > 0) {
		nextAnswers.other_details = { text: nextText };
	}

	const questionNote = typeof currentAnswers.question_note === "string" ? currentAnswers.question_note : null;
	if (questionNote !== null) {
		nextAnswers.question_note = questionNote;
	}

	return nextAnswers;
}

function buildNextScaledQuestionAnswers(
	currentAnswers: QuestionResponsePayload,
	question: InstrumentQuestion,
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
	if (questionNote !== null) {
		return { provision: optionKey, question_note: questionNote };
	}

	return { provision: optionKey };
}
