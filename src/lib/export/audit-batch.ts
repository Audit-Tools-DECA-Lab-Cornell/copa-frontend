/**
 * Per-entity file generation for bulk ZIP exports.
 *
 * Each rich entity (a submitted audit or a combined place report) produces two
 * files: a PDF (always) and an Excel data file for admin/manager ZIP exports.
 * These are the exact same generators the individual export pages use, so a file
 * pulled from a ZIP is byte-identical to its single-page download.
 */

import {
	generateSingleAuditBlob,
	generateSingleAuditPdfBlob,
	type AuditExportDataFormat,
	type ExportableAudit
} from "./audit";
import type { PlayspaceInstrument } from "@/types/audit";

/** One generated file belonging to a rich entity. */
export interface BatchExportFile {
	readonly filename: string;
	readonly blob: Blob;
	readonly kind: "pdf" | "data";
}

/** The PDF + data files generated for one rich entity. */
export interface BatchExportResult {
	readonly entityId: string;
	readonly entityCode: string;
	readonly files: readonly BatchExportFile[];
}

/**
 * Generates the PDF and Excel data file for a single rich entity. Used for both
 * standalone audits and merged combined-report sessions.
 *
 * @param exportedAt - Shared ISO timestamp so every file in one archive agrees.
 */
export async function buildEntityFiles(
	entityId: string,
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument | null,
	format: AuditExportDataFormat,
	exportedAt: string
): Promise<BatchExportResult> {
	const pdf = await generateSingleAuditPdfBlob(exportableAudit, instrument);
	const data = generateSingleAuditBlob(exportableAudit, instrument, format, undefined, exportedAt);

	return {
		entityId,
		entityCode: exportableAudit.auditSession.audit_code,
		files: [
			{ filename: pdf.filename, blob: pdf.blob, kind: "pdf" },
			{ filename: data.filename, blob: data.blob, kind: "data" }
		]
	};
}
