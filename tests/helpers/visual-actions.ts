import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Some pages (the auditor execute form) keep a connection open and never reach
 * a true network-idle state, so the idle wait is bounded: settle quickly when
 * the page does go idle, otherwise move on and let the element checks gate
 * readiness instead.
 */
const NETWORK_IDLE_TIMEOUT = 5_000;

export async function waitForStableVisualPage(page: Page): Promise<void> {
	await page.waitForLoadState("domcontentloaded");
	await page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT }).catch(() => undefined);
	await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });
}

export async function openUserMenu(page: Page): Promise<void> {
	await page.locator("header button").last().click();
	await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeVisible({ timeout: 10_000 });
}

export async function logoutViaUserMenu(page: Page): Promise<void> {
	await openUserMenu(page);
	await Promise.all([
		page.waitForURL(/\/login/, { timeout: 30_000 }),
		page.getByRole("menuitem", { name: /sign out/i }).click()
	]);
	await expect(page.getByTestId("manager-email-input")).toBeVisible({ timeout: 15_000 });
}

export async function openDesktopSidebarCollapsed(page: Page): Promise<void> {
	await page.setViewportSize({ width: 1440, height: 1024 });
	const collapseButton = page.getByRole("button", { name: /collapse sidebar/i }).first();
	await expect(collapseButton).toBeVisible({ timeout: 10_000 });
	await collapseButton.click();
	await expect(page.getByRole("button", { name: /expand sidebar/i }).first()).toBeVisible({ timeout: 10_000 });
}

export async function openMobileNavigationSheet(page: Page): Promise<void> {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("button", { name: /open menu/i }).click();
	await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
}

export async function openFirstButtonByName(page: Page, name: RegExp | string): Promise<boolean> {
	const button = page.getByRole("button", { name }).first();
	if (!(await button.isVisible().catch(() => false))) {
		return false;
	}
	await button.click();
	return true;
}

export async function openFirstDialogFromButton(page: Page, buttonName: RegExp | string): Promise<boolean> {
	if (!(await openFirstButtonByName(page, buttonName))) {
		return false;
	}
	await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
	return true;
}

export async function openFirstMenuButton(page: Page): Promise<boolean> {
	const candidates = [
		page.getByRole("button", { name: /actions/i }).first(),
		page.getByRole("button", { name: /open menu/i }).last(),
		page.locator('[data-slot="dropdown-menu-trigger"]').first()
	];
	for (const candidate of candidates) {
		if (await candidate.isVisible().catch(() => false)) {
			await candidate.click();
			return true;
		}
	}
	return false;
}
