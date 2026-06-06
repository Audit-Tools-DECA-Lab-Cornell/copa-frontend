# COPA / Playspace Normalized Feature Catalog

This document translates the technical codebase capabilities of the COPA (Playspace) platform into user-facing product features, grouping them into functional layers and identifying opportunities for commercial differentiation.

---

## 1. Platform Model

The Playspace platform is structured as a multi-user organizational workspace. A single account or organization is shared by Managers, Administrators, and Field Auditors. Managers and Administrators operate primarily on the Web Dashboard to define projects, assign sites, customize checklists, and analyze results. Field Auditors use the Mobile Client (with a Web Execution fallback for desktop/laptop entry) to complete physical playspace audits and ecological surveys on-site, both online and offline.

---

## 2. Feature Catalog

| ID | Feature | User Benefit | Primary Role | Surface(s) | Shipped | Depends On | Evidence (Files) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-ORG-SETUP** | Self-Service Organization Setup | Create a new organization profile and initialize a team account to manage multiple playspace assets. | Manager | Web | Yes | None | [signup/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/app/(public)/signup/page.tsx) |
| **FEAT-ROLE-GUARD** | Role-Based Access Controls | Securely restrict access to organization records, administrative tools, or field workflows based on user role (Admin, Manager, Auditor). | Manager & Admin | Web | Yes | None | [middleware.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/middleware.ts), `app/core/actors.py` |
| **FEAT-TEAM-INVITE** | Manager Team Invitations | Invite other administrators or managers to collaborate within the organization via email. | Manager | Web | Yes | `FEAT-ORG-SETUP` | [manager-invite/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/app/(public)/manager-invite/page.tsx) |
| **FEAT-AUDITOR-SETUP** | Auditor Onboarding via Code | Activate field auditor accounts using a simple unique invite code without requiring a standard email invitation loop. | Auditor | Web & Mobile | Yes | None | [auditor-code.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/(onboarding)/auditor-code.tsx) |
| **FEAT-ASSIGNMENTS** | Site-Specific Auditor Assignment | Assign specific playspace sites to auditors, ensuring they only see and execute audits for their assigned locations. | Manager | Web & Mobile | Yes | `FEAT-AUDITOR-SETUP` | [assign-auditor-dialog.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/components/dashboard/assign-auditor-dialog.tsx), `app/products/playspace/routes/assignments.py`, `app/products/playspace/services/audit_assignments.py`, [places.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/(tabs)/places.tsx) |
| **FEAT-PLACE-LIST** | Assigned Site Directory | Search, filter, and sort a personal directory of assigned playspaces to quickly check assessment status. | Auditor | Web & Mobile | Yes | `FEAT-ASSIGNMENTS` | [places.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/(tabs)/places.tsx), [place/[placeId].tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/place/%5BplaceId%5D.tsx) |
| **FEAT-EXEC-MODES** | Flexible Audit & Survey Modes | Choose whether to run a physical playspace audit, an ecological survey, or both simultaneously based on site requirements. | Auditor | Web & Mobile | Yes | None | [execution_mode_scope.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/execution_mode_scope.py), [execute-flow.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/execute-flow.ts), [execute/[placeId]/index.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/execute/%5BplaceId%5D/index.tsx) |
| **FEAT-PRE-AUDIT** | Site Condition Log | Log site-specific contextual metadata (weather, season, active child count, age groups, playspace size) prior to running the assessment. | Auditor | Web & Mobile | Yes | `FEAT-EXEC-MODES` | [pre-audit.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/execute/%5BplaceId%5D/pre-audit.tsx) |
| **FEAT-PROGRESS-CHECK** | Interactive Section Progress Tracker | View an overview matrix of all audit sections and their real-time completion status to track progress. | Auditor | Web & Mobile | Yes | `FEAT-EXEC-MODES` | [space-audit.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/execute/%5BplaceId%5D/space-audit.tsx), [checklist-helpers.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/checklist-helpers.ts) |
| **FEAT-GATED-SCALES** | Dynamic Gated Checklist Scoring | Conditionally display follow-up qualitative evaluation scales (Variety, Challenge, Sociability) only when a feature's physical quantity is greater than zero, preventing irrelevant data entry. | Auditor | Web & Mobile | Yes | `FEAT-PROGRESS-CHECK` | [checklist-helpers.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/checklist-helpers.ts), [section/[sectionKey].tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/execute/%5BplaceId%5D/section/%5BsectionKey%5D.tsx), [scoring.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/scoring.py) |
| **FEAT-LOCAL-SAVE** | Automatic Local Draft Saving | Save progress instantly and securely on the local device, ensuring no data loss when auditing. | Auditor | Mobile | Yes | None | [stores/audit-store.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/stores/audit-store.ts) |
| **FEAT-OFFLINE-BOOTSTRAP** | Offline Initial Assessment Access | Start new assessments on first app launch in areas with zero connectivity using pre-bundled assessment frameworks. | Auditor | Mobile | Yes | None | [bundled-instrument.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/bundled-instrument.ts), `lib/services/instrument-sync.ts` |
| **FEAT-BG-SYNC** | Auto-Sync in Background | Automatically upload draft progress to the server in the background every 15 minutes when connection is available, without keeping the app active. | Auditor | Mobile | Yes | `FEAT-LOCAL-SAVE` | [background-sync.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/background-sync.ts) |
| **FEAT-CONFLICT-RESOLVE** | Collaborative Conflict Rebasing | Intelligently merge concurrent edits on the same audit draft and prevent overwriting submitted audits. | Auditor | Mobile | Yes | `FEAT-BG-SYNC` | [store-sync-core.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/store-sync-core.ts), [use-audit-sync.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/use-audit-sync.ts) |
| **FEAT-WEB-AUDITOR** | Web-Based Site Assessment | Run or input assessments on a desktop or laptop browser as an alternative to mobile devices. | Auditor | Web | Yes | None | [auditor/execute/[placeId]/page.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/app/(protected)/auditor/execute/%5BplaceId%5D/page.tsx), [audit-form.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/app/(protected)/auditor/execute/%5BplaceId%5D/audit-form.tsx) |
| **FEAT-SCORING-ENGINE** | Multi-Dimensional Play Value Scoring | Immediate calculation of playspace quality scores (Provision, Variety, Challenge, Sociability) and usability metrics without manual math. | Manager & Auditor | Web & Mobile | Yes | None | [scoring.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/scoring.py), [score-helpers.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/audit/score-helpers.ts) |
| **FEAT-REPORT-MERGE** | Multi-Assessment Report Merging | Merge separate physical audits and ecological surveys of a playspace into a single, unified site report. | Manager | Web | Yes | `FEAT-SCORING-ENGINE` | [place-report-merge.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/components/dashboard/place-report-merge.ts), [place-report-client.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/components/dashboard/place-report-client.tsx) |
| **FEAT-REPORT-LOCK** | Official Site Report Preservation | Save and lock merged audit-survey configurations to a site's permanent record for historical tracking. | Manager | Web | Yes | `FEAT-REPORT-MERGE` | `routes/management.py` (`save_place_report` endpoint), `services/management.py` |
| **FEAT-EXPORT-PDF** | Individual Audit PDF Generation | Download or share a clean, formatted PDF summary of an individual audit directly from the web browser or mobile sharing sheet. | Manager & Auditor | Web & Mobile | Yes | None | [pdf.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/lib/export/audit/pdf.ts), [pdf.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/exports/audits/pdf.ts) |
| **FEAT-EXPORT-SINGLE-DATA** | Individual Audit Spreadsheet Export | Export raw responses and scores of a single audit to Excel/CSV for custom sorting and analysis. | Manager & Auditor | Web & Mobile | Yes | None | [excel.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/lib/export/audit/excel.ts), [excel.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/lib/exports/audits/excel.ts) |
| **FEAT-EXPORT-ZIP** | Relational Raw Data ZIP Bundling | Download a complete organization-wide archive of all raw assessment data, structured by project and place with index manifests, for importing into external GIS or statistics packages. | Manager & Admin | Web | Yes | None | [raw-data-zip.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/lib/export/raw-data-zip.ts), [zip-builder.ts](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/lib/export/zip-builder.ts) |
| **FEAT-EXPORT-EMAIL** | Email Notifications for Large Exports | Receive an email notification when a large background data export is ready for download, avoiding the need to wait on the page. | Manager & Admin | Web (triggered) & Email | Yes | `FEAT-EXPORT-ZIP` | [routes/exports.py](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-backend/app/products/playspace/routes/exports.py), `app/email_service.py` |
| **FEAT-LEGAL-EDITOR** | Dynamic Policy & Terms Publisher | Edit and publish terms of service and privacy policies on the web and push them instantly to mobile apps without submitting app store updates. | Admin | Web & Mobile | Yes | None | [legal-documents-editor.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/components/dashboard/instruments/editors/legal-documents-editor.tsx), [accept-terms.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-mobile/app/(onboarding)/accept-terms.tsx) |
| **FEAT-INSTRUMENT-EDITOR** | Dynamic Assessment Schema Publisher | Upload, edit, translate, and version assessment questions/matrix structures using a spreadsheet-style interface, automatically updating the field checklists. | Admin | Web | Yes | None | [instrument-editor.tsx](file:///Users/praty/Desktop/StudentJob.nosync/playspace/audit-tools-playspace-frontend/src/components/dashboard/instruments/instrument-editor.tsx), `routes/instrument.py`, `services/instrument.py` |

---

## 3. Feature Layers (Natural Groupings)

### Layer A: Core Field Assessment
* **Feature IDs:** `FEAT-EXEC-MODES`, `FEAT-PRE-AUDIT`, `FEAT-PROGRESS-CHECK`, `FEAT-GATED-SCALES`, `FEAT-LOCAL-SAVE`, `FEAT-OFFLINE-BOOTSTRAP`, `FEAT-BG-SYNC`, `FEAT-CONFLICT-RESOLVE`, `FEAT-WEB-AUDITOR`
* **Who Needs It:** Field auditors and solo assessors doing direct site data entry.
* **Typical Org Size:** Small (1–5 auditors) to Enterprise (100+ auditors).

### Layer B: Team Coordination & Work Allocation
* **Feature IDs:** `FEAT-ORG-SETUP`, `FEAT-ROLE-GUARD`, `FEAT-TEAM-INVITE`, `FEAT-AUDITOR-SETUP`, `FEAT-ASSIGNMENTS`, `FEAT-PLACE-LIST`
* **Who Needs It:** Team leads and managers running assessments across multiple sites with several field staff.
* **Typical Org Size:** Medium (5–20 employees) to Large/Enterprise (20+ employees).

### Layer C: Reporting & Scoring Evidence
* **Feature IDs:** `FEAT-SCORING-ENGINE`, `FEAT-REPORT-MERGE`, `FEAT-REPORT-LOCK`, `FEAT-EXPORT-PDF`
* **Who Needs It:** Managers who need to present findings to clients, city councils, or funders.
* **Typical Org Size:** Small (1–5 employees) to Enterprise.

### Layer D: Portfolio & Research Data Export
* **Feature IDs:** `FEAT-EXPORT-SINGLE-DATA`, `FEAT-EXPORT-ZIP`, `FEAT-EXPORT-EMAIL`
* **Who Needs It:** Academic researchers, GIS analysts, and large organization administrators performing cross-site benchmarking.
* **Typical Org Size:** Large (20+ sites) or specialized research teams.

### Layer E: System & Schema Administration
* **Feature IDs:** `FEAT-LEGAL-EDITOR`, `FEAT-INSTRUMENT-EDITOR`
* **Who Needs It:** Central program managers, legal compliance officers, and authors of playspace guidelines.
* **Typical Org Size:** Enterprise or grant-funded academic consortia.

---

## 4. Non-Features (Pricing Copy Exclusions)

The following operational capabilities and future roadmap items are excluded from packaging tiers:
* **App Store / Play Store Listing Costs:** Downloading the mobile client from the iOS App Store or Google Play Store is an operational distribution mechanism, not a billed feature.
* **Weighted Scoring & Reliability Metrics:** Currently listed in planning documentation as future work, but not implemented in the codebase.
* **Zone-Aware Place Subdivision:** Described in documentation/issues as future roadmap work, not supported by the schema or frontend.
* **Manager-Authored Survey Capture:** Managers cannot directly execute assessments in the web UI; execution is restricted to the Auditor role.
* **System Diagnostics & Database Diagnostic Tools:** System diagnostics screens (`/admin/system`) are internal debugging views, not customer-facing tier capabilities.

---

## 5. Upsell Candidates

1. **Dynamic Assessment Schema Publisher (`FEAT-INSTRUMENT-EDITOR`)**
   * **Differentiation Potential:** High
   * **Rationale:** Academic researchers, specialized auditors, and regional authorities often need to deploy custom rating systems or translated scales rather than using the default PVUA framework, which commands a premium.

2. **Relational Raw Data ZIP Bundling (`FEAT-EXPORT-ZIP`)**
   * **Differentiation Potential:** High
   * **Rationale:** Enterprise customers and university research programs need to parse organization-wide assessment portfolios in bulk, making pre-bundled relational export formats a major efficiency upsell.

3. **Combined Place Reports & Report Saving (`FEAT-REPORT-MERGE`, `FEAT-REPORT-LOCK`)**
   * **Differentiation Potential:** Medium
   * **Rationale:** Consolidating physical site audits with ecological surveys into a permanent historical site report saves managers manual compilation time and organizes audit history.

4. **Site-Specific Auditor Assignment (`FEAT-ASSIGNMENTS`)**
   * **Differentiation Potential:** Medium
   * **Rationale:** Essential for coordinating large teams of auditors across dozens of municipal locations, but generally expected in any basic team-management platform.

5. **Web-Based Auditor Execution Option (`FEAT-WEB-AUDITOR`)**
   * **Differentiation Potential:** Low
   * **Rationale:** Useful as an accessibility fallback for users who cannot run Expo on their mobile devices, but functions strictly as a data-entry channel rather than a premium feature.
