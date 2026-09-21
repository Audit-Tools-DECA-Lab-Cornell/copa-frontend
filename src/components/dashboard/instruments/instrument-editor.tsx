import {
	AlertTriangle,
	Check,
	Download,
	FileJson,
	FileSpreadsheet,
	FileText,
	ListChecks,
	Lock,
	Pencil,
	Plus,
	Save,
	X
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportInstrument } from "@/lib/export/instrument";
import { cn } from "@/lib/utils";
import { PlayspaceInstrument } from "@/types/audit";

import {
	AdminToolbar,
	AdminToolbarGroup,
	AdminToolbarRow,
	ToolbarChip,
	ToolbarDivider,
	ToolbarLabel
} from "./admin-toolbar";
import { AiTranslateButton } from "./ai-translate-button";
import { AddLanguageDialog } from "./editors/add-language-dialog";
import { ExecutionModesEditor } from "./editors/execution-modes-editor";
import { LegalDocumentsEditor } from "./editors/legal-documents-editor";
import { PreAuditQuestionsEditor } from "./editors/pre-audit-questions-editor";
import { PreambleEditor } from "./editors/preamble-editor";
import { ScaleGuidanceEditor } from "./editors/scale-guidance-editor";
import { SectionEditorList } from "./editors/section-editor-list";
import { InstrumentEditProvider, languageLabel, resolveBaseLang } from "./instrument-edit-context";
import {
	collectOwningLists,
	type InstrumentIssue,
	issueElementId,
	publishBlockers,
	saveBlockers,
	scanInstrumentIssues
} from "./instrument-issues";
import { IssuePanel } from "./issue-panel";
import {
	applyOptionKeyRepairs,
	type ConditionResolutions,
	planOptionKeyRepairs,
	type RepairPlan
} from "./option-key-repair";
import { OptionKeySessionProvider, useOptionKeySession } from "./option-key-session";
import { scopeId } from "./option-keys";
import { RepairDialog } from "./repair-dialog";
import { InstrumentChange, ReviewChangesDialog } from "./review-changes-dialog";
import { SociabilityBulkDialog } from "./sociability-bulk-dialog";
import {
	applySociabilityMultiSelectToContent,
	findSociabilityMultiSelectTargets,
	findUntranslatedSociabilityLabels,
	validateSociabilityMultiSelect
} from "./sociability-multi-select";
import { SpreadsheetView } from "./spreadsheet-view";
import { findLocaleMismatches, syncTranslationsToBase } from "./translation-sync";
import { type InstrumentContent, Lang } from "./types";
import { buildScaleGuidanceMap, getInstrumentChanges, getTranslationCoverage } from "./utils";

type EditorTab = "overview" | "sections" | "spreadsheet" | "preAudit" | "scales" | "legalDocuments";

/**
 * Wraps the editor in the key session so every option list shares one record of
 * which answers were added now and which keys are spent.
 */
export function InstrumentEditor(props: Readonly<InstrumentEditorProps>) {
	return (
		<OptionKeySessionProvider>
			<InstrumentEditorBody {...props} />
		</OptionKeySessionProvider>
	);
}

type InstrumentEditorProps = Readonly<{
	content: InstrumentContent;
	version: string;
	lockVersion?: boolean;
	isPending: boolean;
	/** Backend rejection (for example a 422 semantic validation failure) for the last save attempt. */
	saveError?: string | null;
	onSave: (version: string, content: InstrumentContent, activate?: boolean) => void;
	onCancel: () => void;
}>;

