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

<!-- caliber:managed:pre-commit -->
## Before Committing

**IMPORTANT:** Before every git commit, you MUST ensure Caliber syncs agent configs with the latest code changes.

First, check if the pre-commit hook is already installed:
```bash
grep -q "caliber" .git/hooks/pre-commit 2>/dev/null && echo "hook-active" || echo "no-hook"
```

- If **hook-active**: the hook handles sync automatically - just commit normally. Tell the user: "Caliber will sync your agent configs automatically via the pre-commit hook."
- If **no-hook**: run Caliber manually before committing:
  1. Tell the user: "Caliber: Syncing agent configs with your latest changes..."
  2. Run: `caliber refresh && git add CALIBER_LEARNINGS.md CLAUDE.md .claude/ .cursor/ .cursorrules AGENTS.md .agents/ 2>/dev/null`
  3. After it completes, briefly tell the user what Caliber updated. Then proceed with the commit.

**Valid `caliber refresh` options:** `--quiet` (suppress output) and `--dry-run` (preview without writing). Do not pass any other flags - options like `--auto-approve`, `--debug`, or `--force` do not exist and will cause errors.

**`caliber config`** takes no flags - it runs an interactive provider setup. Do not pass `--provider`, `--api-key`, or `--endpoint`.

If `caliber` is not found, read `.agents/skills/setup-caliber/SKILL.md` and follow its instructions to install Caliber.
<!-- /caliber:managed:pre-commit -->

<!-- caliber:managed:learnings -->
## Session Learnings

Read `CALIBER_LEARNINGS.md` for patterns and anti-patterns learned from previous sessions.
These are auto-extracted from real tool usage - treat them as project-specific rules.
<!-- /caliber:managed:learnings -->

<!-- caliber:managed:model-config -->
## Model Configuration

Recommended default: `claude-sonnet-4-6` with high effort (stronger reasoning; higher cost and latency than smaller models).
Smaller/faster models trade quality for speed and cost - pick what fits the task.
Pin your choice (`/model` in Claude Code, or `CALIBER_MODEL` when using Caliber with an API provider) so upstream default changes do not silently change behavior.

<!-- /caliber:managed:model-config -->

<!-- caliber:managed:sync -->
## Context Sync

This project uses [Caliber](https://github.com/caliber-ai-org/ai-setup) to keep AI agent configs in sync across Claude Code, Cursor, Copilot, and Codex.
Configs update automatically before each commit via `caliber refresh`.
If the pre-commit hook is not set up, read `.agents/skills/setup-caliber/SKILL.md` and follow the setup instructions.
<!-- /caliber:managed:sync -->
