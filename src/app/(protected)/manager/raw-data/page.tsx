"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import {
	ClipboardListIcon,
	DownloadIcon,
	FileTextIcon,
	FolderKanban,
	Loader2Icon,
	MapPinIcon,
	XIcon
} from "lucide-react";
import { useTranslations } from "next-intl";

import type {
	ManagerAuditExportRecord,
	ManagerAuditorExportRecord,
	ManagerAuditRow,
	ManagerAuditsQuery,
	ManagerExportQuery,
	ManagerPlaceExportRecord,
	ManagerPlaceRow,
	ManagerPlacesQuery,
	ManagerProjectExportRecord,
	ProjectSummary
} from "@/lib/api/playspace";
import { playspaceApi } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { type AuditActivityRow } from "@/components/dashboard/audits-table";
import { GroupedReportsView } from "@/components/dashboard/grouped-reports-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DataTable } from "@/components/dashboard/data-table";
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header";
import {
	CollectionNamespaceBar,
	FilterPopover,
	SelectionBar,
	type ExportEntity
} from "@/components/dashboard/raw-data-export";
import { useExportJobs } from "@/components/dashboard/export-jobs-provider";
import type { AuditExportDataFormat } from "@/lib/export/audit";
import { createRichAuditSource } from "@/lib/export/rich-audit-source";
import {
	exportAuditsZip,
	exportPlacesZip,
	exportProjectsZip,
	fetchSavedPlaceReportsViaHistory,
	type AuditExportRow,
	type ExportProgress,
	type IndexSheet,
	type PlaceExportRow,
	type ProjectExportRow,
	type RawDataZipContext
} from "@/lib/export/raw-data-zip";
import {
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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ── Workbook sheet mappers ──────────────────────────────────────────────────────
// Manager exports include the auditor's full identity (name, email, demographics) -
// consistent with the manager auditors view. Account columns are omitted because the
// export is always scoped to the manager's own account.

function projectSheetRecord(r: ManagerProjectExportRecord): Record<string, unknown> {
	return {
		project_id: r.project_id,
		name: r.name,
		overview: r.overview ?? "",
		start_date: r.start_date ?? "",
		end_date: r.end_date ?? "",
		place_types: r.place_types.join("; "),
		places_count: r.places_count,
		auditors_count: r.auditors_count,
		audits_completed: r.audits_completed,
		average_pv_score: r.average_pv_score ?? "",
		average_u_score: r.average_u_score ?? "",
		audit_mean_pv: r.audit_mean_pv ?? "",
		audit_mean_u: r.audit_mean_u ?? "",
		survey_mean_pv: r.survey_mean_pv ?? "",
		survey_mean_u: r.survey_mean_u ?? ""
	};
}

function placeSheetRecord(r: ManagerPlaceExportRecord): Record<string, unknown> {
	return {
		place_id: r.place_id,
		project_id: r.project_id,
		project_name: r.project_name,
		project_overview: r.project_overview ?? "",
		project_start_date: r.project_start_date ?? "",
		project_end_date: r.project_end_date ?? "",
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

function auditorSheetRecord(r: ManagerAuditorExportRecord): Record<string, unknown> {
	return {
		auditor_profile_id: r.auditor_profile_id,
		auditor_code: r.auditor_code,
		full_name: r.full_name,
		email: r.email ?? "",
		age_range: r.age_range ?? "",
		gender: r.gender ?? "",
		country: r.country ?? "",
		role: r.role ?? "",
		assignments_count: r.assignments_count,
		completed_audits: r.completed_audits,
		last_active_at: r.last_active_at ?? ""
	};
}

function auditSheetRecord(r: ManagerAuditExportRecord): Record<string, unknown> {
	return {
		audit_id: r.audit_id,
		audit_code: r.audit_code,
		status: r.status,
		execution_mode: r.execution_mode ?? "",
		project_id: r.project_id,
		project_name: r.project_name,
		place_id: r.place_id,
		place_name: r.place_name,
		auditor_code: r.auditor_code,
		auditor_full_name: r.auditor_full_name,
		auditor_email: r.auditor_email ?? "",
		auditor_age_range: r.auditor_age_range ?? "",
		auditor_gender: r.auditor_gender ?? "",
		auditor_country: r.auditor_country ?? "",
		auditor_role: r.auditor_role ?? "",
		started_at: r.started_at,
		submitted_at: r.submitted_at ?? "",
		summary_score: r.summary_score ?? "",
		audit_pv_score: r.audit_pv_score ?? "",
		audit_u_score: r.audit_u_score ?? "",
		survey_pv_score: r.survey_pv_score ?? "",
		survey_u_score: r.survey_u_score ?? ""
	};
}

// ── ZIP orchestrator row mappers ────────────────────────────────────────────────
// Project the export records down to the identity fields the ZIP folder tree needs.

function toAuditRow(r: ManagerAuditExportRecord): AuditExportRow {
	return {
		audit_id: r.audit_id,
		audit_code: r.audit_code,
		status: r.status,
		place_id: r.place_id,
		place_name: r.place_name,
		project_id: r.project_id,
		project_name: r.project_name
	};
}

function toPlaceRow(r: ManagerPlaceExportRecord): PlaceExportRow {
	return {
		place_id: r.place_id,
		place_name: r.name,
		project_id: r.project_id,
		project_name: r.project_name
	};
}

function toProjectRow(r: ManagerProjectExportRecord): ProjectExportRow {
	return { project_id: r.project_id, project_name: r.name };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagerRawDataPage() {
	const formatT = useTranslations("common.format");
	const t = useTranslations("manager.rawData");
	const session = useAuthSession();
	const accountId = session?.role === "manager" ? session.accountId : null;
	const exportJobs = useExportJobs();
	const isExporting = exportJobs.activeCount > 0;

	const [activeEntity, setActiveEntity] = React.useState<ExportEntity>("projects");

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

	// ── Scoped dropdown filter state (reset on tab change) ───────────────────
	const [projectIds, setProjectIds] = React.useState<string[]>([]);
	const [auditStatuses, setAuditStatuses] = React.useState<string[]>([]);
	const [surveyStatuses, setSurveyStatuses] = React.useState<string[]>([]);
	// Search box for the grouped audits/reports view (drives the server query)
	const [groupedSearch, setGroupedSearch] = React.useState("");

	// ── Per-tab table state (reset on tab change) ────────────────────────────
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

	const handleEntityChange = React.useCallback((entity: string) => {
		setActiveEntity(entity as ExportEntity);
		setSelectedRowIds(new Set());
		setProjectIds([]);
		setAuditStatuses([]);
		setSurveyStatuses([]);
		setGroupedSearch("");
		setSorting([]);
		setColumnFilters([]);
		setPagination({ pageIndex: 0, pageSize: 10 });
	}, []);

	// Reset pagination when filters/sort change
	const sortParam = toBackendSortParam(sorting);
	const projectIdsKey = projectIds.join("|");
	const auditStatusesKey = auditStatuses.join("|");
	const surveyStatusesKey = surveyStatuses.join("|");

	const searchColumnId = activeEntity === "audits" || activeEntity === "reports" ? "audit_code" : "name";
	const searchValue = getTextColumnFilterValue(columnFilters, searchColumnId);

	const [prevDeps, setPrevDeps] = React.useState({
		searchValue,
		sortParam,
		projectIdsKey,
		auditStatusesKey,
		surveyStatusesKey
	});
	if (
		searchValue !== prevDeps.searchValue ||
		sortParam !== prevDeps.sortParam ||
		projectIdsKey !== prevDeps.projectIdsKey ||
		auditStatusesKey !== prevDeps.auditStatusesKey ||
		surveyStatusesKey !== prevDeps.surveyStatusesKey
	) {
		setPrevDeps({ searchValue, sortParam, projectIdsKey, auditStatusesKey, surveyStatusesKey });
		setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
	}

	// ── Filter option queries (account-scoped) ────────────────────────────────
	// The full project list doubles as the Projects-tab preview data (client-paginated)
	// and as the project filter options for the Places/Reports tabs.
	const projectsListQuery = useQuery({
		queryKey: ["playspace", "manager", "raw-data", "projects", accountId],
		queryFn: async (): Promise<ProjectSummary[]> => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null,
		staleTime: 5 * 60_000
	});
	const projectOptions = React.useMemo(
		() => (projectsListQuery.data ?? []).map(p => ({ label: p.name, value: p.id })),
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

	// ── Server-paginated preview (places / audits / reports) ──────────────────
	const serverPreviewQuery = useQuery({
		queryKey: [
			"playspace",
			"manager",
			"raw-data-preview",
			accountId,
			activeEntity,
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			groupedSearch,
			sortParam,
			projectIds,
			auditStatuses,
			surveyStatuses
		],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			// Audits/Reports load the full scoped set (up to 200) for the place-grouped,
			// expandable view; Places stays a server-paginated table.
			if (activeEntity === "audits" || activeEntity === "reports") {
				return playspaceApi.accounts.audits(accountId, {
					page: 1,
					pageSize: 100,
					search: groupedSearch || undefined,
					projectIds: projectIds.length > 0 ? projectIds : undefined,
					statuses: ["SUBMITTED"]
				} satisfies ManagerAuditsQuery);
			}
			const base = {
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue || undefined,
				sort: sortParam,
				projectIds: projectIds.length > 0 ? projectIds : undefined
			};
			if (activeEntity === "places") {
				return playspaceApi.accounts.places(accountId, {
					...base,
					auditStatuses: auditStatuses.length > 0 ? auditStatuses : undefined,
					surveyStatuses: surveyStatuses.length > 0 ? surveyStatuses : undefined
				} satisfies ManagerPlacesQuery);
			}
			// Projects are client-paginated from projectsListQuery; this branch is unused.
			return playspaceApi.accounts.places(accountId, base satisfies ManagerPlacesQuery);
		},
		enabled: accountId !== null && activeEntity !== "projects",
		placeholderData: preservePreviousData
	});

	// Map ManagerAuditRow → AuditActivityRow for the audits/reports tabs
	const auditRows = React.useMemo((): AuditActivityRow[] => {
		if (activeEntity !== "audits" && activeEntity !== "reports") return [];
		return ((serverPreviewQuery.data?.items as ManagerAuditRow[] | undefined) ?? []).map(audit => ({
			id: audit.audit_id,
			auditCode: audit.audit_code,
			status: audit.status,
			auditorCode: audit.auditor_code,
			projectName: audit.project_name,
			projectId: audit.project_id,
			placeName: audit.place_name,
			placeId: audit.place_id,
			executionMode: audit.execution_mode,
			startedAt: audit.started_at,
			submittedAt: audit.submitted_at,
			score: audit.summary_score,
			scorePair: audit.score_pair
		}));
	}, [activeEntity, serverPreviewQuery.data]);

	// ── Export ────────────────────────────────────────────────────────────────
	// Audits/Reports search from the grouped view's box; Places from the table.
	const effectiveSearch = activeEntity === "audits" || activeEntity === "reports" ? groupedSearch : searchValue;
	const exportQuery = React.useMemo<ManagerExportQuery>(
		() => ({
			search: effectiveSearch.trim() || undefined,
			projectIds: projectIds.length > 0 ? projectIds : undefined,
			statuses: ["SUBMITTED"],
			auditStatuses: auditStatuses.length > 0 ? auditStatuses : undefined,
			surveyStatuses: surveyStatuses.length > 0 ? surveyStatuses : undefined
		}),
		[effectiveSearch, projectIds, auditStatuses, surveyStatuses]
	);

	/** Builds the shared ZIP context, wiring scope-enforced data sources to the job's progress callback. */
	const buildZipContext = React.useCallback(
		(
			format: AuditExportDataFormat,
			fileBaseName: string,
			onProgress: (progress: ExportProgress) => void
		): RawDataZipContext => ({
			role: "manager",
			userId: null,
			format,
			filters: { ...exportQuery },
			source: createRichAuditSource(),
			fetchSavedPlaceReports: fetchSavedPlaceReportsViaHistory,
			fileBaseName,
			onProgress
		}),
		[exportQuery]
	);

	/**
	 * Export the scoped selection for the active tab as a ZIP via the durable
	 * export-jobs provider, scoped to the manager's own account. Generation runs
	 * above the router, so it survives client-side navigation; a floating
	 * indicator tracks progress and large exports also send a completion email.
	 * Each submitted audit and combined report contributes a PDF plus the chosen
	 * data file, alongside a relational `index` file and `manifest.json`.
	 */
	const runExport = React.useCallback(
		(query: ManagerExportQuery, suffix: string) => {
			if (!accountId) return;
			const scopedAccountId = accountId;
			const dataFormat: AuditExportDataFormat = "xlsx";
			const entity = activeEntity;
			void exportJobs.startExport({
				label: t(`tabs.${entity}`),
				entity,
				format: dataFormat,
				run: async onProgress => {
					const timestamp = new Date().toISOString().slice(0, 10);
					const baseName = `playspace-${entity}${suffix}-${timestamp}`;
					const ctx = buildZipContext(dataFormat, baseName, onProgress);
					if (entity === "projects") {
						const bundle = await playspaceApi.accounts.exportProjectsBundle(scopedAccountId, query);
						const indexSheets: IndexSheet[] = [
							{ sheetName: "Projects", records: bundle.projects.map(projectSheetRecord) },
							{ sheetName: "Places", records: bundle.places.map(placeSheetRecord) },
							{ sheetName: "Auditors", records: bundle.auditors.map(auditorSheetRecord) },
							{ sheetName: "Audits", records: bundle.audits.map(auditSheetRecord) }
						];
						const result = await exportProjectsZip({
							projects: bundle.projects.map(toProjectRow),
							places: bundle.places.map(toPlaceRow),
							audits: bundle.audits.map(toAuditRow),
							indexSheets,
							ctx
						});
						return { result, fileName: `${baseName}.zip` };
					}
					if (entity === "places") {
						const bundle = await playspaceApi.accounts.exportPlacesBundle(scopedAccountId, query);
						const indexSheets: IndexSheet[] = [
							{ sheetName: "Places", records: bundle.places.map(placeSheetRecord) },
							{ sheetName: "Auditors", records: bundle.auditors.map(auditorSheetRecord) },
							{ sheetName: "Audits", records: bundle.audits.map(auditSheetRecord) }
						];
						const result = await exportPlacesZip({
							places: bundle.places.map(toPlaceRow),
							audits: bundle.audits.map(toAuditRow),
							indexSheets,
							ctx
						});
						return { result, fileName: `${baseName}.zip` };
					}
					const isReports = entity === "reports";
					const exportData = isReports
						? await playspaceApi.accounts.exportReports(scopedAccountId, query)
						: await playspaceApi.accounts.exportAudits(scopedAccountId, query);
					const result = await exportAuditsZip({
						rows: exportData.records.map(toAuditRow),
						indexSheets: [
							{
								sheetName: isReports ? "Reports" : "Audits",
								records: exportData.records.map(auditSheetRecord)
							}
						],
						entityLabel: isReports ? "reports" : "audits",
						ctx
					});
					return { result, fileName: `${baseName}.zip` };
				}
			});
		},
		[accountId, activeEntity, buildZipContext, exportJobs, t]
	);

	/** Export all matching documents (full dataset, server-fetched). */
	const handleExportAll = React.useCallback(() => runExport(exportQuery, ""), [runExport, exportQuery]);

	/** Export only the currently-selected rows (selected ids define the scope). */
	const handleExportSelected = React.useCallback(() => {
		const ids = Array.from(selectedRowIds);
		const scopedQuery: ManagerExportQuery =
			activeEntity === "projects"
				? { projectIds: ids }
				: activeEntity === "places"
					? { placeIds: ids }
					: exportQuery;
		return runExport(scopedQuery, "-selected");
	}, [runExport, selectedRowIds, activeEntity, exportQuery]);

	/**
	 * Export the audits/reports selected inside the place-grouped view as a ZIP.
	 * The grouped view asks for the structured data format because PDFs are always
	 * included alongside that choice.
	 */
	const handleExportGroupedSelected = React.useCallback(
		(selectedAuditIds: string[]) => {
			if (!accountId || selectedAuditIds.length === 0) return;
			const scopedAccountId = accountId;
			const entity = activeEntity;
			const isReports = entity === "reports";
			void exportJobs.startExport({
				label: t(`tabs.${entity}`),
				entity,
				format: "xlsx",
				run: async onProgress => {
					const timestamp = new Date().toISOString().slice(0, 10);
					const baseName = `playspace-${entity}-selected-${timestamp}`;
					const idSet = new Set(selectedAuditIds);
					const exportData = isReports
						? await playspaceApi.accounts.exportReports(scopedAccountId, exportQuery)
						: await playspaceApi.accounts.exportAudits(scopedAccountId, exportQuery);
					const records = exportData.records.filter(r => idSet.has(r.audit_id));
					const result = await exportAuditsZip({
						rows: records.map(toAuditRow),
						indexSheets: [
							{ sheetName: isReports ? "Reports" : "Audits", records: records.map(auditSheetRecord) }
						],
						entityLabel: isReports ? "reports" : "audits",
						ctx: buildZipContext("xlsx", baseName, onProgress)
					});
					return { result, fileName: `${baseName}.zip` };
				}
			});
		},
		[accountId, activeEntity, exportQuery, buildZipContext, exportJobs, t]
	);

	// ── Column definitions ────────────────────────────────────────────────────

	const projectColumns = React.useMemo<ColumnDef<ProjectSummary>[]>(() => {
		const pageItems = projectsListQuery.data ?? [];
		return [
			{
				id: "select",
				size: 40,
				enableSorting: false,
				enableHiding: false,
				header: () => {
					const ids = pageItems.map(r => r.id);
					const allSelected = ids.length > 0 && ids.every(id => selectedRowIds.has(id));
					const someSelected = ids.some(id => selectedRowIds.has(id));
					return (
						<Checkbox
							checked={allSelected}
							data-state={someSelected && !allSelected ? "indeterminate" : undefined}
							onCheckedChange={() => togglePageSelection(ids)}
							aria-label="Select all projects"
							className="translate-y-px"
						/>
					);
				},
				cell: ({ row }) => {
					const id = row.original.id;
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
			{
				id: "name",
				accessorFn: row => row.name,
				header: ({ column }) => <DataTableColumnHeader column={column} title="Project" />,
				cell: ({ row }) => (
					<div className="min-w-[240px] space-y-1">
						<p className="font-medium text-foreground">{row.original.name}</p>
						{row.original.overview ? (
							<p className="line-clamp-1 text-sm text-muted-foreground">{row.original.overview}</p>
						) : null}
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
	}, [formatT, selectedRowIds, projectsListQuery.data, toggleRowSelection, togglePageSelection]);

	const placeColumns = React.useMemo<ColumnDef<ManagerPlaceRow>[]>(() => {
		const pageItems = (serverPreviewQuery.data?.items as ManagerPlaceRow[] | undefined) ?? [];
		return [
			{
				id: "select",
				size: 40,
				enableSorting: false,
				enableHiding: false,
				header: () => {
					const ids = pageItems.map(r => r.id);
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
					const id = row.original.id;
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
			{
				id: "name",
				accessorFn: row =>
					`${row.name} ${row.address ?? ""} ${row.project_name} ${[row.city, row.province, row.country].filter(Boolean).join(" ")}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title="Place" />,
				cell: ({ row }) => (
					<div className="min-w-[260px] space-y-1">
						<p className="font-medium text-foreground">{row.original.name}</p>
						{row.original.address ? (
							<p className="text-sm text-muted-foreground">{row.original.address}</p>
						) : null}
						<p className="text-sm text-muted-foreground">{row.original.project_name}</p>
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
	}, [formatT, selectedRowIds, serverPreviewQuery.data, toggleRowSelection, togglePageSelection]);

	// ── Table props (projects = client, others = server) ──────────────────────
	const isProjects = activeEntity === "projects";
	const totalCount = isProjects ? projectsListQuery.data?.length : serverPreviewQuery.data?.total_count;
	const isFetching = isProjects ? projectsListQuery.isFetching : serverPreviewQuery.isFetching;

	const serverTableProps = {
		isFetching: serverPreviewQuery.isFetching,
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
		rowCount: serverPreviewQuery.data?.total_count,
		pageCount: serverPreviewQuery.data?.total_pages
	} as const;

	function makeDescription(entity: string): string {
		if (totalCount === undefined) return t("table.descriptionLoading", { entity });
		if (totalCount > 10_000) return t("table.descriptionCapped", { count: totalCount.toLocaleString() });
		return t("table.description", { count: totalCount.toLocaleString() });
	}

	// ── Toolbar extras ────────────────────────────────────────────────────────
	const hasDropdownFilters = projectIds.length + auditStatuses.length + surveyStatuses.length > 0;
	const projectFilter = (
		<FilterPopover
			title={t("filters.project")}
			options={projectOptions}
			selectedValues={projectIds}
			onChange={setProjectIds}
		/>
	);
	const clearButton = hasDropdownFilters ? (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="gap-1.5"
			onClick={() => {
				setProjectIds([]);
				setAuditStatuses([]);
				setSurveyStatuses([]);
			}}>
			<XIcon className="size-3.5" />
			{t("filters.clear")}
		</Button>
	) : null;

	const selectedCount = selectedRowIds.size;

	if (accountId === null) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={t("eyebrow")}
					title={t("title")}
					description={t("description")}
					breadcrumbs={[
						{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
						{ label: t("breadcrumb") }
					]}
				/>
				<Card>
					<CardContent className="py-10 text-center text-sm text-muted-foreground">
						{t("accountUnavailable")}
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("eyebrow")}
				title={t("title")}
				description={t("description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
					{ label: t("breadcrumb") }
				]}
				actions={
					<Button
						type="button"
						variant="default"
						className="gap-2"
						disabled={isExporting}
						onClick={handleExportAll}>
						{isExporting ? (
							<Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<DownloadIcon className="size-4" aria-hidden="true" />
						)}
						{isExporting ? t("export.exporting") : t("export.button")}
					</Button>
				}
			/>

			<Tabs value={activeEntity} onValueChange={handleEntityChange}>
				<TabsList>
					<TabsTrigger value="projects" className="gap-2">
						<FolderKanban className="size-4" aria-hidden="true" />
						{t("tabs.projects")}
					</TabsTrigger>
					<TabsTrigger value="places" className="gap-2">
						<MapPinIcon className="size-4" aria-hidden="true" />
						{t("tabs.places")}
					</TabsTrigger>
					<TabsTrigger value="audits" className="gap-2">
						<ClipboardListIcon className="size-4" aria-hidden="true" />
						{t("tabs.audits")}
					</TabsTrigger>
					<TabsTrigger value="reports" className="gap-2">
						<FileTextIcon className="size-4" aria-hidden="true" />
						{t("tabs.reports")}
					</TabsTrigger>
				</TabsList>

				{/* Projects (client-paginated) */}
				<TabsContent value="projects" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entityLabel={t("tabs.projects").toLowerCase()}
						totalCount={totalCount}
						selectedCount={selectedCount}
						isFetching={isFetching}
						onClearSelection={clearSelection}
					/>
					<SelectionBar
						selectedCount={selectedCount}
						isExporting={isExporting}
						onExportSelected={handleExportSelected}
						onClearSelection={clearSelection}
					/>
					<DataTable
						title={t("tabs.projects")}
						description={makeDescription(t("tabs.projects").toLowerCase())}
						columns={projectColumns}
						data={projectsListQuery.data ?? []}
						searchColumnId="name"
						searchPlaceholder={t("table.searchProjects")}
						isFetching={projectsListQuery.isFetching}
						emptyMessage={t("table.emptyProjects")}
					/>
				</TabsContent>

				{/* Places */}
				<TabsContent value="places" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entityLabel={t("tabs.places").toLowerCase()}
						totalCount={totalCount}
						selectedCount={selectedCount}
						isFetching={isFetching}
						onClearSelection={clearSelection}
					/>
					<SelectionBar
						selectedCount={selectedCount}
						isExporting={isExporting}
						onExportSelected={handleExportSelected}
						onClearSelection={clearSelection}
					/>
					<DataTable
						title={t("tabs.places")}
						description={makeDescription(t("tabs.places").toLowerCase())}
						columns={placeColumns}
						data={(serverPreviewQuery.data?.items as ManagerPlaceRow[] | undefined) ?? []}
						searchColumnId="name"
						searchPlaceholder={t("table.searchPlaces")}
						toolbarExtra={
							<>
								{projectFilter}
								<FilterPopover
									title={t("filters.auditStatus")}
									options={axisStatusOptions}
									selectedValues={auditStatuses}
									onChange={setAuditStatuses}
								/>
								<FilterPopover
									title={t("filters.surveyStatus")}
									options={axisStatusOptions}
									selectedValues={surveyStatuses}
									onChange={setSurveyStatuses}
								/>
								{clearButton}
							</>
						}
						emptyMessage={t("table.emptyPlaces")}
						{...serverTableProps}
					/>
				</TabsContent>

				{/* Audits - submitted-only place-grouped export selection */}
				<TabsContent value="audits" className="mt-4 space-y-3">
					<GroupedReportsView
						rows={auditRows}
						basePath="/manager/audits"
						description={t("table.auditExportDescription")}
						rolePrefix="manager"
						variant="audits"
						searchValue={groupedSearch}
						onSearchValueChange={setGroupedSearch}
						isSearching={serverPreviewQuery.isFetching}
						onExportSelected={ids => void handleExportGroupedSelected(ids)}
						toolbarFilters={
							<>
								{projectFilter}
								{clearButton}
							</>
						}
					/>
				</TabsContent>

				{/* Reports - submitted-only place-grouped export selection */}
				<TabsContent value="reports" className="mt-4 space-y-3">
					<GroupedReportsView
						rows={auditRows}
						basePath="/manager/reports"
						description={t("table.reportExportDescription")}
						rolePrefix="manager"
						variant="reports"
						searchValue={groupedSearch}
						onSearchValueChange={setGroupedSearch}
						isSearching={serverPreviewQuery.isFetching}
						onExportSelected={ids => void handleExportGroupedSelected(ids)}
						toolbarFilters={
							<>
								{projectFilter}
								{clearButton}
							</>
						}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
