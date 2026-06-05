/**
 * Utilities for parsing `**bold**` marker syntax and Markdown headers
 * (`#`–`#####`) used in instrument question prompts. Callers receive a flat
 * segment array and apply their own styling so that execute views, report
 * tables, and any future surfaces can each choose the appropriate visual
 * treatment for each segment type.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discriminated union of all recognised segment types. */
export type PromptSegmentType = "text" | "bold" | "h1" | "h2" | "h3" | "h4" | "h5";

/** One contiguous run of text in a prompt string. */
export interface PromptSegment {
	readonly text: string;
	/**
	 * `true` for content inside `**…**` markers.
	 * Header segments carry `false` here; consult `type` for heading level.
	 */
	readonly bold: boolean;
	/**
	 * Granular type for the segment.
	 * - `"text"` - plain prose
	 * - `"bold"` - `**…**` inline emphasis
	 * - `"h1"`…`"h5"` - Markdown ATX header (`#`…`#####`)
	 */
	readonly type: PromptSegmentType;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Maps `#` count → segment type. */
const HEADER_LEVEL_MAP: Readonly<Record<number, PromptSegmentType>> = {
	1: "h1",
	2: "h2",
	3: "h3",
	4: "h4",
	5: "h5"
};

/**
 * Maximum header depth recognised. Hashes beyond this are treated as plain
 * text (mirrors standard Markdown, which stops at `######`; we cap at 5).
 */
const MAX_HEADER_DEPTH = 5;

/**
 * jsPDF's built-in fonts do not reliably render common Unicode punctuation.
 * Normalize those code points to ASCII-safe equivalents before PDF rendering.
 */
const PDF_TYPOGRAPHY_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
	[/\u00a0/g, " "],
	[/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-"],
	[/[\u2018\u2019\u201b]/g, "'"],
	[/[\u201c\u201d\u201f]/g, '"'],
	[/\u2026/g, "..."]
] as const;

/**
 * ATX header pattern: one-to-five `#` chars at the very start of a trimmed
 * line, followed by at least one space, then the heading text.
 *
 * Group 1 → the `#` run  |  Group 2 → heading content
 */
const HEADER_REGEX = /^(#{1,5})\s+(.+)/;

/**
 * Split a single line on `**…**` markers into bold/text segments.
 * Empty parts are dropped.
 */
function parseBoldSegments(line: string): PromptSegment[] {
	const segments: PromptSegment[] = [];
	const parts = line.split("**");

	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i] ?? "";
		if (part.length === 0) continue;

		const isBold = i % 2 === 1;
		segments.push({ text: part, bold: isBold, type: isBold ? "bold" : "text" });
	}

	return segments;
}

/**
 * Try to parse `line` as an ATX Markdown header.
 *
 * Returns a single-element array with the header segment when the line
 * matches, or `null` when it does not. Bold markers inside header text are
 * intentionally not parsed - headers are already a structural element and
 * nested bold-within-header is not needed for instrument prompts.
 *
 * @param line - A single, already-trimmed line of the raw prompt.
 */
function tryParseHeaderLine(line: string): PromptSegment[] | null {
	const match = HEADER_REGEX.exec(line);
	if (match === null) return null;

	const depth = match[1]!.length;
	if (depth > MAX_HEADER_DEPTH) return null;

	const type = HEADER_LEVEL_MAP[depth];
	if (type === undefined) return null;

	const text = match[2]!.trim();
	if (text.length === 0) return null;

	return [{ text, bold: false, type }];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Split a raw prompt string into an ordered list of segments, recognising:
 * - ATX Markdown headers: `#` through `#####` on their own line
 * - Inline bold: `**…**` markers within non-header lines
 *
 * Empty segments (consecutive markers, blank lines, leading/trailing
 * delimiters) are dropped. Lines are preserved as logical units - a newline
 * between a header and the following prose does not produce an extra segment.
 *
 * @param raw - Raw prompt string from the instrument definition.
 * @returns Ordered segments with `type` and `bold` flag set appropriately.
 *
 * @example
 * parsePromptSegments("## Section\nHas **varied** equipment")
 * // → [
 * //     { text: "Section",  bold: false, type: "h2"   },
 * //     { text: "Has ",     bold: false, type: "text" },
 * //     { text: "varied",   bold: true,  type: "bold" },
 * //     { text: " equipment", bold: false, type: "text" },
 * //   ]
 *
 * @example
 * parsePromptSegments("# Title\n**Note:** read carefully")
 * // → [
 * //     { text: "Title",          bold: false, type: "h1"   },
 * //     { text: "Note:",          bold: true,  type: "bold" },
 * //     { text: " read carefully",bold: false, type: "text" },
 * //   ]
 */
export function parsePromptSegments(raw: string): PromptSegment[] {
	const segments: PromptSegment[] = [];

	for (const line of raw.split("\n")) {
		const trimmed = line.trim();

		// Skip blank lines - they carry no content for instrument prompts.
		if (trimmed.length === 0) continue;

		const headerSegments = tryParseHeaderLine(trimmed);
		if (headerSegments !== null) {
			segments.push(...headerSegments);
		} else {
			segments.push(...parseBoldSegments(trimmed));
		}
	}

	return segments;
}

/**
 * Coerces typography that jsPDF's built-in fonts commonly mis-render into
 * ASCII-safe equivalents for PDF export.
 */
export function normalizePromptTypographyForPdf(value: string): string {
	let normalized = value;

	for (const [pattern, replacement] of PDF_TYPOGRAPHY_REPLACEMENTS) {
		normalized = normalized.replace(pattern, replacement);
	}

	return normalized;
}

/**
 * Applies PDF-safe typography normalization without changing segment ordering
 * or bold/header semantics.
 */
export function normalizePromptSegmentsForPdf(segments: readonly PromptSegment[]): PromptSegment[] {
	return segments.map(segment => ({
		...segment,
		text: normalizePromptTypographyForPdf(segment.text)
	}));
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/** Narrows a segment to one of the heading types. */
export function isHeaderSegment(
	segment: PromptSegment
): segment is PromptSegment & { type: Exclude<PromptSegmentType, "text" | "bold"> } {
	return (
		segment.type === "h1" ||
		segment.type === "h2" ||
		segment.type === "h3" ||
		segment.type === "h4" ||
		segment.type === "h5"
	);
}
