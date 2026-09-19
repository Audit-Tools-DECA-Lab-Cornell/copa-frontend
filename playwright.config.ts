import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const parsedBaseUrl = new URL(baseURL);
const isLocalBaseUrl = ["localhost", "127.0.0.1"].includes(parsedBaseUrl.hostname);
const localPort = parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80");

/**
 * The API base URL the browser app should use: an explicit NEXT_PUBLIC_API_BASE_URL
 * wins, otherwise the seeding URL, so a single `export E2E_API_BASE_URL=...`
 * configures both sides of the run.
 */
const appApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.E2E_API_BASE_URL?.trim() || undefined;

export default defineConfig({
	testDir: "./tests/",
	timeout: 60_000,
	expect: { timeout: 60_000 },
	fullyParallel: false,
	retries: 1,
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		actionTimeout: 60_000,
		navigationTimeout: 60_000
	},
	projects: [
		{
			name: "chromium",
			testIgnore: /.*tests\/(e2e|visual)\/.*/,
			use: { ...devices["Desktop Chrome"] }
		},
		{ name: "manager-chromium", testMatch: /.*manager.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "auditor-chromium", testMatch: /.*auditor.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{ name: "auditor-mobile-web", testMatch: /.*auditor.*\.spec\.ts/, use: { ...devices["iPhone 15"] } },
		{ name: "reports-chromium", testMatch: /.*reports.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{
			name: "account-deletion-chromium",
			testMatch: /.*account-deletion.*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] }
		},
		{ name: "web-ui-chromium", testMatch: /.*web-ui.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{
			name: "visual-chromium",
			testMatch: /.*visual\/.*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				colorScheme: "light",
				// MacBook Pro 16" default scaled resolution ("looks like 1728 × 1117"),
				// rendered at the display's 2× pixel density for Retina-accurate PNGs.
				viewport: {
					width: 1728,
					height: 1117
				},
				deviceScaleFactor: 2
			}
		}
	],
	webServer: isLocalBaseUrl
		? {
				command: `pnpm exec next dev --hostname 127.0.0.1 --port ${localPort}`,
				url: baseURL,
				reuseExistingServer: true,
				timeout: 120_000,
				// The suites drive two API clients that must reach the same backend: the
				// test process seeds through E2E_API_BASE_URL, while the browser app reads
				// NEXT_PUBLIC_API_BASE_URL and otherwise falls back to a local FastAPI.
				// CI sets both from one variable; locally only E2E_API_BASE_URL is
				// documented, so hand it to the dev server rather than let the app point
				// somewhere the seeded ids do not exist.
				env: appApiBaseUrl === undefined ? {} : { NEXT_PUBLIC_API_BASE_URL: appApiBaseUrl }
			}
		: undefined
});
