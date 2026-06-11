/**
 * Shared types, colour palettes, download utility, label formatting,
 * and instrument-flattening logic used by all export formats.
 */

import type { PlayspaceInstrument } from "@/types/audit";
import { formatQuestionKeyForDisplay } from "@/lib/audit/selectors";
import { parsePromptSegments, type PromptSegment } from "@/lib/audit/prompt-segments";

// ─── Public types ─────────────────────────────────────────────────────────────

export type InstrumentContent = Record<string, PlayspaceInstrument>;
export type ExportFormat = "pdf" | "xlsx" | "csv" | "json";

// ─── Row types ────────────────────────────────────────────────────────────────

export type SectionHeaderRow = {
	rowType: "section_header";
	sectionNumber: string;
	sectionTitle: string;
	sectionDescription: string;
	sectionInstruction: string;
	sectionNotesPrompt: string;
	sectionDescriptionSegments: readonly PromptSegment[];
	sectionInstructionSegments: readonly PromptSegment[];
	sectionNotesPromptSegments: readonly PromptSegment[];
};

export type QuestionRow = {
	rowType: "question";
	questionKey: string;
	sectionNumber: string;
	questionPrompt: string;
	questionPromptSegments: readonly PromptSegment[];
	questionOptions: string;
	questionType: string;
	questionMode: string;
	questionConstructs: string;
	questionRequired: string;
	questionScales: string;
	questionDisplayCondition: string;
};

export type FlatRow = SectionHeaderRow | QuestionRow;

// ─── Colour palettes ──────────────────────────────────────────────────────────

/**
 * Mobile-origin palette used as the default for PDF exports.
 * Named `PALETTE` in call sites that don't need to distinguish between sources.
 */
export const MOBILE_EXPORT_PALETTE = {
	primary: [37, 99, 235] as [number, number, number],

	headerFill: [31, 41, 55] as [number, number, number],
	headerText: [255, 255, 255] as [number, number, number],
	headerSoftFill: [241, 245, 249] as [number, number, number],
	headerSoftText: [71, 85, 105] as [number, number, number],

	sectionFill: [226, 232, 240] as [number, number, number],
	sectionText: [15, 23, 42] as [number, number, number],
	sectionInstructionText: [15, 23, 42] as [number, number, number],
	sectionNotesText: [15, 23, 42] as [number, number, number],

	sectionTitleColor: [15, 23, 42] as [number, number, number],
	sectionInstrColor: [15, 23, 42] as [number, number, number],
	sectionNotesColor: [15, 23, 42] as [number, number, number],

	questionKeyText: [31, 41, 55] as [number, number, number],

	rowEven: [248, 250, 252] as [number, number, number],
	rowOdd: [255, 255, 255] as [number, number, number],

	requiredYes: [31, 41, 55] as [number, number, number],
	requiredNo: [107, 114, 128] as [number, number, number],
	conditionActive: [31, 41, 55] as [number, number, number],
	conditionEmpty: [148, 163, 184] as [number, number, number],

	bodyText: [31, 41, 55] as [number, number, number],
	sheetBodyText: [51, 65, 85] as [number, number, number],
	mutedText: [107, 114, 128] as [number, number, number],

	titleText: [17, 24, 39] as [number, number, number],

	border: [226, 232, 240] as [number, number, number],
	borderStrong: [148, 163, 184] as [number, number, number],

	summaryFill: [254, 243, 199] as [number, number, number],
	summaryText: [146, 64, 14] as [number, number, number]
} as const;

/** Alias used throughout PDF helpers to avoid renaming at call sites. */
export const PALETTE = MOBILE_EXPORT_PALETTE;

/** Alternative palette intended for web-context PDF rendering. */
export const WEB_PALETTE = {
	headerFill: [30, 41, 59] as [number, number, number],
	headerText: [255, 255, 255] as [number, number, number],
	sectionFill: [48, 60, 80] as [number, number, number],
	sectionText: [255, 255, 255] as [number, number, number],
	sectionTitleColor: [255, 255, 255] as [number, number, number],
	sectionInstrColor: [245, 245, 245] as [number, number, number],
	sectionNotesColor: [240, 240, 240] as [number, number, number],
	questionKeyText: [30, 41, 59] as [number, number, number],
	rowEven: [248, 250, 252] as [number, number, number],
	rowOdd: [255, 255, 255] as [number, number, number],
	requiredYes: [30, 41, 59] as [number, number, number],
	requiredNo: [107, 114, 128] as [number, number, number],
	conditionActive: [30, 41, 59] as [number, number, number],
	conditionEmpty: [148, 163, 184] as [number, number, number],
	bodyText: [30, 41, 59] as [number, number, number],
	mutedText: [100, 116, 139] as [number, number, number],
	border: [226, 232, 240] as [number, number, number]
} as const;

// ─── Prompt-segment helpers ───────────────────────────────────────────────────

/** Parse a raw prompt string into bold/plain segments, collapsing newlines. */
export function parseInstrumentPromptSegments(raw: string): readonly PromptSegment[] {
	if (!raw) return [];
	return parsePromptSegments(raw.replace(/\n/g, " "));
}

