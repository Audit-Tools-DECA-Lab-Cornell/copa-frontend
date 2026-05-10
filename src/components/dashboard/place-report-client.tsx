"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircleIcon,
	CalendarIcon,
	CheckCircleIcon,
	ClipboardListIcon,
	FileTextIcon,
	LayersIcon,
	SaveIcon
} from "lucide-react";

import { playspaceApi } from "@/lib/api/playspace";
import type { AuditSession } from "@/lib/api/playspace";
import { AuditReportView } from "@/components/dashboard/audit-report-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BackButton } from "@/components/dashboard/back-button";
import { mergeAuditSessions } from "@/components/dashboard/place-report-merge";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatAuditCodeReference } from "@/components/dashboard/utils";
import { AuditExportActions } from "@/components/dashboard/audit-export-actions";
import {
	getPlaceReportCopy,
	getPlaceReportSourceCountLabel,
	type PlaceReportKind
} from "@/components/dashboard/place-report-copy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/**
 * Format source-submission timestamps consistently for the place report.
 */
function formatSourceTimestamp(value: string | null): string {
	if (value === null) {
		return "Not yet submitted";
	}

	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(parsedDate);
}

interface ReportSourceCardProps {
	label: string;
	session: AuditSession;
	href: string;
	actionLabel: string;
}

/**
 * Show one linked source submission so combined reports keep their provenance visible.
 */
function ReportSourceCard({ label, session, href, actionLabel }: Readonly<ReportSourceCardProps>) {
	return (
		<div className="rounded-xl border bg-card p-4">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0 w-full space-y-3 flex flex-col">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">{label}</Badge>
						<span className="text-xs text-muted-foreground">Linked source submission</span>
					</div>
					<div className="space-y-1.5">
						<p className="text-sm font-semibold text-foreground">
							{formatAuditCodeReference(session.audit_code)}
						</p>
					</div>
					<div className="flex flex-col gap-3 w-full">
						<div className="w-full rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
								Audit code
							</p>
							<div className="mt-1 overflow-x-auto no-scrollbar">
								<code className="inline-block min-w-max whitespace-nowrap font-mono text-[13px] text-foreground">
									{session.audit_code}
								</code>
							</div>
						</div>
						<div className="w-full rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
							<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
								Auditor code
							</p>
							<div className="mt-1 overflow-x-auto no-scrollbar">
								<code className="inline-block min-w-max whitespace-nowrap font-mono text-[13px] text-foreground">
									{session.auditor_code}
								</code>
							</div>
						</div>
					</div>
					<div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
						<span className="inline-flex items-center gap-1.5">
							<CalendarIcon className="size-3.5" />
							{formatSourceTimestamp(session.submitted_at)}
						</span>
					</div>
				</div>
				<Button asChild variant="outline" size="sm" className="shrink-0">
					<Link href={href}>
						<ClipboardListIcon data-icon="inline-start" />
						{actionLabel}
					</Link>
				</Button>
			</div>
		</div>
	);
}

// ── Main Component ───────────────────────────────────────────────────────────

interface PlaceReportClientProps {
	rolePrefix: "admin" | "manager";
}

