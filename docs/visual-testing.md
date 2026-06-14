# Visual Testing

This frontend uses **Playwright as the execution layer** and **Percy as the visual review/regression layer**.

## What lives where

- `tests/visual/`
  Percy-backed visual snapshot specs for real Playspace pages.
- `tests/helpers/api.ts`
  API login helpers and browser-session seed data.
- `tests/helpers/session.ts`
  Cookie bootstrap for the current frontend auth/session model.
- `tests/helpers/visual.ts`
  Shared visual helpers for viewport setup, deterministic navigation, and Percy snapshot capture.
- `public/screenshots/`
  Curated documentation assets for the README and docs. These are **not** Percy baselines.

## Authentication model

Visual tests do **not** replay the login UI unless a scenario explicitly needs it.

Instead, the helpers:

1. Log in through the Playspace backend API with the seeded demo accounts.
2. Seed the browser cookies the frontend actually reads for protected routes:
   - `playspace_role`
   - `playspace_access_token`
   - `playspace_auditor_code`
   - `playspace_account_id`
   - `playspace_user_name`
   - `playspace_user_email`
   - `playspace_next_step`
3. Navigate directly to the requested route.

For auditor snapshots, the helper also fetches `/playspace/me/auditor-profile` so the browser session includes `playspace_auditor_code`.

## Local setup

Install dependencies and Playwright Chromium:

```bash
pnpm install
pnpm exec playwright install chromium
```

Set the API target for the seeded/shared Playspace backend:

```bash
export NEXT_PUBLIC_API_BASE_URL="https://your-seeded-api.example.com"
export E2E_API_BASE_URL="https://your-seeded-api.example.com"
```

Run the visual suite without Percy:

```bash
pnpm test:visual
```

Run the visual suite with Percy uploads:

```bash
export PERCY_TOKEN="your-percy-token"
pnpm test:visual:percy
```

Refresh the curated README screenshots that are wired into visual specs:

```bash
pnpm screenshots:web
```

That command runs the same deterministic Playwright visual flow with local screenshot capture enabled, so Percy remains the regression review path while `public/screenshots/` is refreshed only on explicit capture runs.

Useful variants:

```bash
pnpm test:visual:list
pnpm test:visual:ui
```

The visual scripts run the local Next.js app on `http://localhost:3000` with Playwright-managed startup. Because the visual command sets `E2E_BASE_URL`, Playwright does **not** silently reuse some other server process on that origin; if `:3000` is already occupied, the run fails fast instead of drifting onto the wrong app instance.

## CI setup

The GitHub Actions workflow lives at `.github/workflows/percy-visual.yml`.

Configure:

- Repository variable: `VISUAL_API_BASE_URL`
- Repository secret: `PERCY_TOKEN`

Behavior:

- On PRs and `main`, the workflow installs dependencies, installs Playwright Chromium, boots the app, and runs the visual suite.
- If `PERCY_TOKEN` is available, the workflow runs `pnpm test:visual:percy`.
- If `PERCY_TOKEN` is unavailable, the workflow still runs `pnpm test:visual` so fork PRs can execute the same deterministic flow without Percy upload access.

## Snapshot naming

Use short, human-readable names that match the UI state being reviewed:

- `Manager Dashboard`
- `Manager Projects`
- `Manager Projects - Create Dialog`
- `Manager Settings`
- `Auditor Dashboard`

Favor `"Role Page"` and `"Role Page - State"` naming over implementation details or file names.

## Adding a new visual snapshot

1. Add a new spec or test in `tests/visual/`.
2. Use `prepareVisualPage()` to bootstrap the role and route.
3. Wait for stable, user-facing selectors instead of sleeping.
4. Call `takeVisualSnapshot()` with a clear Percy snapshot name.

Example:

```ts
test("captures the manager reports page", async ({ page, request }) => {
	await prepareVisualPage(page, request, {
		role: "manager",
		route: "/manager/reports",
		waitFor: async currentPage => {
			await expect(currentPage.getByRole("heading", { name: "Reports" }).first()).toBeVisible();
		}
	});

	await takeVisualSnapshot(page, {
		name: "Manager Reports"
	});
});
```

## Percy vs `public/screenshots`

Use **Percy** for:

- PR review
- regression detection
- visual approvals and diff history

Use `public/screenshots` for:

- README images
- documentation assets
- intentionally curated marketing or product reference images

If a visual scenario should also produce a curated local image, pass `localScreenshotPath` to `takeVisualSnapshot()` so the same deterministic route/auth flow can write a file under `public/screenshots/` without inventing a second automation path.
