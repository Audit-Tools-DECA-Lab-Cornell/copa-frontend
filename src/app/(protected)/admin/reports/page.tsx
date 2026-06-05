"use client";

import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import * as React from "react";

import {
	playspaceApi,
	type AdminAccountRow,
	type AdminAuditorRow,
	type AdminPlaceRow,
	type AdminProjectRow,
	type PaginatedResponse
} from "@/lib/api/playspace";
import { GroupedReportsView } from "@/components/dashboard/grouped-reports-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import { preservePreviousData } from "@/components/dashboard/server-table-utils";
import { Button } from "@/components/ui/button";

export default function AdminReportsPage() {
	const [reportSearch, setReportSearch] = React.useState("");
	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);
	const [selectedAuditorIds, setSelectedAuditorIds] = React.useState<string[]>([]);
	const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);

	const projectsQuery = useQuery({
		queryKey: ["playspace", "admin", "reports", "projects-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminProjectRow>> =>
			playspaceApi.admin.projects({ page: 1, pageSize: 100 })
	});

	const placesQuery = useQuery({
		queryKey: ["playspace", "admin", "reports", "places-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminPlaceRow>> =>
			playspaceApi.admin.places({ page: 1, pageSize: 100 })
	});

	const auditorsQuery = useQuery({
		queryKey: ["playspace", "admin", "reports", "auditors-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminAuditorRow>> =>
			playspaceApi.admin.auditors({ page: 1, pageSize: 100 })
	});

	const accountsQuery = useQuery({
		queryKey: ["playspace", "admin", "reports", "accounts-for-filter"],
		queryFn: async (): Promise<PaginatedResponse<AdminAccountRow>> =>
			playspaceApi.admin.accounts({ page: 1, pageSize: 100, accountTypes: ["MANAGER"] })
	});

	// Fetch all submitted reports (no pagination - grouped view handles display)
	const reportsQuery = useQuery({
		queryKey: [
			"playspace",
			"admin",
			"reports",
			"all",
			reportSearch,
			selectedProjectIds,
			selectedPlaceIds,
			selectedAuditorIds,
			selectedAccountIds
		],
		queryFn: () =>
			playspaceApi.admin.audits({
				page: 1,
				pageSize: 100,
				search: reportSearch,
				projectIds: selectedProjectIds,
				placeIds: selectedPlaceIds,
				auditorIds: selectedAuditorIds,
				accountIds: selectedAccountIds,
				statuses: ["SUBMITTED"]
			}),
		placeholderData: preservePreviousData
	});

	const projectOptions = React.useMemo(
		() =>
			(projectsQuery.data?.items ?? []).map((p: AdminProjectRow) => ({
				label: `${p.account_name} · ${p.name}`,
				value: p.project_id
			})),
		[projectsQuery.data]
	);
	const placeOptions = React.useMemo(
		() => (placesQuery.data?.items ?? []).map((p: AdminPlaceRow) => ({ label: p.name, value: p.place_id })),
		[placesQuery.data]
	);
	const auditorOptions = React.useMemo(
		() =>
			(auditorsQuery.data?.items ?? []).map((a: AdminAuditorRow) => ({
				label: a.auditor_code,
				value: a.auditor_profile_id
			})),
		[auditorsQuery.data]
	);
	const accountOptions = React.useMemo(
		() => (accountsQuery.data?.items ?? []).map((a: AdminAccountRow) => ({ label: a.name, value: a.account_id })),
		[accountsQuery.data]
	);

	const hasActiveFilters =
		selectedProjectIds.length > 0 ||
		selectedPlaceIds.length > 0 ||
		selectedAuditorIds.length > 0 ||
		selectedAccountIds.length > 0;

	const rows = React.useMemo(
		() =>
			(reportsQuery.data?.items ?? []).map(audit => ({
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
			})),
		[reportsQuery.data]
	);

	if (reportsQuery.isLoading && !reportsQuery.data) {
		return <div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />;
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
				eyebrow="Admin Workspace"
				title="Audit Reports"
				description="Review submitted reports across all places and build place reports when the required submissions are ready."
				breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Reports" }]}
			/>

			<GroupedReportsView
				rows={rows}
				basePath="/admin/reports"
				rolePrefix="admin"
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
						<FilterPopover
							title="Managers"
							options={accountOptions}
							selectedValues={selectedAccountIds}
							onChange={setSelectedAccountIds}
						/>
						{hasActiveFilters ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => {
									setSelectedProjectIds([]);
									setSelectedPlaceIds([]);
									setSelectedAuditorIds([]);
									setSelectedAccountIds([]);
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
