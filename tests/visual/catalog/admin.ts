import { dashboardChromeStates } from "./shared";
import { expectText, openBuildDialogForPlace, openRowMenu, openUserMenu, StateUnavailableError } from "./steps";
import type { CaptureTarget } from "./types";

/**
 * Admin console. One folder per page under public/screenshots/admin, mirroring
 * the /admin route tree. Detail pages nest under their list page's folder.
 */
export const adminTargets: readonly CaptureTarget[] = [
	{
		role: "admin",
		route: () => "/admin/dashboard",
		segments: ["admin", "dashboard"],
		states: [{ name: "overview", label: "Admin Dashboard" }, ...dashboardChromeStates]
	},
	{
		role: "admin",
		route: () => "/admin/accounts",
		segments: ["admin", "accounts"],
		states: [
			{ name: "overview", label: "Admin Accounts" },
			{
				name: "row-menu-open",
				label: "Admin Accounts - Row menu",
				optional: true,
				setup: ({ page }) => openRowMenu(page)
			}
		]
	},
	{
		role: "admin",
		route: () => "/admin/projects",
		segments: ["admin", "projects"],
		states: [{ name: "overview", label: "Admin Projects" }]
	},
	{
		role: "admin",
		route: () => "/admin/places",
		segments: ["admin", "places"],
		states: [{ name: "overview", label: "Admin Places" }]
	},
	{
		role: "admin",
		route: ids => (ids.placeId ? `/admin/places/${ids.placeId}` : null),
		segments: ["admin", "places", "detail"],
		states: [{ name: "overview", label: "Admin Place Detail" }]
	},
	{
		role: "admin",
		route: () => "/admin/auditors",
		segments: ["admin", "auditors"],
		states: [{ name: "overview", label: "Admin Auditors" }]
	},
	{
		role: "admin",
		route: () => "/admin/audits",
		segments: ["admin", "audits"],
		states: [{ name: "overview", label: "Admin Audits" }]
	},
	{
		role: "admin",
		route: ids => (ids.managerAuditId ? `/admin/audits/${ids.managerAuditId}` : null),
		segments: ["admin", "audits", "detail"],
		states: [{ name: "overview", label: "Admin Audit Detail" }]
	},
	{
		role: "admin",
		route: () => "/admin/reports",
		segments: ["admin", "reports"],
		states: [
			{ name: "overview", label: "Admin Reports" },
			{
				// Combined place-report builder modal opened for a place that has both
				// a submitted place audit and survey, so it renders the
				// "audit + survey pair" mode with one of each pre-selected.
				name: "combined-builder-pair-selected",
				label: "Admin Reports - Build place report (audit + survey)",
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
		role: "admin",
		route: ids => (ids.managerAuditId ? `/admin/reports/${ids.managerAuditId}` : null),
		segments: ["admin", "reports", "detail"],
		states: [{ name: "overview", label: "Admin Report Detail" }]
	},
	{
		role: "admin",
		// The built combined place report, loaded with real audit + survey source
		// ids (admin can view the same place across accounts).
		route: ids =>
			ids.combinedAuditId && ids.combinedSurveyId && ids.combinedPlaceId
				? `/admin/reports/place-report?audit=${ids.combinedAuditId}&survey=${ids.combinedSurveyId}&placeId=${ids.combinedPlaceId}`
				: null,
		segments: ["admin", "reports", "place-report"],
		waitFor: ({ page }) => expectText(page, /report sources/i),
		states: [{ name: "overview", label: "Admin Place Report (Combined)" }]
	},
	{
		role: "admin",
		route: () => "/admin/raw-data",
		segments: ["admin", "raw-data"],
		// Export is a direct file download, not a dialog, so the page captures as
		// one overview that already shows the export controls.
		states: [{ name: "overview", label: "Admin Raw Data" }]
	},
	{
		role: "admin",
		route: () => "/admin/instruments",
		segments: ["admin", "instruments"],
		// Version history is an inline panel on this page, not a dialog, so the
		// overview scroll frames already capture it.
		states: [{ name: "overview", label: "Admin Instruments" }]
	},
	{
		role: "admin",
		route: () => "/admin/system",
		segments: ["admin", "system"],
		states: [{ name: "overview", label: "Admin System" }]
	},
	{
		role: "admin",
		route: () => "/settings",
		segments: ["admin", "settings"],
		states: [
			{ name: "overview", label: "Admin Settings" },
			{
				name: "account-menu-open",
				label: "Admin Settings - Account menu",
				optional: true,
				setup: ({ page }) => openUserMenu(page)
			}
		]
	}
];
