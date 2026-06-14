import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { VISUAL_VIEWPORT } from "../../helpers/visual";

const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

/**
 * Thrown by a step when the UI it needs is not present. The capture driver
 * turns this into a skipped (not failed) screenshot for `optional` states.
 */
export class StateUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StateUnavailableError";
	}
}

async function isVisible(page: Page, locator: ReturnType<Page["getByRole"]>): Promise<boolean> {
	return locator.isVisible().catch(() => false);
}

/**
 * Opens a dialog from a trigger button and waits for it to render. When several
 * buttons share the name (one per table row), the first enabled one is used so
 * a leading disabled/gated row doesn't hide an actionable one below it.
 */
export async function openDialog(page: Page, buttonName: RegExp | string): Promise<void> {
	const matches = page.getByRole("button", { name: buttonName });
	const count = await matches.count();
	if (count === 0) {
		throw new StateUnavailableError(`No "${buttonName}" trigger button found`);
	}

	let sawTrigger = false;
	for (let index = 0; index < count; index += 1) {
		const candidate = matches.nth(index);
		if (!(await candidate.isVisible().catch(() => false))) {
			continue;
		}
		sawTrigger = true;
		// A present-but-disabled trigger means the feature is gated off for the
		// current seed data (e.g. nothing submitted yet) — keep looking for an
		// actionable row before giving up.
		if (!(await candidate.isEnabled().catch(() => false))) {
			continue;
		}
		await candidate.click();
		await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
		return;
	}

	throw new StateUnavailableError(
		sawTrigger ? `"${buttonName}" trigger is disabled` : `No visible "${buttonName}" trigger button found`
	);
}

/**
 * Opens the "Build place report" dialog from a specific place's row on the
 * reports list. When that place has both a submitted audit and survey, the
 * dialog opens in "audit + survey pair" mode with one of each pre-selected.
 */
export async function openBuildDialogForPlace(page: Page, placeName: string): Promise<void> {
	const row = page.getByRole("row").filter({ hasText: placeName }).first();
	if (!(await row.isVisible().catch(() => false))) {
		throw new StateUnavailableError(`No reports row found for "${placeName}"`);
	}
	const trigger = row.getByRole("button", { name: /build place report/i }).first();
	if (!(await trigger.isEnabled().catch(() => false))) {
		throw new StateUnavailableError(`"Build place report" disabled for "${placeName}"`);
	}
	await trigger.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible({ timeout: 10_000 });
	// Confirm the combined (audit + survey) builder rendered, not the
	// full-assessment fallback, so the capture shows the intended selection.
	await expect(dialog.getByText(/select place audit/i)).toBeVisible({ timeout: 10_000 });
}

/** Opens a dialog, then dismisses it so the closed/return state can be captured. */
export async function openThenCloseDialog(page: Page, buttonName: RegExp | string): Promise<void> {
	await openDialog(page, buttonName);
	await page.keyboard.press("Escape");
	await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });
}

/** Opens a toolbar filter popover by its trigger label (e.g. "Projects"). */
export async function openFilterPopover(page: Page, triggerName: RegExp | string): Promise<void> {
	const trigger = page.getByRole("button", { name: triggerName }).first();
	if (!(await trigger.isVisible().catch(() => false))) {
		throw new StateUnavailableError(`No "${triggerName}" filter button found`);
	}
	await trigger.click();
	await expect(page.locator('[data-slot="popover-content"]').first()).toBeVisible({ timeout: 10_000 });
}

/** Opens the first row/actions dropdown menu found on the page. */
export async function openRowMenu(page: Page): Promise<void> {
	const candidates = [
		page.getByRole("button", { name: /actions/i }).first(),
		page.getByRole("button", { name: /open menu/i }).last(),
		page.locator('[data-slot="dropdown-menu-trigger"]').first()
	];
	for (const candidate of candidates) {
		if (await candidate.isVisible().catch(() => false)) {
			await candidate.click();
			await expect(page.getByRole("menu").first()).toBeVisible({ timeout: 10_000 });
			return;
		}
	}
	throw new StateUnavailableError("No row/actions menu trigger found");
}

/** Opens the header account menu (sign out, settings). */
export async function openUserMenu(page: Page): Promise<void> {
	await page.locator("header button").last().click();
	await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeVisible({ timeout: 10_000 });
}

/** Collapses the desktop sidebar to its icon rail. */
export async function collapseSidebar(page: Page): Promise<void> {
	await page.setViewportSize({ ...VISUAL_VIEWPORT });
	const collapseButton = page.getByRole("button", { name: /collapse sidebar/i }).first();
	if (!(await isVisible(page, collapseButton))) {
		throw new StateUnavailableError("No collapse-sidebar control found");
	}
	await collapseButton.click();
	await expect(page.getByRole("button", { name: /expand sidebar/i }).first()).toBeVisible({ timeout: 10_000 });
}

/** Switches to a phone viewport and opens the slide-out navigation sheet. */
export async function openMobileNav(page: Page): Promise<void> {
	await page.setViewportSize({ ...MOBILE_VIEWPORT });
	const trigger = page.getByRole("button", { name: /open menu/i }).first();
	if (!(await isVisible(page, trigger))) {
		throw new StateUnavailableError("No open-menu control found on mobile viewport");
	}
	await trigger.click();
	await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
}

/** Waits until text is visible on the page (readiness gate for client-loaded views). */
export async function expectText(page: Page, text: RegExp | string): Promise<void> {
	await expect(page.getByText(text).first()).toBeVisible({ timeout: 30_000 });
}

/** Activates a tab by its accessible name. */
export async function openTab(page: Page, name: RegExp | string): Promise<void> {
	const tab = page.getByRole("tab", { name }).first();
	if (!(await tab.isVisible().catch(() => false))) {
		throw new StateUnavailableError(`No "${name}" tab found`);
	}
	await tab.click();
	await expect(tab).toHaveAttribute("data-state", "active", { timeout: 10_000 });
}

/** Clicks a button by accessible name and waits for any dialog it raises. */
export async function clickButton(page: Page, name: RegExp | string, expectDialog = false): Promise<void> {
	const button = page.getByRole("button", { name }).first();
	if (!(await button.isVisible().catch(() => false))) {
		throw new StateUnavailableError(`No "${name}" button found`);
	}
	await button.click();
	if (expectDialog) {
		await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
	}
}
