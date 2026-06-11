import type { AuditScores, AuditScoreTotals, AuditScoreVariantBuckets, ExecutionMode } from "@/types/audit";

export type ScoreVariantKey = "canonical" | "unsure_as_zero" | "unsure_as_max";

function selectScoreBuckets(scores: AuditScores, variant: ScoreVariantKey): AuditScores | AuditScoreVariantBuckets {
	if (variant === "unsure_as_zero") {
		return scores.unsure_variants?.unsure_as_zero ?? scores;
	}
	if (variant === "unsure_as_max") {
		return scores.unsure_variants?.unsure_as_max ?? scores;
	}
	return scores;
}

/**
 * Returns the score totals that correspond to what the auditor actually completed.
 * For audit-only sessions use the `audit` scores; for survey-only use `survey`;
 * for combined ("both") or unknown fall back to `overall`.
 */
export function getEffectiveScoreTotals(
	scores: AuditScores,
	variant: ScoreVariantKey = "canonical"
): AuditScoreTotals | null {
	const selected = selectScoreBuckets(scores, variant);
	if (selected.execution_mode === "audit") {
		return selected.audit ?? null;
	}
	if (selected.execution_mode === "survey") {
		return selected.survey ?? null;
	}
	return selected.overall ?? null;
}

export function getScoreVariantBuckets(
	scores: AuditScores,
	variant: ScoreVariantKey = "canonical"
): AuditScores | AuditScoreVariantBuckets {
	return selectScoreBuckets(scores, variant);
}

export function hasUnsureVariants(scores: AuditScores): boolean {
	return scores.unsure_answer_count > 0 && scores.unsure_variants !== null;
}

/** Human-readable labels for each execution mode value. */
const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
	audit: "Place Audit",
	survey: "Place Survey",
	both: "Full Assessment"
};

export function getExecutionModeLabel(mode: ExecutionMode | null | undefined): string {
	if (mode === null || mode === undefined) {
		return "-";
	}
	return EXECUTION_MODE_LABELS[mode] ?? "-";
}
