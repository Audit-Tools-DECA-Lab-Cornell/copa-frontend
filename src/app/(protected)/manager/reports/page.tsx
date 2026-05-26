"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";

import { playspaceApi, type AuditorSummary, type ManagerPlaceRow } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { buildAuditorNameLookup } from "@/components/dashboard/auditor-display";
import { GroupedReportsView } from "@/components/dashboard/grouped-reports-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import { preservePreviousData } from "@/components/dashboard/server-table-utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ManagerReportsPage() {
	const session = useAuthSession();
	const accountId = session?.role === "manager" ? session.accountId : null;

	const [reportSearch, setReportSearch] = React.useState("");
	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedAuditorIds, setSelectedAuditorIds] = React.useState<string[]>([]);
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);

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
			reportSearch,
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
				search: reportSearch,
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

	/**
	 * Build one lookup from the manager's existing auditors query so the grouped
	 * reports table can show names without any extra round-trips.
	 */
	const auditorNameLookup = React.useMemo(() => {
		return buildAuditorNameLookup(
			(auditorsQuery.data ?? []).map((auditor: AuditorSummary) => ({
				auditorCode: auditor.auditor_code,
				fullName: auditor.full_name
			}))
		);
	}, [auditorsQuery.data]);

	const rows = React.useMemo(
		() =>
			(reportsQuery.data?.items ?? []).map(audit => ({
				id: audit.audit_id,
				auditCode: audit.audit_code,
				status: audit.status,
				auditorCode: audit.auditor_code,
				auditorDisplayName: auditorNameLookup.get(audit.auditor_code) ?? null,
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
		[auditorNameLookup, reportsQuery.data]
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
					description="Review submitted reports for your places and build place reports when the required submissions are ready."
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
					description="Review submitted reports for your places and build place reports when the required submissions are ready."
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
				description="Review submitted reports for your places and build place reports when the required submissions are ready."
				breadcrumbs={[{ label: "Dashboard", href: "/manager/dashboard" }, { label: "Reports" }]}
			/>

			{/* Summary stats */}
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Submitted reports"
					value={String(data?.summary.submitted_audits ?? 0)}
					helper="Reports ready to review."
					tone="info"
				/>
				<StatCard
					title="Average Score"
					value={
						data?.summary.average_scores
							? `PV ${data.summary.average_scores.pv} | U ${data.summary.average_scores.u}`
							: "Pending"
					}
					helper="Average score across submitted reports."
					tone="success"
				/>
				<StatCard
					title="Auditors represented"
					value={String(new Set(data?.items.map(a => a.auditor_code)).size)}
					helper="Auditors represented in these reports."
					tone="warning"
				/>
				<StatCard
					title="Places represented"
					value={String(new Set(data?.items.map(a => a.place_id)).size)}
					helper="Places that already have submitted reports."
					tone="violet"
				/>
			</div>

			<GroupedReportsView
				rows={rows}
				basePath="/manager/reports"
				rolePrefix="manager"
				searchValue={reportSearch}
				onSearchValueChange={setReportSearch}
				isSearching={reportsQuery.isFetching}
				toolbarFilters={
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
						{hasActiveFilters ? (
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
						) : null}
					</>
				}
			/>
		</div>
	);
}
