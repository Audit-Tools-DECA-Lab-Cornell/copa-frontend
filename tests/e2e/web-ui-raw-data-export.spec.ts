import { expect, test } from "@playwright/test";
import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

/**
 * E2E contract tests for the raw-data export support surface.
 * Runs in the web-ui-chromium Playwright project (matches *web-ui*.spec.ts).
 *
 * Bulk exports generate the ZIP client-side, so the only server contract is the
 * completion-notice endpoint (best-effort email) plus the rich single-audit
 * endpoint the export engine reads to build each PDF/data file. These tests
 * cover the access rules and that data path; they create no persistent data.
 */

const VALID_PAYLOAD = {
	entity: "projects",
	format: "xlsx",
	audit_count: 12,
	combined_report_count: 2,
	had_failures: false
} as const;

test.describe("@web-ui raw-data export completion notice", () => {
	test("managers and admins can request a completion notice", async ({ request }) => {
		const base = getApiBaseUrl();

		const adminToken = await loginViaApi(request, "admin");
		const adminResponse = await request.post(`${base}/playspace/exports/notify-ready`, {
			data: VALID_PAYLOAD,
			headers: bearerHeaders(adminToken)
		});
		// Email delivery is best-effort; the endpoint returns 204 regardless.
		expect(adminResponse.status(), await adminResponse.text()).toBe(204);

		const managerToken = await loginViaApi(request, "manager");
		const managerResponse = await request.post(`${base}/playspace/exports/notify-ready`, {
			data: { entity: "audits", format: "json", audit_count: 1 },
			headers: bearerHeaders(managerToken)
		});
		expect(managerResponse.status(), await managerResponse.text()).toBe(204);
	});

	test("auditors cannot request an export completion notice", async ({ request }) => {
		const base = getApiBaseUrl();
		const auditorToken = await loginViaApi(request, "auditor");
		const response = await request.post(`${base}/playspace/exports/notify-ready`, {
			data: VALID_PAYLOAD,
			headers: bearerHeaders(auditorToken)
		});
		expect(response.status()).toBe(403);
	});

	test("unauthenticated callers are rejected", async ({ request }) => {
		const base = getApiBaseUrl();
		const response = await request.post(`${base}/playspace/exports/notify-ready`, {
			data: VALID_PAYLOAD
		});
		expect([401, 403]).toContain(response.status());
	});

	test("an invalid entity fails request validation", async ({ request }) => {
		const base = getApiBaseUrl();
		const adminToken = await loginViaApi(request, "admin");
		const response = await request.post(`${base}/playspace/exports/notify-ready`, {
			data: { entity: "everything", format: "xlsx", audit_count: 1 },
			headers: bearerHeaders(adminToken)
		});
		expect(response.status()).toBe(422);
	});
});

test.describe("@web-ui raw-data export data path", () => {
	test("submitted reports expose the rich session the export engine needs", async ({ request }) => {
		const base = getApiBaseUrl();
		const adminToken = await loginViaApi(request, "admin");
		const headers = bearerHeaders(adminToken);

		// The bulk Reports export returns submitted-audit metadata rows; the ZIP
		// engine then fetches each rich session via GET /playspace/audits/{id}.
		const reportsResponse = await request.get(`${base}/playspace/admin/export/reports`, { headers });
		await expectOk(reportsResponse);
		const reports = (await reportsResponse.json()) as {
			records: Array<{ audit_id: string; status: string }>;
		};

		const submitted = reports.records.find(r => r.status === "SUBMITTED");
		test.skip(submitted === undefined, "Seed has no submitted reports to exercise the rich data path.");

		const richResponse = await request.get(`${base}/playspace/audits/${encodeURIComponent(submitted!.audit_id)}`, {
			headers
		});
		await expectOk(richResponse);
		const session = (await richResponse.json()) as {
			audit_code: string;
			status: string;
			scores: unknown;
		};
		expect(session.status).toBe("SUBMITTED");
		expect(session.audit_code).toBeTruthy();
		// The PDF/Excel/JSON generators read computed scores off the rich session.
		expect(session.scores).toBeTruthy();
	});
});
