/**
 * Audit export - public surface.
 *
 * All format-specific and domain logic lives in dedicated modules:
 *   - types.ts        - interfaces, constants, palette helpers
 *   - format-utils.ts - pure text / number formatters
 *   - score-utils.ts  - score calculation and AuditScoreTotals helpers
 *   - row-builders.ts - spreadsheet row factories
 *   - excel.ts        - XLSX / CSV blob generation
 *   - json.ts         - structured JSON blob generation
 *   - pdf.ts          - jsPDF / autotable PDF blob generation
 *
 * Consumers should import from this file only. The module split is an internal
 * concern; this file is the stable contract.
 */

// ── Public types ──────────────────────────────────────────────────────────────

export type {
	AuditExportFormat,
	AuditExportDataFormat,
	AuditExportContext,
	ExportAuditorProfile,
	ExportableAudit,
	AuditExportAppearance
} from "./types";

// ── Public utilities ──────────────────────────────────────────────────────────

import { slugifySegment } from "./format-utils";
import { generatePdfBlob } from "./pdf";
import { generateCsvBlob, generateXlsxBlob } from "./excel";
import { generateJsonBlob } from "./json";
import type {
	AuditExportAppearance,
	AuditExportDataFormat,
	AuditExportFormat,
	ExportableAudit,
	PlayspaceInstrument
} from "./types";

/**
 * Validates that the audit is in a state that permits export.
 * Throws when the audit has not been submitted.
 */
function validateExportableAudit(exportableAudit: ExportableAudit): void {
	if (exportableAudit.auditSession.status !== "SUBMITTED") {
		throw new Error("Only submitted audits can be exported.");
	}
}

/** Triggers a browser download for the given blob using an anchor-click approach. */
function triggerBrowserDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

/**
 * Builds the download filename for an audit export.
 *
 * @example
 * buildExportFileName("AUD-ACME-24-001234", "pdf")
 * // → "pvua-aud-acme-24-001234.pdf"
 */
export function buildExportFileName(auditCode: string, format: AuditExportFormat): string {
	const slug = slugifySegment(auditCode);
	return `pvua-${slug}.${format}`;
}

/** Result of a blob-only export: the generated blob plus its conventional filename. */
export interface AuditExportBlob {
	readonly blob: Blob;
	readonly filename: string;
}

/**
 * Generates the structured-data blob (XLSX or JSON) for a single audit without
 * triggering a download. This is the reuse target for bulk ZIP exports - it runs
 * the exact same generators as the individual-page download path.
 *
 * @throws {Error} When the audit has not been submitted.
 * @throws {Error} When `instrument` is null.
 */
export function generateSingleAuditBlob(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument | null,
	format: AuditExportDataFormat,
	appearance?: AuditExportAppearance,
	exportedAt: string = new Date().toISOString()
): AuditExportBlob {
	validateExportableAudit(exportableAudit);

	if (instrument === null) {
		throw new Error("An instrument definition is required for export.");
	}

	const filename = buildExportFileName(exportableAudit.auditSession.audit_code, format);
	const blob =
		format === "json"
			? generateJsonBlob(exportableAudit, instrument, exportedAt)
			: generateXlsxBlob(exportableAudit, instrument, appearance);

	return { blob, filename };
}

/**
 * Generates the PDF blob for a single audit without triggering a download. Bulk
 * ZIP exports always include a PDF alongside the chosen data file.
 *
 * @throws {Error} When the audit has not been submitted.
 * @throws {Error} When `instrument` is null.
 */
export async function generateSingleAuditPdfBlob(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument | null
): Promise<AuditExportBlob> {
	validateExportableAudit(exportableAudit);

	if (instrument === null) {
		throw new Error("An instrument definition is required for export.");
	}

	const filename = buildExportFileName(exportableAudit.auditSession.audit_code, "pdf");
	const blob = await generatePdfBlob(exportableAudit, instrument);
	return { blob, filename };
}

/**
 * Generates the export blob for the requested format and triggers a browser
 * file download. Resolves with the download filename once initiated.
 *
 * @param exportableAudit - Audit session + context + auditor profile.
 * @param instrument      - Instrument definition (required for all formats).
 * @param format          - `"pdf"`, `"xlsx"`, `"json"`, or `"csv"`.
 * @param appearance      - Optional XLSX colour palette override.
 *
 * @throws {Error} When the audit has not been submitted.
 * @throws {Error} When `instrument` is null.
 * @throws {Error} When an unsupported format is provided.
 */
export async function downloadSingleAuditExport(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument | null,
	format: AuditExportFormat,
	appearance?: AuditExportAppearance
): Promise<string> {
	validateExportableAudit(exportableAudit);

	if (instrument === null) {
		throw new Error("An instrument definition is required for export.");
	}

	const fileName = buildExportFileName(exportableAudit.auditSession.audit_code, format);

	let blob: Blob;

	switch (format) {
		case "pdf":
			blob = await generatePdfBlob(exportableAudit, instrument);
			break;
		case "xlsx":
			blob = generateXlsxBlob(exportableAudit, instrument, appearance);
			break;
		case "json":
			blob = generateJsonBlob(exportableAudit, instrument, new Date().toISOString());
			break;
		case "csv":
			blob = generateCsvBlob(exportableAudit, instrument);
			break;
		default:
			throw new Error(`Unsupported export format: ${String(format)}`);
	}

	triggerBrowserDownload(blob, fileName);
	return fileName;
}
