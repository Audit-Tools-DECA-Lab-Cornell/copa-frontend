"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { FilterIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DataTable, getMultiValueFilterFn } from "@/components/dashboard/data-table";
import { DataTableColumnHeader } from "@/components/dashboard/data-table-column-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { EntityRowActions } from "@/components/dashboard/entity-row-actions";
import { preservePreviousData } from "@/components/dashboard/server-table-utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDateTimeLabel, formatScoreLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { type AuditorPlace, playspaceApi } from "@/lib/api/playspace";

type SessionStatus = "not_started" | "in_progress" | "submitted";

/**
 * Derive the current audit session status from the place's audit snapshot
 * fields. `place_audit_status` is an axis-level rollup and can lag behind
 * the live session, so we derive status directly from `audit_id`,
 * `started_at`, and `submitted_at` instead.
 */
function deriveSessionStatus(place: AuditorPlace): SessionStatus {
	if (place.submitted_at) return "submitted";
	if (place.audit_id ?? place.started_at) return "in_progress";
	return "not_started";
}

/** Map a session status to a badge visual variant. */
function getSessionStatusBadgeVariant(status: SessionStatus): "default" | "secondary" | "outline" {
	if (status === "submitted") return "default";
	if (status === "in_progress") return "secondary";
	return "outline";
}

/** Format a session status into a human-readable label. */
function formatSessionStatus(status: SessionStatus, t: (key: string) => string): string {
	return t(`status.${status}`);
}

interface FilterPopoverProps {
	title: string;
	options: Array<{ label: string; value: string }>;
	selectedValues: string[];
	onChange: (values: string[]) => void;
}

/** Checkbox popover for multi-select filtering. */
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

const DASHBOARD_PLACES_PAGE_SIZE = 10;

