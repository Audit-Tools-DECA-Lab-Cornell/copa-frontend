# Playspace Capability Inventory & Mapping

This document provides a comprehensive map of how the Comprehensive Outdoor Playspace Audit (COPA) / Playspace product capabilities are distributed across the backend, mobile, and web frontend repositories.

---

## A. Route & Nav Map

### 1. Web Frontend (`copa-frontend/`)
The web application uses Next.js 15 App Router. Access is role-guarded by middleware using cookie session tokens.

| Role | Surface | Key Paths / Files | Primary User Job |
| :--- | :--- | :--- | :--- |
| **All Auth** | Global Guard | [middleware.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/middleware.ts) | Intercepts requests, validates cookies, and redirects users to their role-specific dashboards. |
| **All Auth** | Profile Settings | [settings/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/settings/page.tsx) | Edit name, email, credentials, and select locale. |
| **Admin** | Dashboard | [admin/dashboard/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/dashboard/page.tsx) | Global overview metrics across all accounts, projects, and active audits. |
| **Admin** | Account Administration | [admin/accounts/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/accounts/page.tsx) | Listing, creating, updating organization accounts. |
| **Admin** | Instrument Catalog | [admin/instruments/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/instruments/page.tsx) | Dynamic instrument schema uploads, version control, translations, and publishing. |
| **Admin** | Global Projects | [admin/projects/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/projects/page.tsx) | Auditing projects across all accounts. |
| **Admin** | Global Places | [admin/places/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/places/page.tsx) | Global list of audit sites/places. |
| **Admin** | Global Auditors | [admin/auditors/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/auditors/page.tsx) | Global view of auditor profiles and active place assignments. |
| **Admin** | Cross-Account Export | [admin/raw-data/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/raw-data/page.tsx) | Build and download cross-account ZIP bundles of raw CSV/XLSX/JSON data. |
| **Admin** | System Metadata | [admin/system/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/admin/system/page.tsx) | View server diagnostic info and Alembic schema heads. |
| **Manager** | Dashboard | [manager/dashboard/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/dashboard/page.tsx) | Track recent activity, project progress, place completion, and assigned auditors. |
| **Manager** | Project List & Detail | [manager/projects/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/projects/page.tsx)<br>[manager/projects/[projectId]/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/projects/%5BprojectId%5D/page.tsx) | Manage individual projects, stats, and linked places. |
| **Manager** | Place List & Detail | [manager/places/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/places/page.tsx)<br>[manager/places/[placeId]/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/places/%5BplaceId%5D/page.tsx) | Track place-level completion stats and view saved combined reports. |
| **Manager** | Auditor List & Detail | [manager/auditors/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/auditors/page.tsx)<br>[manager/auditors/[auditorId]/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/auditors/%5BauditorId%5D/page.tsx) | Invite and delete auditor profiles, edit place-by-place assignments. |
| **Manager** | Submitted Audits | [manager/audits/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/audits/page.tsx) | View history of submitted audits. |
| **Manager** | Place Reports | [manager/reports/place-report/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/reports/place-report/page.tsx) | Generate, view, and save combined Place Audit + Ecological Survey reports. |
| **Manager** | Account Export | [manager/raw-data/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/manager/raw-data/page.tsx) | Build and download organization-scoped ZIP raw-data exports. |
| **Auditor** | Web Dashboard | [auditor/dashboard/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/auditor/dashboard/page.tsx) | View assigned places, started drafts, and completed audits. |
| **Auditor** | Web Execution | [auditor/execute/[placeId]/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/auditor/execute/%5BplaceId%5D/page.tsx) | Onsite web execution option for starting, saving, and submitting audits. |

### 2. Mobile Client (`copa-mobile/`)
The mobile application uses Expo Router and native Tab navigation.

