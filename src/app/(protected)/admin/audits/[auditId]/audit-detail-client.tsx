"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { AuditDetailView } from "@/components/dashboard/audit-detail-view";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { playspaceApi } from "@/lib/api/playspace";

/**
 * Admin-scoped audit detail page.
 *
 * Fetches the full audit session for the given `auditId` param.
 * Submitted audits render the complete score breakdown and response matrix.
 * Unsubmitted audits show only the header metadata with a restricted-access notice.
 */
interface AdminAuditDetailClientProps {
	auditId: string;
}

export function AdminAuditDetailClient({ auditId }: Readonly<AdminAuditDetailClientProps>) {
	const router = useRouter();
	const t = useTranslations("admin.auditDetail");

	const auditQuery = useQuery({
		queryKey: ["playspace", "admin", "audit-detail", auditId],
		queryFn: () => playspaceApi.admin.auditDetail(auditId),
		enabled: typeof auditId === "string" && auditId.length > 0
	});

	if (auditQuery.isLoading && !auditQuery.data) {
		return (
			<div className="space-y-6">
				<div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
				<div className="h-40 animate-pulse rounded-card border border-edge/40 bg-card" />
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={`admin-audit-detail-skeleton-${index}`}
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
						<Button type="button" variant="outline" onClick={() => router.push("/admin/audits")}>
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
			basePath="/admin"
			breadcrumbs={[
				{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
				{ label: t("breadcrumbs.audits"), href: "/admin/audits" },
				{ label: auditQuery.data.place_name }
			]}
		/>
	);
}
