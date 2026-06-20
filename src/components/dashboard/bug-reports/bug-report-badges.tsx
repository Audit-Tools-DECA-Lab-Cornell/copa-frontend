"use client";

import { Circle, Laptop, Monitor, Smartphone, Square, Triangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

import type { BugReportSeverity, BugReportStatus, BugReportSurface, KnownIssueStatus } from "@/lib/api/playspace-types";
import { cn } from "@/lib/utils";

type Tone = "danger" | "warning" | "info" | "success" | "inProgress" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
	danger: "bg-status-danger-surface text-status-danger border-status-danger-border",
	warning: "bg-status-warning-surface text-status-warning border-status-warning-border",
	info: "bg-status-info-surface text-status-info border-status-info-border",
	success: "bg-status-success-surface text-status-success border-status-success-border",
	inProgress: "bg-status-in-progress-surface text-status-in-progress border-status-in-progress-border",
	neutral: "bg-muted text-muted-foreground border-border"
};

const SEVERITY_TONE: Record<BugReportSeverity, Tone> = {
	blocking: "danger",
	major: "warning",
	minor: "info"
};

/** Distinct shape per severity so the cue survives color-blindness (WCAG 1.4.1). */
const SEVERITY_SHAPE: Record<BugReportSeverity, ComponentType<{ className?: string }>> = {
	blocking: Triangle,
	major: Circle,
	minor: Square
};

const STATUS_TONE: Record<BugReportStatus, Tone> = {
	new: "info",
	triaged: "warning",
	in_progress: "inProgress",
	resolved: "success",
	wont_fix: "neutral",
	duplicate: "neutral"
};

const SURFACE_ICON: Record<BugReportSurface, ComponentType<{ className?: string }>> = {
	web: Monitor,
	mobile: Smartphone,
	desktop: Laptop
};

/** Soft, tone-colored pill used across the bug-report dashboard. */
export function Pill({
	tone,
	children,
	className,
	...props
}: Readonly<{ tone: Tone; children: React.ReactNode; className?: string } & React.ComponentProps<"span">>) {
	return (
		<span
			className={cn(
				"inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
				TONE_CLASS[tone],
				className
			)}
			{...props}>
			{children}
		</span>
	);
}

export function SeverityBadge({ severity }: Readonly<{ severity: BugReportSeverity }>) {
	const t = useTranslations("bugReport.severityShort");
	const ariaT = useTranslations("bugReport.severityAria");
	const tone = SEVERITY_TONE[severity];
	const Shape = SEVERITY_SHAPE[severity];
	return (
		<Pill tone={tone} aria-label={ariaT(severity)}>
			<Shape className="size-2.5 fill-current" aria-hidden="true" />
			{t(severity)}
		</Pill>
	);
}

export function StatusBadge({ status }: Readonly<{ status: BugReportStatus }>) {
	const t = useTranslations("bugReport.status");
	return <Pill tone={STATUS_TONE[status]}>{t(status)}</Pill>;
}

const KNOWN_ISSUE_TONE: Record<KnownIssueStatus, Tone> = {
	open: "info",
	monitoring: "warning",
	fixed: "success"
};

export function KnownIssueStatusBadge({ status }: Readonly<{ status: KnownIssueStatus }>) {
	const t = useTranslations("bugReport.knownIssueStatus");
	return <Pill tone={KNOWN_ISSUE_TONE[status]}>{t(status)}</Pill>;
}

export function SurfaceBadge({ surface }: Readonly<{ surface: BugReportSurface }>) {
	const t = useTranslations("bugReport.surface");
	const Icon = SURFACE_ICON[surface];
	return (
		<span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
			<Icon className="size-4 shrink-0" aria-hidden="true" />
			{t(surface)}
		</span>
	);
}
