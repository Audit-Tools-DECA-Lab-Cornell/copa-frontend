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
});