| Area / Tab | File / Directory | Role / Primary Auditor Job |
| :--- | :--- | :--- |
| **Auth Pages** | [app/(auth)/](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(auth)/) | Sign-up, sign-in, and auth session recovery. |
| **Onboarding** | [app/(onboarding)/](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(onboarding)/) | Dynamic Terms and Conditions/Privacy Policy review, profile completion, and initial code entry. |
| **Home (Execute)**| [app/(tabs)/index.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(tabs)/index.tsx) | Main dashboard listing active drafts and quick shortcuts for resuming. |
| **Places Tab** | [app/(tabs)/places.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(tabs)/places.tsx) | Search, filter, and sort list of assigned places to check progress or launch audits. |
| **Place Detail** | [app/place/[placeId].tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/place/%5BplaceId%5D.tsx) | Drilldown to view place metadata, coordinates, and local audit history. |
| **Reports Tab** | [app/(tabs)/reports.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(tabs)/reports.tsx) | List of all submitted audits with single-audit PDF/Excel/CSV export triggers. |
| **Report Detail** | [app/report/[auditId].tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/report/%5BauditId%5D.tsx) | Score summaries (Construct/Column scores) and response details for a submitted audit. |
| **Settings Tab** | [app/(tabs)/settings.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(tabs)/settings.tsx) | App preference overrides, local MMKV cache size inspection, and logout. |
| **Execution Entry**| [app/execute/[placeId]/index.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/execute/%5BplaceId%5D/index.tsx) | Launch or resume place execution; lets users pick mode (`audit`, `survey`, or `both`) if multiple are allowed. |
| **Pre-Audit Form** | [app/execute/[placeId]/pre-audit.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/execute/%5BplaceId%5D/pre-audit.tsx) | Input required context (weather, season, child count, age groups, playspace size). |
| **Audit Matrix** | [app/execute/[placeId]/space-audit.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/execute/%5BplaceId%5D/space-audit.tsx) | High-level checklist/matrix to view section progress and click into sections. |
| **Section Form** | [app/execute/[placeId]/section/[sectionKey].tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/execute/%5BplaceId%5D/section/%5BsectionKey%5D.tsx) | Interactive form to answer section questions (Quantity and gated Variety/Challenge/Sociability scales). |
| **Submit & Notes**| [app/execute/[placeId]/final-comments.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/execute/%5BplaceId%5D/final-comments.tsx) | Write section-level notes/recommendations and validate/submit the audit. |

---

## B. Capability File Index

### 1. Role Surfaces & Access Control
Backend authentication uses bearer tokens for mobile clients and session cookies for web requests. Roles (`admin`, `manager`, `auditor`) restrict access to data models.

* **Capability: Session Guarding & Role Resolution**
  * **Files:**
    * Web: [middleware.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/middleware.ts) (routes routing)
    * Backend: `app/core/actors.py` (actor parsing, JWT/cookie authentication dependency logic)
  * **Shipped:** Yes
  * **Notes:** Validates session credentials and routes users to role-specific directories (`/admin`, `/manager`, `/auditor`).

### 2. Field Execution & Audit Flow
Handles starting, saving, resuming, and submitting audits across three execution modes: `audit` (physical items), `survey` (ecological items), and `both` (all items).

* **Capability: Execution Mode Filtering & Question Gating**
  * **Files:**
    * Backend: [execution_mode_scope.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/execution_mode_scope.py) (gating database rows by mode)
    * Mobile: [execute-flow.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/execute-flow.ts) (client-side execution state helpers)
  * **Shipped:** Yes
  * **Notes:** Mode choice hides/shows questions (e.g. physical vs ecological) and dictates the submission category (`place_audit`, `place_survey`, or `full_audit`).
* **Capability: Quantity-Gated Scales & Progress Metrics**
  * **Files:**
    * Backend: [scoring.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/scoring.py) (validates completeness)
    * Mobile: [checklist-helpers.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/checklist-helpers.ts) (renders scales when quantity > 0)
  * **Shipped:** Yes
  * **Notes:** Completing follow-up scales (Variety, Challenge, Sociability) is blocked if the primary Quantity scale answer is `None` (0).
