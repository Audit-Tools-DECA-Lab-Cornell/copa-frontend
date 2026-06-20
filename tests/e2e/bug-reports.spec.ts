import { expect, test } from "@playwright/test";

import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

test.describe("@bug-reports internal bug reporting", () => {
	test("a user can file a report, an admin reviews it, and non-admins are blocked", async ({ request }) => {
		const api = getApiBaseUrl();

		// An auditor files a report from the web surface.
		const auditorToken = await loginViaApi(request, "auditor");
		const create = await request.post(`${api}/playspace/bug-reports`, {
			headers: bearerHeaders(auditorToken),
			data: {
				surface: "web",
				title: "E2E: filter chip overflows on narrow screens",
				description: "On the reports page the filter chips wrap and cover the table header.",
				severity: "minor",
				context: { route: "/manager/reports", app_version: "e2e" }
			}
		});
		await expectOk(create);
		const created = (await create.json()) as { id: string; status: string; reporter_role: string };
		expect(created.status).toBe("new");
		expect(created.reporter_role).toBe("auditor");

		// The reporter sees it under their own reports.
		const mine = await request.get(`${api}/playspace/bug-reports/mine`, {
			headers: bearerHeaders(auditorToken)
		});
		await expectOk(mine);
		expect((await mine.json()) as Array<{ id: string }>).toContainEqual(
			expect.objectContaining({ id: created.id })
		);

		// An admin publishes a known issue and triages the report.
		const adminToken = await loginViaApi(request, "admin");
		const knownIssue = await request.post(`${api}/playspace/admin/known-issues`, {
			headers: bearerHeaders(adminToken),
			data: {
				title: "E2E: known filter overflow",
				symptoms: "Filter chips overflow on small screens.",
				workaround: "Rotate to landscape or widen the window.",
				is_published: true
			}
		});
		await expectOk(knownIssue);
		const known = (await knownIssue.json()) as { id: string };

		// Reporters see the published known issue when searching.
		const matches = await request.get(`${api}/playspace/known-issues/match?q=filter+overflow&surface=web`, {
			headers: bearerHeaders(auditorToken)
		});
		await expectOk(matches);
		expect((await matches.json()) as Array<{ id: string }>).toContainEqual(
			expect.objectContaining({ id: known.id })
		);

		const triage = await request.patch(`${api}/playspace/admin/bug-reports/${created.id}`, {
			headers: bearerHeaders(adminToken),
			data: { status: "triaged", linked_known_issue_id: known.id }
		});
		await expectOk(triage);
		const triaged = (await triage.json()) as { status: string; linked_known_issue_id: string };
		expect(triaged.status).toBe("triaged");
		expect(triaged.linked_known_issue_id).toBe(known.id);

		// Admin cleans up the known issue.
		const remove = await request.delete(`${api}/playspace/admin/known-issues/${known.id}`, {
			headers: bearerHeaders(adminToken)
		});
		expect(remove.status()).toBe(204);

		// Non-admins cannot reach the review or maintenance surface.
		const managerToken = await loginViaApi(request, "manager");
		const forbiddenList = await request.get(`${api}/playspace/admin/bug-reports`, {
			headers: bearerHeaders(managerToken)
		});
		expect(forbiddenList.status()).toBe(403);

		const forbiddenCreate = await request.post(`${api}/playspace/admin/known-issues`, {
			headers: bearerHeaders(auditorToken),
			data: { title: "nope", symptoms: "nope" }
		});
		expect(forbiddenCreate.status()).toBe(403);
	});
});
