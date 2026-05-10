"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { ClipboardListIcon, MapPinnedIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { playspaceApi, type AuditorSummary, type ManagerPlaceRow } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { AuditsTable, type AuditActivityRow } from "@/components/dashboard/audits-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import {
	getMultiValueColumnFilter,
	preservePreviousData,
	getTextColumnFilterValue,
	toBackendSortParam
} from "@/components/dashboard/server-table-utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { formatScoreLabel } from "@/components/dashboard/utils";

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return "Unable to load manager audits.";
}

export default function ManagerAuditsPage() {
	const t = useTranslations("manager.audits");
	const formatT = useTranslations("common.format");
	const router = useRouter();
	const session = useAuthSession();
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
	const selectedStatuses = getMultiValueColumnFilter(columnFilters, "status").filter(
		(value): value is "IN_PROGRESS" | "PAUSED" | "SUBMITTED" =>
			value === "IN_PROGRESS" || value === "PAUSED" || value === "SUBMITTED"
	);
	const selectedStatusesKey = selectedStatuses.join("|");
	const selectedProjectIdsKey = selectedProjectIds.join("|");
	const selectedAuditorIdsKey = selectedAuditorIds.join("|");
	const selectedPlaceIdsKey = selectedPlaceIds.join("|");
	const sortParam = toBackendSortParam(sorting);

	const [prevDeps, setPrevDeps] = React.useState({
		searchValue,
		selectedStatusesKey,
		selectedProjectIdsKey,
		selectedAuditorIdsKey,
		selectedPlaceIdsKey,
		sortParam
	});
	if (
		searchValue !== prevDeps.searchValue ||
		selectedStatusesKey !== prevDeps.selectedStatusesKey ||
		selectedProjectIdsKey !== prevDeps.selectedProjectIdsKey ||
		selectedAuditorIdsKey !== prevDeps.selectedAuditorIdsKey ||
		selectedPlaceIdsKey !== prevDeps.selectedPlaceIdsKey ||
		sortParam !== prevDeps.sortParam
	) {
		setPrevDeps({
			searchValue,
			selectedStatusesKey,
			selectedProjectIdsKey,
			selectedAuditorIdsKey,
			selectedPlaceIdsKey,
			sortParam
		});
		setPagination(currentValue =>
			currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 }
		);
	}

	/** Fetch all projects for this manager account (used by the project filter). */
	const projectsQuery = useQuery({
		queryKey: ["playspace", "manager", "audits", "projects", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null
	});

	/** Fetch all places for this manager account (used by the place filter). */
	const placesQuery = useQuery({
		queryKey: ["playspace", "manager", "audits", "places", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.places(accountId, { page: 1, pageSize: 200 });
		},
		enabled: accountId !== null
	});

	/** Fetch all auditors for this manager account (used by the auditor filter). */
	const auditorsQuery = useQuery({
		queryKey: ["playspace", "manager", "auditors", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.auditors(accountId);
		},
		enabled: accountId !== null
	});

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

	const auditsQuery = useQuery({
		queryKey: [
			"playspace",
			"manager",
			"audits",
			accountId,
			pagination.pageIndex,
			pagination.pageSize,
			searchValue,
			sortParam,
			selectedStatuses,
			selectedProjectIds,
			selectedAuditorIds,
			selectedPlaceIds
		],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}

			return playspaceApi.accounts.audits(accountId, {
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
				search: searchValue,
				sort: sortParam,
				projectIds: selectedProjectIds,
				auditorIds: selectedAuditorIds,
				placeIds: selectedPlaceIds,
				statuses: selectedStatuses
			});
		},
		enabled: accountId !== null,
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

	if (!accountId) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={t("header.eyebrow")}
					title={t("header.title")}
					description={t("header.description")}
					breadcrumbs={[
						{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
						{ label: t("breadcrumbs.audits") }
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

	const isInitialLoading = auditsQuery.isLoading && !auditsQuery.data;

	if (isInitialLoading) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={t("header.eyebrow")}
					title={t("header.title")}
					description={t("header.description")}
					breadcrumbs={[
						{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
						{ label: t("breadcrumbs.audits") }
					]}
				/>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={`audit-stat-skeleton-${index}`}
							className="h-32 animate-pulse rounded-card border border-border bg-card"
						/>
					))}
				</div>
				<div className="h-[420px] animate-pulse rounded-card border border-border bg-card" />
			</div>
		);
	}

	if ((auditsQuery.isError && !auditsQuery.data) || !auditsQuery.data) {
		return (
			<EmptyState
				title={t("error.title")}
				description={getErrorMessage(auditsQuery.error)}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("error.retry")}
					</Button>
				}
			/>
		);
	}

	const audits = auditsQuery.data.items.map<AuditActivityRow>(audit => ({
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

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
					{ label: t("breadcrumbs.audits") }
				]}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Button asChild variant="outline">
							<Link href="/manager/places" className="gap-2">
								<MapPinnedIcon className="size-4" />
								<span>{t("header.actions.openPlaces")}</span>
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/manager/auditors" className="gap-2">
								<ClipboardListIcon className="size-4" />
								<span>{t("header.actions.manageAssignments")}</span>
							</Link>
						</Button>
					</div>
				}
			/>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.totalAudits.title")}
					value={String(auditsQuery.data.summary.total_audits)}
					helper={t("stats.totalAudits.helper")}
					tone="info"
				/>
				<StatCard
					title={t("stats.submitted.title")}
					value={String(auditsQuery.data.summary.submitted_audits)}
					helper={t("stats.submitted.helper")}
					tone="success"
				/>
				<StatCard
					title={t("stats.inProgress.title")}
					value={String(auditsQuery.data.summary.in_progress_audits)}
					helper={t("stats.inProgress.helper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.meanScore.title")}
					value={formatScoreLabel(auditsQuery.data.summary.average_score, formatT)}
					helper={t("stats.meanScore.helper")}
					tone="violet"
				/>
			</div>
			<AuditsTable
				rows={audits}
				basePath="/manager/audits"
				title={t("table.title")}
				description={t("table.description")}
				emptyMessage={
					auditsQuery.data.total_count === 0
						? t("table.emptyState.noAudits")
						: t("table.emptyState.noMatches")
				}
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
				onRowClick={row => {
					router.push(`/manager/audits/${row.id}`);
				}}
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
						{(selectedProjectIds.length > 0 ||
							selectedPlaceIds.length > 0 ||
							selectedAuditorIds.length > 0) && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => {
									setSelectedProjectIds([]);
									setSelectedPlaceIds([]);
									setSelectedAuditorIds([]);
								}}>
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
