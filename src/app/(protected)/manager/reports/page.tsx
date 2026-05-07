"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { FileTextIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { playspaceApi, type AuditorSummary, type ManagerPlaceRow } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { AuditsTable, type AuditActivityRow } from "@/components/dashboard/audits-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import {
	getTextColumnFilterValue,
	preservePreviousData,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ManagerReportsPage() {
	const session = useAuthSession();
	const router = useRouter();
	const accountId = session?.role === "manager" ? session.accountId : null;

	const [sorting, setSorting] = React.useState<SortingState>([{ id: "submitted_at", desc: true }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10
	});

	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedAuditorIds, setSelectedAuditorIds] = React.useState<string[]>([]);
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);

	const searchValue = getTextColumnFilterValue(columnFilters, "audit_code");
	const selectedProjectIdsKey = selectedProjectIds.join("|");
	const selectedAuditorIdsKey = selectedAuditorIds.join("|");
	const selectedPlaceIdsKey = selectedPlaceIds.join("|");
	const sortParam = toBackendSortParam(sorting);

	React.useEffect(() => {
		setPagination(currentValue => {
			return currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 };
		});
	}, [searchValue, selectedProjectIdsKey, selectedAuditorIdsKey, selectedPlaceIdsKey, sortParam]);

	const projectsQuery = useQuery({
		queryKey: ["playspace", "manager", "reports", "projects", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null
	});

	const placesQuery = useQuery({
		queryKey: ["playspace", "manager", "reports", "places", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.places(accountId, { page: 1, pageSize: 200 });
		},
		enabled: accountId !== null
	});

	const auditorsQuery = useQuery({
		queryKey: ["playspace", "manager", "reports", "auditors", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.auditors(accountId);
		},
		enabled: accountId !== null
	});

	const reportsQuery = useQuery({
		queryKey: [
			"playspace",
			"manager",
			"reports",
			accountId,
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			selectedProjectIds,
			selectedAuditorIds,
			selectedPlaceIds
		],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.audits(accountId, {
				statuses: ["SUBMITTED"],
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				projectIds: selectedProjectIds,
				auditorIds: selectedAuditorIds,
				placeIds: selectedPlaceIds
			});
		},
		enabled: accountId !== null,
		placeholderData: preservePreviousData
	});

	React.useEffect(() => {
		if (!reportsQuery.data) {
			return;
		}

		const maxPageIndex = Math.max(reportsQuery.data.total_pages - 1, 0);
		if (pagination.pageIndex <= maxPageIndex) {
			return;
		}

		setPagination(currentValue => ({
			...currentValue,
			pageIndex: maxPageIndex
		}));
	}, [reportsQuery.data, pagination.pageIndex]);

	const projectOptions = React.useMemo(() => {
		return (projectsQuery.data ?? []).map(p => ({ label: p.name, value: p.id }));
	}, [projectsQuery.data]);

	const placeOptions = React.useMemo(() => {
		return (placesQuery.data?.items ?? []).map((p: ManagerPlaceRow) => ({
			label: p.name,
			value: p.id
		}));
	}, [placesQuery.data]);

	const auditorOptions = React.useMemo(() => {
		return (auditorsQuery.data ?? []).map((a: AuditorSummary) => ({
			label: `${a.auditor_code} · ${a.full_name}`,
			value: a.id
		}));
	}, [auditorsQuery.data]);

	const hasActiveFilters =
		selectedProjectIds.length > 0 || selectedAuditorIds.length > 0 || selectedPlaceIds.length > 0;

	function clearAllFilters(): void {
		setSelectedProjectIds([]);
		setSelectedAuditorIds([]);
		setSelectedPlaceIds([]);
	}

	if (!accountId) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow="Manager Workspace"
					title="Audit Reports"
					description="View submitted audit reports from your auditors."
					breadcrumbs={[
						{ label: "Dashboard", href: "/manager/dashboard" },
						{ label: "Auditors", href: "/manager/auditors" },
						{ label: "Reports" }
					]}
				/>
				<Card>
					<CardContent className="py-8">
						<p className="text-sm text-muted-foreground">
							Manager account context is missing from the current session.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const isInitialLoading = reportsQuery.isLoading && !reportsQuery.data;

	if (isInitialLoading) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow="Manager Workspace"
					title="Audit Reports"
					description="View submitted audit reports from your auditors."
					breadcrumbs={[
						{ label: "Dashboard", href: "/manager/dashboard" },
						{ label: "Auditors", href: "/manager/auditors" },
						{ label: "Reports" }
					]}
				/>
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
				title="Reports unavailable"
				description="Unable to load audit reports. Refresh and try again."
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						Try again
					</Button>
				}
			/>
		);
	}

	const data = reportsQuery.data;
	const rows: AuditActivityRow[] =
		data?.items.map(audit => ({
			id: audit.audit_id,
			auditCode: audit.audit_code,
			status: audit.status,
			auditorCode: audit.auditor_code,
			placeName: audit.place_name,
			placeId: audit.place_id,
			projectName: audit.project_name,
			projectId: audit.project_id,
			accountName: null,
			executionMode: audit.execution_mode,
			startedAt: audit.started_at,
			submittedAt: audit.submitted_at,
			score: audit.summary_score,
			scorePair: audit.score_pair
		})) ?? [];

	const totalSubmitted = data?.summary.submitted_audits;
	const averageScore = data?.summary.average_scores;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow="Manager Workspace"
				title="Audit Reports"
				description="View submitted audit reports from your auditors."
				breadcrumbs={[
					{ label: "Dashboard", href: "/manager/dashboard" },
					{ label: "Auditors", href: "/manager/auditors" },
					{ label: "Reports" }
				]}
			/>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Total Reports"
					value={String(totalSubmitted)}
					helper="Submitted audits ready for review."
				/>
				<StatCard
					title="Average Score"
					value={averageScore ? `PV ${averageScore.pv} | U ${averageScore.u}` : "Pending"}
					helper="Mean score across all submitted audits."
				/>
				<StatCard
					title="Auditors"
					value={String(new Set(data?.items.map(a => a.auditor_code)).size)}
					helper="Unique auditors with submitted reports."
				/>
				<StatCard
					title="Places"
					value={String(new Set(data?.items.map(a => a.place_id)).size)}
					helper="Unique places with submitted audits."
				/>
			</div>
			<AuditsTable
				rows={rows}
				basePath="/manager/reports"
				title="Submitted Audit Reports"
				description="Browse completed audit reports. Click on a row to view details."
				emptyMessage="No submitted audit reports yet."
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
				onRowClick={row => {
					router.push(`/manager/reports/${row.id}`);
				}}
				getRowActions={row => [
					{
						label: "View Report",
						onSelect: () => router.push(`/manager/reports/${row.id}`),
						icon: FileTextIcon
					}
				]}
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
