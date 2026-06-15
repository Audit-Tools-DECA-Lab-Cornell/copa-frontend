import { Check, CheckCircle2, ListChecks, Maximize2, Minimize2, Pencil, Ruler, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";
import type { InstrumentQuestion, InstrumentSection, ScaleDefinition } from "@/types/audit";

import { MODE_OPTIONS, QUESTION_TYPE_OPTIONS } from "./constants";
import { useInstrumentEdit } from "./instrument-edit-context";
import { ScaleKeyBadge } from "./shared-components";
import { isScaleCustomized, renderInlineMarkdown } from "./utils";

interface SpreadsheetRow {
	sectionIndex: number;
	questionIndex: number;
	sectionTitle: string;
	sectionKey: string;
	question: InstrumentQuestion;
	questionLabel: string;
	questionType: string;
	hasCustomScales: boolean;
}

function EditableCellInput({
	initialValue,
	onCommit,
	onCancel
}: {
	initialValue: string;
	onCommit: (value: string) => void;
	onCancel: () => void;
}) {
	const [draft, setDraft] = useState(initialValue);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onCommit(draft);
		} else if (e.key === "Escape") {
			onCancel();
		}
	}

	return (
		<div className="flex flex-col gap-1" data-testid={`editable-input`}>
			<textarea
				className="w-full rounded border border-primary bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[40px]"
				value={draft}
				onChange={e => setDraft(e.target.value)}
				onKeyDown={handleKeyDown}
				autoFocus
				rows={Math.max(2, Math.ceil(draft.length / 60))}
				data-testid="editable-cell-textarea"
			/>
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon"
					className="h-5 w-5"
					onClick={() => onCommit(draft)}
					data-testid="editable-cell-save">
					<Check className="h-3 w-3 text-primary" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-5 w-5"
					onClick={onCancel}
					data-testid="editable-cell-cancel">
					<X className="h-3 w-3 text-muted-foreground" />
				</Button>
			</div>
		</div>
	);
}

