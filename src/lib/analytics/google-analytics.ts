/**
 * Google Analytics (GA4 / gtag.js) configuration.
 *
 * The measurement id lives in `NEXT_PUBLIC_GA_MEASUREMENT_ID` (e.g. "G-XXXXXXXXXX")
 * so it can be enabled per environment with one change. When it is unset, GA never
 * loads. Loading is additionally restricted to production so local dev and preview
 * traffic do not pollute the Analytics property. Consent is checked separately at
 * load time — GA only fires after the visitor accepts analytics.
 */

/**
 * The GA4 measurement id for the current environment, if configured.
 */
export function getGaMeasurementId(): string | undefined {
	const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
	return measurementId && measurementId.length > 0 ? measurementId : undefined;
}

/**
 * Whether Google Analytics should be active: a measurement id is configured and
 * the app is running in production. Consent is checked separately at load time.
 */
export function isGoogleAnalyticsConfigured(): boolean {
	return getGaMeasurementId() !== undefined && process.env.NODE_ENV === "production";
}
