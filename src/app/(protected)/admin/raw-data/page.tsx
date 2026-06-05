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
	AdminAuditExportRecord,
	AdminAuditorExportRecord,
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
import { type AuditActivityRow } from "@/components/dashboard/audits-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DataTable } from "@/components/dashboard/data-table";
import { GroupedReportsView } from "@/components/dashboard/grouped-reports-view";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ── Workbook sheet mappers ──────────────────────────────────────────────────────
// Each mapper flattens one entity into a labelled column shape for a workbook sheet.
// The id/foreign-key columns are kept so the linked sheets re-join cleanly.

function projectSheetRecord(r: AdminProjectExportRecord): Record<string, unknown> {
	return {
		project_id: r.project_id,
		account_id: r.account_id,
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
		average_u_score: r.average_u_score ?? "",
		audit_mean_pv: r.audit_mean_pv ?? "",
		audit_mean_u: r.audit_mean_u ?? "",
		survey_mean_pv: r.survey_mean_pv ?? "",
		survey_mean_u: r.survey_mean_u ?? ""
	};
}

function placeSheetRecord(r: AdminPlaceExportRecord): Record<string, unknown> {
	return {
		place_id: r.place_id,
		project_id: r.project_id,
		project_name: r.project_name,
		project_overview: r.project_overview ?? "",
		project_start_date: r.project_start_date ?? "",
		project_end_date: r.project_end_date ?? "",
		account_id: r.account_id,
		account_name: r.account_name,
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

function auditorSheetRecord(r: AdminAuditorExportRecord): Record<string, unknown> {
	return {
		auditor_profile_id: r.auditor_profile_id,
		account_id: r.account_id ?? "",
		account_name: r.account_name ?? "",
		auditor_code: r.auditor_code,
		assignments_count: r.assignments_count,
		completed_audits: r.completed_audits,
		last_active_at: r.last_active_at ?? ""
	};
}

function auditSheetRecord(r: AdminAuditExportRecord): Record<string, unknown> {
	return {
		audit_id: r.audit_id,
		audit_code: r.audit_code,
		status: r.status,
		execution_mode: r.execution_mode ?? "",
		account_id: r.account_id,
		account_name: r.account_name,
		project_id: r.project_id,
		project_name: r.project_name,
		place_id: r.place_id,
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

// ── ZIP orchestrator row mappers ────────────────────────────────────────────────
// Project the export records down to the identity fields the ZIP folder tree needs.

function toAuditRow(r: AdminAuditExportRecord): AuditExportRow {
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

function toPlaceRow(r: AdminPlaceExportRecord): PlaceExportRow {
	return {
		place_id: r.place_id,
		place_name: r.name,
		project_id: r.project_id,
		project_name: r.project_name
	};
}

function toProjectRow(r: AdminProjectExportRecord): ProjectExportRow {
	return { project_id: r.project_id, project_name: r.name };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminRawDataPage() {
	const formatT = useTranslations("common.format");
	const t = useTranslations("admin.rawData");
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

	// ── Shared dropdown filter state (reset on tab change) ───────────────────
	const [accountIds, setAccountIds] = React.useState<string[]>([]);
	const [projectIds, setProjectIds] = React.useState<string[]>([]);
	// Places-only axis filters
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
		setAccountIds([]);
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
	const accountIdsKey = accountIds.join("|");
	const projectIdsKey = projectIds.join("|");
	const auditStatusesKey = auditStatuses.join("|");
	const surveyStatusesKey = surveyStatuses.join("|");

	// Search comes from the table's built-in search box
	const searchColumnId = activeEntity === "audits" || activeEntity === "reports" ? "audit_code" : "name";
	const searchValue = getTextColumnFilterValue(columnFilters, searchColumnId);

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
			groupedSearch,
			sortParam,
			accountIds,
			projectIds,
			auditStatuses,
			surveyStatuses
		],
		queryFn: async (): Promise<PreviewResult> => {
			// Projects/Places preview as a server-paginated table; Audits/Reports load
			// the full scoped set (up to 200) for the place-grouped, expandable view.
			if (activeEntity === "audits" || activeEntity === "reports") {
				return playspaceApi.admin.audits({
					page: 1,
					pageSize: 100,
					search: groupedSearch || undefined,
					accountIds: accountIds.length > 0 ? accountIds : undefined,
					projectIds: projectIds.length > 0 ? projectIds : undefined,
					statuses: ["SUBMITTED"]
				} satisfies AdminAuditsQuery);
			}
			const base = {
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue || undefined,
				sort: sortParam,
				accountIds: accountIds.length > 0 ? accountIds : undefined
			};
			if (activeEntity === "places") {
				return playspaceApi.admin.places({
					...base,
					projectIds: projectIds.length > 0 ? projectIds : undefined,
					auditStatuses: auditStatuses.length > 0 ? auditStatuses : undefined,
					surveyStatuses: surveyStatuses.length > 0 ? surveyStatuses : undefined
				} satisfies AdminPlacesQuery);
			}
			return playspaceApi.admin.projects(base satisfies AdminProjectsQuery);
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
			executionMode: audit.execution_mode,
			startedAt: audit.started_at,
			submittedAt: audit.submitted_at,
			score: audit.summary_score,
			scorePair: audit.score_pair
		}));
	}, [activeEntity, previewQuery.data]);

	// ── Export ────────────────────────────────────────────────────────────────
	// Audits/Reports search from the grouped view's box; Projects/Places from the table.
	const effectiveSearch = activeEntity === "audits" || activeEntity === "reports" ? groupedSearch : searchValue;
	const exportQuery = React.useMemo<AdminExportQuery>(
		() => ({
			search: effectiveSearch.trim() || undefined,
			accountIds: accountIds.length > 0 ? accountIds : undefined,
			projectIds: projectIds.length > 0 ? projectIds : undefined,
			statuses: ["SUBMITTED"],
			auditStatuses: auditStatuses.length > 0 ? auditStatuses : undefined,
			surveyStatuses: surveyStatuses.length > 0 ? surveyStatuses : undefined
		}),
		[effectiveSearch, accountIds, projectIds, auditStatuses, surveyStatuses]
	);

	/** Builds the shared ZIP context, wiring scope-enforced data sources to the job's progress callback. */
	const buildZipContext = React.useCallback(
		(
			format: AuditExportDataFormat,
			fileBaseName: string,
			onProgress: (progress: ExportProgress) => void
		): RawDataZipContext => ({
			role: "admin",
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
	 * export-jobs provider. Generation runs above the router, so it survives
	 * client-side navigation; a floating indicator tracks progress and large
	 * exports also send a completion email. Each submitted audit and combined
	 * report contributes a PDF plus an Excel data file, placed
	 * into a folder tree, alongside a relational `index` file and `manifest.json`.
	 * `query` carries the scope: explicit ids for "Export selected", active
	 * filters for "Export all".
	 */
	const runExport = React.useCallback(
		(query: AdminExportQuery, suffix: string) => {
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
						const bundle = await playspaceApi.admin.exportProjectsBundle(query);
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
						const bundle = await playspaceApi.admin.exportPlacesBundle(query);
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
						? await playspaceApi.admin.exportReports(query)
						: await playspaceApi.admin.exportAudits(query);
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
		[activeEntity, buildZipContext, exportJobs, t]
	);

	/** Export all matching documents (full dataset, server-fetched). */
	const handleExportAll = React.useCallback(() => runExport(exportQuery, ""), [runExport, exportQuery]);

	/**
	 * Export only the currently-selected rows. The selected ids define the export
	 * scope; the server resolves the full accessible hierarchy for them.
	 */
	const handleExportSelected = React.useCallback(() => {
		const ids = Array.from(selectedRowIds);
		const scopedQuery: AdminExportQuery =
			activeEntity === "projects"
				? { projectIds: ids }
				: activeEntity === "places"
					? { placeIds: ids }
					: exportQuery;
		return runExport(scopedQuery, "-selected");
	}, [runExport, selectedRowIds, activeEntity, exportQuery]);

	/**
	 * Export the audits/reports selected inside the place-grouped view as a ZIP.
	 * The leaf export endpoint returns the rich rows for the active filters; we
	 * keep only the selected audit ids. The grouped view asks for the structured
	 * data format because PDFs are always included alongside that choice.
	 */
	const handleExportGroupedSelected = React.useCallback(
		(selectedAuditIds: string[]) => {
			if (selectedAuditIds.length === 0) return;
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
						? await playspaceApi.admin.exportReports(exportQuery)
						: await playspaceApi.admin.exportAudits(exportQuery);
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
		[activeEntity, exportQuery, buildZipContext, exportJobs, t]
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
		if (totalCount === undefined) return t("table.descriptionLoading", { entity });
		if (totalCount > 10_000) return t("table.descriptionCapped", { count: totalCount.toLocaleString() });
		return t("table.description", { count: totalCount.toLocaleString() });
	}

	// ── Toolbar extras ────────────────────────────────────────────────────────

	const hasDropdownFilters = accountIds.length + projectIds.length + auditStatuses.length + surveyStatuses.length > 0;

	const accountFilter = (
		<FilterPopover
			title={t("filters.account")}
			options={accountOptions}
			selectedValues={accountIds}
			onChange={setAccountIds}
		/>
	);
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
				setAccountIds([]);
				setProjectIds([]);
				setAuditStatuses([]);
				setSurveyStatuses([]);
			}}>
			<XIcon className="size-3.5" />
			{t("filters.clear")}
		</Button>
	) : null;

	const selectedCount = selectedRowIds.size;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("eyebrow")}
				title={t("title")}
				description={t("description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
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

				{/* Projects */}
				<TabsContent value="projects" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entityLabel={t("tabs.projects").toLowerCase()}
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
						title={t("tabs.projects")}
						description={makeDescription(t("tabs.projects").toLowerCase())}
						columns={projectColumns}
						data={(previewQuery.data?.items as AdminProjectRow[] | undefined) ?? []}
						searchColumnId="name"
						searchPlaceholder={t("table.searchProjects")}
						toolbarExtra={
							<>
								{accountFilter}
								{clearButton}
							</>
						}
						emptyMessage={t("table.emptyProjects")}
						{...sharedTableProps}
					/>
				</TabsContent>

				{/* Places */}
				<TabsContent value="places" className="mt-4 space-y-3">
					<CollectionNamespaceBar
						entityLabel={t("tabs.places").toLowerCase()}
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
						title={t("tabs.places")}
						description={makeDescription(t("tabs.places").toLowerCase())}
						columns={placeColumns}
						data={(previewQuery.data?.items as AdminPlaceRow[] | undefined) ?? []}
						searchColumnId="name"
						searchPlaceholder={t("table.searchPlaces")}
						toolbarExtra={
							<>
								{accountFilter}
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
						{...sharedTableProps}
					/>
				</TabsContent>

				{/* Audits - submitted-only place-grouped export selection */}
				<TabsContent value="audits" className="mt-4 space-y-3">
					<GroupedReportsView
						rows={auditRows}
						basePath="/admin/audits"
						description={t("table.auditExportDescription")}
						rolePrefix="admin"
						variant="audits"
						searchValue={groupedSearch}
						onSearchValueChange={setGroupedSearch}
						isSearching={previewQuery.isFetching}
						onExportSelected={ids => void handleExportGroupedSelected(ids)}
						toolbarFilters={
							<>
								{accountFilter}
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
						basePath="/admin/reports"
						description={t("table.reportExportDescription")}
						rolePrefix="admin"
						variant="reports"
						searchValue={groupedSearch}
						onSearchValueChange={setGroupedSearch}
						isSearching={previewQuery.isFetching}
						onExportSelected={ids => void handleExportGroupedSelected(ids)}
						toolbarFilters={
							<>
								{accountFilter}
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
