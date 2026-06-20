import type { BugReportContext } from "@/lib/api/playspace-types";

/**
 * Identifier-shaped route params worth capturing for triage. Only values that
 * look like entity ids are kept - free-text params are ignored so nothing
 * sensitive is captured.
 */
const ENTITY_PARAM_KEYS = ["projectId", "placeId", "auditId", "accountId", "auditorId"] as const;

export interface RouteContextInput {
	pathname: string;
	params: Record<string, string | string[] | undefined>;
}

/**
 * Assemble a privacy-filtered diagnostic context from the browser and the
 * current route. This is an allow-list by construction: it only ever reads the
 * specific, non-sensitive fields below - never page content, form values,
 * localStorage, or auth tokens.
 */
export function buildWebBugReportContext({ pathname, params }: RouteContextInput): BugReportContext {
	const routeParams: Record<string, string> = {};
	for (const key of ENTITY_PARAM_KEYS) {
		const value = params[key];
		if (typeof value === "string" && value.length > 0) {
			routeParams[key] = value;
		}
	}

	const context: BugReportContext = {
		route: pathname,
		app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? undefined,
		client_timestamp: new Date().toISOString()
	};

	if (Object.keys(routeParams).length > 0) {
		context.route_params = routeParams;
		if (routeParams.projectId) context.project_id = routeParams.projectId;
		if (routeParams.placeId) context.place_id = routeParams.placeId;
		if (routeParams.auditId) context.playspace_submission_id = routeParams.auditId;
	}

	if (typeof navigator !== "undefined") {
		context.user_agent = navigator.userAgent;
		context.locale = navigator.language;
		context.network_online = navigator.onLine;
	}

	if (typeof window !== "undefined") {
		context.viewport_width = window.innerWidth;
		context.viewport_height = window.innerHeight;
	}

	return context;
}

/**
 * Pull the verified entity ids out of the assembled context so they can be sent
 * as structured references on the report (the backend re-verifies ownership).
 */
export function entityRefsFromContext(context: BugReportContext): {
	project_id?: string;
	place_id?: string;
	playspace_submission_id?: string;
} {
	return {
		project_id: context.project_id,
		place_id: context.place_id,
		playspace_submission_id: context.playspace_submission_id
	};
}
