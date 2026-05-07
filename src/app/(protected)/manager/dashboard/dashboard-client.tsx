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
import { formatDateTimeLabel } from "@/components/dashboard/utils";
import { BezelCard, BezelCardBody } from "@/components/ui/bezel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusPanel } from "@/components/app/project-status-panel";
import { ScoreDisplayCompact } from "@/components/ui/score-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function useCountUp(target: number | null, duration: number, enabled: boolean): number | null {
	const [value, setValue] = React.useState(0);

	React.useEffect(() => {
		if (!enabled || target === null) return;

		const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		if (prefersReducedMotion) {
			setValue(target);
			return;
		}

		const start = Date.now();

		const tick = () => {
			const elapsed = Date.now() - start;
			const progress = Math.min(elapsed / duration, 1);
			const ease = 1 - Math.pow(1 - progress, 3);
			const currentValue = parseFloat((target * ease).toFixed(1));
			setValue(currentValue);

			if (progress < 1) {
				requestAnimationFrame(tick);
			}
		};

		requestAnimationFrame(tick);
	}, [target, duration, enabled]);

	return target === null ? null : value;
}

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
								className="flex items-start justify-between gap-4 rounded-card border border-border/70 bg-card/60 p-4">
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

	const [isVisible, setIsVisible] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => observer.disconnect();
	}, []);

	const activeAuditsCount = useCountUp(8, 700, isVisible);
	const placesCount = useCountUp(account?.stats.total_places ?? null, 800, isVisible);
	const auditorsCount = useCountUp(account?.stats.total_auditors ?? null, 900, isVisible);
	const completedCount = useCountUp(account?.stats.total_audits_completed ?? null, 900, isVisible);

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

			<div ref={containerRef} className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				<BezelCard className="xl:col-span-3">
					<BezelCardBody className="flex flex-col justify-between">
						<div className="space-y-1">
							<h3 className="font-sans text-[11px] font-medium tracking-[0.04em] uppercase text-text-muted">
								Active Audits
							</h3>
							<div className="flex items-baseline gap-3">
								<span className="font-heading text-[48px] font-bold text-accent-terracotta">
									{activeAuditsCount ?? 8}
								</span>
								<span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-terracotta animate-[pulse_2.4s_ease-in-out_infinite]" />
							</div>
						</div>
						<p className="font-sans text-[12px] text-text-muted">+2 since yesterday</p>
					</BezelCardBody>
				</BezelCard>

				<BezelCard className="xl:col-span-1">
					<BezelCardBody>
						<StatCard
							title={t("stats.places.title")}
							value={String(placesCount ?? account.stats.total_places)}
							helper={t("stats.places.helper")}
							valueClassName="text-[32px] md:text-[32px]"
						/>
					</BezelCardBody>
				</BezelCard>

				<BezelCard className="xl:col-span-1">
					<BezelCardBody>
						<StatCard
							title={t("stats.auditors.title")}
							value={String(auditorsCount ?? account.stats.total_auditors)}
							helper={t("stats.auditors.helper")}
							valueClassName="text-[32px] md:text-[32px]"
						/>
					</BezelCardBody>
				</BezelCard>

				<BezelCard className="xl:col-span-1">
					<BezelCardBody>
						<StatCard
							title={t("stats.completedAudits.title")}
							value={String(completedCount ?? account.stats.total_audits_completed)}
							helper={t("stats.completedAudits.helper")}
							valueClassName="text-accent-moss text-[32px] md:text-[32px]"
						/>
					</BezelCardBody>
				</BezelCard>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>{t("recentActivity.title")}</CardTitle>
						<CardAction>
							<Button asChild size="sm" variant="outline">
								<Link href="/manager/audits">{t("recentActivity.viewAll")}</Link>
							</Button>
						</CardAction>
					</CardHeader>
					<CardContent className="space-y-0 divide-y divide-edge">
						{account.recent_activity.length > 0 ? (
							account.recent_activity.map(activity => (
								<Link
									key={activity.audit_id}
									href={`/manager/audits/${encodeURIComponent(activity.audit_id)}`}
									className="flex flex-col gap-3 rounded-0 px-0 py-4 first:pt-0 last:pb-0 transition-colors hover:bg-accent/5">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 space-y-1">
											<p className="font-heading text-[14px] font-semibold text-text-primary">
												{activity.place_name}
											</p>
											<p className="font-sans text-[12px] text-text-secondary">
												{activity.project_name}
											</p>
											<p className="font-sans text-[11px] text-text-muted">
												{formatDateTimeLabel(activity.completed_at, formatT)}
											</p>
											<p className="font-sans text-[11px] text-text-muted opacity-60">
												{activity.audit_code}
											</p>
										</div>
										<div className="flex items-center gap-3 flex-shrink-0">
											<ScoreDisplayCompact
												pv={activity.score_pair?.pv}
												u={activity.score_pair?.u}
												size="sm"
											/>
											<Badge className="font-sans text-[11px] font-medium whitespace-nowrap">
												{t("recentActivity.submitted")}
											</Badge>
										</div>
									</div>
								</Link>
							))
						) : (
							<p className="text-sm text-muted-foreground">{t("recentActivity.empty")}</p>
						)}
					</CardContent>
				</Card>

				<ProjectStatusPanel
					projects={projects.map(p => ({
						name: p.name,
						completedPlaces: p.audits_completed ?? 0,
						inProgressPlaces: 0,
						totalPlaces: p.places_count ?? 0
					}))}
				/>
			</div>

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
