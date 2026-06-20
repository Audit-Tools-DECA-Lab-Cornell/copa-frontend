/**
 * Developer-mode flag for the internal bug-reporting feature.
 *
 * The whole feature is gated behind a single build-time flag so it can be hidden
 * for production with one environment change (and removed cleanly later). When
 * the flag is unset or not "true", the launcher and the admin page are not shown.
 */
export function isBugReportingEnabled(): boolean {
	return process.env.NEXT_PUBLIC_BUG_REPORTING_ENABLED === "true";
}
