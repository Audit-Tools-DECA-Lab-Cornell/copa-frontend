import { headers } from "next/headers";

import { isConsentRequiredCountry } from "@/lib/analytics/regions";

/**
 * Resolve whether the current request comes from a region that requires analytics
 * consent before tracking (EU/EEA, UK, Switzerland).
 *
 * The visitor country is read from the edge geo header set by the hosting platform
 * (`x-vercel-ip-country`), with `x-country`/`cf-ipcountry` as fallbacks. When no
 * geo header is present (e.g. local dev), we default to requiring consent so the
 * stricter behavior is the safe default.
 */
export async function requestRequiresAnalyticsConsent(): Promise<boolean> {
	const headerStore = await headers();
	const countryCode =
		headerStore.get("x-vercel-ip-country") ?? headerStore.get("x-country") ?? headerStore.get("cf-ipcountry");

	return isConsentRequiredCountry(countryCode);
}
