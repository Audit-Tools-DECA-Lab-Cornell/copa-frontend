/**
 * PDF export for the audit pipeline.
 *
 * Styled to match the instrument PDF: dark header, section banner rows, score
 * summary banners. Section headers span the full table width and show the
 * section title, description, instruction, and notes prompt as consecutive
 * banner rows - not as data columns.
 *
 * ### Column layout (response matrix)
 * | # | Header        | Notes                                        |
 * |---|---------------|----------------------------------------------|
 * | 0 | Question Key  | was "ID_Number"                              |
 * | 1 | Mode          | was "Survey or Audit"                        |
 * | 2 | Constructs    | was "Construct"                              |
 * | 3 | Prompt        | was "Items"                                  |
 * | 4 | Provision     | individual scale answer                      |
 * | 5 | Variety     | individual scale answer                      |
 * | 6 | Sociability   | individual scale answer                      |
 * | 7 | Challenge     | individual scale answer                      |
 * | 8 | PV Score      | Play Value construct score                   |
 * | 9 | U Score       | Usability construct score                    |
 *
 * ### Page structure
 * - **Page 1 (portrait A4)** - metadata + aggregate score summary table
 * - **Page 2+ (landscape A4)** - response matrix with section banners
 */

import type { Cell, CellHookData } from "jspdf-autotable";
import type { PromptSegment } from "@/lib/audit/prompt-segments";
import {
	normalizePromptSegmentsForPdf,
	normalizePromptTypographyForPdf,
	parsePromptSegments
} from "@/lib/audit/prompt-segments";
import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";
import type { AuditScoreTotals, ExportableAudit, PlayspaceInstrument } from "./types";
import {
	formatAuditStatusLabel,
	formatChecklistAnswer,
	formatConstructLabel,
	formatExecutionModeLabel,
	formatQuestionAnswer,
	formatQuestionModeLabel,
	formatPercentage,
	formatScoreValue,
	formatTimestampForDisplay,
	stripPromptMarkup
} from "./format-utils";
import { getEffectiveScoreTotals, hasUnsureVariants, type ScoreVariantKey } from "@/lib/audit/score-mode-helpers";
import { buildVisibleQuestionEntries } from "@/lib/audit/report-helpers";
import {
	getCombinedReportLegend,
	getCombinedReportSources,
	REPORT_SOURCE_STYLES
} from "@/lib/audit/report-source-sessions";
import { SCALE_ACCENT_COLORS, SCALE_SOFT_COLORS, hexToRgb, type PvScaleKey } from "@/lib/audit/scale-colors";
import { addScoreTotals, calculateQuestionScores, createEmptyScoreTotals, deriveSummaryScore } from "./score-utils";

function buildScaleRgbMap(colorMap: Record<PvScaleKey, string>): Record<PvScaleKey, [number, number, number]> {
	return {
		provision: hexToRgb(colorMap.provision),
		variety: hexToRgb(colorMap.variety),
		sociability: hexToRgb(colorMap.sociability),
		challenge: hexToRgb(colorMap.challenge)
	};
}

// ── Palette (matches instrument-pdf.ts PALETTE / MOBILE_EXPORT_PALETTE) ──────

const AUDIT_PDF_PALETTE = {
	headerFill: [31, 41, 55] as [number, number, number],
	headerText: [255, 255, 255] as [number, number, number],

	sectionFill: [226, 232, 240] as [number, number, number],
	sectionTitleColor: [15, 23, 42] as [number, number, number],
	sectionText: [15, 23, 42] as [number, number, number],
	sectionInstrColor: [75, 83, 98] as [number, number, number],
	sectionNotesColor: [107, 114, 128] as [number, number, number],

	summaryFill: [51, 65, 85] as [number, number, number],
	summaryText: [255, 255, 255] as [number, number, number],
	summaryLabelFill: [51, 65, 85] as [number, number, number],

	rowEven: [248, 250, 252] as [number, number, number],
	rowOdd: [255, 255, 255] as [number, number, number],

	bodyText: [31, 41, 55] as [number, number, number],
	mutedText: [107, 114, 128] as [number, number, number],
	scoreAccentText: [31, 41, 55] as [number, number, number],

	border: [226, 232, 240] as [number, number, number],

	scaleFill: buildScaleRgbMap(SCALE_SOFT_COLORS),
	scaleAccent: buildScaleRgbMap(SCALE_ACCENT_COLORS)
} as const;

// ── Internal types ────────────────────────────────────────────────────────────

type AutotableFontStyle = "normal" | "bold" | "italic" | "bolditalic";

