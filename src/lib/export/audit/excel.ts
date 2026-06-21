/**
 * XLSX and CSV export for the audit pipeline.
 *
 * Provides:
 *   - `generateXlsxBlob`  - styled multi-sheet workbook
 *   - `generateCsvBlob`   - plain comma-separated response matrix
 *   - `buildCsvText`      - (exported for testing) converts rows to CSV text
 *
 * The `xlsx-js-style` import is a static top-level import (not dynamic) because
 * the `audit` export path is already inside a user-triggered async flow and the
 * library is needed synchronously inside `generateXlsxBlob`.
 */

import * as XLSX from "xlsx-js-style";

import { hexToXlsxRgb, type PvScaleKey, SCALE_ACCENT_COLORS, SCALE_SOFT_COLORS } from "@/lib/audit/scale-colors";

import { sanitizeSheetName, stringifyCell } from "./format-utils";
import {
	buildOverviewRows,
	buildSingleAuditResponseRowMetadata,
	buildSingleAuditResponseRows,
	buildSpaceAuditRows,
	COMMENT_ROW_SENTINEL,
	SCORE_ROW_KIND_COL,
	SCORE_ROW_SENTINEL,
	SECTION_NOTE_RESPONSE_SENTINEL,
	SECTION_NOTE_SENTINEL
} from "./row-builders";
import type {
	AuditExportAppearance,
	ExportableAudit,
	PlayspaceInstrument,
	SpreadsheetRow,
	StyledCell,
	WebExportPalette,
	WorkbookTable
} from "./types";
import {
	OVERVIEW_COLUMN_WIDTHS,
	resolveExportPalette,
	SINGLE_RESPONSE_COLUMN_WIDTHS,
	SINGLE_RESPONSE_HEADERS,
	SPACE_AUDIT_COLUMN_WIDTHS,
	SPACE_AUDIT_HEADERS
} from "./types";

// ── XLSX style helpers ────────────────────────────────────────────────────────

/**
 * Converts any CSS-style colour string (`"#RGB"`, `"#RRGGBB"`, `"rgba(...)"`)
 * to a 6-character uppercase hex string suitable for `xlsx-js-style` fill/font
 * colour objects.
 *
 * For `rgba` values the alpha channel is blended against a white background so
 * the hex remains fully opaque.
 */
export function toSheetHex(colorValue: string): string {
	if (colorValue.startsWith("#")) {
		let hex = colorValue.replace("#", "").toUpperCase();

		if (hex.length === 3 || hex.length === 4) {
			hex = hex
				.split("")
				.map(char => `${char}${char}`)
				.join("");
		}

		return hex.substring(0, 6);
	}

	const rgbMatch = colorValue.match(/rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*([.\d]+))?\)/i);
	if (rgbMatch) {
		const r = parseInt(rgbMatch[1] as string, 10);
		const g = parseInt(rgbMatch[2] as string, 10);
		const b = parseInt(rgbMatch[3] as string, 10);
		const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4] as string) : 1;

		const blendedR = Math.round((1 - a) * 255 + a * r);
		const blendedG = Math.round((1 - a) * 255 + a * g);
		const blendedB = Math.round((1 - a) * 255 + a * b);

		const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0").toUpperCase();

		return `${toHex(blendedR)}${toHex(blendedG)}${toHex(blendedB)}`;
	}

	return colorValue
		.replace(/[^A-Fa-f0-9]/g, "")
		.toUpperCase()
		.substring(0, 6);
}

/**
 * Estimates column widths from the actual cell content, clamped between a
 * minimum and maximum character width.
 */
export function calculateDynamicColumnWidths(rows: readonly SpreadsheetRow[]): { wch: number }[] {
	const MIN_WIDTH = 12;
	const MAX_WIDTH = 60;
	const maxWidths: number[] = [];

	for (const row of rows) {
		for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
			const cellText = String(row[colIndex] ?? "");
			const longestLine = cellText.split("\n").reduce((max, line) => Math.max(max, line.length), 0);
			const estimatedWidth = longestLine + 2;

			if (maxWidths[colIndex] === undefined || estimatedWidth > maxWidths[colIndex]!) {
				maxWidths[colIndex] = Math.min(Math.max(estimatedWidth, MIN_WIDTH), MAX_WIDTH);
			}
		}
	}

	return maxWidths.map(width => ({ wch: width }));
}

