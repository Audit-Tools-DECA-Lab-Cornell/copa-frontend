"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import {
	CheckIcon,
	ChevronRightIcon,
	ClipboardListIcon,
	DatabaseIcon,
	DownloadIcon,
	FileTextIcon,
	FilterIcon,
	FolderKanban,
	Loader2Icon,
	MapPinIcon,
	Rows3Icon,
	XIcon
} from "lucide-react";
import { useTranslations } from "next-intl";

import type {
	AdminAuditExportRecord,
	AdminAuditRow,
	AdminAuditsQuery,
	AdminExportQuery,
	AdminPlaceExportRecord,
	AdminPlaceRow,
	AdminPlacesQuery,
	AdminProjectExportRecord,
	AdminProjectRow,
	AdminProjectsQuery,
	PaginatedResponse
} from "@/lib/api/playspace";
import { playspaceApi } from "@/lib/api/playspace";
import { AuditsTable, type AuditActivityRow } from "@/components/dashboard/audits-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DataTable } from "@/components/dashboard/data-table";
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header";
import {
	getMultiValueColumnFilter,
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import {
	formatDateTimeLabel,
	formatProjectDateRange,
	formatRequirementStatusLabel,
	formatScorePairLabel,
	getRequirementStatusClassName
} from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExportFormat = "json" | "csv" | "xlsx";
type ExportEntity = "projects" | "places" | "audits" | "reports";

// ── Download Helpers ───────────────────────────────────────────────────────────

function escapeCsvValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function recordsToCsv(records: Record<string, unknown>[]): string {
	if (records.length === 0) return "";
	const headers = Object.keys(records[0]);
	return [headers.join(","), ...records.map(r => headers.map(h => escapeCsvValue(r[h])).join(","))].join("\n");
}

function triggerBlobDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

async function downloadRecords(
	records: Record<string, unknown>[],
	format: ExportFormat,
	filename: string
): Promise<void> {
	if (format === "json") {
		triggerBlobDownload(
			new Blob([JSON.stringify(records, null, 2)], { type: "application/json" }),
			`${filename}.json`
		);
		return;
	}
	if (format === "csv") {
		triggerBlobDownload(
			new Blob(["\uFEFF" + recordsToCsv(records)], { type: "text/csv;charset=utf-8;" }),
			`${filename}.csv`
		);
		return;
	}
	const { utils, writeFile } = await import("xlsx");
	const worksheet = utils.json_to_sheet(records);
	const workbook = utils.book_new();
	utils.book_append_sheet(workbook, worksheet, filename.slice(0, 31));
	writeFile(workbook, `${filename}.xlsx`);
}

// ── Collection namespace bar ───────────────────────────────────────────────────

const ENTITY_LABELS: Record<ExportEntity, string> = {
	projects: "projects",
	places: "places",
	audits: "audits",
	reports: "reports"
};

interface CollectionNamespaceBarProps {
	entity: ExportEntity;
	totalCount: number | undefined;
	selectedCount: number;
	isFetching: boolean;
	onClearSelection: () => void;
}

function CollectionNamespaceBar({
	entity,
	totalCount,
	selectedCount,
	isFetching,
	onClearSelection
}: CollectionNamespaceBarProps) {
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2">
			{/* Namespace path — monospace database path like Atlas */}
			<div className="flex min-w-0 items-center gap-1 font-mono text-[13px]">
				<DatabaseIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				<span className="text-muted-foreground">playspace</span>
				<ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/40" aria-hidden="true" />
				<span className="text-muted-foreground">raw_data</span>
				<ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/40" aria-hidden="true" />
				<span className="font-semibold text-foreground">{ENTITY_LABELS[entity]}</span>
			</div>

			<Separator orientation="vertical" className="h-3.5 shrink-0" />

			{/* Document count */}
			<div className="flex items-center gap-1.5">
				{isFetching ? (
					<Loader2Icon className="size-3 animate-spin text-muted-foreground" aria-hidden="true" />
				) : (
					<Rows3Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				)}
				<span className="font-mono text-[13px] text-muted-foreground">
					{totalCount !== undefined ? (
						<>
							<span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>{" "}
							{totalCount === 1 ? "document" : "documents"}
						</>
					) : (
						"—"
					)}
				</span>
			</div>

			{/* Selected pill — only visible when rows are selected */}
			{selectedCount > 0 && (
				<>
					<Separator orientation="vertical" className="h-3.5 shrink-0" />
					<div className="flex items-center gap-1.5">
						<span
							className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
							style={{
								background: "rgba(0, 168, 90, 0.10)",
								color: "#00a85a",
								border: "1px solid rgba(0, 168, 90, 0.28)"
							}}>
							<CheckIcon className="size-2.5" aria-hidden="true" />
							{selectedCount.toLocaleString()} selected
						</span>
						<button
							type="button"
							onClick={onClearSelection}
							className="inline-flex items-center gap-0.5 rounded text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus:outline-none"
							aria-label="Clear selection">
							<XIcon className="size-2.5" aria-hidden="true" />
							clear
						</button>
					</div>
				</>
			)}
		</div>
	);
}