function InstrumentEditorBody({
	content,
	version,
	lockVersion = false,
	isPending,
	saveError = null,
	onSave,
	onCancel
}: Readonly<{
	content: InstrumentContent;
	version: string;
	lockVersion?: boolean;
	isPending: boolean;
	/** Backend rejection (for example a 422 semantic validation failure) for the last save attempt. */
	saveError?: string | null;
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
	const [sociabilityBulkOpen, setSociabilityBulkOpen] = useState(false);
	const [openRequest, setOpenRequest] = useState<{ sectionKey?: string; questionKey?: string; nonce: number }>();
	const [focusRequest, setFocusRequest] = useState<{ elementId: string; nonce: number } | null>(null);
	const [repairPlan, setRepairPlan] = useState<RepairPlan | null>(null);
	const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
	const keySession = useOptionKeySession();
	const navigationNonce = useRef(0);

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

	const sociabilityTargets = useMemo(
		() => (instrument ? findSociabilityMultiSelectTargets(instrument) : []),
		[instrument]
	);
	const sociabilityPendingCount = sociabilityTargets.filter(target => !target.alreadyApplied).length;

	const sociabilityPreview = useMemo(() => applySociabilityMultiSelectToContent(draftContent), [draftContent]);
	const sociabilityBulkChanges = useMemo(
		() => getInstrumentChanges(draftContent, sociabilityPreview),
		[draftContent, sociabilityPreview]
	);

	const sociabilityIssues = useMemo(
		() => (instrument ? validateSociabilityMultiSelect(instrument) : []),
		[instrument]
	);
	const untranslatedSociabilityLangs = useMemo(
		() => findUntranslatedSociabilityLabels(draftContent, baseLang),
		[draftContent, baseLang]
	);

	// Whether the bundle lined up when it was opened. Recomputing it from the
	// draft would flip to false the moment an answer is added to the base
	// language and before the translations are brought along in the same step.
	const [bundleAligned] = useState(() => findLocaleMismatches(content, resolveBaseLang(content)).length === 0);

	const issues = useMemo(() => scanInstrumentIssues(draftContent, baseLang), [draftContent, baseLang]);
	const blockingSave = useMemo(() => saveBlockers(issues), [issues]);
	const blockingPublish = useMemo(() => publishBlockers(issues), [issues]);
	// A key being typed holds up saving only while the answer it belongs to is
	// still in the draft. Deleting that answer - or the scale, question or section
	// around it - releases the hold, so the admin is never left with a message
	// telling them to apply or cancel something that is no longer on screen.
	const pendingOverride = keySession?.pending ?? null;
	const hasPendingOverride = useMemo(() => {
		// The panel only exists in the base language, so a translation can never
		// be held up by an edit it has no way to apply or cancel. Nothing was
		// written to the draft yet, so saving from a translation loses nothing.
		if (pendingOverride === null || activeLang !== baseLang) return false;
		const editing = draftContent[activeLang];
		if (!editing) return false;
		return collectOwningLists(editing).some(
			list =>
				scopeId(list.scope) === pendingOverride.scopeId &&
				list.options.some(option => option.key === pendingOverride.optionKey)
		);
	}, [pendingOverride, draftContent, activeLang, baseLang]);
	const hasUnsavedWork = useMemo(
		() => getInstrumentChanges(content, draftContent).length > 0 || draftVersion !== version,
		[content, draftContent, draftVersion, version]
	);
	const canRepairKeys = useMemo(() => blockingSave.some(issue => issue.target.field === "optionKey"), [blockingSave]);

	// Opening an issue changes language, tab, section and question first; the
	// control it points at only exists once those have rendered, so the focus is
	// retried a few times rather than assumed to land on the first frame.
	useEffect(() => {
		if (focusRequest === null) return;
		let attempts = 0;
		let timer: ReturnType<typeof setTimeout>;
		const tryFocus = () => {
			const element = document.getElementById(focusRequest.elementId);
			if (element) {
				element.scrollIntoView({ block: "center", behavior: "smooth" });
				element.focus({ preventScroll: true });
				return;
			}
			attempts += 1;
			if (attempts < 5) {
				timer = setTimeout(tryFocus, 120);
			}
		};
		timer = setTimeout(tryFocus, 0);
		return () => clearTimeout(timer);
	}, [focusRequest]);

	function handleReviewIssue(issue: InstrumentIssue) {
		navigationNonce.current += 1;
		const nonce = navigationNonce.current;
		if (draftContent[issue.target.locale as Lang]) {
			setActiveLang(issue.target.locale as Lang);
		}
		setActiveTab(issue.target.tab);
		setOpenRequest({
			sectionKey: issue.target.sectionKey,
			questionKey: issue.target.questionKey,
			nonce
		});
		setFocusRequest({ elementId: issueElementId(issue.target), nonce });
	}

	function handleOpenRepair() {
		setRepairPlan(planOptionKeyRepairs(draftContent, baseLang));
	}

	function handleConfirmRepair(resolutions: ConditionResolutions) {
		if (repairPlan === null) return;
		// The repair rewrites a working copy; the version it came from is untouched
		// until the admin saves this draft.
		setDraftContent(applyOptionKeyRepairs(draftContent, repairPlan, resolutions));
		setRepairPlan(null);
	}

	function updateInstrument(updater: (i: PlayspaceInstrument) => void) {
		setDraftContent(prev => {
			const next = structuredClone(prev);
			if (next[activeLang]) {
				updater(next[activeLang]);
			}
			// A structural edit in the base language has to reach every translation
			// in the same step, or the languages would answer with different keys.
			// A bundle that did not line up to begin with is left alone and sent to
			// the repair flow instead of being matched by guesswork.
			if (activeLang === baseLang && bundleAligned) {
				return syncTranslationsToBase(next, baseLang);
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
		if (blockingSave.length > 0 || hasPendingOverride) return;
		onSave(draftVersion, draftContent, false);
	}

	function handleOpenReview() {
		if (blockingPublish.length > 0 || hasPendingOverride) return;
		const changes = getInstrumentChanges(content, draftContent);
		setPendingChanges(changes);
		setReviewModalOpen(true);
	}

	function handleCancel() {
		if (hasUnsavedWork) {
			setConfirmDiscardOpen(true);
			return;
		}
		onCancel();
	}

	function handlePublishConfirm() {
		onSave(draftVersion, draftContent, true);
		setReviewModalOpen(false);
	}

	function handleApplySociabilityMultiSelect() {
		setDraftContent(sociabilityPreview);
		setSociabilityBulkOpen(false);
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

	// A disabled action always says why, next to the action itself.
	const saveBlockedReason = hasPendingOverride
		? t("pendingOverrideBlocks")
		: blockingSave.length > 0
			? t("saveBlockedByIssues", { count: blockingSave.length })
			: null;
	const publishBlockedReason = hasPendingOverride
		? t("pendingOverrideBlocks")
		: blockingPublish.length > 0
			? t("publishBlockedByIssues", { count: blockingPublish.length })
			: null;

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
							{sociabilityTargets.length > 0 && !isTranslation ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-10 gap-2"
									onClick={() => setSociabilityBulkOpen(true)}
									disabled={isPending || sociabilityPendingCount === 0}>
									<ListChecks className="h-4 w-4" aria-hidden="true" />
									{t("sociabilityBulk.action")}
									<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
										{sociabilityPendingCount}
									</span>
								</Button>
							) : null}
						</AdminToolbarGroup>

						<AdminToolbarGroup className="lg:justify-end">
							<ToolbarDivider />
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-10"
								onClick={handleCancel}
								disabled={isPending}>
								{t("cancel")}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-10 gap-2"
								onClick={handleSaveDraft}
								title={saveBlockedReason ?? undefined}
								disabled={isPending || !draftVersion.trim() || saveBlockedReason !== null}>
								<Save className="h-4 w-4" aria-hidden="true" />
								{t("saveDraft")}
							</Button>
							<Button
								type="button"
								size="sm"
								className="h-10 gap-2 bg-status-success text-primary-foreground hover:bg-status-success/90"
								onClick={handleOpenReview}
								title={publishBlockedReason ?? undefined}
								disabled={isPending || !draftVersion.trim() || publishBlockedReason !== null}>
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

				<RepairDialog
					open={repairPlan !== null}
					plan={repairPlan}
					onConfirm={handleConfirmRepair}
					onCancel={() => setRepairPlan(null)}
				/>

				<ConfirmDialog
					open={confirmDiscardOpen}
					onOpenChange={open => {
						if (!open) setConfirmDiscardOpen(false);
					}}
					title={t("discardTitle")}
					description={t("discardBody")}
					confirmLabel={t("discardConfirm")}
					onConfirm={() => {
						setConfirmDiscardOpen(false);
						onCancel();
					}}
				/>

				<SociabilityBulkDialog
					open={sociabilityBulkOpen}
					targets={sociabilityTargets}
					changes={sociabilityBulkChanges}
					onConfirm={handleApplySociabilityMultiSelect}
					onCancel={() => setSociabilityBulkOpen(false)}
				/>

				<IssuePanel
					issues={issues}
					onReview={handleReviewIssue}
					onRepair={canRepairKeys ? handleOpenRepair : undefined}
				/>

				{hasPendingOverride ? (
					<p
						role="status"
						className="rounded-md border border-accent-violet-border bg-accent-violet-surface/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
						{t("pendingOverrideBlocks")}
					</p>
				) : null}

				{saveError ? (
					<div
						role="alert"
						className="flex items-start gap-2 rounded-md border border-status-error-border bg-status-error-surface/20 px-3 py-2">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">{t("saveRejectedTitle")}</p>
							<p className="text-xs leading-relaxed text-muted-foreground">{saveError}</p>
						</div>
					</div>
				) : null}

				{sociabilityIssues.length > 0 ? (
					<div
						role="alert"
						className="space-y-1.5 rounded-md border border-status-warning-border bg-status-warning-surface/20 px-3 py-2">
						<p className="flex items-center gap-2 text-sm font-medium text-foreground">
							<AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
							{t("sociabilityBulk.issuesTitle")}
						</p>
						<ul className="list-disc space-y-1 pl-6 text-xs leading-relaxed text-muted-foreground">
							{sociabilityIssues.map((issue, index) => (
								<li key={`${issue.code}-${index.toString()}`}>
									<span className="font-medium text-foreground">{issue.location}</span> —{" "}
									{t(`sociabilityBulk.issues.${issue.code}`)}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{untranslatedSociabilityLangs.length > 0 ? (
					<div className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-surface/10 px-3 py-2">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
						<p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
							{t("sociabilityBulk.translationApprovalNeeded", {
								languages: untranslatedSociabilityLangs.map(lang => languageLabel(lang)).join(", ")
							})}
						</p>
					</div>
				) : null}

				{isTranslation && (
					<div className="flex items-start gap-2 rounded-md border border-accent-violet-border bg-accent-violet-surface px-3 py-2">
						<Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-violet" aria-hidden="true" />
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

				{/*
				 * While a save is in flight the content is frozen. Editing on top of a
				 * request that is about to succeed would leave those edits behind when
				 * the editor closes on the server's answer.
				 */}
				<Tabs
					value={activeTab}
					onValueChange={v => setActiveTab(v as EditorTab)}
					aria-busy={isPending || undefined}
					inert={isPending || undefined}
					className={isPending ? "opacity-70 transition-opacity" : "transition-opacity"}>
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
							openRequest={openRequest}
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