// ── Worksheet styling ─────────────────────────────────────────────────────────

/**
 * Maps Responses-sheet col indices to PV scale keys.
 * Cols 7–10 are Provision / Variety / Sociability / Challenge.
 */
const SCALE_COLUMN_MAP: Record<number, PvScaleKey> = {
	7: "provision",
	8: "variety",
	9: "sociability",
	10: "challenge"
};

const SCALE_SOFT_HEX: Record<PvScaleKey, string> = {
	provision: hexToXlsxRgb(SCALE_SOFT_COLORS.provision),
	variety: hexToXlsxRgb(SCALE_SOFT_COLORS.variety),
	sociability: hexToXlsxRgb(SCALE_SOFT_COLORS.sociability),
	challenge: hexToXlsxRgb(SCALE_SOFT_COLORS.challenge)
};

const SCALE_ACCENT_HEX: Record<PvScaleKey, string> = {
	provision: hexToXlsxRgb(SCALE_ACCENT_COLORS.provision),
	variety: hexToXlsxRgb(SCALE_ACCENT_COLORS.variety),
	sociability: hexToXlsxRgb(SCALE_ACCENT_COLORS.sociability),
	challenge: hexToXlsxRgb(SCALE_ACCENT_COLORS.challenge)
};

const QUESTION_CONTEXT_END_COLUMN_INDEX = 6;
const COMBINED_AUDIT_SOURCE_FILL = "FEF3C7";
const COMBINED_SURVEY_SOURCE_FILL = "DBEAFE";

/**
 * Applies cell styles and row heights to a worksheet in-place.
 *
 * Row classification (Responses sheet):
 * - Row 0                           → dark header (scale cols get scale fill + accent text)
 * - `row[2] === SCORE_ROW_SENTINEL` → score summary row (slate label, scale fills, neutral PV/U)
 * - `row[1] === COMMENT_ROW_SENTINEL` → per-question comment row (section-grey, italic)
 * - `row[0]` is a plain integer with empty cols 1 & 2 → section header row
 * - Everything else                 → alternating body rows (scale cols get scale fill)
 */