// ── Selection Status Bar (floats above table when rows are selected) ───────────

interface SelectionBarProps {
	selectedCount: number;
	isExporting: boolean;
	onExportSelected: (format: ExportFormat) => void;
	onClearSelection: () => void;
}

function SelectionBar({ selectedCount, isExporting, onExportSelected, onClearSelection }: SelectionBarProps) {
	if (selectedCount === 0) return null;
	return (
		<div
			className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm"
			style={{
				background: "rgba(0, 168, 90, 0.07)",
				borderColor: "rgba(0, 168, 90, 0.25)"
			}}>
			<div className="flex items-center gap-2">
				<span
					className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
					style={{ background: "#00a85a", color: "#fff" }}
					aria-hidden="true">
					{selectedCount > 99 ? "99+" : selectedCount}
				</span>
				<span className="font-medium" style={{ color: "#007a40" }}>
					{selectedCount === 1
						? "1 document selected on this page"
						: `${selectedCount.toLocaleString()} documents selected on this page`}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							size="sm"
							disabled={isExporting}
							className="h-8 gap-1.5 text-white"
							style={{ background: "#00a85a" }}
							onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#008f4c")}
							onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#00a85a")}>
							{isExporting ? (
								<Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
							) : (
								<DownloadIcon className="size-3.5" aria-hidden="true" />
							)}
							Export selected
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-44">
						<DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
							{selectedCount} document{selectedCount !== 1 ? "s" : ""}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => onExportSelected("json")}>JSON (.json)</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => onExportSelected("csv")}>CSV (.csv)</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onExportSelected("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 gap-1.5 text-muted-foreground"
					onClick={onClearSelection}>
					<XIcon className="size-3.5" aria-hidden="true" />
					Deselect all
				</Button>
			</div>
		</div>
	);
}

// ── Filter Popover (reused across all tabs) ────────────────────────────────────

interface FilterPopoverProps {
	title: string;
	options: Array<{ label: string; value: string }>;
	selectedValues: string[];
	onChange: (values: string[]) => void;
}

