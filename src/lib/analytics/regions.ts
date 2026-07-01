/**
 * Regions where analytics consent must be collected before tracking.
 *
 * Covers the EU/EEA plus the UK and Switzerland, which apply equivalent
 * consent-before-tracking rules. Codes are ISO 3166-1 alpha-2 (uppercase) — the
 * same format used by Google Consent Mode's `region` targeting and by edge geo
 * headers. Kept in one place so the client-facing banner, the server geo check,
 * and the GA Consent Mode defaults all agree on the region set.
 */
export const CONSENT_REQUIRED_REGION_CODES: readonly string[] = [
	// EU member states
	"AT",
	"BE",
	"BG",
	"HR",
	"CY",
	"CZ",
	"DK",
	"EE",
	"FI",
	"FR",
	"DE",
	"GR",
	"HU",
	"IE",
	"IT",
	"LV",
	"LT",
	"LU",
	"MT",
	"NL",
	"PL",
	"PT",
	"RO",
	"SK",
	"SI",
	"ES",
	"SE",
	// EEA (non-EU)
	"IS",
	"LI",
	"NO",
	// UK GDPR + Swiss nFADP
	"GB",
	"CH"
];

/**
 * Whether a two-letter country code falls in a consent-required region. Unknown
 * or missing codes are treated as consent-required so we default to the stricter
 * behavior when geo is unavailable.
 */
export function isConsentRequiredCountry(countryCode: string | null | undefined): boolean {
	if (!countryCode) {
		return true;
	}

	return CONSENT_REQUIRED_REGION_CODES.includes(countryCode.toUpperCase());
}
