"use client";

import { useTranslations } from "next-intl";

import { usePreferences } from "@/components/app/preferences-provider";
import { StatCard } from "@/components/dashboard/stat-card";
import type { PlayspaceInstrument } from "@/types/audit";

import type { InstrumentContent } from "./types";

function resolveInstrument(content: InstrumentContent, lang: string): PlayspaceInstrument | null {
	const langKey = lang as keyof typeof content;
	return content[langKey] ?? content.en ?? null;
}

export function InstrumentOverview({ content, version }: Readonly<{ content: InstrumentContent; version: string }>) {
	const t = useTranslations("admin.instruments.overview");
	const { resolvedLanguage } = usePreferences();

	const instrument = resolveInstrument(content, resolvedLanguage);
	if (!instrument) return null;

	const totalSectionCount = instrument.sections.length;
	const totalPreAuditQuestionCount = instrument.pre_audit_questions.length;
	const totalSectionQuestionCount = instrument.sections.reduce((acc, section) => acc + section.questions.length, 0);
	const totalQuestionCount = totalPreAuditQuestionCount + totalSectionQuestionCount;

	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<StatCard
				title={t("stats.instrumentVersion.title")}
				value={version}
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
	);
}
