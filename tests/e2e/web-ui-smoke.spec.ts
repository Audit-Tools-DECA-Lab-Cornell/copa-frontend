import { expect, test } from "@playwright/test";

import { loginAsAuditor, loginAsManager } from "../helpers/auth";

test.describe("@web-ui seeded backend sync", () => {
	test("manager can sign in through the web UI and see the dashboard shell", async ({ page }) => {
		await loginAsManager(page);
		await expect(page).toHaveURL(/\/manager\/dashboard/);
		await expect(page.getByText("Manager Dashboard").first()).toBeVisible({ timeout: 30_000 });
		await expect(page.getByRole("link", { name: /projects/i }).first()).toBeVisible();
	});

	test("auditor can sign in through the web UI and see the auditor dashboard shell", async ({ page }) => {
		await loginAsAuditor(page);
		await expect(page).toHaveURL(/\/auditor\/(dashboard|onboarding)/);
		await expect(page.getByText(/auditor dashboard|assigned|places|reports/i).first()).toBeVisible({
			timeout: 30_000
		});
	});
});
