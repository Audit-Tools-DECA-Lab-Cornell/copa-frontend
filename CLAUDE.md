# CLAUDE — Frontend quick reference

Next.js 15 dashboard for COPA / Playspace (admin, manager, auditor). Part of the workspace monorepo; backend is `audit-tools-backend/`.

## Commands

```bash
pnpm install
pnpm dev          # localhost:3000
pnpm lint
pnpm format
pnpm build
```

## Repo-local rules

- `.claude/rules/frontend-dashboard-core.mdc` — always apply
- `.claude/rules/frontend-i18n-and-exports.mdc` — i18n + exports + reports

Cursor mirror: `.cursor/rules/` (same filenames — keep both in sync).

## Workspace context

| Topic | Where |
|---|---|
| Laws + commands | `../AGENTS.md` |
| Facts & gotchas | `../.claude/memory/frontend.md` |
| Agent routing | `../.claude/AGENT_ROUTING.md` → `web-dashboard-ui` |
| E2e | `tests/e2e/` (Playwright) |

## Hot paths

- `src/lib/api/playspace.ts` — API client types
- `middleware.ts` — role guards
- `messages/en.json` + `messages/de.json` — i18n (both required)
- `src/lib/export/**` — PDF/Excel pipeline
- `src/components/dashboard/**` — shared tables, reports, filters
