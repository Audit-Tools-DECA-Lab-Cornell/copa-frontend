/**
 * Pure text and number formatting helpers used across all audit export formats.
 *
 * All functions here are side-effect-free. They do not import from any sibling
 * module — only from `types.ts` and the shared domain types.
 */

import type {
	AuditSession,
	AuditStatus,
	ExecutionMode,
	InstrumentQuestion,
	PlayspaceInstrument,
	QuestionResponsePayload,
	QuestionScale,
	ScaleOption,
	SpreadsheetCell
} from "./types";
import type { AuditExportContext } from "./types";
import { INVALID_SHEET_NAME_CHARACTERS } from "./types";

// ── Number formatting ────────────────────────────────────────────────────────

/** Rounds to two decimal places without trailing zeros for display. */
export function roundToTwoDecimals(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * Formats a numeric value as a string.
 * Integer values omit the decimal; fractional values are rounded to two places.
 */
export function formatNumericCell(value: number): string {
	return Number.isInteger(value) ? value.toString() : roundToTwoDecimals(value).toString();
}

/**
 * Formats a score value for display in score summary rows.
 * Integers are returned without a decimal; fractional values get one decimal place.
 */
export function formatScoreValue(value: number): string {
	return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

/**
 * Formats a fraction as a percentage string, e.g. `"72.5%"` or `"--"` when
 * `maximum <= 0`.
 */
export function formatPercentage(value: number, maximum: number): string {
	if (maximum <= 0) {
		return "--";
	}
	const percentage = (value / maximum) * 100;
	const rounded = Math.round(percentage * 10) / 10;
	return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

/** Converts a spreadsheet cell to its string representation. */
export function stringifyCell(cell: SpreadsheetCell): string {
	return typeof cell === "number" ? formatNumericCell(cell) : cell;
}

// ── String formatting ────────────────────────────────────────────────────────

/** Strips `**` bold markers from instrument prompt strings. */
export function stripPromptMarkup(value: string): string {
	return value.split("**").join("").trim();
}

/**
 * Produces a lowercase, hyphen-separated slug from any string.
 * Falls back to `"audit"` if the result is empty.
 */
export function slugifySegment(value: string): string {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return normalized.length === 0 ? "audit" : normalized;
}

/**
 * Removes characters that are illegal in XLSX sheet names and truncates to 31
 * characters (Excel's hard limit).
 */
export function sanitizeSheetName(value: string): string {
	let sanitized = value.trim();
	for (const invalidChar of INVALID_SHEET_NAME_CHARACTERS) {
		sanitized = sanitized.split(invalidChar).join("_");
	}
	if (sanitized.length === 0) {
		return "Sheet";
	}
	return sanitized.slice(0, 31);
}

// ── Domain / instrument formatters ───────────────────────────────────────────

/** Formats a city / province / country context into a comma-separated string. */
export function formatLocality(context: AuditExportContext | null): string {
	if (context === null) {
		return "";
	}
	return [context.city, context.province, context.country]
		.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
		.join(", ");
}

/** Returns a human-readable label for an audit status code. */
export function formatAuditStatusLabel(status: AuditStatus): string {
	switch (status) {
		case "IN_PROGRESS":
			return "In progress";
		case "PAUSED":
			return "Paused";
		case "SUBMITTED":
			return "Submitted";
		default:
			return status;
	}
}

/**
 * Resolves the effective execution mode for an audit session.
 * Prefers the explicitly-selected mode over the meta default.
 */
export function resolveExecutionMode(auditSession: AuditSession): ExecutionMode | null {
	return auditSession.selected_execution_mode ?? auditSession.meta.execution_mode;
}

/** Returns a human-readable label for an execution mode key. */
export function formatQuestionModeLabel(mode: ExecutionMode): string {
	switch (mode) {
		case "survey":
			return "Survey";
		case "audit":
			return "Audit";
		case "both":
			return "Survey + Audit";
		default:
			return mode;
	}
}

/**
 * Returns the display label for the execution mode of an audit session, using
 * the instrument's own `execution_modes` list when available.
 */
export function formatExecutionModeLabel(auditSession: AuditSession, instrument: PlayspaceInstrument): string {
	const executionMode = resolveExecutionMode(auditSession);
	if (executionMode === null) {
		return "";
	}
	const matchedMode = instrument.execution_modes.find(mode => mode.key === executionMode);
	return matchedMode === undefined ? formatQuestionModeLabel(executionMode) : matchedMode.label;
}

/** Converts an ISO timestamp to a human-readable UTC string, e.g. `"2024-06-01 10:30 UTC"`. */
export function formatTimestampForDisplay(value: string | null): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		return "";
	}
	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}
	return `${parsedDate.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * Returns `"Play Value"`, `"Usability"`, or `"Both"` from a list of construct
 * identifiers, de-duplicating first.
 */
export function formatConstructLabel(constructs: readonly InstrumentQuestion["constructs"][number][]): string {
	const uniqueConstructs = Array.from(new Set(constructs));
	if (uniqueConstructs.length === 0) {
		return "";
	}
	if (uniqueConstructs.length > 1) {
		return "Both";
	}
	return uniqueConstructs[0] === "play_value" ? "Play Value" : "Usability";
}

/** Strips prompt markup from a domain string for use in plain-text columns. */
export function questionDomainFallback(value: string): string {
	return stripPromptMarkup(value).trim();
}

/** Joins the display labels of all domains on a question with `" | "`. */
export function formatQuestionDomainLabel(question: InstrumentQuestion): string {
	return question.domains.map(domain => questionDomainFallback(domain)).join(" | ");
}

// ── Scale / answer formatters ─────────────────────────────────────────────────

/**
 * Formats a `ScaleOption`'s addition + boost values into a compact display
 * string. When both values are equal, only one is shown.
 */
export function formatScaleScoreText(option: ScaleOption): string {
	const additionText = formatNumericCell(option.addition_value);
	const boostText = formatNumericCell(option.boost_value);
	return additionText === boostText ? additionText : `${additionText}, ${boostText}`;
}

/** Returns `"Label (score)"` or just `"Label"` when the score is empty. */
export function formatOptionScoreLabel(option: ScaleOption): string {
	const scoreText = formatScaleScoreText(option);
	const label = stripPromptMarkup(option.label);
	return scoreText.length === 0 ? label : `${label} (${scoreText})`;
}

/**
 * Resolves a raw answer key to its display label, including the score suffix.
 * Falls back to the raw key when the scale or option cannot be found.
 */
export function formatQuestionAnswer(
	question: InstrumentQuestion,
	scaleKey: QuestionScale["key"],
	answerKey: string | undefined
): string {
	if (typeof answerKey !== "string" || answerKey.trim().length === 0) {
		return "";
	}
	const scale = question.scales.find(s => s.key === scaleKey);
	if (scale === undefined) {
		return answerKey;
	}
	const option = scale.options.find(o => o.key === answerKey);
	if (option === undefined) {
		return answerKey;
	}
	return formatOptionScoreLabel(option);
}

/**
 * Formats a checklist question's response as a pipe-separated list of labels.
 * Appends any free-text "other" entry at the end.
 */
export function formatChecklistAnswer(question: InstrumentQuestion, answers: QuestionResponsePayload): string {
	const selectedKeys = answers["selected_option_keys"];
	if (!Array.isArray(selectedKeys) || selectedKeys.length === 0) {
		return "";
	}

	const labels: string[] = selectedKeys
		.filter((key): key is string => typeof key === "string")
		.map(key => {
			const option = question.options.find(o => o.key === key);
			return option?.label ?? key;
		});

	const otherDetails = answers["other_details"];
	if (typeof otherDetails === "object" && otherDetails !== null && !Array.isArray(otherDetails)) {
		const textValue = otherDetails["text"];
		if (typeof textValue === "string" && textValue.trim().length > 0) {
			labels.push(`Other: ${textValue.trim()}`);
		}
	}

	return labels.join(" | ");
}
