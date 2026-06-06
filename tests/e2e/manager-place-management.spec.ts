import { expect, test } from "@playwright/test";
import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

test.describe("@manager-places primary manager can manage places", () => {
	test("creates, gets, updates, and deletes a place", async ({ request }) => {
		const token = await loginViaApi(request, "manager");
		const headers = bearerHeaders(token);
		const base = getApiBaseUrl();

		// Create project
		const projectRes = await request.post(`${base}/playspace/projects`, {
			data: {
				name: `E2E Place Test Project ${Date.now()}`,
				place_types: ["PARK"]
			},
			headers
		});
		await expectOk(projectRes);
		const projectId = ((await projectRes.json()) as { id: string }).id;

		// Create place
		const createRes = await request.post(`${base}/playspace/places`, {
			data: {
				project_ids: [projectId],
				name: "Original Place Name",
				city: "Test City",
				country: "Test Country",
				place_type: "PARK"
			},
			headers
		});
		await expectOk(createRes);
		const createdPlace = (await createRes.json()) as { id: string; name: string };
		expect(createdPlace.name).toBe("Original Place Name");
		const placeId = createdPlace.id;

		// Get place
		const getRes = await request.get(`${base}/playspace/places/${placeId}`, { headers });
		await expectOk(getRes);
		const fetchedPlace = (await getRes.json()) as { id: string; name: string; city: string };
		expect(fetchedPlace.id).toBe(placeId);
		expect(fetchedPlace.name).toBe("Original Place Name");
		expect(fetchedPlace.city).toBe("Test City");

		// Update place
		const updateRes = await request.patch(`${base}/playspace/places/${placeId}`, {
			data: {
				name: "Updated Place Name",
				city: "Updated City",
				country: "Test Country",
				place_type: "SCHOOL"
			},
			headers
		});
		await expectOk(updateRes);
		const updatedPlace = (await updateRes.json()) as { id: string; name: string; city: string; place_type: string };
		expect(updatedPlace.name).toBe("Updated Place Name");
		expect(updatedPlace.city).toBe("Updated City");
		expect(updatedPlace.place_type).toBe("SCHOOL");

		// Get place again to verify persistence
		const getRes2 = await request.get(`${base}/playspace/places/${placeId}`, { headers });
		await expectOk(getRes2);
		const fetchedPlace2 = (await getRes2.json()) as { id: string; name: string };
		expect(fetchedPlace2.name).toBe("Updated Place Name");

		// Clean up
		await request.delete(`${base}/playspace/places/${placeId}`, { headers });
		await request.delete(`${base}/playspace/projects/${projectId}`, { headers });
	});
});
