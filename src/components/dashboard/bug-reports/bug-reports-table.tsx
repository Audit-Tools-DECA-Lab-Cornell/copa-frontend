"use client";

import type { Column, ColumnDef, ExpandedState, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	useReactTable
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, ImageIcon, Search, X } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import { formatDateTimeLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
	BugReportListItem,
	BugReportSeverity,
	BugReportStatus,
	BugReportSurface,
	KnownIssue
} from "@/lib/api/playspace-types";
import { cn } from "@/lib/utils";

import { SeverityBadge, SurfaceBadge } from "./bug-report-badges";
import { BugReportScreenshot } from "./bug-report-screenshot";

const BUG_STATUSES: readonly BugReportStatus[] = ["new", "triaged", "in_progress", "resolved", "wont_fix", "duplicate"];
const SURFACES: readonly BugReportSurface[] = ["web", "mobile", "desktop"];
const SEVERITIES: readonly BugReportSeverity[] = ["blocking", "major", "minor"];
const SEVERITY_RANK: Record<BugReportSeverity, number> = { blocking: 0, major: 1, minor: 2 };
const STATUS_RANK: Record<BugReportStatus, number> = Object.fromEntries(
	BUG_STATUSES.map((status, index) => [status, index])
) as Record<BugReportStatus, number>;

/** Newest-first is the expected default for a live triage queue. */
const DEFAULT_SORTING: SortingState = [{ id: "created", desc: true }];

export interface BugReportsTableProps {
	reports: readonly BugReportListItem[];
	knownIssues: readonly KnownIssue[];
	isLoading: boolean;
	onUpdateStatus: (id: string, status: BugReportStatus) => void;
	onLinkKnownIssue: (id: string, knownIssueId: string | null) => void;
}

