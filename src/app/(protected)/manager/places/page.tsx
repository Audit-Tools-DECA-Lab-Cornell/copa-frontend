"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { FilterIcon, FolderKanbanIcon, MapPinnedIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { useAuthSession } from "@/components/app/auth-session-provider";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DataTable, getMultiValueFilterFn } from "@/components/dashboard/data-table";
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EntityRowActions } from "@/components/dashboard/entity-row-actions";
import {
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import { StatCard } from "@/components/dashboard/stat-card";
import {
	formatDateTimeLabel,
	formatLocationLabel,
	formatRequirementStatusLabel,
	formatScorePairLabel,
	getRequirementStatusClassName
} from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { type AuditorSummary, type ManagerPlaceRow, playspaceApi } from "@/lib/api/playspace";
import { cn } from "@/lib/utils";

function getErrorMessage(error: unknown, fallbackMessage: string): string {
	if (error instanceof Error) {
		return error.message;
	}

	return fallbackMessage;
}

/** Valid axis-level statuses for place_audit_status / place_survey_status filters. */
const PLACE_AXIS_STATUSES = ["not_started", "in_progress", "submitted"] as const;

const MANAGER_PLACES_SKELETON_IDS = [
	"manager-places-skeleton-1",
	"manager-places-skeleton-2",
	"manager-places-skeleton-3",
	"manager-places-skeleton-4"
] as const;

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

export default function ManagerPlacesPage() {
	const t = useTranslations("manager.places");
	const formatT = useTranslations("common.format");
	const session = useAuthSession();
	const accountId = session?.role === "manager" ? session.accountId : null;
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "last_audited_at", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	});
	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedAuditorIds, setSelectedAuditorIds] = React.useState<string[]>([]);
	const [selectedAuditStatuses, setSelectedAuditStatuses] = React.useState<string[]>([]);
	const [selectedSurveyStatuses, setSelectedSurveyStatuses] = React.useState<string[]>([]);

	const searchValue = getTextColumnFilterValue(columnFilters, "name");
	const selectedProjectIdsKey = selectedProjectIds.join("|");
	const selectedAuditorIdsKey = selectedAuditorIds.join("|");
	const selectedAuditStatusesKey = selectedAuditStatuses.join("|");
	const selectedSurveyStatusesKey = selectedSurveyStatuses.join("|");
	const sortParam = toBackendSortParam(sorting);

	const [prevDeps, setPrevDeps] = React.useState({
		searchValue,
		selectedProjectIdsKey,
		selectedAuditorIdsKey,
		selectedAuditStatusesKey,
		selectedSurveyStatusesKey,
		sortParam
	});
	if (
		searchValue !== prevDeps.searchValue ||
		selectedProjectIdsKey !== prevDeps.selectedProjectIdsKey ||
		selectedAuditorIdsKey !== prevDeps.selectedAuditorIdsKey ||
		selectedAuditStatusesKey !== prevDeps.selectedAuditStatusesKey ||
		selectedSurveyStatusesKey !== prevDeps.selectedSurveyStatusesKey ||
		sortParam !== prevDeps.sortParam
	) {
		setPrevDeps({
			searchValue,
			selectedProjectIdsKey,
			selectedAuditorIdsKey,
			selectedAuditStatusesKey,
			selectedSurveyStatusesKey,
			sortParam
		});
		setPagination(currentValue =>
			currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 }
		);
	}

	const projectsQuery = useQuery({
		queryKey: ["playspace", "manager", "places", "projects", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error(t("errors.accountContextUnavailable"));
			}

			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null
	});

	const auditorsQuery = useQuery({
		queryKey: ["playspace", "manager", "auditors", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error(t("errors.accountContextUnavailable"));
			}
			return playspaceApi.accounts.auditors(accountId);
		},
		enabled: accountId !== null
	});

	const placesQuery = useQuery({
		queryKey: [
			"playspace",
			"manager",
			"places",
			accountId,
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			selectedProjectIds,
			selectedAuditorIds,
			selectedAuditStatuses,
			selectedSurveyStatuses
		],
		queryFn: async () => {
			if (!accountId) {
				throw new Error(t("errors.accountContextUnavailable"));
			}

			return playspaceApi.accounts.places(accountId, {
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				projectIds: selectedProjectIds,
				auditorIds: selectedAuditorIds,
				auditStatuses: selectedAuditStatuses,
				surveyStatuses: selectedSurveyStatuses
			});
		},
		enabled: accountId !== null,
		placeholderData: preservePreviousData
	});

	const [prevData, setPrevData] = React.useState(placesQuery.data);
	if (placesQuery.data && placesQuery.data !== prevData) {
		setPrevData(placesQuery.data);
		const maxPageIndex = Math.max(placesQuery.data.total_pages - 1, 0);
		if (pagination.pageIndex > maxPageIndex) {
			setPagination(currentValue => ({ ...currentValue, pageIndex: maxPageIndex }));
		}
	}

	const projectOptions = React.useMemo(() => {
		return (projectsQuery.data ?? []).map(p => ({ label: p.name, value: p.id }));
	}, [projectsQuery.data]);

	const auditorOptions = React.useMemo(() => {
		return (auditorsQuery.data ?? []).map((a: AuditorSummary) => ({
			label: `${a.auditor_code} · ${a.full_name}`,
			value: a.id
		}));
	}, [auditorsQuery.data]);

	const axisStatusOptions = React.useMemo(
		() =>
			PLACE_AXIS_STATUSES.map(status => ({
				label: formatRequirementStatusLabel(status, formatT),
				value: status
			})),
		[formatT]
	);

	const columns = React.useMemo<ColumnDef<ManagerPlaceRow>[]>(
		() => [
			{
				id: "name",
				accessorFn: row =>
					`${row.name} ${row.project_name} ${row.address ?? ""} ${formatLocationLabel(row, formatT)}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.place")} />,
				cell: ({ row }) => (
					<div className="min-w-[280px] space-y-1">
						<Link
							href={`/manager/places/${encodeURIComponent(row.original.id)}?projectId=${encodeURIComponent(row.original.project_id)}`}
							className="font-medium text-foreground transition-colors hover:text-primary">
							{row.original.name}
						</Link>
						<p className="text-sm text-muted-foreground">{row.original.project_name}</p>
						{row.original.address && (
							<p className="text-xs text-muted-foreground">{row.original.address}</p>
						)}
						<p className="text-sm text-muted-foreground">{formatLocationLabel(row.original, formatT)}</p>
					</div>
				),
				enableHiding: false
			},
			{
				id: "project_id",
				accessorFn: row => row.project_id,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.project")} />,
				filterFn: getMultiValueFilterFn<ManagerPlaceRow>(),
				cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.project_name}</span>
			},
			{
				id: "place_axes",
				accessorFn: (row: ManagerPlaceRow) => [row.place_audit_status, row.place_survey_status],
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.status")} />,
				cell: ({ row }) => (
					<div className="flex min-w-[180px] flex-wrap gap-1.5">
						<Badge
							variant="outline"
							className={cn(
								getRequirementStatusClassName(row.original.place_audit_status),
								"font-medium tracking-[0.14em] uppercase"
							)}>
							{`A ${formatRequirementStatusLabel(row.original.place_audit_status, formatT)}`}
						</Badge>
						<Badge
							variant="outline"
							className={cn(
								getRequirementStatusClassName(row.original.place_survey_status),
								"font-medium tracking-[0.14em] uppercase"
							)}>
							{`S ${formatRequirementStatusLabel(row.original.place_survey_status, formatT)}`}
						</Badge>
					</div>
				)
			},
			{
				accessorKey: "audits_completed",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.audits")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.audits_completed}</span>
				)
			},
			{
				accessorKey: "overall_scores",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.meanScore")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono text-foreground tabular-nums">
						{formatScorePairLabel(row.original.overall_scores, formatT)}
					</span>
				)
			},
			{
				accessorKey: "last_audited_at",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.lastAudited")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.last_audited_at, formatT)}
					</span>
				)
			},
			{
				id: "actions",
				enableSorting: false,
				enableHiding: false,
				cell: ({ row }) => (
					<EntityRowActions
						actions={[
							{
								label: t("table.actions.openPlace"),
								href: `/manager/places/${encodeURIComponent(row.original.id)}?projectId=${encodeURIComponent(row.original.project_id)}`,
								icon: MapPinnedIcon
							},
							{
								label: t("table.actions.openProject"),
								href: `/manager/projects/${encodeURIComponent(row.original.project_id)}`,
								icon: FolderKanbanIcon
							}
						]}
					/>
				)
			}
		],
		[formatT, t]
	);

	if (!accountId) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={t("header.eyebrow")}
					title={t("header.title")}
					description={t("header.loadingDescription")}
					breadcrumbs={[
						{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
						{ label: t("breadcrumbs.places") }
					]}
				/>
				<Card>
					<CardContent className="py-8">
						<p className="text-sm text-muted-foreground">{t("missingAccount")}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const isInitialLoading =
		(projectsQuery.isLoading && !projectsQuery.data) || (placesQuery.isLoading && !placesQuery.data);

	if (isInitialLoading) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={t("header.eyebrow")}
					title={t("header.title")}
					description={t("header.loadingDescription")}
					breadcrumbs={[
						{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
						{ label: t("breadcrumbs.places") }
					]}
				/>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{MANAGER_PLACES_SKELETON_IDS.map(skeletonId => (
						<div
							key={skeletonId}
							className="h-32 animate-pulse rounded-card border border-edge/40 bg-card"
						/>
					))}
				</div>
				<div className="h-[420px] animate-pulse rounded-card border border-edge/40 bg-card" />
			</div>
		);
	}

	if (
		(projectsQuery.isError && !projectsQuery.data) ||
		(placesQuery.isError && !placesQuery.data) ||
		!placesQuery.data ||
		!projectsQuery.data
	) {
		return (
			<EmptyState
				title={t("error.title")}
				description={getErrorMessage(projectsQuery.error ?? placesQuery.error, t("error.description"))}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("actions.tryAgain")}
					</Button>
				}
			/>
		);
	}

	const places = placesQuery.data.items;
	const meanScore = formatScorePairLabel(placesQuery.data.summary.overall_scores, formatT);

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
					{ label: t("breadcrumbs.places") }
				]}
			/>
			<Card className="border-primary/25 bg-primary/5">
				<CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<p className="font-medium text-foreground">{t("addPlaceCallout.title")}</p>
						<p className="text-sm text-muted-foreground">{t("addPlaceCallout.description")}</p>
					</div>
					<Button asChild>
						<Link href="/manager/projects">{t("addPlaceCallout.action")}</Link>
					</Button>
				</CardContent>
			</Card>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.totalPlaces.title")}
					value={String(placesQuery.data.summary.total_places)}
					helper={t("stats.totalPlaces.helper")}
					tone="primary"
				/>
				<StatCard
					title={t("stats.submitted.title")}
					value={String(placesQuery.data.summary.completed_place_audits)}
					helper={t("stats.submitted.helper")}
					tone="success"
				/>
				<StatCard
					title={t("stats.inProgress.title")}
					value={String(placesQuery.data.summary.completed_place_surveys)}
					helper={t("stats.inProgress.helper")}
					tone="warning"
				/>
				<StatCard title="Overall PV/U" value={meanScore} helper={t("stats.meanScore.helper")} tone="info" />
			</div>
			<DataTable
				title={t("table.title")}
				description={t("table.description")}
				columns={columns}
				data={places}
				searchColumnId="name"
				searchPlaceholder={t("table.searchPlaceholder")}
				filterConfigs={[]}
				toolbarExtra={
					<>
						<FilterPopover
							title="Projects"
							options={projectOptions}
							selectedValues={selectedProjectIds}
							onChange={setSelectedProjectIds}
						/>
						<FilterPopover
							title="Auditors"
							options={auditorOptions}
							selectedValues={selectedAuditorIds}
							onChange={setSelectedAuditorIds}
						/>
						<FilterPopover
							title="Audit Status"
							options={axisStatusOptions}
							selectedValues={selectedAuditStatuses}
							onChange={setSelectedAuditStatuses}
						/>
						<FilterPopover
							title="Survey Status"
							options={axisStatusOptions}
							selectedValues={selectedSurveyStatuses}
							onChange={setSelectedSurveyStatuses}
						/>
						{(selectedProjectIds.length > 0 ||
							selectedAuditorIds.length > 0 ||
							selectedAuditStatuses.length > 0 ||
							selectedSurveyStatuses.length > 0) && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => {
									setSelectedProjectIds([]);
									setSelectedAuditorIds([]);
									setSelectedAuditStatuses([]);
									setSelectedSurveyStatuses([]);
								}}>
								<XIcon className="size-3.5" />
								Clear filters
							</Button>
						)}
					</>
				}
				emptyMessage={
					placesQuery.data.total_count === 0
						? t("table.emptyState.noPlaces")
						: t("table.emptyState.noMatches")
				}
				initialSorting={[{ id: "last_audited_at", desc: true }]}
				sortingState={sorting}
				onSortingStateChange={setSorting}
				columnFiltersState={columnFilters}
				onColumnFiltersStateChange={setColumnFilters}
				paginationState={pagination}
				onPaginationStateChange={setPagination}
				manualFiltering
				manualSorting
				manualPagination
				rowCount={placesQuery.data.total_count}
				pageCount={placesQuery.data.total_pages}
				isFetching={placesQuery.isFetching}
			/>
		</div>
	);
}
