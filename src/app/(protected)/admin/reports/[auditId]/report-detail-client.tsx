"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { playspaceApi } from "@/lib/api/playspace";
import { AuditReportView } from "@/components/dashboard/audit-report-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/dashboard/back-button";
import { AuditExportActions } from "@/components/dashboard/audit-export-actions";

/**
 * Admin-facing individual audit report detail page.
 * Fetches the full AuditSession + instrument and renders a formatted report view.
 */
interface AdminReportDetailClientProps {
	auditId: string;
}

export function AdminReportDetailClient({ auditId }: Readonly<AdminReportDetailClientProps>) {
	const auditQuery = useQuery({
		queryKey: ["playspace", "audit", auditId],
		queryFn: () => playspaceApi.auditor.getAudit(auditId),
		enabled: typeof auditId === "string" && auditId.length > 0
	});

	const audit = auditQuery.data;

	const instrumentQuery = useQuery({
		queryKey: ["playspace", "instrument", audit?.instrument_key],
		queryFn: () => {
			if (audit?.instrument !== undefined && audit.instrument !== null) {
				return Promise.resolve(audit.instrument);
			}
			if (typeof audit?.instrument_key !== "string") {
				throw new Error("No instrument key available");
			}
			return playspaceApi.auditor.fetchInstrument(audit.instrument_key);
		},
		enabled: audit !== undefined
	});

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow="Administrator Workspace"
				title={audit?.place_name ?? "Audit Report"}
				description={audit !== undefined ? audit.project_name : "Loading report details\u2026"}
				breadcrumbs={[
					{ label: "Dashboard", href: "/admin/dashboard" },
					{ label: "Reports", href: "/admin/reports" },
					{ label: audit?.audit_code ?? "Report" }
				]}
				actions={
					<div className="flex flex-col items-end gap-2">
						{audit !== undefined && instrumentQuery.data !== undefined && (
							<AuditExportActions audit={audit} instrument={instrumentQuery.data} />
						)}
						<BackButton href="/admin/reports" label="Back to Reports" />
					</div>
				}
			/>

			{auditQuery.isLoading ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, idx) => (
						<div
							key={`skeleton-${idx}`}
							className="h-40 animate-pulse rounded-card border border-edge/40 bg-card"
						/>
					))}
				</div>
			) : null}

			{auditQuery.isError ? (
				<Card>
					<CardContent className="py-8 text-center">
						<p className="text-sm text-destructive">
							Unable to load audit report. The audit may not exist or you may not have access.
						</p>
						<Link href="/admin/reports" className="mt-3 inline-block">
							<Button variant="outline" size="sm">
								Return to Reports
							</Button>
						</Link>
					</CardContent>
				</Card>
			) : null}

			{audit !== undefined ? (
				<AuditReportView audit={audit} instrument={instrumentQuery.data ?? null} basePath="/admin" />
			) : null}
		</div>
	);
}
