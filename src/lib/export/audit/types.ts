/**
 * Shared types, constants, and palette helpers for the audit export pipeline.
 *
 * All other modules in this directory import from here - nothing here imports
 * from any sibling module, keeping the dependency graph acyclic.
 */

import { SCALE_ACCENT_COLORS, SCALE_SOFT_COLORS } from "@/lib/audit/scale-colors";
import { DESIGN_SYSTEM, type DesignSystemThemeMode, type DesignSystemContrastMode } from "@/lib/design-system";
import type * as XLSX from "xlsx-js-style";

// ── Re-exported domain types ─────────────────────────────────────────────────

export type {
	AuditScoreTotals,
	AuditSession,
	AuditStatus,
	ExecutionMode,
	InstrumentQuestion,
	PlayspaceInstrument,
	QuestionResponsePayload,
	QuestionScale,
	ScaleOption
} from "@/types/audit";

// ── Public API types ─────────────────────────────────────────────────────────

/** The set of file formats a single audit can be exported as. */
export type AuditExportFormat = "pdf" | "csv" | "xlsx" | "json";

/** Structured-data formats the audit generators can produce. */
export type AuditExportDataFormat = "xlsx" | "json";

/** Geographic context attached to an audit export. */
export interface AuditExportContext {
	readonly projectName: string;
	readonly city: string | null;
	readonly province: string | null;
	readonly country: string | null;
}

/** Anonymised auditor identity fields included in an export. */
export interface ExportAuditorProfile {
	readonly auditorCode: string;
	readonly ageRange: string | null;
	readonly gender: string | null;
	readonly country: string | null;
	readonly role: string | null;
}

/** Everything needed to generate any export format for a single audit. */
export interface ExportableAudit {
	readonly auditSession: import("@/types/audit").AuditSession;
	readonly context: AuditExportContext | null;
	readonly auditorProfile: ExportAuditorProfile | null;
}

/** Optional visual appearance overrides applied to XLSX output. */
export interface AuditExportAppearance {
	readonly theme?: DesignSystemThemeMode;
	readonly contrast?: DesignSystemContrastMode;
}

// ── Internal spreadsheet types ───────────────────────────────────────────────

/** A single cell value in a spreadsheet row. */
export type SpreadsheetCell = string | number;

/** An immutable ordered list of cells forming one spreadsheet row. */
export type SpreadsheetRow = readonly SpreadsheetCell[];

/** A named, titled collection of rows destined for one XLSX worksheet. */
export interface WorkbookTable {
	readonly name: string;
	readonly title: string;
	readonly rows: readonly SpreadsheetRow[];
	readonly columnWidths?: readonly number[];
	readonly rowMetadata?: readonly (WorkbookRowMetadata | null)[];
}

/** Optional per-row styling metadata consumed by XLSX renderers. */
export interface WorkbookRowMetadata {
	readonly sourceComponent?: "audit" | "survey";
}

/** Partial score contributed by a multiplier (variety / challenge) scale. */
export interface MultiplierScaleScore {
	readonly columnTotal: number;
	readonly boostValue: number;
}

// ── Palette types ─────────────────────────────────────────────────────────────

export type WebExportPalette = (typeof DESIGN_SYSTEM.palettes)[DesignSystemThemeMode][DesignSystemContrastMode];

/** XLSX worksheet cell object extended with the style field used by xlsx-js-style. */
export type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };

// ── Palette helpers ───────────────────────────────────────────────────────────

/** Resolves the correct colour palette for the requested appearance, falling back to defaults. */
export function resolveExportPalette(appearance?: AuditExportAppearance): WebExportPalette {
	const theme = appearance?.theme ?? DESIGN_SYSTEM.defaultTheme;
	const contrast = appearance?.contrast ?? DESIGN_SYSTEM.defaultContrast;
	return DESIGN_SYSTEM.palettes[theme][contrast];
}

export type { PvScaleKey } from "@/lib/audit/scale-colors";
export { SCALE_ACCENT_COLORS, SCALE_SOFT_COLORS } from "@/lib/audit/scale-colors";

/**
 * Returns the soft (background) colour for each PV scale column.
 * Used to colour-code Provision / Variety / Sociability / Challenge columns
 * in the XLSX Responses sheet.
 *
 * The `palette` parameter is retained for API compatibility; the colours are
 * now fixed to the canonical scale tokens rather than derived from the palette.
 */
export function getWebScaleSoftColor(
	scaleKey: "provision" | "variety" | "sociability" | "challenge",
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_palette: WebExportPalette
): string {
	return SCALE_SOFT_COLORS[scaleKey];
}

/**
 * Returns the accent (border) colour for each PV scale column.
 *
 * The `palette` parameter is retained for API compatibility; the colours are
 * now fixed to the canonical scale tokens rather than derived from the palette.
 */
export function getWebScaleAccentColor(
	scaleKey: "provision" | "variety" | "sociability" | "challenge",
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_palette: WebExportPalette
): string {
	return SCALE_ACCENT_COLORS[scaleKey];
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Column headers for the PVUA response matrix (CSV, XLSX Responses sheet, PDF). */
export const SINGLE_RESPONSE_HEADERS = [
	"ID_Number",
	"Survey or Audit",
	"Construct",
	"Domain",
	"Domain Description",
	"Instructions",
	"Items",
	"Provision",
	"Variety",
	"Sociability",
	"Challenge Opportunities",
	"Play Value (PV) Construct Score",
	"Usability (U) Construct Score"
] as const;

/** XLSX column characters that are illegal in sheet names. */
export const INVALID_SHEET_NAME_CHARACTERS = [":", "\\", "/", "?", "*", "[", "]"] as const;

/** Fixed column widths (characters) for the Overview worksheet. */
export const OVERVIEW_COLUMN_WIDTHS = [28, 56] as const;

/** Fixed column widths (characters) for the Responses worksheet. */
export const SINGLE_RESPONSE_COLUMN_WIDTHS = [12, 16, 16, 28, 64, 40, 72, 22, 22, 22, 26, 22, 22] as const;

/** jsPDF autoTable header fill colour (blue). */
export const PDF_HEADER_RGB: [number, number, number] = [37, 99, 235];

/** jsPDF autoTable header text colour (white). */
export const PDF_HEADER_TEXT_RGB: [number, number, number] = [255, 255, 255];

/** jsPDF autoTable alternating row fill colour (light grey). */
export const PDF_ALT_ROW_RGB: [number, number, number] = [248, 250, 252];
