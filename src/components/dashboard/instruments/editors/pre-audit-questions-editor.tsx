import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { PreAuditQuestion } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditableField } from "../shared-components";
import { makeDefaultPreAuditQuestion } from "../defaults";
import { ChoiceOptionsEditor } from "./shared-editors";
import { INPUT_TYPE_OPTIONS, MODE_OPTIONS, PAGE_KEY_OPTIONS } from "../constants";

export function PreAuditQuestionsEditor({
	questions,
	onChange
}: Readonly<{
	questions: PreAuditQuestion[];
	onChange: (questions: PreAuditQuestion[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

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
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">{t("preAudit")}</h3>
				<Button onClick={addQuestion}>
					<Plus className="mr-1.5 h-4 w-4" />
					{t("addQuestion")}
				</Button>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				{questions.map((q, qIdx) => (
					<Card key={qIdx} className="border-border/60">
						<CardHeader className="pb-3 px-4 pt-4">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-2">
									<EditableField
										label={t("questionKey")}
										value={q.key}
										mono
										onChange={v =>
											updateQuestion(qIdx, q => {
												q.key = v;
											})
										}
									/>
									<EditableField
										label={t("questionLabel")}
										value={q.label}
										onChange={v =>
											updateQuestion(qIdx, q => {
												q.label = v;
											})
										}
									/>
									<div className="col-span-full">
										<EditableField
											label={t("questionDescription")}
											value={q.description ?? ""}
											onChange={v =>
												updateQuestion(qIdx, q => {
													q.description = v || null;
												})
											}
										/>
									</div>

									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">{t("inputType")}</Label>
										<Select
											value={q.input_type}
											onValueChange={v =>
												updateQuestion(qIdx, q => {
													q.input_type = v as PreAuditQuestion["input_type"];
												})
											}>
											<SelectTrigger className="text-sm">
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

									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">{t("pageKey")}</Label>
										<Select
											value={q.page_key}
											onValueChange={v =>
												updateQuestion(qIdx, q => {
													q.page_key = v as PreAuditQuestion["page_key"];
												})
											}>
											<SelectTrigger className="text-sm">
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

									<EditableField
										label={t("groupKey")}
										value={q.group_key ?? ""}
										mono
										onChange={v =>
											updateQuestion(qIdx, q => {
												q.group_key = v || null;
											})
										}
									/>

									{/* visible_modes multi-select */}
									<div className="space-y-1 col-span-full">
										<Label className="text-xs text-muted-foreground">{t("visibleModes")}</Label>
										<div className="flex flex-wrap gap-2">
											{MODE_OPTIONS.map(m => {
												const checked = q.visible_modes.includes(m);
												return (
													<button
														key={m}
														type="button"
														onClick={() => {
															updateQuestion(qIdx, q => {
																if (checked) {
																	q.visible_modes = q.visible_modes.filter(
																		x => x !== m
																	);
																} else {
																	q.visible_modes = [...q.visible_modes, m];
																}
															});
														}}
														className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
															checked
																? "border-primary bg-primary text-primary-foreground"
																: "border-border bg-muted/40 text-muted-foreground hover:border-primary/50"
														}`}>
														{t.has(`modes.${m}`) ? t(`modes.${m}`) : m}
													</button>
												);
											})}
										</div>
									</div>

									<div className="col-span-full">
										<label className="flex items-center gap-2 text-sm cursor-pointer">
											<input
												type="checkbox"
												checked={q.required}
												onChange={e =>
													updateQuestion(qIdx, q => {
														q.required = e.target.checked;
													})
												}
												className="rounded border-border"
											/>
											{t("required")}
										</label>
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0 text-destructive hover:text-destructive h-8 w-8 mt-4"
									onClick={() => removeQuestion(qIdx)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</CardHeader>
						<CardContent className="px-4 pb-4">
							<ChoiceOptionsEditor
								options={q.options}
								onChange={opts =>
									updateQuestion(qIdx, q => {
										q.options = opts;
									})
								}
							/>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
