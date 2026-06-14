import type { ComponentType } from "react";

import { CONCEPT_META, getConceptComponent, getConceptMeta, isConceptBuilt } from "@/lib/landing/concepts";

/**
 * Public landing-page rotation.
 *
 * The homepage cycles through every built concept so each one gets real
 * exposure. Selection is a pure function of the wall-clock time at render
 * (regeneration) time, so the page stays statically rendered - the rotation
 * happens via ISR revalidation, never in the browser.
 *
 * ## Fairness
 *
 * The naive choice - `concept = slotIndex % N` - is unfair: with 10 concepts,
 * 2-hour slots, and a 24-hour day, each concept would only ever land in half of
 * the daily time slots, so some concepts would be permanently stuck in the
 * off-peak hours nobody sees.
 *
 * Instead the concept is chosen as `(dayNumber + slotOfDay) % N`:
 *   - within a day it advances by one every 2-hour slot (visible rotation), and
 *   - across days the whole pattern shifts by one each day.
 *
 * For any fixed time-of-day slot, the concept shown cycles through all N
 * concepts over N consecutive days. So across a 10-day window every concept
 * occupies every 2-hour slot of the day exactly once - including the peak ones.
 * No concept is condemned to only ever show at 2am.
 */

/** Slot length in hours. The page revalidates on this cadence. */
export const ROTATION_SLOT_HOURS = 2;

/**
 * Time zone whose local clock defines the 2-hour slots and day boundaries.
 * Fairness holds in any zone; this just anchors "peak hours" to one audience.
 * Change this single constant to retarget the rotation to another region.
 */
export const ROTATION_TIME_ZONE = "America/New_York";

/** Built concepts in their fixed rotation order. */
export const ROTATION_ORDER: readonly string[] = CONCEPT_META.map(meta => meta.slug).filter(isConceptBuilt);

type LocalSlot = { dayNumber: number; slotOfDay: number };

/** Extract the rotation-relevant local calendar fields for a moment in time. */
function localSlot(date: Date): LocalSlot {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: ROTATION_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		hour12: false
	}).formatToParts(date);

	const field = (type: string) => Number(parts.find(part => part.type === type)?.value ?? "0");

	const year = field("year");
	const month = field("month");
	const day = field("day");
	// `hour12: false` can report midnight as 24 in some runtimes; normalize to 0.
	const hour = field("hour") % 24;

	// A stable, monotonic day counter derived from the local calendar date.
	const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
	const slotOfDay = Math.floor(hour / ROTATION_SLOT_HOURS);

	return { dayNumber, slotOfDay };
}

/** The concept slug to show for a given moment (defaults to now). */
export function getRotationSlug(date: Date = new Date()): string {
	const order = ROTATION_ORDER;
	if (order.length === 0) {
		return "";
	}

	const { dayNumber, slotOfDay } = localSlot(date);
	const index = (((dayNumber + slotOfDay) % order.length) + order.length) % order.length;
	return order[index];
}

export interface RotationSelection {
	slug: string;
	Component: ComponentType | undefined;
	title: string | undefined;
}

/** The resolved concept (slug, component, and human title) for the moment. */
export function getRotationConcept(date: Date = new Date()): RotationSelection {
	const slug = getRotationSlug(date);
	return {
		slug,
		Component: getConceptComponent(slug),
		title: getConceptMeta(slug)?.title
	};
}
