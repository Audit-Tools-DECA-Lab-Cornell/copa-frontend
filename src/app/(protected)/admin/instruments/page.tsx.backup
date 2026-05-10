"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
	Check,
	CheckCircle2,
	ChevronDown,
	Download,
	Eye,
	FileJson,
	FileSpreadsheet,
	FileText,
	GitBranch,
	ListChecks,
	Maximize2,
	Minimize2,
	Minus,
	Pencil,
	Plus,
	Ruler,
	Sparkles,
	Trash2,
	Upload,
	X
} from "lucide-react";

import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";
import { exportInstrument } from "@/lib/export/instrument";
import { playspaceApi } from "@/lib/api/playspace";
import type {
	ChoiceOption,
	InstrumentQuestion,
	InstrumentSection,
	LegalDocument,
	LegalSection,
	PlayspaceInstrument,
	PreAuditQuestion,
	QuestionDisplayCondition,
	QuestionScale,
	ScaleDefinition,
	ScaleOption
} from "@/types/audit";
import { formatDateTimeLabel } from "@/components/dashboard/utils";
import { BackButton } from "@/components/dashboard/back-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";

/* -------------------------------------------------------------------------- */
/*  Constants & Types                                                          */
/* -------------------------------------------------------------------------- */

const QUERY_KEY = ["playspace", "admin", "instruments"] as const;

type InstrumentContent = Record<string, PlayspaceInstrument>;

const SCALE_KEY_OPTIONS = ["provision", "diversity", "challenge", "sociability"] as const;
const CONSTRUCT_OPTIONS = ["play_value", "usability"] as const;
const MODE_OPTIONS = ["audit", "survey", "both"] as const;
const QUESTION_TYPE_OPTIONS = ["scaled", "checklist"] as const;
const INPUT_TYPE_OPTIONS = ["single_select", "multi_select", "auto_timestamp"] as const;
const PAGE_KEY_OPTIONS = ["audit_info", "space_setup"] as const;

/* -------------------------------------------------------------------------- */
/*  Formatting Helpers                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Convert a snake_case key like "section_1_playspace_character_community"
 * into a human-readable label "Section 1 — Playspace Character Community".
 */
