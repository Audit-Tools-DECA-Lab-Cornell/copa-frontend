import type { BrowserContext } from "@playwright/test";

import { AUTH_COOKIE_NAMES } from "../../src/lib/auth/role";
import type { BrowserSessionSeed } from "./api";

function getFrontendBaseUrl(): string {
	return process.env.E2E_BASE_URL ?? "http://localhost:3000";
}

/**
 * Seeds the browser with the same cookie-backed auth session shape the
 * frontend reads on both the server and client.
 */
export async function seedBrowserSession(context: BrowserContext, session: BrowserSessionSeed): Promise<void> {
	await context.clearCookies();

	const baseUrl = getFrontendBaseUrl();
	const cookies = [
		{ name: AUTH_COOKIE_NAMES.role, value: session.role },
		{ name: AUTH_COOKIE_NAMES.accessToken, value: session.accessToken },
		{ name: AUTH_COOKIE_NAMES.nextStep, value: session.nextStep },
		...(session.accountId ? [{ name: AUTH_COOKIE_NAMES.accountId, value: session.accountId }] : []),
		...(session.auditorCode ? [{ name: AUTH_COOKIE_NAMES.auditorCode, value: session.auditorCode }] : []),
		...(session.userName ? [{ name: AUTH_COOKIE_NAMES.userName, value: session.userName }] : []),
		...(session.userEmail ? [{ name: AUTH_COOKIE_NAMES.userEmail, value: session.userEmail }] : [])
	].map(cookie => ({
		...cookie,
		url: baseUrl
	}));

	await context.addCookies(cookies);
}
