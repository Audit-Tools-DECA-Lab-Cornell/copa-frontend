"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { BackButton } from "@/components/dashboard/back-button";
import { BugReportsTable } from "@/components/dashboard/bug-reports/bug-reports-table";
import { KnownIssuesManager } from "@/components/dashboard/bug-reports/known-issues-manager";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { playspaceApi } from "@/lib/api/playspace";
import type { BugReportStatus } from "@/lib/api/playspace-types";
import { isBugReportingEnabled } from "@/lib/bug-report/feature";

const RESOLVED_STATUSES = new Set<BugReportStatus>(["resolved", "wont_fix", "duplicate"]);

export default function AdminBugReportsPage() {
	const t = useTranslations("bugReport.admin");
	const queryClient = useQueryClient();

	const reportsQuery = useQuery({
		queryKey: ["playspace", "admin", "bug-reports"],
		queryFn: () => playspaceApi.bugReports.admin.list({ pageSize: 100 })
	});

	const knownIssuesQuery = useQuery({
		queryKey: ["playspace", "admin", "known-issues"],
		queryFn: () => playspaceApi.bugReports.admin.knownIssues.list()
	});

	const invalidateReports = () => queryClient.invalidateQueries({ queryKey: ["playspace", "admin", "bug-reports"] });

	const updateStatus = useMutation({
		mutationFn: ({ id, status }: { id: string; status: BugReportStatus }) =>
			playspaceApi.bugReports.admin.update(id, { status }),
		onSuccess: () => {
			toast.success(t("toast.statusUpdated"));
			void invalidateReports();
		},
		onError: () => toast.error(t("toast.error"))
	});

	const linkKnownIssue = useMutation({
		mutationFn: ({ id, knownIssueId }: { id: string; knownIssueId: string | null }) =>
			playspaceApi.bugReports.admin.update(id, { linked_known_issue_id: knownIssueId ?? undefined }),
		onSuccess: () => {
			toast.success(t("toast.linked"));
			void invalidateReports();
		},
		onError: () => toast.error(t("toast.error"))
	});

	if (!isBugReportingEnabled()) {
		return <EmptyState title={t("disabled.title")} description={t("disabled.description")} />;
	}

	const reports = reportsQuery.data?.items ?? [];
	const totalCount = reportsQuery.data?.total_count ?? 0;
	const openReports = reports.filter(r => !RESOLVED_STATUSES.has(r.status));
	const newCount = reports.filter(r => r.status === "new").length;
	const blockingCount = openReports.filter(r => r.severity === "blocking").length;
	const resolvedCount = reports.filter(r => r.status === "resolved").length;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
					{ label: t("breadcrumbs.bugReports") }
				]}
				actions={<BackButton href="/admin/dashboard" label={t("header.back")} />}
			/>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.total")}
					value={String(totalCount)}
					helper={t("stats.totalHelper")}
					tone="info"
				/>
				<StatCard
					title={t("stats.new")}
					value={String(newCount)}
					helper={t("stats.newHelper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.blocking")}
					value={String(blockingCount)}
					helper={t("stats.blockingHelper")}
					tone={blockingCount > 0 ? "primary" : "neutral"}
				/>
				<StatCard
					title={t("stats.resolved")}
					value={String(resolvedCount)}
					helper={t("stats.resolvedHelper")}
					tone="success"
				/>
			</div>

			<Tabs defaultValue="reports" className="space-y-4">
				<TabsList>
					<TabsTrigger value="reports">{t("tabs.reports")}</TabsTrigger>
					<TabsTrigger value="known-issues">{t("tabs.knownIssues")}</TabsTrigger>
				</TabsList>
				<TabsContent value="reports">
					<BugReportsTable
						reports={reports}
						knownIssues={knownIssuesQuery.data ?? []}
						isLoading={reportsQuery.isLoading}
						onUpdateStatus={(id, status) => updateStatus.mutate({ id, status })}
						onLinkKnownIssue={(id, knownIssueId) => linkKnownIssue.mutate({ id, knownIssueId })}
					/>
				</TabsContent>
				<TabsContent value="known-issues">
					<KnownIssuesManager />
				</TabsContent>
			</Tabs>
		</div>
	);
}
