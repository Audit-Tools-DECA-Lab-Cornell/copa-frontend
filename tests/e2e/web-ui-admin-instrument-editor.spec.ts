import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "../helpers/auth";

test.describe("@web-ui Admin Instrument Editor", () => {
	test("can edit instrument, reorder scale options, verify question-note prompt, and check 1-based diff labeling", async ({
		page
	}) => {
		await loginAsAdmin(page);

		// Go to instruments page
		await page.getByRole("link", { name: /instruments/i }).click();
		await expect(page).toHaveURL(/\/admin\/instruments/);
		await expect(page.getByText("Version History").first()).toBeVisible({ timeout: 15_000 });

		// Click Edit & Duplicate on the first active instrument
		await page.getByTestId("edit-duplicate-button").first().click();

		// Wait for editor to load
		await expect(page.getByText("Instrument Editor").first()).toBeVisible({ timeout: 15_000 });

		// --- Test Question Notes Prompt Editing ---
		await page.getByRole("tab", { name: /Sections/i }).click();

		// Open the first section in the accordion if it's not already open
		const firstSectionTrigger = page.locator(".lucide-chevron-down").first();
		if (await firstSectionTrigger.isVisible()) {
			await firstSectionTrigger.click();
		}

		// Find the first question notes prompt and fill it
		const notesPromptLabel = page.getByText("Question Notes Prompt").first();
		await expect(notesPromptLabel).toBeVisible();

		// The EditableField renders a Label and a Textarea next to it
		// Wait, the DOM structure is: div > Label + Textarea
		// So we can just use page.locator("textarea").nth(...) or page.getByLabel("Question Notes Prompt")
		const notesInput = page.getByLabel("Question Notes Prompt").first();
		await expect(notesInput).toBeVisible();
		await notesInput.fill("E2E Test Note Prompt");

		// --- Test Scale Option Reordering ---
		await page.getByRole("tab", { name: /Scale Guidance/i }).click();

		// Find the first scale's first option's "Move down" button
		const moveDownBtn = page.getByRole("button", { name: /Move down/i }).first();
		await expect(moveDownBtn).toBeVisible();
		await moveDownBtn.click();

		// --- Verify 1-based diff labeling in Review Changes modal ---
		await page.getByRole("button", { name: "Publish" }).first().click();

		// The modal should appear
		await expect(page.getByRole("heading", { name: /Publish/i }).first()).toBeVisible();

		// Look for the "Detected Changes" area
		await expect(page.getByText(/Detected Changes/i).first()).toBeVisible();

		// We should see 1-based paths in the diff.
		// For the section question note prompt: "Section 1 → Question 1 → Notes Prompt"
		// For the scale reordering: "Scale 1 → Options" or "Scale Option 1"

		// Verify that 1-based indices are used (no "Section 0" or "Scale 0")
		const diffContent = page.locator(".font-mono.text-muted-foreground");

		// Let's assert that there is NO " 0" in the diff paths (since they are 1-based now)
		const diffTexts = await diffContent.allTextContents();

		for (const text of diffTexts) {
			expect(text).not.toMatch(/ 0/); // e.g. "Section 0" or "Question 0" or "Scale 0"
		}

		// Specifically check for Section 1 and Question 1
		const hasSectionQuestion1 = diffTexts.some(t => t.includes("Section 1") && t.includes("Question 1"));
		expect(hasSectionQuestion1).toBe(true);

		// Specifically check for Scale 1
		const hasScale1 = diffTexts.some(t => t.includes("Scale 1"));
		expect(hasScale1).toBe(true);

		// Verify the notes prompt change is captured
		await expect(page.getByText("E2E Test Note Prompt").first()).toBeVisible();

		// We do not need to save the draft to pollute the DB, the UI is verified!
		await page.getByRole("button", { name: "Cancel" }).last().click();
	});

	test("can save and delete a draft branch from version history", async ({ page }) => {
		await loginAsAdmin(page);

		await page.getByRole("link", { name: /instruments/i }).click();
		await expect(page).toHaveURL(/\/admin\/instruments/);
		await expect(page.getByText("Version History").first()).toBeVisible({ timeout: 15_000 });

		await page.getByTestId("edit-duplicate-button").first().click();
		await expect(page.getByText("Instrument Editor").first()).toBeVisible({ timeout: 15_000 });

		const draftVersionLabel = page.getByTestId("draft-version-label").first();
		const draftVersion = (await draftVersionLabel.textContent())?.trim() ?? "";
		expect(draftVersion.length).toBeGreaterThan(0);

		await page.getByRole("button", { name: /save draft/i }).click();
		await expect(page.getByText("Version History").first()).toBeVisible({ timeout: 15_000 });

		const branchToggle = page.getByRole("button", { name: /draft branches/i }).first();
		await expect(branchToggle).toBeVisible();
		await branchToggle.click();

		const draftBranch = page.getByText(`v${draftVersion}`).first();
		await expect(draftBranch).toBeVisible({ timeout: 15_000 });
		await expect(page.getByText("Draft Branch").first()).toBeVisible();

		await page.getByTestId("delete-version-button").first().click();
		await expect(page.getByRole("heading", { name: `Delete v${draftVersion}?` })).toBeVisible();
		await page.getByRole("button", { name: "Delete permanently" }).click();
		await expect(draftBranch).toBeHidden({ timeout: 15_000 });
	});

	test("added answers each get their own identifier, and a typed one is checked before it applies", async ({
		page
	}) => {
		// The 5.40 instrument was published with 69 answers all keyed `new_option`,
		// so three differently scored answers collapsed into one. This walks the
		// authoring path that produced them.
		await loginAsAdmin(page);

		await page.getByRole("link", { name: /instruments/i }).click();
		await expect(page).toHaveURL(/\/admin\/instruments/);
		await expect(page.getByText("Version History").first()).toBeVisible({ timeout: 15_000 });

		await page.getByTestId("edit-duplicate-button").first().click();
		await expect(page.getByText("Instrument Editor").first()).toBeVisible({ timeout: 15_000 });

		// Scale Guidance holds a scale whose answers are editable without expanding
		// a section accordion first.
		await page.getByRole("tab", { name: /Scale Guidance/i }).click();

		const addOption = page.getByRole("button", { name: "Add option", exact: true }).first();
		await expect(addOption).toBeVisible();

		const optionKeys = page.getByTestId("option-key");
		const startingCount = await optionKeys.count();

		for (let index = 0; index < 3; index += 1) {
			await addOption.click();
		}
		await expect(optionKeys).toHaveCount(startingCount + 3);

		// Every answer must be addressable on its own: no placeholder, no repeats.
		const keys = (await optionKeys.allTextContents()).map(value => value.trim());
		expect(keys).toHaveLength(startingCount + 3);
		expect(keys.some(key => key === "new_option")).toBe(false);
		expect(new Set(keys).size).toBe(keys.length);
		expect(keys.every(key => key.length > 0 && key !== "-")).toBe(true);

		// The three answers are scored differently, which is what the shared key destroyed.
		const labels = ["No", "Some", "A lot"];
		for (let index = 0; index < 3; index += 1) {
			const row = page.getByTestId(`scale-option-row-${(startingCount + index).toString()}`);
			await row.getByRole("textbox", { name: "Label" }).fill(labels[index]);
			await row.getByRole("spinbutton", { name: "Add" }).fill(String(index));
		}

		// An identifier can still be chosen by hand, but only before the version is
		// saved, and only after it is checked.
		const lastRow = page.getByTestId(`scale-option-row-${(startingCount + 2).toString()}`);
		await lastRow.getByRole("button", { name: /Set identifier/i }).click();

		const keyInput = page.getByLabel("Answer identifier");
		await expect(keyInput).toBeVisible();

		// While an identifier is being typed, saving is held back and says why.
		await expect(page.getByText(/Apply or cancel it before saving/i).first()).toBeVisible();
		await expect(page.getByRole("button", { name: /save draft/i })).toBeDisabled();

		await keyInput.fill("A Lot");
		await page.getByRole("button", { name: "Apply", exact: true }).click();
		await expect(page.getByText(/only lowercase letters, numbers and underscores/i)).toBeVisible();

		await keyInput.fill("a_lot_of_things");
		await page.getByRole("button", { name: "Apply", exact: true }).click();
		await expect(keyInput).toBeHidden();
		await expect(lastRow.getByTestId("option-key")).toHaveText("a_lot_of_things");

		// With nothing pending and every answer distinct, saving is offered again.
		await expect(page.getByRole("button", { name: /save draft/i })).toBeEnabled();
		await expect(page.getByText("Fix before saving")).toBeHidden();

		// Leave the database alone: discard the draft rather than saving it.
		await page.getByRole("button", { name: "Cancel" }).last().click();
		await page.getByRole("button", { name: /Discard changes/i }).click();
		await expect(page.getByText("Version History").first()).toBeVisible({ timeout: 15_000 });
	});
});
