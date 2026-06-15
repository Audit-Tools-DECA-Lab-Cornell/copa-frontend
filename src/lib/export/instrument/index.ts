/**
 * Instrument export - public surface.
 *
 * All format-specific logic lives in dedicated modules:
 *   - instrument-shared.ts  - types, palettes, flatten, helpers
 *   - instrument-pdf.ts     - jsPDF / jspdf-autotable PDF generation
 *   - instrument-excel.ts   - xlsx XLSX / CSV generation
 *
 * Consumers should import from this file; the split is an internal concern.
 */

export type { ExportFormat, InstrumentContent } from "./instrument-shared";
export { formatLabel } from "./instrument-shared";

import { downloadInstrumentCsv, downloadInstrumentXlsx } from "./instrument-excel";
import { downloadInstrumentPdf } from "./instrument-pdf";
import type { ExportFormat, InstrumentContent } from "./instrument-shared";
import { downloadBlob, flattenInstrument } from "./instrument-shared";

/**
 * Exports the instrument in the requested format and triggers a browser
 * download. Resolves once the download has been initiated.
 *
 * @param content  - The full instrument content keyed by language code.
 * @param version  - Instrument version string included in the filename.
 * @param format   - One of `"pdf"`, `"xlsx"`, `"csv"`, or `"json"`.
 * @param lang     - Language code used to select the correct instrument locale (default `"en"`).
 */
export async function exportInstrument(
	content: InstrumentContent,
	version: string,
	format: ExportFormat,
	lang: string = "en"
): Promise<void> {
	const instrument = content[lang];
	if (!instrument) return;

	const fileName = `instrument-v${version}-${lang}`;

	if (format === "json") {
		const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
		downloadBlob(blob, `${fileName}.json`);
		return;
	}

	const flatRows = flattenInstrument(instrument);

	if (format === "csv") {
		await downloadInstrumentCsv(flatRows, fileName);
		return;
	}

	if (format === "xlsx") {
		await downloadInstrumentXlsx(flatRows, fileName);
		return;
	}

	if (format === "pdf") {
		await downloadInstrumentPdf(flatRows, fileName, version, lang);
	}
}
