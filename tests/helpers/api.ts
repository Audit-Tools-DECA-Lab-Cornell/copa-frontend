import { type APIRequestContext, expect } from "@playwright/test";

import { type E2ERole, e2eUsers } from "../fixtures/users";

export type AuthNextStep = "VERIFY_EMAIL" | "WAITING_APPROVAL" | "COMPLETE_PROFILE" | "DASHBOARD";
export type BrowserSessionRole = Extract<E2ERole, "admin" | "manager" | "auditor">;

interface AuthResponsePayload {
	access_token: string;
	user: {
		account_id: string | null;
		account_type: "ADMIN" | "MANAGER" | "AUDITOR";
		email: string;
		name: string | null;
		next_step: AuthNextStep;
	};
}

interface AuditorProfilePayload {
	auditor_code: string;
}

export interface BrowserSessionSeed {
	role: BrowserSessionRole;
	accessToken: string;
	accountId: string | null;
	auditorCode: string | null;
	userName: string | null;
	userEmail: string;
	nextStep: AuthNextStep;
}

export function getApiBaseUrl(): string {
	const configured = process.env.E2E_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
	// Every caller builds `${getApiBaseUrl()}/playspace/...`, so a trailing slash
	// produces a double slash, which FastAPI answers with a 404 that is
	// indistinguishable from pointing at the wrong host entirely.
	return configured.replace(/\/+$/, "");
}

/**
 * Both messages below exist because the failure they describe is otherwise
 * invisible: every spec in the visual catalog awaits the same seeding promise, so
 * one unreachable API surfaces as dozens of identical `{"detail":"Not Found"}`
 * assertion failures with no indication of which URL was called or why.
 */
export function apiUnreachableMessage(baseUrl: string, detail: string): string {
	return [
		`The Playspace API did not answer at ${baseUrl} (${detail}).`,
		"",
		"These suites need a reachable, seeded Playspace backend. Playwright reads only the",
		"process environment - it does not load .env files - so the base URL has to be",
		"exported in the shell that runs the test, not just set in .env.local:",
		"",
		'  export E2E_API_BASE_URL="https://your-seeded-api.example.com"',
		"",
		"That one export configures both sides: the Playwright config forwards it to the",
		"dev server it starts, so the browser app reads the same backend. Set",
		"NEXT_PUBLIC_API_BASE_URL as well only to point the app somewhere else on purpose,",
		"and restart an already-running dev server, which is reused with its original env.",
		"",
		"VISUAL_API_BASE_URL is the CI repository variable only and has no effect locally.",
		"If the backend sleeps when idle, warm it first - a cold start can outlast the 60s",
		'timeout on its own: curl -s -o /dev/null "$E2E_API_BASE_URL/health".'
	].join("\n");
}

/**
 * Reduce a base URL to what actually decides the backend, so spellings that
 * address the same host are not reported as a conflict: an explicit default
 * port, a differently-cased host, and a trailing slash all normalize away.
 * `URL` handles the first two; anything it cannot parse falls back to the raw
 * string, which then only matches an identical one.
 */
function canonicalizeApiBaseUrl(value: string): string {
	const withoutTrailingSlash = value.replace(/\/+$/, "");
	try {
		const url = new URL(withoutTrailingSlash);
		return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
	} catch {
		return withoutTrailingSlash;
	}
}

/**
 * The visual run drives two API clients that must reach the same backend: this
 * process seeds fixtures through `E2E_API_BASE_URL`, while the browser app reads
 * `NEXT_PUBLIC_API_BASE_URL`. When they disagree the seeded ids resolve against
 * one backend and the pages fetch from another, so data-backed pages fall into
 * their "unable to load" state - and most readiness gates only check that `main`
 * rendered, so the run still reports green while capturing broken screenshots.
 *
 * Only an outright conflict is an error. A missing app URL is normal: the
 * Playwright config hands the seeding URL to the dev server it starts.
 */
