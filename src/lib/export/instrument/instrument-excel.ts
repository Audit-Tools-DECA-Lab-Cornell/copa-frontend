/**
 * Styled Excel (XLSX) and plain CSV export for the Playspace instrument.
 *
 * XLSX uses `xlsx-js-style` so workbook styles are preserved.
 * CSV intentionally stays plain and uses the older fully-flat matrix.
 */

import type { FlatRow } from "./instrument-shared";
import { downloadBlob, MOBILE_EXPORT_PALETTE } from "./instrument-shared";

// ─── CSV column metadata ──────────────────────────────────────────────────────

/**
 * Header row for CSV exports.
 *
 * CSV stays intentionally flat so section metadata remains machine-readable
 * as ordinary columns.
 */
const EXPORT_HEADERS = [
	"Question Key",
	"Section #",
	"Section Title",
	"Section Description",
	"Section Instruction",
	"Notes Prompt",
	"Prompt",
	"Options",
	"Type",
	"Mode",
	"Constructs",
	"Req.",
	"Scales",
	"Display Condition"
] as const;

// ─── XLSX column metadata ─────────────────────────────────────────────────────

/**
 * Styled XLSX headers.
 *
 * This intentionally matches the instrument PDF table. Section title,
 * description, instruction, and notes prompt are rendered as full-width
 * banner rows instead of separate data columns.
 */
const XLSX_EXPORT_HEADERS = [
	"Question Key",
	"Section #",
	"Prompt",
	"Options",
	"Type",
	"Mode",
	"Constructs",
	"Req.",
	"Scales",
	"Display Condition"
] as const;

const XLSX_COLUMN_WIDTHS: readonly { wch: number }[] = [
	{ wch: 18 }, // Question Key
	{ wch: 14 }, // Section #
	{ wch: 86 }, // Prompt
	{ wch: 42 }, // Options
	{ wch: 12 }, // Type
	{ wch: 14 }, // Mode
	{ wch: 24 }, // Constructs
	{ wch: 8 }, // Req.
	{ wch: 26 }, // Scales
	{ wch: 38 } // Display Condition
];

const XLSX_COL_COUNT = XLSX_EXPORT_HEADERS.length;

// ─── Local XLSX style types ───────────────────────────────────────────────────

type XlsxModule = typeof import("xlsx-js-style");
type XlsxWorksheet = import("xlsx-js-style").WorkSheet;
type XlsxRange = import("xlsx-js-style").Range;

type StyledCell = {
	t?: string;
	v?: string | number | boolean;
	s?: Record<string, unknown>;
};

type InstrumentWorkbookRowKind =
	"header" | "section_title" | "section_description" | "section_instruction" | "section_notes_prompt" | "question";

type InstrumentWorkbookRow = {
	readonly kind: InstrumentWorkbookRowKind;
	readonly cells: readonly string[];
	readonly questionRowIndex?: number;
};

// ─── Palette helpers ──────────────────────────────────────────────────────────

