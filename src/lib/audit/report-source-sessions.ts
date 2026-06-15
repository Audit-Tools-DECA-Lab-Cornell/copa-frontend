import type { AuditSession as SourceAuditSession } from "@/lib/api/playspace-types";
import type { AuditSession as ExportAuditSession } from "@/types/audit";

/**
 * The source component attached to one question row inside a combined place report.
 */
export type ReportSourceComponent = "audit" | "survey";

/**
 * Original submitted sessions that were stitched together to build a combined place report.
 */
export interface CombinedReportSources {
	readonly audit: SourceAuditSession;
	readonly survey: SourceAuditSession;
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
		label: "source: Place Audit",
		hex: "#FEF3C7",
		rgb: [254, 243, 199] as const,
		cssClassName: "bg-amber-100/80 dark:bg-amber-950/25"
	},
	survey: {
		label: "source: Place Survey",
		hex: "#DBEAFE",
		rgb: [219, 234, 254] as const,
		cssClassName: "bg-sky-100/80 dark:bg-sky-950/30"
	}
} as const;

/**
 * Safely reads the original report sources from a possibly synthetic audit session.
 */
export function getCombinedReportSources(auditSession: ExportAuditSession): CombinedReportSources | null {
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
	auditSession: ExportAuditSession
): auditSession is ExportAuditSession & CombinedReportSession {
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
	return "Warm item highlight := source: Place Audit; cool item highlight := source: Place Survey.";
}