type PdfRichCell = {
	readonly segments: readonly PromptSegment[];
	readonly baseFontStyle: AutotableFontStyle;
	readonly textColor: readonly [number, number, number];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const JSPDF_MM_PER_PT = 25.4 / 72;

/**
 * Column headers for the response matrix.
 * Cols 4–7 are the four individual scale answers.
 */
const RESPONSE_HEADERS = [
	"Question Key", // 0
	"Mode", // 1
	"Constructs", // 2
	"Prompt", // 3
	"Provision", // 4
	"Variety", // 5
	"Sociability", // 6
	"Challenge", // 7
	"PV Score", // 8
	"U Score" // 9
] as const;

const COL_COUNT = RESPONSE_HEADERS.length;

// ── Rich-cell helpers (verbatim from instrument-pdf.ts) ───────────────────────

function mergedFontStyle(base: AutotableFontStyle, segmentBold: boolean): AutotableFontStyle {
	if (base === "italic") return segmentBold ? "bolditalic" : "italic";
	if (base === "bolditalic") return segmentBold ? "bolditalic" : "italic";
	return segmentBold ? "bold" : "normal";
}

function setPdfFillFromAutotable(pdf: CellHookData["doc"], fillColor: Cell["styles"]["fillColor"]): void {
	if (Array.isArray(fillColor) && fillColor.length >= 3) {
		pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
	}
}

function segmentsToPlainText(segments: readonly PromptSegment[]): string {
	return segments
		.map(s => s.text)
		.join("")
		.trim();
}

function parsePrompt(raw: string): readonly PromptSegment[] {
	if (!raw) return [];
	return normalizePromptSegmentsForPdf(parsePromptSegments(raw.replace(/\n/g, " ")));
}

/**
 * Re-draws a rich cell (with inline bold runs) using line positions already
 * computed by AutoTable. See instrument-pdf.ts for the full rationale.
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

	cell.text = savedLines;
	const pos = cell.getTextPos();
	cell.text = [];

	const valign = cell.styles.valign ?? "middle";
	let startY: number;
	if (valign === "top") {
		startY = pos.y + lineHeight * (2 - pdf.getLineHeightFactor());
	} else if (valign === "bottom") {
		startY = pos.y - (lineCount - 1) * lineHeight;
	} else {
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

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates a PDF blob for a single submitted audit.
 *
 * jsPDF and jspdf-autotable are imported dynamically to keep them out of the
 * initial page bundle.
 */
export async function generatePdfBlob(
	exportableAudit: ExportableAudit,
	instrument: PlayspaceInstrument
): Promise<Blob> {
	const jsPDFModule = await import("jspdf");
	const jsPDF = jsPDFModule.default;
	const autoTableModule = await import("jspdf-autotable");
	const autoTable = autoTableModule.default;

	const { auditSession, context, auditorProfile } = exportableAudit;
	const overallScores = auditSession.scores.overall;
	const combinedSources = getCombinedReportSources(auditSession);
	const finalComments = auditSession.meta.final_comments?.trim() ?? "";

	// ── Page 1: summary (portrait) ────────────────────────────────────────────

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

	const PAGE_MARGIN = 14;
	const PAGE_WIDTH = doc.internal.pageSize.getWidth();
	const USABLE_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

	// ── Header banner ──────────────────────────────────────────────────────────

	doc.setFillColor(...AUDIT_PDF_PALETTE.headerFill);
	doc.rect(0, 0, PAGE_WIDTH, 22, "F");
	doc.setFontSize(13);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...AUDIT_PDF_PALETTE.headerText);
	doc.text(combinedSources === null ? "PVUA Audit Export" : "PVUA Combined Report Export", PAGE_MARGIN, 10);
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(180, 190, 200);
	doc.text(auditSession.audit_code, PAGE_MARGIN, 17);

	// ── Audit details + Auditor profile tables (two columns) ──────────────────

	const halfWidth = (USABLE_WIDTH - 6) / 2;

	const detailsBody: [string, string][] = [
		["Place", auditSession.place_name],
		["Project", auditSession.project_name],
		["Status", formatAuditStatusLabel(auditSession.status)]
	];

	if (combinedSources === null) {
		detailsBody.push(
			["Mode", formatExecutionModeLabel(auditSession, instrument)],
			["Started", formatTimestampForDisplay(auditSession.started_at)],
			["Submitted", formatTimestampForDisplay(auditSession.submitted_at)]
		);
	}

	if (context?.city || context?.province || context?.country) {
		const locationParts = [context?.city, context?.province, context?.country].filter(Boolean);
		detailsBody.push(["Location", locationParts.join(", ")]);
	}
	if (finalComments.length > 0) {
		detailsBody.push(["Final Comments", finalComments]);
	}

	/** Shared cell styles for label/value info tables. */
	const infoHeadStyles = {
		fillColor: AUDIT_PDF_PALETTE.sectionFill,
		textColor: AUDIT_PDF_PALETTE.sectionTitleColor,
		fontStyle: "bold" as const,
		fontSize: 8,
		lineColor: AUDIT_PDF_PALETTE.sectionFill
	};
	const infoStyles = {
		fontSize: 8,
		cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
		lineColor: AUDIT_PDF_PALETTE.border,
		lineWidth: 0.2,
		overflow: "linebreak" as const
	};
	const infoLabelStyles = {
		fontStyle: "bold" as const,
		textColor: AUDIT_PDF_PALETTE.mutedText,
		cellWidth: halfWidth * 0.38
	};
	const infoValueStyles = {
		textColor: AUDIT_PDF_PALETTE.bodyText,
		cellWidth: halfWidth * 0.62
	};
	const docWithAutoTable = doc as unknown as { lastAutoTable: { finalY: number } };
	let lastY = 28;

	if (combinedSources === null) {
		autoTable(doc, {
			head: [["Audit Details", ""]],
			body: detailsBody,
			startY: 28,
			theme: "plain",
			styles: infoStyles,
			headStyles: { ...infoHeadStyles, halign: "left" },
			columnStyles: { 0: infoLabelStyles, 1: infoValueStyles },
			margin: { left: PAGE_MARGIN, right: PAGE_MARGIN + halfWidth + 6 },
			tableWidth: halfWidth
		});

		const detailsTableBottomY = docWithAutoTable.lastAutoTable?.finalY ?? 100;

		const auditorBody: [string, string][] = auditorProfile
			? [
					["Auditor Code", auditorProfile.auditorCode],
					["Age Range", auditorProfile.ageRange ?? "-"],
					["Gender", auditorProfile.gender ?? "-"],
					["Country", auditorProfile.country ?? "-"],
					["Role", auditorProfile.role ?? "-"]
				]
			: [["Auditor", "Not available"]];

		autoTable(doc, {
			head: [["Auditor Profile", ""]],
			body: auditorBody,
			startY: 28,
			theme: "plain",
			styles: infoStyles,
			headStyles: { ...infoHeadStyles, halign: "left" },
			columnStyles: { 0: infoLabelStyles, 1: infoValueStyles },
			margin: { left: PAGE_MARGIN + halfWidth + 6, right: PAGE_MARGIN },
			tableWidth: halfWidth
		});

		const auditorTableBottomY = docWithAutoTable.lastAutoTable?.finalY ?? 100;
		lastY = Math.max(detailsTableBottomY, auditorTableBottomY);
	} else {
		autoTable(doc, {
			head: [["Combined Report Details", ""]],
			body: detailsBody,
			startY: 28,
			theme: "plain",
			styles: infoStyles,
			headStyles: { ...infoHeadStyles, halign: "left" },
			columnStyles: {
				0: { ...infoLabelStyles, cellWidth: USABLE_WIDTH * 0.26 },
				1: { ...infoValueStyles, cellWidth: USABLE_WIDTH * 0.74 }
			},
			margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
			tableWidth: USABLE_WIDTH
		});

		const combinedDetailsBottomY = docWithAutoTable.lastAutoTable?.finalY ?? 100;
		const sourceTableStartY = combinedDetailsBottomY + 6;
		const sourceBodyFor = (
			sourceLabel: "Place Audit" | "Place Survey",
			sourceSession: typeof combinedSources.audit
		) =>
			[
				["Submission", sourceSession.audit_code],
				["Auditor Code", sourceSession.auditor_code],
				["Status", formatAuditStatusLabel(sourceSession.status)],
				["Mode", formatExecutionModeLabel(sourceSession, instrument)],
				["Started", formatTimestampForDisplay(sourceSession.started_at)],
				["Submitted", formatTimestampForDisplay(sourceSession.submitted_at)]
			] as [string, string][];

		autoTable(doc, {
			head: [["Place Audit Submission", ""]],
			body: sourceBodyFor("Place Audit", combinedSources.audit),
			startY: sourceTableStartY,
			theme: "plain",
			styles: infoStyles,
			headStyles: { ...infoHeadStyles, halign: "left" },
			columnStyles: { 0: infoLabelStyles, 1: infoValueStyles },
			margin: { left: PAGE_MARGIN, right: PAGE_MARGIN + halfWidth + 6 },
			tableWidth: halfWidth
		});
		const auditSourceBottomY = docWithAutoTable.lastAutoTable?.finalY ?? sourceTableStartY;

		autoTable(doc, {
			head: [["Place Survey Submission", ""]],
			body: sourceBodyFor("Place Survey", combinedSources.survey),
			startY: sourceTableStartY,
			theme: "plain",
			styles: infoStyles,
			headStyles: { ...infoHeadStyles, halign: "left" },
			columnStyles: { 0: infoLabelStyles, 1: infoValueStyles },
			margin: { left: PAGE_MARGIN + halfWidth + 6, right: PAGE_MARGIN },
			tableWidth: halfWidth
		});
		const surveySourceBottomY = docWithAutoTable.lastAutoTable?.finalY ?? sourceTableStartY;
		lastY = Math.max(auditSourceBottomY, surveySourceBottomY);
	}

	/**
	 * A score row with the metric label in col 0 and value in col 1.
	 * Scale rows carry colour coding via per-row styles.
	 */
	type ScoreRow = {
		readonly cells: [string, string];
		readonly labelFill: [number, number, number];
		readonly valueFill: [number, number, number];
		readonly labelText: [number, number, number];
		readonly valueText: [number, number, number];
		readonly bold: boolean;
	};

	const neutral = AUDIT_PDF_PALETTE.rowEven;
	const neutralText = AUDIT_PDF_PALETTE.bodyText;
	const summaryFill = AUDIT_PDF_PALETTE.summaryFill;
	const summaryText = AUDIT_PDF_PALETTE.summaryText;

	const scoreRows: ScoreRow[] = [
		{
			cells: ["Summary Score", String(deriveSummaryScore(auditSession))],
			labelFill: summaryFill,
			valueFill: summaryFill,
			labelText: summaryText,
			valueText: summaryText,
			bold: true
		},
		{
			cells: ["Play Value Total", formatScoreValue(overallScores?.play_value_total ?? 0)],
			labelFill: neutral,
			valueFill: neutral,
			labelText: neutralText,
			valueText: neutralText,
			bold: true
		},
		{
			cells: ["Usability Total", formatScoreValue(overallScores?.usability_total ?? 0)],
			labelFill: neutral,
			valueFill: neutral,
			labelText: neutralText,
			valueText: neutralText,
			bold: true
		},
		{
			cells: ["Provision Total", formatScoreValue(overallScores?.provision_total ?? 0)],
			labelFill: AUDIT_PDF_PALETTE.scaleFill.provision,
			valueFill: AUDIT_PDF_PALETTE.scaleFill.provision,
			labelText: AUDIT_PDF_PALETTE.scaleAccent.provision,
			valueText: AUDIT_PDF_PALETTE.scaleAccent.provision,
			bold: false
		},
		{
			cells: ["Variety Total", formatScoreValue(overallScores?.variety_total ?? 0)],
			labelFill: AUDIT_PDF_PALETTE.scaleFill.variety,
			valueFill: AUDIT_PDF_PALETTE.scaleFill.variety,
			labelText: AUDIT_PDF_PALETTE.scaleAccent.variety,
			valueText: AUDIT_PDF_PALETTE.scaleAccent.variety,
			bold: false
		},
		{
			cells: ["Sociability Total", formatScoreValue(overallScores?.sociability_total ?? 0)],
			labelFill: AUDIT_PDF_PALETTE.scaleFill.sociability,
			valueFill: AUDIT_PDF_PALETTE.scaleFill.sociability,
			labelText: AUDIT_PDF_PALETTE.scaleAccent.sociability,
			valueText: AUDIT_PDF_PALETTE.scaleAccent.sociability,
			bold: false
		},
		{
			cells: ["Challenge Total", formatScoreValue(overallScores?.challenge_total ?? 0)],
			labelFill: AUDIT_PDF_PALETTE.scaleFill.challenge,
			valueFill: AUDIT_PDF_PALETTE.scaleFill.challenge,
			labelText: AUDIT_PDF_PALETTE.scaleAccent.challenge,
			valueText: AUDIT_PDF_PALETTE.scaleAccent.challenge,
			bold: false
		}
	];

	autoTable(doc, {
		head: [["Score Metric", "Value"]],
		body: scoreRows.map(r => r.cells),
		startY: lastY + 8,
		theme: "plain",
		styles: {
			fontSize: 9,
			cellPadding: { top: 3, bottom: 3, left: 6, right: 6 },
			lineColor: AUDIT_PDF_PALETTE.border,
			lineWidth: 0.2
		},
		headStyles: {
			fillColor: AUDIT_PDF_PALETTE.headerFill,
			lineColor: AUDIT_PDF_PALETTE.headerFill,
			textColor: AUDIT_PDF_PALETTE.headerText,
			fontStyle: "bold",
			fontSize: 9
		},
		columnStyles: {
			0: { cellWidth: USABLE_WIDTH * 0.65 },
			1: { cellWidth: USABLE_WIDTH * 0.35, halign: "right" }
		},
		margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
		tableWidth: USABLE_WIDTH,
		didParseCell: data => {
			if (data.section !== "body") return;
			const row = scoreRows[data.row.index];
			if (!row) return;
			const fill = data.column.index === 0 ? row.labelFill : row.valueFill;
			const color = data.column.index === 0 ? row.labelText : row.valueText;
			data.cell.styles.fillColor = fill;
			data.cell.styles.lineColor = fill;
			data.cell.styles.textColor = color;
			data.cell.styles.fontStyle = row.bold ? "bold" : "normal";
		}
	});

	// ── Page 1: Unsure interpretations (only when Unsure answers exist) ───────

	if (hasUnsureVariants(auditSession.scores)) {
		const variantOrder: readonly { key: ScoreVariantKey; label: string }[] = [
			{ key: "canonical", label: "Unsure excluded (saved score)" },
			{ key: "unsure_as_zero", label: "Unsure as zero" },
			{ key: "unsure_as_max", label: "Unsure as maximum" }
		];
		const variantRows = variantOrder.map(({ key, label }) => {
			const totals = getEffectiveScoreTotals(auditSession.scores, key);
			if (totals === null) {
				return [label, "--", "--", "--"];
			}
			const summaryTotal = totals.play_value_total + totals.usability_total;
			const summaryMax = totals.play_value_total_max + totals.usability_total_max;
			return [
				label,
				`${totals.play_value_total} / ${totals.play_value_total_max} (${formatPercentage(totals.play_value_total, totals.play_value_total_max)})`,
				`${totals.usability_total} / ${totals.usability_total_max} (${formatPercentage(totals.usability_total, totals.usability_total_max)})`,
				`${summaryTotal} / ${summaryMax} (${formatPercentage(summaryTotal, summaryMax)})`
			];
		});

		const unsureCount = auditSession.scores.unsure_answer_count;
		autoTable(doc, {
			head: [["Unsure interpretation", "Play Value", "Usability", "Summary"]],
			body: variantRows,
			startY: docWithAutoTable.lastAutoTable.finalY + 8,
			theme: "plain",
			styles: {
				fontSize: 8,
				cellPadding: { top: 3, bottom: 3, left: 6, right: 6 },
				lineColor: AUDIT_PDF_PALETTE.border,
				lineWidth: 0.2
			},
			headStyles: {
				fillColor: AUDIT_PDF_PALETTE.headerFill,
				lineColor: AUDIT_PDF_PALETTE.headerFill,
				textColor: AUDIT_PDF_PALETTE.headerText,
				fontStyle: "bold",
				fontSize: 8
			},
			margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
			tableWidth: USABLE_WIDTH
		});
		doc.setFontSize(7.5);
		doc.setTextColor(...AUDIT_PDF_PALETTE.mutedText);
		doc.text(
			`${unsureCount} Unsure answer${unsureCount === 1 ? "" : "s"} found. The saved score uses "Unsure excluded".`,
			PAGE_MARGIN,
			docWithAutoTable.lastAutoTable.finalY + 4
		);
	}

	// ── Page 2+: response matrix (landscape) ─────────────────────────────────

	doc.addPage("a4", "landscape");

	const pdfMargin = { top: 20, left: 6, right: 6 };
	const pageWidth = doc.internal.pageSize.getWidth();
	const usableWidth = pageWidth - pdfMargin.left - pdfMargin.right;

	/**
	 * Column width proportions.
	 * 0  Question Key - 8%
	 * 1  Mode         - 5.5%
	 * 2  Constructs   - 6.5%
	 * 3  Prompt       - 28%
	 * 4  Provision    - 10%
	 * 5  Variety    - 10%
	 * 6  Sociability  - 10%
	 * 7  Challenge    - 10%
	 * 8  PV Score     - 6%
	 * 9  U Score      - 6%
	 *                   ≈ 100%
	 */
	const colWidths: Record<number, number> = {
		0: usableWidth * 0.08,
		1: usableWidth * 0.055,
		2: usableWidth * 0.065,
		3: usableWidth * 0.28,
		4: usableWidth * 0.1,
		5: usableWidth * 0.1,
		6: usableWidth * 0.1,
		7: usableWidth * 0.1,
		8: usableWidth * 0.06,
		9: usableWidth * 0.06
	};

	doc.setFontSize(13);
	doc.setTextColor(...AUDIT_PDF_PALETTE.headerFill);
	doc.text(`${auditSession.audit_code} - ${auditSession.place_name} - PVUA Response Matrix`, pdfMargin.left, 14);

	if (combinedSources !== null) {
		const legendTop = 16.5;
		const boxSize = 3.2;
		doc.setFillColor(...REPORT_SOURCE_STYLES.audit.rgb);
		doc.rect(pdfMargin.left, legendTop, boxSize, boxSize, "F");
		doc.setFontSize(7.5);
		doc.setTextColor(...AUDIT_PDF_PALETTE.bodyText);
		doc.text("source: Place Audit", pdfMargin.left + boxSize + 1.2, legendTop + 2.7);

		const surveyLegendX = pdfMargin.left + 33;
		doc.setFillColor(...REPORT_SOURCE_STYLES.survey.rgb);
		doc.rect(surveyLegendX, legendTop, boxSize, boxSize, "F");
		doc.text("source: Place Survey", surveyLegendX + boxSize + 1.2, legendTop + 2.7);

		doc.setFontSize(6.5);
		doc.setTextColor(...AUDIT_PDF_PALETTE.mutedText);
		doc.text(getCombinedReportLegend(), pdfMargin.left, legendTop + 7);
	}

	// Rich-cell tracking (same mechanism as instrument-pdf.ts)
	const pdfRichCells = new Map<string, PdfRichCell>();
	const savedCellLines = new Map<string, string[]>();

	function cellKey(rowIdx: number, colIdx: number): string {
		return `${rowIdx}-${colIdx}`;
	}

	function registerRichCell(rowIdx: number, colIdx: number, spec: PdfRichCell): void {
		if (!spec.segments.some(s => s.bold)) return;
		pdfRichCells.set(cellKey(rowIdx, colIdx), spec);
	}

	// ── Score row helper ──────────────────────────────────────────────────────

	/**
	 * Pushes a structured score summary row that aligns values under their
	 * respective column headers.  The row has:
	 *   col 0–2  → merged label cell (colSpan 3, amber fill)
	 *   col 3    → empty spacer (amber fill)
	 *   col 4    → Provision value  (scale soft fill)
	 *   col 5    → Variety value  (scale soft fill)
	 *   col 6    → Sociability value (scale soft fill)
	 *   col 7    → Challenge value  (scale soft fill)
	 *   col 8    → PV value         (amber fill)
	 *   col 9    → U value          (amber fill)
	 */
	function pushScoreRow(label: string, totals: AuditScoreTotals, variant: "total" | "max" | "pct"): void {
		const fmt = (val: number, max: number): string => {
			if (variant === "total") return String(val);
			if (variant === "max") return String(max);
			return max > 0 ? `${Math.round((val / max) * 1000) / 10}%` : "--";
		};

		const isTotal = variant === "total";
		const fontStyle: AutotableFontStyle = "bold";
		const topPad = isTotal ? 4 : 1;
		const bottomPad = variant === "pct" ? 4 : 1;

		const baseStyles = {
			fontSize: 7.5,
			fontStyle,
			cellPadding: { top: topPad, bottom: bottomPad, left: 4, right: 4 }
		};

		const scaleCell = (scale: "provision" | "variety" | "sociability" | "challenge", val: number, max: number) => ({
			content: fmt(val, max),
			styles: {
				...baseStyles,
				fillColor: AUDIT_PDF_PALETTE.scaleFill[scale],
				lineColor: AUDIT_PDF_PALETTE.scaleFill[scale],
				textColor: AUDIT_PDF_PALETTE.scaleAccent[scale],
				halign: "center" as const
			}
		});

		const scoreCell = (val: number, max: number) => ({
			content: fmt(val, max),
			styles: {
				...baseStyles,
				fillColor: AUDIT_PDF_PALETTE.summaryFill,
				lineColor: AUDIT_PDF_PALETTE.summaryFill,
				textColor: AUDIT_PDF_PALETTE.summaryText,
				fontStyle: isTotal ? ("bold" as const) : ("normal" as const),
				halign: "right" as const
			}
		});

		body.push([
			// Label spans cols 0–2 + prompt col (3) as a spacer
			{
				content: label,
				colSpan: 4,
				styles: {
					...baseStyles,
					fillColor: AUDIT_PDF_PALETTE.summaryLabelFill,
					lineColor: AUDIT_PDF_PALETTE.summaryLabelFill,
					textColor: AUDIT_PDF_PALETTE.summaryText,
					halign: "left" as const
				}
			},
			scaleCell("provision", totals.provision_total, totals.provision_total_max),
			scaleCell("variety", totals.variety_total, totals.variety_total_max),
			scaleCell("sociability", totals.sociability_total, totals.sociability_total_max),
			scaleCell("challenge", totals.challenge_total, totals.challenge_total_max),
			scoreCell(totals.play_value_total, totals.play_value_total_max),
			scoreCell(totals.usability_total, totals.usability_total_max)
		]);
		pdfBodyRowIndex += 1;
	}

	// ── Build body ────────────────────────────────────────────────────────────

	const body: object[][] = [];
	let pdfBodyRowIndex = 0;
	let questionRowIndex = 0;

	/**
	 * Pushes a full-width banner row (colSpan = COL_COUNT).
	 * Used for section headers, descriptions, instructions, notes, and score
	 * summary lines - all follow the instrument-PDF style.
	 */
	function pushBanner(
		content: string,
		fontStyle: AutotableFontStyle,
		textColor: [number, number, number],
		fillColor: [number, number, number],
		fontSize: number,
		topPad = 4,
		bottomPad = 4
	): void {
		body.push([
			{
				content,
				colSpan: COL_COUNT,
				styles: {
					fillColor,
					lineColor: fillColor,
					textColor,
					fontStyle,
					fontSize,
					cellPadding: { top: topPad, bottom: bottomPad, left: 8, right: 8 }
				}
			}
		]);
	}

	for (const [sectionIndex, section] of instrument.sections.entries()) {
		const visibleEntries = buildVisibleQuestionEntries(auditSession, section);

		if (visibleEntries.length === 0) continue;
		let sectionTotals = createEmptyScoreTotals();

		// ── Section title banner ────────────────────────────────────────────

		const sectionLabel = normalizePromptTypographyForPdf(
			`Section ${sectionIndex + 1}  ·  ${stripPromptMarkup(section.title)}`
		);
		pushBanner(sectionLabel, "bold", AUDIT_PDF_PALETTE.sectionTitleColor, AUDIT_PDF_PALETTE.sectionFill, 9, 5, 3);
		pdfBodyRowIndex += 1;

		// ── Section description ─────────────────────────────────────────────

		const descriptionPlain = section.description
			? normalizePromptTypographyForPdf(stripPromptMarkup(section.description))
			: "";

		if (descriptionPlain) {
			pushBanner(
				descriptionPlain,
				"normal",
				AUDIT_PDF_PALETTE.sectionText,
				AUDIT_PDF_PALETTE.sectionFill,
				7.5,
				1,
				2
			);
			const descSegments = parsePrompt(section.description ?? "");
			registerRichCell(pdfBodyRowIndex, 0, {
				segments: descSegments,
				baseFontStyle: "normal",
				textColor: AUDIT_PDF_PALETTE.sectionText
			});
			pdfBodyRowIndex += 1;
		}

		// ── Section instruction ─────────────────────────────────────────────

		const instructionPlain = section.instruction
			? normalizePromptTypographyForPdf(stripPromptMarkup(section.instruction))
			: "";

		if (instructionPlain) {
			pushBanner(
				`Instruction: ${instructionPlain}`,
				"bolditalic",
				AUDIT_PDF_PALETTE.sectionInstrColor,
				AUDIT_PDF_PALETTE.sectionFill,
				7.5,
				1,
				2
			);
			const instrSegments = parsePrompt(section.instruction ?? "");
			registerRichCell(pdfBodyRowIndex, 0, {
				segments: [{ text: "Instruction: ", bold: false, type: "text" }, ...instrSegments],
				baseFontStyle: "bolditalic",
				textColor: AUDIT_PDF_PALETTE.sectionInstrColor
			});
			pdfBodyRowIndex += 1;
		}

		// ── Section notes prompt ────────────────────────────────────────────

		const notesPlain =
			typeof section.notes_prompt === "string"
				? normalizePromptTypographyForPdf(stripPromptMarkup(section.notes_prompt))
				: "";

		// Notes prompt is shown here as a banner even if there is no auditor
		// comment, so the reader knows what was being asked.
		if (notesPlain) {
			pushBanner(
				`Notes Prompt: ${notesPlain}`,
				"italic",
				AUDIT_PDF_PALETTE.sectionNotesColor,
				AUDIT_PDF_PALETTE.sectionFill,
				7.5,
				1,
				5
			);
			const notesSegments = parsePrompt(section.notes_prompt ?? "");
			registerRichCell(pdfBodyRowIndex, 0, {
				segments: [{ text: "Notes Prompt: ", bold: false, type: "text" }, ...notesSegments],
				baseFontStyle: "italic",
				textColor: AUDIT_PDF_PALETTE.sectionNotesColor
			});
			pdfBodyRowIndex += 1;
		}

		// ── Question rows ───────────────────────────────────────────────────

		for (const visibleEntry of visibleEntries) {
			const { question, answers, sourceComponent } = visibleEntry;
			const scores = calculateQuestionScores(question, answers);
			sectionTotals = addScoreTotals(sectionTotals, scores);

			const isEven = questionRowIndex % 2 === 0;
			const rowFill = isEven ? AUDIT_PDF_PALETTE.rowEven : AUDIT_PDF_PALETTE.rowOdd;
			const sourceFill =
				sourceComponent === null
					? rowFill
					: ([...REPORT_SOURCE_STYLES[sourceComponent].rgb] as [number, number, number]);

			const questionKeyDisplay = formatQuestionKeyForDisplay(question.question_key || "");
			const modeLabel = formatQuestionModeLabel(question.mode);
			const constructsLabel = formatConstructLabel(question.constructs);
			const promptPlain = normalizePromptTypographyForPdf(stripPromptMarkup(question.prompt));
			const promptSegments = parsePrompt(question.prompt);

			// Individual scale answers (cols 4–7)
			const rawProvision = answers.provision;
			const rawVariety = answers.variety;
			const rawSociability = answers.sociability;
			const rawChallenge = answers.challenge;

			const provisionAnswer =
				question.question_type === "checklist"
					? formatChecklistAnswer(question, answers)
					: formatQuestionAnswer(
							question,
							"provision",
							typeof rawProvision === "string" ? rawProvision : undefined
						);
			const varietyAnswer =
				question.question_type === "checklist"
					? ""
					: formatQuestionAnswer(
							question,
							"variety",
							typeof rawVariety === "string" ? rawVariety : undefined
						);
			const sociabilityAnswer =
				question.question_type === "checklist"
					? ""
					: formatQuestionAnswer(
							question,
							"sociability",
							typeof rawSociability === "string" ? rawSociability : undefined
						);
			const challengeAnswer =
				question.question_type === "checklist"
					? ""
					: formatQuestionAnswer(
							question,
							"challenge",
							typeof rawChallenge === "string" ? rawChallenge : undefined
						);

			const pvScore = question.constructs.includes("play_value") ? String(scores.play_value_total) : "N/A";
			const uScore = question.constructs.includes("usability") ? String(scores.usability_total) : "N/A";

			body.push([
				{
					content: questionKeyDisplay,
					styles: {
						fillColor: sourceFill,
						textColor: AUDIT_PDF_PALETTE.bodyText,
						fontStyle: "bold",
						fontSize: 7
					}
				},
				{
					content: modeLabel,
					styles: { fillColor: sourceFill, textColor: AUDIT_PDF_PALETTE.mutedText, fontSize: 6.5 }
				},
				{
					content: constructsLabel,
					styles: { fillColor: sourceFill, textColor: AUDIT_PDF_PALETTE.mutedText, fontSize: 6.5 }
				},
				{
					content: promptPlain,
					styles: { fillColor: sourceFill, textColor: AUDIT_PDF_PALETTE.bodyText, fontSize: 7 }
				},
				{
					content: provisionAnswer,
					styles: {
						fillColor: AUDIT_PDF_PALETTE.scaleFill.provision,
						textColor: AUDIT_PDF_PALETTE.scaleAccent.provision,
						fontSize: 6.5
					}
				},
				{
					content: varietyAnswer,
					styles: {
						fillColor: AUDIT_PDF_PALETTE.scaleFill.variety,
						textColor: AUDIT_PDF_PALETTE.scaleAccent.variety,
						fontSize: 6.5
					}
				},
				{
					content: sociabilityAnswer,
					styles: {
						fillColor: AUDIT_PDF_PALETTE.scaleFill.sociability,
						textColor: AUDIT_PDF_PALETTE.scaleAccent.sociability,
						fontSize: 6.5
					}
				},
				{
					content: challengeAnswer,
					styles: {
						fillColor: AUDIT_PDF_PALETTE.scaleFill.challenge,
						textColor: AUDIT_PDF_PALETTE.scaleAccent.challenge,
						fontSize: 6.5
					}
				},
				{
					content: pvScore,
					styles: {
						fillColor: AUDIT_PDF_PALETTE.summaryFill,
						textColor: AUDIT_PDF_PALETTE.summaryText,
						fontStyle: "bold",
						fontSize: 7,
						halign: "right"
					}
				},
				{
					content: uScore,
					styles: {
						fillColor: AUDIT_PDF_PALETTE.summaryFill,
						textColor: AUDIT_PDF_PALETTE.summaryText,
						fontStyle: "bold",
						fontSize: 7,
						halign: "right"
					}
				}
			]);

			// Register rich cell for the Prompt column (col 3) if it has bold segments.
			registerRichCell(pdfBodyRowIndex, 3, {
				segments: promptSegments,
				baseFontStyle: "normal",
				textColor: AUDIT_PDF_PALETTE.bodyText
			});

			pdfBodyRowIndex += 1;
			questionRowIndex += 1;
		}

		// ── Auditor note row ────────────────────────────────────────────────
		// Always rendered - blank when the auditor left no note, so there is
		// always a visual gap between the last question and the score rows.

		if (combinedSources === null) {
			const sectionNote = auditSession.sections[section.section_key]?.note ?? "";
			pushBanner(
				sectionNote.trim().length > 0 ? `Auditor Note: ${sectionNote.trim()}` : "",
				"italic",
				AUDIT_PDF_PALETTE.sectionNotesColor,
				AUDIT_PDF_PALETTE.sectionFill,
				7,
				2,
				2
			);
			pdfBodyRowIndex += 1;
		} else {
			(["audit", "survey"] as const).forEach(sourceComponent => {
				const sectionNote = combinedSources[sourceComponent].sections[section.section_key]?.note ?? "";
				pushBanner(
					sectionNote.trim().length > 0
						? `Auditor Note (${REPORT_SOURCE_STYLES[sourceComponent].label}): ${sectionNote.trim()}`
						: "",
					"italic",
					AUDIT_PDF_PALETTE.sectionNotesColor,
					AUDIT_PDF_PALETTE.sectionFill,
					7,
					2,
					2
				);
				pdfBodyRowIndex += 1;
			});
		}

		// ── Section score summary rows ───────────────────────────────────────
		// Three structured rows - Total / Max / % - each value aligned under
		// its scale column header with the canonical scale soft fill.

		pushScoreRow(`Section ${sectionIndex + 1}  Total`, sectionTotals, "total");
		pushScoreRow(`Section ${sectionIndex + 1}  Max`, sectionTotals, "max");
		pushScoreRow(`Section ${sectionIndex + 1}  Percent`, sectionTotals, "pct");
	}

	// ── Overall summary banners ───────────────────────────────────────────────

	if (body.length > 0) {
		// Recompute overall totals from the instrument (cleaner than carrying
		// a mutable outer var through the loop).
		let overallTotals = createEmptyScoreTotals();
		for (const section of instrument.sections) {
			const visibleEntries = buildVisibleQuestionEntries(auditSession, section);
			if (visibleEntries.length === 0) continue;
			for (const visibleEntry of visibleEntries) {
				overallTotals = addScoreTotals(
					overallTotals,
					calculateQuestionScores(visibleEntry.question, visibleEntry.answers)
				);
			}
		}

		// Thin separator before overall rows
		pushBanner("", "normal", AUDIT_PDF_PALETTE.sectionTitleColor, AUDIT_PDF_PALETTE.sectionFill, 4, 2, 2);

		// Three structured overall rows - Total / Max / %
		pushScoreRow("Overall  Total", overallTotals, "total");
		pushScoreRow("Overall  Max", overallTotals, "max");
		pushScoreRow("Overall  Percent", overallTotals, "pct");
	}

	// ── Render the table ──────────────────────────────────────────────────────

	autoTable(doc, {
		head: [Array.from(RESPONSE_HEADERS)],
		body,
		startY: combinedSources === null ? 20 : 26,

		willDrawCell: (data: CellHookData) => {
			if (data.section !== "body") return;
			const key = cellKey(data.row.index, data.column.index);
			if (!pdfRichCells.has(key)) return;
			savedCellLines.set(key, [...data.cell.text]);
			data.cell.text = [];
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
			lineColor: AUDIT_PDF_PALETTE.border,
			lineWidth: 0.2
		},
		headStyles: {
			fillColor: AUDIT_PDF_PALETTE.headerFill,
			textColor: AUDIT_PDF_PALETTE.headerText,
			fontStyle: "bold",
			fontSize: 7.5
		},
		columnStyles: {
			0: { cellWidth: colWidths[0] },
			1: { cellWidth: colWidths[1] },
			2: { cellWidth: colWidths[2] },
			3: { cellWidth: colWidths[3] },
			4: { cellWidth: colWidths[4] },
			5: { cellWidth: colWidths[5] },
			6: { cellWidth: colWidths[6] },
			7: { cellWidth: colWidths[7] },
			8: { cellWidth: colWidths[8] },
			9: { cellWidth: colWidths[9] },
			10: { cellWidth: colWidths[10] },
			11: { cellWidth: colWidths[11] }
		},
		margin: pdfMargin,
		tableWidth: usableWidth
	});

	return doc.output("blob");
}