* **Capability: Web Auditor Execution (Browser Form)**
  * **Files:**
    * Web: [audit-form.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/auditor/execute/%5BplaceId%5D/audit-form.tsx)
  * **Shipped:** Yes
  * **Notes:** Implements full audit execution in-browser, mirroring the mobile layout for desktop/laptop data entry.

### 3. Offline Sync & Local State
Mobile client caches active sessions using MMKV, handles optimistic updates, and synchronizes patches in the background.

* **Capability: Fine-grained Observable State & MMKV Persistence**
  * **Files:**
    * Mobile: [stores/audit-store.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/stores/audit-store.ts)
  * **Shipped:** Yes
  * **Notes:** Isolates transient memory from persistent on-device data and writes edits to MMKV with a 500ms debounce.
* **Capability: Sync Orchestration & Conflict Rebasing**
  * **Files:**
    * Mobile: [lib/audit/store-sync-core.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/store-sync-core.ts)
    * Mobile: [lib/audit/use-audit-sync.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/use-audit-sync.ts)
  * **Shipped:** Yes
  * **Notes:** Rebases local dirty changes on top of server data if `IN_PROGRESS`, or discards drafts if the server session has been `SUBMITTED`.
* **Capability: Offline Instrument Fallback**
  * **Files:**
    * Mobile: [bundled-instrument.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/bundled-instrument.ts)
    * Mobile: `lib/services/instrument-sync.ts` (sync logic)
  * **Shipped:** Yes
  * **Notes:** Uses a hardcoded copy of English PVUA v5.2 to bootstrap new audits offline if the server cannot be reached on first app launch.
* **Capability: Background Sync Task**
  * **Files:**
    * Mobile: [background-sync.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/background-sync.ts)
  * **Shipped:** Yes
  * **Notes:** Registers `expo-background-task` to sync outstanding drafts every 15 minutes when the app is in the background.

### 4. Coordination & Assignments
Managers assign auditor profiles to places and projects.

* **Capability: Place-Based Auditor Assignments**
  * **Files:**
    * Backend: `app/products/playspace/routes/assignments.py` (REST routes)
    * Backend: `app/products/playspace/services/audit_assignments.py` (validation and mapping logic)
    * Web: [assign-auditor-dialog.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/assign-auditor-dialog.tsx) (UI dashboard dialog)
  * **Shipped:** Yes
  * **Notes:** Maps auditors to places; auditors are limited to seeing and executing audits at assigned sites on mobile/web.

### 5. Reporting & Score Rollups
Scores are computed from completed submissions on the backend and cached. The manager web UI combines separate audit and survey submissions into unified reports.

* **Capability: Construct & Column Scoring Aggregation**
  * **Files:**
    * Backend: [scoring.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/scoring.py)
    * Mobile: [score-helpers.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/score-helpers.ts)
  * **Shipped:** Yes
  * **Notes:** Computes column totals (Provision, Variety, Challenge, Sociability) and construct scores (Play Value, Usability) without using percentages.
* **Capability: Audit + Survey Place Report Merging**
  * **Files:**
    * Web: [place-report-merge.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/place-report-merge.ts)
    * Web: [place-report-client.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/place-report-client.tsx)
  * **Shipped:** Yes
  * **Notes:** Merges separate submitted physical audits and ecological surveys into a synthetic overall report showing merged scores and answers.
* **Capability: Saving Merged Reports to Place Record**
  * **Files:**
    * Backend: `routes/management.py` (L141: `save_place_report` endpoint)
    * Backend: `services/management.py` (L725: DB insert)
  * **Shipped:** Yes
  * **Notes:** Persists selected audit/survey pairs on the place record (using `playspace_submission_contexts` mapping tables) to lock report configurations.

### 6. Data Exports & Relational Bundling
Clients generate CSV, XLSX, and PDF exports. Large raw-data bulk exports are bundled into a relational ZIP archive containing a manifest and root indexes.

