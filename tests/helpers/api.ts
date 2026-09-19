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
		"VISUAL_API_BASE_URL is the CI repository variable only and has no effect locally.",
		"If the backend sleeps when idle, warm it first - a cold start can outlast the 60s",
		'timeout on its own: curl -s -o /dev/null "$E2E_API_BASE_URL/health".'
	].join("\n");
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
