import { dashboardChromeStates } from "./shared";
import { openUserMenu } from "./steps";
import type { CaptureTarget } from "./types";

/**
 * Auditor field client. One folder per page under public/screenshots/auditor,
 * mirroring the /auditor route tree. The execute surface is a single inline
 * audit form (sections, inline note fields, save/submit) with no dialogs, so it
 * captures as one overview; driving its buttons would submit real audit data.
 */
export const auditorTargets: readonly CaptureTarget[] = [
	{
		role: "auditor",
		route: () => "/auditor/dashboard",
		segments: ["auditor", "dashboard"],
		states: [{ name: "overview", label: "Auditor Dashboard" }, ...dashboardChromeStates]
	},
	{
		role: "auditor",
		route: ids =>
			ids.auditorPlaceId && ids.auditorProjectId
				? `/auditor/execute/${ids.auditorPlaceId}?projectId=${ids.auditorProjectId}`
				: null,
		segments: ["auditor", "execute"],
		states: [{ name: "overview", label: "Auditor Execute" }]
	},
	{
		role: "auditor",
		route: () => "/auditor/reports",
		segments: ["auditor", "reports"],
		states: [{ name: "overview", label: "Auditor Reports" }]
	},
	{
		role: "auditor",
		route: ids => (ids.auditorAuditId ? `/auditor/reports/${ids.auditorAuditId}` : null),
		segments: ["auditor", "reports", "detail"],
		states: [{ name: "overview", label: "Auditor Report Detail" }]
	},
	{
		role: "auditor",
		route: () => "/settings",
		segments: ["auditor", "settings"],
		states: [
			{ name: "overview", label: "Auditor Settings" },
			{
				name: "account-menu-open",
				label: "Auditor Settings - Account menu",
				optional: true,
				setup: ({ page }) => openUserMenu(page)
			}
		]
	}
];
