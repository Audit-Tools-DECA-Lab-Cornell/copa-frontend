"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DataTable } from "@/components/dashboard/data-table";
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import {
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import { formatDateTimeLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	type AdminAccountRow,
	type AdminAuditorRow,
	type AdminPlaceRow,
	type AdminProjectRow,
	type PaginatedResponse,
	playspaceApi
} from "@/lib/api/playspace";

export default function AdminAuditorsPage() {
	const t = useTranslations("admin.auditors");
	const formatT = useTranslations("common.format");
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "last_active_at", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	});
	const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);
	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);

	const searchValue = getTextColumnFilterValue(columnFilters, "auditor_code");
	const selectedAccountIdsKey = selectedAccountIds.join("|");
	const selectedProjectIdsKey = selectedProjectIds.join("|");
	const selectedPlaceIdsKey = selectedPlaceIds.join("|");
	const sortParam = toBackendSortParam(sorting);

	const [prevDeps, setPrevDeps] = React.useState({
		searchValue,
		selectedAccountIdsKey,
		selectedProjectIdsKey,
		selectedPlaceIdsKey,
		sortParam
	});
	if (
		searchValue !== prevDeps.searchValue ||
		selectedAccountIdsKey !== prevDeps.selectedAccountIdsKey ||
		selectedProjectIdsKey !== prevDeps.selectedProjectIdsKey ||
		selectedPlaceIdsKey !== prevDeps.selectedPlaceIdsKey ||
		sortParam !== prevDeps.sortParam
	) {
		setPrevDeps({ searchValue, selectedAccountIdsKey, selectedProjectIdsKey, selectedPlaceIdsKey, sortParam });
		setPagination(currentValue =>
			currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 }
		);
	}

	const accountsQuery = useQuery({
		queryKey: ["playspace", "admin", "auditors", "accounts-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminAccountRow>> =>
			playspaceApi.admin.accounts({ page: 1, pageSize: 100, accountTypes: ["MANAGER"] })
	});

	const projectsQuery = useQuery({
		queryKey: ["playspace", "admin", "auditors", "projects-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminProjectRow>> =>
			playspaceApi.admin.projects({ page: 1, pageSize: 100 })
	});

	const placesQuery = useQuery({
		queryKey: ["playspace", "admin", "auditors", "places-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminPlaceRow>> =>
			playspaceApi.admin.places({ page: 1, pageSize: 100 })
	});

	const auditorsQuery = useQuery({
		queryKey: [
			"playspace",
			"admin",
			"auditors",
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			selectedAccountIds,
			selectedProjectIds,
			selectedPlaceIds
		],
		queryFn: () =>
			playspaceApi.admin.auditors({
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				accountIds: selectedAccountIds,
				projectIds: selectedProjectIds,
				placeIds: selectedPlaceIds
			}),
		placeholderData: preservePreviousData
	});

	const [prevData, setPrevData] = React.useState(auditorsQuery.data);
	if (auditorsQuery.data && auditorsQuery.data !== prevData) {
		setPrevData(auditorsQuery.data);
		const maxPageIndex = Math.max(auditorsQuery.data.total_pages - 1, 0);
		if (pagination.pageIndex > maxPageIndex) {
			setPagination(currentValue => ({ ...currentValue, pageIndex: maxPageIndex }));
		}
	}

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

	const placeOptions = React.useMemo(() => {
		return (placesQuery.data?.items ?? []).map((p: AdminPlaceRow) => ({
			label: p.name,
			value: p.place_id
		}));
	}, [placesQuery.data]);

	const hasActiveFilters =
		selectedAccountIds.length > 0 || selectedProjectIds.length > 0 || selectedPlaceIds.length > 0;

	function clearAllFilters(): void {
		setSelectedAccountIds([]);
		setSelectedProjectIds([]);
		setSelectedPlaceIds([]);
	}

	const isInitialLoading = auditorsQuery.isLoading && !auditorsQuery.data;

	const columns = React.useMemo<ColumnDef<AdminAuditorRow>[]>(
		() => [
			{
				id: "auditor_code",
				accessorFn: row => `${row.auditor_code} ${row.email_masked ?? ""}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.auditor")} />,
				cell: ({ row }) => (
					<div className="min-w-[220px] space-y-1">
						<Badge variant="outline" className="font-mono text-primary uppercase tracking-[0.14em]">
							{row.original.auditor_code}
						</Badge>
					</div>
				),
				enableHiding: false
			},
			{
				accessorKey: "assignments_count",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.assignments")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.assignments_count}</span>
				)
			},
			{
				accessorKey: "completed_audits",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.completed")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.completed_audits}</span>
				)
			},
			{
				accessorKey: "last_active_at",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.lastActive")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.last_active_at, formatT)}
					</span>
				)
			}
		],
		[formatT, t]
	);

	if (isInitialLoading) {
		return <div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />;
	}

	if ((auditorsQuery.isError && !auditorsQuery.data) || !auditorsQuery.data) {
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

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
					{ label: t("breadcrumbs.auditors") }
				]}
			/>
			<DataTable
				title={t("table.title")}
				description={t("table.description")}
				columns={columns}
				data={auditorsQuery.data.items}
				searchColumnId="auditor_code"
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
							title="Places"
							options={placeOptions}
							selectedValues={selectedPlaceIds}
							onChange={setSelectedPlaceIds}
						/>
						{hasActiveFilters && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={clearAllFilters}>
								<XIcon className="size-3.5" />
								Clear filters
							</Button>
						)}
					</>
				}
				initialSorting={[{ id: "last_active_at", desc: true }]}
				sortingState={sorting}
				onSortingStateChange={setSorting}
				columnFiltersState={columnFilters}
				onColumnFiltersStateChange={setColumnFilters}
				paginationState={pagination}
				onPaginationStateChange={setPagination}
				manualFiltering
				manualSorting
				manualPagination
				rowCount={auditorsQuery.data.total_count}
				pageCount={auditorsQuery.data.total_pages}
				isFetching={auditorsQuery.isFetching}
			/>
		</div>
	);
}
