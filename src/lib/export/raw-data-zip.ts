/**
 * Raw-data ZIP orchestration.
 *
 * Turns a scoped selection of audits / reports / places / projects into a single
 * downloadable ZIP. Every bulk export is a ZIP (even one entity), always
 * contains a `manifest.json` and a relational `index` file, and writes a PDF +
 * the chosen data file (XLSX or JSON) for each rich entity using the exact
 * single-audit export generators.
 *
 * Folder layout (project export, Excel chosen):
 *
 *   manifest.json
 *   index.xlsx
 *   <project>/<place>/index.xlsx
 *   <project>/<place>/audits/pvua-<code>.pdf
 *   <project>/<place>/audits/pvua-<code>.xlsx
 *   <project>/<place>/reports/combined/<name>.pdf
 *   <project>/<place>/reports/combined/<name>.xlsx
 *
 * Submitted audits live once, under `audits/` - an individual "report" is the
 * same submitted-audit entity, so it is never duplicated. Only genuinely
 * distinct combined place reports go under `reports/combined/`.
 */

import { mergeAuditSessions } from "@/components/dashboard/place-report-merge";
import { type AuditSession, playspaceApi, type SavedPlaceReportEntry } from "@/lib/api/playspace";

import type { AuditExportDataFormat } from "./audit";
import { buildEntityFiles } from "./audit-batch";
import { type RichAuditSource, toExportableAudit } from "./rich-audit-source";
import { type ExportEntityCounts, ExportZipBuilder } from "./zip-builder";

// ── Inputs ──────────────────────────────────────────────────────────────────

/** The audit fields the orchestrators read. Both admin and manager records satisfy this. */
export interface AuditExportRow {
	readonly audit_id: string;
	readonly audit_code: string;
	readonly status: string;
	readonly place_id: string;
	readonly place_name: string;
	readonly project_id: string;
	readonly project_name: string;
}

/** Minimal place identity used to build the folder tree and per-place index. */
export interface PlaceExportRow {
	readonly place_id: string;
	readonly place_name: string;
	readonly project_id: string;
	readonly project_name: string;
}

export interface ProjectExportRow {
	readonly project_id: string;
	readonly project_name: string;
}

/** A named flat table written into an index file. */
export interface IndexSheet {
	readonly sheetName: string;
	readonly records: Record<string, unknown>[];
}

export type ExportProgressPhase = "preparing" | "generating" | "compressing" | "done";

export interface ExportProgress {
	readonly phase: ExportProgressPhase;
	readonly current: number;
	readonly total: number;
	readonly percent: number;
}

/** The compressed archive plus the counts needed for the completion notice. */
export interface ExportZipResult {
	readonly blob: Blob;
	readonly auditCount: number;
	readonly combinedReportCount: number;
	readonly failureCount: number;
}

/** Shared context for every orchestrator. */
export interface RawDataZipContext {
	readonly role: "admin" | "manager";
	readonly userId: string | null;
	readonly format: AuditExportDataFormat;
	readonly filters: Record<string, unknown>;
	readonly source: RichAuditSource;
	/** Resolves the saved place reports for a place (for combined-report generation). */
	readonly fetchSavedPlaceReports: (placeId: string, projectId: string) => Promise<readonly SavedPlaceReportEntry[]>;
	readonly fileBaseName: string;
	readonly onProgress?: (progress: ExportProgress) => void;
}

/** Default saved-place-reports resolver backed by the place history endpoint. */
export async function fetchSavedPlaceReportsViaHistory(
	placeId: string,
	projectId: string
): Promise<readonly SavedPlaceReportEntry[]> {
	const history = await playspaceApi.places.history(placeId, projectId);
	return history.saved_place_reports ?? [];
}

// ── Index file blobs ──────────────────────────────────────────────────────────

function dataExtension(): string {
	return "xlsx";
}

/** Builds a multi-sheet XLSX index file blob. `xlsx` (107 KB) is imported on
 * demand so it stays out of the initial bundle - it only loads when an export
 * actually runs. */
async function buildIndexBlob(sheets: readonly IndexSheet[]): Promise<Blob> {
	const XLSX = await import("xlsx");
	const workbook = XLSX.utils.book_new();
	const used = new Set<string>();
	for (const sheet of sheets) {
		let name = sheet.sheetName.slice(0, 31) || "Sheet";
		let suffix = 1;
		while (used.has(name)) {
			const tail = `_${suffix}`;
			name = `${sheet.sheetName.slice(0, 31 - tail.length)}${tail}`;
			suffix += 1;
		}
		used.add(name);
		const worksheet = XLSX.utils.json_to_sheet(sheet.records);
		XLSX.utils.book_append_sheet(workbook, worksheet, name);
	}
	const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
	return new Blob([output], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	});
}

// ── Rich-entity generation ──────────────────────────────────────────────────

