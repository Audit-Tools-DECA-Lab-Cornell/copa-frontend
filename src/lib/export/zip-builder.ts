/**
 * ZIP builder for bulk raw-data exports.
 *
 * Wraps JSZip with the conventions every bulk export shares:
 *   - path segments are slugified so the archive is filesystem-safe
 *   - duplicate file paths get a numeric suffix instead of silently overwriting
 *   - partial failures are recorded (not thrown) so one bad entity never aborts
 *     the whole archive
 *   - a `manifest.json` is written describing the export
 *   - progress is reported during the (potentially large) compression step
 */

import type JSZip from "jszip";

/** A failure encountered while generating one entity's files. */
export interface ExportFailure {
	/** Stable id of the entity that failed (audit id, place id, ...). */
	readonly id: string;
	/** What kind of artifact failed: "audit", "combined-report", "index", ... */
	readonly kind: string;
	/** Human-readable reason. */
	readonly reason: string;
}

/** Counts of each entity kind included in the archive, recorded in the manifest. */
export interface ExportEntityCounts {
	projects: number;
	places: number;
	audits: number;
	combinedReports: number;
}

/** The self-describing manifest written to the root of every export archive. */
export interface ExportManifest {
	readonly exportId: string;
	readonly generatedAt: string;
	readonly requestedByUserId: string | null;
	readonly requestedByRole: "admin" | "manager";
	readonly format: "xlsx" | "json";
	readonly deliveryMode: "immediate" | "background";
	readonly entityCounts: ExportEntityCounts;
	readonly filters: Record<string, unknown>;
	readonly partialFailures: readonly ExportFailure[];
}

/**
 * Slugifies a single path segment: lowercased, non-alphanumerics collapsed to
 * hyphens. Slashes are stripped so a caller can never escape the intended
 * folder. Empty results fall back to "item".
 */
export function slugifyPathSegment(value: string): string {
	// NFKD splits accented letters into base + combining mark; the [^a-z0-9]
	// collapse below then drops the marks, so "café" → "caf". Good enough for
	// archive-safe folder names without a diacritics-stripping regex.
	const slug = value
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug.length > 0 ? slug : "item";
}

function splitFileExtension(path: string): { stem: string; extension: string } {
	const slashIndex = path.lastIndexOf("/");
	const dotIndex = path.lastIndexOf(".");
	if (dotIndex <= slashIndex + 1) {
		return { stem: path, extension: "" };
	}
	return { stem: path.slice(0, dotIndex), extension: path.slice(dotIndex) };
}

/**
 * Slugifies a file name while preserving its extension, so "Report One.pdf"
 * becomes "report-one.pdf" rather than "report-one-pdf". The extension is
 * lowercased and stripped of non-alphanumerics; a name with no extension is
 * slugified as a plain segment.
 */
export function slugifyFileName(name: string): string {
	const { stem: rawStem, extension: rawExtension } = splitFileExtension(name);
	if (rawExtension.length === 0) {
		return slugifyPathSegment(name);
	}
	const stem = slugifyPathSegment(rawStem);
	const extension = rawExtension
		.slice(1)
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
	return extension.length > 0 ? `${stem}.${extension}` : stem;
}

/**
 * Slugifies each segment of a "/"-separated path. Directory segments become
 * plain slugs; the final segment is treated as a file name so its extension
 * survives.
 */
export function slugifyPath(path: string): string {
	const segments = path.split("/").filter(segment => segment.length > 0);
	return segments
		.map((segment, index) =>
			index === segments.length - 1 ? slugifyFileName(segment) : slugifyPathSegment(segment)
		)
		.join("/");
}

export class ExportZipBuilder {
	private readonly zip: JSZip;
	private readonly usedPaths = new Set<string>();
	private readonly failures: ExportFailure[] = [];

	private constructor(zip: JSZip) {
		this.zip = zip;
	}

	/**
	 * Creates a builder, importing `jszip` (98 KB) on demand so it stays out of
	 * the initial bundle - it only loads when an export actually runs.
	 */
	static async create(): Promise<ExportZipBuilder> {
		const { default: JSZip } = await import("jszip");
		return new ExportZipBuilder(new JSZip());
	}

	/**
	 * Adds a file at the given (slugified) path. If the path is already taken,
	 * a `-2`, `-3`, ... suffix is appended before the extension. Returns the
	 * final path actually used. Accepts any byte container JSZip supports;
	 * generators pass a `Blob`.
	 */
	addFile(path: string, data: Blob | ArrayBuffer | Uint8Array | string): string {
		const finalPath = this.dedupePath(slugifyPath(path));
		this.zip.file(finalPath, data);
		return finalPath;
	}

	/** Adds a JSON file, serializing `data` with two-space indentation. */
	addJson(path: string, data: unknown): string {
		return this.addFile(path, JSON.stringify(data, null, 2));
	}

	/** Records a partial failure without aborting the archive. */
	recordFailure(failure: ExportFailure): void {
		this.failures.push(failure);
	}

	/** The failures recorded so far (a live view; copy if you need a snapshot). */
	get partialFailures(): readonly ExportFailure[] {
		return this.failures;
	}

	/**
	 * Writes `manifest.json` at the archive root. Partial failures recorded so
	 * far are merged into the manifest, so call this last.
	 */
	addManifest(manifest: Omit<ExportManifest, "partialFailures">): void {
		const full: ExportManifest = { ...manifest, partialFailures: [...this.failures] };
		this.addJson("manifest.json", full);
	}

	/**
	 * Compresses the archive into a single Blob. `onProgress` receives a 0–100
	 * percentage during compression.
	 */
	async generate(onProgress?: (percent: number) => void): Promise<Blob> {
		return this.zip.generateAsync({ type: "blob", compression: "DEFLATE" }, metadata => {
			onProgress?.(metadata.percent);
		});
	}

	private dedupePath(path: string): string {
		if (!this.usedPaths.has(path)) {
			this.usedPaths.add(path);
			return path;
		}

		const { stem, extension } = splitFileExtension(path);

		let suffix = 2;
		let candidate = `${stem}-${suffix}${extension}`;
		while (this.usedPaths.has(candidate)) {
			suffix += 1;
			candidate = `${stem}-${suffix}${extension}`;
		}
		this.usedPaths.add(candidate);
		return candidate;
	}
}
