import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Download, FileJson, FileSpreadsheet, FileText, Check, Copy, Pencil, Save, X, Plus } from "lucide-react";

import { Lang, type InstrumentContent } from "./types";
import { exportInstrument } from "@/lib/export/instrument";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { PreambleEditor } from "./editors/preamble-editor";
import { ExecutionModesEditor } from "./editors/execution-modes-editor";
import { ScaleGuidanceEditor } from "./editors/scale-guidance-editor";
import { PreAuditQuestionsEditor } from "./editors/pre-audit-questions-editor";
import { LegalDocumentsEditor } from "./editors/legal-documents-editor";
import { SectionEditorList } from "./editors/section-editor-list";
import { SpreadsheetView } from "./spreadsheet-view";

import { buildScaleGuidanceMap } from "./utils";

import { ReviewChangesDialog, InstrumentChange } from "./review-changes-dialog";
import { getInstrumentChanges } from "./utils";
import { PlayspaceInstrument } from "@/types/audit";

export function InstrumentEditor({
	content,
	version,
	isPending,
	onSave,
	onCancel
}: Readonly<{
	content: InstrumentContent;
	version: string;
	isPending: boolean;
	onSave: (version: string, content: InstrumentContent, activate?: boolean) => void;
	onCancel: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	const [draftContent, setDraftContent] = useState<InstrumentContent>(content);
	const [draftVersion, setDraftVersion] = useState(version);
	const [activeLang, setActiveLang] = useState<Lang>((Object.keys(content)[0] as Lang) ?? "en");
	const [activeTab, setActiveTab] = useState<
		"overview" | "sections" | "spreadsheet" | "preAudit" | "scales" | "legalDocuments"
	>("overview");
	const [editingVersion, setEditingVersion] = useState(false);
	const [editingLang, setEditingLang] = useState<string | null>(null);

	const [reviewModalOpen, setReviewModalOpen] = useState(false);
	const [pendingChanges, setPendingChanges] = useState<InstrumentChange[]>([]);

	const instrument = draftContent[activeLang] as PlayspaceInstrument | undefined;

	const languages = Object.keys(draftContent);
	const scaleGuidanceMap = useMemo(
		() => buildScaleGuidanceMap(instrument?.scale_guidance ?? []),
		[instrument?.scale_guidance]
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

	function handleAddLanguage(baseLang: string) {
		const newLang = prompt(t("newLanguagePrompt")) as Lang;
		if (!newLang || draftContent[newLang]) return;
		setDraftContent(prev => {
			const next = structuredClone(prev);
			next[newLang] = structuredClone(prev[baseLang as Lang]) as PlayspaceInstrument;
			return next;
		});
		setActiveLang(newLang);
	}

	function handleRenameLanguage(oldLang: string, newLang: string) {
		if (oldLang === newLang || !newLang) return;
		if (draftContent[newLang as Lang]) {
			window.alert(t("languageExists"));
			return;
		}
		setDraftContent(prev => {
			const next = structuredClone(prev);
			next[newLang as Lang] = next[oldLang as Lang] as PlayspaceInstrument;
			delete next[oldLang as Lang];
			return next;
		});
		setActiveLang(newLang as Lang);
	}

	function handleRemoveLanguage(lang: string) {
		if (languages.length <= 1) return;
		if (!window.confirm(t("confirmRemoveLanguage", { lang }))) return;
		setDraftContent(prev => {
			const next = structuredClone(prev);
			delete next[lang as Lang];
			return next;
		});
		if (activeLang === lang) {
			setActiveLang((Object.keys(draftContent).find(k => k !== lang) as Lang) ?? ("en" as Lang));
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

	if (!instrument) return null;

	return (
		<div className="mt-4 space-y-4 border-t border-border pt-4">
			{/* ── Sticky action bar ─────────────────────────────────────────────── */}
			{/*
			 * Stays visible while scrolling through long section/scale editors.
			 * bg-background/95 + backdrop-blur keeps it readable over content.
			 * z-10 keeps it above accordion panels but below modals/dialogs.
			 */}
			<div className="sticky top-0 z-10 -mx-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border px-1 pb-3 pt-2">
				<div className="flex flex-wrap items-center justify-between gap-3">
					{/* Left: language switcher */}
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							{t("languages")}:
						</span>
						{languages.map(lang => (
							<div key={lang} className="flex items-center">
								{editingLang === lang ? (
									<div className="flex items-center gap-1">
										<Input
											className="h-8 w-16 px-2 text-sm"
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
									</div>
								) : (
									<div className="group relative flex items-center">
										<Button
											variant={activeLang === lang ? "default" : "outline"}
											size="sm"
											className="pr-8"
											onClick={() => setActiveLang(lang as Lang)}
											onDoubleClick={() => setEditingLang(lang)}>
											{lang.toUpperCase()}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="absolute right-0.5 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
											onClick={() => handleRemoveLanguage(lang)}>
											<X className="h-3 w-3" />
										</Button>
									</div>
								)}
							</div>
						))}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="w-8 px-0">
									<Plus className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{languages.map(lang => (
									<DropdownMenuItem key={lang} onClick={() => handleAddLanguage(lang)}>
										<Copy className="mr-2 h-4 w-4 text-muted-foreground" />
										{t("copyFrom", { lang: lang.toUpperCase() })}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Right: version + export + save actions */}
					<div className="flex items-center gap-2">
						{/* Version pill — always visible, reinforces draft context */}
						<div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-3 py-1.5">
							<Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
								<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
									{t("draft")}
								</span>
							</Badge>
							{editingVersion ? (
								<div className="flex items-center gap-1">
									<Input
										className="h-7 w-24 px-2 text-sm"
										value={draftVersion}
										onChange={e => setDraftVersion(e.target.value)}
										autoFocus
										onKeyDown={e => {
											if (e.key === "Enter") setEditingVersion(false);
										}}
									/>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() => setEditingVersion(false)}>
										<Check className="h-4 w-4 text-primary" />
									</Button>
								</div>
							) : (
								<div className="flex items-center gap-1.5">
									<span className="font-mono text-sm font-medium">{draftVersion}</span>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-muted-foreground hover:text-foreground"
										onClick={() => setEditingVersion(true)}>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
								</div>
							)}
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="h-9">
									<Download className="mr-2 h-4 w-4" />
									{t("export")}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuItem
									onClick={() => exportInstrument(draftContent, draftVersion, "pdf", activeLang)}>
									<FileText className="mr-2 h-4 w-4 text-muted-foreground" />
									{t("formatPdf")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => exportInstrument(draftContent, draftVersion, "xlsx", activeLang)}>
									<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
									{t("formatExcel")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => exportInstrument(draftContent, draftVersion, "csv", activeLang)}>
									<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
									{t("formatCsv")}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => exportInstrument(draftContent, draftVersion, "json", activeLang)}>
									<FileJson className="mr-2 h-4 w-4 text-muted-foreground" />
									{t("formatJson")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<div className="h-6 w-px bg-border" />

						<Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
							{t("cancel")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleSaveDraft}
							disabled={isPending || !draftVersion.trim()}>
							<Save className="mr-1.5 h-4 w-4" />
							{t("saveDraft")}
						</Button>
						<Button
							size="sm"
							onClick={handleOpenReview}
							disabled={isPending || !draftVersion.trim()}
							className="bg-status-success hover:bg-status-success/90">
							{t("publish")}
						</Button>
					</div>
				</div>
			</div>

			<ReviewChangesDialog
				open={reviewModalOpen}
				changes={pendingChanges}
				isPending={isPending}
				onConfirm={handlePublishConfirm}
				onCancel={() => setReviewModalOpen(false)}
			/>

			<Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
				<TabsList>
					{/*
					 * Renamed "overview" tab: the trigger label was "preamble" (from t("preamble"))
					 * but this tab contains both Preamble and ExecutionModes — "Overview" is more
					 * accurate and avoids hiding the execution modes content behind a misleading label.
					 */}
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
		</div>
	);
}