export function BugReportsTable({
	reports,
	knownIssues,
	isLoading,
	onUpdateStatus,
	onLinkKnownIssue
}: Readonly<BugReportsTableProps>) {
	const t = useTranslations("bugReport.admin.reports");
	const statusT = useTranslations("bugReport.status");
	const severityT = useTranslations("bugReport.severity");
	const surfaceT = useTranslations("bugReport.surface");

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string[]>([]);
	const [surfaceFilter, setSurfaceFilter] = useState<string[]>([]);
	const [severityFilter, setSeverityFilter] = useState<string[]>([]);
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);

	const hasActiveFilters =
		statusFilter.length > 0 || surfaceFilter.length > 0 || severityFilter.length > 0 || search.trim().length > 0;

	const clearFilters = () => {
		setSearch("");
		setStatusFilter([]);
		setSurfaceFilter([]);
		setSeverityFilter([]);
	};

	const filteredReports = useMemo(() => {
		const term = search.trim().toLowerCase();
		return reports
			.filter(r => statusFilter.length === 0 || statusFilter.includes(r.status))
			.filter(r => surfaceFilter.length === 0 || surfaceFilter.includes(r.surface))
			.filter(r => severityFilter.length === 0 || severityFilter.includes(r.severity))
			.filter(
				r =>
					term.length === 0 ||
					r.title.toLowerCase().includes(term) ||
					r.description.toLowerCase().includes(term) ||
					(r.reporter_email ?? "").toLowerCase().includes(term)
			);
	}, [reports, search, statusFilter, surfaceFilter, severityFilter]);

	const columns = useMemo<ColumnDef<BugReportListItem>[]>(
		() => [
			{
				id: "report",
				accessorFn: row => SEVERITY_RANK[row.severity],
				header: ({ column }) => (
					<SortableHeader title={t("columns.report")} column={column} sortByLabel={t("sortBy")} />
				),
				cell: ({ row }) => {
					const report = row.original;
					const isOpen = row.getIsExpanded();
					return (
						<button
							type="button"
							onClick={row.getToggleExpandedHandler()}
							aria-expanded={isOpen}
							aria-label={report.title}
							className="group/toggle flex w-full min-w-[240px] items-start gap-2.5 py-0.5 text-left">
							<span
								className={cn(
									"mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-edge/50 bg-card text-text-secondary transition-colors group-hover/toggle:border-edge group-hover/toggle:text-foreground",
									isOpen && "border-solid-primary/40 bg-solid-primary/10 text-solid-primary"
								)}>
								{isOpen ? (
									<ChevronDown className="size-4" aria-hidden="true" />
								) : (
									<ChevronRight className="size-4" aria-hidden="true" />
								)}
							</span>
							<span className="flex min-w-0 flex-col gap-1.5">
								<span className="flex items-center gap-2">
									<SeverityBadge severity={report.severity} />
									{report.screenshot_url || report.screenshot_public_id ? (
										<ImageIcon
											className="size-3.5 text-text-secondary"
											aria-label={t("hasScreenshot")}
										/>
									) : null}
								</span>
								<span className="flex items-center gap-2.5">
									<span className="truncate font-semibold text-foreground">{report.title}</span>
									<SurfaceBadge surface={report.surface} />
								</span>
							</span>
						</button>
					);
				}
			},
			{
				id: "reporter",
				accessorFn: row => row.reporter_email ?? "",
				header: ({ column }) => (
					<SortableHeader title={t("columns.reporter")} column={column} sortByLabel={t("sortBy")} />
				),
				cell: ({ row }) => {
					const email = row.original.reporter_email ?? null;
					if (!email) {
						return <span className="text-text-secondary">-</span>;
					}
					return (
						<div className="flex min-w-[220px] items-center gap-2.5 py-1">
							<span
								className={cn(
									"grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
									avatarTone(email)
								)}
								aria-hidden="true">
								{reporterInitials(email)}
							</span>
							<span className="min-w-0">
								<span
									className="block max-w-[16rem] truncate font-medium text-foreground"
									title={email}>
									{email}
								</span>
								{row.original.reporter_role ? (
									<span className="block text-xs text-text-secondary capitalize">
										{row.original.reporter_role}
									</span>
								) : null}
							</span>
						</div>
					);
				}
			},
			{
				id: "created",
				accessorFn: row => row.created_at,
				header: ({ column }) => (
					<SortableHeader title={t("columns.created")} column={column} sortByLabel={t("sortBy")} />
				),
				cell: ({ row }) => (
					<span className="text-sm whitespace-nowrap text-text-secondary">
						<ReportedTime value={row.original.created_at} />
					</span>
				)
			},
			{
				id: "status",
				accessorFn: row => STATUS_RANK[row.status],
				header: ({ column }) => (
					<SortableHeader title={t("columns.status")} column={column} sortByLabel={t("sortBy")} />
				),
				cell: ({ row }) => (
					<div className="w-44">
						<Select
							value={row.original.status}
							onValueChange={v => onUpdateStatus(row.original.id, v as BugReportStatus)}>
							<SelectTrigger className="h-9 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{BUG_STATUSES.map(status => (
									<SelectItem key={status} value={status}>
										{statusT(status)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)
			}
		],
		[t, statusT, onUpdateStatus]
	);

	const table = useReactTable({
		data: filteredReports,
		columns,
		state: { expanded, sorting },
		getRowId: row => row.id,
		onExpandedChange: setExpanded,
		onSortingChange: setSorting,
		getRowCanExpand: () => true,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel()
	});

	if (isLoading) {
		return (
			<Card className="overflow-hidden">
				<CardContent className="space-y-2 p-6">
					{[0, 1, 2, 3].map(i => (
						<Skeleton key={i} className="h-16 w-full rounded-md" />
					))}
				</CardContent>
			</Card>
		);
	}

	if (reports.length === 0) {
		return (
			<Card className="overflow-hidden">
				<CardContent className="p-6">
					<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
				</CardContent>
			</Card>
		);
	}

	const visibleRows = table.getRowModel().rows;

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden p-0">
				<CardHeader className="gap-2 border-b-2 border-edge/50 py-5">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-1">
							<CardTitle>{t("title")}</CardTitle>
							<CardDescription>{t("cardDescription")}</CardDescription>
						</div>
						<Badge variant="secondary" className="self-start">
							{t("reportsCount", { count: reports.length })}
						</Badge>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<div className="flex flex-col gap-4 border-b-2 border-edge/50 px-6 py-5">
						<div className="relative w-full lg:max-w-sm">
							<Search
								className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
								aria-hidden="true"
							/>
							<Input
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder={t("searchPlaceholder")}
								className="pl-9"
								aria-label={t("searchPlaceholder")}
							/>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
							<div className="flex flex-wrap items-center gap-2">
								<FilterPopover
									title={t("columns.status")}
									options={BUG_STATUSES.map(s => ({ value: s, label: statusT(s) }))}
									selectedValues={statusFilter}
									onChange={setStatusFilter}
								/>
								<FilterPopover
									title={t("columns.surface")}
									options={SURFACES.map(s => ({ value: s, label: surfaceT(s) }))}
									selectedValues={surfaceFilter}
									onChange={setSurfaceFilter}
								/>
								<FilterPopover
									title={t("columns.severity")}
									options={SEVERITIES.map(s => ({ value: s, label: severityT(s) }))}
									selectedValues={severityFilter}
									onChange={setSeverityFilter}
								/>
								{hasActiveFilters ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="gap-1.5"
										onClick={clearFilters}>
										<X className="size-3.5" aria-hidden="true" />
										{t("clearFilters")}
									</Button>
								) : null}
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => table.toggleAllRowsExpanded(true)}>
									{t("expandAll")}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => table.toggleAllRowsExpanded(false)}>
									{t("collapseAll")}
								</Button>
							</div>
						</div>
					</div>

					<Table>
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id} className="hover:bg-transparent">
									{headerGroup.headers.map(header => {
										const sorted = header.column.getIsSorted();
										return (
											<TableHead
												key={header.id}
												aria-sort={
													sorted === "asc"
														? "ascending"
														: sorted === "desc"
															? "descending"
															: "none"
												}>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{visibleRows.length > 0 ? (
								visibleRows.map(row => (
									<Fragment key={row.id}>
										<TableRow data-state={row.getIsExpanded() ? "selected" : undefined}>
											{row.getVisibleCells().map(cell => (
												<TableCell key={cell.id} className="align-middle">
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
										</TableRow>
										{row.getIsExpanded() ? (
											<TableRow className="bg-muted/25 hover:bg-muted/25">
												<TableCell colSpan={row.getVisibleCells().length} className="px-6 py-5">
													<div className="rounded-md border border-edge/40 bg-background p-4 shadow-[0_3px_0_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.08)]">
														<BugReportDetail
															report={row.original}
															knownIssues={knownIssues}
															onLinkKnownIssue={onLinkKnownIssue}
														/>
													</div>
												</TableCell>
											</TableRow>
										) : null}
									</Fragment>
								))
							) : (
								<TableRow className="hover:bg-transparent">
									<TableCell
										colSpan={columns.length}
										className="h-28 text-center text-sm text-text-secondary">
										{t("emptyDescription")}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge/40 bg-card px-4 py-3 text-sm text-text-secondary">
				<span>{t("showingSummary", { shown: visibleRows.length, total: reports.length })}</span>
			</div>
		</div>
	);
}

function SortableHeader({
	title,
	column,
	sortByLabel
}: Readonly<{
	title: string;
	column: Column<BugReportListItem, unknown>;
	sortByLabel: string;
}>) {
	const sorted = column.getIsSorted();
	return (
		<button
			type="button"
			onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			aria-label={sortByLabel.replace("{column}", title)}
			className={cn(
				"flex w-full items-center gap-2 text-left transition-colors hover:text-foreground",
				sorted && "font-bold text-foreground"
			)}>
			<span>{title}</span>
			{sorted === "asc" ? (
				<ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />
			) : sorted === "desc" ? (
				<ArrowDown className="size-3.5 shrink-0" aria-hidden="true" />
			) : (
				<ArrowUpDown className="size-3.5 shrink-0 opacity-40" aria-hidden="true" />
			)}
		</button>
	);
}

/**
 * Reported time, shown as relative age for fresh reports and an absolute date for older ones,
 * with the full timestamp always reachable through the tooltip.
 */
function ReportedTime({ value }: Readonly<{ value: string }>) {
	const format = useFormatter();
	const now = useNow({ updateInterval: 60_000 });
	const formatT = useTranslations("common.format");

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return <span>{value}</span>;
	}

	const ageMs = now.getTime() - parsed.getTime();
	const absolute = formatDateTimeLabel(value, formatT);
	const isRecent = ageMs >= 0 && ageMs < 24 * 60 * 60 * 1000;
	const label = isRecent ? format.relativeTime(parsed, now) : absolute;

	return (
		<time dateTime={parsed.toISOString()} title={absolute}>
			{label}
		</time>
	);
}

const AVATAR_TONES = [
	"bg-status-info-surface text-status-info",
	"bg-status-success-surface text-status-success",
	"bg-status-warning-surface text-status-warning",
	"bg-accent-violet/15 text-accent-violet"
];

function reporterInitials(email: string): string {
	const local = email.split("@")[0] ?? email;
	const parts = local.split(/[._+-]+/).filter(Boolean);
	const letters = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2);
	return letters.toUpperCase();
}

function avatarTone(email: string): string {
	let hash = 0;
	for (let i = 0; i < email.length; i += 1) hash = (hash + email.charCodeAt(i)) % AVATAR_TONES.length;
	return AVATAR_TONES[hash];
}

function BugReportDetail({
	report,
	knownIssues,
	onLinkKnownIssue
}: Readonly<{
	report: BugReportListItem;
	knownIssues: readonly KnownIssue[];
	onLinkKnownIssue: (id: string, knownIssueId: string | null) => void;
}>) {
	const t = useTranslations("bugReport.admin.reports");
	const ctxT = useTranslations("bugReport.admin.context");

	const contextRows = useContextRows(report.context, ctxT);
	const entityRows = useEntityRows(report, ctxT);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-edge/50 pb-3">
				<SeverityBadge severity={report.severity} />
				<span className="text-base font-semibold text-foreground">{report.title}</span>
				<span className="ml-auto">
					<SurfaceBadge surface={report.surface} />
				</span>
			</div>
			<div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
				<div className="space-y-5">
					<section>
						<h4 className="mb-1.5 text-xs font-bold tracking-wide text-foreground uppercase">
							{t("detail.description")}
						</h4>
						<p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
							{report.description}
						</p>
					</section>

					{contextRows.length > 0 ? (
						<section>
							<h4 className="mb-2 text-xs font-bold tracking-wide text-foreground uppercase">
								{t("detail.context")}
							</h4>
							<dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
								{contextRows.map(row => (
									<div key={row.label} className="flex flex-col">
										<dt className="text-xs font-medium text-text-secondary">{row.label}</dt>
										<dd className="text-sm font-medium break-words text-foreground">{row.value}</dd>
									</div>
								))}
							</dl>
						</section>
					) : null}

					{entityRows.length > 0 ? (
						<section>
							<h4 className="mb-2 text-xs font-bold tracking-wide text-foreground uppercase">
								{t("detail.linkedRecords")}
							</h4>
							<div className="flex flex-wrap gap-2">
								{entityRows.map(row => (
									<span
										key={row.label}
										className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs">
										<span className="font-medium text-text-secondary">{row.label}</span>
										<span className="font-mono font-medium text-foreground">{row.value}</span>
									</span>
								))}
							</div>
						</section>
					) : null}
				</div>

				<div className="space-y-4">
					<section>
						<h4 className="mb-2 text-xs font-bold tracking-wide text-foreground uppercase">
							{t("detail.screenshot")}
						</h4>
						<BugReportScreenshot
							url={report.screenshot_url}
							publicId={report.screenshot_public_id}
							reportTitle={report.title}
						/>
					</section>

					<section>
						<h4 className="mb-1.5 text-xs font-bold tracking-wide text-foreground uppercase">
							{t("detail.knownIssue")}
						</h4>
						<Select
							value={report.linked_known_issue_id ?? "none"}
							onValueChange={v => onLinkKnownIssue(report.id, v === "none" ? null : v)}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder={t("detail.linkKnownIssue")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">{t("detail.noKnownIssue")}</SelectItem>
								{knownIssues.map(issue => (
									<SelectItem key={issue.id} value={issue.id}>
										{issue.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</section>
				</div>
			</div>
		</div>
	);
}

type DetailRow = { label: string; value: string };
type Translator = (key: string) => string;

function useContextRows(context: Record<string, unknown>, ctxT: Translator): DetailRow[] {
	return useMemo(() => {
		const get = (key: string): string | null => {
			const value = context[key];
			if (value === null || value === undefined || value === "") return null;
			return String(value);
		};
		const candidates: Array<[string, string | null]> = [
			[ctxT("appVersion"), get("app_version")],
			[ctxT("build"), get("build")],
			[ctxT("platform"), [get("platform"), get("os_version")].filter(Boolean).join(" ") || null],
			[ctxT("device"), get("device_model")],
			[ctxT("browser"), get("browser")],
			[ctxT("route"), get("route") ?? get("screen")],
			[ctxT("network"), networkLabel(get("network_online"), get("network_type"), ctxT)],
			[ctxT("syncPhase"), get("sync_phase")],
			[ctxT("locale"), get("locale")],
			[ctxT("viewport"), viewportLabel(get("viewport_width"), get("viewport_height"))],
			[ctxT("capturedAt"), get("client_timestamp")]
		];
		return candidates
			.filter((entry): entry is [string, string] => entry[1] !== null)
			.map(([label, value]) => ({ label, value }));
	}, [context, ctxT]);
}

function useEntityRows(report: BugReportListItem, ctxT: Translator): DetailRow[] {
	return useMemo(() => {
		const shortId = (id: string) => id.slice(0, 8);
		const rows: DetailRow[] = [];
		if (report.project_id) rows.push({ label: ctxT("project"), value: shortId(report.project_id) });
		if (report.place_id) rows.push({ label: ctxT("place"), value: shortId(report.place_id) });
		if (report.playspace_submission_id)
			rows.push({ label: ctxT("submission"), value: shortId(report.playspace_submission_id) });
		const section = report.context["section_id"];
		const question = report.context["question_id"];
		if (typeof section === "string" && section) rows.push({ label: ctxT("section"), value: section });
		if (typeof question === "string" && question) rows.push({ label: ctxT("question"), value: question });
		return rows;
	}, [report, ctxT]);
}

function networkLabel(online: string | null, type: string | null, ctxT: Translator): string | null {
	if (online === null && type === null) return null;
	const state = online === "true" ? ctxT("online") : online === "false" ? ctxT("offline") : null;
	return [state, type].filter(Boolean).join(" · ") || null;
}

function viewportLabel(width: string | null, height: string | null): string | null {
	if (!width || !height) return null;
	return `${width} × ${height}`;
}
