import { mkdir } from "node:fs/promises";
import path from "node:path";

import { type APIRequestContext, type Page } from "@playwright/test";
import percySnapshot from "@percy/playwright";

import { createBrowserSessionSeed, type BrowserSessionRole } from "./api";
import { seedBrowserSession } from "./session";

/**
 * MacBook Pro 16" default scaled resolution ("looks like 1728 × 1117").
 * Screenshots represent exactly what fits on that screen; taller pages are
 * captured as sequential scroll frames.
 */
export const VISUAL_VIEWPORT = {
	width: 1728,
	height: 1117
} as const;

const DEFAULT_PERCY_WIDTHS = [VISUAL_VIEWPORT.width];
const LOCAL_SCREENSHOT_CAPTURE_ENABLED = ["1", "true", "yes"].includes(
	(process.env.CAPTURE_LOCAL_SCREENSHOTS ?? "").trim().toLowerCase()
);
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

const SCREENSHOTS_ROOT = path.join("public", "screenshots");

/**
 * Returns a curated docs screenshot path only for explicit local screenshot runs.
 * Regular Percy visual tests stay read-only for public assets.
 */
export function getLocalScreenshotPath(fileName: string): string | undefined {
	return LOCAL_SCREENSHOT_CAPTURE_ENABLED ? path.join(SCREENSHOTS_ROOT, fileName) : undefined;
}

/** Whether this run writes local PNGs (set by the screenshots:web script). */
export function isLocalScreenshotCaptureEnabled(): boolean {
	return LOCAL_SCREENSHOT_CAPTURE_ENABLED;
}

function getSnapshotTargetUrl(route: string): string {
	return new URL(route, process.env.E2E_BASE_URL ?? "http://localhost:3000").toString();
}

function isPercyEnabled(): boolean {
	return Boolean(process.env.PERCY_TOKEN);
}

// Bounded so pages that never reach true network idle (the auditor execute
// form holds a connection open) stop blocking after a short settle window.
const NETWORK_IDLE_TIMEOUT = 5_000;

async function stabilizeVisualState(page: Page): Promise<void> {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.addStyleTag({ content: DEFAULT_VISUAL_STYLE });
	await page.waitForLoadState("domcontentloaded");
	await page.waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT }).catch(() => undefined);
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

// Settle time after each scroll step so lazy content and sticky headers redraw.
const SCROLL_SETTLE_MS = 200;
// A page within this many CSS px of fitting the screen counts as a single frame.
const SCROLL_EPSILON = 24;
// Safety cap on scroll frames per state.
const MAX_SCROLL_FRAMES = 40;

export interface ViewportScrollCaptureResult {
	/** Paths written, relative to public/screenshots. */
	readonly files: readonly string[];
	/** True when the page was taller than the screen and split into frames. */
	readonly scrolled: boolean;
}

/**
 * Capture the page as it appears on a MacBook Pro 16" screen.
 *
 * - Fits on screen → one viewport-sized file `<baseRelPath>.png`.
 * - Taller than the screen → a folder `<baseRelPath>/` with sequential frames
 *   `01.png`, `02.png`, … each a screenful while scrolling to the bottom.
 *
 * `baseRelPath` is the path under public/screenshots without an extension,
 * e.g. "admin/reports/01-overview". Scroll is measured on the window; modals
 * that lock body scroll are correctly captured as a single frame.
 */
export async function captureViewportScrollFrames(
	page: Page,
	baseRelPath: string
): Promise<ViewportScrollCaptureResult> {
	await stabilizeVisualState(page);
	const root = path.resolve(process.cwd(), SCREENSHOTS_ROOT);

	// Any open overlay (dialog, dropdown menu, or popover) is captured in a single
	// frame at its current position; scrolling would move or dismiss it. This
	// covers non-modal popovers that do not lock page scroll.
	const overlayOpen = await page.evaluate(
		() =>
			document.querySelector(
				'[role="dialog"],[role="menu"],[role="listbox"],[data-slot="popover-content"],[data-radix-popper-content-wrapper]'
			) !== null
	);

	// Only reset to the top for full-page views; an overlay's trigger was already
	// scrolled into view, so keep that position.
	if (!overlayOpen) {
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForTimeout(SCROLL_SETTLE_MS);
	}

	const layout = await page.evaluate(() => {
		const doc = document.documentElement;
		const bodyStyle = getComputedStyle(document.body);
		const docStyle = getComputedStyle(doc);
		const scrollLocked =
			document.body.hasAttribute("data-scroll-locked") ||
			bodyStyle.overflowY === "hidden" ||
			bodyStyle.overflow === "hidden" ||
			docStyle.overflowY === "hidden" ||
			docStyle.overflow === "hidden";
		return { scrollHeight: doc.scrollHeight, clientHeight: doc.clientHeight, scrollLocked };
	});

	const needsScroll =
		!overlayOpen && !layout.scrollLocked && layout.scrollHeight - layout.clientHeight > SCROLL_EPSILON;

	if (!needsScroll) {
		const relativePath = `${baseRelPath}.png`;
		const outputPath = path.join(root, relativePath);
		await mkdir(path.dirname(outputPath), { recursive: true });
		await page.screenshot({ path: outputPath });
		return { files: [relativePath], scrolled: false };
	}

	const files: string[] = [];
	for (let frame = 1; frame <= MAX_SCROLL_FRAMES; frame += 1) {
		const relativePath = path.posix.join(baseRelPath, `${String(frame).padStart(2, "0")}.png`);
		const outputPath = path.join(root, relativePath);
		await mkdir(path.dirname(outputPath), { recursive: true });
		await page.screenshot({ path: outputPath });
		files.push(relativePath);

		const beforeY = await page.evaluate(() => window.scrollY);
		if (beforeY + layout.clientHeight >= layout.scrollHeight - SCROLL_EPSILON) {
			break;
		}
		await page.evaluate(step => window.scrollBy(0, step), layout.clientHeight);
		await page.waitForTimeout(SCROLL_SETTLE_MS);
		const afterY = await page.evaluate(() => window.scrollY);
		if (afterY <= beforeY + 1) {
			break;
		}
	}

	return { files, scrolled: files.length > 1 };
}
