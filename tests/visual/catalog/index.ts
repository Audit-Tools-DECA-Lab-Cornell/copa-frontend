import { adminTargets } from "./admin";
import { auditorTargets } from "./auditor";
import { authTargets } from "./auth";
import { managerTargets } from "./manager";
import type { CaptureTarget } from "./types";

/**
 * The full screenshot catalog. Order is auth → admin → manager → auditor so the
 * generated folder tree under public/screenshots reads top-down by area.
 */
export const captureCatalog: readonly CaptureTarget[] = [
	...authTargets,
	...adminTargets,
	...managerTargets,
	...auditorTargets
];

export type { CaptureContext, CaptureState, CaptureTarget, SeededIds } from "./types";
