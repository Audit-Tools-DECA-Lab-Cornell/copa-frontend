"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { usePreferences } from "@/components/app/preferences-provider";
import { BackButton } from "@/components/dashboard/back-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDateTimeLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AdminSystem, playspaceApi } from "@/lib/api/playspace";
import type { PlayspaceInstrument } from "@/types/audit";

/**
 * Resolve the localized instrument from the content map,
 * preferring the user's language then falling back to "en".
 */
function resolveInstrument(system: AdminSystem, lang: string): PlayspaceInstrument | null {
	const content = system.instrument;
	const langKey = lang as keyof typeof content;
	const localized = content[langKey] ?? content.en;
	return localized ?? null;
}

export default function AdminSystemPage() {
	const t = useTranslations("admin.system");
	const formatT = useTranslations("common.format");
	const { resolvedLanguage } = usePreferences();

	const systemQuery = useQuery({
		queryKey: ["playspace", "admin", "system"],
		queryFn: () => playspaceApi.admin.system()
	});

	const instrument = useMemo(() => {
		if (!systemQuery.data) return null;
		return resolveInstrument(systemQuery.data, resolvedLanguage);
	}, [systemQuery.data, resolvedLanguage]);

	if (systemQuery.isLoading) {
		return <div className="h-40 animate-pulse rounded-card border border-edge/40 bg-card" />;
	}

	if (systemQuery.isError || !systemQuery.data || !instrument) {
		return (
			<EmptyState
				title={t("error.title")}
				description={t("error.description")}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("error.retry")}
					</Button>
				}
			/>
		);
	}

	const system = systemQuery.data;

	const totalSectionCount = instrument.sections.length;
	const totalPreAuditQuestionCount = instrument.pre_audit_questions.length;
	const totalSectionQuestionCount = instrument.sections.reduce((acc, section) => acc + section.questions.length, 0);
	const totalQuestionCount = totalPreAuditQuestionCount + totalSectionQuestionCount;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
					{ label: t("breadcrumbs.system") }
				]}
				actions={<BackButton href="/admin/dashboard" label={t("header.back")} />}
			/>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.instrumentVersion.title")}
					value={system.instrument_version}
					helper={t("stats.instrumentVersion.helper")}
					tone="info"
				/>
				<StatCard
					title={t("stats.auditSections.title")}
					value={String(totalSectionCount)}
					helper={t("stats.auditSections.helper")}
					tone="violet"
				/>
				<StatCard
					title={t("stats.questionCount.title")}
					value={String(totalQuestionCount)}
					helper={t("stats.questionCount.helper", {
						preAuditCount: totalPreAuditQuestionCount,
						sectionCount: totalSectionQuestionCount
					})}
					tone="warning"
				/>
				<StatCard
					title={t("stats.executionModes.title")}
					value={String(instrument.execution_modes.length)}
					helper={t("stats.executionModes.helper")}
					tone="success"
				/>
			</div>
			<div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
				<Card>
					<CardHeader>
						<CardTitle>{t("instrumentMetadata.title")}</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-5 pb-5 sm:grid-cols-2">
						<div className="space-y-1">
							<p className="text-xs font-semibold tracking-[0.08em] text-foreground/70">
								{t("instrumentMetadata.key")}
							</p>
							<p className="font-mono text-sm text-foreground flex items-center">
								<span className="rounded-md border-2 border-foreground/10 bg-foreground/20 p-1 text-sm">
									{system.instrument_key}
								</span>
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-xs font-semibold tracking-[0.08em] text-foreground/70">
								{t("instrumentMetadata.name")}
							</p>
							<p className="text-sm font-medium text-foreground">{instrument.instrument_name}</p>
						</div>
						<div className="space-y-1">
							<p className="text-xs font-semibold tracking-[0.08em] text-foreground/70">
								{t("instrumentMetadata.currentSheet")}
							</p>
							<p className="text-sm text-foreground">{instrument.current_sheet}</p>
						</div>
						<div className="space-y-1">
							<p className="text-xs font-semibold tracking-[0.08em] text-foreground/70">
								{t("instrumentMetadata.generated")}
							</p>
							<p className="text-sm text-foreground tabular-nums">
								{formatDateTimeLabel(system.generated_at, formatT)}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>{t("executionCoverage.title")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 pb-5">
						<p className="text-sm text-muted-foreground">{t("executionCoverage.description")}</p>
						<div className="flex flex-wrap gap-2">
							{instrument.execution_modes.map(mode => (
								<Badge key={mode.key} variant="outline">
									{mode.key}
								</Badge>
							))}
						</div>
						<div className="space-y-3">
							{instrument.execution_modes.map(mode => (
								<div key={mode.key} className="rounded-card border border-edge/40 bg-card/60 p-4">
									<p className="font-medium text-foreground">{mode.label}</p>
									{mode.description && (
										<p className="mt-1 text-sm text-muted-foreground">{mode.description}</p>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
