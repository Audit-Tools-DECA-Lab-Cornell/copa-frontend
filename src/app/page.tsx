import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { createElement } from "react";

import { getRotationConcept } from "@/lib/landing/rotation";

/**
 * Public homepage.
 *
 * The landing page rotates through the COPA concept pages so each gets fair,
 * peak-hour exposure (see lib/landing/rotation). The page is cached, so the
 * rotation costs no client-side JavaScript - the concept is chosen at
 * render/revalidation time and frozen for the life of the cache entry.
 *
 * Authenticated visitors are redirected to their dashboard by the proxy before
 * this cached page is served, so no per-request session read happens here.
 */

export const metadata: Metadata = {
	title: "COPA | Comprehensive Outdoor Playspace Audit Tool",
	description:
		"COPA is a research-informed assessment framework for evaluating play value and usability in outdoor playspaces.",
	openGraph: {
		title: "COPA | Beyond accessible. Truly playable.",
		description: "Evaluate outdoor playspaces by what children can actually do, feel, and experience there.",
		type: "website"
	},
	twitter: {
		card: "summary_large_image",
		title: "COPA | Beyond accessible. Truly playable.",
		description: "A research-informed way to evaluate play value and usability in outdoor playspaces."
	}
};

export default async function HomePage() {
	"use cache";
	// Matches the previous 2-hour ISR cadence: the rotation slug is chosen once
	// per cache entry and refreshed on the background revalidation pass.
	cacheLife({ stale: 300, revalidate: 7200, expire: 86400 });

	const { Component: selected } = getRotationConcept();

	if (!selected) {
		notFound();
	}

	return createElement(selected);
}
