import type { AuditScores, ExecutionMode, ScoreTotals } from "@/lib/api/playspace-types";

/**
 * Returns the score totals that correspond to what the auditor actually completed.
 * For audit-only sessions use the `audit` scores; for survey-only use `survey`;
 * for combined ("both") or unknown fall back to `overall`.
 *
 * @param scores The full audit scores object from an AuditSession.
 * @returns Mode-appropriate score totals, or null if unavailable.
 */
export function getEffectiveScoreTotals(scores: AuditScores): ScoreTotals | null {
	if (scores.execution_mode === "audit") {
		return scores.audit ?? null;
	}
	if (scores.execution_mode === "survey") {
		return scores.survey ?? null;
	}
	return scores.overall ?? null;
}

/** Human-readable labels for each execution mode value. */
const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
	audit: "Place Audit",
	survey: "Place Survey",
	both: "Full Assessment"
};

/**
 * Returns a human-readable label for the audit execution mode.
 *
 * @param mode Execution mode value from the audit row or scores object.
 * @returns Localised label string, or em-dash for null/unknown.
 */
export function getExecutionModeLabel(mode: ExecutionMode | null | undefined): string {
	if (mode === null || mode === undefined) {
		return "-";
	}
	return EXECUTION_MODE_LABELS[mode] ?? "-";
}
