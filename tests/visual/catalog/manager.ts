import { dashboardChromeStates } from "./shared";
import {
	expectText,
	openBuildDialogForPlace,
	openDialog,
	openFilterPopover,
	openRowMenu,
	openThenCloseDialog,
	openUserMenu,
	StateUnavailableError
} from "./steps";
import type { CaptureTarget } from "./types";

/**
 * Manager workspace. One folder per page under public/screenshots/manager,
 * mirroring the /manager route tree. Detail and builder surfaces nest under
 * their parent page's folder.
 */
export const managerTargets: readonly CaptureTarget[] = [
	{
		role: "manager",
		route: () => "/manager/dashboard",
		segments: ["manager", "dashboard"],
		states: [{ name: "overview", label: "Manager Dashboard" }, ...dashboardChromeStates]
	},
	{
		role: "manager",
		route: () => "/manager/projects",
		segments: ["manager", "projects"],
		states: [
			{ name: "overview", label: "Manager Projects" },
			{
				name: "create-dialog-open",
				label: "Manager Projects - Create dialog",
				setup: ({ page }) => openDialog(page, /new project/i)
			},
			{
				name: "create-dialog-closed",
				label: "Manager Projects - Create dialog dismissed",
				optional: true,
				setup: ({ page }) => openThenCloseDialog(page, /new project/i)
			}
		]
	},
	{
		role: "manager",
		route: ids => (ids.projectId ? `/manager/projects/${ids.projectId}` : null),
		segments: ["manager", "projects", "detail"],
		states: [{ name: "overview", label: "Manager Project Detail" }]
	},
	{
		role: "manager",
		route: () => "/manager/places",
		segments: ["manager", "places"],
		states: [
			{ name: "overview", label: "Manager Places" },
			{
				// Places are filtered here, not created — capture a filter popover open.
				name: "filter-popover-open",
				label: "Manager Places - Filter popover",
				optional: true,
				setup: ({ page }) => openFilterPopover(page, "Projects")
			}
		]
	},
	{
		role: "manager",
		route: ids =>
			ids.placeId && ids.projectId ? `/manager/places/${ids.placeId}?projectId=${ids.projectId}` : null,
		segments: ["manager", "places", "detail"],
		states: [{ name: "overview", label: "Manager Place Detail" }]
	},
	{
		role: "manager",
		route: () => "/manager/auditors",
		segments: ["manager", "auditors"],
		states: [
			{ name: "overview", label: "Manager Auditors" },
			{
				name: "invite-dialog-open",
				label: "Manager Auditors - Invite dialog",
				optional: true,
				setup: ({ page }) => openDialog(page, /invite/i)
			}
		]
	},
	{
		role: "manager",
		route: ids => (ids.auditorProfileId ? `/manager/auditors/${ids.auditorProfileId}` : null),
		segments: ["manager", "auditors", "detail"],
		states: [{ name: "overview", label: "Manager Auditor Detail" }]
	},
	{
		role: "manager",
		route: () => "/manager/audits",
		segments: ["manager", "audits"],
		states: [
			{ name: "overview", label: "Manager Audits" },
			{
				// Assignment lives on the auditors page; here audits are filtered.
				name: "filter-popover-open",
				label: "Manager Audits - Filter popover",
				optional: true,
				setup: ({ page }) => openFilterPopover(page, "Projects")
			}
		]
	},
	{
		role: "manager",
		route: ids => (ids.managerAuditId ? `/manager/audits/${ids.managerAuditId}` : null),
		segments: ["manager", "audits", "detail"],
		states: [{ name: "overview", label: "Manager Audit Detail" }]
	},
	{
		role: "manager",
		route: () => "/manager/reports",
		segments: ["manager", "reports"],
		states: [
			{ name: "overview", label: "Manager Reports" },
			{
				// The combined place-report builder modal, opened for a place that has
				// both a submitted place audit and survey so it renders the
				// "audit + survey pair" mode with one of each pre-selected.
				name: "combined-builder-pair-selected",
				label: "Manager Reports - Build place report (audit + survey)",
				optional: true,
				setup: async ({ page, ids }) => {
					if (!ids.combinedPlaceName) {
						throw new StateUnavailableError("seed has no place with both an audit and a survey");
					}
					await openBuildDialogForPlace(page, ids.combinedPlaceName);
				}
			}
		]
	},
	{
		role: "manager",
		route: ids => (ids.managerAuditId ? `/manager/reports/${ids.managerAuditId}` : null),
		segments: ["manager", "reports", "detail"],
		states: [
			{ name: "overview", label: "Manager Report Detail" },
			{
				name: "export-menu-open",
				label: "Manager Report Detail - Export menu",
				optional: true,
				setup: ({ page }) => openRowMenu(page)
			}
		]
	},
	{
		role: "manager",
		// The built combined place report. The route only loads with real source
		// ids, so it captures the merged audit + survey report once the seed has a
		// place with both sides submitted.
		route: ids =>
			ids.combinedAuditId && ids.combinedSurveyId && ids.combinedPlaceId
				? `/manager/reports/place-report?audit=${ids.combinedAuditId}&survey=${ids.combinedSurveyId}&placeId=${ids.combinedPlaceId}`
				: null,
		segments: ["manager", "reports", "place-report"],
		waitFor: ({ page }) => expectText(page, /report sources/i),
		states: [{ name: "overview", label: "Manager Place Report (Combined)" }]
	},
	{
		role: "manager",
		route: () => "/manager/raw-data",
		segments: ["manager", "raw-data"],
		// Export is a direct file download, not a dialog, so the page captures as
		// one overview that already shows the export controls.
		states: [{ name: "overview", label: "Manager Raw Data" }]
	},
	{
		role: "manager",
		route: () => "/settings",
		segments: ["manager", "settings"],
		states: [
			{ name: "overview", label: "Manager Settings" },
			{
				name: "account-menu-open",
				label: "Manager Settings - Account menu",
				optional: true,
				setup: ({ page }) => openUserMenu(page)
			}
		]
	}
];
