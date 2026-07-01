# CLAUDE - Frontend quick reference

Next.js 15 dashboard for COPA / Playspace (admin, manager, auditor). Part of the workspace layout under `playspace/`; the shared backend lives at `../../audit-tools-backend/`.

## Commands

```bash
pnpm install
pnpm dev          # localhost:3000
pnpm lint
pnpm format
pnpm build
```

## Repo-local rules

- `.claude/rules/frontend-dashboard-core.mdc` - always apply
- `.claude/rules/frontend-i18n-and-exports.mdc` - i18n + exports + reports

**NEVER circumvent restricted env vars or secret files.** Access to `.env`, `.env.*`, and any secret file is restricted on purpose. If a direct read is denied, that denial is **final** - do not reach the same values by any indirect route: no `os.getenv`/`printenv`/`env` dumps, no scripts that print, log, mask, hash, transform, or compare environment variables, no URL/connection-string parsing that echoes host/port/db/credentials, no writing secrets to a file to read later. Masking the password does not make it acceptable - exposing host/db/username still defies the rule. If a restricted value is genuinely needed, STOP and ask the user; never engineer around the control.

Cursor mirror: `.cursor/rules/` (same filenames - keep both in sync).

## Workspace context

| Topic | Where |
|---|---|
| Laws + commands | `../AGENTS.md` |
| Facts & gotchas | `../.claude/memory/frontend.md` |
| Agent routing | `../.claude/AGENT_ROUTING.md` → `web-dashboard-ui` |
| E2e | `tests/e2e/` (Playwright) |

## Hot paths

- `src/lib/api/playspace.ts` - API client
- `src/lib/api/playspace-types.ts` - shared API type definitions
- `src/lib/api/playspace-server.ts` - server-side API client
- `middleware.ts` - role guards
- `messages/en.json` + `messages/de.json` - i18n (both required)
- `src/lib/export/**` - PDF/Excel pipeline
- `src/components/dashboard/**` - shared tables, reports, filters, instrument editor
- `src/components/dashboard/instruments/` - instrument editor submodule (editors, version history, spreadsheet view)
- `src/components/dashboard/raw-data-export.tsx` - raw data export component (admin + manager)
- `src/components/dashboard/bug-reports/` - admin bug reports dashboard (table, badges, screenshot, known-issues manager)
- `src/components/bug-report/` - in-app bug reporting (dialog, launcher, known-issue match)
- `src/lib/bug-report/` - bug report feature flags and context
- `src/lib/design-system.ts` - design tokens and CSS custom properties
- `src/lib/cloudinary-images.ts` + `src/lib/asset-url.ts` - CDN asset types and URL builders
- `src/components/cdn/` - Cloudinary upload and image display components
- `src/components/dashboard/asset-gallery.tsx` - asset browser (admin)
- `public/asset-index.json` - asset manifest (generated; do not edit manually)

## Model Configuration

Recommended default: `claude-sonnet-4-6` with high effort (stronger reasoning; higher cost and latency than smaller models).
Smaller/faster models trade quality for speed and cost - pick what fits the task.
Pin your choice (`/model` in Claude Code) so upstream default changes do not silently change behavior.
