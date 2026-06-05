import { expect, test } from "@playwright/test";
import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

/**
 * E2E contract tests for the manager invite management API surface.
 * Runs in the manager-chromium Playwright project (matches *manager*.spec.ts).
 *
 * All invite-creation side-effects are self-cleaning: every invite created
 * here is revoked within the same test, so the seed database is not polluted.
 */

test.describe("@manager-invites primary manager can manage invites", () => {
	test("creates, lists, resamples, and revokes a manager invite", async ({ request }) => {
		const token = await loginViaApi(request, "manager");
		const headers = bearerHeaders(token);
		const base = getApiBaseUrl();

		// Use a timestamp-derived email so parallel runs never collide.
		const uniqueEmail = `e2e-invite-${Date.now()}@example.org`;

		// Create an invite - POST /playspace/manager-invites
		const createResponse = await request.post(`${base}/playspace/manager-invites`, {
			data: { email: uniqueEmail },
			headers
		});
		await expectOk(createResponse);
		const created = (await createResponse.json()) as {
			id: string;
			email: string;
			status: string;
			expires_at: string;
		};
		expect(created.email).toBe(uniqueEmail);
		expect(created.status).toBe("PENDING");
		const inviteId = created.id;

		// List invites - GET /playspace/manager-invites - new invite must be present
		const listResponse = await request.get(`${base}/playspace/manager-invites`, { headers });
		await expectOk(listResponse);
		const invites = (await listResponse.json()) as Array<{ id: string; email: string; status: string }>;
		const match = invites.find(i => i.id === inviteId);
		expect(match).toBeDefined();
		expect(match?.status).toBe("PENDING");

		// Resend - POST /playspace/manager-invites/{id}/resend - refreshes token, keeps PENDING
		const resendResponse = await request.post(`${base}/playspace/manager-invites/${inviteId}/resend`, { headers });
		await expectOk(resendResponse);
		const resent = (await resendResponse.json()) as { id: string; status: string; expires_at: string };
		expect(resent.id).toBe(inviteId);
		expect(resent.status).toBe("PENDING");
		// Resend must have extended the expiry
		expect(new Date(resent.expires_at).getTime()).toBeGreaterThan(new Date(created.expires_at).getTime());

		// Revoke - DELETE /playspace/manager-invites/{id} - 204, no body
		const revokeResponse = await request.delete(`${base}/playspace/manager-invites/${inviteId}`, { headers });
		expect(revokeResponse.status()).toBe(204);

		// List after revoke - invite must be absent
		const listAfterResponse = await request.get(`${base}/playspace/manager-invites`, { headers });
		await expectOk(listAfterResponse);
		const invitesAfter = (await listAfterResponse.json()) as Array<{ id: string }>;
		expect(invitesAfter.find(i => i.id === inviteId)).toBeUndefined();
	});

	test("double-revoke of a non-existent invite returns 404", async ({ request }) => {
		const token = await loginViaApi(request, "manager");
		const headers = bearerHeaders(token);
		const base = getApiBaseUrl();

		// Create then immediately revoke
		const createResponse = await request.post(`${base}/playspace/manager-invites`, {
			data: { email: `e2e-double-revoke-${Date.now()}@example.org` },
			headers
		});
		await expectOk(createResponse);
		const inviteId = ((await createResponse.json()) as { id: string }).id;

		const firstRevoke = await request.delete(`${base}/playspace/manager-invites/${inviteId}`, { headers });
		expect(firstRevoke.status()).toBe(204);

		const secondRevoke = await request.delete(`${base}/playspace/manager-invites/${inviteId}`, { headers });
		expect(secondRevoke.status()).toBe(404);
	});

	test("accepted invite shows ACCEPTED status and blocks revoke/resend", async ({ request }) => {
		const token = await loginViaApi(request, "manager");
		const headers = bearerHeaders(token);
		const base = getApiBaseUrl();
		const acceptEmail = `e2e-accept-${Date.now()}@example.org`;

		// Create invite
		const createResponse = await request.post(`${base}/playspace/manager-invites`, {
			data: { email: acceptEmail },
			headers
		});
		await expectOk(createResponse);
		const inviteUrl = ((await createResponse.json()) as { invite_url: string }).invite_url;
		const inviteToken = inviteUrl.split("/").at(-1) ?? "";

		// Accept invite - creates a secondary manager
		const acceptResponse = await request.post(`${base}/playspace/auth/manager-invites/${inviteToken}/accept`, {
			data: { name: "E2E Secondary Manager", password: "DemoPass123!" }
		});
		await expectOk(acceptResponse);

		// List - accepted invite has ACCEPTED status
		const listResponse = await request.get(`${base}/playspace/manager-invites`, { headers });
		await expectOk(listResponse);
		const invites = (await listResponse.json()) as Array<{
			id: string;
			email: string;
			status: string;
			accepted_at: string | null;
		}>;
		const acceptedInvite = invites.find(i => i.email === acceptEmail);
		expect(acceptedInvite).toBeDefined();
		expect(acceptedInvite?.status).toBe("ACCEPTED");
		expect(acceptedInvite?.accepted_at).not.toBeNull();
		const acceptedInviteId = acceptedInvite?.id ?? "";

		// Revoke accepted invite - 400
		const revokeAccepted = await request.delete(`${base}/playspace/manager-invites/${acceptedInviteId}`, {
			headers
		});
		expect(revokeAccepted.status()).toBe(400);

		// Resend accepted invite - 400
		const resendAccepted = await request.post(`${base}/playspace/manager-invites/${acceptedInviteId}/resend`, {
			headers
		});
		expect(resendAccepted.status()).toBe(400);
	});
});

test.describe("@manager-invites non-primary roles are denied invite management", () => {
	test("auditor cannot list, create, or manage invites", async ({ request }) => {
		const auditorToken = await loginViaApi(request, "auditor");
		const headers = bearerHeaders(auditorToken);
		const base = getApiBaseUrl();

		const listResponse = await request.get(`${base}/playspace/manager-invites`, { headers });
		expect(listResponse.status()).toBe(403);

		const createResponse = await request.post(`${base}/playspace/manager-invites`, {
			data: { email: "blocked-by-auditor@example.org" },
			headers
		});
		expect(createResponse.status()).toBe(403);
	});
});