function FilterPopover({ title, options, selectedValues, onChange }: FilterPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-9 gap-2 px-3.5">
					<FilterIcon className="size-4" aria-hidden="true" />
					{title}
					{selectedValues.length > 0 && (
						<Badge variant="secondary" className="rounded-sm px-1.5 font-mono text-xs">
							{selectedValues.length}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-3" align="start">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="text-sm font-medium">{title}</h4>
						{selectedValues.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="xs"
								className="h-6 px-2 text-xs"
								onClick={() => onChange([])}>
								Clear
							</Button>
						)}
					</div>
					<Separator />
					<div className="max-h-52 space-y-2 overflow-y-auto">
						{options.map(option => (
							<div key={option.value} className="flex items-center gap-2">
								<Checkbox
									id={`fp-${option.value}`}
									checked={selectedValues.includes(option.value)}
									onCheckedChange={checked => {
										onChange(
											checked
												? [...selectedValues, option.value]
												: selectedValues.filter(v => v !== option.value)
										);
									}}
								/>
								<Label htmlFor={`fp-${option.value}`} className="cursor-pointer text-sm font-normal">
									{option.label}
								</Label>
							</div>
						))}
						{options.length === 0 && <p className="text-sm text-muted-foreground">No options available</p>}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

// ── Flat export record mappers ─────────────────────────────────────────────────

function projectExportRecord(r: AdminProjectExportRecord): Record<string, unknown> {
	return {
		project_id: r.project_id,
		account_name: r.account_name,
		name: r.name,
		overview: r.overview ?? "",
		start_date: r.start_date ?? "",
		end_date: r.end_date ?? "",
		place_types: r.place_types.join("; "),
		places_count: r.places_count,
		auditors_count: r.auditors_count,
		audits_completed: r.audits_completed,
		average_pv_score: r.average_pv_score ?? "",
		average_u_score: r.average_u_score ?? ""
	};
}

/**
 * Maps a preview-list row (AdminProjectRow) to the same column shape as
 * projectExportRecord. overview and place_types are not carried by the
 * preview endpoint and are left blank; average scores are read from
 * average_scores { pv, u }.
 */
function projectRowExportRecord(r: AdminProjectRow): Record<string, unknown> {
	return {
		project_id: r.project_id,
		account_name: r.account_name,
		name: r.name,
		overview: "",
		start_date: r.start_date ?? "",
		end_date: r.end_date ?? "",
		place_types: "",
		places_count: r.places_count,
		auditors_count: r.auditors_count,
		audits_completed: r.audits_completed,
		average_pv_score: r.average_scores?.pv ?? "",
		average_u_score: r.average_scores?.u ?? ""
	};
}

function placeExportRecord(r: AdminPlaceExportRecord): Record<string, unknown> {
	return {
		place_id: r.place_id,
		account_name: r.account_name,
		project_name: r.project_name,
		name: r.name,
		address: r.address ?? "",
		city: r.city ?? "",
		province: r.province ?? "",
		country: r.country ?? "",
		postal_code: r.postal_code ?? "",
		place_type: r.place_type ?? "",
		lat: r.lat ?? "",
		lng: r.lng ?? "",
		place_audit_status: r.place_audit_status,
		place_survey_status: r.place_survey_status,
		place_audit_count: r.place_audit_count,
		place_survey_count: r.place_survey_count,
		audits_completed: r.audits_completed,
		audit_mean_pv: r.audit_mean_pv ?? "",
		audit_mean_u: r.audit_mean_u ?? "",
		survey_mean_pv: r.survey_mean_pv ?? "",
		survey_mean_u: r.survey_mean_u ?? "",
		last_audited_at: r.last_audited_at ?? ""
	};
}

/**
 * Maps a preview-list row (AdminPlaceRow) to the same column shape as
 * placeExportRecord. postal_code, lat, and lng are not carried by the
 * preview endpoint and are left blank; per-mode mean scores are read from
 * audit_mean_scores and survey_mean_scores { pv, u }.
 */
function placeRowExportRecord(r: AdminPlaceRow): Record<string, unknown> {
	return {
		place_id: r.place_id,
		account_name: r.account_name,
		project_name: r.project_name,
		name: r.name,
		address: r.address ?? "",
		city: r.city ?? "",
		province: r.province ?? "",
		country: r.country ?? "",
		postal_code: "",
		place_type: r.place_type ?? "",
		lat: "",
		lng: "",
		place_audit_status: r.place_audit_status,
		place_survey_status: r.place_survey_status,
		place_audit_count: r.place_audit_count,
		place_survey_count: r.place_survey_count,
		audits_completed: r.audits_completed,
		audit_mean_pv: r.audit_mean_scores?.pv ?? "",
		audit_mean_u: r.audit_mean_scores?.u ?? "",
		survey_mean_pv: r.survey_mean_scores?.pv ?? "",
		survey_mean_u: r.survey_mean_scores?.u ?? "",
		last_audited_at: r.last_audited_at ?? ""
	};
}

function auditExportRecord(r: AdminAuditExportRecord): Record<string, unknown> {
	return {
		audit_id: r.audit_id,
		audit_code: r.audit_code,
		status: r.status,
		execution_mode: r.execution_mode ?? "",
		account_name: r.account_name,
		project_name: r.project_name,
		place_name: r.place_name,
		auditor_code: r.auditor_code,
		started_at: r.started_at,
		submitted_at: r.submitted_at ?? "",
		summary_score: r.summary_score ?? "",
		audit_pv_score: r.audit_pv_score ?? "",
		audit_u_score: r.audit_u_score ?? "",
		survey_pv_score: r.survey_pv_score ?? "",
		survey_u_score: r.survey_u_score ?? ""
	};
}

/**
 * Maps a preview-list row (AdminAuditRow) to the same column shape as
 * auditExportRecord. Used for the "export selected rows" path, where only
 * the currently-visible page data is available rather than the dedicated
 * export endpoint.
 *
 * AdminAuditRow carries a single score_pair { pv, u } instead of four flat
 * per-mode score fields. We populate the mode-specific columns only when
 * execution_mode is unambiguously single-mode ("audit" or "survey"). For
 * "both"/null the combined score lives in summary_score and the four
 * per-mode columns are left blank — we cannot reconstruct the split from
 * a single score_pair.
 */
function auditRowExportRecord(r: AdminAuditRow): Record<string, unknown> {
	const pv = r.score_pair?.pv ?? null;
	const u = r.score_pair?.u ?? null;
	const mode = r.execution_mode;
	return {
		audit_id: r.audit_id,
		audit_code: r.audit_code,
		status: r.status,
		execution_mode: mode ?? "",
		account_name: r.account_name,
		project_name: r.project_name,
		place_name: r.place_name,
		auditor_code: r.auditor_code,
		started_at: r.started_at,
		submitted_at: r.submitted_at ?? "",
		summary_score: r.summary_score ?? "",
		audit_pv_score: mode === "audit" ? (pv ?? "") : "",
		audit_u_score: mode === "audit" ? (u ?? "") : "",
		survey_pv_score: mode === "survey" ? (pv ?? "") : "",
		survey_u_score: mode === "survey" ? (u ?? "") : ""
	};
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminRawDataPage() {
	const formatT = useTranslations("common.format");
	const [activeEntity, setActiveEntity] = React.useState<ExportEntity>("projects");
	const [isExporting, setIsExporting] = React.useState(false);

	// ── Row selection state ───────────────────────────────────────────────────
	const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string>>(new Set());

	const toggleRowSelection = React.useCallback((id: string) => {
		setSelectedRowIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const togglePageSelection = React.useCallback((ids: string[]) => {
		setSelectedRowIds(prev => {
			const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
			const next = new Set(prev);
			if (allSelected) {
				ids.forEach(id => next.delete(id));
			} else {
				ids.forEach(id => next.add(id));
			}
			return next;
		});
	}, []);

	const clearSelection = React.useCallback(() => setSelectedRowIds(new Set()), []);

	// ── Shared dropdown filter state (reset on tab change) ───────────────────
	const [accountIds, setAccountIds] = React.useState<string[]>([]);
	const [projectIds, setProjectIds] = React.useState<string[]>([]);
	// Places-only axis filters
	const [auditStatuses, setAuditStatuses] = React.useState<string[]>([]);
	const [surveyStatuses, setSurveyStatuses] = React.useState<string[]>([]);

	// ── Per-tab table state (reset on tab change) ────────────────────────────
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

	const handleEntityChange = React.useCallback((entity: string) => {
		setActiveEntity(entity as ExportEntity);
		setSelectedRowIds(new Set());
		setAccountIds([]);
		setProjectIds([]);
		setAuditStatuses([]);
		setSurveyStatuses([]);
		setSorting([]);
		setColumnFilters([]);
		setPagination({ pageIndex: 0, pageSize: 10 });
	}, []);

	// Reset pagination when filters/sort change
	const sortParam = toBackendSortParam(sorting);
	const accountIdsKey = accountIds.join("|");
	const projectIdsKey = projectIds.join("|");
	const auditStatusesKey = auditStatuses.join("|");
	const surveyStatusesKey = surveyStatuses.join("|");

	// Search comes from the table's built-in search box
	const searchColumnId = activeEntity === "audits" || activeEntity === "reports" ? "audit_code" : "name";
	const searchValue = getTextColumnFilterValue(columnFilters, searchColumnId);

	// For audits tab: status is managed by AuditsTable's built-in filter dropdown
	const auditStatusFilter = getMultiValueColumnFilter(columnFilters, "status").filter(
		(v): v is "IN_PROGRESS" | "PAUSED" | "SUBMITTED" => v === "IN_PROGRESS" || v === "PAUSED" || v === "SUBMITTED"
	);

	const [prevDeps, setPrevDeps] = React.useState({
		searchValue,
		sortParam,
		accountIdsKey,
		projectIdsKey,
		auditStatusesKey,
		surveyStatusesKey
	});
	if (
		searchValue !== prevDeps.searchValue ||
		sortParam !== prevDeps.sortParam ||
		accountIdsKey !== prevDeps.accountIdsKey ||
		projectIdsKey !== prevDeps.projectIdsKey ||
		auditStatusesKey !== prevDeps.auditStatusesKey ||
		surveyStatusesKey !== prevDeps.surveyStatusesKey
	) {
		setPrevDeps({ searchValue, sortParam, accountIdsKey, projectIdsKey, auditStatusesKey, surveyStatusesKey });
		setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
	}

	// ── Filter option queries ─────────────────────────────────────────────────
	const accountsQuery = useQuery({
		queryKey: ["playspace", "admin", "raw-data", "accounts-for-filter"],
		queryFn: () => playspaceApi.admin.accounts({ pageSize: 100, accountTypes: ["MANAGER"] }),
		staleTime: 5 * 60_000
	});
	const accountOptions = React.useMemo(
		() => (accountsQuery.data?.items ?? []).map(a => ({ label: a.name, value: a.account_id })),
		[accountsQuery.data]
	);

	const projectsListQuery = useQuery({
		queryKey: ["playspace", "admin", "raw-data", "projects-for-filter"],
		queryFn: () => playspaceApi.admin.projects({ pageSize: 100 }),
		staleTime: 5 * 60_000
	});
	const projectOptions = React.useMemo(
		() =>
			(projectsListQuery.data?.items ?? []).map(p => ({
				label: `${p.account_name} · ${p.name}`,
				value: p.project_id
			})),
		[projectsListQuery.data]
	);

	const axisStatusOptions = React.useMemo(
		() =>
			(["not_started", "in_progress", "submitted"] as const).map(s => ({
				label: formatRequirementStatusLabel(s, formatT),
				value: s
			})),
		[formatT]
	);

	// ── Preview queries (each enabled only for its active tab) ────────────────
	type PreviewResult =
		| PaginatedResponse<AdminProjectRow>
		| PaginatedResponse<AdminPlaceRow>
		| PaginatedResponse<AdminAuditRow>;

	const previewQuery = useQuery<PreviewResult>({
		queryKey: [
			"playspace",
			"admin",
			"raw-data-preview",
			activeEntity,
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			accountIds,
			projectIds,
			auditStatuses,
			surveyStatuses,
			auditStatusFilter
		],
		queryFn: async (): Promise<PreviewResult> => {
			const base = {
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue || undefined,
				sort: sortParam,
				accountIds: accountIds.length > 0 ? accountIds : undefined
			};
			switch (activeEntity) {
				case "projects":
					return playspaceApi.admin.projects(base satisfies AdminProjectsQuery);
				case "places":
					return playspaceApi.admin.places({
						...base,
						projectIds: projectIds.length > 0 ? projectIds : undefined,
						auditStatuses: auditStatuses.length > 0 ? auditStatuses : undefined,
						surveyStatuses: surveyStatuses.length > 0 ? surveyStatuses : undefined
					} satisfies AdminPlacesQuery);
				case "audits":
					return playspaceApi.admin.audits({
						...base,
						projectIds: projectIds.length > 0 ? projectIds : undefined,
						statuses: auditStatusFilter.length > 0 ? auditStatusFilter : undefined
					} satisfies AdminAuditsQuery);
				case "reports":
					return playspaceApi.admin.audits({
						...base,
						projectIds: projectIds.length > 0 ? projectIds : undefined,
						statuses: ["SUBMITTED"]
					} satisfies AdminAuditsQuery);
			}
		},
		placeholderData: preservePreviousData
	});

	// Map AdminAuditRow → AuditActivityRow for the audits/reports tabs
	const auditRows = React.useMemo((): AuditActivityRow[] => {
		if (activeEntity !== "audits" && activeEntity !== "reports") return [];
		return ((previewQuery.data?.items as AdminAuditRow[] | undefined) ?? []).map(audit => ({
			id: audit.audit_id,
			auditCode: audit.audit_code,
			status: audit.status,
			auditorCode: audit.auditor_code,
			accountName: audit.account_name,
			projectName: audit.project_name,
			projectId: audit.project_id,
			placeName: audit.place_name,
			placeId: audit.place_id,
			startedAt: audit.started_at,
			submittedAt: audit.submitted_at,
			score: audit.summary_score,
			scorePair: audit.score_pair
		}));
	}, [activeEntity, previewQuery.data]);

	// ── Export ────────────────────────────────────────────────────────────────
	const exportQuery = React.useMemo<AdminExportQuery>(
		() => ({
			search: searchValue.trim() || undefined,
			accountIds: accountIds.length > 0 ? accountIds : undefined,
			projectIds: projectIds.length > 0 ? projectIds : undefined,
			statuses: auditStatusFilter.length > 0 ? auditStatusFilter : undefined,
			auditStatuses: auditStatuses.length > 0 ? auditStatuses : undefined,
			surveyStatuses: surveyStatuses.length > 0 ? surveyStatuses : undefined
		}),
		[searchValue, accountIds, projectIds, auditStatusFilter, auditStatuses, surveyStatuses]
	);

	/** Export all matching documents (full dataset, server-fetched) */
	const handleExportAll = React.useCallback(
		async (format: ExportFormat) => {
			setIsExporting(true);
			try {
				const timestamp = new Date().toISOString().slice(0, 10);
				let records: Record<string, unknown>[];
				let filename: string;
				switch (activeEntity) {
					case "projects": {
						const result = await playspaceApi.admin.exportProjects(exportQuery);
						records = result.records.map(projectExportRecord);
						filename = `playspace-projects-${timestamp}`;
						break;
					}
					case "places": {
						const result = await playspaceApi.admin.exportPlaces(exportQuery);
						records = result.records.map(placeExportRecord);
						filename = `playspace-places-${timestamp}`;
						break;
					}
					case "audits": {
						const result = await playspaceApi.admin.exportAudits(exportQuery);
						records = result.records.map(auditExportRecord);
						filename = `playspace-audits-${timestamp}`;
						break;
					}
					case "reports": {
						const result = await playspaceApi.admin.exportReports(exportQuery);
						records = result.records.map(auditExportRecord);
						filename = `playspace-reports-${timestamp}`;
						break;
					}
				}
				await downloadRecords(records, format, filename);
			} finally {
				setIsExporting(false);
			}
		},
		[activeEntity, exportQuery]
	);

	/** Export only the currently-selected rows (from the visible page) */
	const handleExportSelected = React.useCallback(
		async (format: ExportFormat) => {
			setIsExporting(true);
			try {
				const timestamp = new Date().toISOString().slice(0, 10);
				let records: Record<string, unknown>[];
				let filename: string;
				switch (activeEntity) {
					case "projects": {
						const items = (previewQuery.data?.items as AdminProjectRow[] | undefined) ?? [];
						records = items.filter(r => selectedRowIds.has(r.project_id)).map(projectRowExportRecord);
						filename = `playspace-projects-selected-${timestamp}`;
						break;
					}
					case "places": {
						const items = (previewQuery.data?.items as AdminPlaceRow[] | undefined) ?? [];
						records = items.filter(r => selectedRowIds.has(r.place_id)).map(placeRowExportRecord);
						filename = `playspace-places-selected-${timestamp}`;
						break;
					}
					case "audits": {
						const items = (previewQuery.data?.items as AdminAuditRow[] | undefined) ?? [];
						records = items.filter(r => selectedRowIds.has(r.audit_id)).map(auditRowExportRecord);
						filename = `playspace-audits-selected-${timestamp}`;
						break;
					}
					case "reports": {
						const items = (previewQuery.data?.items as AdminAuditRow[] | undefined) ?? [];
						records = items.filter(r => selectedRowIds.has(r.audit_id)).map(auditRowExportRecord);
						filename = `playspace-reports-selected-${timestamp}`;
						break;
					}
				}
				await downloadRecords(records, format, filename);
			} finally {
				setIsExporting(false);
			}
		},
		[activeEntity, previewQuery.data, selectedRowIds]
	);

	// ── Column definitions ────────────────────────────────────────────────────

	// Current-page items for select-all header logic
	const projectColumns = React.useMemo<ColumnDef<AdminProjectRow>[]>(() => {
		const projectPageItems = (previewQuery.data?.items as AdminProjectRow[] | undefined) ?? [];
		return [
			// ── Selection column ──────────────────────────────────────────────
			{
				id: "select",
				size: 40,
				enableSorting: false,
				enableHiding: false,
				header: () => {
					const ids = projectPageItems.map(r => r.project_id);
					const allSelected = ids.length > 0 && ids.every(id => selectedRowIds.has(id));
					const someSelected = ids.some(id => selectedRowIds.has(id));
					return (
						<Checkbox
							checked={allSelected}
							data-state={someSelected && !allSelected ? "indeterminate" : undefined}
							onCheckedChange={() => togglePageSelection(ids)}
							aria-label="Select all on this page"
							className="translate-y-px"
						/>
					);
				},
				cell: ({ row }) => {
					const id = row.original.project_id;
					return (
						<Checkbox
							checked={selectedRowIds.has(id)}
							onCheckedChange={() => toggleRowSelection(id)}
							aria-label={`Select project ${row.original.name}`}
							className="translate-y-px"
						/>
					);
				}
			},
			// ── Data columns ──────────────────────────────────────────────────
			{
				id: "name",
				accessorFn: row => `${row.name} ${row.account_name}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
				cell: ({ row }) => (
					<div className="min-w-[240px] space-y-1">
						<p className="font-medium text-foreground">{row.original.name}</p>
						<p className="text-sm text-muted-foreground">{row.original.account_name}</p>
					</div>
				),
				enableHiding: false
			},
			{
				id: "date_range",
				accessorFn: row => `${row.start_date ?? ""}|${row.end_date ?? ""}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title="Date Range" align="end" />,
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatProjectDateRange(row.original, formatT)}
					</span>
				),
				sortingFn: (l, r) => {
					const lv = l.original.start_date ?? l.original.end_date ?? "";
					const rv = r.original.start_date ?? r.original.end_date ?? "";
					return lv.localeCompare(rv);
				}
			},
			{
				accessorKey: "places_count",
				header: ({ column }) => <DataTableColumnHeader column={column} title="Places" align="end" />,
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.places_count}</span>
				)
			},
			{
				accessorKey: "audits_completed",
				header: ({ column }) => <DataTableColumnHeader column={column} title="Completed" align="end" />,
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.audits_completed}</span>
				)
			},
			{
				accessorKey: "average_scores",
				header: ({ column }) => <DataTableColumnHeader column={column} title="Mean Score (PV/U)" align="end" />,
				cell: ({ row }) => (
					<span className="block text-right font-mono text-foreground tabular-nums">
						{formatScorePairLabel(row.original.average_scores, formatT)}
					</span>
				)
			}
		];
	}, [formatT, selectedRowIds, previewQuery.data, toggleRowSelection, togglePageSelection]);

	const placeColumns = React.useMemo<ColumnDef<AdminPlaceRow>[]>(() => {
		const placePageItems = (previewQuery.data?.items as AdminPlaceRow[] | undefined) ?? [];
		return [
			// ── Selection column ──────────────────────────────────────────────
			{
				id: "select",
				size: 40,
				enableSorting: false,
				enableHiding: false,
				header: () => {
					const ids = placePageItems.map(r => r.place_id);
					const allSelected = ids.length > 0 && ids.every(id => selectedRowIds.has(id));
					const someSelected = ids.some(id => selectedRowIds.has(id));
					return (
						<Checkbox
							checked={allSelected}
							data-state={someSelected && !allSelected ? "indeterminate" : undefined}
							onCheckedChange={() => togglePageSelection(ids)}
							aria-label="Select all on this page"
							className="translate-y-px"
						/>
					);
				},
				cell: ({ row }) => {
					const id = row.original.place_id;
					return (
						<Checkbox
							checked={selectedRowIds.has(id)}
							onCheckedChange={() => toggleRowSelection(id)}
							aria-label={`Select place ${row.original.name}`}
							className="translate-y-px"
						/>
					);
				}
			},
			// ── Data columns ──────────────────────────────────────────────────
			{
				id: "name",
				accessorFn: row =>
					`${row.name} ${row.address ?? ""} ${row.project_name} ${row.account_name} ${[row.city, row.province, row.country].filter(Boolean).join(" ")}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title="Place" />,
				cell: ({ row }) => (
					<div className="min-w-[260px] space-y-1">
						<p className="font-medium text-foreground">{row.original.name}</p>
						{row.original.address ? (
							<p className="text-sm text-muted-foreground">{row.original.address}</p>
						) : null}
						<p className="text-sm text-muted-foreground">
							{row.original.account_name} · {row.original.project_name}
						</p>
						<p className="text-sm text-muted-foreground">
							{[row.original.city, row.original.province, row.original.country]
								.filter((p): p is string => Boolean(p))
								.join(", ") || formatT("locationPending")}
						</p>
					</div>
				),
				enableHiding: false
			},
			{
				id: "place_axes",
				accessorFn: row => [row.place_audit_status, row.place_survey_status],
				header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
				cell: ({ row }) => (
					<div className="flex min-w-[180px] flex-wrap gap-1.5">
						<Badge
							variant="outline"
							className={cn(
								getRequirementStatusClassName(row.original.place_audit_status),
								"font-medium"
							)}>
							{`A ${formatRequirementStatusLabel(row.original.place_audit_status, formatT)}`}
						</Badge>
						<Badge
							variant="outline"
							className={cn(
								getRequirementStatusClassName(row.original.place_survey_status),
								"font-medium"
							)}>
							{`S ${formatRequirementStatusLabel(row.original.place_survey_status, formatT)}`}
						</Badge>
					</div>
				)
			},
			{
				accessorKey: "audits_completed",
				header: ({ column }) => <DataTableColumnHeader column={column} title="Completed" align="end" />,
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.audits_completed}</span>
				)
			},
			{
				accessorKey: "overall_scores",
				header: ({ column }) => <DataTableColumnHeader column={column} title="Mean Score (PV/U)" align="end" />,
				cell: ({ row }) => (
					<span className="block text-right font-mono text-foreground tabular-nums">
						{formatScorePairLabel(row.original.overall_scores, formatT)}
					</span>
				)
			},
			{
				accessorKey: "last_audited_at",
				header: ({ column }) => <DataTableColumnHeader column={column} title="Last Audited" align="end" />,
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.last_audited_at, formatT)}
					</span>
				)
			}
		];
	}, [formatT, selectedRowIds, previewQuery.data, toggleRowSelection, togglePageSelection]);

	// ── Shared table props ────────────────────────────────────────────────────

	const totalCount = previewQuery.data?.total_count;

	const sharedTableProps = {
		isFetching: previewQuery.isFetching,
		pageSize: pagination.pageSize,
		sortingState: sorting,
		onSortingStateChange: setSorting,
		columnFiltersState: columnFilters,
		onColumnFiltersStateChange: setColumnFilters,
		paginationState: pagination,
		onPaginationStateChange: setPagination,
		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,
		rowCount: totalCount,
		pageCount: previewQuery.data?.total_pages
	} as const;

	// Description with record count
	function makeDescription(entity: string): string {
		if (totalCount === undefined) return `Filter and download ${entity}.`;
		const cap = totalCount > 10_000 ? " — export capped at 10 000 rows" : "";
		return `${totalCount.toLocaleString()} record${totalCount === 1 ? "" : "s"} match filters${cap}. Use Download for the full dataset.`;
	}

	// ── Toolbar extras ────────────────────────────────────────────────────────

	const hasDropdownFilters = accountIds.length + projectIds.length + auditStatuses.length + surveyStatuses.length > 0;

	const accountFilter = (
		<FilterPopover title="Manager" options={accountOptions} selectedValues={accountIds} onChange={setAccountIds} />
	);
	const projectFilter = (
		<FilterPopover title="Project" options={projectOptions} selectedValues={projectIds} onChange={setProjectIds} />
	);
	const clearButton = hasDropdownFilters ? (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="gap-1.5"
			onClick={() => {
				setAccountIds([]);
				setProjectIds([]);
				setAuditStatuses([]);
				setSurveyStatuses([]);
			}}>
			<XIcon className="size-3.5" />
			Clear
		</Button>
	) : null;

	const selectedCount = selectedRowIds.size;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow="Admin"
				title="Raw Data Export"
				description="Filter and download Playspace data across projects, places, audits, and reports. Auditor identities are limited to their auditor codes."
				breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Raw Data" }]}
				actions={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="default" className="gap-2" disabled={isExporting}>
								{isExporting ? (
									<Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<DownloadIcon className="size-4" aria-hidden="true" />
								)}
								{isExporting ? "Exporting…" : "Export"}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-48">
							{/* Export all (filtered) */}
							<DropdownMenuLabel className="font-normal text-muted-foreground">
								<span className="font-mono text-xs">
									{totalCount !== undefined
										? `${totalCount.toLocaleString()} documents`
										: "All documents"}
								</span>
							</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => void handleExportAll("json")}>
								JSON (.json)
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => void handleExportAll("csv")}>CSV (.csv)</DropdownMenuItem>
							<DropdownMenuItem onClick={() => void handleExportAll("xlsx")}>
								Excel (.xlsx)
							</DropdownMenuItem>

							{/* Export selected — only shown when rows are checked */}
							{selectedCount > 0 && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuLabel className="font-normal text-muted-foreground">
										<span className="font-mono text-xs">{selectedCount} selected</span>
									</DropdownMenuLabel>
									<DropdownMenuItem onClick={() => void handleExportSelected("json")}>
										Selected as JSON
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => void handleExportSelected("csv")}>
										Selected as CSV
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => void handleExportSelected("xlsx")}>
										Selected as Excel
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				}
			/>

			<Tabs value={activeEntity} onValueChange={handleEntityChange}>
				<TabsList>
					<TabsTrigger value="projects" className="gap-2">
						<FolderKanban className="size-4" aria-hidden="true" />
						Projects
					</TabsTrigger>
					<TabsTrigger value="places" className="gap-2">
						<MapPinIcon className="size-4" aria-hidden="true" />
						Places
					</TabsTrigger>
					<TabsTrigger value="audits" className="gap-2">
						<ClipboardListIcon className="size-4" aria-hidden="true" />
						Audits
					</TabsTrigger>
					<TabsTrigger value="reports" className="gap-2">
						<FileTextIcon className="size-4" aria-hidden="true" />
						Reports
					</TabsTrigger>
				</TabsList>

				{/* Projects */}
				<TabsContent value="projects" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entity="projects"
						totalCount={totalCount}
						selectedCount={selectedCount}
						isFetching={previewQuery.isFetching}
						onClearSelection={clearSelection}
					/>
					<SelectionBar
						selectedCount={selectedCount}
						isExporting={isExporting}
						onExportSelected={handleExportSelected}
						onClearSelection={clearSelection}
					/>
					<DataTable
						title="Projects"
						description={makeDescription("projects")}
						columns={projectColumns}
						data={(previewQuery.data?.items as AdminProjectRow[] | undefined) ?? []}
						searchColumnId="name"
						searchPlaceholder="Search by name or account…"
						toolbarExtra={
							<>
								{accountFilter}
								{clearButton}
							</>
						}
						emptyMessage="No projects match the current filters."
						{...sharedTableProps}
					/>
				</TabsContent>

				{/* Places */}
				<TabsContent value="places" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entity="places"
						totalCount={totalCount}
						selectedCount={selectedCount}
						isFetching={previewQuery.isFetching}
						onClearSelection={clearSelection}
					/>
					<SelectionBar
						selectedCount={selectedCount}
						isExporting={isExporting}
						onExportSelected={handleExportSelected}
						onClearSelection={clearSelection}
					/>
					<DataTable
						title="Places"
						description={makeDescription("places")}
						columns={placeColumns}
						data={(previewQuery.data?.items as AdminPlaceRow[] | undefined) ?? []}
						searchColumnId="name"
						searchPlaceholder="Search by name, address, or project…"
						toolbarExtra={
							<>
								{accountFilter}
								{projectFilter}
								<FilterPopover
									title="Audit Status"
									options={axisStatusOptions}
									selectedValues={auditStatuses}
									onChange={setAuditStatuses}
								/>
								<FilterPopover
									title="Survey Status"
									options={axisStatusOptions}
									selectedValues={surveyStatuses}
									onChange={setSurveyStatuses}
								/>
								{clearButton}
							</>
						}
						emptyMessage="No places match the current filters."
						{...sharedTableProps}
					/>
				</TabsContent>

				{/* Audits */}
				<TabsContent value="audits" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entity="audits"
						totalCount={totalCount}
						selectedCount={selectedCount}
						isFetching={previewQuery.isFetching}
						onClearSelection={clearSelection}
					/>
					{/* <AuditsTable
						rows={auditRows}
						basePath="/admin/audits"
						title="Audits"
						description={makeDescription("audits")}
						emptyMessage="No audits match the current filters."
						toolbarExtra={<>{accountFilter}{projectFilter}{clearButton}</>}
						{...sharedTableProps}
					/> */}
				</TabsContent>

				{/* Reports */}
				<TabsContent value="reports" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entity="reports"
						totalCount={totalCount}
						selectedCount={selectedCount}
						isFetching={previewQuery.isFetching}
						onClearSelection={clearSelection}
					/>
					<AuditsTable
						rows={auditRows}
						basePath="/admin/reports"
						title="Reports"
						description={makeDescription("reports")}
						emptyMessage="No submitted reports match the current filters."
						toolbarExtra={
							<>
								{accountFilter}
								{projectFilter}
								{clearButton}
							</>
						}
						{...sharedTableProps}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
