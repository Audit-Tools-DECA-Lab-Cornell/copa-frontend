import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { InstrumentSection, ScaleDefinition } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

import { EditableField } from "../shared-components";
import { makeDefaultQuestion, makeDefaultSection } from "../defaults";
import { moveArrayItem } from "../utils";
import { QuestionEditor } from "./shared-editors";

export function SectionEditorList({
	sections,
	scaleGuidanceMap,
	onChange
}: Readonly<{
	sections: InstrumentSection[];
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	onChange: (sections: InstrumentSection[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateSection(index: number, updater: (s: InstrumentSection) => void) {
		const next = structuredClone(sections);
		updater(next[index]);
		onChange(next);
	}

	function addSection() {
		onChange([...sections, makeDefaultSection(sections.length)]);
	}

	function removeSection(index: number) {
		onChange(sections.filter((_, i) => i !== index));
	}

	function moveSection(index: number, direction: "up" | "down") {
		onChange(moveArrayItem(sections, index, direction));
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">{t("sections")}</h3>
				<Button onClick={addSection}>
					<Plus className="mr-1.5 h-4 w-4" />
					{t("addSection")}
				</Button>
			</div>

			<Accordion type="single" collapsible className="w-full">
				{sections.map((section, sIdx) => (
					<AccordionItem key={section.section_key} value={section.section_key}>
						<AccordionTrigger className="text-sm hover:no-underline border border-border/60 bg-card rounded-t-lg px-4 data-[state=closed]:rounded-b-lg">
							<span className="flex items-center gap-3">
								<span className="font-mono text-xs tabular-nums text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
									{sIdx + 1}
								</span>
								<span className="font-medium text-left">{section.title}</span>
								<span className="text-xs text-muted-foreground hidden sm:inline">
									({t("questionCount", { count: section.questions.length })})
								</span>
							</span>
						</AccordionTrigger>
						<AccordionContent className="border-x border-b border-border/60 rounded-b-lg bg-card/30 p-4">
							<div className="space-y-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={sIdx === 0}
											onClick={() => moveSection(sIdx, "up")}>
											<ArrowUp className="mr-1.5 h-3.5 w-3.5" />
											{t("moveUp")}
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={sIdx === sections.length - 1}
											onClick={() => moveSection(sIdx, "down")}>
											<ArrowDown className="mr-1.5 h-3.5 w-3.5" />
											{t("moveDown")}
										</Button>
									</div>
									<Button variant="destructive" size="sm" onClick={() => removeSection(sIdx)}>
										<Trash2 className="mr-1.5 h-3.5 w-3.5" />
										{t("removeSection")}
									</Button>
								</div>

								{/* Section Details Editor */}
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-sm">{t("sectionDetails")}</CardTitle>
									</CardHeader>
									<CardContent className="grid gap-4 sm:grid-cols-2">
										<EditableField
											label={t("sectionKey")}
											value={section.section_key}
											mono
											onChange={v =>
												updateSection(sIdx, s => {
													s.section_key = v;
													// Also update questions in this section
													for (const q of s.questions) {
														q.section_key = v;
													}
												})
											}
										/>
										<EditableField
											label={t("sectionTitle")}
											value={section.title}
											onChange={v =>
												updateSection(sIdx, s => {
													s.title = v;
												})
											}
										/>
										<div className="col-span-full">
											<EditableField
												label={t("sectionDescription")}
												value={section.description || t("noDescription")}
												multiline
												onChange={v =>
													updateSection(sIdx, s => {
														s.description = v;
													})
												}
											/>
										</div>
										<div className="col-span-full">
											<EditableField
												label={t("sectionInstruction")}
												value={section.instruction}
												multiline
												onChange={v =>
													updateSection(sIdx, s => {
														s.instruction = v;
													})
												}
											/>
										</div>
										<div className="col-span-full">
											<EditableField
												label={t("sectionNotesPrompt")}
												value={section.notes_prompt ?? ""}
												multiline
												onChange={v =>
													updateSection(sIdx, s => {
														s.notes_prompt = v || null;
													})
												}
											/>
										</div>
									</CardContent>
								</Card>

								<Separator />

								{/* Questions List Editor */}
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
											{t("questions")} ({section.questions.length})
										</h4>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												updateSection(sIdx, s => {
													s.questions.push(
														makeDefaultQuestion(s.section_key, s.questions.length)
													);
												})
											}>
											<Plus className="mr-1.5 h-3.5 w-3.5" />
											{t("addQuestion")}
										</Button>
									</div>

									{section.questions.length === 0 && (
										<div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
											<p className="text-sm text-muted-foreground">{t("noQuestions")}</p>
										</div>
									)}

									{section.questions.map((question, qIdx) => (
										<div key={qIdx} className="flex items-stretch gap-2">
											<div className="flex flex-col gap-1 pt-2">
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6"
													disabled={qIdx === 0}
													onClick={() =>
														updateSection(sIdx, s => {
															s.questions = moveArrayItem(s.questions, qIdx, "up");
														})
													}>
													<ArrowUp className="h-3 w-3" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6"
													disabled={qIdx === section.questions.length - 1}
													onClick={() =>
														updateSection(sIdx, s => {
															s.questions = moveArrayItem(s.questions, qIdx, "down");
														})
													}>
													<ArrowDown className="h-3 w-3" />
												</Button>
											</div>
											<div className="min-w-0 flex-1">
												<QuestionEditor
													question={question}
													scaleGuidanceMap={scaleGuidanceMap}
													onUpdate={updater =>
														updateSection(sIdx, s => {
															updater(s.questions[qIdx]);
														})
													}
													onRemove={() =>
														updateSection(sIdx, s => {
															s.questions.splice(qIdx, 1);
														})
													}
												/>
											</div>
										</div>
									))}
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
}