export function AuditorDashboardClient() {
	const t = useTranslations("auditor.dashboard");
	const formatT = useTranslations("common.format");

	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "place_name", desc: false }]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: DASHBOARD_PLACES_PAGE_SIZE
	});

	const summaryQuery = useQuery({
		queryKey: ["playspace", "auditor", "dashboardSummary"],
		queryFn: () => playspaceApi.auditor.dashboardSummary(),
		placeholderData: preservePreviousData
	});

	const placesQuery = useQuery({
		queryKey: ["playspace", "auditor", "assignedPlaces", "dashboard"],
		queryFn: () => playspaceApi.auditor.assignedPlaces({ page: 1, pageSize: 100 }),
		placeholderData: preservePreviousData
	});

	/** Derive unique project options from the fetched places. */
	const projectOptions = React.useMemo(() => {
		const projectMap = new Map<string, string>();
		for (const place of placesQuery.data?.items ?? []) {
			if (!projectMap.has(place.project_id)) {
				projectMap.set(place.project_id, place.project_name);
			}
		}
		return Array.from(projectMap.entries()).map(([id, name]) => ({ value: id, label: name }));
	}, [placesQuery.data]);

	/** Apply client-side project filtering. */
	const filteredPlaces = React.useMemo(() => {
		const allPlaces = placesQuery.data?.items ?? [];
		if (selectedProjectIds.length === 0) return allPlaces;
		return allPlaces.filter(place => selectedProjectIds.includes(place.project_id));
	}, [placesQuery.data, selectedProjectIds]);

	/** Reset pagination when filters change. */
	const selectedProjectIdsKey = selectedProjectIds.join("|");
	const [prevProjectIdsKey, setPrevProjectIdsKey] = React.useState(selectedProjectIdsKey);
	if (selectedProjectIdsKey !== prevProjectIdsKey) {
		setPrevProjectIdsKey(selectedProjectIdsKey);
		setPagination(currentValue =>
			currentValue.pageIndex === 0 ? currentValue : { ...currentValue, pageIndex: 0 }
		);
	}

	/** Build the href for the execute/resume page. */
	const getExecuteHref = React.useCallback((place: AuditorPlace): string => {
		return `/auditor/execute/${encodeURIComponent(place.place_id)}?projectId=${encodeURIComponent(place.project_id)}`;
	}, []);

	/** Build the primary link href for a place row - report if submitted, execute otherwise. */
	const getPrimaryHref = React.useCallback(
		(place: AuditorPlace): string => {
			const status = deriveSessionStatus(place);
			if (status === "submitted" && place.audit_id) {
				return `/auditor/reports/${encodeURIComponent(place.audit_id)}`;
			}
			return getExecuteHref(place);
		},
		[getExecuteHref]
	);

	const columns = React.useMemo<ColumnDef<AuditorPlace>[]>(
		() => [
			{
				id: "place_name",
				accessorFn: row => `${row.place_name} ${row.project_name} ${row.address ?? ""}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.place")} />,
				cell: ({ row }) => {
					const place = row.original;
					const href = getPrimaryHref(place);
					return (
						<div className="min-w-[240px] space-y-1">
							<Link
								href={href}
								className="font-medium text-foreground transition-colors hover:text-primary">
								{place.place_name}
							</Link>
							<p className="text-sm text-muted-foreground">{place.project_name}</p>
							{place.address ? <p className="text-xs text-muted-foreground/70">{place.address}</p> : null}
						</div>
					);
				},
				enableHiding: false
			},
			{
				id: "session_status",
				accessorFn: row => deriveSessionStatus(row),
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.status")} />,
				filterFn: getMultiValueFilterFn<AuditorPlace>(),
				cell: ({ row }) => {
					const status = deriveSessionStatus(row.original);
					return (
						<Badge variant={getSessionStatusBadgeVariant(status)} className="font-medium text-foreground">
							{formatSessionStatus(status, t)}
						</Badge>
					);
				}
			},
			{
				id: "execution_mode",
				accessorFn: row => row.selected_execution_mode ?? "",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.mode")} />,
				cell: ({ row }) => {
					const mode = row.original.selected_execution_mode;
					if (!mode) {
						return <span className="text-sm text-muted-foreground">{formatT("pending")}</span>;
					}
					return (
						<Badge variant="outline" className="font-medium capitalize text-foreground">
							{mode}
						</Badge>
					);
				}
			},
			{
				id: "score",
				accessorFn: row => row.overall_scores?.pv ?? row.audit_scores?.pv ?? row.summary_score ?? null,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("table.score")} align="end" />,
				cell: ({ row }) => {
					const scores = row.original.overall_scores ?? row.original.audit_scores ?? null;
					if (scores) {
						return (
							<div className="space-y-0.5 text-right font-mono tabular-nums">
								<p className="text-sm text-foreground">
									<span className="mr-1 text-xs font-semibold tracking-wide text-muted-foreground">
										PV
									</span>
									{scores.pv}
								</p>
								<p className="text-sm text-foreground">
									<span className="mr-1 text-xs font-semibold tracking-wide text-muted-foreground">
										U
									</span>
									{scores.u}
								</p>
							</div>
						);
					}
					return (
						<span className="block text-right font-mono text-muted-foreground tabular-nums">
							{formatScoreLabel(row.original.summary_score, formatT)}
						</span>
					);
				}
			},
			{
				id: "started_at",
				accessorFn: row => row.started_at ?? "",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("table.started")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.started_at, formatT)}
					</span>
				)
			},
			{
				id: "actions",
				enableSorting: false,
				enableHiding: false,
				cell: ({ row }) => {
					const place = row.original;
					const status = deriveSessionStatus(place);
					const reportHref =
						status === "submitted" && place.audit_id
							? `/auditor/reports/${encodeURIComponent(place.audit_id)}`
							: null;

					return (
						<EntityRowActions
							actions={[
								...(status !== "submitted"
									? [
											{
												label:
													status === "in_progress"
														? t("actions.resumeAudit")
														: t("actions.startAudit"),
												href: getExecuteHref(place)
											}
										]
									: []),
								...(reportHref ? [{ label: t("actions.viewReport"), href: reportHref }] : []),
								...(status === "submitted"
									? [
											{
												label: t("actions.startAudit"),
												href: getExecuteHref(place)
											}
										]
									: [])
							]}
						/>
					);
				}
			}
		],
		[formatT, getExecuteHref, getPrimaryHref, t]
	);

	const isInitialLoading =
		(summaryQuery.isLoading && !summaryQuery.data) || (placesQuery.isLoading && !placesQuery.data);

	if (isInitialLoading) {
		return (
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
					{Array.from({ length: 5 }).map((_, idx) => (
						<div
							key={`stat-skeleton-${idx}`}
							className="h-32 animate-pulse rounded-card border border-edge/40 bg-card"
						/>
					))}
				</div>
				<div className="h-[420px] animate-pulse rounded-card border border-edge/40 bg-card" />
			</div>
		);
	}

	if ((summaryQuery.isError && !summaryQuery.data) || (placesQuery.isError && !placesQuery.data)) {
		return (
			<EmptyState
				title={t("error.title")}
				description={t("error.description")}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("actions.refresh")}
					</Button>
				}
			/>
		);
	}

	const summary = summaryQuery.data;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
			/>

			{summary ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
					<StatCard
						title={t("stats.assignedPlaces.title")}
						value={String(summary.total_assigned_places)}
						helper={t("stats.assignedPlaces.helper")}
						tone="info"
					/>
					<StatCard
						title={t("stats.inProgress.title")}
						value={String(summary.in_progress_audits)}
						helper={t("stats.inProgress.helper")}
						tone="warning"
					/>
					<StatCard
						title={t("stats.submitted.title")}
						value={String(summary.submitted_audits)}
						helper={t("stats.submitted.helper")}
						tone="violet"
					/>
					<StatCard
						title={t("stats.pendingPlaces.title")}
						value={String(summary.pending_places)}
						helper={t("stats.pendingPlaces.helper")}
						tone="success"
					/>
					<StatCard
						title={t("stats.meanSubmittedScore.title")}
						value={formatScoreLabel(summary.average_submitted_score, formatT)}
						helper={t("stats.meanSubmittedScore.helper")}
						tone="info"
					/>
				</div>
			) : null}

			<DataTable
				title={t("assignedPlaces.title")}
				description={t("assignedPlaces.tableDescription")}
				columns={columns}
				data={filteredPlaces}
				searchColumnId="place_name"
				searchPlaceholder={t("assignedPlaces.searchPlaceholder")}
				filterConfigs={[
					{
						columnId: "session_status",
						title: t("table.status"),
						options: [
							{ label: t("status.not_started"), value: "not_started" },
							{ label: t("status.in_progress"), value: "in_progress" },
							{ label: t("status.submitted"), value: "submitted" }
						]
					}
				]}
				emptyMessage={t("assignedPlaces.empty")}
				initialSorting={[{ id: "place_name", desc: false }]}
				sortingState={sorting}
				onSortingStateChange={setSorting}
				columnFiltersState={columnFilters}
				onColumnFiltersStateChange={setColumnFilters}
				paginationState={pagination}
				onPaginationStateChange={setPagination}
				pageSize={DASHBOARD_PLACES_PAGE_SIZE}
				isFetching={placesQuery.isFetching}
				toolbarExtra={
					<>
						{projectOptions.length > 1 && (
							<FilterPopover
								title={t("filters.projects")}
								options={projectOptions}
								selectedValues={selectedProjectIds}
								onChange={setSelectedProjectIds}
							/>
						)}
						{selectedProjectIds.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={() => setSelectedProjectIds([])}>
								<XIcon className="size-3.5" />
								{t("filters.clearAll")}
							</Button>
						)}
					</>
				}
			/>
		</div>
	);
}
