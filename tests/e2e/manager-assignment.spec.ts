import { expect, test } from "@playwright/test";

import { e2eIds } from "../fixtures/ids";
import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

test.describe("@manager-assignment seeded manager visibility", () => {
	test("manager sees seeded project, place, and auditors through the backend contract", async ({ request }) => {
		const token = await loginViaApi(request, "manager");
		const headers = bearerHeaders(token);

		const projects = await request.get(
			`${getApiBaseUrl()}/playspace/accounts/${e2eIds.managerAccountId}/projects`,
			{ headers }
		);
		await expectOk(projects);
		expect((await projects.json()) as Array<{ id: string }>).toContainEqual(
			expect.objectContaining({ id: e2eIds.urbanProjectId })
		);

		const places = await request.get(
			`${getApiBaseUrl()}/playspace/accounts/${e2eIds.managerAccountId}/places?page_size=100`,
			{ headers }
		);
		await expectOk(places);
		const placesPayload = (await places.json()) as { items: Array<{ place_id?: string; id?: string }> };
		expect(placesPayload.items.some(place => (place.place_id ?? place.id) === e2eIds.riversidePlaceId)).toBe(true);

		const auditors = await request.get(
			`${getApiBaseUrl()}/playspace/accounts/${e2eIds.managerAccountId}/auditors`,
			{ headers }
		);
		await expectOk(auditors);
		expect(((await auditors.json()) as unknown[]).length).toBeGreaterThan(0);
	});
});
