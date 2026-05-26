export interface AuditorNameLookupEntry {
	auditorCode: string;
	fullName: string | null | undefined;
}

/**
 * Normalize an optional auditor name into a usable display label.
 */
function normalizeAuditorName(fullName: string | null | undefined): string | null {
	if (typeof fullName !== "string") {
		return null;
	}

	const normalizedName = fullName.trim();
	return normalizedName.length > 0 ? normalizedName : null;
}

/**
 * Build a code-keyed lookup so manager tables can reuse the existing auditors
 * query instead of making extra requests for each row.
 */
export function buildAuditorNameLookup(entries: readonly AuditorNameLookupEntry[]): ReadonlyMap<string, string> {
	const lookup = new Map<string, string>();

	for (const entry of entries) {
		const normalizedCode = entry.auditorCode.trim();
		const normalizedName = normalizeAuditorName(entry.fullName);

		if (normalizedCode.length === 0 || normalizedName === null) {
			continue;
		}

		lookup.set(normalizedCode, normalizedName);
	}

	return lookup;
}

/**
 * Resolve the label shown in shared tables. Detail pages keep using the raw
 * auditor code because they do not pass a display name into the shared rows.
 */
export function getAuditorTableLabel(auditorCode: string, auditorName: string | null | undefined): string {
	return normalizeAuditorName(auditorName) ?? auditorCode;
}