/**
 * Generates the PDF + data files for every submitted audit in `rows`, writing
 * them into `<folderPrefix>/audits/`. Non-submitted audits are recorded as
 * partial failures (they cannot be exported). Returns the number of audits
 * actually written.
 */
async function writeAuditFiles(
	zip: ExportZipBuilder,
	rows: readonly AuditExportRow[],
	folderPrefix: string,
	ctx: RawDataZipContext,
	exportedAt: string,
	progress: { done: number; total: number }
): Promise<number> {
	let written = 0;
	for (const row of rows) {
		if (row.status !== "SUBMITTED") {
			zip.recordFailure({
				id: row.audit_id,
				kind: "audit",
				reason: `Audit ${row.audit_code} is ${row.status.toLowerCase()} and cannot be exported.`
			});
			continue;
		}
		try {
			const rich = await ctx.source.fetchAudit(row.audit_id);
			const result = await buildEntityFiles(
				row.audit_id,
				rich.exportable,
				rich.instrument,
				ctx.format,
				exportedAt
			);
			for (const file of result.files) {
				zip.addFile(`${folderPrefix}audits/${file.filename}`, file.blob);
			}
			written += 1;
		} catch (error) {
			zip.recordFailure({
				id: row.audit_id,
				kind: "audit",
				reason: error instanceof Error ? error.message : "Failed to generate audit files."
			});
		} finally {
			progress.done += 1;
			ctx.onProgress?.({
				phase: "generating",
				current: progress.done,
				total: progress.total,
				percent: progress.total > 0 ? (progress.done / progress.total) * 100 : 100
			});
		}
	}
	return written;
}

/**
 * Generates combined place reports for a place into
 * `<folderPrefix>reports/combined/`. Reads the place's saved combined reports,
 * fetches the audit + survey sessions, merges them with the same logic the
 * report page uses, and writes a PDF + data file per combined report.
 */
async function writeCombinedReports(
	zip: ExportZipBuilder,
	placeRow: PlaceExportRow,
	folderPrefix: string,
	ctx: RawDataZipContext,
	exportedAt: string
): Promise<number> {
	let written = 0;
	let saved: readonly SavedPlaceReportEntry[];
	try {
		saved = await ctx.fetchSavedPlaceReports(placeRow.place_id, placeRow.project_id);
	} catch (error) {
		zip.recordFailure({
			id: placeRow.place_id,
			kind: "combined-report",
			reason: error instanceof Error ? error.message : "Failed to load place reports."
		});
		return 0;
	}

	const combined = saved.filter(entry => entry.report_type === "combined");
	const combinedPrefix = `${folderPrefix}reports/combined/`;

	for (let index = 0; index < combined.length; index += 1) {
		const entry = combined[index]!;
		if (entry.audit_id === null || entry.survey_id === null) {
			continue;
		}
		try {
			const [auditSession, surveySession] = await Promise.all([
				ctx.source.fetchSession(entry.audit_id),
				ctx.source.fetchSession(entry.survey_id)
			]);
			const mergedSession: AuditSession = mergeAuditSessions(auditSession, surveySession);
			const instrument = await ctx.source.resolveInstrument(mergedSession);
			const result = await buildEntityFiles(
				`${placeRow.place_id}-combined-${index}`,
				toExportableAudit(mergedSession),
				instrument,
				ctx.format,
				exportedAt
			);
			for (const file of result.files) {
				zip.addFile(`${combinedPrefix}${file.filename}`, file.blob);
			}
			written += 1;
		} catch (error) {
			zip.recordFailure({
				id: `${placeRow.place_id}-combined-${index}`,
				kind: "combined-report",
				reason: error instanceof Error ? error.message : "Failed to generate combined report."
			});
		}
	}
	return written;
}

function placeFolderPrefix(place: PlaceExportRow, withProject: boolean): string {
	return withProject ? `${place.project_name}/${place.place_name}/` : `${place.place_name}/`;
}

// ── Public orchestrators ──────────────────────────────────────────────────────

/**
 * Audits / Reports export: a flat archive of every selected submitted audit's
 * PDF + data file under `audits/`, plus a root index and manifest. "Reports" and
 * "audits" share this path because an individual report is the same entity.
 */
export async function exportAuditsZip(args: {
	rows: readonly AuditExportRow[];
	indexSheets: readonly IndexSheet[];
	entityLabel: "audits" | "reports";
	ctx: RawDataZipContext;
}): Promise<ExportZipResult> {
	const { rows, indexSheets, ctx } = args;
	const exportedAt = new Date().toISOString();
	const zip = await ExportZipBuilder.create();
	const submittedCount = rows.filter(r => r.status === "SUBMITTED").length;

	ctx.onProgress?.({ phase: "preparing", current: 0, total: submittedCount, percent: 0 });

	const progress = { done: 0, total: submittedCount };
	const auditsWritten = await writeAuditFiles(zip, rows, "", ctx, exportedAt, progress);

	zip.addFile(`index.${dataExtension()}`, await buildIndexBlob(indexSheets));

	finalizeManifest(zip, ctx, exportedAt, { projects: 0, places: 0, audits: auditsWritten, combinedReports: 0 });
	return compress(zip, ctx, { auditCount: auditsWritten, combinedReportCount: 0 });
}

