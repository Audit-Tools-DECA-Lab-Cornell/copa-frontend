import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/auth";
import { attachBugCollectors } from "./helpers/bugCollector";
import { cancelTextCellEdit, editTextCell, openEditableSpreadsheet } from "./helpers/spreadsheet";

test.describe("Instrument spreadsheet", () => {
	test.beforeEach(async ({ page }) => {
		await loginAsAdmin(page);
	});

	test("search, filters, fullscreen, and inline edit work", async ({ page }, testInfo) => {
		const bugs = attachBugCollectors(page);

		await bugs.measure("open spreadsheet", async () => {
			await openEditableSpreadsheet(page);
		});

		await bugs.measure("verify table loaded", async () => {
			await expect(page.getByTestId("spreadsheet-table-body")).toBeVisible();
			await expect(page.locator('[data-testid^="row-question-"]').first()).toBeVisible();
		});

		await bugs.measure("search filters rows", async () => {
			const searchInput = page.getByTestId("spreadsheet-search");
			await searchInput.fill("play");
			await page.waitForTimeout(300);
			await expect(page.locator('[data-testid^="row-question-"]').first()).toBeVisible();
			await searchInput.clear();
		});

		await bugs.measure("toggle fullscreen on", async () => {
			await page.getByTestId("spreadsheet-fullscreen-toggle").click();
		});

		await bugs.measure("toggle fullscreen off", async () => {
			await page.getByTestId("spreadsheet-fullscreen-toggle").click();
		});

		await bugs.measure("edit prompt cell", async () => {
			const promptCell = page.getByTestId("editable-cell-q-0-0-prompt");
			await expect(promptCell).toBeVisible();
			const before = (await promptCell.textContent())?.trim() || "";
			const next = `${before} [e2e]`;

			await editTextCell(page, "editable-cell-q-0-0-prompt", next);
			await expect(promptCell).toContainText("[e2e]");
		});

		await bugs.measure("cancel edit preserves original", async () => {
			const keyCell = page.getByTestId("editable-cell-q-0-0-question_key");
			await expect(keyCell).toBeVisible();
			const before = (await keyCell.textContent())?.trim() || "";
			await cancelTextCellEdit(page, "editable-cell-q-0-0-question_key", "temp-cancel-value");
			await expect(keyCell).toContainText(before);
		});

		expect.soft(bugs.issues, JSON.stringify(bugs.issues, null, 2)).toEqual([]);
		await bugs.flush(testInfo);
	});

	test("survives nasty prompt payloads", async ({ page }, testInfo) => {
		const bugs = attachBugCollectors(page);
		await openEditableSpreadsheet(page);

		const payloads = [
			"",
			"a",
			"x".repeat(5000),
			"   leading and trailing   ",
			"Line 1\nLine 2\nLine 3",
			"**bold** markdown test",
			"<script>alert(1)</script>",
			"😀 🚀 漢字 العربية"
		];

		for (const payload of payloads) {
			await bugs.measure(
				`edit payload ${payload.slice(0, 20)}`,
				async () => {
					await editTextCell(page, "editable-cell-q-0-0-prompt", payload, "button");
					await expect(page.getByTestId("editable-cell-q-0-0-prompt")).toBeVisible();
				},
				5000
			);
		}

		expect.soft(bugs.issues, JSON.stringify(bugs.issues, null, 2)).toEqual([]);
		await bugs.flush(testInfo);
	});
});
