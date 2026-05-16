import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const parsedBaseUrl = new URL(baseURL);
const isLocalBaseUrl = ["localhost", "127.0.0.1"].includes(parsedBaseUrl.hostname);
const localPort = parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80");

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
		{ name: "web-ui-chromium", testMatch: /.*web-ui.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
		{
			name: "visual-chromium",
			testMatch: /.*tests\/visual\/.*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				colorScheme: "light",
				viewport: {
					width: 1440,
					height: 1024
				}
			}
		}
	],
	webServer: isLocalBaseUrl
		? {
			command: `pnpm exec next dev --hostname 127.0.0.1 --port ${localPort}`,
			url: baseURL,
			reuseExistingServer: true,
			timeout: 120_000
		}
		: undefined
});
