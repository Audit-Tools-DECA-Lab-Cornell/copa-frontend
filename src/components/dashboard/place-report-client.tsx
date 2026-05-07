"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SaveIcon, CheckCircleIcon, FileTextIcon, LayersIcon, LinkIcon, AlertCircleIcon } from "lucide-react";

import { playspaceApi } from "@/lib/api/playspace";
import type { AuditSession, ScoreTotals } from "@/lib/api/playspace";
import { AuditReportView } from "@/components/dashboard/audit-report-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BackButton } from "@/components/dashboard/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ── Score merging ────────────────────────────────────────────────────────────

function addScoreTotals(a: ScoreTotals, b: ScoreTotals): ScoreTotals {
	return {
		provision_total: a.provision_total + b.provision_total,
		provision_total_max: a.provision_total_max + b.provision_total_max,
		diversity_total: a.diversity_total + b.diversity_total,
		diversity_total_max: a.diversity_total_max + b.diversity_total_max,
		challenge_total: a.challenge_total + b.challenge_total,
		challenge_total_max: a.challenge_total_max + b.challenge_total_max,
		sociability_total: a.sociability_total + b.sociability_total,
		sociability_total_max: a.sociability_total_max + b.sociability_total_max,
		play_value_total: a.play_value_total + b.play_value_total,
		play_value_total_max: a.play_value_total_max + b.play_value_total_max,
		usability_total: a.usability_total + b.usability_total,
		usability_total_max: a.usability_total_max + b.usability_total_max
	};
}

/**
 * Merge two AuditSession objects (audit + survey) into a synthetic "Full
 * Assessment (combined)" session that can be passed to AuditReportView.
 *
 * Strategy:
 * - sections: union of both sessions' section responses (audit sections +
 *   survey sections all live under the same instrument, so merging them gives
 *   the full picture)
 * - scores.overall: sum of audit.scores.audit + survey.scores.survey totals
 * - scores.by_domain / by_section: merged by key, summing numeric fields
 * - scores.execution_mode set to "both"
 * - metadata: prefer auditSession's place/project context
 */
function mergeAuditSessions(auditSession: AuditSession, surveySession: AuditSession): AuditSession {
	// Merge section responses
	const mergedSections = {
		...surveySession.aggregate.sections,
		...auditSession.aggregate.sections
	};

	// Merge by_domain scores
	const mergedByDomain: Record<string, ScoreTotals> = { ...surveySession.scores.by_domain };
	for (const [key, totals] of Object.entries(auditSession.scores.by_domain)) {
		if (totals === null) continue;
		const existing = mergedByDomain[key];
		mergedByDomain[key] = existing !== undefined && existing !== null ? addScoreTotals(existing, totals) : totals;
	}

	// Merge by_section scores
	const mergedBySection: Record<string, ScoreTotals> = { ...surveySession.scores.by_section };
	for (const [key, totals] of Object.entries(auditSession.scores.by_section)) {
		if (totals === null) continue;
		const existing = mergedBySection[key];
		mergedBySection[key] = existing !== undefined && existing !== null ? addScoreTotals(existing, totals) : totals;
	}

	// Combined overall = sum of audit-side + survey-side
	const auditTotals = auditSession.scores.audit ?? auditSession.scores.overall;
	const surveyTotals = surveySession.scores.survey ?? surveySession.scores.overall;
	const combinedOverall =
		auditTotals !== null && surveyTotals !== null
			? addScoreTotals(auditTotals, surveyTotals)
			: (auditTotals ?? surveyTotals ?? null);

	return {
		...auditSession,
		// Indicate combined mode
		selected_execution_mode: "both",
		meta: { ...auditSession.meta, execution_mode: "both" },
		aggregate: {
			...auditSession.aggregate,
			meta: { execution_mode: "both" },
			sections: mergedSections
		},
		sections: mergedSections,
		scores: {
			...auditSession.scores,
			execution_mode: "both",
			overall: combinedOverall,
			by_domain: mergedByDomain,
			by_section: mergedBySection
		},
		// Keep audit identity fields
		status: "SUBMITTED"
	};
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

	const reportTypeLabel = isCombined ? "Full Assessment (combined)" : "Full Assessment";
	const reportSourceLabel = isCombined ? "Audit + survey pair" : "Single full-assessment submission";
	const reportSourceDescription = isCombined
		? "This report merges the audit-side and survey-side submissions into one place-level assessment."
		: "This report uses one submission that already includes the full assessment.";

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
				actions={<BackButton href={reportsBasePath} label="Back to Reports" />}
			/>

			<Card className="overflow-hidden">
				<CardHeader className="border-b border-border/70 bg-muted/25">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-2">
							<CardTitle className="flex flex-wrap items-center gap-2 text-lg">
								<FileTextIcon className="size-5 text-primary" />
								Place Report
								<Badge variant={isCombined ? "default" : "secondary"}>{reportTypeLabel}</Badge>
							</CardTitle>
							<CardDescription>{reportSourceDescription}</CardDescription>
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
					<div className="rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<LayersIcon className="size-4 text-primary" />
							Report type
						</div>
						<p className="mt-2 text-sm text-muted-foreground">{reportSourceLabel}</p>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<LinkIcon className="size-4 text-primary" />
							Source IDs
						</div>
						<p className="mt-2 font-mono text-xs text-muted-foreground">
							{isCombined ? (
								<>
									A: {auditId?.slice(0, 8)}… · S: {surveyId?.slice(0, 8)}…
								</>
							) : (
								<>Submission: {submissionId?.slice(0, 8)}…</>
							)}
						</p>
					</div>
					<div className="rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<CheckCircleIcon className="size-4 text-primary" />
							Next step
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							Save this combination to the place record so it is easy to reopen later.
						</p>
					</div>
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

			<Separator />

			{/* Report content */}
			<AuditReportView
				audit={reportSession}
				instrument={instrumentQuery.data ?? null}
				basePath={`/${rolePrefix}`}
			/>
		</div>
	);
}
