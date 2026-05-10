"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { FileTextIcon, FilterIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { playspaceApi, type AuditorAuditSummary } from "@/lib/api/playspace";
import { AuditsTable, type AuditActivityRow } from "@/components/dashboard/audits-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import {
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface FilterPopoverProps {
	title: string;
	options: Array<{ label: string; value: string }>;
	selectedValues: string[];
	onChange: (values: string[]) => void;
}

/** Checkbox popover for multi-select filtering. */
function FilterPopover({ title, options, selectedValues, onChange }: FilterPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<FilterIcon className="size-3.5" />
					{title}
					{selectedValues.length > 0 && (
						<Badge variant="secondary" className="ml-1 rounded-sm px-1.5 font-mono text-xs">
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
								size="sm"
								className="h-auto p-0 text-xs text-muted-foreground"
								onClick={() => onChange([])}>
								Clear
							</Button>
						)}
					</div>
					<Separator />
					<div className="max-h-60 space-y-2 overflow-y-auto">
						{options.map(option => (
							<div key={option.value} className="flex items-center gap-2">
								<Checkbox
									id={`filter-${title}-${option.value}`}
									checked={selectedValues.includes(option.value)}
									onCheckedChange={checked => {
										if (checked) {
											onChange([...selectedValues, option.value]);
										} else {
											onChange(selectedValues.filter(v => v !== option.value));
										}
									}}
								/>
								<Label
									htmlFor={`filter-${title}-${option.value}`}
									className="text-sm font-normal leading-none">
									{option.label}
								</Label>
							</div>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

/** Derive a score pair from individual score totals when available. */
function deriveScorePair(audit: AuditorAuditSummary): { pv: number; u: number } | null {
	if (audit.score_pair) return audit.score_pair;
	if (audit.score_totals) {
		return {
			pv: audit.score_totals.play_value_total,
			u: audit.score_totals.usability_total
		};
	}
	return null;
}

export default function AuditorReportsPage() {
	const t = useTranslations("auditor.reports");
	const formatT = useTranslations("common.format");
	const router = useRouter();

	const [sorting, setSorting] = React.useState<SortingState>([{ id: "submitted_at", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	});

	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);

	const searchValue = getTextColumnFilterValue(columnFilters, "audit_code");
	const sortParam = toBackendSortParam(sorting);
	const selectedProjectIdsKey = selectedProjectIds.join("|");

	const [prevDeps, setPrevDeps] = React.useState({ searchValue, selectedProjectIdsKey, sortParam });
	if (
		searchValue !== prevDeps.searchValue ||
		selectedProjectIdsKey !== prevDeps.selectedProjectIdsKey ||
		sortParam !== prevDeps.sortParam
	) {
		setPrevDeps({ searchValue, selectedProjectIdsKey, sortParam });
		setPagination(currentValue =>
			currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 }
		);
	}

	const summaryQuery = useQuery({
		queryKey: ["playspace", "auditor", "dashboardSummary", "reportsPage"],
		queryFn: () => playspaceApi.auditor.dashboardSummary(),
		placeholderData: preservePreviousData
	});

	const reportsQuery = useQuery({
		queryKey: [
			"playspace",
			"auditor",
			"reports",
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam
		],
		queryFn: () =>
			playspaceApi.auditor.audits({
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				statuses: ["submitted"]
			}),
		placeholderData: preservePreviousData
	});

	const [prevData, setPrevData] = React.useState(reportsQuery.data);
	if (reportsQuery.data && reportsQuery.data !== prevData) {
		setPrevData(reportsQuery.data);
		const maxPageIndex = Math.max(reportsQuery.data.total_pages - 1, 0);
		if (pagination.pageIndex > maxPageIndex) {
			setPagination(currentValue => ({ ...currentValue, pageIndex: maxPageIndex }));
		}
	}

	/** Derive project filter options from the loaded audit rows. */
	const projectOptions = React.useMemo(() => {
		const projectMap = new Map<string, string>();
		for (const audit of reportsQuery.data?.items ?? []) {
			if (!projectMap.has(audit.project_id)) {
				projectMap.set(audit.project_id, audit.project_name);
			}
		}
		return Array.from(projectMap.entries()).map(([id, name]) => ({ value: id, label: name }));
	}, [reportsQuery.data]);

	/** Map backend audit summaries to the shared AuditActivityRow shape, with client-side project filtering. */
	const rows = React.useMemo((): AuditActivityRow[] => {
		const allItems = reportsQuery.data?.items ?? [];
		const filtered =
			selectedProjectIds.length > 0 ? allItems.filter(a => selectedProjectIds.includes(a.project_id)) : allItems;

		return filtered.map(audit => ({
			id: audit.audit_id,
			auditCode: audit.audit_code,
			status: audit.status,
			auditorCode: audit.auditor_code || "You",
			placeName: audit.place_name,
			placeId: audit.place_id,
			projectName: audit.project_name,
			projectId: audit.project_id,
			executionMode: audit.execution_mode,
			startedAt: audit.started_at,
			submittedAt: audit.submitted_at,
			score: audit.summary_score,
			scorePair: deriveScorePair(audit)
		}));
	}, [reportsQuery.data, selectedProjectIds]);

	/** Compute aggregate stats from loaded report rows. */
	const aggregateStats = React.useMemo(() => {
		const allItems = reportsQuery.data?.items ?? [];
		const uniquePlaces = new Set(allItems.map(a => a.place_id)).size;
		const uniqueProjects = new Set(allItems.map(a => a.project_id)).size;

		let pvSum = 0;
		let uSum = 0;
		let pairCount = 0;
		for (const audit of allItems) {
			const pair = deriveScorePair(audit);
			if (pair) {
				pvSum += pair.pv;
				uSum += pair.u;
				pairCount += 1;
			}
		}
		const avgPv = pairCount > 0 ? Math.round((pvSum / pairCount) * 10) / 10 : null;
		const avgU = pairCount > 0 ? Math.round((uSum / pairCount) * 10) / 10 : null;

		return { uniquePlaces, uniqueProjects, avgPv, avgU };
	}, [reportsQuery.data]);

	const isInitialLoading =
		(reportsQuery.isLoading && !reportsQuery.data) || (summaryQuery.isLoading && !summaryQuery.data);

	if (isInitialLoading) {
		return (
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, idx) => (
						<div
							key={`stat-skeleton-${idx}`}
							className="h-32 animate-pulse rounded-card border border-border bg-card"
						/>
					))}
				</div>
				<div className="h-[420px] animate-pulse rounded-card border border-border bg-card" />
			</div>
		);
	}

	if (reportsQuery.isError && !reportsQuery.data) {
		return (
			<EmptyState
				title={t("error.title")}
				description={t("error.description")}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						Try again
					</Button>
				}
			/>
		);
	}

	const totalSubmitted = summaryQuery.data?.submitted_audits ?? reportsQuery.data?.total_count ?? 0;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/auditor/dashboard" },
					{ label: t("breadcrumbs.reports") }
				]}
			/>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
				<StatCard
					title={t("stats.totalReports")}
					value={String(totalSubmitted)}
					helper={t("stats.totalReportsHelper")}
					tone="info"
				/>
				<StatCard
					title={t("stats.avgPlayValue")}
					value={aggregateStats.avgPv !== null ? String(aggregateStats.avgPv) : formatT("pending")}
					helper={t("stats.avgPlayValueHelper")}
					tone="success"
				/>
				<StatCard
					title={t("stats.avgUsability")}
					value={aggregateStats.avgU !== null ? String(aggregateStats.avgU) : formatT("pending")}
					helper={t("stats.avgUsabilityHelper")}
					tone="violet"
				/>
				<StatCard
					title={t("stats.places")}
					value={String(aggregateStats.uniquePlaces)}
					helper={t("stats.placesHelper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.projects")}
					value={String(aggregateStats.uniqueProjects)}
					helper={t("stats.projectsHelper")}
					tone="info"
				/>
			</div>

			<AuditsTable
				rows={rows}
				basePath="/auditor/reports"
				title={t("table.title")}
				description={t("table.description")}
				emptyMessage={t("table.emptyMessage")}
				sortingState={sorting}
				onSortingStateChange={setSorting}
				columnFiltersState={columnFilters}
				onColumnFiltersStateChange={setColumnFilters}
				paginationState={pagination}
				onPaginationStateChange={setPagination}
				manualFiltering
				manualSorting
				manualPagination
				rowCount={reportsQuery.data?.total_count}
				pageCount={reportsQuery.data?.total_pages}
				isFetching={reportsQuery.isFetching}
				onRowClick={row => router.push(`/auditor/reports/${row.id}`)}
				getRowActions={row => [
					{
						label: t("table.viewReport"),
						onSelect: () => router.push(`/auditor/reports/${row.id}`),
						icon: FileTextIcon
					}
				]}
				toolbarExtra={
					<>
						{projectOptions.length > 1 && (
							<FilterPopover
								title={t("filters.projects")}
								options={projectOptions}
								selectedValues={selectedProjectIds}
								onChange={setSelectedProjectIds}
							/>
						)}
						{selectedProjectIds.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => setSelectedProjectIds([])}>
								<XIcon className="size-3.5" />
								{t("filters.clearAll")}
							</Button>
						)}
					</>
				}
			/>
		</div>
	);
}