function formatSectionKey(key: string): string {
	const match = key.match(/^section_(\d+)_(.+)$/);
	if (match) {
		const num = match[1];
		const rest = match[2]
			.split("_")
			.map(w => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");
		return `Section ${num} &mdash; ${rest}`;
	}
	return key
		.split("_")
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

function countTotalQuestions(sections: InstrumentSection[]): number {
	return sections.reduce((acc, s) => acc + s.questions.length, 0);
}

function collectSectionScaleKeys(questions: InstrumentQuestion[]): string[] {
	const keys = new Set<string>();
	for (const q of questions) {
		for (const s of q.scales) {
			keys.add(s.key);
		}
	}
	return Array.from(keys);
}

/* -------------------------------------------------------------------------- */
/*  Inline Markdown Rendering                                                  */
/* -------------------------------------------------------------------------- */

const BOLD_REGEX = /\*\*(.+?)\*\*/g;

/**
 * Renders a string that may contain `**bold**` markers into React nodes,
 * splitting on the markers and wrapping matched segments in `<strong>`.
 */
function renderInlineMarkdown(text: string): React.ReactNode {
	if (!BOLD_REGEX.test(text)) return text;

	BOLD_REGEX.lastIndex = 0;
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = null;
	let keyCounter = 0;

	while ((match = BOLD_REGEX.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}
		parts.push(<strong key={keyCounter++}>{match[1]}</strong>);
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts;
}

/* -------------------------------------------------------------------------- */
/*  Scale Deviation Logic                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Determines whether a question's scale options differ from the global
 * scale_guidance defaults for the same scale key.
 */
function isScaleCustomized(questionScale: QuestionScale, defaultScale: ScaleDefinition | undefined): boolean {
	if (!defaultScale) return true;
	// just have to check that the question scale options keys exist in the default scale
	return !questionScale.options.every(opt => defaultScale.options.some(dopt => dopt.key === opt.key));
}

/** Builds a lookup map from scale key to its ScaleDefinition. */
function buildScaleGuidanceMap(scaleGuidance: ScaleDefinition[]): Map<string, ScaleDefinition> {
	const map = new Map<string, ScaleDefinition>();
	for (const sd of scaleGuidance) {
		map.set(sd.key, sd);
	}
	return map;
}

/* -------------------------------------------------------------------------- */
/*  Default factories for CRUD operations                                      */
/* -------------------------------------------------------------------------- */

function makeDefaultScaleOption(): ScaleOption {
	return {
		key: "new_option",
		label: "New Option",
		addition_value: 0,
		boost_value: 0,
		allows_follow_up_scales: false,
		is_not_applicable: false
	};
}

function makeDefaultChoiceOption(): ChoiceOption {
	return { key: "new_option", label: "New Option", description: null };
}

function makeDefaultQuestionScale(): QuestionScale {
	return {
		key: "provision",
		title: "Provision",
		prompt: "How many?",
		options: [makeDefaultScaleOption()]
	};
}

function makeDefaultQuestion(sectionKey: string, index: number): InstrumentQuestion {
	return {
		question_key: `q_${sectionKey.match(/\d+/)?.[0] ?? "0"}_${index + 1}`,
		mode: "both",
		constructs: ["play_value"],
		domains: [],
		section_key: sectionKey,
		prompt: "New question prompt",
		question_type: "scaled",
		scales: [],
		options: [],
		required: true,
		display_if: null
	};
}

function makeDefaultSection(index: number): InstrumentSection {
	return {
		section_key: `section_${index + 1}_new`,
		title: "New Section",
		description: "",
		instruction: "Section instruction",
		notes_prompt: null,
		questions: []
	};
}

function makeDefaultScaleDefinition(): ScaleDefinition {
	return {
		key: "provision",
		title: "New Scale",
		prompt: "Scale prompt",
		description: "Scale description",
		options: [makeDefaultScaleOption()]
	};
}

function makeDefaultPreAuditQuestion(): PreAuditQuestion {
	return {
		key: "new_pre_audit_q",
		label: "New Pre-Audit Question",
		description: null,
		input_type: "single_select",
		required: false,
		options: [],
		page_key: "space_setup",
		visible_modes: ["audit", "survey", "both"],
		group_key: null
	};
}

function makeDefaultExecutionMode(): ChoiceOption {
	return { key: "new_mode", label: "New Mode", description: null };
}

function makeDefaultLegalSection(): LegalSection {
	return {
		key: "new_section",
		title: "New Section",
		body: [""],
		bullets: []
	};
}

function makeDefaultLegalDocument(): LegalDocument {
	return {
		key: "new_document",
		short_title: "New Doc",
		title: "New Document",
		eyebrow: "Document category",
		last_updated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
		summary: "",
		sections: [makeDefaultLegalSection()]
	};
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                             */
/* -------------------------------------------------------------------------- */

export default function AdminInstrumentsPage() {
	const t = useTranslations("admin.instruments");
	const formatT = useTranslations("common.format");
	const queryClient = useQueryClient();

	const [confirmActivateId, setConfirmActivateId] = useState<string | null>(null);
	const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
	const [editingContent, setEditingContent] = useState<InstrumentContent | null>(null);
	const [editingSourceVersion, setEditingSourceVersion] = useState<string>("");
	const [showUploadDialog, setShowUploadDialog] = useState(false);

	const instrumentsQuery = useQuery({
		queryKey: QUERY_KEY,
		queryFn: () => playspaceApi.admin.instruments.list()
	});

	const activateMutation = useMutation({
		mutationFn: (instrumentId: string) => playspaceApi.admin.instruments.update(instrumentId, { is_active: true }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY });
			setConfirmActivateId(null);
		}
	});

	const publishMutation = useMutation({
		mutationFn: async (params: { version: string; content: InstrumentContent; activate: boolean }) => {
			await playspaceApi.admin.instruments.create(
				{
					instrument_key: "pvua_v5_2",
					instrument_version: params.version,
					content: params.content as Parameters<typeof playspaceApi.admin.instruments.create>[0]["content"]
				},
				params.activate
			);
			setShowUploadDialog(false);
			setEditingContent(null);
			setEditingSourceVersion("");
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY });
			setEditingContent(null);
			setEditingSourceVersion("");
		}
	});

	function handleStartEditing(content: InstrumentContent, sourceVersion: string) {
		setEditingContent(structuredClone(content));
		setEditingSourceVersion(sourceVersion);
	}

	function handleCancelEditing() {
		setEditingContent(null);
		setEditingSourceVersion("");
	}

	if (instrumentsQuery.isLoading) {
		return <div className="h-40 animate-pulse rounded-card border border-border bg-card" />;
	}

	if (instrumentsQuery.isError || !instrumentsQuery.data) {
		return (
			<EmptyState
				title={t("error.title")}
				description={t("error.description")}
				action={
					<Button type="button" onClick={() => instrumentsQuery.refetch()}>
						{t("error.retry")}
					</Button>
				}
			/>
		);
	}

	const instruments = instrumentsQuery.data;

	if (editingContent !== null) {
		return (
			<InstrumentEditor
				content={editingContent}
				sourceVersion={editingSourceVersion}
				isPending={publishMutation.isPending}
				onPublish={(version, content, activate) => publishMutation.mutate({ version, content, activate })}
				onCancel={handleCancelEditing}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
					{ label: t("breadcrumbs.instruments") }
				]}
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
							<Upload className="mr-2 h-4 w-4" />
							{t("actions.uploadJson")}
						</Button>
						<BackButton href="/admin/dashboard" label={t("header.back")} />
					</div>
				}
			/>

			<Card>
				<CardHeader>
					<CardTitle>{t("versionHistory.title")}</CardTitle>
					<p className="text-sm text-muted-foreground">{t("versionHistory.description")}</p>
				</CardHeader>
				<CardContent>
					{instruments.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							{t("versionHistory.noVersions")}
						</p>
					) : (
						<div className="space-y-3">
							{instruments.map(instrument => (
								<div key={instrument.id} className="rounded-lg border border-border bg-card/60 p-4">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="space-y-1">
											<div className="text-sm font-semibold">
												{instrument.content.en.instrument_name}
											</div>
											<div className="flex items-center gap-2">
												<span className="font-mono text-sm font-semibold">
													v{instrument.instrument_version}
												</span>
												<Badge variant={instrument.is_active ? "default" : "outline"}>
													{instrument.is_active
														? t("versionHistory.active")
														: t("versionHistory.inactive")}
												</Badge>
											</div>
											<p className="text-xs text-muted-foreground">
												{t("versionHistory.created")}:{" "}
												{formatDateTimeLabel(instrument.created_at, formatT)}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													setExpandedVersionId(
														expandedVersionId === instrument.id ? null : instrument.id
													)
												}>
												<Eye className="mr-1.5 h-3.5 w-3.5" />
												{t("actions.viewContent")}
											</Button>
											<Button
												variant="outline"
												size="sm"
												data-testid="edit-duplicate-button"
												onClick={() =>
													handleStartEditing(
														instrument.content as InstrumentContent,
														instrument.instrument_version
													)
												}>
												{t("actions.editDuplicate")}
											</Button>
											{!instrument.is_active && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => setConfirmActivateId(instrument.id)}
													disabled={activateMutation.isPending}>
													{t("versionHistory.activate")}
												</Button>
											)}
										</div>
									</div>

									{expandedVersionId === instrument.id && (
										<InstrumentContentViewer
											content={instrument.content as InstrumentContent}
											version={instrument.instrument_version}
										/>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<ActivateDialog
				open={confirmActivateId !== null}
				isPending={activateMutation.isPending}
				onConfirm={() => {
					if (confirmActivateId) activateMutation.mutate(confirmActivateId);
				}}
				onCancel={() => setConfirmActivateId(null)}
			/>

			<UploadDialog
				open={showUploadDialog}
				isPending={publishMutation.isPending}
				onUpload={(version, content, activate) => publishMutation.mutate({ version, content, activate })}
				onClose={() => setShowUploadDialog(false)}
			/>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Activate Confirmation Dialog                                               */
/* -------------------------------------------------------------------------- */

function ActivateDialog({
	open,
	isPending,
	onConfirm,
	onCancel
}: Readonly<{
	open: boolean;
	isPending: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}>) {
	const t = useTranslations("admin.instruments.versionHistory");
	return (
		<Dialog
			open={open}
			onOpenChange={o => {
				if (!o) onCancel();
			}}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("confirmActivateTitle")}</DialogTitle>
					<DialogDescription>{t("confirmActivate")}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button onClick={onConfirm} disabled={isPending}>
						{t("activate")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------------------------------------------------------------- */
/*  JSON Upload Dialog                                                         */
/* -------------------------------------------------------------------------- */

function UploadDialog({
	open,
	isPending,
	onUpload,
	onClose
}: Readonly<{
	open: boolean;
	isPending: boolean;
	onUpload: (version: string, content: InstrumentContent, activate: boolean) => void;
	onClose: () => void;
}>) {
	const t = useTranslations("admin.instruments");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [version, setVersion] = useState("");
	const [lang, setLang] = useState<string | string[]>(["en"]);
	const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
	const [parseError, setParseError] = useState<string | null>(null);

	function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = e => {
			try {
				const json = JSON.parse(e.target?.result as string);
				if (typeof json !== "object" || json === null) {
					setParseError("File must contain a JSON object.");
					setParsed(null);
					return;
				}
				setParsed(json as Record<string, unknown>);
				setParseError(null);
			} catch {
				setParseError("Invalid JSON file.");
				setParsed(null);
			}
		};
		reader.readAsText(file);
	}

	function handleSubmit(activate: boolean) {
		if (!parsed || version.trim().length === 0) return;
		const content =
			typeof lang === "string"
				? { [lang]: parsed as unknown as PlayspaceInstrument }
				: (Object.fromEntries(
						Object.entries(parsed).map(([k, v]) => [k, v as unknown as PlayspaceInstrument])
					) as unknown as InstrumentContent);
		onUpload(version.trim(), content, activate);
	}

	function handleClose() {
		setVersion("");
		setLang("en");
		setParsed(null);
		setParseError(null);
		onClose();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={o => {
				if (!o) handleClose();
			}}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("upload.title")}</DialogTitle>
					<DialogDescription>{t("upload.description")}</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="upload-version">{t("upload.versionLabel")}</Label>
						<Input
							id="upload-version"
							placeholder="5.2.1"
							value={version}
							onChange={e => setVersion(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="upload-lang">{t("upload.languageLabel")}</Label>
						<Input
							id="upload-lang"
							placeholder="en"
							value={lang}
							onChange={e =>
								setLang(e.target.value.includes(",") ? e.target.value.split(",") : e.target.value)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("upload.fileLabel")}</Label>
						<div
							className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-accent/50"
							onClick={() => fileInputRef.current?.click()}
							onKeyDown={e => {
								if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
							}}
							role="button"
							tabIndex={0}
							onDragOver={e => e.preventDefault()}
							onDrop={e => {
								e.preventDefault();
								const file = e.dataTransfer.files[0];
								if (file && fileInputRef.current) {
									const dt = new DataTransfer();
									dt.items.add(file);
									fileInputRef.current.files = dt.files;
									fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
								}
							}}>
							<div className="text-center">
								<Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									{parsed
										? t("upload.fileLoaded", { keys: Object.keys(parsed).length })
										: t("upload.filePlaceholder")}
								</p>
							</div>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json,application/json"
							className="hidden"
							onChange={handleFileSelect}
						/>
						{parseError && <p className="text-sm text-destructive">{parseError}</p>}
					</div>
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button
						variant="secondary"
						disabled={!parsed || version.trim().length === 0 || isPending}
						onClick={() => handleSubmit(false)}>
						{t("upload.saveDraft")}
					</Button>
					<Button
						disabled={!parsed || version.trim().length === 0 || isPending}
						onClick={() => handleSubmit(true)}>
						{t("upload.publishActive")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------------------------------------------------------------- */
/*  Instrument Content Viewer (read-only, richly formatted)                    */
/* -------------------------------------------------------------------------- */

function InstrumentContentViewer({ content, version }: Readonly<{ content: InstrumentContent; version: string }>) {
	const t = useTranslations("admin.instruments.content");
	const languages = Object.keys(content);
	const [activeLang, setActiveLang] = useState(languages[0] ?? "en");
	const [activeTab, setActiveTab] = useState<
		"overview" | "sections" | "spreadsheet" | "preAudit" | "scales" | "legalDocuments"
	>("overview");
	const instrument = content[activeLang] as PlayspaceInstrument | undefined;

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
		<div className="mt-4 space-y-5 border-t border-border pt-4">
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
							Export
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "pdf", activeLang)}>
							<FileText className="mr-2 h-4 w-4 text-muted-foreground" />
							PDF
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "xlsx", activeLang)}>
							<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
							Excel (.xlsx)
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "csv", activeLang)}>
							<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
							CSV
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(content, version, "json", activeLang)}>
							<FileJson className="mr-2 h-4 w-4 text-muted-foreground" />
							JSON
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
										{text}
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

/* -------------------------------------------------------------------------- */
/*  Legal Documents Viewer                                                     */
/* -------------------------------------------------------------------------- */

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
							<p className="mt-2 text-sm text-muted-foreground leading-relaxed">{doc.summary}</p>
						)}
					</CardHeader>

					<CardContent className="space-y-5 pt-0">
						{doc.sections.map((section, sectionIndex) => (
							<div key={sectionIndex} className="space-y-2">
								<h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
								{section.body.map((para, paraIndex) => (
									<p key={paraIndex} className="text-sm text-muted-foreground leading-relaxed">
										{para}
									</p>
								))}
								{section.bullets.length > 0 && (
									<ul className="space-y-1 pl-4">
										{section.bullets.map((bullet, bulletIndex) => (
											<li
												key={bulletIndex}
												className="text-sm text-muted-foreground leading-relaxed list-disc">
												{bullet}
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

/* -------------------------------------------------------------------------- */
/*  Pre-Audit Questions Viewer                                                 */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Spreadsheet View (flat table with fullscreen + optional inline editing)    */
/* -------------------------------------------------------------------------- */

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

function SpreadsheetView({
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
	const editable = onEditQuestion !== undefined && onEditSection !== undefined;

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
	}, [sections, scaleGuidanceMap, t]);

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
		<div className={isFullscreen ? "shrink-0 border-b border-border bg-background px-4 py-3" : ""}>
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
												<TableCell className="font-mono text-xs tabular-nums text-muted-foreground sticky left-0 z-10 bg-muted/30 border-r border-border/50">
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
																Description
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
																	{sections[row.sectionIndex]?.description ||
																		"No description"}
																</span>
															)}
														</div>

														<div data-testid={`section-instruction-${row.sectionIndex}`}>
															<div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
																Instruction
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
																	{sections[row.sectionIndex]?.instruction ||
																		"No instruction"}
																</span>
															)}
														</div>

														<div data-testid={`section-notes_prompt-${row.sectionIndex}`}>
															<div className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
																Notes Prompt
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
																	{sections[row.sectionIndex]?.notes_prompt ||
																		"No notes prompt"}
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
												className="font-mono text-xs tabular-nums text-muted-foreground sticky left-0 z-10 bg-background border-r border-border/50"
												data-testid={`cell-question-key-${row.sectionIndex}-${row.questionIndex}`}>
												{editable
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
																className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px]"
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
												{editable && onEditQuestion ? (
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
												{editable && onEditQuestion ? (
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
																Play Value
															</SelectItem>
															<SelectItem
																value="usability"
																className="text-xs"
																data-testid="select-construct-item-usability">
																Usability
															</SelectItem>
															<SelectItem
																value="both"
																className="text-xs"
																data-testid="select-construct-item-both">
																Both
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

/* -------------------------------------------------------------------------- */
/*  Scale Guidance Viewer                                                      */
/* -------------------------------------------------------------------------- */

function ScaleGuidanceViewer({ scales }: Readonly<{ scales: ScaleDefinition[] }>) {
	const t = useTranslations("admin.instruments.content");

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			{scales.map(scale => (
				<Card key={scale.key}>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm">
							<ScaleKeyBadge scaleKey={scale.key} />
							{scale.title}
						</CardTitle>
						<p className="text-xs text-muted-foreground">{scale.prompt}</p>
					</CardHeader>
					<CardContent>
						<p className="mb-2 text-xs text-muted-foreground">{scale.description}</p>
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

/* -------------------------------------------------------------------------- */
/*  Viewer Section Accordion (read-only)                                       */
/* -------------------------------------------------------------------------- */

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
									<p className="text-xs leading-relaxed text-muted-foreground">
										{section.description}
									</p>
								)}
								{section.instruction && (
									<div className="rounded-md border border-status-info-border bg-status-info-surface px-3 py-2 text-xs text-foreground">
										<strong className="text-text-secondary">{t("sectionInstruction")}:</strong>{" "}
										{section.instruction}
									</div>
								)}
								{section.notes_prompt && (
									<div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
										<strong>{t("sectionNotesPrompt")}:</strong> {section.notes_prompt}
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

/* -------------------------------------------------------------------------- */
/*  Viewer Question Card (with scale deviation indicators)                     */
/* -------------------------------------------------------------------------- */

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

/** Compact inline display of a question's scale with deviation indicator. */
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
						<Sparkles className="h-3 w-3" />
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

/* -------------------------------------------------------------------------- */
/*  Display Condition Badge                                                    */
/* -------------------------------------------------------------------------- */

function DisplayConditionBadge({ condition }: Readonly<{ condition: QuestionDisplayCondition }>) {
	const t = useTranslations("admin.instruments.content");
	const optionKeysStr = condition.any_of_option_keys.join(", ");

	return (
		<Badge
			variant="outline"
			className="gap-1 border-status-warning-border bg-status-warning-surface text-xs text-status-warning">
			<GitBranch className="h-3 w-3" />
			{t("displayIfLabel", {
				questionKey: condition.question_key,
				scaleKey: condition.response_key,
				optionKeys: optionKeysStr
			})}
		</Badge>
	);
}

/* -------------------------------------------------------------------------- */
/*  Scale Key Badge                                                            */
/* -------------------------------------------------------------------------- */

const SCALE_COLORS: Record<string, string> = {
	provision: "border-accent-slate/40 bg-accent-slate/10 text-accent-slate",
	diversity: "border-accent-moss/40 bg-accent-moss/10 text-accent-moss",
	challenge: "border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta",
	sociability: "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
};

function ScaleKeyBadge({ scaleKey }: Readonly<{ scaleKey: string }>) {
	const t = useTranslations("admin.instruments.content");
	const colorClasses = SCALE_COLORS[scaleKey] ?? "border-border bg-muted/40";
	const label = t.has(`scaleLabels.${scaleKey}`) ? t(`scaleLabels.${scaleKey}`) : scaleKey;

	return (
		<span
			className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium ${colorClasses}`}>
			{label}
		</span>
	);
}

/* -------------------------------------------------------------------------- */
/*  Instrument Editor (full CRUD, tabbed)                                      */
/* -------------------------------------------------------------------------- */

import diff from "microdiff";

interface InstrumentEditorProps {
	readonly content: InstrumentContent;
	readonly sourceVersion: string;
	readonly isPending: boolean;
	readonly onPublish: (version: string, content: InstrumentContent, activate: boolean) => void;
	readonly onCancel: () => void;
}

function InstrumentEditor({ content, sourceVersion, isPending, onPublish, onCancel }: InstrumentEditorProps) {
	const t = useTranslations("admin.instruments");
	const ct = useTranslations("admin.instruments.content");
	const [draft, setDraft] = useState<InstrumentContent>(content);
	const [newVersion, setNewVersion] = useState(bumpVersion(sourceVersion));
	const languages = Object.keys(draft);
	const [activeLang, setActiveLang] = useState(languages[0] ?? "en");
	const [activeEditorTab, setActiveEditorTab] = useState<
		"preamble" | "modes" | "scaleGuidance" | "preAudit" | "sections" | "spreadsheet" | "legalDocuments"
	>("sections");
	const [showPublishDialog, setShowPublishDialog] = useState(false);
	const [publishActivate, setPublishActivate] = useState(true);

	const instrument = draft[activeLang] ?? null;

	const differences = useMemo(() => {
		return diff(content, draft);
	}, [content, draft]);

	const changesCount = differences.length;

	const updateInstrument = useCallback(
		(updater: (inst: PlayspaceInstrument) => void) => {
			setDraft(prev => {
				const next = structuredClone(prev);
				const inst = next[activeLang];
				if (inst) updater(inst);
				return next;
			});
		},
		[activeLang]
	);

	function handlePublish() {
		onPublish(newVersion, draft, publishActivate);
		setShowPublishDialog(false);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("editor.title")}
				description={t("editor.description", { version: sourceVersion })}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
					{ label: t("breadcrumbs.instruments"), href: "/admin/instruments" },
					{ label: t("editor.breadcrumb") }
				]}
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={onCancel}>
							{t("editor.cancel")}
						</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={isPending}
							onClick={() => {
								setPublishActivate(false);
								setShowPublishDialog(true);
							}}>
							{t("editor.saveDraft")}
						</Button>
						<div className="relative inline-block">
							<Button
								size="sm"
								disabled={isPending}
								onClick={() => {
									setPublishActivate(true);
									setShowPublishDialog(true);
								}}>
								{t("editor.publish")}
							</Button>
							{changesCount > 0 && (
								<Badge
									className="absolute -top-2 -right-2 px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center text-[10px] pointer-events-none z-10 shadow-sm"
									variant="destructive">
									{changesCount}
								</Badge>
							)}
						</div>
					</div>
				}
			/>

			{/* Language tabs */}
			<div className="flex items-center justify-between">
				<Tabs value={activeLang} onValueChange={setActiveLang}>
					<TabsList>
						{languages.map(lang => (
							<TabsTrigger key={lang} value={lang}>
								{lang.toUpperCase()}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<Download className="mr-2 h-4 w-4" />
							Export
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem onClick={() => exportInstrument(draft, newVersion, "pdf", activeLang)}>
							<FileText className="mr-2 h-4 w-4 text-muted-foreground" />
							PDF
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(draft, newVersion, "xlsx", activeLang)}>
							<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
							Excel (.xlsx)
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(draft, newVersion, "csv", activeLang)}>
							<FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
							CSV
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => exportInstrument(draft, newVersion, "json", activeLang)}>
							<FileJson className="mr-2 h-4 w-4 text-muted-foreground" />
							JSON
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<Tabs value={activeLang} onValueChange={setActiveLang}>
				{languages.map(lang => (
					<TabsContent key={lang} value={lang}>
						{instrument && activeLang === lang ? (
							<Tabs
								value={activeEditorTab}
								onValueChange={v => setActiveEditorTab(v as typeof activeEditorTab)}>
								<TabsList className="mb-4">
									<TabsTrigger value="preamble">{ct("preamble")}</TabsTrigger>
									<TabsTrigger value="modes">{ct("executionModes")}</TabsTrigger>
									<TabsTrigger value="scaleGuidance">{ct("scaleGuidance")}</TabsTrigger>
									<TabsTrigger value="preAudit">{ct("preAudit")}</TabsTrigger>
									<TabsTrigger value="sections">{ct("sections")}</TabsTrigger>
									<TabsTrigger value="spreadsheet" data-testid="spreadsheet-tab">
										{ct("editableSpreadsheet")}
									</TabsTrigger>
									<TabsTrigger value="legalDocuments">{ct("legalDocuments")}</TabsTrigger>
								</TabsList>

								<TabsContent value="preamble">
									<PreambleEditor
										preamble={instrument.preamble ?? []}
										onChange={preamble =>
											updateInstrument(inst => {
												inst.preamble = preamble;
											})
										}
									/>
								</TabsContent>

								<TabsContent value="modes">
									<ExecutionModesEditor
										modes={instrument.execution_modes ?? []}
										onChange={modes =>
											updateInstrument(inst => {
												inst.execution_modes = modes;
											})
										}
									/>
								</TabsContent>

								<TabsContent value="scaleGuidance">
									<ScaleGuidanceEditor
										scales={instrument.scale_guidance ?? []}
										onChange={scales =>
											updateInstrument(inst => {
												inst.scale_guidance = scales;
											})
										}
									/>
								</TabsContent>

								<TabsContent value="preAudit">
									<PreAuditQuestionsEditor
										questions={instrument.pre_audit_questions ?? []}
										onChange={questions =>
											updateInstrument(inst => {
												inst.pre_audit_questions = questions;
											})
										}
									/>
								</TabsContent>

								<TabsContent value="sections">
									<SectionEditorList
										sections={instrument.sections ?? []}
										scaleGuidance={instrument.scale_guidance ?? []}
										onChange={sections =>
											updateInstrument(inst => {
												inst.sections = sections;
											})
										}
									/>
								</TabsContent>

								<TabsContent value="spreadsheet" data-testid="spreadsheet-content">
									<SpreadsheetView
										sections={instrument.sections ?? []}
										scaleGuidanceMap={buildScaleGuidanceMap(instrument.scale_guidance ?? [])}
										onEditQuestion={(si, qi, field, value) => {
											updateInstrument(inst => {
												const section = inst.sections[si];
												if (!section) return;
												const q = section.questions[qi];
												if (!q) return;
												if (field === "prompt") q.prompt = value as string;
												else if (field === "question_key") q.question_key = value as string;
												else if (field === "mode")
													q.mode = value as "audit" | "survey" | "both";
												else if (field === "constructs")
													q.constructs = value as ("usability" | "play_value")[];
											});
										}}
										onEditSection={(si, field, value) => {
											updateInstrument(inst => {
												const s = inst.sections[si];
												if (!s) return;
												if (field === "title") s.title = value ?? "";
												else if (field === "description") s.description = value;
												else if (field === "instruction") s.instruction = value ?? "";
												else if (field === "notes_prompt") s.notes_prompt = value;
											});
										}}
									/>
								</TabsContent>

								<TabsContent value="legalDocuments">
									<LegalDocumentsEditor
										documents={instrument.legal_documents ?? []}
										onChange={docs =>
											updateInstrument(inst => {
												inst.legal_documents = docs;
											})
										}
									/>
								</TabsContent>
							</Tabs>
						) : (
							<p className="py-8 text-center text-sm text-muted-foreground">{ct("noContent")}</p>
						)}
					</TabsContent>
				))}
			</Tabs>

			<Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
				<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{publishActivate ? t("editor.publishTitle") : t("editor.draftTitle")}</DialogTitle>
						<DialogDescription>
							{publishActivate ? t("editor.publishConfirm") : t("editor.draftConfirm")}
						</DialogDescription>
					</DialogHeader>

					{differences.length > 0 ? (
						<div className="space-y-3 py-4 border-y border-border/50 bg-muted/20 p-4 rounded-md">
							<h4 className="text-sm font-semibold mb-2">Detected Changes ({changesCount})</h4>
							<div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
								{differences.map((d, i) => (
									<div
										key={i}
										className="text-xs border border-border/50 rounded-md p-2 bg-background">
										<div className="flex items-center gap-2 mb-1.5 border-b border-border/30 pb-1">
											<Badge
												variant={
													d.type === "CREATE"
														? "default"
														: d.type === "REMOVE"
															? "destructive"
															: "secondary"
												}
												className="text-[10px] px-1.5 py-0 h-4">
												{d.type}
											</Badge>
											<span className="font-mono text-muted-foreground break-all">
												{d.path.join(" → ")}
											</span>
										</div>
										<div className="grid grid-cols-2 gap-2 mt-2">
											{(d.type === "CHANGE" || d.type === "REMOVE") && (
												<div className="rounded-md border border-destructive/30 bg-destructive/10 p-1.5">
													<div className="text-[9px] font-semibold text-destructive/80 mb-1 uppercase tracking-wider">
														Before
													</div>
													<div className="text-destructive/90 wrap-break-word whitespace-pre-wrap">
														{JSON.stringify(d.oldValue, null, 2)}
													</div>
												</div>
											)}
											{(d.type === "CHANGE" || d.type === "CREATE") && (
												<div
													className={`rounded-md border border-status-success-border bg-status-success-surface p-1.5 ${d.type === "CREATE" ? "col-span-2" : ""}`}>
													<div className="text-[9px] font-semibold text-status-success mb-1 uppercase tracking-wider">
														After
													</div>
													<div className="text-foreground wrap-break-word whitespace-pre-wrap">
														{JSON.stringify(d.value, null, 2)}
													</div>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="py-4 border-y border-border/50 bg-muted/20 p-4 rounded-md text-center">
							<p className="text-sm text-muted-foreground">No changes detected.</p>
						</div>
					)}

					<div className="space-y-2 py-2">
						<Label htmlFor="new-version">{t("editor.newVersionLabel")}</Label>
						<Input id="new-version" value={newVersion} onChange={e => setNewVersion(e.target.value)} />
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowPublishDialog(false)}>
							Cancel
						</Button>
						<Button disabled={newVersion.trim().length === 0 || isPending} onClick={handlePublish}>
							{publishActivate ? t("editor.publish") : t("editor.saveDraft")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Preamble Editor                                                            */
/* -------------------------------------------------------------------------- */

function PreambleEditor({
	preamble,
	onChange
}: Readonly<{
	preamble: string[];
	onChange: (preamble: string[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateParagraph(index: number, value: string) {
		const next = [...preamble];
		next[index] = value;
		onChange(next);
	}

	function addParagraph() {
		onChange([...preamble, ""]);
	}

	function removeParagraph(index: number) {
		onChange(preamble.filter((_, i) => i !== index));
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">{t("preamble")}</CardTitle>
					<Button variant="outline" size="sm" onClick={addParagraph}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						{t("addParagraph")}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{preamble.length === 0 && (
					<p className="py-4 text-center text-sm text-muted-foreground">{t("noContent")}</p>
				)}
				{preamble.map((text, idx) => (
					<div key={idx} className="flex gap-2">
						<div className="min-w-0 flex-1">
							<Textarea
								className="min-h-[80px] text-sm"
								value={text}
								onChange={e => updateParagraph(idx, e.target.value)}
							/>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="shrink-0 text-destructive hover:text-destructive"
							onClick={() => removeParagraph(idx)}>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

/* -------------------------------------------------------------------------- */
/*  Execution Modes Editor                                                     */
/* -------------------------------------------------------------------------- */

function ExecutionModesEditor({
	modes,
	onChange
}: Readonly<{
	modes: ChoiceOption[];
	onChange: (modes: ChoiceOption[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateMode(index: number, field: keyof ChoiceOption, value: string | null) {
		const next = structuredClone(modes);
		(next[index] as Record<string, string | null | undefined>)[field] = value;
		onChange(next);
	}

	function addMode() {
		onChange([...modes, makeDefaultExecutionMode()]);
	}

	function removeMode(index: number) {
		onChange(modes.filter((_, i) => i !== index));
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">{t("executionModes")}</CardTitle>
					<Button variant="outline" size="sm" onClick={addMode}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						{t("addMode")}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{modes.map((mode, idx) => (
					<div key={idx} className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-3">
						<div className="min-w-0 flex-1 grid gap-3 md:grid-cols-3">
							<EditableField
								label={t("modeKey")}
								value={mode.key}
								mono
								onChange={v => updateMode(idx, "key", v)}
							/>
							<EditableField
								label={t("modeLabel")}
								value={mode.label}
								onChange={v => updateMode(idx, "label", v)}
							/>
							<EditableField
								label={t("modeDescription")}
								value={mode.description ?? ""}
								onChange={v => updateMode(idx, "description", v || null)}
							/>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="mt-5 shrink-0 text-destructive hover:text-destructive"
							onClick={() => removeMode(idx)}>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

/* -------------------------------------------------------------------------- */
/*  Scale Guidance Editor                                                      */
/* -------------------------------------------------------------------------- */

function ScaleGuidanceEditor({
	scales,
	onChange
}: Readonly<{
	scales: ScaleDefinition[];
	onChange: (scales: ScaleDefinition[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateScale(index: number, updater: (sd: ScaleDefinition) => void) {
		const next = structuredClone(scales);
		updater(next[index]);
		onChange(next);
	}

	function addScale() {
		onChange([...scales, makeDefaultScaleDefinition()]);
	}

	function removeScale(index: number) {
		onChange(scales.filter((_, i) => i !== index));
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">{t("scaleGuidance")}</CardTitle>
					<Button variant="outline" size="sm" onClick={addScale}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						{t("addScaleDefinition")}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{scales.map((scale, sIdx) => (
					<div key={sIdx} className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-3">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1 grid gap-3 md:grid-cols-2">
								<div className="space-y-1">
									<Label className="text-xs text-muted-foreground">{t("scaleKey")}</Label>
									<Select
										value={scale.key}
										onValueChange={v =>
											updateScale(sIdx, sd => {
												sd.key = v as ScaleDefinition["key"];
											})
										}>
										<SelectTrigger className="text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{SCALE_KEY_OPTIONS.map(k => (
												<SelectItem key={k} value={k}>
													{t.has(`scaleLabels.${k}`) ? t(`scaleLabels.${k}`) : k}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<EditableField
									label={t("scaleTitle")}
									value={scale.title}
									onChange={v =>
										updateScale(sIdx, sd => {
											sd.title = v;
										})
									}
								/>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="mt-5 shrink-0 text-destructive hover:text-destructive"
								onClick={() => removeScale(sIdx)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
						<EditableField
							label={t("scalePrompt")}
							value={scale.prompt}
							multiline
							onChange={v =>
								updateScale(sIdx, sd => {
									sd.prompt = v;
								})
							}
						/>
						<EditableField
							label={t("scaleDescription")}
							value={scale.description}
							multiline
							onChange={v =>
								updateScale(sIdx, sd => {
									sd.description = v;
								})
							}
						/>

						<Separator />

						<ScaleOptionsEditor
							options={scale.options}
							onChange={opts =>
								updateScale(sIdx, sd => {
									sd.options = opts;
								})
							}
						/>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

/* -------------------------------------------------------------------------- */
/*  Scale Options Editor (shared between guidance and question scales)         */
/* -------------------------------------------------------------------------- */

function ScaleOptionsEditor({
	options,
	onChange
}: Readonly<{
	options: ScaleOption[];
	onChange: (options: ScaleOption[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateOption(index: number, updater: (opt: ScaleOption) => void) {
		const next = structuredClone(options);
		updater(next[index]);
		onChange(next);
	}

	function addOption() {
		onChange([...options, makeDefaultScaleOption()]);
	}

	function removeOption(index: number) {
		onChange(options.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("scaleOptions")} ({options.length})
				</Label>
				<Button variant="ghost" size="sm" onClick={addOption}>
					<Plus className="mr-1 h-3 w-3" />
					{t("addOption")}
				</Button>
			</div>

			{options.map((opt, oIdx) => (
				<div key={oIdx} className="rounded border border-border/40 bg-muted/20 p-3 space-y-2">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
							<EditableField
								label={t("optionKey")}
								value={opt.key}
								mono
								onChange={v =>
									updateOption(oIdx, o => {
										o.key = v;
									})
								}
							/>
							<EditableField
								label={t("optionLabel")}
								value={opt.label}
								onChange={v =>
									updateOption(oIdx, o => {
										o.label = v;
									})
								}
							/>
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">{t("additionValue")}</Label>
								<Input
									type="number"
									className="text-sm font-mono"
									value={opt.addition_value}
									onChange={e =>
										updateOption(oIdx, o => {
											o.addition_value = Number(e.target.value) || 0;
										})
									}
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">{t("boostValue")}</Label>
								<Input
									type="number"
									className="text-sm font-mono"
									value={opt.boost_value}
									onChange={e =>
										updateOption(oIdx, o => {
											o.boost_value = Number(e.target.value) || 0;
										})
									}
								/>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="mt-5 shrink-0 text-destructive hover:text-destructive"
							onClick={() => removeOption(oIdx)}>
							<Minus className="h-4 w-4" />
						</Button>
					</div>
					<div className="flex items-center gap-4">
						<label className="flex items-center gap-2 text-xs cursor-pointer">
							<input
								type="checkbox"
								checked={opt.allows_follow_up_scales}
								onChange={e =>
									updateOption(oIdx, o => {
										o.allows_follow_up_scales = e.target.checked;
									})
								}
								className="rounded border-border"
							/>
							{t("allowsFollowUp")}
						</label>
						<label className="flex items-center gap-2 text-xs cursor-pointer">
							<input
								type="checkbox"
								checked={opt.is_not_applicable}
								onChange={e =>
									updateOption(oIdx, o => {
										o.is_not_applicable = e.target.checked;
									})
								}
								className="rounded border-border"
							/>
							{t("isNotApplicable")}
						</label>
					</div>
				</div>
			))}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Pre-Audit Questions Editor                                                 */
/* -------------------------------------------------------------------------- */

function PreAuditQuestionsEditor({
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
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">{t("preAudit")}</CardTitle>
					<Button variant="outline" size="sm" onClick={addQuestion}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						{t("addPreAuditQuestion")}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{questions.map((q, qIdx) => (
					<div key={qIdx} className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-3">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1 grid gap-3 md:grid-cols-3">
								<EditableField
									label={t("optionKey")}
									value={q.key}
									mono
									onChange={v =>
										updateQuestion(qIdx, pq => {
											pq.key = v;
										})
									}
								/>
								<EditableField
									label={t("optionLabel")}
									value={q.label}
									onChange={v =>
										updateQuestion(qIdx, pq => {
											pq.label = v;
										})
									}
								/>
								<div className="space-y-1">
									<Label className="text-xs text-muted-foreground">{t("inputType")}</Label>
									<Select
										value={q.input_type}
										onValueChange={v =>
											updateQuestion(qIdx, pq => {
												pq.input_type = v as PreAuditQuestion["input_type"];
											})
										}>
										<SelectTrigger className="text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{INPUT_TYPE_OPTIONS.map(it => (
												<SelectItem key={it} value={it}>
													{t.has(`preAuditInputTypes.${it}`)
														? t(`preAuditInputTypes.${it}`)
														: it}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="mt-5 shrink-0 text-destructive hover:text-destructive"
								onClick={() => removeQuestion(qIdx)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>

						<EditableField
							label={t("optionDescription")}
							value={q.description ?? ""}
							multiline
							onChange={v =>
								updateQuestion(qIdx, pq => {
									pq.description = v || null;
								})
							}
						/>

						<div className="grid gap-3 md:grid-cols-3">
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">{t("pageKey")}</Label>
								<Select
									value={q.page_key}
									onValueChange={v =>
										updateQuestion(qIdx, pq => {
											pq.page_key = v as PreAuditQuestion["page_key"];
										})
									}>
									<SelectTrigger className="text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PAGE_KEY_OPTIONS.map(pk => (
											<SelectItem key={pk} value={pk}>
												{t.has(`pageKeys.${pk}`) ? t(`pageKeys.${pk}`) : pk}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">{t("groupKey")}</Label>
								<Input
									className="text-sm font-mono"
									value={q.group_key ?? ""}
									onChange={e =>
										updateQuestion(qIdx, pq => {
											pq.group_key = e.target.value || null;
										})
									}
								/>
							</div>
							<div className="space-y-1 flex flex-col justify-end">
								<label className="flex items-center gap-2 text-xs cursor-pointer pb-2">
									<input
										type="checkbox"
										checked={q.required}
										onChange={e =>
											updateQuestion(qIdx, pq => {
												pq.required = e.target.checked;
											})
										}
										className="rounded border-border"
									/>
									{t("required")}
								</label>
							</div>
						</div>

						{/* Visible modes */}
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">{t("visibleModes")}</Label>
							<div className="flex flex-wrap gap-2">
								{MODE_OPTIONS.map(m => {
									const checked = q.visible_modes.includes(m);
									return (
										<label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer">
											<input
												type="checkbox"
												checked={checked}
												onChange={e => {
													updateQuestion(qIdx, pq => {
														if (e.target.checked) {
															pq.visible_modes = [...pq.visible_modes, m];
														} else {
															pq.visible_modes = pq.visible_modes.filter(vm => vm !== m);
														}
													});
												}}
												className="rounded border-border"
											/>
											{t.has(`modes.${m}`) ? t(`modes.${m}`) : m}
										</label>
									);
								})}
							</div>
						</div>

						<Separator />

						{/* Choice options */}
						<ChoiceOptionsEditor
							options={q.options}
							onChange={opts =>
								updateQuestion(qIdx, pq => {
									pq.options = opts;
								})
							}
						/>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

/* -------------------------------------------------------------------------- */
/*  Choice Options Editor (reusable for pre-audit + checklist)                 */
/* -------------------------------------------------------------------------- */

function ChoiceOptionsEditor({
	options,
	onChange
}: Readonly<{
	options: ChoiceOption[];
	onChange: (options: ChoiceOption[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateOption(index: number, field: keyof ChoiceOption, value: string | null) {
		const next = structuredClone(options);
		(next[index] as Record<string, string | null | undefined>)[field] = value;
		onChange(next);
	}

	function addOption() {
		onChange([...options, makeDefaultChoiceOption()]);
	}

	function removeOption(index: number) {
		onChange(options.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("options")} ({options.length})
				</Label>
				<Button variant="ghost" size="sm" onClick={addOption}>
					<Plus className="mr-1 h-3 w-3" />
					{t("addOption")}
				</Button>
			</div>
			{options.map((opt, oIdx) => (
				<div key={oIdx} className="flex items-start gap-2 rounded border border-border/40 bg-muted/20 p-2">
					<div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-3">
						<EditableField
							label={t("optionKey")}
							value={opt.key}
							mono
							onChange={v => updateOption(oIdx, "key", v)}
						/>
						<EditableField
							label={t("optionLabel")}
							value={opt.label}
							onChange={v => updateOption(oIdx, "label", v)}
						/>
						<EditableField
							label={t("optionDescription")}
							value={opt.description ?? ""}
							onChange={v => updateOption(oIdx, "description", v || null)}
						/>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="mt-5 shrink-0 text-destructive hover:text-destructive"
						onClick={() => removeOption(oIdx)}>
						<Minus className="h-4 w-4" />
					</Button>
				</div>
			))}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Section Editor List (full CRUD)                                            */
/* -------------------------------------------------------------------------- */

function SectionEditorList({
	sections,
	scaleGuidance,
	onChange
}: Readonly<{
	sections: InstrumentSection[];
	scaleGuidance: ScaleDefinition[];
	onChange: (sections: InstrumentSection[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const scaleGuidanceMap = useMemo(() => buildScaleGuidanceMap(scaleGuidance), [scaleGuidance]);

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

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-end">
				<Button variant="outline" size="sm" onClick={addSection}>
					<Plus className="mr-1.5 h-3.5 w-3.5" />
					{t("addQuestion")}
				</Button>
			</div>

			<Accordion type="single" collapsible className="w-full">
				{sections.map((section, sectionIndex) => {
					const scaleKeys = collectSectionScaleKeys(section.questions);

					return (
						<AccordionItem key={`${section.section_key}-${sectionIndex}`} value={`section-${sectionIndex}`}>
							<AccordionTrigger className="text-sm hover:no-underline">
								<span className="flex items-center gap-2">
									<Badge variant="outline" className="shrink-0 font-mono text-xs tabular-nums">
										{sectionIndex + 1}
									</Badge>
									<span className="font-medium">{section.title}</span>
									<span className="text-muted-foreground">
										{t("sectionSummary", {
											questionCount: section.questions.length,
											scaleCount: scaleKeys.length
										})}
									</span>
								</span>
							</AccordionTrigger>
							<AccordionContent>
								<div className="space-y-4 pl-2">
									<div className="flex items-center justify-end">
										<Button
											variant="ghost"
											size="sm"
											className="text-destructive hover:text-destructive"
											onClick={() => removeSection(sectionIndex)}>
											<Trash2 className="mr-1.5 h-3.5 w-3.5" />
											{t("removeQuestion")}
										</Button>
									</div>

									<div className="grid gap-3 md:grid-cols-2">
										<EditableField
											label={t("sectionKey")}
											value={section.section_key}
											mono
											onChange={v =>
												updateSection(sectionIndex, s => {
													s.section_key = v;
												})
											}
										/>
										<EditableField
											label={t("sectionTitle")}
											value={section.title}
											onChange={v =>
												updateSection(sectionIndex, s => {
													s.title = v;
												})
											}
										/>
									</div>
									<EditableField
										label={t("sectionInstruction")}
										value={section.instruction}
										multiline
										onChange={v =>
											updateSection(sectionIndex, s => {
												s.instruction = v;
											})
										}
									/>
									<EditableField
										label={t("sectionDescription")}
										value={section.description ?? ""}
										multiline
										onChange={v =>
											updateSection(sectionIndex, s => {
												s.description = v || null;
											})
										}
									/>
									<EditableField
										label={t("sectionNotesPrompt")}
										value={section.notes_prompt ?? ""}
										multiline
										onChange={v =>
											updateSection(sectionIndex, s => {
												s.notes_prompt = v || null;
											})
										}
									/>

									<Separator />

									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
												{t("questions")} ({section.questions.length})
											</p>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													updateSection(sectionIndex, s => {
														s.questions = [
															...s.questions,
															makeDefaultQuestion(s.section_key, s.questions.length)
														];
													})
												}>
												<Plus className="mr-1 h-3 w-3" />
												{t("addQuestion")}
											</Button>
										</div>
										{section.questions.map((question, qIndex) => (
											<QuestionEditor
												key={`${question.question_key}-${qIndex}`}
												question={question}
												scaleGuidanceMap={scaleGuidanceMap}
												onUpdate={updater =>
													updateSection(sectionIndex, s => {
														updater(s.questions[qIndex]);
													})
												}
												onRemove={() =>
													updateSection(sectionIndex, s => {
														s.questions = s.questions.filter((_, i) => i !== qIndex);
													})
												}
											/>
										))}
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Question Editor (full CRUD with all fields)                                */
/* -------------------------------------------------------------------------- */

function QuestionEditor({
	question,
	scaleGuidanceMap,
	onUpdate,
	onRemove
}: Readonly<{
	question: InstrumentQuestion;
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	onUpdate: (updater: (q: InstrumentQuestion) => void) => void;
	onRemove: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const [expanded, setExpanded] = useState(false);
	const questionLabel = formatQuestionKeyForDisplay(question.question_key);
	const questionType = question.question_type ?? "scaled";
	const isChecklist = questionType === "checklist";

	return (
		<div className="rounded-lg border border-border/50 bg-card/40 p-3">
			{/* Collapsed header */}
			<div className="flex items-start gap-2">
				<Button
					variant="ghost"
					size="icon"
					className="mt-0.5 h-6 w-6 shrink-0"
					onClick={() => setExpanded(!expanded)}>
					<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
				</Button>
				<Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs tabular-nums">
					{questionLabel}
				</Badge>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium leading-relaxed line-clamp-2">
						{renderInlineMarkdown(question.prompt)}
					</p>
					<div className="mt-1 flex flex-wrap gap-1.5">
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
						{/* Scale deviation badges in collapsed view */}
						{question.scales.map(scale => {
							const defaultScale = scaleGuidanceMap.get(scale.key);
							const customized = isScaleCustomized(scale, defaultScale);
							if (!customized) return null;
							return (
								<Badge
									key={`custom-${scale.key}`}
									variant="outline"
									className="gap-1 border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta text-[10px] px-1.5 py-0">
									<Sparkles className="h-3 w-3" />
									{t.has(`scaleLabels.${scale.key}`)
										? t(`scaleLabels.${scale.key}`)
										: scale.key}: {t("customOptions")}
								</Badge>
							);
						})}
					</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="shrink-0 text-destructive hover:text-destructive"
					onClick={onRemove}>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>

			{/* Expanded editor */}
			{expanded && (
				<div className="mt-4 space-y-4 border-t border-border/30 pt-4 pl-8">
					{/* Core fields */}
					<div className="grid gap-3 md:grid-cols-3">
						<EditableField
							label={t("questionKey")}
							value={question.question_key}
							mono
							onChange={v =>
								onUpdate(q => {
									q.question_key = v;
								})
							}
						/>
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">{t("questionType")}</Label>
							<Select
								value={questionType}
								onValueChange={v =>
									onUpdate(q => {
										q.question_type = v as InstrumentQuestion["question_type"];
									})
								}>
								<SelectTrigger className="text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{QUESTION_TYPE_OPTIONS.map(qt => (
										<SelectItem key={qt} value={qt}>
											{t.has(`questionTypes.${qt}`) ? t(`questionTypes.${qt}`) : qt}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">{t("mode")}</Label>
							<Select
								value={question.mode}
								onValueChange={v =>
									onUpdate(q => {
										q.mode = v as InstrumentQuestion["mode"];
									})
								}>
								<SelectTrigger className="text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MODE_OPTIONS.map(m => (
										<SelectItem key={m} value={m}>
											{t.has(`modes.${m}`) ? t(`modes.${m}`) : m}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Prompt */}
					<EditableField
						label={t("prompt")}
						value={question.prompt}
						multiline
						onChange={v =>
							onUpdate(q => {
								q.prompt = v;
							})
						}
					/>

					{/* Constructs multi-select */}
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">{t("constructs")}</Label>
						<div className="flex flex-wrap gap-2">
							{CONSTRUCT_OPTIONS.map(c => {
								const checked = question.constructs.includes(c);
								return (
									<button
										key={c}
										type="button"
										onClick={() => {
											onUpdate(q => {
												if (checked) {
													q.constructs = q.constructs.filter(x => x !== c);
												} else {
													q.constructs = [...q.constructs, c];
												}
											});
										}}
										className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
											checked
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-muted/40 text-muted-foreground hover:border-primary/50"
										}`}>
										{t.has(`constructLabels.${c}`) ? t(`constructLabels.${c}`) : c}
									</button>
								);
							})}
						</div>
					</div>

					{/* Required toggle */}
					<label className="flex items-center gap-2 text-sm cursor-pointer">
						<input
							type="checkbox"
							checked={question.required !== false}
							onChange={e =>
								onUpdate(q => {
									q.required = e.target.checked;
								})
							}
							className="rounded border-border"
						/>
						{t("required")}
					</label>

					{/* Display condition sub-form */}
					<DisplayConditionEditor
						condition={question.display_if ?? null}
						onChange={c =>
							onUpdate(q => {
								q.display_if = c;
							})
						}
					/>

					<Separator />

					{/* Scales editor (for scaled questions) */}
					{!isChecklist && (
						<QuestionScalesEditor
							scales={question.scales}
							scaleGuidanceMap={scaleGuidanceMap}
							onChange={scales =>
								onUpdate(q => {
									q.scales = scales;
								})
							}
						/>
					)}

					{/* Checklist options editor */}
					{isChecklist && (
						<ChoiceOptionsEditor
							options={question.options}
							onChange={opts =>
								onUpdate(q => {
									q.options = opts;
								})
							}
						/>
					)}
				</div>
			)}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Display Condition Editor                                                   */
/* -------------------------------------------------------------------------- */

function DisplayConditionEditor({
	condition,
	onChange
}: Readonly<{
	condition: QuestionDisplayCondition | null;
	onChange: (condition: QuestionDisplayCondition | null) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	if (!condition) {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={() => onChange({ question_key: "", response_key: "provision", any_of_option_keys: [] })}>
				<GitBranch className="mr-1.5 h-3.5 w-3.5" />
				{t("setCondition")}
			</Button>
		);
	}

	return (
		<div className="rounded-md border border-status-warning-border bg-status-warning-surface/30 p-3 space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold text-status-warning flex items-center gap-1.5">
					<GitBranch className="h-3.5 w-3.5" />
					{t("displayCondition")}
				</Label>
				<Button
					variant="ghost"
					size="sm"
					className="text-destructive hover:text-destructive"
					onClick={() => onChange(null)}>
					{t("clearCondition")}
				</Button>
			</div>
			<div className="grid gap-3 md:grid-cols-3">
				<EditableField
					label={t("questionKey")}
					value={condition.question_key}
					mono
					onChange={v => onChange({ ...condition, question_key: v })}
				/>
				<EditableField
					label={t("responseKey")}
					value={condition.response_key}
					mono
					onChange={v => onChange({ ...condition, response_key: v })}
				/>
				<EditableField
					label={t("anyOfOptionKeys")}
					value={condition.any_of_option_keys.join(", ")}
					mono
					onChange={v =>
						onChange({
							...condition,
							any_of_option_keys: v
								.split(",")
								.map(s => s.trim())
								.filter(Boolean)
						})
					}
				/>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Question Scales Editor (CRUD per-question scales with deviation tags)      */
/* -------------------------------------------------------------------------- */

function QuestionScalesEditor({
	scales,
	scaleGuidanceMap,
	onChange
}: Readonly<{
	scales: QuestionScale[];
	scaleGuidanceMap: Map<string, ScaleDefinition>;
	onChange: (scales: QuestionScale[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	function updateScale(index: number, updater: (s: QuestionScale) => void) {
		const next = structuredClone(scales);
		updater(next[index]);
		onChange(next);
	}

	function addScale() {
		onChange([...scales, makeDefaultQuestionScale()]);
	}

	function removeScale(index: number) {
		onChange(scales.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t("scales")} ({scales.length})
				</Label>
				<Button variant="ghost" size="sm" onClick={addScale}>
					<Plus className="mr-1 h-3 w-3" />
					{t("addScale")}
				</Button>
			</div>

			{scales.map((scale, sIdx) => {
				const defaultScale = scaleGuidanceMap.get(scale.key);
				const customized = isScaleCustomized(scale, defaultScale);

				return (
					<div
						key={sIdx}
						className={`rounded-lg border p-3 space-y-3 ${
							customized
								? "border-accent-terracotta/30 bg-accent-terracotta/5"
								: "border-border/50 bg-card/30"
						}`}>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0 flex-1 grid gap-3 md:grid-cols-3">
								<div className="space-y-1">
									<Label className="text-xs text-muted-foreground">{t("scaleKey")}</Label>
									<Select
										value={scale.key}
										onValueChange={v =>
											updateScale(sIdx, s => {
												s.key = v as QuestionScale["key"];
											})
										}>
										<SelectTrigger className="text-sm">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{SCALE_KEY_OPTIONS.map(k => (
												<SelectItem key={k} value={k}>
													{t.has(`scaleLabels.${k}`) ? t(`scaleLabels.${k}`) : k}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<EditableField
									label={t("scaleTitle")}
									value={scale.title}
									onChange={v =>
										updateScale(sIdx, s => {
											s.title = v;
										})
									}
								/>
								<EditableField
									label={t("scalePrompt")}
									value={scale.prompt}
									onChange={v =>
										updateScale(sIdx, s => {
											s.prompt = v;
										})
									}
								/>
							</div>
							<div className="flex items-center gap-1 mt-5">
								{customized && (
									<Badge
										variant="outline"
										className="gap-1 border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta text-[10px] px-1.5 py-0">
										<Sparkles className="h-3 w-3" />
										{t("customOptions")}
									</Badge>
								)}
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0 text-destructive hover:text-destructive"
									onClick={() => removeScale(sIdx)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<ScaleOptionsEditor
							options={scale.options}
							onChange={opts =>
								updateScale(sIdx, s => {
									s.options = opts;
								})
							}
						/>
					</div>
				);
			})}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Shared micro-components                                                    */
/* -------------------------------------------------------------------------- */

function EditableField({
	label,
	value,
	multiline,
	mono,
	onChange
}: Readonly<{
	label: string;
	value: string;
	multiline?: boolean;
	mono?: boolean;
	onChange: (value: string) => void;
}>) {
	return (
		<div className="space-y-1">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			{multiline ? (
				<Textarea
					className={`min-h-[60px] text-sm ${mono ? "font-mono" : ""}`}
					value={value}
					autoComplete="off"
					onChange={e => onChange(e.target.value)}
				/>
			) : (
				<Input
					className={`text-sm ${mono ? "font-mono" : ""}`}
					value={value}
					autoComplete="off"
					onChange={e => onChange(e.target.value)}
				/>
			)}
		</div>
	);
}

function StatBox({ label, value, textValue }: Readonly<{ label: string; value?: number; textValue?: string }>) {
	return (
		<div className="rounded-lg border border-border/70 bg-background p-3 flex flex-col justify-between gap-2">
			<p className="text-xs font-semibold text-muted-foreground">{label}</p>
			{textValue !== undefined ? (
				<p
					className="mt-0.5 text-xl text-primary font-bold no-scrollbar overflow-x-scroll whitespace-nowrap"
					title={textValue}>
					{textValue}
				</p>
			) : (
				<p className="text-2xl font-bold tabular-nums">{value}</p>
			)}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*  Legal Documents Editor                                                    */
/* -------------------------------------------------------------------------- */

function LegalDocumentsEditor({
	documents,
	onChange
}: Readonly<{
	documents: LegalDocument[];
	onChange: (documents: LegalDocument[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const [expandedDocIdx, setExpandedDocIdx] = useState<string>(documents.length > 0 ? "0" : "");

	function updateDocument(index: number, updater: (doc: LegalDocument) => LegalDocument) {
		const next = documents.map((doc, i) => (i === index ? updater(doc) : doc));
		onChange(next);
	}

	function addDocument() {
		const doc = makeDefaultLegalDocument();
		onChange([...documents, doc]);
		setExpandedDocIdx(String(documents.length));
	}

	function removeDocument(index: number) {
		const next = documents.filter((_, i) => i !== index);
		onChange(next);
		setExpandedDocIdx(next.length > 0 ? "0" : "");
	}

	function addSection(docIndex: number) {
		updateDocument(docIndex, doc => ({
			...doc,
			sections: [...doc.sections, makeDefaultLegalSection()]
		}));
	}

	function removeSection(docIndex: number, sectionIndex: number) {
		updateDocument(docIndex, doc => ({
			...doc,
			sections: doc.sections.filter((_, i) => i !== sectionIndex)
		}));
	}

	function updateSection(docIndex: number, sectionIndex: number, updater: (section: LegalSection) => LegalSection) {
		updateDocument(docIndex, doc => ({
			...doc,
			sections: doc.sections.map((s, i) => (i === sectionIndex ? updater(s) : s))
		}));
	}

	function addBodyParagraph(docIndex: number, sectionIndex: number) {
		updateSection(docIndex, sectionIndex, s => ({ ...s, body: [...s.body, ""] }));
	}

	function removeBodyParagraph(docIndex: number, sectionIndex: number, paraIndex: number) {
		updateSection(docIndex, sectionIndex, s => ({
			...s,
			body: s.body.filter((_, i) => i !== paraIndex)
		}));
	}

	function updateBodyParagraph(docIndex: number, sectionIndex: number, paraIndex: number, value: string) {
		updateSection(docIndex, sectionIndex, s => {
			const next = [...s.body];
			next[paraIndex] = value;
			return { ...s, body: next };
		});
	}

	function addBullet(docIndex: number, sectionIndex: number) {
		updateSection(docIndex, sectionIndex, s => ({ ...s, bullets: [...s.bullets, ""] }));
	}

	function removeBullet(docIndex: number, sectionIndex: number, bulletIndex: number) {
		updateSection(docIndex, sectionIndex, s => ({
			...s,
			bullets: s.bullets.filter((_, i) => i !== bulletIndex)
		}));
	}

	function updateBullet(docIndex: number, sectionIndex: number, bulletIndex: number, value: string) {
		updateSection(docIndex, sectionIndex, s => {
			const next = [...s.bullets];
			next[bulletIndex] = value;
			return { ...s, bullets: next };
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-sm font-semibold">{t("legalDocuments")}</h3>
					<p className="text-xs text-muted-foreground mt-0.5">{t("legalDocumentsDescription")}</p>
				</div>
				<Button variant="outline" size="sm" onClick={addDocument}>
					<Plus className="mr-1.5 h-3.5 w-3.5" />
					{t("addLegalDocument")}
				</Button>
			</div>

			{documents.length === 0 && (
				<Card>
					<CardContent className="py-8 text-center text-sm text-muted-foreground">
						{t("noLegalDocuments")}
					</CardContent>
				</Card>
			)}

			<Accordion type="single" collapsible value={expandedDocIdx} onValueChange={v => setExpandedDocIdx(v)}>
				{documents.map((doc, docIndex) => (
					<AccordionItem
						key={docIndex}
						value={String(docIndex)}
						className="border rounded-lg mb-3 px-0 overflow-hidden">
						<div className="flex items-center gap-2 px-4">
							<AccordionTrigger className="flex-1 py-3 hover:no-underline">
								<div className="flex items-center gap-3 text-left min-w-0">
									<Badge variant="outline" className="shrink-0 font-mono text-xs">
										{doc.key}
									</Badge>
									<span className="truncate text-sm font-medium">{doc.title}</span>
									<span className="text-xs text-muted-foreground shrink-0">
										{doc.sections.length} {t("legalSectionsCount")}
									</span>
								</div>
							</AccordionTrigger>
							<Button
								variant="ghost"
								size="icon"
								className="shrink-0 text-destructive hover:text-destructive h-8 w-8"
								onClick={e => {
									e.stopPropagation();
									removeDocument(docIndex);
								}}>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>

						<AccordionContent className="px-4 pb-4 pt-0">
							<div className="space-y-4">
								{/* Document metadata */}
								<Card className="bg-muted/30">
									<CardContent className="pt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
										<EditableField
											label={t("legalDocKey")}
											value={doc.key}
											mono
											onChange={v => updateDocument(docIndex, d => ({ ...d, key: v }))}
										/>
										<EditableField
											label={t("legalDocShortTitle")}
											value={doc.short_title}
											onChange={v => updateDocument(docIndex, d => ({ ...d, short_title: v }))}
										/>
										<EditableField
											label={t("legalDocTitle")}
											value={doc.title}
											onChange={v => updateDocument(docIndex, d => ({ ...d, title: v }))}
										/>
										<EditableField
											label={t("legalDocEyebrow")}
											value={doc.eyebrow}
											onChange={v => updateDocument(docIndex, d => ({ ...d, eyebrow: v }))}
										/>
										<EditableField
											label={t("legalDocLastUpdated")}
											value={doc.last_updated}
											onChange={v => updateDocument(docIndex, d => ({ ...d, last_updated: v }))}
										/>
										<div className="col-span-full sm:col-span-2">
											<EditableField
												label={t("legalDocSummary")}
												value={doc.summary}
												multiline
												onChange={v => updateDocument(docIndex, d => ({ ...d, summary: v }))}
											/>
										</div>
									</CardContent>
								</Card>

								{/* Sections */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											{t("legalSections")} ({doc.sections.length})
										</p>
										<Button variant="outline" size="sm" onClick={() => addSection(docIndex)}>
											<Plus className="mr-1.5 h-3 w-3" />
											{t("addLegalSection")}
										</Button>
									</div>

									{doc.sections.map((section, sectionIndex) => (
										<Card key={sectionIndex} className="border-border/60">
											<CardHeader className="pb-2 pt-3 px-4">
												<div className="flex items-start justify-between gap-2">
													<div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
														<EditableField
															label={t("legalSectionKey")}
															value={section.key}
															mono
															onChange={v =>
																updateSection(docIndex, sectionIndex, s => ({
																	...s,
																	key: v
																}))
															}
														/>
														<EditableField
															label={t("legalSectionTitle")}
															value={section.title}
															onChange={v =>
																updateSection(docIndex, sectionIndex, s => ({
																	...s,
																	title: v
																}))
															}
														/>
													</div>
													<Button
														variant="ghost"
														size="icon"
														className="shrink-0 text-destructive hover:text-destructive h-8 w-8 mt-4"
														onClick={() => removeSection(docIndex, sectionIndex)}>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											</CardHeader>

											<CardContent className="px-4 pb-4 space-y-3">
												{/* Body paragraphs */}
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<p className="text-xs text-muted-foreground">
															{t("legalSectionBody")}
														</p>
														<Button
															variant="ghost"
															size="sm"
															className="h-6 text-xs"
															onClick={() => addBodyParagraph(docIndex, sectionIndex)}>
															<Plus className="mr-1 h-3 w-3" />
															{t("addParagraph")}
														</Button>
													</div>
													{section.body.map((para, paraIndex) => (
														<div key={paraIndex} className="flex gap-2">
															<Textarea
																className="min-h-[64px] text-sm flex-1"
																value={para}
																onChange={e =>
																	updateBodyParagraph(
																		docIndex,
																		sectionIndex,
																		paraIndex,
																		e.target.value
																	)
																}
															/>
															<Button
																variant="ghost"
																size="icon"
																className="shrink-0 text-destructive hover:text-destructive h-8 w-8 mt-1"
																onClick={() =>
																	removeBodyParagraph(
																		docIndex,
																		sectionIndex,
																		paraIndex
																	)
																}>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</div>
													))}
												</div>

												{/* Bullet points */}
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<p className="text-xs text-muted-foreground">
															{t("legalSectionBullets")}
														</p>
														<Button
															variant="ghost"
															size="sm"
															className="h-6 text-xs"
															onClick={() => addBullet(docIndex, sectionIndex)}>
															<Plus className="mr-1 h-3 w-3" />
															{t("addBullet")}
														</Button>
													</div>
													{section.bullets.map((bullet, bulletIndex) => (
														<div key={bulletIndex} className="flex gap-2">
															<Textarea
																className="min-h-[48px] text-sm flex-1"
																value={bullet}
																onChange={e =>
																	updateBullet(
																		docIndex,
																		sectionIndex,
																		bulletIndex,
																		e.target.value
																	)
																}
															/>
															<Button
																variant="ghost"
																size="icon"
																className="shrink-0 text-destructive hover:text-destructive h-8 w-8 mt-1"
																onClick={() =>
																	removeBullet(docIndex, sectionIndex, bulletIndex)
																}>
																<Trash2 className="h-3.5 w-3.5" />
															</Button>
														</div>
													))}
													{section.bullets.length === 0 && (
														<p className="text-xs text-muted-foreground/60 italic">
															{t("noBullets")}
														</p>
													)}
												</div>
											</CardContent>
										</Card>
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

function bumpVersion(version: string): string {
	const parts = version.split(".");
	const last = Number(parts[parts.length - 1]);
	if (Number.isNaN(last)) {
		return `${version}.1`;
	}
	return [...parts.slice(0, -1), String(last + 1)].join(".");
}