export function styleWorkbookSheet(sheet: XLSX.WorkSheet, table: WorkbookTable, palette: WebExportPalette): void {
	void palette;
	const ref = sheet["!ref"];
	if (typeof ref !== "string" || ref.length === 0) {
		return;
	}

	const range = XLSX.utils.decode_range(ref);

	// ── Shared fill / border constants ────────────────────────────────────────

	const headerFill = { patternType: "solid", fgColor: { rgb: "1F2937" } } as const;
	const sectionFill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } } as const;
	const altRowFill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } } as const;
	const noFill = { patternType: "none" } as const;

	// Score row fills - matches PDF AUDIT_PDF_PALETTE
	const scoreLabelFill = { patternType: "solid", fgColor: { rgb: "333F55" } } as const;
	const scorePvUFill = { patternType: "solid", fgColor: { rgb: "F1F5F9" } } as const;

	const heavyBorder = { style: "medium", color: { rgb: "94A3B8" } } as const;
	const lightBorder = { style: "thin", color: { rgb: "E2E8F0" } } as const;
	const noBorder = { style: "thin", color: { rgb: "E2E8F0" } } as const;

	const isResponsesTable = table.name === "Responses";

	// Collect merge ranges for section note rows (applied after the loop).
	const merges: XLSX.Range[] = [];

	for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
		const row = table.rows[rowIndex];
		if (row === undefined) continue;

		const isHeaderRow = rowIndex === 0;
		const isScoreRow = row[2] === SCORE_ROW_SENTINEL;
		const isCommentRow = row[1] === COMMENT_ROW_SENTINEL;
		const isSectionNoteRow = row[1] === SECTION_NOTE_SENTINEL;
		const isSectionNoteResponseRow = row[1] === SECTION_NOTE_RESPONSE_SENTINEL;
		const isSectionHeaderRow =
			!isHeaderRow && typeof row[0] === "string" && /^\d+$/.test(row[0]) && row[1] === "" && row[2] === "";
		const isEvenRow = rowIndex % 2 === 0;
		const sourceComponent = table.rowMetadata?.[rowIndex]?.sourceComponent;
		const questionSourceFill =
			sourceComponent === "audit"
				? COMBINED_AUDIT_SOURCE_FILL
				: sourceComponent === "survey"
					? COMBINED_SURVEY_SOURCE_FILL
					: null;

		// Register full-row merges for both section note banner row types.
		if (isSectionNoteRow || isSectionNoteResponseRow) {
			merges.push({ s: { r: rowIndex, c: range.s.c }, e: { r: rowIndex, c: range.e.c } });
		}

		// Score row kind: "raw" → bold total, "maximum" → normal, "percentage" → italic
		const scoreKind = isScoreRow ? (row[SCORE_ROW_KIND_COL] as string) : "";

		for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
			const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
			const cell = sheet[address] as StyledCell | undefined;
			if (cell === undefined) continue;

			const scaleKey = SCALE_COLUMN_MAP[colIndex];
			const isScaleCol = scaleKey !== undefined;
			const isPvUCol = colIndex === 11 || colIndex === 12;

			const baseStyle = {
				alignment: {
					vertical: "top" as const,
					wrapText: true,
					horizontal: (colIndex >= 7 ? "right" : "left") as "right" | "left"
				},
				font: { name: "Arial", sz: 10, color: { rgb: "334155" } },
				border: { bottom: lightBorder, right: noBorder }
			};

			if (isHeaderRow) {
				// Dark header; scale columns get their soft fill + accent text.
				if (isResponsesTable && isScaleCol) {
					cell.s = {
						...baseStyle,
						fill: { patternType: "solid", fgColor: { rgb: SCALE_SOFT_HEX[scaleKey] } },
						font: { ...baseStyle.font, bold: true, sz: 11, color: { rgb: SCALE_ACCENT_HEX[scaleKey] } },
						alignment: { ...baseStyle.alignment, horizontal: "center", vertical: "center" },
						border: { bottom: heavyBorder, right: noBorder }
					};
				} else {
					cell.s = {
						...baseStyle,
						fill: headerFill,
						font: { ...baseStyle.font, bold: true, sz: 11, color: { rgb: "FFFFFF" } },
						alignment: { ...baseStyle.alignment, horizontal: "center", vertical: "center" },
						border: { bottom: heavyBorder, right: noBorder }
					};
				}
			} else if (isSectionHeaderRow) {
				cell.s = {
					...baseStyle,
					fill: sectionFill,
					font: { ...baseStyle.font, bold: true, color: { rgb: "0F172A" } },
					border: { top: heavyBorder, bottom: heavyBorder, right: noBorder }
				};
			} else if (isCommentRow) {
				// Per-question comment - subtle section-grey, italic, full-width feel.
				cell.s = {
					...baseStyle,
					fill: sectionFill,
					font: { ...baseStyle.font, italic: true, color: { rgb: "475569" } },
					border: { bottom: lightBorder, right: noBorder }
				};
			} else if (isSectionNoteRow) {
				// Notes Prompt - bold banner, no column dividers.
				cell.s = {
					...baseStyle,
					fill: sectionFill,
					font: { ...baseStyle.font, bold: true, color: { rgb: "0F172A" } },
					alignment: { ...baseStyle.alignment, wrapText: true, horizontal: "left" },
					border: { top: lightBorder, bottom: noBorder, right: noBorder }
				};
			} else if (isSectionNoteResponseRow) {
				// Auditor Note response - normal weight, same banner background.
				cell.s = {
					...baseStyle,
					fill: sectionFill,
					font: { ...baseStyle.font, color: { rgb: "475569" } },
					alignment: { ...baseStyle.alignment, wrapText: true, horizontal: "left" },
					border: { top: noBorder, bottom: lightBorder, right: noBorder }
				};
			} else if (isScoreRow) {
				// Score summary rows: label cols (0–6) get slate fill, scale cols get
				// scale fill, PV/U cols get neutral fill.
				// Column borders are hidden by matching border color to fill color.
				const isTotal = scoreKind === "Raw Scores";
				const isPercentage = scoreKind === "Final Percentage";
				const rowBorder = (fillRgb: string) => ({
					bottom: isTotal ? heavyBorder : { style: "thin" as const, color: { rgb: fillRgb } },
					top: { style: "thin" as const, color: { rgb: fillRgb } },
					left: { style: "thin" as const, color: { rgb: fillRgb } },
					right: { style: "thin" as const, color: { rgb: fillRgb } }
				});

				if (isResponsesTable && isScaleCol) {
					const fillRgb = SCALE_SOFT_HEX[scaleKey];
					cell.s = {
						...baseStyle,
						fill: { patternType: "solid", fgColor: { rgb: fillRgb } },
						font: {
							...baseStyle.font,
							bold: isTotal,
							italic: isPercentage,
							color: { rgb: SCALE_ACCENT_HEX[scaleKey] }
						},
						alignment: { ...baseStyle.alignment, horizontal: "center" },
						border: rowBorder(fillRgb)
					};
				} else if (isResponsesTable && isPvUCol) {
					const fillRgb = "F1F5F9";
					cell.s = {
						...baseStyle,
						fill: scorePvUFill,
						font: {
							...baseStyle.font,
							bold: isTotal,
							italic: isPercentage,
							color: { rgb: "1E293B" }
						},
						alignment: { ...baseStyle.alignment, horizontal: "right" },
						border: rowBorder(fillRgb)
					};
				} else {
					const fillRgb = "333F55";
					cell.s = {
						...baseStyle,
						fill: scoreLabelFill,
						font: {
							...baseStyle.font,
							bold: isTotal,
							italic: isPercentage,
							color: { rgb: "FFFFFF" }
						},
						border: rowBorder(fillRgb)
					};
				}
			} else {
				// Normal body row - scale cols get their soft fill, PV/U cols get
				// the slate score fill (matching PDF summaryFill), everything else
				// uses the alternating row fill.
				const bodyFill = isEvenRow ? altRowFill : noFill;

				if (isResponsesTable && isScaleCol) {
					cell.s = {
						...baseStyle,
						fill: { patternType: "solid", fgColor: { rgb: SCALE_SOFT_HEX[scaleKey] } },
						font: { ...baseStyle.font, color: { rgb: SCALE_ACCENT_HEX[scaleKey] } },
						alignment: { ...baseStyle.alignment, horizontal: "center" },
						border: { bottom: lightBorder, right: noBorder }
					};
				} else if (isResponsesTable && isPvUCol) {
					cell.s = {
						...baseStyle,
						fill: scoreLabelFill,
						font: { ...baseStyle.font, bold: true, color: { rgb: "FFFFFF" } },
						alignment: { ...baseStyle.alignment, horizontal: "right" },
						border: { bottom: lightBorder, right: noBorder }
					};
				} else if (
					isResponsesTable &&
					colIndex <= QUESTION_CONTEXT_END_COLUMN_INDEX &&
					questionSourceFill !== null
				) {
					cell.s = {
						...baseStyle,
						fill: { patternType: "solid", fgColor: { rgb: questionSourceFill } },
						border: { bottom: lightBorder, right: noBorder }
					};
				} else {
					cell.s = { ...baseStyle, fill: bodyFill };
				}
			}
		}
	}

	// ── Merge ranges for banner rows ─────────────────────────────────────────

	if (merges.length > 0) {
		const existing = sheet["!merges"] ?? [];
		sheet["!merges"] = [...existing, ...merges];
	}

	// ── Row heights ───────────────────────────────────────────────────────────

	sheet["!rows"] = table.rows.map((row, rowIndex) => {
		const isHeaderRow = rowIndex === 0;
		const isScoreRow = row[2] === SCORE_ROW_SENTINEL;
		const isCommentRow = row[1] === COMMENT_ROW_SENTINEL;
		const isSectionNoteRow = row[1] === SECTION_NOTE_SENTINEL;
		const isSectionNoteResponseRow = row[1] === SECTION_NOTE_RESPONSE_SENTINEL;
		const isSectionHeaderRow =
			!isHeaderRow && typeof row[0] === "string" && /^\d+$/.test(row[0]) && row[1] === "" && row[2] === "";

		let maxLines = 1;
		for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
			const cellText = String(row[colIndex] ?? "");
			const colWidth = (sheet["!cols"]?.[colIndex] as { wch?: number } | undefined)?.wch ?? 20;
			const explicitLines = cellText.split("\n").length;
			const wrappedLines = Math.max(1, Math.ceil(cellText.length / colWidth));
			maxLines = Math.max(maxLines, explicitLines, wrappedLines);
		}

		const calculatedHeight = maxLines * 14 + 8;

		if (isHeaderRow) return { hpt: Math.max(28, calculatedHeight) };
		if (isSectionHeaderRow) return { hpt: Math.max(26, calculatedHeight) };
		if (isSectionNoteRow) return { hpt: 22 };
		if (isSectionNoteResponseRow) return { hpt: 22 };
		if (isScoreRow) return { hpt: Math.max(22, calculatedHeight) };
		if (isCommentRow) return { hpt: Math.max(20, calculatedHeight) };
		return { hpt: Math.max(20, calculatedHeight) };
	});
}

