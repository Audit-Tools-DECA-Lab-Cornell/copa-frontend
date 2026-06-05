/**
 * JSON export for the audit pipeline.
 *
 * Produces a lossless, machine-readable representation of a single audit: the
 * full submitted session plus the geographic context and auditor profile that
 * accompany every export. The shape mirrors the data the PDF and XLSX formats
 * render, so a JSON consumer sees the same source of truth.
 */

import type { ExportableAudit, PlayspaceInstrument } from "./types";

/** Top-level structure of a single-audit JSON export. */
export interface AuditJsonExport {
	readonly exported_at: string;
	readonly instrument: { readonly id: string | null; readonly version: number | null } | null;
	readonly context: ExportableAudit["context"];
	readonly auditor_profile: ExportableAudit["auditorProfile"];
	readonly audit: ExportableAudit["auditSession"];
}

/**
 * Generates a JSON blob for a single audit. The instrument is referenced by
 * id/version only - the full instrument definition is not embedded, since the
 * audit session already carries the answers and computed scores.
 */
export function generateJsonBlob(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument,
	exportedAt: string
): Blob {
	const instrumentRef = instrument as unknown as { id?: string; version?: number };

	const payload: AuditJsonExport = {
		exported_at: exportedAt,
		instrument: {
			id: instrumentRef.id ?? null,
			version: instrumentRef.version ?? null
		},
		context: exportableAudit.context,
		auditor_profile: exportableAudit.auditorProfile,
		audit: exportableAudit.auditSession
	};

	return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}