* **Capability: Client-Side Single Audit Export (XLSX, PDF, CSV)**
  * **Files:**
    * Web: [src/lib/export/audit/](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/lib/export/audit/) (`excel.ts`, `pdf.ts`, `row-builders.ts`)
    * Mobile: [lib/exports/audits/](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/exports/audits/) (`excel.ts`, `pdf.ts`)
  * **Shipped:** Yes
  * **Notes:** Uses client libraries (e.g. `xlsx` sheetjs and canvas/PDF rendering) to output fully formatted reports in the browser or on the device.
* **Capability: Relational Raw Data ZIP Bundling**
  * **Files:**
    * Web: [raw-data-zip.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/lib/export/raw-data-zip.ts)
    * Web: [zip-builder.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/lib/export/zip-builder.ts)
    * Web: [raw-data-export.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/raw-data-export.tsx) (UI container)
  * **Shipped:** Yes
  * **Notes:** Generates a relational structure containing root indexes and subfolders per project/place containing single audits and saved combined reports.
* **Capability: Export Finished Notification Email**
  * **Files:**
    * Backend: [routes/exports.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/routes/exports.py) (POST `/exports/notify-ready`)
    * Backend: `app/email_service.py` (`send_export_ready_email`)
  * **Shipped:** Yes
  * **Notes:** Emails the manager/admin when their client-side browser bulk-export finishes assembling.

### 7. Admin-Only Instruments & System
Allows dynamic schema versioning, spreadsheet viewer capabilities, and translation updates.

* **Capability: Dynamic Instrument Editor & Versions**
  * **Files:**
    * Web: [instruments/](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/instruments/) (`instrument-editor.tsx`, `instruments-admin-client.tsx`, `spreadsheet-view.tsx`)
    * Backend: `routes/instrument.py` and `services/instrument.py`
  * **Shipped:** Yes
  * **Notes:** Provides a live spreadsheet editor for questions/sections, allowing schema draft sub-versioning (e.g. 5.23 -> 5.23.1) and activation bumps.

### 8. Auth, Invitations & Onboarding
Managers invite other managers or sign up organization profiles, while auditors accept invites, accept terms, and complete profile forms.

* **Capability: Organization Signups & Manager Invitations**
  * **Files:**
    * Web: [src/app/(public)/signup/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(public)/signup/page.tsx)
    * Web: [src/app/(public)/manager-invite/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(public)/manager-invite/page.tsx)
    * Backend: `routes/management.py` (POST `/manager-invites` route)
  * **Shipped:** Yes
  * **Notes:** Authenticated managers can send email invites to add other managers to their organizations.

### 9. App Distribution & legal content
Dynamic Legal document management and native mobile build scripts.

* **Capability: Dynamic Terms & Conditions / Privacy Policy Rendering**
  * **Files:**
    * Mobile: [accept-terms.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(onboarding)/accept-terms.tsx)
    * Web: [legal-documents-editor.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/instruments/editors/legal-documents-editor.tsx)
  * **Shipped:** Yes
  * **Notes:** Terms of service and privacy notices are loaded dynamically from the active instrument schema so admins can revise legal text without submitting a mobile app store update.
* **Capability: App Store Distribution Configurations**
  * **Files:**
    * Mobile: [app.config.js](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app.config.js) (EAS Project ID: `2e559376-25f3-44e1-88bf-00eeaf9fb763`, bundle IDs)
    * Mobile: `eas.json` (EAS build profiles)
  * **Shipped:** Yes
  * **Notes:** Ready for deployment to App Store (`com.pratyush.sudhakar.audit-tools-playspace-mobile`) and Google Play (`com.pratyush.sudhakar.audittoolsplayspacemobile`).

---

## C. Cross-Surface Dependencies

