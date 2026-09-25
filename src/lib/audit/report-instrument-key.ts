/**
 * Query key for the active instrument fetched as a report fallback.
 *
 * Reports read each submission with the instrument version embedded in its audit session.
 * The active instrument is fetched only when a session arrives without one, and it lives
 * under its own key so a cached active version never stands in for a submission's version.
 * Server prefetch and the client hook share this key so hydration lines up.
 */
export function activeReportInstrumentQueryKey(instrumentKey: string | undefined) {
	return ["playspace", "instrument", "active", instrumentKey] as const;
}