/** Reduce segments to plain text, stripping any leading/trailing whitespace. */
export function segmentsToPlainText(segments: readonly PromptSegment[]): string {
	if (segments.length === 0) return "";
	return segments
		.map(s => s.text)
		.join("")
		.trim();
}

// ─── DOM download helper ──────────────────────────────────────────────────────

/**
 * Triggers a browser download for the given blob by injecting a hidden iframe.
 * Using an iframe instead of a plain `<a>` avoids navigation side-effects in
 * some browsers.
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const iframe = document.createElement("iframe");
	iframe.style.display = "none";
	document.body.appendChild(iframe);

	const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
	if (iframeDoc) {
		const a = iframeDoc.createElement("a");
		a.href = url;
		a.download = filename;
		iframeDoc.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(iframe);
			URL.revokeObjectURL(url);
		}, 1000);
	}
}

// ─── Label formatter ──────────────────────────────────────────────────────────

/** Converts snake_case / kebab-case / spaced identifiers to human-readable labels. */
export function formatLabel(raw: string): string {
	if (!raw) return raw;

	const KNOWN_LABELS: Record<string, string> = {
		play_value: "Play Value",
		usability: "Usability",
		accessibility: "Accessibility",
		inclusivity: "Inclusivity",
		nature_play: "Nature Play",
		loose_parts: "Loose Parts",
		risk_challenge: "Risk & Challenge",
		social_play: "Social Play",
		imaginative_play: "Imaginative Play",
		physical_activity: "Physical Activity",
		provision: "Provision",
		variety: "Variety",
		challenge: "Challenge",
		sociability: "Sociability",
		naturalness: "Naturalness",
		audit: "Audit",
		scaled: "Scaled",
		checklist: "Checklist",
		text: "Text",
		yes_no: "Yes / No",
		some: "Some",
		a_lot: "A Lot",
		none: "None"
	};

	const lower = raw.toLowerCase().trim();
	if (KNOWN_LABELS[lower]) return KNOWN_LABELS[lower];

	return raw
		.split(/[_\-\s]+/)
		.map(w => `${w.charAt(0).toUpperCase()}${w.slice(1).toLowerCase()}`)
		.join(" ");
}

// ─── Instrument flattening ────────────────────────────────────────────────────

/**
 * Converts a parsed instrument into an ordered list of flat rows - one
 * `section_header` row per section followed by one `question` row per question.
 * All text fields are normalised to plain strings; prompt segments are retained
 * alongside so rich PDF rendering can use them directly.
 */
export function flattenInstrument(instrument: PlayspaceInstrument): FlatRow[] {
	const rows: FlatRow[] = [];
	if (!instrument?.sections) return rows;

	instrument.sections.forEach((section, sIndex) => {
		const sectionNumber = `Section ${sIndex + 1}`;
		const sectionDescriptionSegments = parseInstrumentPromptSegments(section.description || "");
		const sectionInstructionSegments = parseInstrumentPromptSegments(section.instruction || "");
		const sectionNotesPromptSegments = parseInstrumentPromptSegments(section.notes_prompt || "");
		const instructionPlain = segmentsToPlainText(sectionInstructionSegments);
		const notesPlain = segmentsToPlainText(sectionNotesPromptSegments);

		rows.push({
			rowType: "section_header",
			sectionNumber,
			sectionTitle: section.title || "",
			sectionDescription: segmentsToPlainText(sectionDescriptionSegments),
			sectionInstruction: instructionPlain ? `Instruction: ${instructionPlain}` : "",
			sectionNotesPrompt: notesPlain ? `Notes Prompt: ${notesPlain}` : "",
			sectionDescriptionSegments,
			sectionInstructionSegments,
			sectionNotesPromptSegments
		});

		section.questions.forEach((q, qIndex) => {
			const fallbackKey = `q_${sIndex + 1}_${qIndex + 1}`;
			const rawKey = q.question_key || fallbackKey;

			const optionsStr = q.options?.map(o => o.label).join(" | ") || "";
			const constructsStr = q.constructs?.map(formatLabel).join(", ") || "";
			const scalesStr = q.scales?.map(s => formatLabel(s.key)).join(", ") || "";
			const modeStr = formatLabel(q.mode || "");
			const typeStr = formatLabel(q.question_type || "scaled");
			const conditionStr = q.display_if
				? `${formatQuestionKeyForDisplay(q.display_if.question_key)} (${formatLabel(q.display_if.response_key)}) = ${q.display_if.any_of_option_keys.map(formatLabel).join(", ")}`
				: "";

			const questionPromptSegments = parseInstrumentPromptSegments(q.prompt || "");

			rows.push({
				rowType: "question",
				questionKey: formatQuestionKeyForDisplay(rawKey),
				sectionNumber,
				questionPrompt: segmentsToPlainText(questionPromptSegments),
				questionPromptSegments,
				questionOptions: optionsStr,
				questionType: typeStr,
				questionMode: modeStr,
				questionConstructs: constructsStr,
				questionRequired: q.required !== false ? "Yes" : "No",
				questionScales: scalesStr,
				questionDisplayCondition: conditionStr
			});
		});
	});

	return rows;
}
