import assert from "node:assert/strict";
import test from "node:test";

import JSZip from "jszip";

import { ExportZipBuilder, slugifyPath, slugifyFileName, slugifyPathSegment } from "@/lib/export/zip-builder";
import { estimateRawDataExport, IMMEDIATE_EXPORT_MAX_RICH_ENTITIES } from "@/lib/export/export-estimator";

/**
 * Archive paths must be filesystem-safe: lowercased, non-alphanumerics collapsed
 * to hyphens, and never empty so a folder always has a usable name.
 */
test("slugifyPathSegment makes archive-safe segment names", () => {
	assert.equal(slugifyPathSegment("The Morton Arboretum"), "the-morton-arboretum");
	assert.equal(slugifyPathSegment("Café & Bar!"), "cafe-bar");
	assert.equal(slugifyPathSegment("   "), "item");
	assert.equal(slugifyPathSegment("AUD-TM-2024"), "aud-tm-2024");
});

/** Each path segment is slugified independently so the folder structure is preserved. */
test("slugifyPath slugifies each segment and keeps the tree", () => {
	assert.equal(slugifyPath("Project A/Place B/audits"), "project-a/place-b/audits");
	// Leading/empty segments are dropped rather than producing "//".
	assert.equal(slugifyPath("/Project A//Place B/"), "project-a/place-b");
});

/**
 * Two files written to the same path must not overwrite each other; the second
 * gets a numeric suffix inserted before the extension.
 */
test("ExportZipBuilder de-duplicates colliding file paths and preserves extensions", () => {
	const zip = new ExportZipBuilder();
	// Byte content (Uint8Array) keeps this deterministic under the Node test
	// runner; production passes Blobs from the generators.
	const first = zip.addFile("audits/Report One.pdf", new Uint8Array([1]));
	const second = zip.addFile("audits/Report One.pdf", new Uint8Array([2]));
	const third = zip.addFile("audits/Report One.pdf", new Uint8Array([3]));

	assert.equal(first, "audits/report-one.pdf");
	assert.equal(second, "audits/report-one-2.pdf");
	assert.equal(third, "audits/report-one-3.pdf");
});

/** Directory segments are slugged; the final segment keeps its file extension. */
test("slugifyPath preserves the file extension on the last segment", () => {
	assert.equal(slugifyPath("Project A/Place B/pvua-AUD-001.PDF"), "project-a/place-b/pvua-aud-001.pdf");
	assert.equal(slugifyPath("index.xlsx"), "index.xlsx");
});

test("slugifyFileName preserves common generated export extensions", () => {
	assert.equal(slugifyFileName("manifest.json"), "manifest.json");
	assert.equal(slugifyFileName("index.xlsx"), "index.xlsx");
	assert.equal(slugifyFileName("pvua-AUD-001.pdf"), "pvua-aud-001.pdf");
});

test("ExportZipBuilder writes archive entries with dot extensions", async () => {
	const zip = new ExportZipBuilder();
	zip.addJson("manifest.json", { ok: true });
	zip.addFile("index.xlsx", new Uint8Array([1]));
	zip.addFile("audits/pvua-AUD-001.pdf", new Uint8Array([2]));

	const archiveBlob = await zip.generate();
	const archive = await JSZip.loadAsync(await archiveBlob.arrayBuffer());
	const entries = Object.values(archive.files)
		.filter(entry => !entry.dir)
		.map(entry => entry.name)
		.sort();
	assert.deepEqual(entries, ["audits/pvua-aud-001.pdf", "index.xlsx", "manifest.json"]);
	assert.equal(
		entries.some(entry => entry.endsWith("-json") || entry.endsWith("-xlsx") || entry.endsWith("-pdf")),
		false
	);
});

/** Partial failures are recorded, never thrown, so one bad entity can't abort the archive. */
test("ExportZipBuilder records partial failures", () => {
	const zip = new ExportZipBuilder();
	assert.equal(zip.partialFailures.length, 0);
	zip.recordFailure({ id: "aud-1", kind: "audit", reason: "not submitted" });
	assert.equal(zip.partialFailures.length, 1);
	assert.equal(zip.partialFailures[0]?.id, "aud-1");
});

/**
 * The estimator routes small exports to the immediate browser path and large
 * ones to the (emailed) background-notice path.
 */
test("estimateRawDataExport stays immediate at and below the entity threshold", () => {
	const atThreshold = estimateRawDataExport(IMMEDIATE_EXPORT_MAX_RICH_ENTITIES);
	assert.equal(atThreshold.requiresBackground, false);
	assert.equal(atThreshold.reason, undefined);
	assert.equal(atThreshold.generatedFileCount, IMMEDIATE_EXPORT_MAX_RICH_ENTITIES * 2);
});

test("estimateRawDataExport flags large exports as background with a reason", () => {
	const overByCount = estimateRawDataExport(IMMEDIATE_EXPORT_MAX_RICH_ENTITIES + 1);
	assert.equal(overByCount.requiresBackground, true);
	assert.equal(overByCount.reason, "entity-count");
});
