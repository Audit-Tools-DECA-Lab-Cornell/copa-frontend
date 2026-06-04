# Frontend — Claude Code / agent config

Repo-local agent guidance for `audit-tools-playspace-frontend`. Workspace-wide laws and memory live at the monorepo root (`AGENTS.md`, `CLAUDE.md`, `.claude/memory/`).

## Rules (keep in sync)

| File | Scope |
|---|---|
| `rules/frontend-dashboard-core.mdc` | Always-on dashboard, RBAC, API contract, shared components |
| `rules/frontend-i18n-and-exports.mdc` | i18n, reports, PDF/Excel export pipeline (glob-scoped) |

**Mirror:** the same two files exist under `.cursor/rules/` for Cursor. When you change conventions in one tree, update the other.

## Skills

Project workflow skills are defined at the workspace root (`.claude/skills/` and `.cursor/skills/`). Relevant entries for this repo:

- `frontend-dashboard-polish`
- `cross-repo-contract-change`
- `e2e-regression-check`

## Subagents

Delegate via workspace subagents (`.cursor/agents/web-dashboard-ui` or `.claude/agents/web-dashboard-ui`). Routing table: workspace `.cursor/AGENT_ROUTING.md` / `.claude/AGENT_ROUTING.md`.

## Quality gate

```bash
pnpm lint
pnpm format
pnpm exec playwright test   # when flows changed
```

Default branch: `master`.
