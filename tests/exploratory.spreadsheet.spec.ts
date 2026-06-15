// pseudo-import; swap for Stagehand or Browser Use
import { Stagehand, type V3Env } from "@browserbasehq/stagehand";
import { test, TestInfo } from "@playwright/test";
import { chromium } from "playwright";

import { attachBugCollectors } from "./helpers/bugCollector";

test("ai exploratory spreadsheet run", {}, async ({ page }, testInfo) => {
	const bugs = attachBugCollectors(page);

	await page.goto("/admin/instruments");
	await page
		.getByRole("button", { name: /edit duplicate/i })
		.first()
		.click();
	await page.getByRole("tab", { name: /editable spreadsheet/i }).click();

	const charter = `
  Explore the editable spreadsheet aggressively.
  Try search, section/type/mode filters, fullscreen, inline prompt edits,
  question key edits, mode changes, construct changes, and section metadata edits.
  Attempt invalid values, very long text, multiline text, rapid repeated edits,
  keyboard-only actions, cancel flows, and switching filters while editing.
  After each action, verify the UI still responds and report any error, lag,
  broken layout, stuck edit state, missing save, or console/request failure.
  `;

	// Replace this block with your chosen agent.
	// Example pattern:
	const agent = new Stagehand({ env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY } as unknown as V3Env });
	await agent.act(charter);

	await bugs.flush(testInfo);
});
