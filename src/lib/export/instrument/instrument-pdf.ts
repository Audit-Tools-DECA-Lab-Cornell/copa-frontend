/**
 * PDF export for the Playspace instrument.
 *
 * Uses jsPDF + jspdf-autotable (loaded dynamically to keep the initial bundle
 * small). Rich-text rendering (bold inline segments) is achieved by suppressing
 * AutoTable's default text draw and re-drawing character runs in didDrawCell -
 * the only approach that keeps row heights and line positions aligned with what
 * AutoTable has already laid out.
 */

import type { Cell, CellHookData } from "jspdf-autotable";

import type { PromptSegment } from "@/lib/audit/prompt-segments";

import { type FlatRow, PALETTE, segmentsToPlainText } from "./instrument-shared";

// ─── Internal types ───────────────────────────────────────────────────────────

type AutotableFontStyle = "normal" | "bold" | "italic" | "bolditalic";

/** Carries rendering metadata for a cell that contains bold inline segments. */
type PdfRichCell = {
	readonly segments: readonly PromptSegment[];
	/** Base font style applied to the whole cell; bold flag per segment layers on top. */
	readonly baseFontStyle: AutotableFontStyle;
	readonly textColor: readonly [number, number, number];
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** jsPDF uses millimetres; 1 pt = 25.4/72 mm. */
const JSPDF_MM_PER_PT = 25.4 / 72;

/** Column header labels - order must match the column-width and body-cell order. */
const QUESTION_HEADERS = [
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
];

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Merge a per-cell base font style with a per-character bold flag.
 * Italic base styles remain italic; bold base styles remain bold.
 */
function mergedFontStyle(base: AutotableFontStyle, segmentBold: boolean): AutotableFontStyle {
	if (base === "italic") return segmentBold ? "bolditalic" : "italic";
	if (base === "bolditalic") return segmentBold ? "bolditalic" : "italic";
	return segmentBold ? "bold" : "normal";
}

/**
 * Sets the PDF fill colour from an AutoTable `fillColor` style value.
 * Guards against non-array values that autotable can produce for "false" fills.
 */
function setPdfFillFromAutotable(pdf: CellHookData["doc"], fillColor: Cell["styles"]["fillColor"]): void {
	if (Array.isArray(fillColor) && fillColor.length >= 3) {
		pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
	}
}

/**
 * Re-draws a table cell with inline bold runs, using line positions that
 * AutoTable already computed.
 *
 * ### Why this approach
 * 1. Let AutoTable wrap text normally (no `didParseCell` intervention).
 * 2. In `willDrawCell`, capture `cell.text` (the wrapped lines) then clear it so
 *    AutoTable skips its default text draw.
 * 3. In `didDrawCell`, call this function to paint each character run with the
 *    correct font weight, using `cell.getTextPos()` for vertical alignment.
 *
 * This guarantees that row heights, line counts, and vertical positions exactly
 * match what AutoTable allocated - no character-per-line or misalignment bugs.
 */
function drawRichCellFromAutotableLines(
	pdf: CellHookData["doc"],
	cell: Cell,
	spec: PdfRichCell,
	savedLines: string[]
): void {
	if (savedLines.length === 0) return;

	const { segments, baseFontStyle, textColor } = spec;
	const fontName = cell.styles.font ?? "helvetica";
	const fontSize = cell.styles.fontSize ?? 7;
	const padL = cell.padding("left");
	const padT = cell.padding("top");
	const padR = cell.padding("right");
	const padB = cell.padding("bottom");

	setPdfFillFromAutotable(pdf, cell.styles.fillColor);
	pdf.rect(cell.x + padL, cell.y + padT, cell.width - padL - padR, cell.height - padT - padB, "F");

	pdf.setFontSize(fontSize);
	pdf.setTextColor(textColor[0], textColor[1], textColor[2]);

	const lineHeight = fontSize * pdf.getLineHeightFactor() * JSPDF_MM_PER_PT;
	const lineCount = savedLines.length;

	// Reproduce AutoTable's autoTableText vertical centering logic:
	// getTextPos() returns the raw valign anchor. For 'middle' that's the
	// cell's vertical center. We then shift up by half the text block height
	// (same as autoTableText does internally) so the block is truly centered.
	cell.text = savedLines;
	const pos = cell.getTextPos();
	cell.text = [];

	const valign = cell.styles.valign ?? "middle";

	let startY: number;
	if (valign === "top") {
		// pos.y is already top-padding baseline - just offset by one lineHeight
		// to match jsPDF baseline drawing (text baseline sits one line below y)
		startY = pos.y + lineHeight * (2 - pdf.getLineHeightFactor());
	} else if (valign === "bottom") {
		// pos.y is bottom anchor; move up the full block
		startY = pos.y - (lineCount - 1) * lineHeight;
	} else {
		// middle: pos.y is the vertical center of the cell (not the text block)
		// Shift up by half the total block height to top-align the block, then
		// add one lineHeight for baseline offset
		startY = pos.y - ((lineCount - 1) / 2) * lineHeight;
	}

	const boldFlags: boolean[] = [];
	for (const seg of segments) {
		for (let i = 0; i < seg.text.length; i++) {
			boldFlags.push(seg.bold);
		}
	}

	const rawJoined = segments.map(s => s.text).join("");
	const plainFull = segmentsToPlainText(segments);
	const leadingSpaces = rawJoined.length - rawJoined.trimStart().length;
	const trimmedBoldFlags = boldFlags.slice(leadingSpaces, leadingSpaces + plainFull.length);

	let charCursor = 0;

	for (let lineIdx = 0; lineIdx < savedLines.length; lineIdx++) {
		const line = savedLines[lineIdx] ?? "";
		const lineY = startY + lineIdx * lineHeight;
		let lineX = pos.x;

		if (line.length > 0) {
			const runs: { text: string; bold: boolean }[] = [];
			let runBold = trimmedBoldFlags[charCursor] ?? false;
			let runText = "";

			for (let ci = 0; ci < line.length; ci++) {
				const bold = trimmedBoldFlags[charCursor + ci] ?? false;
				if (bold !== runBold) {
					if (runText) runs.push({ text: runText, bold: runBold });
					runText = line[ci] ?? "";
					runBold = bold;
				} else {
					runText += line[ci] ?? "";
				}
			}
			if (runText) runs.push({ text: runText, bold: runBold });

			charCursor += line.length;

			for (const run of runs) {
				pdf.setFont(fontName, mergedFontStyle(baseFontStyle, run.bold));
				pdf.text(run.text, lineX, lineY);
				lineX += pdf.getTextWidth(run.text);
			}
		}

		if (charCursor < plainFull.length && plainFull[charCursor] === " ") {
			charCursor++;
		}
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a PDF from the provided flat rows and triggers a browser download.
 *
 * jsPDF and jspdf-autotable are imported dynamically so they are never included
 * in the initial page bundle.
 */
export async function downloadInstrumentPdf(
	flatRows: FlatRow[],
	fileName: string,
	version: string,
	lang: string
): Promise<void> {
	const jsPDFModule = await import("jspdf");
	const jsPDF = jsPDFModule.default;
	const autoTableModule = await import("jspdf-autotable");
	const autoTable = autoTableModule.default;

	const doc = new jsPDF({ orientation: "landscape" });

	const pdfMargin = { top: 20, left: 6, right: 6 };
	const pageWidth = doc.internal.pageSize.getWidth();
	const usableTableWidth = pageWidth - pdfMargin.left - pdfMargin.right;

	const columnWidths = {
		0: usableTableWidth * 0.075,
		1: usableTableWidth * 0.07,
		2: usableTableWidth * 0.285,
		3: usableTableWidth * 0.145,
		4: usableTableWidth * 0.055,
		5: usableTableWidth * 0.05,
		6: usableTableWidth * 0.085,
		7: usableTableWidth * 0.045,
		8: usableTableWidth * 0.085,
		9: usableTableWidth * 0.105
	};

	doc.setFontSize(13);
	doc.setTextColor(31, 41, 55);
	doc.text(`Instrument v${version} (${lang.toUpperCase()})`, pdfMargin.left, 14);

	const body: object[][] = [];
	let questionRowIndex = 0;

	/**
	 * Maps "rowIndex-colIndex" → PdfRichCell.
	 * Only populated for cells that actually contain bold segments; plain cells
	 * fall through to AutoTable's default rendering.
	 */
	const pdfRichCells = new Map<string, PdfRichCell>();

	/** Stores AutoTable's pre-cleared wrapped lines captured in willDrawCell. */
	const savedCellLines = new Map<string, string[]>();

	function cellKey(rowIdx: number, colIdx: number): string {
		return `${rowIdx}-${colIdx}`;
	}

	/**
	 * Registers a rich cell spec only when the segments actually contain bold
	 * text; plain cells render correctly without custom drawing.
	 */
	function registerRichCell(rowIdx: number, colIdx: number, spec: PdfRichCell): void {
		if (!spec.segments.some(s => s.bold)) return;
		pdfRichCells.set(cellKey(rowIdx, colIdx), spec);
	}

	let pdfBodyRowIndex = 0;

	for (const row of flatRows) {
		if (row.rowType === "section_header") {
			/**
			 * Push a full-width banner row with the given text and style.
			 * Section headers are represented as one or more consecutive banner rows.
			 */
			const pushBannerRow = (
				content: string,
				fontStyle: AutotableFontStyle,
				textColor: [number, number, number],
				fontSize: number,
				topPad = 4,
				bottomPad = 4
			): void => {
				body.push([
					{
						content,
						colSpan: QUESTION_HEADERS.length,
						styles: {
							fillColor: PALETTE.sectionFill,
							textColor,
							fontStyle,
							fontSize,
							cellPadding: { top: topPad, bottom: bottomPad, left: 8, right: 8 }
						}
					}
				]);
			};

			pushBannerRow(
				row.sectionNumber ? `${row.sectionNumber}  ·  ${row.sectionTitle}` : row.sectionTitle,
				"bold",
				PALETTE.sectionTitleColor,
				9,
				5,
				2
			);
			pdfBodyRowIndex += 1;

			if (row.sectionDescription) {
				pushBannerRow(row.sectionDescription, "normal", PALETTE.sectionText, 7.5, 1, 2);
				registerRichCell(pdfBodyRowIndex, 0, {
					segments: row.sectionDescriptionSegments,
					baseFontStyle: "normal",
					textColor: PALETTE.sectionText
				});
				pdfBodyRowIndex += 1;
			}

			if (row.sectionInstruction) {
				pushBannerRow(row.sectionInstruction, "bolditalic", PALETTE.sectionInstrColor, 7.5, 1, 2);
				registerRichCell(pdfBodyRowIndex, 0, {
					segments: [{ text: "Instruction: ", bold: false, type: "text" }, ...row.sectionInstructionSegments],
					baseFontStyle: "bolditalic",
					textColor: PALETTE.sectionInstrColor
				});
				pdfBodyRowIndex += 1;
			}

			if (row.sectionNotesPrompt) {
				pushBannerRow(row.sectionNotesPrompt, "italic", PALETTE.sectionNotesColor, 7.5, 1, 5);
				registerRichCell(pdfBodyRowIndex, 0, {
					segments: [
						{ text: "Notes Prompt: ", bold: false, type: "text" },
						...row.sectionNotesPromptSegments
					],
					baseFontStyle: "italic",
					textColor: PALETTE.sectionNotesColor
				});
				pdfBodyRowIndex += 1;
			}
		} else {
			const isEven = questionRowIndex % 2 === 0;
			const rowFill = isEven ? PALETTE.rowEven : PALETTE.rowOdd;

			body.push([
				{
					content: row.questionKey,
					styles: { fillColor: rowFill, textColor: PALETTE.bodyText, fontStyle: "bold", fontSize: 7.5 }
				},
				{
					content: row.sectionNumber,
					styles: { fillColor: rowFill, textColor: PALETTE.mutedText, fontSize: 7 }
				},
				{
					content: row.questionPrompt,
					styles: { fillColor: rowFill, textColor: PALETTE.bodyText, fontSize: 7 }
				},
				{
					content: row.questionOptions,
					styles: { fillColor: rowFill, textColor: PALETTE.mutedText, fontSize: 6.5 }
				},
				{
					content: row.questionType,
					styles: { fillColor: rowFill, textColor: PALETTE.mutedText, fontSize: 7 }
				},
				{
					content: row.questionMode,
					styles: { fillColor: rowFill, textColor: PALETTE.mutedText, fontSize: 7 }
				},
				{
					content: row.questionConstructs,
					styles: { fillColor: rowFill, textColor: PALETTE.mutedText, fontSize: 7 }
				},
				{
					content: row.questionRequired,
					styles: { fillColor: rowFill, textColor: PALETTE.mutedText, fontStyle: "bold", fontSize: 7 }
				},
				{
					content: row.questionScales,
					styles: { fillColor: rowFill, textColor: PALETTE.mutedText, fontSize: 7 }
				},
				{
					content: row.questionDisplayCondition,
					styles: {
						fillColor: rowFill,
						textColor: row.questionDisplayCondition ? PALETTE.bodyText : PALETTE.mutedText,
						fontSize: 7
					}
				}
			]);

			registerRichCell(pdfBodyRowIndex, 2, {
				segments: row.questionPromptSegments,
				baseFontStyle: "normal",
				textColor: PALETTE.bodyText
			});

			pdfBodyRowIndex += 1;
			questionRowIndex += 1;
		}
	}

	autoTable(doc, {
		head: [QUESTION_HEADERS],
		body,
		startY: 20,

		willDrawCell: (data: CellHookData) => {
			if (data.section !== "body") return;
			const key = cellKey(data.row.index, data.column.index);
			if (!pdfRichCells.has(key)) return;

			// Capture AutoTable's wrapped lines BEFORE clearing them so
			// drawRichCellFromAutotableLines can use them for y-positioning.
			savedCellLines.set(key, [...data.cell.text]);
			data.cell.text = []; // suppress AutoTable's default text draw
		},

		didDrawCell: (data: CellHookData) => {
			if (data.section !== "body") return;
			const key = cellKey(data.row.index, data.column.index);
			const spec = pdfRichCells.get(key);
			const lines = savedCellLines.get(key);
			if (!spec || !lines) return;

			drawRichCellFromAutotableLines(data.doc, data.cell, spec, lines);
		},

		styles: {
			fontSize: 7,
			cellPadding: 2,
			overflow: "linebreak",
			lineColor: PALETTE.border,
			lineWidth: 0.2
		},
		headStyles: {
			fillColor: PALETTE.headerFill,
			textColor: PALETTE.headerText,
			fontStyle: "bold",
			fontSize: 7.5
		},
		columnStyles: {
			0: { cellWidth: columnWidths[0] },
			1: { cellWidth: columnWidths[1] },
			2: { cellWidth: columnWidths[2] },
			3: { cellWidth: columnWidths[3] },
			4: { cellWidth: columnWidths[4] },
			5: { cellWidth: columnWidths[5] },
			6: { cellWidth: columnWidths[6] },
			7: { cellWidth: columnWidths[7] },
			8: { cellWidth: columnWidths[8] },
			9: { cellWidth: columnWidths[9] }
		},
		margin: pdfMargin,
		tableWidth: usableTableWidth
	});

	doc.save(`${fileName}.pdf`);
}