### 1. Web + Mobile Collaboration
* **Dynamic Legal & Instrument Updates:** The admin edits legal documents or instruments on the web frontend ([legal-documents-editor.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/instruments/editors/legal-documents-editor.tsx)). The changes are stored in the backend and synced to the mobile client during `syncInstrument()` inside [accept-terms.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(onboarding)/accept-terms.tsx), updating terms of service and audit checklists immediately without an app store rebuild.
* **Auditor Code Setup:** An auditor profile is created by a manager on the web dashboard (which auto-generates a code `AUD-{ORG}-{YY}-{NNNNNNNN}`). On mobile, the auditor enters this code in the onboarding screen [auditor-code.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/app/(onboarding)/auditor-code.tsx) to associate their account.
* **Auditor Place Assignments:** Places are assigned to auditors on the manager web interface ([assign-auditor-dialog.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/components/dashboard/assign-auditor-dialog.tsx)). This limits what places the auditor sees on their mobile client in `places.tsx`.

### 2. Web-Only vs. Mobile-Only
* **Web-Only:**
  * Admin Overview & Organization Accounts creation/deletion.
  * Project/Place creation forms and management routes.
  * Instrument editing, translation management, and versioning.
  * Place report merging (combining audits and surveys) and saving configurations to place history.
  * Batch ZIP exports of project/place raw data.
* **Mobile-Only:**
  * Offline local MMKV cache and debounced observer store synchronization.
  * Background synchronization daemon running every 15 minutes.
  * Sharing single-audit exports directly to local iOS/Android device sharing sheets via `expo-sharing` ([share.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/exports/audits/share.ts)).

### 3. Shared Endpoints Consumed by Both
Both the web frontend (via Axios in [playspace.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/lib/api/playspace.ts)) and mobile client (via fetch in [api.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-mobile/lib/audit/api.ts)) hit:
* `POST /playspace/places/{place_id}/audits/access`: Access or create active place draft.
* `GET /playspace/audits/{audit_id}`: Fetch full audit payload.
* `PATCH /playspace/audits/{audit_id}/draft`: Send granular edits (mode/pre-audit/sections).
* `POST /playspace/audits/{audit_id}/submit`: Validate completion and calculate final scores.
* `GET /playspace/instruments/active/{instrument_key}`: Fetch active instrument schema.

---

## D. Gaps & Ambiguities

### 1. Documented in Docs but Missing in Code
* **Weighted Scoring & Reliability Metrics:** Mentioned in `PLANNING.md` and `SCORING.md` but are explicitly omitted or marked "future work" in both mobile and backend services.
* **Zone-aware place subdivision:** Noted as an open question in `PLANNING.md` but has no DB schema rows or frontend models today.
* **Manager-authored survey submissions:** Mentioned in `PLANNING.md` as deferred, as managers do not have an execution route today (only auditors can submit `audit`, `survey`, or `both` modes).

### 2. Implemented in Code but Missing in Docs
* **Web-Based Auditor Execution:** `INSTRUCTIONS.md` states: *"the Playspace product runs on a separate FastAPI backend plus an Expo mobile app... shipped experience is auditor-first and mobile-first. Manager dashboards, manager survey capture... remain future work."* However, a fully functional web auditor execute route (`/auditor/execute/[placeId]` with [audit-form.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/copa-frontend/src/app/(protected)/auditor/execute/%5BplaceId%5D/audit-form.tsx)) is fully implemented in the frontend code.
* **Saved Place Reports:** The database and backend route support saving audit/survey pairs on the place record (`POST /places/{place_id}/place-reports`), but this capability is not fully articulated in the high-level `INSTRUCTIONS.md` product scope, which only briefly lists client-side single audit exports.

### 3. Verification Gaps
* **Mobile Sync Sync-Gap on `started_at`:** Known issue `FEAT-01` notes: *"mobile stamps started_at locally... but the backend draft PATCH does not accept it."* This gap means that `started_at` values synced from mobile may default to server access-time timestamps unless the sync payload is reconciled.
* **Organisational signup flow constraints:** `NOTES.md` records that a self-signing manager creates an org with a default name, but can block them from being invited to established orgs later unless deletion/management interfaces are explicitly used.
