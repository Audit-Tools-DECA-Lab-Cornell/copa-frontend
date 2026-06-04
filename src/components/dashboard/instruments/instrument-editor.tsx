import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Download, FileJson, FileSpreadsheet, FileText, Lock, Pencil, Plus, Save, X } from "lucide-react";

import { Lang, type InstrumentContent } from "./types";
import { exportInstrument } from "@/lib/export/instrument";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { PreambleEditor } from "./editors/preamble-editor";
import { ExecutionModesEditor } from "./editors/execution-modes-editor";
import { ScaleGuidanceEditor } from "./editors/scale-guidance-editor";
import { PreAuditQuestionsEditor } from "./editors/pre-audit-questions-editor";
import { LegalDocumentsEditor } from "./editors/legal-documents-editor";
import { SectionEditorList } from "./editors/section-editor-list";
import { SpreadsheetView } from "./spreadsheet-view";
import { AddLanguageDialog } from "./editors/add-language-dialog";
import { AiTranslateButton } from "./ai-translate-button";
import {
	AdminToolbar,
	AdminToolbarGroup,
	AdminToolbarRow,
	ToolbarChip,
	ToolbarDivider,
	ToolbarLabel
} from "./admin-toolbar";

import { buildScaleGuidanceMap, getInstrumentChanges, getTranslationCoverage } from "./utils";
import { InstrumentEditProvider, languageLabel, resolveBaseLang } from "./instrument-edit-context";

import { ReviewChangesDialog, InstrumentChange } from "./review-changes-dialog";
import { PlayspaceInstrument } from "@/types/audit";

type EditorTab = "overview" | "sections" | "spreadsheet" | "preAudit" | "scales" | "legalDocuments";

