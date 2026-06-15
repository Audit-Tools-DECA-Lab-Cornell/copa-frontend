import { collapseSidebar, openMobileNav, openUserMenu } from "./steps";
import type { CaptureState } from "./types";

/**
 * App-chrome interactions that exist on every authenticated page. Attached to
 * each role's dashboard so the navigation shell is captured once per role
 * without bloating every page folder.
 */
export const dashboardChromeStates: readonly CaptureState[] = [
	{
		name: "sidebar-collapsed",
		label: "Sidebar collapsed",
		optional: true,
		setup: async ({ page }) => collapseSidebar(page)
	},
	{
		name: "mobile-nav-open",
		label: "Mobile navigation open",
		optional: true,
		setup: async ({ page }) => openMobileNav(page)
	},
	{
		name: "account-menu-open",
		label: "Account menu open",
		optional: true,
		setup: async ({ page }) => openUserMenu(page)
	}
];
