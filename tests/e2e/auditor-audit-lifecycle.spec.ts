import { expect, test } from "@playwright/test";

import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

test.describe("@auditor-web-audit seeded auditor lifecycle", () => {
	test("auditor sees assigned places and can open the audit lifecycle entrypoint", async ({ request }) => {
		const token = await loginViaApi(request, "auditor");
		const headers = bearerHeaders(token);

		const places = await request.get(`${getApiBaseUrl()}/playspace/auditor/me/places?page_size=100`, { headers });
		await expectOk(places);
		const placesPayload = (await places.json()) as {
			items: Array<{ place_id: string; project_id: string; place_audit_status: string }>;
		};
		expect(placesPayload.items.length).toBeGreaterThan(0);
		const targetPlace =
			placesPayload.items.find(place => place.place_audit_status !== "submitted") ?? placesPayload.items[0];

		const audit = await request.post(`${getApiBaseUrl()}/playspace/places/${targetPlace.place_id}/audits/access`, {
			headers,
			data: {
				project_id: targetPlace.project_id,
				execution_mode: "both"
			}
		});
		await expectOk(audit);
		const auditPayload = (await audit.json()) as {
			place_id: string;
			project_id: string;
			status: string;
			revision: number;
		};
		expect(auditPayload).toEqual(
			expect.objectContaining({
				place_id: targetPlace.place_id,
				project_id: targetPlace.project_id
			})
		);
		expect(["IN_PROGRESS", "SUBMITTED"]).toContain(auditPayload.status);
		expect(auditPayload.revision).toBeGreaterThanOrEqual(0);
	});
});
