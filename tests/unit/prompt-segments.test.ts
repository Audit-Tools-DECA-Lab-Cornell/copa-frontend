import assert from "node:assert/strict";
import test from "node:test";

import {
	normalizePromptSegmentsForPdf,
	normalizePromptTypographyForPdf,
	parsePromptSegments
} from "@/lib/audit/prompt-segments";

/**
 * jsPDF's built-in font support is limited, so the PDF export should coerce the
 * instrument's Unicode punctuation into ASCII-safe equivalents before drawing.
 */
test("normalizePromptTypographyForPdf replaces unsupported punctuation with ASCII", () => {
	const value = "well‑being improves stimulation-such as “quotes”, dashes – and minus − signs";

	assert.equal(
		normalizePromptTypographyForPdf(value),
		'well-being improves stimulation-such as "quotes", dashes - and minus - signs'
	);
});

/**
 * The rich-text redraw path relies on the normalized segment text matching the
 * plain banner string exactly, while still preserving the original bold runs.
 */
test("normalizePromptSegmentsForPdf preserves bold segments while normalizing text", () => {
	const raw =
		"**Sensory Qualities & Regulation:** evaluates how well a space supports comfort, well‑being, and stimulation-such as “visual” cues.";

	const normalizedSegments = normalizePromptSegmentsForPdf(parsePromptSegments(raw));

	assert.deepEqual(
		normalizedSegments.map(segment => ({ text: segment.text, bold: segment.bold, type: segment.type })),
		[
			{ text: "Sensory Qualities & Regulation:", bold: true, type: "bold" },
			{
				text: ' evaluates how well a space supports comfort, well-being, and stimulation-such as "visual" cues.',
				bold: false,
				type: "text"
			}
		]
	);
});
