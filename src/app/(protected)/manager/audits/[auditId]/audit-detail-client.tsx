"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useAuthSession } from "@/components/app/auth-session-provider";
import { AuditDetailView } from "@/components/dashboard/audit-detail-view";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { playspaceApi } from "@/lib/api/playspace";

/**
 * Manager-scoped audit detail page.
 *
 * Fetches the full audit session for the given `auditId` param.
 * Submitted audits render the complete score breakdown and response matrix.
 * Unsubmitted audits show only the header metadata with a restricted-access notice.
 */
interface ManagerAuditDetailClientProps {
	auditId: string;
}

export function ManagerAuditDetailClient({ auditId }: Readonly<ManagerAuditDetailClientProps>) {
	const router = useRouter();
	const t = useTranslations("manager.auditDetail");
	const session = useAuthSession();
	const accountId = session?.role === "manager" ? session.accountId : null;

	const auditQuery = useQuery({
		queryKey: ["playspace", "manager", "audit-detail", auditId, accountId],
		queryFn: () => playspaceApi.accounts.auditDetail(auditId),
		enabled: typeof auditId === "string" && auditId.length > 0 && accountId !== null
	});

	if (!accountId) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={t("header.eyebrow")}
					title={t("header.title")}
					description={t("header.description")}
					breadcrumbs={[
						{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
						{ label: t("breadcrumbs.audits"), href: "/manager/audits" }
					]}
				/>
				<Card>
					<CardContent className="py-8">
						<p className="text-sm text-muted-foreground">{t("missingAccount")}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (auditQuery.isLoading && !auditQuery.data) {
		return (
			<div className="space-y-6">
				<div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
				<div className="h-40 animate-pulse rounded-card border border-edge/40 bg-card" />
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={`mgr-audit-detail-skeleton-${index}`}
							className="h-32 animate-pulse rounded-card border border-edge/40 bg-card"
						/>
					))}
				</div>
				<div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />
			</div>
		);
	}

	if ((auditQuery.isError && !auditQuery.data) || !auditQuery.data) {
		return (
			<EmptyState
				title={t("error.title")}
				description={t("error.description")}
				action={
					<div className="flex items-center gap-2">
						<Button type="button" variant="outline" onClick={() => router.push("/manager/audits")}>
							<ArrowLeftIcon className="mr-1.5 size-4" />
							{t("error.backToList")}
						</Button>
						<Button type="button" onClick={() => globalThis.location.reload()}>
							{t("error.retry")}
						</Button>
					</div>
				}
			/>
		);
	}

	return (
		<AuditDetailView
			audit={auditQuery.data}
			eyebrow={t("header.eyebrow")}
			basePath="/manager"
			breadcrumbs={[
				{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
				{ label: t("breadcrumbs.audits"), href: "/manager/audits" },
				{ label: auditQuery.data.place_name }
			]}
		/>
	);
}
