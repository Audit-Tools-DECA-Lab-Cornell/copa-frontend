"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { FilterIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
	playspaceApi,
	type AdminAccountRow,
	type AdminPlaceRow,
	type AdminProjectRow,
	type PaginatedResponse
} from "@/lib/api/playspace";
import { DataTable } from "@/components/dashboard/data-table";
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import {
	formatDateTimeLabel,
	formatRequirementStatusLabel,
	formatScorePairLabel,
	getRequirementStatusClassName
} from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

/** Valid axis-level statuses for place_audit_status / place_survey_status filters. */
const PLACE_AXIS_STATUSES = ["not_started", "in_progress", "submitted"] as const;

function formatLocation(
	city: string | null,
	province: string | null,
	country: string | null,
	locationPendingLabel: string
): string {
	const parts = [city, province, country].filter((part): part is string => Boolean(part && part.trim().length > 0));
	return parts.length > 0 ? parts.join(", ") : locationPendingLabel;
}

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

export default function AdminPlacesPage() {
	const t = useTranslations("admin.places");
	const formatT = useTranslations("common.format");
	const router = useRouter();
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "last_audited_at", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	});
	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);
	const [selectedAuditStatuses, setSelectedAuditStatuses] = React.useState<string[]>([]);
	const [selectedSurveyStatuses, setSelectedSurveyStatuses] = React.useState<string[]>([]);

	const searchValue = getTextColumnFilterValue(columnFilters, "name");
	const selectedAccountIdsKey = selectedAccountIds.join("|");
	const selectedProjectIdsKey = selectedProjectIds.join("|");
	const selectedAuditStatusesKey = selectedAuditStatuses.join("|");
	const selectedSurveyStatusesKey = selectedSurveyStatuses.join("|");
	const sortParam = toBackendSortParam(sorting);

	React.useEffect(() => {
		setPagination(currentValue => {
			return currentValue.pageIndex === 0
				? currentValue
				: {
						...currentValue,
						pageIndex: 0
					};
		});
	}, [
		searchValue,
		selectedAccountIdsKey,
		selectedProjectIdsKey,
		selectedAuditStatusesKey,
		selectedSurveyStatusesKey,
		sortParam
	]);

	const accountsQuery = useQuery({
		queryKey: ["playspace", "admin", "places", "accounts-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminAccountRow>> =>
			playspaceApi.admin.accounts({ page: 1, pageSize: 100, accountTypes: ["MANAGER"] })
	});

	const projectsQuery = useQuery({
		queryKey: ["playspace", "admin", "projects-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminProjectRow>> =>
			playspaceApi.admin.projects({ page: 1, pageSize: 100 })
	});

	const placesQuery = useQuery({
		queryKey: [
			"playspace",
			"admin",
			"places",
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			selectedAccountIds,
			selectedProjectIds,
			selectedAuditStatuses,
			selectedSurveyStatuses
		],
		queryFn: () =>
			playspaceApi.admin.places({
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				accountIds: selectedAccountIds,
				projectIds: selectedProjectIds,
				auditStatuses: selectedAuditStatuses,
				surveyStatuses: selectedSurveyStatuses
			}),
		placeholderData: preservePreviousData
	});

	React.useEffect(() => {
		if (!placesQuery.data) {
			return;
		}

		const maxPageIndex = Math.max(placesQuery.data.total_pages - 1, 0);
		if (pagination.pageIndex <= maxPageIndex) {
			return;
		}

		setPagination(currentValue => ({
			...currentValue,
			pageIndex: maxPageIndex
		}));
	}, [pagination.pageIndex, placesQuery.data]);

	const accountOptions = React.useMemo(() => {
		return (accountsQuery.data?.items ?? []).map(a => ({
			label: a.name,
			value: a.account_id
		}));
	}, [accountsQuery.data]);

	const projectOptions = React.useMemo(() => {
		return (projectsQuery.data?.items ?? []).map(p => ({
			label: `${p.account_name} · ${p.name}`,
			value: p.project_id
		}));
	}, [projectsQuery.data]);

	const axisStatusOptions = React.useMemo(
		() =>
			PLACE_AXIS_STATUSES.map(status => ({
				label: formatRequirementStatusLabel(status, formatT),
				value: status
			})),
		[formatT]
	);

	const isInitialLoading = placesQuery.isLoading && !placesQuery.data;

	const columns = React.useMemo<ColumnDef<AdminPlaceRow>[]>(
		() => [
			{
				id: "name",
				accessorFn: row =>
					`${row.name} ${row.address ?? ""} ${row.project_name} ${row.account_name} ${formatLocation(row.city, row.province, row.country, formatT("locationPending"))}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.place")} />,
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
							{formatLocation(
								row.original.city,
								row.original.province,
								row.original.country,
								formatT("locationPending")
							)}
						</p>
					</div>
				),
				enableHiding: false
			},
			{
				id: "place_axes",
				accessorFn: (row: AdminPlaceRow) => [row.place_audit_status, row.place_survey_status],
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.status")} />,
				cell: ({ row }) => (
					<div className="flex min-w-[180px] flex-wrap gap-1.5">
						<Badge
							variant="outline"
							className={getRequirementStatusClassName(row.original.place_audit_status)}>
							{`A ${formatRequirementStatusLabel(row.original.place_audit_status, formatT)}`}
						</Badge>
						<Badge
							variant="outline"
							className={getRequirementStatusClassName(row.original.place_survey_status)}>
							{`S ${formatRequirementStatusLabel(row.original.place_survey_status, formatT)}`}
						</Badge>
					</div>
				)
			},
			{
				accessorKey: "audits_completed",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.completed")} align="end" />
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
					<DataTableColumnHeader column={column} title={t("table.columns.latestAudit")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.last_audited_at, formatT)}
					</span>
				)
			}
		],
		[formatT, t]
	);

	if (isInitialLoading) {
		return <div className="h-64 animate-pulse rounded-card border border-border bg-card" />;
	}

	if ((placesQuery.isError && !placesQuery.data) || !placesQuery.data) {
		return (
			<EmptyState
				title={t("error.title")}
				description={t("error.description")}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("error.retry")}
					</Button>
				}
			/>
		);
	}

	const hasActiveFilters =
		selectedAccountIds.length > 0 ||
		selectedProjectIds.length > 0 ||
		selectedAuditStatuses.length > 0 ||
		selectedSurveyStatuses.length > 0;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
					{ label: t("breadcrumbs.places") }
				]}
			/>
			<DataTable
				title={t("table.title")}
				description={t("table.description")}
				columns={columns}
				data={placesQuery.data.items}
				searchColumnId="name"
				searchPlaceholder={t("table.searchPlaceholder")}
				emptyMessage={t("table.emptyMessage")}
				filterConfigs={[]}
				toolbarExtra={
					<>
						<FilterPopover
							title="Managers"
							options={accountOptions}
							selectedValues={selectedAccountIds}
							onChange={setSelectedAccountIds}
						/>
						<FilterPopover
							title="Projects"
							options={projectOptions}
							selectedValues={selectedProjectIds}
							onChange={setSelectedProjectIds}
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
						{hasActiveFilters && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => {
									setSelectedAccountIds([]);
									setSelectedProjectIds([]);
									setSelectedAuditStatuses([]);
									setSelectedSurveyStatuses([]);
								}}>
								<XIcon className="size-3.5" />
								Clear filters
							</Button>
						)}
					</>
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
				onRowClick={(row: AdminPlaceRow) => {
					router.push(
						`/admin/places/${encodeURIComponent(row.place_id)}?projectId=${encodeURIComponent(row.project_id)}`
					);
				}}
			/>
		</div>
	);
}
