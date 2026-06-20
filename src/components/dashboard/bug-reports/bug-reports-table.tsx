"use client";

import { ChevronRight, ImageIcon, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDateTimeLabel } from "@/components/dashboard/utils";
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
	const [statusFilter, setStatusFilter] = useState<BugReportStatus | "all">("all");
	const [surfaceFilter, setSurfaceFilter] = useState<BugReportSurface | "all">("all");
	const [severityFilter, setSeverityFilter] = useState<BugReportSeverity | "all">("all");
	const [expanded, setExpanded] = useState<string | null>(null);

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return reports
			.filter(r => statusFilter === "all" || r.status === statusFilter)
			.filter(r => surfaceFilter === "all" || r.surface === surfaceFilter)
			.filter(r => severityFilter === "all" || r.severity === severityFilter)
			.filter(
				r =>
					term.length === 0 ||
					r.title.toLowerCase().includes(term) ||
					r.description.toLowerCase().includes(term) ||
					(r.reporter_email ?? "").toLowerCase().includes(term)
			)
			.slice()
			.sort((a, b) => {
				const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
				if (sev !== 0) return sev;
				return b.created_at.localeCompare(a.created_at);
			});
	}, [reports, search, statusFilter, surfaceFilter, severityFilter]);

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1">
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
				<div className="flex flex-wrap gap-2">
					<FilterSelect
						value={statusFilter}
						onValueChange={v => setStatusFilter(v as BugReportStatus | "all")}
						allLabel={t("allStatuses")}
						items={BUG_STATUSES.map(s => ({ value: s, label: statusT(s) }))}
					/>
					<FilterSelect
						value={surfaceFilter}
						onValueChange={v => setSurfaceFilter(v as BugReportSurface | "all")}
						allLabel={t("allSurfaces")}
						items={SURFACES.map(s => ({ value: s, label: surfaceT(s) }))}
					/>
					<FilterSelect
						value={severityFilter}
						onValueChange={v => setSeverityFilter(v as BugReportSeverity | "all")}
						allLabel={t("allSeverities")}
						items={SEVERITIES.map(s => ({ value: s, label: severityT(s) }))}
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{[0, 1, 2, 3].map(i => (
						<Skeleton key={i} className="h-14 w-full rounded-md" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
			) : (
				<div className="overflow-hidden rounded-card border border-edge/60">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-8" />
								<TableHead>{t("columns.report")}</TableHead>
								<TableHead className="hidden md:table-cell">{t("columns.reporter")}</TableHead>
								<TableHead className="hidden lg:table-cell">{t("columns.created")}</TableHead>
								<TableHead className="w-44">{t("columns.status")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map(report => {
								const isOpen = expanded === report.id;
								return (
									<BugReportRow
										key={report.id}
										report={report}
										isOpen={isOpen}
										knownIssues={knownIssues}
										onToggle={() => setExpanded(isOpen ? null : report.id)}
										onUpdateStatus={onUpdateStatus}
										onLinkKnownIssue={onLinkKnownIssue}
									/>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

function FilterSelect({
	value,
	onValueChange,
	allLabel,
	items
}: Readonly<{
	value: string;
	onValueChange: (value: string) => void;
	allLabel: string;
	items: ReadonlyArray<{ value: string; label: string }>;
}>) {
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className="w-[9.5rem]">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">{allLabel}</SelectItem>
				{items.map(item => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function BugReportRow({
	report,
	isOpen,
	knownIssues,
	onToggle,
	onUpdateStatus,
	onLinkKnownIssue
}: Readonly<{
	report: BugReportListItem;
	isOpen: boolean;
	knownIssues: readonly KnownIssue[];
	onToggle: () => void;
	onUpdateStatus: (id: string, status: BugReportStatus) => void;
	onLinkKnownIssue: (id: string, knownIssueId: string | null) => void;
}>) {
	const t = useTranslations("bugReport.admin.reports");
	const statusT = useTranslations("bugReport.status");
	const formatT = useTranslations("common.format");

	return (
		<>
			<TableRow
				className={cn("cursor-pointer align-top", isOpen && "bg-muted/40")}
				onClick={onToggle}
				data-state={isOpen ? "open" : "closed"}>
				<TableCell className="pt-4">
					<ChevronRight
						className={cn("size-4 text-text-secondary transition-transform", isOpen && "rotate-90")}
						aria-hidden="true"
					/>
				</TableCell>
				<TableCell className="py-3">
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-2">
							<SeverityBadge severity={report.severity} />
							{report.screenshot_url || report.screenshot_public_id ? (
								<ImageIcon className="size-3.5 text-text-secondary" aria-label={t("hasScreenshot")} />
							) : null}
						</div>
						<p className="font-medium text-foreground">{report.title}</p>
						<div className="flex items-center gap-2 text-xs text-text-secondary">
							<SurfaceBadge surface={report.surface} />
						</div>
					</div>
				</TableCell>
				<TableCell className="hidden py-3 text-sm md:table-cell">
					<span className="text-foreground">{report.reporter_email ?? "—"}</span>
					{report.reporter_role ? (
						<span className="mt-0.5 block text-xs text-text-secondary capitalize">
							{report.reporter_role}
						</span>
					) : null}
				</TableCell>
				<TableCell className="hidden py-3 text-sm whitespace-nowrap text-text-secondary lg:table-cell">
					{formatDateTimeLabel(report.created_at, formatT)}
				</TableCell>
				<TableCell className="py-3" onClick={e => e.stopPropagation()}>
					<Select value={report.status} onValueChange={v => onUpdateStatus(report.id, v as BugReportStatus)}>
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
				</TableCell>
			</TableRow>
			{isOpen ? (
				<TableRow className="hover:bg-transparent">
					<TableCell colSpan={5} className="bg-muted/20 p-0">
						<BugReportDetail
							report={report}
							knownIssues={knownIssues}
							onLinkKnownIssue={onLinkKnownIssue}
						/>
					</TableCell>
				</TableRow>
			) : null}
		</>
	);
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
		<div className="grid gap-6 p-5 lg:grid-cols-[1.4fr_1fr]">
			<div className="space-y-5">
				<section>
					<h4 className="mb-1.5 text-xs font-semibold tracking-wide text-text-secondary uppercase">
						{t("detail.description")}
					</h4>
					<p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{report.description}</p>
				</section>

				{contextRows.length > 0 ? (
					<section>
						<h4 className="mb-2 text-xs font-semibold tracking-wide text-text-secondary uppercase">
							{t("detail.context")}
						</h4>
						<dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
							{contextRows.map(row => (
								<div key={row.label} className="flex flex-col">
									<dt className="text-xs text-text-secondary">{row.label}</dt>
									<dd className="text-sm break-words text-foreground">{row.value}</dd>
								</div>
							))}
						</dl>
					</section>
				) : null}

				{entityRows.length > 0 ? (
					<section>
						<h4 className="mb-2 text-xs font-semibold tracking-wide text-text-secondary uppercase">
							{t("detail.linkedRecords")}
						</h4>
						<div className="flex flex-wrap gap-2">
							{entityRows.map(row => (
								<span
									key={row.label}
									className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs">
									<span className="text-text-secondary">{row.label}</span>
									<span className="font-mono text-foreground">{row.value}</span>
								</span>
							))}
						</div>
					</section>
				) : null}
			</div>

			<div className="space-y-4">
				<section>
					<h4 className="mb-2 text-xs font-semibold tracking-wide text-text-secondary uppercase">
						{t("detail.screenshot")}
					</h4>
					<BugReportScreenshot
						url={report.screenshot_url}
						publicId={report.screenshot_public_id}
						reportTitle={report.title}
					/>
				</section>

				<section>
					<h4 className="mb-1.5 text-xs font-semibold tracking-wide text-text-secondary uppercase">
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
