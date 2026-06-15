"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatAuditCodeReference } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminAuditRow, AdminOverview } from "@/lib/api/playspace";

export interface AdminDashboardClientProps {
	overview?: AdminOverview;
	latestAudits?: AdminAuditRow[];
	errorMessage?: string | null;
}

export function AdminDashboardClient({ overview, latestAudits, errorMessage }: Readonly<AdminDashboardClientProps>) {
	const t = useTranslations("admin.dashboard");

	if (!overview || !latestAudits) {
		return (
			<EmptyState
				title={t("error.title")}
				description={errorMessage ?? t("error.description")}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("error.retry")}
					</Button>
				}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Button asChild variant="secondary">
							<Link href="/admin/accounts">{t("header.actions.accounts")}</Link>
						</Button>
						<Button asChild variant="secondary">
							<Link href="/admin/audits">{t("header.actions.audits")}</Link>
						</Button>
					</div>
				}
			/>
			<div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 ">
				<StatCard
					title={t("stats.accounts.title")}
					value={String(overview.total_accounts)}
					helper={t("stats.accounts.helper")}
					tone="info"
				/>
				<StatCard
					title={t("stats.projects.title")}
					value={String(overview.total_projects)}
					helper={t("stats.projects.helper")}
					tone="primary"
				/>
				<StatCard
					title={t("stats.places.title")}
					value={String(overview.total_places)}
					helper={t("stats.places.helper")}
					tone="violet"
				/>
				<StatCard
					title={t("stats.auditors.title")}
					value={String(overview.total_auditors)}
					helper={t("stats.auditors.helper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.submitted.title")}
					value={String(overview.submitted_audits)}
					helper={t("stats.submitted.helper")}
				/>
				<StatCard
					title={t("stats.inProgress.title")}
					value={String(overview.in_progress_audits)}
					helper={t("stats.inProgress.helper")}
					tone="violet"
				/>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>{t("latestAudits.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{latestAudits.length === 0 ? (
						<p className="text-sm text-muted-foreground">{t("latestAudits.empty")}</p>
					) : (
						latestAudits.map(audit => (
							<Link
								key={audit.audit_id}
								href={`/admin/audits/${encodeURIComponent(audit.audit_id)}`}
								className="flex flex-col gap-3 rounded-card border border-edge/40 bg-card/60 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 lg:flex-row lg:items-center lg:justify-between">
								<div className="space-y-1">
									<p className="font-medium text-foreground">{audit.place_name}</p>
									<p className="text-sm text-muted-foreground">
										{audit.account_name} · {audit.project_name}
									</p>
									<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
										<code
											title={audit.audit_code}
											className="rounded-md bg-muted/65 px-2 py-1 font-mono text-[13px] tracking-[0.04em] text-foreground/80">
											{formatAuditCodeReference(audit.audit_code)}
										</code>
										<span>
											{t("latestAudits.auditorLabel")}{" "}
											<span className="font-mono text-foreground tracking-[0.04em]">
												{audit.auditor_code}
											</span>
										</span>
									</div>
								</div>
								<Badge
									variant={audit.status === "SUBMITTED" ? "default" : "secondary"}
									className="font-medium">
									{t(`status.${audit.status.toLowerCase()}`)}
								</Badge>
							</Link>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}
