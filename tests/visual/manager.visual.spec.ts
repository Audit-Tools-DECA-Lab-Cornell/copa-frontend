import { expect, test } from "@playwright/test";

import { prepareVisualPage, takeVisualSnapshot } from "../helpers/visual";

test.describe("manager visual snapshots", () => {
	test("captures the manager dashboard", async ({ page, request }) => {
		await prepareVisualPage(page, request, {
			role: "manager",
			route: "/manager/dashboard",
			waitFor: async currentPage => {
				await expect(currentPage.getByRole("link", { name: "View projects" })).toBeVisible();
				await expect(currentPage.getByRole("link", { name: "View all audits" })).toBeVisible();
			}
		});

		await takeVisualSnapshot(page, {
			name: "Manager Dashboard"
		});
	});

	test("captures the manager projects page", async ({ page, request }) => {
		await prepareVisualPage(page, request, {
			role: "manager",
			route: "/manager/projects",
			waitFor: async currentPage => {
				await expect(currentPage.getByRole("heading", { name: "Projects" }).first()).toBeVisible();
				await expect(currentPage.getByRole("button", { name: "New project" })).toBeVisible();
			}
		});

		await takeVisualSnapshot(page, {
			name: "Manager Projects"
		});
	});

	test("captures the manager settings page", async ({ page, request }) => {
		await prepareVisualPage(page, request, {
			role: "manager",
			route: "/settings",
			waitFor: async currentPage => {
				await expect(currentPage.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
				await expect(currentPage.getByText("Your account").first()).toBeVisible();
				await expect(currentPage.getByRole("button", { name: "Sign out" })).toBeVisible();
			}
		});

		await takeVisualSnapshot(page, {
			name: "Manager Settings"
		});
	});

	test("captures the manager project creation dialog", async ({ page, request }) => {
		await prepareVisualPage(page, request, {
			role: "manager",
			route: "/manager/projects",
			waitFor: async currentPage => {
				await expect(currentPage.getByRole("button", { name: "New project" })).toBeVisible();
			}
		});

		await page.getByRole("button", { name: "New project" }).click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Create project" })).toBeVisible();

		await takeVisualSnapshot(page, {
			name: "Manager Projects - Create Dialog"
		});
	});
});