/**
 * Places export: one folder per place with its own index, an `audits/` folder of
 * rich files, and `reports/combined/` for saved combined reports.
 */
export async function exportPlacesZip(args: {
	places: readonly PlaceExportRow[];
	audits: readonly AuditExportRow[];
	indexSheets: readonly IndexSheet[];
	ctx: RawDataZipContext;
}): Promise<ExportZipResult> {
	return exportPlaceTree({ ...args, withProjectLevel: false });
}

/**
 * Projects export: the place tree nested one level deeper under each project,
 * mirroring the relational hierarchy.
 */
export async function exportProjectsZip(args: {
	projects: readonly ProjectExportRow[];
	places: readonly PlaceExportRow[];
	audits: readonly AuditExportRow[];
	indexSheets: readonly IndexSheet[];
	ctx: RawDataZipContext;
}): Promise<ExportZipResult> {
	return exportPlaceTree({
		places: args.places,
		audits: args.audits,
		indexSheets: args.indexSheets,
		ctx: args.ctx,
		withProjectLevel: true,
		projectCount: args.projects.length
	});
}

async function exportPlaceTree(args: {
	places: readonly PlaceExportRow[];
	audits: readonly AuditExportRow[];
	indexSheets: readonly IndexSheet[];
	ctx: RawDataZipContext;
	withProjectLevel: boolean;
	projectCount?: number;
}): Promise<ExportZipResult> {
	const { places, audits, indexSheets, ctx, withProjectLevel } = args;
	const exportedAt = new Date().toISOString();
	const zip = await ExportZipBuilder.create();

	const auditsByPlace = new Map<string, AuditExportRow[]>();
	for (const audit of audits) {
		const list = auditsByPlace.get(audit.place_id) ?? [];
		list.push(audit);
		auditsByPlace.set(audit.place_id, list);
	}

	const submittedTotal = audits.filter(a => a.status === "SUBMITTED").length;
	ctx.onProgress?.({ phase: "preparing", current: 0, total: submittedTotal, percent: 0 });

	const progress = { done: 0, total: submittedTotal };
	let auditsWritten = 0;
	let combinedWritten = 0;

	for (const place of places) {
		const folderPrefix = placeFolderPrefix(place, withProjectLevel);
		const placeAudits = auditsByPlace.get(place.place_id) ?? [];

		auditsWritten += await writeAuditFiles(zip, placeAudits, folderPrefix, ctx, exportedAt, progress);
		combinedWritten += await writeCombinedReports(zip, place, folderPrefix, ctx, exportedAt);

		// Per-place index listing this place's audits.
		zip.addFile(
			`${folderPrefix}index.${dataExtension()}`,
			await buildIndexBlob([{ sheetName: "Audits", records: placeAudits.map(rowToRecord) }])
		);
	}

	zip.addFile(`index.${dataExtension()}`, await buildIndexBlob(indexSheets));

	finalizeManifest(zip, ctx, exportedAt, {
		projects: args.projectCount ?? 0,
		places: places.length,
		audits: auditsWritten,
		combinedReports: combinedWritten
	});
	return compress(zip, ctx, { auditCount: auditsWritten, combinedReportCount: combinedWritten });
}

// ── Shared finalization ────────────────────────────────────────────────────

function rowToRecord(row: AuditExportRow): Record<string, unknown> {
	return { ...row };
}

function finalizeManifest(
	zip: ExportZipBuilder,
	ctx: RawDataZipContext,
	exportedAt: string,
	entityCounts: ExportEntityCounts
): void {
	zip.addManifest({
		exportId: `${ctx.fileBaseName}-${exportedAt}`,
		generatedAt: exportedAt,
		requestedByUserId: ctx.userId,
		requestedByRole: ctx.role,
		format: ctx.format,
		deliveryMode: "immediate",
		entityCounts,
		filters: ctx.filters
	});
}

async function compress(
	zip: ExportZipBuilder,
	ctx: RawDataZipContext,
	counts: { auditCount: number; combinedReportCount: number }
): Promise<ExportZipResult> {
	const blob = await zip.generate(percent => {
		ctx.onProgress?.({ phase: "compressing", current: 0, total: 0, percent });
	});
	ctx.onProgress?.({ phase: "done", current: 0, total: 0, percent: 100 });
	return {
		blob,
		auditCount: counts.auditCount,
		combinedReportCount: counts.combinedReportCount,
		failureCount: zip.partialFailures.length
	};
}