function rgbToSheetHex(rgb: readonly [number, number, number]): string {
	return rgb.map(value => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0").toUpperCase()).join("");
}

const SHEET_PALETTE = {
	headerFill: rgbToSheetHex(MOBILE_EXPORT_PALETTE.headerFill),
	headerText: rgbToSheetHex(MOBILE_EXPORT_PALETTE.headerText),

	sectionFill: rgbToSheetHex(MOBILE_EXPORT_PALETTE.sectionFill),
	sectionTitleText: rgbToSheetHex(MOBILE_EXPORT_PALETTE.sectionTitleColor),
	sectionText: rgbToSheetHex(MOBILE_EXPORT_PALETTE.sectionText),
	sectionInstructionText: rgbToSheetHex(MOBILE_EXPORT_PALETTE.sectionInstrColor),
	sectionNotesText: rgbToSheetHex(MOBILE_EXPORT_PALETTE.sectionNotesColor),

	rowEven: rgbToSheetHex(MOBILE_EXPORT_PALETTE.rowEven),
	rowOdd: rgbToSheetHex(MOBILE_EXPORT_PALETTE.rowOdd),

	bodyText: rgbToSheetHex(MOBILE_EXPORT_PALETTE.bodyText),
	mutedText: rgbToSheetHex(MOBILE_EXPORT_PALETTE.mutedText),
	requiredYes: rgbToSheetHex(MOBILE_EXPORT_PALETTE.requiredYes),
	requiredNo: rgbToSheetHex(MOBILE_EXPORT_PALETTE.requiredNo),
	conditionActive: rgbToSheetHex(MOBILE_EXPORT_PALETTE.conditionActive),
	conditionEmpty: rgbToSheetHex(MOBILE_EXPORT_PALETTE.conditionEmpty),

	border: rgbToSheetHex(MOBILE_EXPORT_PALETTE.border),
	borderStrong: rgbToSheetHex(MOBILE_EXPORT_PALETTE.borderStrong)
} as const;

const THIN_BORDER = {
	style: "thin",
	color: { rgb: SHEET_PALETTE.border }
} as const;

const STRONG_BORDER = {
	style: "medium",
	color: { rgb: SHEET_PALETTE.borderStrong }
} as const;

// ─── CSV helpers ──────────────────────────────────────────────────────────────

/**
 * Converts flat rows into a header + data matrix suitable for CSV conversion.
 *
 * Section-header rows populate the section columns and leave question columns
 * blank; question rows do the reverse.
 */
export function toFlatExportRows(flatRows: FlatRow[]): { headers: readonly string[]; data: string[][] } {
	const data = flatRows.map((row): string[] => {
		if (row.rowType === "section_header") {
			return [
				"",
				row.sectionNumber,
				row.sectionTitle,
				row.sectionDescription,
				row.sectionInstruction,
				row.sectionNotesPrompt,
				"",
				"",
				"",
				"",
				"",
				"",
				"",
				""
			];
		}

		return [
			row.questionKey,
			row.sectionNumber,
			"",
			"",
			"",
			"",
			row.questionPrompt,
			row.questionOptions,
			row.questionType,
			row.questionMode,
			row.questionConstructs,
			row.questionRequired,
			row.questionScales,
			row.questionDisplayCondition
		];
	});

	return { headers: EXPORT_HEADERS, data };
}

// ─── XLSX row building ────────────────────────────────────────────────────────

function emptyXlsxCells(): string[] {
	return Array.from({ length: XLSX_COL_COUNT }, () => "");
}

function makeBannerRow(
	kind: Exclude<InstrumentWorkbookRowKind, "header" | "question">,
	text: string
): InstrumentWorkbookRow | null {
	const trimmed = text.trim();
	if (trimmed.length === 0) return null;

	const cells = emptyXlsxCells();
	cells[0] = trimmed;

	return { kind, cells };
}

function toInstrumentWorkbookRows(flatRows: FlatRow[]): InstrumentWorkbookRow[] {
	const rows: InstrumentWorkbookRow[] = [
		{
			kind: "header",
			cells: Array.from(XLSX_EXPORT_HEADERS)
		}
	];

	let questionRowIndex = 0;

	for (const row of flatRows) {
		if (row.rowType === "section_header") {
			const title = row.sectionNumber ? `${row.sectionNumber}  ·  ${row.sectionTitle}` : row.sectionTitle;

			const bannerRows = [
				makeBannerRow("section_title", title),
				makeBannerRow("section_description", row.sectionDescription),
				makeBannerRow("section_instruction", row.sectionInstruction),
				makeBannerRow("section_notes_prompt", row.sectionNotesPrompt)
			];

			for (const bannerRow of bannerRows) {
				if (bannerRow !== null) rows.push(bannerRow);
			}

			continue;
		}

		rows.push({
			kind: "question",
			questionRowIndex,
			cells: [
				row.questionKey,
				row.sectionNumber,
				row.questionPrompt,
				row.questionOptions,
				row.questionType,
				row.questionMode,
				row.questionConstructs,
				row.questionRequired,
				row.questionScales,
				row.questionDisplayCondition
			]
		});

		questionRowIndex += 1;
	}

	return rows;
}

// ─── XLSX styling helpers ─────────────────────────────────────────────────────

function resolveXlsxModule(module: XlsxModule): XlsxModule {
	if ("utils" in module) return module;

	return (module as unknown as { default: XlsxModule }).default;
}

function ensureCell(XLSX: XlsxModule, sheet: XlsxWorksheet, rowIndex: number, colIndex: number): StyledCell {
	const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
	const existingCell = sheet[address] as StyledCell | undefined;

	if (existingCell !== undefined) {
		return existingCell;
	}

	const cell: StyledCell = { t: "s", v: "" };
	sheet[address] = cell;
	return cell;
}

function estimateWrappedLines(text: string, width: number): number {
	if (text.trim().length === 0) return 1;

	return text.split(/\r?\n/).reduce((lineCount, line) => {
		const safeWidth = Math.max(8, width);
		return lineCount + Math.max(1, Math.ceil(line.length / safeWidth));
	}, 0);
}

function calculateRowHeight(row: InstrumentWorkbookRow): { hpt: number } {
	if (row.kind === "header") {
		return { hpt: 30 };
	}

	const totalMergedWidth = XLSX_COLUMN_WIDTHS.reduce((sum, col) => sum + col.wch, 0);

	if (row.kind !== "question") {
		const lines = estimateWrappedLines(row.cells[0] ?? "", totalMergedWidth);
		const calculatedHeight = lines * 15 + 10;

		if (row.kind === "section_title") {
			return { hpt: Math.max(30, calculatedHeight) };
		}

		return { hpt: Math.max(24, calculatedHeight) };
	}

	let maxLines = 1;

	for (let colIndex = 0; colIndex < row.cells.length; colIndex += 1) {
		const width = XLSX_COLUMN_WIDTHS[colIndex]?.wch ?? 20;
		const cellText = row.cells[colIndex] ?? "";
		maxLines = Math.max(maxLines, estimateWrappedLines(cellText, width));
	}

	return { hpt: Math.min(180, Math.max(24, maxLines * 15 + 8)) };
}

function styleInstrumentWorksheet(
	XLSX: XlsxModule,
	sheet: XlsxWorksheet,
	rows: readonly InstrumentWorkbookRow[]
): void {
	const ref = sheet["!ref"];
	if (typeof ref !== "string" || ref.length === 0) return;

	const range = XLSX.utils.decode_range(ref);

	const bannerMerges: XlsxRange[] = [];

	for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
		const row = rows[rowIndex];
		if (row === undefined) continue;

		const isBannerRow = row.kind !== "header" && row.kind !== "question";

		if (isBannerRow) {
			bannerMerges.push({
				s: { r: rowIndex, c: 0 },
				e: { r: rowIndex, c: XLSX_COL_COUNT - 1 }
			});
		}

		for (let colIndex = 0; colIndex < XLSX_COL_COUNT; colIndex += 1) {
			const cell = ensureCell(XLSX, sheet, rowIndex, colIndex);

			const baseStyle = {
				alignment: {
					vertical: "top",
					horizontal: "left",
					wrapText: true
				},
				font: {
					name: "Arial",
					sz: 10,
					color: { rgb: SHEET_PALETTE.bodyText }
				},
				border: {
					bottom: THIN_BORDER,
					right: THIN_BORDER
				}
			};

			if (row.kind === "header") {
				cell.s = {
					...baseStyle,
					fill: {
						patternType: "solid",
						fgColor: { rgb: SHEET_PALETTE.headerFill }
					},
					font: {
						...baseStyle.font,
						bold: true,
						sz: 11,
						color: { rgb: SHEET_PALETTE.headerText }
					},
					alignment: {
						...baseStyle.alignment,
						horizontal: "center",
						vertical: "center"
					},
					border: {
						bottom: STRONG_BORDER,
						right: THIN_BORDER
					}
				};
				continue;
			}

			if (row.kind === "section_title") {
				cell.s = {
					...baseStyle,
					fill: {
						patternType: "solid",
						fgColor: { rgb: SHEET_PALETTE.sectionFill }
					},
					font: {
						...baseStyle.font,
						bold: true,
						sz: 11,
						color: { rgb: SHEET_PALETTE.sectionTitleText }
					},
					border: {
						top: STRONG_BORDER,
						bottom: THIN_BORDER,
						right: THIN_BORDER
					}
				};
				continue;
			}

			if (row.kind === "section_description") {
				cell.s = {
					...baseStyle,
					fill: {
						patternType: "solid",
						fgColor: { rgb: SHEET_PALETTE.sectionFill }
					},
					font: {
						...baseStyle.font,
						color: { rgb: SHEET_PALETTE.sectionText }
					},
					border: {
						bottom: THIN_BORDER,
						right: THIN_BORDER
					}
				};
				continue;
			}

			if (row.kind === "section_instruction") {
				cell.s = {
					...baseStyle,
					fill: {
						patternType: "solid",
						fgColor: { rgb: SHEET_PALETTE.sectionFill }
					},
					font: {
						...baseStyle.font,
						bold: true,
						italic: true,
						color: { rgb: SHEET_PALETTE.sectionInstructionText }
					},
					border: {
						bottom: THIN_BORDER,
						right: THIN_BORDER
					}
				};
				continue;
			}

			if (row.kind === "section_notes_prompt") {
				cell.s = {
					...baseStyle,
					fill: {
						patternType: "solid",
						fgColor: { rgb: SHEET_PALETTE.sectionFill }
					},
					font: {
						...baseStyle.font,
						italic: true,
						color: { rgb: SHEET_PALETTE.sectionNotesText }
					},
					border: {
						bottom: STRONG_BORDER,
						right: THIN_BORDER
					}
				};
				continue;
			}

			const questionRowIndex = row.questionRowIndex ?? 0;
			const fillRgb = questionRowIndex % 2 === 0 ? SHEET_PALETTE.rowEven : SHEET_PALETTE.rowOdd;

			const isQuestionKeyCol = colIndex === 0;
			const isMutedMetadataCol =
				colIndex === 1 ||
				colIndex === 3 ||
				colIndex === 4 ||
				colIndex === 5 ||
				colIndex === 6 ||
				colIndex === 8;
			const isRequiredCol = colIndex === 7;
			const isDisplayConditionCol = colIndex === 9;

			let fontColor = SHEET_PALETTE.bodyText;
			let bold = isQuestionKeyCol;

			if (isMutedMetadataCol) {
				fontColor = SHEET_PALETTE.mutedText;
			}

			if (isRequiredCol) {
				bold = true;
				fontColor =
					(row.cells[colIndex] ?? "").toLowerCase() === "yes"
						? SHEET_PALETTE.requiredYes
						: SHEET_PALETTE.requiredNo;
			}

			if (isDisplayConditionCol) {
				fontColor =
					(row.cells[colIndex] ?? "").trim().length > 0
						? SHEET_PALETTE.conditionActive
						: SHEET_PALETTE.conditionEmpty;
			}

			cell.s = {
				...baseStyle,
				fill: {
					patternType: "solid",
					fgColor: { rgb: fillRgb }
				},
				font: {
					...baseStyle.font,
					bold,
					color: { rgb: fontColor }
				}
			};
		}
	}

	sheet["!cols"] = Array.from(XLSX_COLUMN_WIDTHS);
	sheet["!rows"] = rows.map(calculateRowHeight);

	if (bannerMerges.length > 0) {
		sheet["!merges"] = [...(sheet["!merges"] ?? []), ...bannerMerges];
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a styled XLSX blob from the instrument flat rows.
 *
 * Uses the same visual language as the instrument PDF and audit XLSX:
 * dark header row, full-width section banners, alternating question rows,
 * wrapped text, stronger section separators, and muted metadata columns.
 */
export async function generateXlsxBlob(flatRows: FlatRow[]): Promise<Blob> {
	const xlsxModule = await import("xlsx-js-style");
	const XLSX = resolveXlsxModule(xlsxModule);

	const workbookRows = toInstrumentWorkbookRows(flatRows);
	const worksheetRows = workbookRows.map(row => Array.from(row.cells));

	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.aoa_to_sheet(worksheetRows);

	ws["!cols"] = Array.from(XLSX_COLUMN_WIDTHS);

	styleInstrumentWorksheet(XLSX, ws, workbookRows);

	XLSX.utils.book_append_sheet(wb, ws, "Instrument");

	const buffer = XLSX.write(wb, {
		bookType: "xlsx",
		type: "array",
		cellStyles: true
	}) as ArrayBuffer;

	return new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	});
}

/**
 * Triggers a browser download of the instrument as a styled XLSX file.
 */
export async function downloadInstrumentXlsx(flatRows: FlatRow[], fileName: string): Promise<void> {
	const blob = await generateXlsxBlob(flatRows);
	downloadBlob(blob, `${fileName}.xlsx`);
}

/**
 * Triggers a browser download of the instrument as a CSV file.
 *
 * CSV remains plain and fully-flat for portability.
 */
export async function downloadInstrumentCsv(flatRows: FlatRow[], fileName: string): Promise<void> {
	const XLSX = await import("xlsx");
	const { headers, data } = toFlatExportRows(flatRows);
	const ws = XLSX.utils.aoa_to_sheet([Array.from(headers), ...data]);
	const csv = XLSX.utils.sheet_to_csv(ws);
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	downloadBlob(blob, `${fileName}.csv`);
}
