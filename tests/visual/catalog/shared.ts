import { collapseSidebar, openMobileNav, openUserMenu } from "./steps";
import type { CaptureState } from "./types";

/**
 * App-chrome interactions that exist on every authenticated page. Attached to
 * each role's dashboard so the navigation shell is captured once per role
 * without bloating every page folder.
 *
 * `pageLabel` is the owning page's Percy label ("Admin Dashboard"). Percy keys
 * snapshots by name and drops later duplicates, so the label has to carry the
 * role - a shared "Sidebar collapsed" would silently discard every role's
 * chrome but the first one captured.
 */
export function dashboardChromeStates(pageLabel: string): readonly CaptureState[] {
	return [
		{
			name: "sidebar-collapsed",
			label: `${pageLabel} - Sidebar collapsed`,
			optional: true,
			setup: async ({ page }) => collapseSidebar(page)
		},
		{
			name: "mobile-nav-open",
			label: `${pageLabel} - Mobile navigation open`,
			optional: true,
			setup: async ({ page }) => openMobileNav(page)
		},
		{
			name: "account-menu-open",
			label: `${pageLabel} - Account menu open`,
			optional: true,
			setup: async ({ page }) => openUserMenu(page)
		}
	];
}
