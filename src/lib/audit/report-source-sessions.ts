import type { AuditSession } from "@/types/audit";

/**
 * The source component attached to one question row inside a combined place report.
 */
export type ReportSourceComponent = "audit" | "survey";

/**
 * Original submitted sessions that were stitched together to build a combined place report.
 */
export interface CombinedReportSources {
	readonly audit: AuditSession;
	readonly survey: AuditSession;
}

/**
 * Runtime extension attached to synthetic combined sessions so downstream helpers can
 * recover the original source submissions without changing every call site.
 */
export interface CombinedReportSession {
	readonly report_sources: CombinedReportSources;
}

/**
 * Shared copy and colors for source-aware combined report rendering.
 */
export const REPORT_SOURCE_STYLES = {
	audit: {
		label: "Place Audit source",
		hex: "#FFF4E5",
		rgb: [255, 244, 229] as const,
		cssClassName: "bg-amber-50/80 dark:bg-amber-950/20"
	},
	survey: {
		label: "Place Survey source",
		hex: "#EFF6FF",
		rgb: [239, 246, 255] as const,
		cssClassName: "bg-sky-50/80 dark:bg-sky-950/20"
	}
} as const;

/**
 * Safely reads the original report sources from a possibly synthetic audit session.
 */
export function getCombinedReportSources(auditSession: AuditSession): CombinedReportSources | null {
	const candidate = (auditSession as Partial<CombinedReportSession>).report_sources;
	if (candidate === undefined) {
		return null;
	}
	if (candidate.audit === undefined || candidate.survey === undefined) {
		return null;
	}
	return candidate;
}

/**
 * Type guard for source-aware combined sessions.
 */
export function hasCombinedReportSources(
	auditSession: AuditSession
): auditSession is AuditSession & CombinedReportSession {
	return getCombinedReportSources(auditSession) !== null;
}

/**
 * Human-readable label for one source component.
 */
export function getReportSourceLabel(component: ReportSourceComponent): string {
	return REPORT_SOURCE_STYLES[component].label;
}

/**
 * One-line legend shown only for truly combined reports.
 */
export function getCombinedReportLegend(): string {
	return "Warm item highlight = Place Audit source; cool item highlight = Place Survey source.";
}
