import { expect, type APIRequestContext } from "@playwright/test";
import { e2eUsers, type E2ERole } from "../fixtures/users";

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
	return process.env.E2E_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
}

async function loginPayloadViaApi(request: APIRequestContext, role: E2ERole): Promise<AuthResponsePayload> {
	const credentials = e2eUsers[role];
	const response = await request.post(`${getApiBaseUrl()}/playspace/auth/login`, {
		data: {
			email: credentials.email,
			password: credentials.password
		}
	});
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
