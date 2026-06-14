import type { Page } from "@playwright/test";

import type { BrowserSessionRole } from "../../helpers/api";
import type { SeededVisualRoutes } from "../../helpers/visual-routes";

export type CaptureRole = BrowserSessionRole;

/** Stable seed identifiers resolved once per capture run. */
export type SeededIds = SeededVisualRoutes["ids"];

export interface CaptureContext {
	readonly page: Page;
	readonly ids: SeededIds;
}

/**
 * One screenshot within a page's folder. The first state of a target is the
 * page at rest ("overview"); later states reach a specific piece of UI such as
 * an open dialog, an open-then-closed dialog, a collapsed sidebar, or an open
 * menu. Every state is reached from a freshly prepared page so states stay
 * independent and order never matters.
 */
export interface CaptureState {
	/** Kebab-case filename suffix, e.g. "overview", "create-dialog-open". */
	readonly name: string;
	/** Human-readable label used for the Percy snapshot name. */
	readonly label: string;
	/** Interaction that drives the freshly prepared page into this state. */
	readonly setup?: (ctx: CaptureContext) => Promise<void>;
	/**
	 * When true, a setup that cannot find its target (missing button, feature
	 * gated off for the seed data) marks the screenshot skipped instead of
	 * failing the run. Page "overview" states should stay required.
	 */
	readonly optional?: boolean;
}

/**
 * A single page (or feature surface) in the app. `segments` is the nested
 * folder path under public/screenshots that mirrors where the page lives in the
 * web app, e.g. ["manager", "reports", "place-report"].
 */
export interface CaptureTarget {
	readonly role: CaptureRole;
	/**
	 * When true the page is captured with no auth session seeded (login, signup
	 * and other public routes). `role` is still required for typing but unused.
	 */
	readonly unauthenticated?: boolean;
	/**
	 * Builds the route to visit. Return null to skip the whole target when the
	 * seed data needed for the route (an audit id, a place id) is unavailable.
	 */
	readonly route: (ids: SeededIds) => string | null;
	readonly segments: readonly string[];
	/** Readiness check after navigation; defaults to "main is visible". */
	readonly waitFor?: (ctx: CaptureContext) => Promise<void>;
	readonly states: readonly CaptureState[];
}
