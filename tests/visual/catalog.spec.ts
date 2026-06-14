import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { type APIRequestContext, expect, test } from "@playwright/test";

import { waitForStableVisualPage } from "../helpers/visual-actions";
import {
	captureViewportScrollFrames,
	isLocalScreenshotCaptureEnabled,
	prepareVisualPage,
	takeVisualSnapshot,
	VISUAL_VIEWPORT
} from "../helpers/visual";
import { buildSeededVisualRoutes } from "../helpers/visual-routes";
import { captureCatalog } from "./catalog";
import { StateUnavailableError } from "./catalog/steps";
import type { CaptureTarget, SeededIds } from "./catalog/types";

const SCREENSHOTS_ROOT = path.join("public", "screenshots");

interface ManifestEntry {
	readonly area: string;
	readonly state: string;
	readonly file: string;
	readonly label: string;
	readonly scrolled: boolean;
}

const manifest: ManifestEntry[] = [];

let cachedIds: Promise<SeededIds> | null = null;

async function resolveIds(request: APIRequestContext): Promise<SeededIds> {
	if (!cachedIds) {
		cachedIds = buildSeededVisualRoutes(request).then(routes => routes.ids);
	}
	return cachedIds;
}

/** Path under public/screenshots for a state, without extension. A single
 * frame becomes "<base>.png"; a scrolling page becomes a "<base>/" folder. */
function stateBasePath(target: CaptureTarget, index: number, name: string): string {
	const ordinal = String(index + 1).padStart(2, "0");
	return path.posix.join(...target.segments, `${ordinal}-${name}`);
}

async function navigateUnauthenticated(
	page: Parameters<typeof waitForStableVisualPage>[0],
	route: string
): Promise<void> {
	await page.context().clearCookies();
	await page.setViewportSize({ ...VISUAL_VIEWPORT });
	await page.goto(new URL(route, process.env.E2E_BASE_URL ?? "http://localhost:3000").toString(), {
		waitUntil: "domcontentloaded"
	});
	await page.waitForLoadState("networkidle").catch(() => undefined);
}

for (const target of captureCatalog) {
	const area = target.segments.join("/");

	test.describe(area, () => {
		target.states.forEach((state, index) => {
			test(state.name, async ({ page, request }) => {
				const ids = await resolveIds(request);
				const route = target.route(ids);
				test.skip(route === null, "seed data for this route is unavailable");
				if (route === null) {
					return;
				}

				if (target.unauthenticated) {
					await navigateUnauthenticated(page, route);
				} else {
					await prepareVisualPage(page, request, {
						role: target.role,
						route,
						waitFor: async currentPage => {
							if (target.waitFor) {
								await target.waitFor({ page: currentPage, ids });
							} else {
								await waitForStableVisualPage(currentPage);
							}
						}
					});
				}

				if (state.setup) {
					try {
						await state.setup({ page, ids });
					} catch (error) {
						if (state.optional && error instanceof StateUnavailableError) {
							test.skip(true, `state unavailable: ${error.message}`);
							return;
						}
						throw error;
					}
				}

				// Percy visual-regression snapshot (full page) for CI; no-op locally.
				await takeVisualSnapshot(page, { name: state.label });

				// Local capture: viewport-sized frames at MacBook Pro 16". A page that
				// fits writes one file; a taller page writes a folder of scroll frames.
				if (isLocalScreenshotCaptureEnabled()) {
					const baseRelPath = stateBasePath(target, index, state.name);
					const result = await captureViewportScrollFrames(page, baseRelPath);
					for (const file of result.files) {
						manifest.push({
							area,
							state: state.name,
							file,
							label: state.label,
							scrolled: result.scrolled
						});
					}
				}
			});
		});
	});
}

test.afterAll(async () => {
	if (manifest.length === 0) {
		return;
	}
	const outputPath = path.resolve(process.cwd(), SCREENSHOTS_ROOT, "manifest.json");
	await mkdir(path.dirname(outputPath), { recursive: true });
	const sorted = [...manifest].sort((a, b) => a.file.localeCompare(b.file));
	await writeFile(outputPath, `${JSON.stringify({ captures: sorted }, null, 2)}\n`, "utf8");
	expect(sorted.length).toBeGreaterThan(0);
});
