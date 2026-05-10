import { expect, test } from "@playwright/test";

import { prepareVisualPage, takeVisualSnapshot } from "../helpers/visual";

test.describe("auditor visual snapshots", () => {
	test("captures the auditor dashboard", async ({ page, request }) => {
		await prepareVisualPage(page, request, {
			role: "auditor",
			route: "/auditor/dashboard",
			waitFor: async currentPage => {
				await expect(currentPage.getByRole("heading", { name: "Auditor dashboard" })).toBeVisible();
				await expect(currentPage.getByRole("textbox", { name: "Search places..." })).toBeVisible();
			}
		});

		await takeVisualSnapshot(page, {
			name: "Auditor Dashboard"
		});
	});
});
