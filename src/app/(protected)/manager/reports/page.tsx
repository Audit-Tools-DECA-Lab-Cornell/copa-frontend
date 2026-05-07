"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { XIcon } from "lucide-react";

import { playspaceApi, type AuditorSummary, type ManagerPlaceRow } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { GroupedReportsView } from "@/components/dashboard/grouped-reports-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import { getTextColumnFilterValue, preservePreviousData } from "@/components/dashboard/server-table-utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ManagerReportsPage() {
	const session = useAuthSession();
	const accountId = session?.role === "manager" ? session.accountId : null;

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedAuditorIds, setSelectedAuditorIds] = React.useState<string[]>([]);
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);

	const searchValue = getTextColumnFilterValue(columnFilters, "audit_code");

	const projectsQuery = useQuery({
		queryKey: ["playspace", "manager", "reports", "projects", accountId],
		queryFn: async () => {
			if (!accountId) throw new Error("Manager account context is unavailable.");
			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null
	});

	const placesQuery = useQuery({
		queryKey: ["playspace", "manager", "reports", "places", accountId],
		queryFn: async () => {
			if (!accountId) throw new Error("Manager account context is unavailable.");
			return playspaceApi.accounts.places(accountId, { page: 1, pageSize: 100 });
		},
		enabled: accountId !== null
	});

	const auditorsQuery = useQuery({
		queryKey: ["playspace", "manager", "reports", "auditors", accountId],
		queryFn: async () => {
			if (!accountId) throw new Error("Manager account context is unavailable.");
			return playspaceApi.accounts.auditors(accountId);
		},
		enabled: accountId !== null
	});

	const reportsQuery = useQuery({
		queryKey: [
			"playspace",
			"manager",
			"reports",
			"all",
			accountId,
			searchValue,
			selectedProjectIds,
			selectedAuditorIds,
			selectedPlaceIds
		],
		queryFn: async () => {
			if (!accountId) throw new Error("Manager account context is unavailable.");
			return playspaceApi.accounts.audits(accountId, {
				statuses: ["SUBMITTED"],
				page: 1,
				pageSize: 100,
				search: searchValue,
				projectIds: selectedProjectIds,
				auditorIds: selectedAuditorIds,
				placeIds: selectedPlaceIds
			});
		},
		enabled: accountId !== null,
		placeholderData: preservePreviousData
	});

	const projectOptions = React.useMemo(
		() => (projectsQuery.data ?? []).map(p => ({ label: p.name, value: p.id })),
		[projectsQuery.data]
	);
	const placeOptions = React.useMemo(
		() => (placesQuery.data?.items ?? []).map((p: ManagerPlaceRow) => ({ label: p.name, value: p.id })),
		[placesQuery.data]
	);
	const auditorOptions = React.useMemo(
		() =>
			(auditorsQuery.data ?? []).map((a: AuditorSummary) => ({
				label: `${a.auditor_code} · ${a.full_name}`,
				value: a.id
			})),
		[auditorsQuery.data]
	);

	const rows = React.useMemo(
		() =>
			(reportsQuery.data?.items ?? []).map(audit => ({
				id: audit.audit_id,
				auditCode: audit.audit_code,
				status: audit.status,
				auditorCode: audit.auditor_code,
				placeName: audit.place_name,
				placeId: audit.place_id,
				projectName: audit.project_name,
				projectId: audit.project_id,
				accountName: null as string | null,
				executionMode: audit.execution_mode,
				startedAt: audit.started_at,
				submittedAt: audit.submitted_at,
				score: audit.summary_score,
				scorePair: audit.score_pair
			})),
		[reportsQuery.data]
	);

	const hasActiveFilters =
		selectedProjectIds.length > 0 || selectedAuditorIds.length > 0 || selectedPlaceIds.length > 0;
	const data = reportsQuery.data;

	if (!accountId) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow="Manager Workspace"
					title="Audit Reports"
					description="View submitted audit reports from your auditors."
					breadcrumbs={[{ label: "Dashboard", href: "/manager/dashboard" }, { label: "Reports" }]}
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

	if (reportsQuery.isLoading && !reportsQuery.data) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow="Manager Workspace"
					title="Audit Reports"
					description="View submitted audit reports grouped by place."
					breadcrumbs={[{ label: "Dashboard", href: "/manager/dashboard" }, { label: "Reports" }]}
				/>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, idx) => (
						<div
							key={`stat-skeleton-${idx}`}
							className="h-32 animate-pulse rounded-card border border-border bg-card"
						/>
					))}
				</div>
				<div className="h-64 animate-pulse rounded-card border border-border bg-card" />
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

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow="Manager Workspace"
				title="Audit Reports"
				description="View submitted audit reports grouped by place. Select a place to build a combined report."
				breadcrumbs={[{ label: "Dashboard", href: "/manager/dashboard" }, { label: "Reports" }]}
			/>

			{/* Summary stats */}
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Total Reports"
					value={String(data?.summary.submitted_audits ?? 0)}
					helper="Submitted audits ready for review."
					tone="info"
				/>
				<StatCard
					title="Average Score"
					value={
						data?.summary.average_scores
							? `PV ${data.summary.average_scores.pv} | U ${data.summary.average_scores.u}`
							: "Pending"
					}
					helper="Mean score across all submitted audits."
					tone="success"
				/>
				<StatCard
					title="Auditors"
					value={String(new Set(data?.items.map(a => a.auditor_code)).size)}
					helper="Unique auditors with submitted reports."
					tone="warning"
				/>
				<StatCard
					title="Places"
					value={String(new Set(data?.items.map(a => a.place_id)).size)}
					helper="Unique places with submitted audits."
					tone="violet"
				/>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
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
						onClick={() => {
							setSelectedProjectIds([]);
							setSelectedAuditorIds([]);
							setSelectedPlaceIds([]);
						}}>
						<XIcon className="size-3.5" />
						Clear filters
					</Button>
				)}
			</div>

			<GroupedReportsView rows={rows} basePath="/manager/reports" rolePrefix="manager" />
		</div>
	);
}
