## Comprehensive Outdoor Playspace Audit (COPA) Tool (Frontend)

Enterprise-grade frontend for the **Comprehensive Outdoor Playspace Audit (COPA) Tool**.

This app is part of a hierarchical Audit Management System (Account → Projects → Places → Audits) and is designed to integrate with a FastAPI backend.

### Tech stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **UI**: shadcn/ui
- **Data**: TanStack Query (React Query) + Axios
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

### Screenshots

#### Dashboard Pages

| Manager Dashboard | Auditor Dashboard | Administrator Dashboard |
| ----------------- | ----------------- | ----------------------- |
| ![Manager Dashboard](public/screenshots/manager__manager__dashboard.png) | ![Auditor Dashboard](public/screenshots/auditor__auditor__dashboard.png) | ![Admin Dashboard](public/screenshots/admin__admin__dashboard.png) |

<details>
  <summary>Manager Dashboard Pages</summary>

  | ![Manager Projects](public/screenshots/manager__manager__projects.png) | ![Manager Places](public/screenshots/manager__manager__places.png) |
  | :---: | :---: |
  | **Manager Projects** | **Manager Places** |
  | ![Manager Place](public/screenshots/manager__manager__places__placeId_projectId.png) | ![Manager Project](public/screenshots/manager__manager__projects__projectId.png) |
  | **Manager Place** | **Manager Project** |
  | ![Manager Audits](public/screenshots/manager__manager__audits.png) | ![Manager Auditor](public/screenshots/manager__manager__auditors.png) |
  | **Manager Audits** | **Manager Auditor** |
  | ![Manager Assignment](public/screenshots/manager__manager__assignments.png) | ![Manager Settings](public/screenshots/manager__settings.png) |
  | **Manager Assignment** | **Manager Settings** |

</details>

<details>
  <summary>Auditor Dashboard Pages</summary>

  | ![Auditor Execute Page](public/screenshots/auditor__auditor__execute__placeId_projectId.png) | ![Auditor Places Page](public/screenshots/auditor__auditor__places.png) |
  | :---: | :---: |
  | **Auditor Execute Page** | **Auditor Places Page** |
  | ![Auditor Reports Page](public/screenshots/auditor__auditor__reports.png) | ![Auditor Report](public/screenshots/auditor__auditor__reports__auditId.png) |
  | **Auditor Reports Page** | **Auditor Report** |
  | ![Auditor Settings](public/screenshots/auditor__settings.png) | |
  | **Auditor Settings** | |

</details>

<details>
  <summary>Administrator Dashboard Pages</summary>

  | ![Administrator Accounts](public/screenshots/admin__admin__accounts.png) | ![Administrator Projects](public/screenshots/admin__admin__projects.png) |
  | :---: | :---: |
  | **Administrator Accounts** | **Administrator Projects** |
  | ![Administrator Places](public/screenshots/admin__admin__places.png) | ![Administrator Audits](public/screenshots/admin__admin__audits.png) |
  | **Administrator Places** | **Administrator Audits** |
  | ![Administrator Auditor](public/screenshots/admin__admin__auditors.png) | ![Administrator System](public/screenshots/admin__admin__system.png) |
  | **Administrator Auditor** | **Administrator System** |
  | ![Administrator Settings](public/screenshots/admin__settings.png) | |
  | **Administrator Settings** | |

</details>

### RBAC roles

- **Managers (full access)**:
    - Manager dashboard shows aggregate stats + recent activity.
    - Playspace place screens show separate `place_audit_status`, and `place_survey_status` statuses.
    - Manager/admin score views now show explicit `PV` / `U` pairs instead of a collapsed combined score.
- **Auditors (limited access)**:
    - Identified strictly by an alphanumeric `auditor_code` (no real names displayed).
    - Can execute audits, auto-save progress, and view their own work.
    - Cannot access `/manager` routes.

### Local setup (macOS + pnpm)

Install dependencies:

```bash
pnpm install
```

Run the dev server:

```bash
pnpm dev
```

Open the app at `[http://localhost:3000](http://localhost:3000)`.

Other useful commands:

```bash
pnpm lint
pnpm build
pnpm start
```

### Visual testing

Visual regression coverage lives in `tests/visual/` and uses **Playwright for navigation/state setup** plus **Percy for visual review and diffing**.

- Percy snapshots are the canonical regression/review surface.
- `public/screenshots/` remains the home for curated README/docs assets.
- Local and CI setup, auth bootstrapping, and snapshot naming conventions are documented in `docs/visual-testing.md`.

### Environment variables

Configure the FastAPI base URL in `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"
```

If not set, the frontend defaults to `http://127.0.0.1:8000`.

### Authentication (current scaffold)

This repo currently uses a **frontend-only demo login** that sets cookies in the browser to simulate an authenticated session.

- **Cookie names** (see `src/lib/auth/role.ts`):
    - `playspace_role`: `"manager"` or `"auditor"`
    - `playspace_access_token`: bearer token (demo-generated for now)
    - `playspace_auditor_code`: auditor-only identifier

The route guard is implemented in `middleware.ts` using those cookies:

- `/manager/`\*\* requires `playspace_role="manager"`
- `/auditor/**` requires `playspace_role="auditor"`
- `/settings` requires authentication (either role)

### App routes

- **Public**
    - `/login`
- **Manager**
    - `/manager/dashboard`
    - `/manager/projects`
- **Auditor**
    - `/auditor/dashboard`
    - `/auditor/execute/[placeId]`
- **Shared**
    - `/settings`

### Role-based layout (sidebar)

Protected routes render inside a responsive `AppShell` with a sidebar (desktop) and a sheet drawer (mobile):

- `src/app/(protected)/layout.tsx`
- `src/components/app/app-shell.tsx`

The navigation items are derived from the active role and rendered dynamically.

### API client

Axios client lives at `src/lib/api/api-client.ts`:

- Adds `Authorization: Bearer <token>` from `playspace_access_token`
- On `401`, clears auth cookies and redirects to `/login`

### Auditor multi-step form + auto-save

The audit execution UI is in:

- `src/app/(protected)/auditor/execute/[placeId]/page.tsx` (server wrapper)
- `src/app/(protected)/auditor/execute/[placeId]/audit-form.tsx` (client form)

Auto-save behavior:

- Watches form values via React Hook Form.
- Sends a debounced `PATCH` (900ms) with a **partial** payload to:
    - `PATCH /playspace/places/:placeId/audits/draft`

### Playspace score model (current)

- Auditor execution mode still drives submission kind: `audit`, `survey`, or `both`
- Place rollups now expose:
    - `place_audit_status`
    - `place_survey_status`
    - `audit_mean_scores`
    - `survey_mean_scores`
    - `overall_scores`
- Manager/admin UI should render score pairs as `PV {x} | U {y}`

### Agent rules (Cursor + Claude Code)

Scoped conventions for this repo (keep `.cursor/rules/` and `.claude/rules/` in sync):

- `frontend-dashboard-core.mdc` - role guards, shared dashboard components, API contract, UI copy
- `frontend-i18n-and-exports.mdc` - `messages/en.json` + `de.json`, report views, PDF/Excel exports

See `CLAUDE.md` and `.claude/README.md`. Workspace routing: `../.claude/AGENT_ROUTING.md` → `web-dashboard-ui`.

### Project structure

- `src/app/(public)` - unauthenticated pages
- `src/app/(protected)` - authenticated shell + role-specific routes
- `src/lib/auth` - role/session cookie helpers (server + browser)
- `src/lib/api` - Axios client + interceptors
- `src/components/app` - application shell components
