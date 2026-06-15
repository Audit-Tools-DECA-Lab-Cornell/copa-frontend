"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import * as React from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DataTable, getMultiValueFilterFn } from "@/components/dashboard/data-table";
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
	getMultiValueColumnFilter,
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import { formatDateTimeLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type AdminAccountRow, playspaceApi } from "@/lib/api/playspace";

export default function AdminAccountsPage() {
	const t = useTranslations("admin.accounts");
	const formatT = useTranslations("common.format");
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "created_at", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	});
	const searchValue = getTextColumnFilterValue(columnFilters, "name");
	const selectedAccountTypes = getMultiValueColumnFilter(columnFilters, "account_type").filter(
		(value): value is "ADMIN" | "MANAGER" | "AUDITOR" =>
			value === "ADMIN" || value === "MANAGER" || value === "AUDITOR"
	);
	const selectedAccountTypesKey = selectedAccountTypes.join("|");
	const sortParam = toBackendSortParam(sorting);

	const [prevDeps, setPrevDeps] = React.useState({ searchValue, selectedAccountTypesKey, sortParam });
	if (
		searchValue !== prevDeps.searchValue ||
		selectedAccountTypesKey !== prevDeps.selectedAccountTypesKey ||
		sortParam !== prevDeps.sortParam
	) {
		setPrevDeps({ searchValue, selectedAccountTypesKey, sortParam });
		setPagination(currentValue =>
			currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 }
		);
	}

	const accountsQuery = useQuery({
		queryKey: [
			"playspace",
			"admin",
			"accounts",
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			selectedAccountTypes
		],
		queryFn: () =>
			playspaceApi.admin.accounts({
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				accountTypes: selectedAccountTypes
			}),
		placeholderData: preservePreviousData
	});

	const [prevData, setPrevData] = React.useState(accountsQuery.data);
	if (accountsQuery.data && accountsQuery.data !== prevData) {
		setPrevData(accountsQuery.data);
		const maxPageIndex = Math.max(accountsQuery.data.total_pages - 1, 0);
		if (pagination.pageIndex > maxPageIndex) {
			setPagination(currentValue => ({ ...currentValue, pageIndex: maxPageIndex }));
		}
	}

	const isInitialLoading = accountsQuery.isLoading && !accountsQuery.data;

	const columns = React.useMemo<ColumnDef<AdminAccountRow>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.account")} />,
				cell: ({ row }) => (
					<div className="min-w-[220px] space-y-1">
						{row.original.account_type === "ADMIN" || row.original.account_type === "MANAGER" ? (
							<p className="font-medium text-foreground">{row.original.name}</p>
						) : (
							<p className="text-sm text-muted-foreground">{t("table.nameHidden")}</p>
						)}
					</div>
				)
			},
			{
				accessorKey: "account_type",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.columns.type")} />,
				filterFn: getMultiValueFilterFn<AdminAccountRow>(),
				cell: ({ row }) => (
					<Badge variant="secondary" className="font-medium tracking-[0.14em] uppercase">
						{row.original.account_type}
					</Badge>
				)
			},
			{
				accessorKey: "projects_count",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.projects")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.projects_count}</span>
				)
			},
			{
				accessorKey: "places_count",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.places")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.places_count}</span>
				)
			},
			{
				accessorKey: "auditors_count",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.auditors")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono tabular-nums">{row.original.auditors_count}</span>
				)
			},
			{
				accessorKey: "created_at",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.columns.created")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.created_at, formatT)}
					</span>
				)
			}
		],
		[formatT, t]
	);

	if (isInitialLoading) {
		return <div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />;
	}

	if ((accountsQuery.isError && !accountsQuery.data) || !accountsQuery.data) {
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
					{ label: t("breadcrumbs.accounts") }
				]}
			/>
			<DataTable
				title={t("table.title")}
				description={t("table.description")}
				columns={columns}
				data={accountsQuery.data.items}
				searchColumnId="name"
				searchPlaceholder={t("table.searchPlaceholder")}
				filterConfigs={[
					{
						columnId: "account_type",
						title: t("table.columns.type"),
						options: (["ADMIN", "MANAGER", "AUDITOR"] as const).map(accountType => ({
							label: accountType,
							value: accountType
						}))
					}
				]}
				emptyMessage={
					accountsQuery.data.total_count === 0 && columnFilters.length === 0
						? t("table.emptyMessage")
						: t("table.emptyMessage")
				}
				initialSorting={[{ id: "created_at", desc: true }]}
				sortingState={sorting}
				onSortingStateChange={setSorting}
				columnFiltersState={columnFilters}
				onColumnFiltersStateChange={setColumnFilters}
				paginationState={pagination}
				onPaginationStateChange={setPagination}
				manualFiltering
				manualSorting
				manualPagination
				rowCount={accountsQuery.data.total_count}
				pageCount={accountsQuery.data.total_pages}
				isFetching={accountsQuery.isFetching}
			/>
		</div>
	);
}