export function InstrumentEditor({
	content,
	version,
	lockVersion = false,
	isPending,
	onSave,
	onCancel
}: Readonly<{
	content: InstrumentContent;
	version: string;
	lockVersion?: boolean;
	isPending: boolean;
	onSave: (version: string, content: InstrumentContent, activate?: boolean) => void;
	onCancel: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	const [draftContent, setDraftContent] = useState<InstrumentContent>(content);
	const [draftVersion, setDraftVersion] = useState(version);
	const [activeLang, setActiveLang] = useState<Lang>((Object.keys(content)[0] as Lang) ?? "en");
	const [activeTab, setActiveTab] = useState<EditorTab>("overview");
	const [editingVersion, setEditingVersion] = useState(false);
	const [editingLang, setEditingLang] = useState<string | null>(null);
	const [addLanguageOpen, setAddLanguageOpen] = useState(false);

	const [reviewModalOpen, setReviewModalOpen] = useState(false);
	const [pendingChanges, setPendingChanges] = useState<InstrumentChange[]>([]);

	const instrument = draftContent[activeLang] as PlayspaceInstrument | undefined;

	const languages = Object.keys(draftContent);
	const baseLang = resolveBaseLang(draftContent);
	const isTranslation = activeLang !== baseLang;
	const baseInstrument = draftContent[baseLang as Lang] as PlayspaceInstrument | undefined;
	const scaleGuidanceMap = useMemo(
		() => buildScaleGuidanceMap(instrument?.scale_guidance ?? []),
		[instrument?.scale_guidance]
	);

	const coverage = useMemo(
		() =>
			isTranslation && baseInstrument && instrument ? getTranslationCoverage(baseInstrument, instrument) : null,
		[isTranslation, baseInstrument, instrument]
	);

	function updateInstrument(updater: (i: PlayspaceInstrument) => void) {
		setDraftContent(prev => {
			const next = structuredClone(prev);
			if (next[activeLang]) {
				updater(next[activeLang]);
			}
			return next;
		});
	}

	function handleAddLanguage(newLang: string, copyFromLang: string) {
		const code = newLang.trim().toLowerCase() as Lang;
		if (!code || draftContent[code]) return;
		setDraftContent(prev => {
			const next = structuredClone(prev);
			// Clone structure + copy as translation fallback until fields are updated.
			next[code] = structuredClone(prev[copyFromLang as Lang]) as PlayspaceInstrument;
			return next;
		});
		setActiveLang(code);
		setAddLanguageOpen(false);
	}

	function handleRenameLanguage(oldLang: string, newLang: string) {
		if (oldLang === baseLang) return;
		const code = newLang.trim().toLowerCase();
		if (oldLang === code || !code) return;
		if (draftContent[code as Lang]) {
			window.alert(t("languageExists"));
			return;
		}
		setDraftContent(prev => {
			const next = structuredClone(prev);
			next[code as Lang] = next[oldLang as Lang] as PlayspaceInstrument;
			delete next[oldLang as Lang];
			return next;
		});
		setActiveLang(code as Lang);
	}

	function handleRemoveLanguage(lang: string) {
		if (languages.length <= 1) return;
		if (lang === baseLang) return;
		if (!window.confirm(t("confirmRemoveLanguage", { lang: languageLabel(lang) }))) return;
		setDraftContent(prev => {
			const next = structuredClone(prev);
			delete next[lang as Lang];
			return next;
		});
		if (activeLang === lang) {
			setActiveLang(baseLang as Lang);
		}
	}

	function handleSaveDraft() {
		onSave(draftVersion, draftContent, false);
	}

	function handleOpenReview() {
		const changes = getInstrumentChanges(content, draftContent);
		setPendingChanges(changes);
		setReviewModalOpen(true);
	}

	function handlePublishConfirm() {
		onSave(draftVersion, draftContent, true);
		setReviewModalOpen(false);
	}

	function renderLanguageSwitcher() {
		return (
			<AdminToolbarGroup>
				<ToolbarLabel>{t("languages")}:</ToolbarLabel>
				{languages.map(lang => {
					const isBase = lang === baseLang;
					const isActive = activeLang === lang;
					return (
						<div key={lang} className="flex items-center">
							{editingLang === lang && !isBase ? (
								<Input
									className="h-9 w-20 px-2 text-sm"
									autoFocus
									defaultValue={lang}
									onKeyDown={e => {
										if (e.key === "Enter") {
											handleRenameLanguage(lang, e.currentTarget.value);
											setEditingLang(null);
										} else if (e.key === "Escape") {
											setEditingLang(null);
										}
									}}
									onBlur={e => {
										handleRenameLanguage(lang, e.currentTarget.value);
										setEditingLang(null);
									}}
								/>
							) : (
								<div className="group relative flex items-center">
									<Button
										type="button"
										size="sm"
										variant={isActive ? "default" : "outline"}
										className={cn("h-9 gap-1.5", !isBase && "pr-8")}
										onClick={() => setActiveLang(lang as Lang)}
										onDoubleClick={() => {
											if (!isBase) setEditingLang(lang);
										}}
										title={isBase ? t("baseLanguageHint") : undefined}>
										{lang.toUpperCase()}
										{isBase && <Lock className="h-3 w-3 opacity-70" aria-hidden="true" />}
									</Button>
									{!isBase && (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute right-0.5 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
											onClick={() => handleRemoveLanguage(lang)}>
											<X className="h-3 w-3" aria-hidden="true" />
										</Button>
									)}
								</div>
							)}
						</div>
					);
				})}
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-9 w-9 shrink-0"
					title={t("addLanguageTitle")}
					onClick={() => setAddLanguageOpen(true)}>
					<Plus className="h-4 w-4" aria-hidden="true" />
				</Button>
			</AdminToolbarGroup>
		);
	}

	function renderDraftVersionControl() {
		if (lockVersion) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<ToolbarChip tone="draft" className="font-mono" title={t("draftVersionHelp")}>
								<span className="font-sans text-[10px] font-bold uppercase tracking-wider">
									{t("draft")}
								</span>
								<span data-testid="draft-version-label" className="text-sm font-semibold">
									v{draftVersion}
								</span>
							</ToolbarChip>
						</TooltipTrigger>
						<TooltipContent className="max-w-[260px]">{t("draftVersionHelp")}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		if (editingVersion) {
			return (
				<div className="flex items-center gap-2 rounded-md border border-edge/40 bg-muted/20 px-3 py-1.5">
					<Input
						aria-label={t("versionLabel")}
						className="h-7 w-24 px-2 text-sm"
						value={draftVersion}
						onChange={e => setDraftVersion(e.target.value)}
						autoFocus
						onKeyDown={e => {
							if (e.key === "Enter") setEditingVersion(false);
						}}
					/>
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingVersion(false)}>
						<Check className="h-4 w-4 text-primary" aria-hidden="true" />
					</Button>
				</div>
			);
		}

		return (
			<ToolbarChip tone="neutral" className="font-mono">
				<span className="font-sans text-[10px] font-bold uppercase tracking-wider">{t("draft")}</span>
				<span className="text-sm font-semibold">v{draftVersion}</span>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="-mr-2 h-7 w-7 text-muted-foreground hover:text-foreground"
					title="Edit version"
					onClick={() => setEditingVersion(true)}>
					<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
				</Button>
			</ToolbarChip>
		);
	}

	function renderExportMenu() {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="sm" className="h-10 gap-2">
						<Download className="h-4 w-4" aria-hidden="true" />
						{t("export")}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem onClick={() => exportInstrument(draftContent, draftVersion, "pdf", activeLang)}>
						<FileText className="mr-2 h-4 w-4 text-muted-foreground" />
						{t("formatPdf")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => exportInstrument(draftContent, draftVersion, "xlsx", activeLang)}>
						<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
						{t("formatExcel")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => exportInstrument(draftContent, draftVersion, "csv", activeLang)}>
						<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
						{t("formatCsv")}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => exportInstrument(draftContent, draftVersion, "json", activeLang)}>
						<FileJson className="mr-2 h-4 w-4 text-muted-foreground" />
						{t("formatJson")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	if (!instrument) return null;

	return (
		<InstrumentEditProvider activeLang={activeLang} baseLang={baseLang}>
			<div className="mt-4 space-y-4 border-t border-edge/40 pt-4">
				<AdminToolbar>
					<AdminToolbarRow>
						{renderLanguageSwitcher()}

						<AdminToolbarGroup className="lg:justify-end">
							{renderDraftVersionControl()}
							{isTranslation && (
								<ToolbarChip tone="violet">
									{languageLabel(activeLang)}
									<span className="text-muted-foreground">·</span>
									{coverage ? (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="tabular-nums">
														{t("coverageBadge", { percent: coverage.percent })}
													</span>
												</TooltipTrigger>
												<TooltipContent>
													{t("coverageTooltip", {
														translated: coverage.translated,
														total: coverage.total
													})}
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									) : (
										t("translatingBadge", { lang: activeLang.toUpperCase() })
									)}
								</ToolbarChip>
							)}
						</AdminToolbarGroup>
					</AdminToolbarRow>

					<AdminToolbarRow>
						<AdminToolbarGroup>
							{isTranslation && <AiTranslateButton targetLang={activeLang} baseLang={baseLang} />}
							{renderExportMenu()}
						</AdminToolbarGroup>

						<AdminToolbarGroup className="lg:justify-end">
							<ToolbarDivider />
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-10"
								onClick={onCancel}
								disabled={isPending}>
								{t("cancel")}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-10 gap-2"
								onClick={handleSaveDraft}
								disabled={isPending || !draftVersion.trim()}>
								<Save className="h-4 w-4" aria-hidden="true" />
								{t("saveDraft")}
							</Button>
							<Button
								type="button"
								size="sm"
								className="h-10 gap-2 bg-status-success text-primary-foreground hover:bg-status-success/90"
								onClick={handleOpenReview}
								disabled={isPending || !draftVersion.trim()}>
								<Check className="h-4 w-4" aria-hidden="true" />
								{t("publish")}
							</Button>
						</AdminToolbarGroup>
					</AdminToolbarRow>
				</AdminToolbar>

				<ReviewChangesDialog
					open={reviewModalOpen}
					changes={pendingChanges}
					isPending={isPending}
					onConfirm={handlePublishConfirm}
					onCancel={() => setReviewModalOpen(false)}
				/>

				{isTranslation && (
					<div className="flex items-start gap-2 rounded-md border border-violet-400/25 bg-violet-500/5 px-3 py-2">
						<Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">
								{t("translationBannerTitle", {
									lang: languageLabel(activeLang),
									base: baseLang.toUpperCase()
								})}
							</p>
							<p className="text-xs leading-relaxed text-muted-foreground">
								{t("translationBannerBody")}
							</p>
						</div>
					</div>
				)}

				<Tabs value={activeTab} onValueChange={v => setActiveTab(v as EditorTab)}>
					<TabsList className="h-auto flex-wrap justify-start gap-1">
						<TabsTrigger value="overview">{t("overview")}</TabsTrigger>
						<TabsTrigger value="sections">
							{t("sections")} ({instrument.sections.length})
						</TabsTrigger>
						<TabsTrigger value="spreadsheet">{t("spreadsheet")}</TabsTrigger>
						<TabsTrigger value="preAudit">
							{t("preAudit")} ({instrument.pre_audit_questions.length})
						</TabsTrigger>
						<TabsTrigger value="scales">
							{t("scaleGuidance")} ({instrument.scale_guidance.length})
						</TabsTrigger>
						<TabsTrigger value="legalDocuments">
							{t("legalDocuments")} ({instrument.legal_documents.length})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-4">
						<PreambleEditor
							preamble={instrument.preamble}
							onChange={p =>
								updateInstrument(i => {
									i.preamble = p;
								})
							}
						/>
						<ExecutionModesEditor
							modes={instrument.execution_modes}
							onChange={m =>
								updateInstrument(i => {
									i.execution_modes = m;
								})
							}
						/>
					</TabsContent>

					<TabsContent value="sections">
						<SectionEditorList
							sections={instrument.sections}
							scaleGuidanceMap={scaleGuidanceMap}
							onChange={s =>
								updateInstrument(i => {
									i.sections = s;
								})
							}
						/>
					</TabsContent>

					<TabsContent value="spreadsheet">
						<SpreadsheetView
							sections={instrument.sections}
							scaleGuidanceMap={scaleGuidanceMap}
							onEditQuestion={(sIdx, qIdx, field, value) => {
								updateInstrument(i => {
									(i.sections[sIdx].questions[qIdx] as Record<string, unknown>)[field] = value;
								});
							}}
							onEditSection={(sIdx, field, value) => {
								updateInstrument(i => {
									(i.sections[sIdx] as Record<string, unknown>)[field] = value;
								});
							}}
						/>
					</TabsContent>

					<TabsContent value="preAudit">
						<PreAuditQuestionsEditor
							questions={instrument.pre_audit_questions}
							onChange={q =>
								updateInstrument(i => {
									i.pre_audit_questions = q;
								})
							}
						/>
					</TabsContent>

					<TabsContent value="scales">
						<ScaleGuidanceEditor
							scales={instrument.scale_guidance}
							onChange={s =>
								updateInstrument(i => {
									i.scale_guidance = s;
								})
							}
						/>
					</TabsContent>

					<TabsContent value="legalDocuments">
						<LegalDocumentsEditor
							documents={instrument.legal_documents}
							onChange={d =>
								updateInstrument(i => {
									i.legal_documents = d;
								})
							}
						/>
					</TabsContent>
				</Tabs>

				<AddLanguageDialog
					open={addLanguageOpen}
					existingLangs={languages}
					baseLang={baseLang}
					onClose={() => setAddLanguageOpen(false)}
					onAdd={handleAddLanguage}
				/>
			</div>
		</InstrumentEditProvider>
	);
}