export function SpreadsheetView({
	sections,
	scaleGuidanceMap,
	onEditQuestion,
	onEditSection
}: Readonly<{
	sections: InstrumentSection[];
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	onEditQuestion?: (sectionIndex: number, questionIndex: number, field: string, value: string | string[]) => void;
	onEditSection?: (sectionIndex: number, field: string, value: string | null) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();
	const editable = onEditQuestion !== undefined && onEditSection !== undefined;
	const editableKeys = editable && !translationMode;

	const [search, setSearch] = useState("");
	const [sectionFilter, setSectionFilter] = useState<string>("__all__");
	const [typeFilter, setTypeFilter] = useState<string>("__all__");
	const [modeFilter, setModeFilter] = useState<string>("__all__");
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [editingKey, setEditingKey] = useState<{ rowKey: string; field: string } | null>(null);

	const allRows: SpreadsheetRow[] = useMemo(() => {
		const rows: SpreadsheetRow[] = [];
		for (let si = 0; si < sections.length; si++) {
			const section = sections[si];
			for (let qi = 0; qi < section.questions.length; qi++) {
				const question = section.questions[qi];
				const questionLabel = formatQuestionKeyForDisplay(question.question_key);
				const questionType = question.question_type ?? "scaled";

				const hasCustomScales = question.scales.some(scale => {
					const defaultScale = scaleGuidanceMap.get(scale.key);
					return isScaleCustomized(scale, defaultScale);
				});

				rows.push({
					sectionIndex: si,
					questionIndex: qi,
					sectionTitle: section.title,
					sectionKey: section.section_key,
					question,
					questionLabel,
					questionType,
					hasCustomScales
				});
			}
		}
		return rows;
	}, [sections, scaleGuidanceMap]);

	const filteredRows = useMemo(() => {
		const searchLower = search.toLowerCase();
		return allRows.filter(row => {
			if (sectionFilter !== "__all__" && row.sectionKey !== sectionFilter) return false;
			if (typeFilter !== "__all__" && row.questionType !== typeFilter) return false;
			if (modeFilter !== "__all__" && row.question.mode !== modeFilter) return false;
			if (
				searchLower &&
				!row.question.prompt.toLowerCase().includes(searchLower) &&
				!row.questionLabel.toLowerCase().includes(searchLower) &&
				!row.question.question_key.toLowerCase().includes(searchLower)
			) {
				return false;
			}
			return true;
		});
	}, [allRows, search, sectionFilter, typeFilter, modeFilter]);

	function renderEditableCell(rowKey: string, field: string, value: string, className?: string) {
		const isActive = editingKey?.rowKey === rowKey && editingKey?.field === field;

		if (isActive) {
			return (
				<EditableCellInput
					initialValue={value}
					onCommit={draft => {
						if (rowKey.startsWith("section-")) {
							const sectionIndex = Number(rowKey.split("-")[1]);
							onEditSection?.(sectionIndex, field, draft || null);
						} else if (rowKey.startsWith("q-")) {
							const parts = rowKey.split("-");
							const sectionIndex = Number(parts[1]);
							const questionIndex = Number(parts[2]);
							onEditQuestion?.(sectionIndex, questionIndex, field, draft);
						}
						setEditingKey(null);
					}}
					onCancel={() => setEditingKey(null)}
				/>
			);
		}

		return (
			<div
				className={`group/cell relative ${editable ? "cursor-pointer rounded px-1 -mx-1 hover:bg-accent/50 transition-colors" : ""} ${className ?? ""}`}
				data-testid={`editable-cell-${rowKey}-${field}`}
				onClick={() => {
					if (editable) setEditingKey({ rowKey, field });
				}}
				onKeyDown={e => {
					if (editable && (e.key === "Enter" || e.key === " ")) {
						e.preventDefault();
						setEditingKey({ rowKey, field });
					}
				}}
				role={editable ? "button" : undefined}
				tabIndex={editable ? 0 : undefined}>
				<span className="text-sm leading-relaxed whitespace-pre-line">
					{value ? renderInlineMarkdown(value) : "\u2014"}
				</span>
				{editable && (
					<Pencil className="absolute top-0.5 right-0.5 h-3 w-3 text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity" />
				)}
			</div>
		);
	}

	const toolbar = (
		<div className={isFullscreen ? "shrink-0 border-b border-edge/40 bg-background px-4 py-3" : ""}>
			<Card className={isFullscreen ? "border-0 shadow-none" : ""}>
				<CardContent className="py-3">
					<div className="flex flex-wrap items-center gap-3">
						<Input
							className="max-w-xs text-sm"
							placeholder={t("search")}
							value={search}
							onChange={e => setSearch(e.target.value)}
							data-testid="spreadsheet-search"
						/>

						<Select value={sectionFilter} onValueChange={setSectionFilter}>
							<SelectTrigger className="w-[200px] text-sm">
								<SelectValue placeholder={t("allSections")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">{t("allSections")}</SelectItem>
								{sections.map((s, i) => (
									<SelectItem key={s.section_key} value={s.section_key}>
										{i + 1}. {s.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={typeFilter} onValueChange={setTypeFilter}>
							<SelectTrigger className="w-[140px] text-sm">
								<SelectValue placeholder={t("allTypes")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">{t("allTypes")}</SelectItem>
								{QUESTION_TYPE_OPTIONS.map(qt => (
									<SelectItem key={qt} value={qt}>
										{t.has(`questionTypes.${qt}`) ? t(`questionTypes.${qt}`) : qt}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={modeFilter} onValueChange={setModeFilter}>
							<SelectTrigger className="w-[140px] text-sm">
								<SelectValue placeholder={t("allModes")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">{t("allModes")}</SelectItem>
								{MODE_OPTIONS.map(m => (
									<SelectItem key={m} value={m}>
										{t.has(`modes.${m}`) ? t(`modes.${m}`) : m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<span className="ml-auto text-xs text-muted-foreground">
							{t("rowsShowing", { count: filteredRows.length, total: allRows.length })}
						</span>

						<Button
							variant="ghost"
							size="icon"
							className="shrink-0"
							data-testid="spreadsheet-fullscreen-toggle"
							onClick={() => setIsFullscreen(!isFullscreen)}
							title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}>
							{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const table = (
		<div className={isFullscreen ? "flex-1 overflow-auto" : ""} data-testid="spreadsheet-table-container">
			<Card className={`overflow-hidden ${isFullscreen ? "border-0 rounded-none shadow-none" : ""}`}>
				<Table data-testid="spreadsheet-table">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[70px] sticky left-0 z-10 bg-muted/90" data-testid="col-header-id">
								#
							</TableHead>
							<TableHead className="w-[360px]" data-testid="col-header-section">
								{t("section")}
							</TableHead>
							<TableHead className="min-w-[300px] max-w-[700px]" data-testid="col-header-prompt">
								{t("prompt")}
							</TableHead>
							<TableHead className="w-[100px]" data-testid="col-header-type">
								{t("questionType")}
							</TableHead>
							<TableHead className="w-[100px]" data-testid="col-header-mode">
								{t("mode")}
							</TableHead>
							<TableHead className="w-[130px]" data-testid="col-header-constructs">
								{t("constructs")}
							</TableHead>
							<TableHead className="w-[60px]" data-testid="col-header-required">
								{t("required")}
							</TableHead>
							<TableHead className="w-[200px]" data-testid="col-header-scales">
								{t("scalesCol")}
							</TableHead>
							<TableHead className="w-[200px]" data-testid="col-header-conditions">
								{t("conditionCol")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody data-testid="spreadsheet-table-body">
						{filteredRows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={9}
									className="text-center text-sm text-muted-foreground py-12"
									data-testid="spreadsheet-no-results">
									{t("noResults")}
								</TableCell>
							</TableRow>
						) : (
							(() => {
								const rendered: React.ReactNode[] = [];
								let lastSectionIndex = -1;

								for (const row of filteredRows) {
									if (row.sectionIndex !== lastSectionIndex) {
										lastSectionIndex = row.sectionIndex;
										const sKey = `section-${row.sectionIndex}`;
										rendered.push(
											<TableRow
												key={`section-header-${row.sectionKey}`}
												className="bg-muted/30"
												data-testid={`row-section-${row.sectionIndex}`}>
												<TableCell className="font-mono text-xs tabular-nums text-muted-foreground sticky left-0 z-10 bg-muted/30 border-r border-edge/40">
													<span
														data-testid={`badge-section-${row.sectionIndex}`}
														className="text-xs text-muted-foreground rounded-sm border border-b-black font-bold px-1.5 py-1 text-nowrap">
														{String(t("section") + " " + (row.sectionIndex + 1))}
													</span>
												</TableCell>
												<TableCell
													className="align-top font-medium"
													data-testid={`cell-section-title-${row.sectionIndex}`}>
													{editable ? (
														renderEditableCell(sKey, "title", row.sectionTitle, "text-sm")
													) : (
														<span className="text-sm">{row.sectionTitle}</span>
													)}
												</TableCell>
												<TableCell
													className="align-top max-w-[700px]"
													data-testid={`cell-section-details-${row.sectionIndex}`}>
													<div className="space-y-4 py-1">
														<div data-testid={`section-description-${row.sectionIndex}`}>
															<div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
																{t("sectionDescription")}
															</div>
															{editable ? (
																renderEditableCell(
																	sKey,
																	"description",
																	sections[row.sectionIndex]?.description || "",
																	"text-sm text-muted-foreground max-w-[700px]"
																)
															) : (
																<span className="text-xs text-muted-foreground">
																	{sections[row.sectionIndex]?.description
																		? renderInlineMarkdown(
																				sections[row.sectionIndex].description!
																			)
																		: t("noDescription")}
																</span>
															)}
														</div>

														<div data-testid={`section-instruction-${row.sectionIndex}`}>
															<div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
																{t("sectionInstruction")}
															</div>
															{editable ? (
																renderEditableCell(
																	sKey,
																	"instruction",
																	sections[row.sectionIndex]?.instruction || "",
																	"text-xs text-muted-foreground max-w-[700px]"
																)
															) : (
																<span className="text-xs text-muted-foreground">
																	{sections[row.sectionIndex]?.instruction
																		? renderInlineMarkdown(
																				sections[row.sectionIndex]!.instruction
																			)
																		: t("noInstruction")}
																</span>
															)}
														</div>

														<div data-testid={`section-notes_prompt-${row.sectionIndex}`}>
															<div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
																{t("sectionNotesPrompt")}
															</div>
															{editable ? (
																renderEditableCell(
																	sKey,
																	"notes_prompt",
																	sections[row.sectionIndex]?.notes_prompt || "",
																	"text-xs text-muted-foreground max-w-[700px]"
																)
															) : (
																<span className="text-xs text-muted-foreground">
																	{sections[row.sectionIndex]?.notes_prompt
																		? renderInlineMarkdown(
																				sections[row.sectionIndex].notes_prompt!
																			)
																		: t("noNotesPrompt")}
																</span>
															)}
														</div>
													</div>
												</TableCell>
												<TableCell colSpan={6} />
											</TableRow>
										);
									}

									const q = row.question;
									const isChecklist = row.questionType === "checklist";
									const qKey = `q-${row.sectionIndex}-${row.questionIndex}`;

									rendered.push(
										<TableRow
											key={`${row.sectionKey}-${q.question_key}`}
											data-testid={`row-question-${row.sectionIndex}-${row.questionIndex}`}>
											<TableCell
												className="font-mono text-xs tabular-nums text-muted-foreground sticky left-0 z-10 bg-background border-r border-edge/40"
												data-testid={`cell-question-key-${row.sectionIndex}-${row.questionIndex}`}>
												{editableKeys
													? renderEditableCell(
															qKey,
															"question_key",
															row.questionLabel,
															"font-mono text-xs"
														)
													: row.questionLabel}
											</TableCell>

											<TableCell
												className="opacity-40"
												data-testid={`cell-question-empty-${row.sectionIndex}-${row.questionIndex}`}>
												<span className="text-[10px] uppercase tracking-wider pl-2 text-muted-foreground">
													&mdash;
												</span>
											</TableCell>

											<TableCell
												data-testid={`cell-question-prompt-${row.sectionIndex}-${row.questionIndex}`}>
												{editable ? (
													renderEditableCell(
														qKey,
														"prompt",
														q.prompt,
														"text-sm flex-wrap max-w-[700px]"
													)
												) : (
													<p className="text-sm">{renderInlineMarkdown(q.prompt)}</p>
												)}
												{isChecklist && q.options.length > 0 && (
													<div
														className="mt-1.5 flex flex-wrap gap-1 max-w-[700px]"
														data-testid={`question-options-${row.sectionIndex}-${row.questionIndex}`}>
														{q.options.map(opt => (
															<span
																key={opt.key}
																className="inline-flex items-center rounded-full border border-edge/40 bg-muted/40 px-1.5 py-0.5 text-[10px]"
																data-testid={`question-option-${opt.key}`}>
																<CheckCircle2 className="mr-0.5 h-2.5 w-2.5 text-muted-foreground" />
																{opt.label}
															</span>
														))}
													</div>
												)}
											</TableCell>

											<TableCell
												data-testid={`cell-question-type-${row.sectionIndex}-${row.questionIndex}`}>
												<Badge
													variant={isChecklist ? "secondary" : "default"}
													className="gap-1 text-[10px]"
													data-testid={`badge-question-type-${row.questionType}`}>
													{isChecklist ? (
														<ListChecks className="h-3 w-3" />
													) : (
														<Ruler className="h-3 w-3" />
													)}
													{t.has(`questionTypes.${row.questionType}`)
														? t(`questionTypes.${row.questionType}`)
														: row.questionType}
												</Badge>
											</TableCell>

											<TableCell
												data-testid={`cell-question-mode-${row.sectionIndex}-${row.questionIndex}`}>
												{editableKeys && onEditQuestion ? (
													<Select
														value={q.mode}
														onValueChange={v =>
															onEditQuestion(
																row.sectionIndex,
																row.questionIndex,
																"mode",
																v
															)
														}>
														<SelectTrigger
															className="h-7 w-full text-[10px]"
															data-testid={`select-mode-${row.sectionIndex}-${row.questionIndex}`}>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{MODE_OPTIONS.map(m => (
																<SelectItem
																	key={m}
																	value={m}
																	className="text-xs"
																	data-testid={`select-mode-item-${m}`}>
																	{t.has(`modes.${m}`) ? t(`modes.${m}`) : m}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : (
													<Badge
														variant="outline"
														className="text-[10px]"
														data-testid={`badge-question-mode-${q.mode}`}>
														{t.has(`modes.${q.mode}`) ? t(`modes.${q.mode}`) : q.mode}
													</Badge>
												)}
											</TableCell>

											<TableCell
												data-testid={`cell-question-constructs-${row.sectionIndex}-${row.questionIndex}`}>
												{editableKeys && onEditQuestion ? (
													<Select
														value={
															q.constructs.length === 2 ? "both" : (q.constructs[0] ?? "")
														}
														onValueChange={v => {
															if (v === "both") {
																onEditQuestion(
																	row.sectionIndex,
																	row.questionIndex,
																	"constructs",
																	["play_value", "usability"]
																);
															} else {
																onEditQuestion(
																	row.sectionIndex,
																	row.questionIndex,
																	"constructs",
																	[v]
																);
															}
														}}>
														<SelectTrigger
															className="h-7 w-full text-[10px]"
															data-testid={`select-construct-${row.sectionIndex}-${row.questionIndex}`}>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem
																value="play_value"
																className="text-xs"
																data-testid="select-construct-item-play_value">
																{t("constructLabels.play_value")}
															</SelectItem>
															<SelectItem
																value="usability"
																className="text-xs"
																data-testid="select-construct-item-usability">
																{t("constructLabels.usability")}
															</SelectItem>
															<SelectItem
																value="both"
																className="text-xs"
																data-testid="select-construct-item-both">
																{t("modes.both")}
															</SelectItem>
														</SelectContent>
													</Select>
												) : (
													<div className="flex flex-wrap gap-1">
														{q.constructs.map(c => (
															<Badge
																key={c}
																variant="secondary"
																className="text-[10px]"
																data-testid={`badge-construct-${c}`}>
																{t.has(`constructLabels.${c}`)
																	? t(`constructLabels.${c}`)
																	: c}
															</Badge>
														))}
													</div>
												)}
											</TableCell>

											<TableCell
												className="text-xs text-center"
												data-testid={`cell-question-required-${row.sectionIndex}-${row.questionIndex}`}>
												{q.required !== false ? t("yes") : t("no")}
											</TableCell>

											<TableCell
												data-testid={`cell-question-scales-${row.sectionIndex}-${row.questionIndex}`}>
												{q.scales.length > 0 ? (
													<div className="flex flex-wrap gap-1">
														{q.scales.map(scale => {
															const defaultScale = scaleGuidanceMap.get(scale.key);
															const customized = isScaleCustomized(scale, defaultScale);

															return (
																<span
																	key={scale.key}
																	className="inline-flex items-center gap-0.5"
																	data-testid={`scale-item-${scale.key}`}>
																	<ScaleKeyBadge scaleKey={scale.key} />
																	{customized && (
																		<Badge
																			variant="outline"
																			className="border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta text-[9px] px-1 py-0"
																			data-testid={`badge-custom-scale-${scale.key}`}>
																			{t("customBadge")}
																		</Badge>
																	)}
																</span>
															);
														})}
													</div>
												) : (
													<span
														className="text-xs text-muted-foreground"
														data-testid={`no-scales-${row.sectionIndex}-${row.questionIndex}`}>
														{t("noScales")}
													</span>
												)}
											</TableCell>

											<TableCell
												data-testid={`cell-question-condition-${row.sectionIndex}-${row.questionIndex}`}>
												{q.display_if ? (
													<div
														className="text-[10px] leading-relaxed"
														data-testid={`display-condition-${row.sectionIndex}-${row.questionIndex}`}>
														<span className="font-medium text-status-warning">
															{q.display_if.question_key}
														</span>
														<span className="text-muted-foreground">
															{" "}
															({q.display_if.response_key}) ={" "}
														</span>
														<span className="font-mono">
															{q.display_if.any_of_option_keys.join(", ")}
														</span>
													</div>
												) : (
													<span
														className="text-xs text-muted-foreground"
														data-testid={`no-condition-${row.sectionIndex}-${row.questionIndex}`}>
														&mdash;
													</span>
												)}
											</TableCell>
										</TableRow>
									);
								}
								return rendered;
							})()
						)}
					</TableBody>
				</Table>
			</Card>
		</div>
	);

	if (isFullscreen) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col bg-background">
				{toolbar}
				{table}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{toolbar}
			{table}
		</div>
	);
}
