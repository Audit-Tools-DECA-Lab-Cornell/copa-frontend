/**
 * Export size estimation.
 *
 * Bulk exports run in the browser today (immediate path). Past a threshold the
 * PDF generation and ZIP compression get heavy enough to risk a slow or
 * unresponsive tab, so the estimator flags when an export should instead be
 * handed to the (Phase 3) background job + emailed-link path. Until that path
 * ships, the dialog uses `requiresBackground` to warn the user that a large
 * export may take a while.
 */

/** Thresholds above which an export should move to the background path. */
export const IMMEDIATE_EXPORT_MAX_RICH_ENTITIES = 25;
export const IMMEDIATE_EXPORT_MAX_GENERATED_FILES = 60;
export const IMMEDIATE_EXPORT_MAX_ESTIMATED_BYTES = 100 * 1024 * 1024;

/** Rough per-entity output budget: one PDF + one data file. */
const ESTIMATED_BYTES_PER_RICH_ENTITY = 1.5 * 1024 * 1024;
const FILES_PER_RICH_ENTITY = 2;

export interface ExportEstimate {
	readonly richEntityCount: number;
	readonly generatedFileCount: number;
	readonly estimatedBytes: number;
	readonly requiresBackground: boolean;
	readonly reason?: string;
}

/**
 * Estimates the cost of an export from its rich-entity count. A "rich entity" is
 * anything that generates a PDF + data file (a submitted audit or a combined
 * report).
 */
export function estimateRawDataExport(richEntityCount: number): ExportEstimate {
	const generatedFileCount = richEntityCount * FILES_PER_RICH_ENTITY;
	const estimatedBytes = richEntityCount * ESTIMATED_BYTES_PER_RICH_ENTITY;

	let reason: string | undefined;
	if (richEntityCount > IMMEDIATE_EXPORT_MAX_RICH_ENTITIES) {
		reason = "entity-count";
	} else if (generatedFileCount > IMMEDIATE_EXPORT_MAX_GENERATED_FILES) {
		reason = "file-count";
	} else if (estimatedBytes > IMMEDIATE_EXPORT_MAX_ESTIMATED_BYTES) {
		reason = "size";
	}

	return {
		richEntityCount,
		generatedFileCount,
		estimatedBytes,
		requiresBackground: reason !== undefined,
		reason
	};
}
