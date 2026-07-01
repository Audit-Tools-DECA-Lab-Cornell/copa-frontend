# AGENTS.md - Playspace web dashboard

Next.js 15 App Router dashboard (admin, manager, auditor). Nearby repos in the workspace: `../../audit-tools-backend/` and `../copa-mobile/`.

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm format
pnpm build
pnpm exec playwright test   # tests/e2e/ when API or flows change
```

## Repo-local agent config

| Path | Purpose |
|------|-------|
| `CLAUDE.md` | Quick reference for Claude Code |
| `.claude/rules/*.mdc` | Scoped rules (source of truth) |
| `.cursor/rules/*.mdc` | Cursor mirror - keep filenames in sync with `.claude/rules/` |

## Workspace laws and memory

| Topic | Path (monorepo root) |
|-------|----------------------|
| Hard rules, testing policy | `../AGENTS.md` |
| Frontend facts | `../.claude/memory/frontend.md` |
| Subagent routing | `../.cursor/AGENT_ROUTING.md` → `web-dashboard-ui` |

**NEVER circumvent restricted env vars or secret files.** Access to `.env`, `.env.*`, and any secret file is restricted on purpose. If a direct read is denied, that denial is **final** - do not reach the same values by any indirect route: no `os.getenv`/`printenv`/`env` dumps, no scripts that print, log, mask, hash, transform, or compare environment variables, no URL/connection-string parsing that echoes host/port/db/credentials, no writing secrets to a file to read later. Masking the password does not make it acceptable - exposing host/db/username still defies the rule. If a restricted value is genuinely needed, STOP and ask the user; never engineer around the control.

## Hot paths

- `src/lib/api/playspace.ts` - API client
- `src/lib/api/playspace-types.ts` - shared API type definitions
- `src/lib/api/playspace-server.ts` - server-side API client
- `middleware.ts` - role-based route guards
- `messages/en.json`, `messages/de.json` - i18n (update both)
- `src/lib/export/` - PDF/Excel exports
- `src/components/dashboard/` - tables, reports, filters, instrument editor
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
- `tests/e2e/` - Playwright specs

## Conventions

- Path alias: `@/*` → `./src/*`
- Backend contract changes: update Playwright e2e and coordinate with mobile Maestro flows per workspace `AGENTS.md`
- UI copy: user-facing language only; no internal model names in the UI
