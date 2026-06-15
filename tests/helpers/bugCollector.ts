import fs from "node:fs/promises";
import path from "node:path";

import type { Page, TestInfo } from "@playwright/test";

export type CollectedIssue = {
	type: "console" | "pageerror" | "requestfailed" | "slow-interaction";
	message: string;
	url?: string;
	extra?: Record<string, unknown>;
};

export function attachBugCollectors(page: Page) {
	const issues: CollectedIssue[] = [];

	page.on("console", msg => {
		if (msg.type() === "error") {
			issues.push({
				type: "console",
				message: msg.text()
			});
		}
	});

	page.on("pageerror", err => {
		issues.push({
			type: "pageerror",
			message: err.message
		});
	});

	page.on("requestfailed", req => {
		issues.push({
			type: "requestfailed",
			message: req.failure()?.errorText || "request failed",
			url: req.url(),
			extra: { method: req.method() }
		});
	});

	return {
		issues,
		async measure<T>(label: string, fn: () => Promise<T>, maxMs = 1500): Promise<T> {
			const start = Date.now();
			const result = await fn();
			const duration = Date.now() - start;
			if (duration > maxMs) {
				issues.push({
					type: "slow-interaction",
					message: `${label} took ${duration}ms`,
					extra: { duration, maxMs }
				});
			}
			return result;
		},
		async flush(testInfo: TestInfo) {
			const out = path.join(testInfo.outputDir, "issues.json");
			await fs.writeFile(out, JSON.stringify(issues, null, 2), "utf8");
			await testInfo.attach("issues.json", { path: out, contentType: "application/json" });
		}
	};
}
