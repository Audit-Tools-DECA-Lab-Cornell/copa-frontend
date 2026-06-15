import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createElement } from "react";

import { getRotationConcept } from "@/lib/landing/rotation";

/**
 * Public homepage.
 *
 * The landing page rotates through the COPA concept pages so each gets fair,
 * peak-hour exposure (see lib/landing/rotation). The page is statically rendered
 * and regenerated every two hours via ISR, so the rotation costs no client-side
 * JavaScript - the concept is chosen at render/regeneration time.
 *
 * Authenticated visitors are redirected to their dashboard by middleware before
 * this static page is served, so no per-request session read happens here.
 */

// The root layout reads the request locale, which would otherwise render every
// route dynamically. The landing pages use no translations, so we opt the
// homepage back into static rendering; `revalidate` then drives the rotation.
export const dynamic = "force-static";
export const revalidate = 7200; // 2 hours - matches the rotation slot length.

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

export default function HomePage() {
	const { Component: selected } = getRotationConcept();

	if (!selected) {
		notFound();
	}

	return createElement(selected);
}
