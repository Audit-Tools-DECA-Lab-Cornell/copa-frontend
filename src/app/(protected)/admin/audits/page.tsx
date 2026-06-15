"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { type AuditActivityRow, AuditsTable } from "@/components/dashboard/audits-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import {
	getMultiValueColumnFilter,
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import { Button } from "@/components/ui/button";
import {
	type AdminAccountRow,
	type AdminAuditorRow,
	type AdminPlaceRow,
	type AdminProjectRow,
	type PaginatedResponse,
	playspaceApi
} from "@/lib/api/playspace";

export default function AdminAuditsPage() {
	const t = useTranslations("admin.audits");
	const router = useRouter();
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "submitted_at", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	});
	const searchValue = getTextColumnFilterValue(columnFilters, "audit_code");
	const selectedStatuses = getMultiValueColumnFilter(columnFilters, "status").filter(
		(value): value is "IN_PROGRESS" | "PAUSED" | "SUBMITTED" =>
			value === "IN_PROGRESS" || value === "PAUSED" || value === "SUBMITTED"
	);
	const selectedStatusesKey = selectedStatuses.join("|");
	const sortParam = toBackendSortParam(sorting);

	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);
	const [selectedAuditorIds, setSelectedAuditorIds] = React.useState<string[]>([]);
	const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);

	const selectedProjectIdsKey = selectedProjectIds.join("|");
	const selectedPlaceIdsKey = selectedPlaceIds.join("|");
	const selectedAuditorIdsKey = selectedAuditorIds.join("|");
	const selectedAccountIdsKey = selectedAccountIds.join("|");

	const [prevDeps, setPrevDeps] = React.useState({
		searchValue,
		selectedStatusesKey,
		selectedProjectIdsKey,
		selectedPlaceIdsKey,
		selectedAuditorIdsKey,
		selectedAccountIdsKey,
		sortParam
	});
	if (
		searchValue !== prevDeps.searchValue ||
		selectedStatusesKey !== prevDeps.selectedStatusesKey ||
		selectedProjectIdsKey !== prevDeps.selectedProjectIdsKey ||
		selectedPlaceIdsKey !== prevDeps.selectedPlaceIdsKey ||
		selectedAuditorIdsKey !== prevDeps.selectedAuditorIdsKey ||
		selectedAccountIdsKey !== prevDeps.selectedAccountIdsKey ||
		sortParam !== prevDeps.sortParam
	) {
		setPrevDeps({
			searchValue,
			selectedStatusesKey,
			selectedProjectIdsKey,
			selectedPlaceIdsKey,
			selectedAuditorIdsKey,
			selectedAccountIdsKey,
			sortParam
		});
		setPagination(currentValue =>
			currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 }
		);
	}

	const projectsQuery = useQuery({
		queryKey: ["playspace", "admin", "audits", "projects-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminProjectRow>> =>
			playspaceApi.admin.projects({ page: 1, pageSize: 100 })
	});

	const placesQuery = useQuery({
		queryKey: ["playspace", "admin", "audits", "places-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminPlaceRow>> =>
			playspaceApi.admin.places({ page: 1, pageSize: 100 })
	});

	const auditorsQuery = useQuery({
		queryKey: ["playspace", "admin", "audits", "auditors-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminAuditorRow>> =>
			playspaceApi.admin.auditors({ page: 1, pageSize: 100 })
	});

	const accountsQuery = useQuery({
		queryKey: ["playspace", "admin", "audits", "accounts-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminAccountRow>> =>
			playspaceApi.admin.accounts({ page: 1, pageSize: 100, accountTypes: ["MANAGER"] })
	});

	const auditsQuery = useQuery({
		queryKey: [
			"playspace",
			"admin",
			"audits",
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			selectedStatuses,
			selectedProjectIds,
			selectedPlaceIds,
			selectedAuditorIds,
			selectedAccountIds
		],
		queryFn: () =>
			playspaceApi.admin.audits({
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				projectIds: selectedProjectIds,
				placeIds: selectedPlaceIds,
				auditorIds: selectedAuditorIds,
				accountIds: selectedAccountIds,
				statuses: selectedStatuses
			}),
		placeholderData: preservePreviousData
	});

	const [prevData, setPrevData] = React.useState(auditsQuery.data);
	if (auditsQuery.data && auditsQuery.data !== prevData) {
		setPrevData(auditsQuery.data);
		const maxPageIndex = Math.max(auditsQuery.data.total_pages - 1, 0);
		if (pagination.pageIndex > maxPageIndex) {
			setPagination(currentValue => ({ ...currentValue, pageIndex: maxPageIndex }));
		}
	}

	const projectOptions = React.useMemo(() => {
		return (projectsQuery.data?.items ?? []).map((p: AdminProjectRow) => ({
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

	/** Admin auditors filter shows auditor code only - no personal details. */
	const auditorOptions = React.useMemo(() => {
		return (auditorsQuery.data?.items ?? []).map((a: AdminAuditorRow) => ({
			label: a.auditor_code,
			value: a.auditor_profile_id
		}));
	}, [auditorsQuery.data]);

	const accountOptions = React.useMemo(() => {
		return (accountsQuery.data?.items ?? []).map((a: AdminAccountRow) => ({
			label: a.name,
			value: a.account_id
		}));
	}, [accountsQuery.data]);

	const hasActiveFilters =
		selectedProjectIds.length > 0 ||
		selectedPlaceIds.length > 0 ||
		selectedAuditorIds.length > 0 ||
		selectedAccountIds.length > 0;

	function clearAllFilters(): void {
		setSelectedProjectIds([]);
		setSelectedPlaceIds([]);
		setSelectedAuditorIds([]);
		setSelectedAccountIds([]);
	}

	const handleRowClick = React.useCallback(
		(row: AuditActivityRow) => {
			router.push(`/admin/audits/${row.id}`);
		},
		[router]
	);

	const isInitialLoading = auditsQuery.isLoading && !auditsQuery.data;

	if (isInitialLoading) {
		return <div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />;
	}

	if ((auditsQuery.isError && !auditsQuery.data) || !auditsQuery.data) {
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
					{ label: t("breadcrumbs.audits") }
				]}
			/>
			<AuditsTable
				rows={auditsQuery.data.items.map(audit => ({
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
				}))}
				basePath="/admin/audits"
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
				rowCount={auditsQuery.data.total_count}
				pageCount={auditsQuery.data.total_pages}
				isFetching={auditsQuery.isFetching}
				onRowClick={handleRowClick}
				toolbarExtra={
					<>
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
						<FilterPopover
							title="Auditors"
							options={auditorOptions}
							selectedValues={selectedAuditorIds}
							onChange={setSelectedAuditorIds}
						/>
						<FilterPopover
							title="Managers"
							options={accountOptions}
							selectedValues={selectedAccountIds}
							onChange={setSelectedAccountIds}
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
			/>
		</div>
	);
}
