import type { AuditSession, ScoreTotals } from "@/lib/api/playspace-types";
import type { AuditScoreVariantBuckets, AuditScores } from "@/types/audit";
import type { CombinedReportSources } from "@/lib/audit/report-source-sessions";

/**
 * Add two score-total objects together field by field.
 */
function addScoreTotals(a: ScoreTotals, b: ScoreTotals): ScoreTotals {
	return {
		provision_total: a.provision_total + b.provision_total,
		provision_total_max: a.provision_total_max + b.provision_total_max,
		variety_total: a.variety_total + b.variety_total,
		variety_total_max: a.variety_total_max + b.variety_total_max,
		challenge_total: a.challenge_total + b.challenge_total,
		challenge_total_max: a.challenge_total_max + b.challenge_total_max,
		sociability_total: a.sociability_total + b.sociability_total,
		sociability_total_max: a.sociability_total_max + b.sociability_total_max,
		play_value_total: a.play_value_total + b.play_value_total,
		play_value_total_max: a.play_value_total_max + b.play_value_total_max,
		usability_total: a.usability_total + b.usability_total,
		usability_total_max: a.usability_total_max + b.usability_total_max
	};
}

function mergeVariantBuckets(
	auditVariant: AuditScoreVariantBuckets | null | undefined,
	surveyVariant: AuditScoreVariantBuckets | null | undefined
): AuditScoreVariantBuckets | null {
	if (auditVariant === null || auditVariant === undefined || surveyVariant === null || surveyVariant === undefined) {
		return null;
	}

	const auditTotals = auditVariant.audit ?? auditVariant.overall;
	const surveyTotals = surveyVariant.survey ?? surveyVariant.overall;
	const combinedOverall =
		auditTotals !== null && surveyTotals !== null
			? addScoreTotals(auditTotals, surveyTotals)
			: (auditTotals ?? surveyTotals ?? null);

	const mergedByDomain: Record<string, ScoreTotals> = { ...surveyVariant.by_domain };
	for (const [key, totals] of Object.entries(auditVariant.by_domain)) {
		const existing = mergedByDomain[key];
		mergedByDomain[key] = existing !== undefined ? addScoreTotals(existing, totals) : totals;
	}

	const mergedBySection: Record<string, ScoreTotals> = { ...surveyVariant.by_section };
	for (const [key, totals] of Object.entries(auditVariant.by_section)) {
		const existing = mergedBySection[key];
		mergedBySection[key] = existing !== undefined ? addScoreTotals(existing, totals) : totals;
	}

	return {
		execution_mode: "both",
		audit: auditTotals,
		survey: surveyTotals,
		overall: combinedOverall,
		by_domain: mergedByDomain,
		by_section: mergedBySection
	};
}

function mergeUnsureVariants(auditScores: AuditScores, surveyScores: AuditScores): AuditScores["unsure_variants"] {
	const zero = mergeVariantBuckets(
		auditScores.unsure_variants?.unsure_as_zero,
		surveyScores.unsure_variants?.unsure_as_zero
	);
	const max = mergeVariantBuckets(
		auditScores.unsure_variants?.unsure_as_max,
		surveyScores.unsure_variants?.unsure_as_max
	);
	if (zero === null && max === null) {
		return null;
	}
	return {
		unsure_as_zero: zero,
		unsure_as_max: max
	};
}

/**
 * Merge two submitted sessions into one synthetic combined report session.
 */
export function mergeAuditSessions(auditSession: AuditSession, surveySession: AuditSession): AuditSession {
	const allSectionKeys = new Set([
		...Object.keys(surveySession.aggregate.sections),
		...Object.keys(auditSession.aggregate.sections)
	]);
	const mergedSections: typeof auditSession.aggregate.sections = {};
	for (const sectionKey of allSectionKeys) {
		const surveySection = surveySession.aggregate.sections[sectionKey];
		const auditSection = auditSession.aggregate.sections[sectionKey];
		if (surveySection === undefined) {
			mergedSections[sectionKey] = auditSection!;
		} else if (auditSection === undefined) {
			mergedSections[sectionKey] = surveySection;
		} else {
			mergedSections[sectionKey] = {
				...auditSection,
				responses: { ...surveySection.responses, ...auditSection.responses }
			};
		}
	}

	const mergedByDomain: Record<string, ScoreTotals> = { ...surveySession.scores.by_domain };
	for (const [key, totals] of Object.entries(auditSession.scores.by_domain)) {
		const existing = mergedByDomain[key];
		mergedByDomain[key] = existing !== undefined ? addScoreTotals(existing, totals) : totals;
	}

	const mergedBySection: Record<string, ScoreTotals> = { ...surveySession.scores.by_section };
	for (const [key, totals] of Object.entries(auditSession.scores.by_section)) {
		const existing = mergedBySection[key];
		mergedBySection[key] = existing !== undefined ? addScoreTotals(existing, totals) : totals;
	}

	const auditTotals = auditSession.scores.audit ?? auditSession.scores.overall;
	const surveyTotals = surveySession.scores.survey ?? surveySession.scores.overall;
	const combinedOverall =
		auditTotals !== null && surveyTotals !== null
			? addScoreTotals(auditTotals, surveyTotals)
			: (auditTotals ?? surveyTotals ?? null);

	const mergedSession: AuditSession & { readonly report_sources: CombinedReportSources } = {
		...auditSession,
		selected_execution_mode: "both",
		meta: { ...auditSession.meta, execution_mode: "both" },
		aggregate: {
			...auditSession.aggregate,
			meta: { execution_mode: "both", final_comments: null },
			sections: mergedSections
		},
		sections: mergedSections,
		scores: {
			...auditSession.scores,
			execution_mode: "both",
			audit: auditTotals,
			survey: surveyTotals,
			overall: combinedOverall,
			by_domain: mergedByDomain,
			by_section: mergedBySection,
			unsure_answer_count: auditSession.scores.unsure_answer_count + surveySession.scores.unsure_answer_count,
			unsure_variants: mergeUnsureVariants(auditSession.scores, surveySession.scores)
		},
		status: "SUBMITTED",
		report_sources: {
			audit: auditSession,
			survey: surveySession
		}
	};

	return mergedSession;
}
