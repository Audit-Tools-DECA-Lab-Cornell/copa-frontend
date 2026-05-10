import { mkdir } from "node:fs/promises";
import path from "node:path";

import { type APIRequestContext, type Page } from "@playwright/test";
import percySnapshot from "@percy/playwright";

import { createBrowserSessionSeed, type BrowserSessionRole } from "./api";
import { seedBrowserSession } from "./session";

export const VISUAL_VIEWPORT = {
	width: 1440,
	height: 1024
} as const;

const DEFAULT_PERCY_WIDTHS = [VISUAL_VIEWPORT.width];
const DEFAULT_MIN_HEIGHT = VISUAL_VIEWPORT.height;
const DEFAULT_VISUAL_STYLE = `
	*, *::before, *::after {
		animation-duration: 0s !important;
		animation-delay: 0s !important;
		transition-duration: 0s !important;
		transition-delay: 0s !important;
		caret-color: transparent !important;
	}
`;

export interface PrepareVisualPageOptions {
	role: BrowserSessionRole;
	route: string;
	waitFor: (page: Page) => Promise<void>;
}

export interface TakeVisualSnapshotOptions {
	name: string;
	minHeight?: number;
	percyCSS?: string;
	localScreenshotPath?: string;
}

function getSnapshotTargetUrl(route: string): string {
	return new URL(route, process.env.E2E_BASE_URL ?? "http://localhost:3000").toString();
}

function isPercyEnabled(): boolean {
	return Boolean(process.env.PERCY_TOKEN);
}

async function stabilizeVisualState(page: Page): Promise<void> {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.addStyleTag({ content: DEFAULT_VISUAL_STYLE });
	await page.waitForLoadState("domcontentloaded");
	await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function retryTransientLoadState(page: Page): Promise<boolean> {
	const retryLabels = ["Try again", "Refresh"] as const;

	for (const label of retryLabels) {
		const button = page.getByRole("button", { name: label });
		if (!(await button.isVisible().catch(() => false))) {
			continue;
		}

		await button.click();
		await stabilizeVisualState(page);
		return true;
	}

	return false;
}

/**
 * Boots a protected route into a deterministic visual state using the
 * repository's cookie-backed auth model instead of replaying the login UI.
 */
export async function prepareVisualPage(
	page: Page,
	request: APIRequestContext,
	options: PrepareVisualPageOptions
): Promise<void> {
	await page.setViewportSize(VISUAL_VIEWPORT);

	const session = await createBrowserSessionSeed(request, options.role);
	await seedBrowserSession(page.context(), session);

	await page.goto(getSnapshotTargetUrl(options.route), {
		waitUntil: "domcontentloaded"
	});
	await stabilizeVisualState(page);

	try {
		await options.waitFor(page);
	} catch (error) {
		const recovered = await retryTransientLoadState(page);
		if (!recovered) {
			throw error;
		}
		await options.waitFor(page);
	}
}

/**
 * Captures a Percy snapshot when Percy is enabled and can optionally save a
 * matching local screenshot for curated docs assets.
 */
export async function takeVisualSnapshot(page: Page, options: TakeVisualSnapshotOptions): Promise<void> {
	await stabilizeVisualState(page);

	if (options.localScreenshotPath) {
		const outputPath = path.resolve(process.cwd(), options.localScreenshotPath);
		await mkdir(path.dirname(outputPath), { recursive: true });
		await page.screenshot({
			fullPage: true,
			path: outputPath
		});
	}

	if (!isPercyEnabled()) {
		return;
	}

	await percySnapshot(page, options.name, {
		widths: DEFAULT_PERCY_WIDTHS,
		minHeight: options.minHeight ?? DEFAULT_MIN_HEIGHT,
		percyCSS: options.percyCSS ?? DEFAULT_VISUAL_STYLE
	});
}