export function assertApiBaseUrlsAgree(): void {
	const seedingUrl = process.env.E2E_API_BASE_URL?.trim();
	const appUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

	if (!seedingUrl || !appUrl || canonicalizeApiBaseUrl(seedingUrl) === canonicalizeApiBaseUrl(appUrl)) {
		return;
	}

	throw new Error(
		[
			"E2E_API_BASE_URL and NEXT_PUBLIC_API_BASE_URL point at different backends:",
			"",
			`  seeding (this process): ${seedingUrl}`,
			`  app (browser):          ${appUrl}`,
			"",
			"The fixtures would be seeded on one backend and read from the other, so pages",
			"render their error state while the run still reports passing tests. Export the",
			"same URL for both, or unset NEXT_PUBLIC_API_BASE_URL and let the Playwright",
			"config pass E2E_API_BASE_URL to the dev server it starts.",
			"",
			"Note: an already-running dev server is reused as-is, so restart it after",
			"changing either variable."
		].join("\n")
	);
}

export function apiRouteMissingMessage(baseUrl: string, route: string): string {
	return [
		`${baseUrl} answered, but ${route} returned 404.`,
		"",
		"The host is reachable and is not serving the Playspace API at this base URL -",
		"usually a base URL pointing at a different service, or one that already carries a",
		"path prefix. A correct base URL returns 401 for bad credentials, never 404."
	].join("\n");
}

async function loginPayloadViaApi(request: APIRequestContext, role: E2ERole): Promise<AuthResponsePayload> {
	const credentials = e2eUsers[role];
	const baseUrl = getApiBaseUrl();
	const response = await request.post(`${baseUrl}/playspace/auth/login`, {
		data: {
			email: credentials.email,
			password: credentials.password
		}
	});
	// A 404 here is a misconfigured base URL, not a credential problem, and saying so
	// is the difference between a one-line fix and an afternoon: the body FastAPI
	// returns ({"detail":"Not Found"}) looks identical to a genuine auth rejection.
	if (response.status() === 404) {
		throw new Error(apiRouteMissingMessage(baseUrl, "POST /playspace/auth/login"));
	}
	expect(response.ok(), await response.text()).toBeTruthy();
	const payload = (await response.json()) as AuthResponsePayload;
	expect(payload.access_token).toBeTruthy();
	return payload;
}

function mapAccountTypeToRole(accountType: AuthResponsePayload["user"]["account_type"]): BrowserSessionRole {
	if (accountType === "ADMIN") return "admin";
	if (accountType === "MANAGER") return "manager";
	return "auditor";
}

async function fetchAuditorCode(request: APIRequestContext, token: string): Promise<string> {
	const response = await request.get(`${getApiBaseUrl()}/playspace/me/auditor-profile`, {
		headers: bearerHeaders(token)
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	const payload = (await response.json()) as AuditorProfilePayload;
	expect(payload.auditor_code).toBeTruthy();
	return payload.auditor_code;
}

export async function loginViaApi(request: APIRequestContext, role: E2ERole): Promise<string> {
	const payload = await loginPayloadViaApi(request, role);
	return payload.access_token;
}

/**
 * Creates the exact cookie-backed session payload the current frontend expects
 * for protected route rendering.
 */
export async function createBrowserSessionSeed(
	request: APIRequestContext,
	role: BrowserSessionRole
): Promise<BrowserSessionSeed> {
	const payload = await loginPayloadViaApi(request, role);
	const resolvedRole = mapAccountTypeToRole(payload.user.account_type);
	expect(resolvedRole).toBe(role);

	return {
		role,
		accessToken: payload.access_token,
		accountId: payload.user.account_id,
		auditorCode: role === "auditor" ? await fetchAuditorCode(request, payload.access_token) : null,
		userName: payload.user.name,
		userEmail: payload.user.email,
		nextStep: payload.user.next_step
	};
}

export function bearerHeaders(token: string): Record<string, string> {
	return { Authorization: `bearer ${token}` };
}

export async function expectOk(response: { ok(): boolean; text(): Promise<string> }): Promise<void> {
	expect(response.ok(), await response.text()).toBeTruthy();
}
