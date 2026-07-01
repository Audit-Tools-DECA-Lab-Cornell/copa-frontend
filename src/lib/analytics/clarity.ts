/**
 * Microsoft Clarity configuration.
 *
 * Clarity (heatmaps + session replay) is gated behind a single build-time
 * environment variable so it can be enabled per environment with one change. The
 * project id lives in `NEXT_PUBLIC_CLARITY_PROJECT_ID`; when it is unset, Clarity
 * never loads. Loading is additionally restricted to production so local dev and
 * preview traffic do not pollute the Clarity dashboard.
 */

/**
 * The Clarity project id for the current environment, if configured.
 */
export function getClarityProjectId(): string | undefined {
	const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
	return projectId && projectId.length > 0 ? projectId : undefined;
}

/**
 * Whether Clarity should be active: a project id is configured and the app is
 * running in production. Consent is checked separately at load time.
 */
export function isClarityConfigured(): boolean {
	return getClarityProjectId() !== undefined && process.env.NODE_ENV === "production";
}
