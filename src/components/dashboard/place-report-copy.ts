import type { SavedPlaceReportEntry } from "@/lib/api/playspace";

export type PlaceReportKind = SavedPlaceReportEntry["report_type"];

export interface PlaceReportCopy {
	title: string;
	description: string;
	reportTypeValue: string;
	reportTypeHelper: string;
	sourceCountHelper: string;
	savedCardDescription: string;
}

const PLACE_REPORT_COPY_BY_KIND: Record<PlaceReportKind, PlaceReportCopy> = {
	combined: {
		title: "Combined Place Report",
		description: "This place-level report merges one Place Audit and one Place Survey into a single combined view.",
		reportTypeValue: "Combined",
		reportTypeHelper: "Built from one Place Audit and one Place Survey.",
		sourceCountHelper: "Two linked source submissions remain available below for review.",
		savedCardDescription: "Built from one Place Audit and one Place Survey."
	},
	full_assessment: {
		title: "Full Assessment Report",
		description: "This place-level report uses one submitted Full Assessment as the complete source record.",
		reportTypeValue: "Full Assessment",
		reportTypeHelper: "Built from one Full Assessment submission.",
		sourceCountHelper: "One linked source submission remains available below for review.",
		savedCardDescription: "Built from one Full Assessment submission."
	}
};

/**
 * Resolve the shared UI copy for the supported place-report variants.
 */
export function getPlaceReportCopy(kind: PlaceReportKind): PlaceReportCopy {
	return PLACE_REPORT_COPY_BY_KIND[kind];
}

/**
 * Count how many source submissions contribute to the place report.
 */
export function getPlaceReportSourceCount(kind: PlaceReportKind): number {
	return kind === "combined" ? 2 : 1;
}

/**
 * Render a short source-count label that works in badges and summaries.
 */
export function getPlaceReportSourceCountLabel(kind: PlaceReportKind): string {
	const sourceCount = getPlaceReportSourceCount(kind);
	const noun = sourceCount === 1 ? "submission" : "submissions";
	return `${sourceCount} source ${noun}`;
}