// ── CSV ───────────────────────────────────────────────────────────────────────

/**
 * Converts a matrix of rows into RFC 4180-compliant CSV text.
 * All cells are quoted; internal double-quotes are escaped by doubling.
 */
export function buildCsvText(rows: readonly SpreadsheetRow[]): string {
	return rows
		.map(row =>
			row
				.map(cell => {
					const text = stringifyCell(cell);
					return `"${text.replace(/"/g, '""')}"`;
				})
				.join(",")
		)
		.join("\n");
}

// ── Public blob generators ────────────────────────────────────────────────────

/**
 * Generates a styled XLSX workbook blob with up to three sheets:
 * - **Overview** - key/value metadata and aggregate scores
 * - **Space Audit** - the space-setup pre-audit responses (omitted when none)
 * - **Responses** - the full PVUA response matrix
 */
export function generateXlsxBlob(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument,
	appearance?: AuditExportAppearance
): Blob {
	const overviewRows = buildOverviewRows(exportableAudit, instrument);
	const spaceAuditRows = buildSpaceAuditRows(exportableAudit, instrument);
	const responseRows = buildSingleAuditResponseRows(exportableAudit, instrument);
	const responseRowMetadata = buildSingleAuditResponseRowMetadata(exportableAudit, instrument);
	const palette = resolveExportPalette(appearance);

	const tables: WorkbookTable[] = [
		{
			name: "Overview",
			title: "Audit Overview",
			rows: overviewRows,
			columnWidths: OVERVIEW_COLUMN_WIDTHS
		},
		...(spaceAuditRows.length > 0
			? [
					{
						name: "Space Audit",
						title: "Space Audit Setup",
						rows: [[...SPACE_AUDIT_HEADERS], ...spaceAuditRows],
						columnWidths: SPACE_AUDIT_COLUMN_WIDTHS
					} satisfies WorkbookTable
				]
			: []),
		{
			name: "Responses",
			title: "PVUA Response Matrix",
			rows: [[...SINGLE_RESPONSE_HEADERS], ...responseRows],
			columnWidths: SINGLE_RESPONSE_COLUMN_WIDTHS,
			rowMetadata: [null, ...responseRowMetadata]
		}
	];

	const workbook = XLSX.utils.book_new();

	for (const table of tables) {
		const sheet = XLSX.utils.aoa_to_sheet(table.rows.map(row => [...row]));
		sheet["!cols"] = table.columnWidths
			? table.columnWidths.map(width => ({ wch: width }))
			: calculateDynamicColumnWidths(table.rows);

		styleWorkbookSheet(sheet, table, palette);
		XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(table.name));
	}

	const xlsxOutput = XLSX.write(workbook, {
		type: "array",
		bookType: "xlsx",
		cellStyles: true
	}) as ArrayBuffer;

	return new Blob([xlsxOutput], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	});
}

/**
 * Generates a CSV blob of the response matrix, preceded by a titled "Space Audit
 * Setup" block (with its own header) when space-setup questions exist.
 */
export function generateCsvBlob(exportableAudit: ExportableAudit, instrument: PlayspaceInstrument): Blob {
	const responseRows = buildSingleAuditResponseRows(exportableAudit, instrument);
	const spaceAuditRows = buildSpaceAuditRows(exportableAudit, instrument);

	const spaceAuditBlock: SpreadsheetRow[] =
		spaceAuditRows.length > 0 ? [["Space Audit Setup"], [...SPACE_AUDIT_HEADERS], ...spaceAuditRows, []] : [];

	const allRows: SpreadsheetRow[] = [...spaceAuditBlock, [...SINGLE_RESPONSE_HEADERS], ...responseRows];
	const csvContent = buildCsvText(allRows);
	return new Blob([csvContent], { type: "text/csv;charset=utf-8" });
}