export function PlaceReportClient({ rolePrefix }: PlaceReportClientProps) {
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();

	const auditId = searchParams.get("audit");
	const surveyId = searchParams.get("survey");
	const submissionId = searchParams.get("submission");
	const placeId = searchParams.get("placeId");

	const isCombined = auditId !== null && surveyId !== null;
	const isSingleSubmission = submissionId !== null;

	const [savedSuccess, setSavedSuccess] = React.useState(false);

	// Fetch audit session (combined mode: the audit-side)
	const auditQuery = useQuery({
		queryKey: ["playspace", "report", "audit", auditId ?? submissionId],
		queryFn: () => playspaceApi.auditor.getAudit(auditId ?? submissionId ?? ""),
		enabled: (isCombined && auditId !== null) || (isSingleSubmission && submissionId !== null)
	});

	// Fetch survey session (combined mode only)
	const surveyQuery = useQuery({
		queryKey: ["playspace", "report", "survey", surveyId],
		queryFn: () => playspaceApi.auditor.getAudit(surveyId ?? ""),
		enabled: isCombined && surveyId !== null
	});

	const primarySession = auditQuery.data;
	const surveySession = surveyQuery.data;

	// Resolve which session drives the report
	const reportSession = React.useMemo(() => {
		if (isCombined && primarySession !== undefined && surveySession !== undefined) {
			return mergeAuditSessions(primarySession, surveySession);
		}
		return primarySession;
	}, [isCombined, primarySession, surveySession]);

	// Fetch instrument
	const instrumentQuery = useQuery({
		queryKey: ["playspace", "instrument", reportSession?.instrument_key],
		queryFn: () => {
			if (reportSession?.instrument !== undefined && reportSession.instrument !== null) {
				return Promise.resolve(reportSession.instrument);
			}
			if (typeof reportSession?.instrument_key !== "string") throw new Error("No instrument key");
			return playspaceApi.auditor.fetchInstrument(reportSession.instrument_key);
		},
		enabled: reportSession !== undefined
	});

	// Save to place mutation
	const saveMutation = useMutation({
		mutationFn: async () => {
			if (!placeId) throw new Error("No placeId in URL");
			if (isCombined && auditId && surveyId) {
				return playspaceApi.management.places.savePlaceReport(placeId, {
					report_type: "combined",
					audit_id: auditId,
					survey_id: surveyId
				});
			} else if (submissionId) {
				return playspaceApi.management.places.savePlaceReport(placeId, {
					report_type: "full_assessment",
					submission_id: submissionId
				});
			}
			throw new Error("Invalid report params");
		},
		onSuccess: () => {
			setSavedSuccess(true);
			if (placeId) {
				void queryClient.invalidateQueries({ queryKey: ["playspace", "manager", "placeHistory"] });
				void queryClient.invalidateQueries({ queryKey: ["playspace", "admin", "placeHistory"] });
			}
		}
	});

	const isLoading = auditQuery.isLoading || (isCombined && surveyQuery.isLoading) || instrumentQuery.isLoading;

	const reportsBasePath = `/${rolePrefix}/reports`;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={rolePrefix === "admin" ? "Administrator Workspace" : "Manager Workspace"}
					title="Place Report"
					description="Loading report…"
					breadcrumbs={[
						{ label: "Dashboard", href: `/${rolePrefix}/dashboard` },
						{ label: "Reports", href: reportsBasePath },
						{ label: "Place Report" }
					]}
					actions={<BackButton href={reportsBasePath} label="Back to Reports" />}
				/>
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="h-32 animate-pulse rounded-card border border-border bg-card" />
				))}
			</div>
		);
	}

	if (auditQuery.isError || !reportSession) {
		return (
			<div className="space-y-4">
				<BackButton href={reportsBasePath} label="Back to Reports" />
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-sm text-muted-foreground">Unable to load report. Please try again.</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const reportKind: PlaceReportKind = isCombined ? "combined" : "full_assessment";
	const reportCopy = getPlaceReportCopy(reportKind);
	const sourceCountLabel = getPlaceReportSourceCountLabel(reportKind);
	const sourceEntries =
		isCombined && primarySession !== undefined && surveySession !== undefined
			? [
					{
						key: primarySession.audit_id,
						label: "Place Audit",
						session: primarySession,
						href: `/${rolePrefix}/audits/${primarySession.audit_id}`,
						actionLabel: "View audit details"
					},
					{
						key: surveySession.audit_id,
						label: "Place Survey",
						session: surveySession,
						href: `/${rolePrefix}/audits/${surveySession.audit_id}`,
						actionLabel: "View survey details"
					}
				]
			: primarySession !== undefined
				? [
						{
							key: primarySession.audit_id,
							label: "Full Assessment",
							session: primarySession,
							href: `/${rolePrefix}/audits/${primarySession.audit_id}`,
							actionLabel: "View submission details"
						}
					]
				: [];
	const placeRecordStatusValue = savedSuccess ? "Saved" : "Ready";
	const placeRecordStatusHelper = savedSuccess
		? "This report is saved to the place record and can be reopened from the place details page."
		: "Save this report to the place record so the same source combination is easy to reopen later.";
	const statValueClassName = "font-sans text-[1.65rem] md:text-[1.9rem]";

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={rolePrefix === "admin" ? "Administrator Workspace" : "Manager Workspace"}
				title={reportSession.place_name}
				description={reportSession.project_name}
				breadcrumbs={[
					{ label: "Dashboard", href: `/${rolePrefix}/dashboard` },
					{ label: "Reports", href: reportsBasePath },
					{ label: "Place Report" }
				]}
				actions={
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						{reportSession !== undefined && instrumentQuery.data !== undefined && (
							<AuditExportActions audit={reportSession} instrument={instrumentQuery.data} />
						)}
						<BackButton href={reportsBasePath} label="Back to Reports" />
					</div>
				}
			/>

			<Card className="overflow-hidden">
				<CardHeader className="border-b border-border/70">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-2">
							<CardTitle className="flex flex-wrap items-center gap-2 text-lg">
								<FileTextIcon className="size-5 text-primary" />
								{reportCopy.title}
								<Badge variant={isCombined ? "default" : "secondary"}>{sourceCountLabel}</Badge>
							</CardTitle>
							<CardDescription>{reportCopy.description}</CardDescription>
						</div>
						{placeId ? (
							<div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
								{savedSuccess ? (
									<div className="inline-flex items-center justify-center gap-1.5 rounded-md border border-status-success-border bg-status-success-surface px-3 py-2 text-sm font-medium text-status-success">
										<CheckCircleIcon className="size-4" />
										Saved to place
									</div>
								) : (
									<Button
										type="button"
										variant="outline"
										disabled={saveMutation.isPending}
										onClick={() => saveMutation.mutate()}>
										<SaveIcon data-icon="inline-start" />
										{saveMutation.isPending ? "Saving…" : "Save to Place"}
									</Button>
								)}
							</div>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="grid gap-4 p-4 md:grid-cols-3">
					<StatCard
						title="Report Type"
						value={reportCopy.reportTypeValue}
						helper={reportCopy.reportTypeHelper}
						tone={isCombined ? "primary" : "info"}
						valueClassName={statValueClassName}
					/>
					<StatCard
						title="Source Submissions"
						value={String(sourceEntries.length)}
						helper={reportCopy.sourceCountHelper}
						tone="violet"
					/>
					<StatCard
						title="Place Record"
						value={placeRecordStatusValue}
						helper={placeRecordStatusHelper}
						tone={savedSuccess ? "success" : "warning"}
						valueClassName={statValueClassName}
					/>
					{saveMutation.isError ? (
						<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive md:col-span-3">
							<div className="flex gap-2">
								<AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
								<p>Unable to save this place report. Please try again.</p>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card className="overflow-hidden">
				<CardHeader className="border-b border-border/70">
					<div className="space-y-2">
						<CardTitle className="flex flex-wrap items-center gap-2 text-base">
							<LayersIcon className="size-4 text-primary" />
							Report Sources
						</CardTitle>
						<CardDescription>
							Open the original submission{sourceEntries.length === 1 ? "" : "s"} used to assemble this
							place-level report.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="grid gap-4 p-4 lg:grid-cols-2">
					{sourceEntries.map(sourceEntry => (
						<ReportSourceCard
							key={sourceEntry.key}
							label={sourceEntry.label}
							session={sourceEntry.session}
							href={sourceEntry.href}
							actionLabel={sourceEntry.actionLabel}
						/>
					))}
				</CardContent>
			</Card>

			<Separator />

			{/* Report content */}
			<AuditReportView
				audit={reportSession}
				instrument={instrumentQuery.data ?? null}
				basePath={isCombined ? undefined : `/${rolePrefix}`}
			/>
		</div>
	);
}
