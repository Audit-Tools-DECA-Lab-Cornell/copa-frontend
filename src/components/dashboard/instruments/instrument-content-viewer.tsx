import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, FileJson, FileSpreadsheet, FileText, ListChecks, Ruler } from "lucide-react";

import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";
import { exportInstrument } from "@/lib/export/instrument";
import type { InstrumentContent, Lang } from "./types";
import {
	InstrumentQuestion,
	InstrumentSection,
	LegalDocument,
	PlayspaceInstrument,
	PreAuditQuestion,
	QuestionScale,
	ScaleDefinition,
	ScaleOption
} from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { SpreadsheetView } from "./spreadsheet-view";
import {
	buildScaleGuidanceMap,
	collectSectionScaleKeys,
	countTotalQuestions,
	formatSectionKey,
	isScaleCustomized,
	renderInlineMarkdown
} from "./utils";
import { DisplayConditionBadge, ScaleKeyBadge, StatBox } from "./shared-components";

export function InstrumentContentViewer({
	content,
	version,
	hideBorder = false
}: Readonly<{ content: InstrumentContent; version: string; hideBorder?: boolean }>) {
	const t = useTranslations("admin.instruments.content");
	const languages = Object.keys(content);
	const [activeLang, setActiveLang] = useState(languages[0] ?? "en");
	const [activeTab, setActiveTab] = useState<
		"overview" | "sections" | "spreadsheet" | "preAudit" | "scales" | "legalDocuments"
	>("overview");
	const instrument = content[activeLang as Lang] as PlayspaceInstrument | undefined;

	const sections = useMemo(() => instrument?.sections ?? [], [instrument?.sections]);
	const preAuditQuestions = useMemo(() => instrument?.pre_audit_questions ?? [], [instrument?.pre_audit_questions]);
	const scaleGuidance = useMemo(() => instrument?.scale_guidance ?? [], [instrument?.scale_guidance]);
	const preamble = useMemo(() => instrument?.preamble ?? [], [instrument?.preamble]);
	const executionModes = useMemo(() => instrument?.execution_modes ?? [], [instrument?.execution_modes]);
	const legalDocuments = useMemo(() => instrument?.legal_documents ?? [], [instrument?.legal_documents]);
	const totalQuestions = useMemo(() => countTotalQuestions(sections), [sections]);
	const scaleGuidanceMap = useMemo(() => buildScaleGuidanceMap(scaleGuidance), [scaleGuidance]);

	if (!instrument || typeof instrument !== "object") {
		return <p className="mt-4 text-sm text-muted-foreground">{t("noContent")}</p>;
	}

	return (
		<div className={`space-y-5 ${hideBorder ? "" : "mt-4 border-t border-border pt-4"}`}>
			{/* Language switcher & Export */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("languages")}:
					</span>
					{languages.map(lang => (
						<Button
							key={lang}
							variant={activeLang === lang ? "default" : "outline"}
							size="sm"
							onClick={() => setActiveLang(lang)}>
							{lang.toUpperCase()}
						</Button>
					))}
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<Download className="mr-2 h-4 w-4" />
							{t("export")}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "pdf", activeLang)}>
							<FileText className="mr-2 h-4 w-4 text-muted-foreground" />
							{t("formatPdf")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "xlsx", activeLang)}>
							<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
							{t("formatExcel")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "csv", activeLang)}>
							<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
							{t("formatCsv")}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "json", activeLang)}>
							<FileJson className="mr-2 h-4 w-4 text-muted-foreground" />
							{t("formatJson")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Summary stats */}
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
				<StatBox label={t("sections")} value={sections.length} />
				<StatBox label={t("totalQuestions")} value={totalQuestions} />
				<StatBox label={t("preAudit")} value={preAuditQuestions.length} />
				<StatBox label={t("scaleGuidance")} value={scaleGuidance.length} />
			</div>

			{/* Tab navigation for content areas */}
			<Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
				<TabsList>
					<TabsTrigger value="overview">{t("preamble")}</TabsTrigger>
					<TabsTrigger value="sections">
						{t("sections")} ({sections.length})
					</TabsTrigger>
					<TabsTrigger value="spreadsheet" data-testid="spreadsheet-tab">
						{t("spreadsheet")}
					</TabsTrigger>
					<TabsTrigger value="preAudit">
						{t("preAudit")} ({preAuditQuestions.length})
					</TabsTrigger>
					<TabsTrigger value="scales">
						{t("scaleGuidance")} ({scaleGuidance.length})
					</TabsTrigger>
					{legalDocuments.length > 0 && (
						<TabsTrigger value="legalDocuments">
							{t("legalDocuments")} ({legalDocuments.length})
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="overview" className="space-y-4">
					{preamble.length > 0 && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">{t("preamble")}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{preamble.map((text, idx) => (
									<div
										key={idx}
										className="rounded-md border border-border/40 bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-line">
										{renderInlineMarkdown(text)}
									</div>
								))}
							</CardContent>
						</Card>
					)}

					{executionModes.length > 0 && (
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">{t("executionModes")}</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid gap-3 sm:grid-cols-3">
									{executionModes.map(mode => (
										<div
											key={mode.key}
											className="rounded-lg border border-border/60 p-3 flex flex-col justify-between gap-2">
											<div className="mb-1 flex items-center gap-2">
												<Badge variant="outline" className="font-mono text-xs">
													{mode.key}
												</Badge>
											</div>
											<p className="text-sm font-medium">{mode.label}</p>
											{mode.description && (
												<p className="mt-1 text-xs text-muted-foreground">{mode.description}</p>
											)}
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value="sections">
					<ViewerSectionAccordion sections={sections} scaleGuidanceMap={scaleGuidanceMap} />
				</TabsContent>

				<TabsContent value="spreadsheet" data-testid="spreadsheet-content">
					<SpreadsheetView sections={sections} scaleGuidanceMap={scaleGuidanceMap} />
				</TabsContent>

				<TabsContent value="preAudit">
					<PreAuditQuestionsViewer questions={preAuditQuestions} />
				</TabsContent>

				<TabsContent value="scales">
					<ScaleGuidanceViewer scales={scaleGuidance} />
				</TabsContent>

				<TabsContent value="legalDocuments">
					<LegalDocumentsViewer documents={legalDocuments} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function LegalDocumentsViewer({ documents }: Readonly<{ documents: LegalDocument[] }>) {
	const t = useTranslations("admin.instruments.content");

	if (documents.length === 0) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					{t("noLegalDocuments")}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{documents.map((doc, docIndex) => (
				<Card key={docIndex}>
					<CardHeader className="pb-3">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="space-y-1 min-w-0">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{doc.eyebrow}
								</p>
								<CardTitle className="text-base">{doc.title}</CardTitle>
								<p className="text-xs text-muted-foreground">
									{t("legalDocLastUpdated")}: {doc.last_updated}
								</p>
							</div>
							<Badge variant="outline" className="font-mono text-xs shrink-0">
								{doc.key}
							</Badge>
						</div>
						{doc.summary && (
							<div className="mt-2 text-sm text-muted-foreground leading-relaxed">
								{renderInlineMarkdown(doc.summary)}
							</div>
						)}
					</CardHeader>

					<CardContent className="space-y-5 pt-0">
						{doc.sections.map((section, sectionIndex) => (
							<div key={sectionIndex} className="space-y-2">
								<h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
								{section.body.map((para, paraIndex) => (
									<div key={paraIndex} className="text-sm text-muted-foreground leading-relaxed">
										{renderInlineMarkdown(para) || "\u2014"}
									</div>
								))}
								{section.bullets.length > 0 && (
									<ul className="space-y-1 pl-4">
										{section.bullets.map((bullet, bulletIndex) => (
											<li
												key={bulletIndex}
												className="text-sm text-muted-foreground leading-relaxed list-disc">
												{renderInlineMarkdown(bullet)}
											</li>
										))}
									</ul>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function PreAuditQuestionsViewer({ questions }: Readonly<{ questions: PreAuditQuestion[] }>) {
	const t = useTranslations("admin.instruments.content");

	const grouped = useMemo(() => {
		const groups: Record<string, PreAuditQuestion[]> = {};
		for (const q of questions) {
			const gk = q.group_key ?? q.page_key;
			if (!groups[gk]) groups[gk] = [];
			groups[gk].push(q);
		}
		return groups;
	}, [questions]);

	return (
		<div className="space-y-4">
			{Object.entries(grouped).map(([groupKey, groupQuestions]) => (
				<Card key={groupKey}>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm">
							<Badge variant="outline" className="font-mono text-xs">
								{groupKey}
							</Badge>
							{formatSectionKey(groupKey)}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{groupQuestions.map(q => (
							<div key={q.key} className="rounded-md border border-border/50 bg-card/40 p-3">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div className="space-y-1">
										<p className="text-sm font-medium">{q.label}</p>
										{q.description && (
											<p className="text-xs text-muted-foreground">{q.description}</p>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-1.5">
										<Badge variant="secondary" className="text-xs">
											{t(`preAuditInputTypes.${q.input_type}`)}
										</Badge>
										{q.required ? (
											<Badge className="text-xs">{t("required")}</Badge>
										) : (
											<Badge variant="outline" className="text-xs">
												{t("optional")}
											</Badge>
										)}
										{q.visible_modes.map(mode => (
											<Badge key={mode} variant="outline" className="text-xs">
												{t(`modes.${mode}`)}
											</Badge>
										))}
									</div>
								</div>

								{q.options.length > 0 && (
									<div className="mt-2">
										<p className="mb-1 text-xs font-medium text-muted-foreground">
											{t("options")}:
										</p>
										<div className="flex flex-wrap gap-1">
											{q.options.map(opt => (
												<span
													key={opt.key}
													className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs">
													{opt.label}
													{opt.description && (
														<span className="ml-1 text-muted-foreground">
															&mdash; {opt.description}
														</span>
													)}
												</span>
											))}
										</div>
									</div>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function ScaleGuidanceViewer({ scales }: Readonly<{ scales: ScaleDefinition[] }>) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			{scales.map(scale => (
				<Card key={scale.key}>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm">
							<ScaleKeyBadge scaleKey={scale.key} />
							{scale.title}
						</CardTitle>
						<p className="text-xs text-muted-foreground">{renderInlineMarkdown(scale.prompt)}</p>
					</CardHeader>
					<CardContent>
						<p className="mb-2 text-xs text-muted-foreground">{renderInlineMarkdown(scale.description)}</p>
						<div className="space-y-1.5">
							{scale.options.map(opt => (
								<ScaleOptionRow key={opt.key} option={opt} />
							))}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function ScaleOptionRow({ option }: Readonly<{ option: ScaleOption }>) {
	const t = useTranslations("admin.instruments.content");
	return (
		<div className="flex items-center justify-between gap-2 rounded border border-border/40 bg-muted/20 px-3 py-1.5 text-xs">
			<div className="flex items-center gap-2">
				<span className="font-medium">{option.label}</span>
				{option.is_not_applicable && (
					<Badge variant="outline" className="text-[10px] px-1.5 py-0">
						{t("notApplicable")}
					</Badge>
				)}
			</div>
			<div className="flex items-center gap-3 text-muted-foreground">
				<span>
					{t("additionValue")}: <strong className="text-foreground">{option.addition_value}</strong>
				</span>
				<span>
					{t("boostValue")}: <strong className="text-foreground">{option.boost_value}</strong>
				</span>
				{option.allows_follow_up_scales ? (
					<Badge variant="default" className="text-[10px] px-1.5 py-0">
						{t("allowsFollowUp")}
					</Badge>
				) : (
					<Badge variant="outline" className="text-[10px] px-1.5 py-0">
						{t("blocksFollowUp")}
					</Badge>
				)}
			</div>
		</div>
	);
}

function ViewerSectionAccordion({
	sections,
	scaleGuidanceMap
}: Readonly<{
	sections: InstrumentSection[];
	scaleGuidanceMap: Map<string, ScaleDefinition>;
}>) {
	const t = useTranslations("admin.instruments.content");

	return (
		<Accordion type="single" collapsible className="w-full">
			{sections.map((section, sectionIndex) => {
				const scaleKeys = collectSectionScaleKeys(section.questions);

				return (
					<AccordionItem key={section.section_key} value={section.section_key}>
						<AccordionTrigger className="text-sm hover:no-underline">
							<span className="flex items-center gap-2">
								<Badge variant="outline" className="shrink-0 font-mono text-xs tabular-nums">
									{sectionIndex + 1}
								</Badge>
								<span className="font-medium text-left">{section.title}</span>
								<span className="hidden text-xs text-muted-foreground sm:inline">
									{t("sectionSummary", {
										questionCount: section.questions.length,
										scaleCount: scaleKeys.length
									})}
								</span>
							</span>
						</AccordionTrigger>
						<AccordionContent>
							<div className="space-y-3 pl-2">
								{section.description && (
									<div className="text-xs leading-relaxed text-muted-foreground">
										{renderInlineMarkdown(section.description)}
									</div>
								)}
								{section.instruction && (
									<div className="rounded-md border border-status-info-border bg-status-info-surface px-3 py-2 text-xs text-foreground">
										<strong className="text-text-secondary">{t("sectionInstruction")}:</strong>{" "}
										{renderInlineMarkdown(section.instruction)}
									</div>
								)}
								{section.notes_prompt && (
									<div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
										<strong>{t("sectionNotesPrompt")}:</strong>{" "}
										{renderInlineMarkdown(section.notes_prompt)}
									</div>
								)}

								<Separator className="my-2" />

								<div className="space-y-2">
									<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										{t("questions")} ({section.questions.length})
									</p>
									{section.questions.map(question => (
										<ViewerQuestionCard
											key={question.question_key}
											question={question}
											scaleGuidanceMap={scaleGuidanceMap}
										/>
									))}
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				);
			})}
		</Accordion>
	);
}

function ViewerQuestionCard({
	question,
	scaleGuidanceMap
}: Readonly<{
	question: InstrumentQuestion;
	scaleGuidanceMap: Map<string, ScaleDefinition>;
}>) {
	const t = useTranslations("admin.instruments.content");
	const questionLabel = formatQuestionKeyForDisplay(question.question_key);
	const questionType = question.question_type ?? "scaled";
	const isChecklist = questionType === "checklist";

	return (
		<div className="rounded-lg border border-border/50 bg-card/40 p-3 transition-colors hover:bg-card/60">
			<div className="flex flex-wrap items-start gap-2">
				<Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs tabular-nums">
					{questionLabel}
				</Badge>
				<div className="min-w-0 flex-1">
					<p className="text-sm leading-relaxed">
						<span className="font-medium">{renderInlineMarkdown(question.prompt)}</span>
					</p>
					{question.notes_prompt ? (
						<p className="mt-2 text-xs text-muted-foreground">
							<strong>{t("questionNotesPrompt")}:</strong> {renderInlineMarkdown(question.notes_prompt)}
						</p>
					) : null}

					<div className="mt-2 flex flex-wrap gap-1.5">
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
					</div>

					{question.scales.length > 0 && (
						<div className="mt-3 space-y-2">
							{question.scales.map(scale => {
								const defaultScale = scaleGuidanceMap.get(scale.key);
								const customized = isScaleCustomized(scale, defaultScale);

								return (
									<ViewerScaleRow
										key={scale.key}
										scale={scale}
										isCustomized={customized}
										defaultOptionCount={defaultScale?.options.length}
									/>
								);
							})}
						</div>
					)}

					{isChecklist && question.options.length > 0 && (
						<div className="mt-3">
							<p className="mb-1 text-xs font-medium text-muted-foreground">
								{t("options")} ({question.options.length}):
							</p>
							<div className="flex flex-wrap gap-1">
								{question.options.map(opt => (
									<span
										key={opt.key}
										className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs">
										<CheckCircle2 className="mr-1 h-3 w-3 text-muted-foreground" />
										{opt.label}
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function ViewerScaleRow({
	scale,
	isCustomized,
	defaultOptionCount
}: Readonly<{
	scale: QuestionScale;
	isCustomized?: boolean;
	defaultOptionCount?: number;
}>) {
	const t = useTranslations("admin.instruments.content");

	return (
		<div className="rounded-md border border-border/30 bg-muted/20 p-2 flex flex-col gap-4 justify-between">
			<div className="mb-1 flex items-center gap-1.5">
				<ScaleKeyBadge scaleKey={scale.key} />
				{isCustomized && (
					<Badge
						variant="outline"
						className="gap-1 border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta text-[10px] px-1.5 py-0">
						{t("customOptions")}
					</Badge>
				)}
				{isCustomized && defaultOptionCount !== undefined && (
					<span className="text-[10px] text-muted-foreground">
						{t("customOptionsSummary", {
							count: scale.options.length,
							defaultCount: defaultOptionCount
						})}
					</span>
				)}
			</div>
			<div className="flex flex-wrap gap-1">
				{scale.options.map(opt => (
					<span
						key={opt.key}
						className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border ${
							opt.is_not_applicable
								? "border-dashed border-muted-foreground/40 text-muted-foreground"
								: opt.allows_follow_up_scales
									? "border-status-success-border bg-status-success-surface text-foreground font-medium"
									: "border-border/60 bg-muted/40"
						}`}>
						{opt.label}
						{opt.addition_value > 0 && (
							<span className="ml-1 font-mono text-[10px] text-muted-foreground">
								+{opt.addition_value}
							</span>
						)}
					</span>
				))}
			</div>
		</div>
	);
}
