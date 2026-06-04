"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { AccountDetail, AuditorSummary, ManagerProfile, ProjectSummary } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { AuditorsTable } from "@/components/dashboard/auditors-table";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InviteManagerDialog } from "@/components/dashboard/invite-manager-dialog";
import { ProjectsTable } from "@/components/dashboard/projects-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatAuditCodeReference, formatDateTimeLabel, formatScorePairLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function OverviewPanels({
	account,
	managerProfiles,
	auditors
}: Readonly<{
	account: AccountDetail;
	managerProfiles: ManagerProfile[];
	auditors: AuditorSummary[];
}>) {
	const t = useTranslations("manager.dashboard.overview");

	return (
		<div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
			<Card>
				<CardHeader>
					<CardTitle>{t("primaryManager.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{account.primary_manager ? (
						<>
							<div className="space-y-1">
								<p className="text-lg font-medium text-foreground">
									{account.primary_manager.full_name}
								</p>
								<p className="text-sm text-muted-foreground">
									{account.primary_manager.position ?? t("primaryManager.positionPending")}
								</p>
								<p className="text-sm text-muted-foreground">{account.primary_manager.email}</p>
								<p className="text-sm text-muted-foreground">
									{account.primary_manager.phone ?? t("primaryManager.phonePending")}
								</p>
							</div>
							<p className="text-sm text-muted-foreground">
								{t("primaryManager.accountEmail", { email: account.email })}
							</p>
						</>
					) : (
						<p className="text-sm text-muted-foreground">{t("primaryManager.empty")}</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("teamSnapshot.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-2">
						<Badge variant="outline">
							{t("teamSnapshot.managerCount", { count: managerProfiles.length })}
						</Badge>
						<Badge variant="outline">{t("teamSnapshot.auditorCount", { count: auditors.length })}</Badge>
					</div>
					<div className="space-y-3">
						{managerProfiles.map(profile => (
							<div
								key={profile.id}
								className="flex items-start justify-between gap-4 rounded-card border border-edge/40 bg-card/60 p-4">
								<div className="space-y-1">
									<p className="font-medium text-foreground">{profile.full_name}</p>
									<p className="text-sm text-muted-foreground">
										{profile.position ?? t("teamSnapshot.positionPending")}
									</p>
								</div>
								{profile.is_primary ? (
									<Badge>{t("teamSnapshot.primary")}</Badge>
								) : (
									<Badge variant="secondary">{t("teamSnapshot.manager")}</Badge>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Returns true when the authenticated session user is the primary manager.
 */
function isPrimaryManagerProfile(userEmail: string | null | undefined, managerProfiles: ManagerProfile[]): boolean {
	if (!userEmail) return false;
	const normalized = userEmail.toLowerCase();
	return managerProfiles.some(p => p.is_primary && p.email.toLowerCase() === normalized);
}

export interface ManagerDashboardClientProps {
	account?: AccountDetail;
	managerProfiles?: ManagerProfile[];
	projects?: ProjectSummary[];
	auditors?: AuditorSummary[];
	errorMessage?: string | null;
}

export function ManagerDashboardClient({
	account,
	managerProfiles,
	projects,
	auditors,
	errorMessage
}: Readonly<ManagerDashboardClientProps>) {
	const t = useTranslations("manager.dashboard");
	const formatT = useTranslations("common.format");
	const session = useAuthSession();
	const [isInviteOpen, setIsInviteOpen] = React.useState(false);

	const isPrimary = isPrimaryManagerProfile(session?.userEmail, managerProfiles ?? []);

	if (!account || !managerProfiles || !projects || !auditors) {
		return (
			<EmptyState
				title={t("emptyState.title")}
				description={errorMessage ?? t("errors.loadFailed")}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("actions.tryAgain")}
					</Button>
				}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={account.name}
				description={t("header.description")}
				actions={
					<div className="flex items-center gap-2">
						{isPrimary ? (
							<Button type="button" variant="outline" onClick={() => setIsInviteOpen(true)}>
								{t("header.inviteManager")}
							</Button>
						) : null}
						<Button asChild>
							<Link href="/manager/projects">{t("header.viewProjects")}</Link>
						</Button>
					</div>
				}
			/>

			<InviteManagerDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.projects.title")}
					value={String(account.stats.total_projects)}
					helper={t("stats.projects.helper")}
				/>
				<StatCard
					title={t("stats.places.title")}
					value={String(account.stats.total_places)}
					helper={t("stats.places.helper")}
					tone="violet"
				/>
				<StatCard
					title={t("stats.auditors.title")}
					value={String(account.stats.total_auditors)}
					helper={t("stats.auditors.helper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.completedAudits.title")}
					value={String(account.stats.total_audits_completed)}
					helper={t("stats.completedAudits.helper")}
					tone="success"
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("recentActivity.title")}</CardTitle>
					<CardAction>
						<Button asChild size="sm" variant="outline">
							<Link href="/manager/audits">{t("recentActivity.viewAll")}</Link>
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent className="space-y-3">
					{account.recent_activity.length > 0 ? (
						account.recent_activity.map(activity => (
							<Link
								key={activity.audit_id}
								href={`/manager/audits/${encodeURIComponent(activity.audit_id)}`}
								className="flex flex-col gap-3 rounded-card border border-edge/40 bg-card/60 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5">
								<div className="space-y-1">
									<p className="font-medium text-foreground">{activity.place_name}</p>
									<p className="text-sm text-muted-foreground">{activity.project_name}</p>
									<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
										<code
											title={activity.audit_code}
											className="rounded-sm bg-muted-foreground px-1 py-1 font-mono text-[13px] tracking-[0.04em] text-secondary">
											{formatAuditCodeReference(activity.audit_code)}
										</code>
										<span>{formatDateTimeLabel(activity.completed_at, formatT)}</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-2">
									<Badge variant="secondary" className="font-medium">
										{t("recentActivity.submitted")}
									</Badge>
									<Badge className="font-mono tabular-nums">
										{t("recentActivity.score", {
											value: formatScorePairLabel(activity.score_pair, formatT)
										})}
									</Badge>
								</div>
							</Link>
						))
					) : (
						<p className="text-sm text-muted-foreground">{t("recentActivity.empty")}</p>
					)}
				</CardContent>
			</Card>

			<div className="flex flex-col gap-6">
				<Tabs defaultValue={projects.length > 0 ? "projects" : "auditors"} className="gap-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<TabsList>
							<TabsTrigger value="projects">{t("tabs.projects")}</TabsTrigger>
							<TabsTrigger value="auditors">{t("tabs.auditors")}</TabsTrigger>
						</TabsList>
						<p className="text-sm text-muted-foreground">{t("tabs.description")}</p>
					</div>
					<TabsContent value="projects">
						{projects.length > 0 ? (
							<ProjectsTable
								projects={projects}
								title={t("projectOverview.title")}
								description={t("projectOverview.description")}
								pageSize={5}
								action={
									<Button asChild size="sm" variant="outline" className="h-9 gap-2 px-3.5">
										<Link href="/manager/projects">{t("projectOverview.viewAll")}</Link>
									</Button>
								}
							/>
						) : (
							<EmptyState
								title={t("projectOverview.emptyTitle")}
								description={t("projectOverview.emptyDescription")}
								action={
									<Button asChild variant="outline">
										<Link href="/manager/projects">{t("projectOverview.openProjects")}</Link>
									</Button>
								}
							/>
						)}
					</TabsContent>
					<TabsContent value="auditors">
						{auditors.length > 0 ? (
							<AuditorsTable
								auditors={auditors}
								title={t("auditorOverview.title")}
								description={t("auditorOverview.description")}
								pageSize={5}
								action={
									<Button asChild size="sm" variant="outline">
										<Link href="/manager/auditors">{t("auditorOverview.viewAll")}</Link>
									</Button>
								}
							/>
						) : (
							<EmptyState
								title={t("auditorOverview.emptyTitle")}
								description={t("auditorOverview.emptyDescription")}
								action={
									<Button asChild variant="outline">
										<Link href="/manager/auditors">{t("auditorOverview.openAuditors")}</Link>
									</Button>
								}
							/>
						)}
					</TabsContent>
				</Tabs>
			</div>

			<OverviewPanels account={account} managerProfiles={managerProfiles} auditors={auditors} />
		</div>
	);
}
