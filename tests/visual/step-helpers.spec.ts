import { expect, test } from "@playwright/test";

import { assertApiBasesMatchSeeding, trackPlayspaceApiBases } from "../helpers/visual";
import { openDialog, StateUnavailableError } from "./catalog/steps";

/**
 * The catalog's steps probe with `count()`, `isVisible()` and `isEnabled()`,
 * none of which retry. The readiness gate they run behind only waits for
 * `main`, which renders while a table is still loading, so a step that probes
 * immediately reports a trigger that exists as missing - failing a required
 * state and silently skipping an optional one. It shows up only on a slow or
 * cold run, which makes it expensive to diagnose from a CI log.
 *
 * These run against synthetic pages rather than the app so the timing is
 * explicit and they need no backend.
 */

/** A page whose trigger appears late, like a table still resolving its query. */
function lateTriggerPage(delayMs: number): string {
	return `data:text/html,
		<main><div id="root"></div></main>
		<script>
			setTimeout(() => {
				const button = document.createElement("button");
				button.textContent = "New project";
				button.onclick = () => {
					const dialog = document.createElement("div");
					dialog.setAttribute("role", "dialog");
					dialog.textContent = "dialog open";
					document.body.appendChild(dialog);
				};
				document.getElementById("root").appendChild(button);
			}, ${delayMs});
		</script>`;
}

test("openDialog waits for a trigger that renders after the page gate", async ({ page }) => {
	await page.goto(lateTriggerPage(2_500));
	await openDialog(page, /new project/i);
	await expect(page.getByRole("dialog")).toBeVisible();
});

test("openDialog still reports a genuinely absent trigger as unavailable", async ({ page }) => {
	await page.goto("data:text/html,<main><p>no triggers here</p></main>");
	await expect(openDialog(page, /new project/i)).rejects.toThrow(StateUnavailableError);
});

const API_BASE = "https://api.example.com/v1";

for (const browserBase of ["https://other.example.com/v1", "https://api.example.com/v2"]) {
	test(`API guard rejects browser requests to ${browserBase}`, async ({ page }) => {
		await page.route("**/*", route => route.fulfill({ body: "{}", contentType: "application/json" }));
		const bases = trackPlayspaceApiBases(page);
		await page.goto("https://app.example.com");
		await page.evaluate(url => fetch(url), `${browserBase}/playspace/manager/projects`);

		expect(() => assertApiBasesMatchSeeding(bases, "/manager/projects", API_BASE)).toThrow(/different backend/);
	});
}

test("API guard accepts the configured prefix with a canonical host and port", async ({ page }) => {
	await page.route("**/*", route => route.fulfill({ body: "{}", contentType: "application/json" }));
	const bases = trackPlayspaceApiBases(page);
	await page.goto("https://app.example.com");
	await page.evaluate(url => fetch(url), `${API_BASE}/playspace/manager/projects`);

	expect(() =>
		assertApiBasesMatchSeeding(bases, "/manager/projects", "https://API.example.com:443/v1/")
	).not.toThrow();
});

test("API guard ignores document routes and Playspace paths in query strings", async ({ page }) => {
	await page.route("**/*", route => route.fulfill({ body: "<main>Ready</main>", contentType: "text/html" }));
	const bases = trackPlayspaceApiBases(page);
	await page.goto("https://app.example.com/playspace/help");
	await page.evaluate(() => fetch("https://app.example.com/search?next=/playspace/manager/projects"));

	expect(() => assertApiBasesMatchSeeding(bases, "/manager/projects", API_BASE)).not.toThrow();
});
