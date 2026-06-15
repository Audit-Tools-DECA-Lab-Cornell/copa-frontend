import { expect, test } from "@playwright/test";

import { e2eIds } from "../fixtures/ids";
import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

test.describe("@reports seeded report access", () => {
	test("admin and manager can access a submitted audit detail used as report source", async ({ request }) => {
		const managerToken = await loginViaApi(request, "manager");
		const managerHeaders = bearerHeaders(managerToken);
		const audits = await request.get(
			`${getApiBaseUrl()}/playspace/accounts/${e2eIds.managerAccountId}/audits?page_size=100&status=SUBMITTED`,
			{ headers: managerHeaders }
		);
		await expectOk(audits);
		const auditsPayload = (await audits.json()) as { items: Array<{ audit_id: string; status: string }> };
		const submittedAudit = auditsPayload.items.find(audit => audit.status === "SUBMITTED");
		expect(submittedAudit).toBeTruthy();
		const auditId = submittedAudit?.audit_id ?? "";

		for (const [role, headers] of [
			["manager", managerHeaders],
			["admin", bearerHeaders(await loginViaApi(request, "admin"))]
		] as const) {
			const response = await request.get(`${getApiBaseUrl()}/playspace/audits/${auditId}`, { headers });
			await expectOk(response);
			const detail = (await response.json()) as { audit_id: string; status: string };
			expect(detail).toEqual(expect.objectContaining({ audit_id: auditId, status: "SUBMITTED" }));
			expect(role).toBeTruthy();
		}
	});
});
