import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getLocale, getTranslations } from "next-intl/server";

import { AssetGallery } from "@/components/dashboard/asset-gallery";
import { BackButton } from "@/components/dashboard/back-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import type { AssetIndex } from "@/lib/cloudinary-images";

function loadIndex(): AssetIndex | null {
	// assets/ is a sibling directory of the frontend repo
	const path = join(process.cwd(), "../assets/asset-index.json");
	if (!existsSync(path)) return null;
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as AssetIndex;
	} catch {
		return null;
	}
}

export default async function AssetsPage() {
	const t = await getTranslations("assets");
	const locale = await getLocale();
	const index = loadIndex();

	const breadcrumbs = [{ label: t("breadcrumbDashboard"), href: "/admin/dashboard" }, { label: t("title") }];

	if (!index) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={t("eyebrow")}
					title={t("title")}
					description={t("descriptionEmpty")}
					breadcrumbs={breadcrumbs}
					actions={<BackButton href="/admin/dashboard" label={t("backToDashboard")} />}
				/>
				<EmptyState
					title={t("noIndexTitle")}
					description={t.rich("noIndexBody", {
						code: chunks => (
							<code className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs">{chunks}</code>
						)
					})}
				/>
			</div>
		);
	}

	const { breakdown } = index;
	const pendingCount = index.totalCount - index.cloudinaryUploadedCount;

	const indexDate = new Date(index.generatedAt).toLocaleDateString(locale, {
		month: "short",
		day: "numeric",
		year: "numeric"
	});

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("eyebrow")}
				title={t("title")}
				description={t("description")}
				breadcrumbs={breadcrumbs}
				actions={<BackButton href="/admin/dashboard" label={t("backToDashboard")} />}
			/>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.total")}
					value={String(index.totalCount)}
					helper={t("stats.totalHelper", { date: indexDate })}
					tone="neutral"
				/>
				<StatCard
					title={t("stats.mobile")}
					value={String(breakdown.mobileFramed + breakdown.mobileRaw)}
					helper={t("stats.breakdownHelper", { framed: breakdown.mobileFramed, raw: breakdown.mobileRaw })}
					tone="info"
				/>
				<StatCard
					title={t("stats.web")}
					value={String(breakdown.webFramed + breakdown.webRaw)}
					helper={t("stats.breakdownHelper", { framed: breakdown.webFramed, raw: breakdown.webRaw })}
					tone="violet"
				/>
				<StatCard
					title={t("stats.pending")}
					value={String(pendingCount)}
					helper={
						pendingCount === 0
							? t("stats.pendingAllHelper")
							: t("stats.pendingHelper", {
									uploaded: index.cloudinaryUploadedCount,
									total: index.totalCount
								})
					}
					tone={pendingCount > 0 ? "warning" : "success"}
				/>
			</div>

			<AssetGallery index={index} />
		</div>
	);
}
