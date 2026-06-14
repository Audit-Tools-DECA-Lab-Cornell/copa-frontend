import type { ComponentType } from "react";

import { AntiClipboardPage } from "@/components/landing/concepts/anti-clipboard";
import { ChildrenFirstPage } from "@/components/landing/concepts/children-first";
import { DeliverableFirstPage } from "@/components/landing/concepts/deliverable-first";
import { EditorialMinimalPage } from "@/components/landing/concepts/editorial-minimal";
import { FieldToBoardroomLoopPage } from "@/components/landing/concepts/field-to-boardroom-loop";
import { InteractivePlatformTourPage } from "@/components/landing/concepts/interactive-platform-tour";
import { ManagerCommandCenterPage } from "@/components/landing/concepts/manager-command-center";
import { PortfolioAtScalePage } from "@/components/landing/concepts/portfolio-at-scale";
import { TheEvidencePage } from "@/components/landing/concepts/the-evidence";
import { TwoSurfacesOneAccountPage } from "@/components/landing/concepts/two-surfaces-one-account";

/**
 * Registry for the COPA landing-page concept routes.
 *
 * Each concept is a real, standalone public landing page that sells COPA to a
 * specific audience with its own narrative and layout - not a shared template.
 * `CONCEPT_META` drives the internal chooser and per-route metadata; the
 * component map holds the concepts that are built and ready to preview.
 *
 * These routes are internal previews for choosing a public homepage direction,
 * so they are marked noindex.
 */

export type ConceptAccent = "moss" | "terracotta" | "slate" | "violet" | "neutral";

export interface ConceptMeta {
	slug: string;
	/** Internal label for the chooser. */
	title: string;
	/** One-line, user-facing promise the page leads with. */
	teaser: string;
	accent: ConceptAccent;
}

export const CONCEPT_META: readonly ConceptMeta[] = [
	{
		slug: "manager-command-center",
		title: "Manager Command Center",
		teaser: "Run your whole play-quality program from one place.",
		accent: "moss"
	},
	{
		slug: "field-to-boardroom-loop",
		title: "Field-to-Boardroom Loop",
		teaser: "Assign, audit, and report - the whole loop in one system.",
		accent: "terracotta"
	},
	{
		slug: "the-evidence",
		title: "The Evidence",
		teaser: "Play-quality evidence your funders and peers will respect.",
		accent: "violet"
	},
	{
		slug: "interactive-platform-tour",
		title: "Interactive Platform Tour",
		teaser: "See the platform that turns site visits into decisions.",
		accent: "slate"
	},
	{
		slug: "anti-clipboard",
		title: "The Anti-Clipboard",
		teaser: "There's more to a playspace than a clipboard can capture.",
		accent: "terracotta"
	},
	{
		slug: "deliverable-first",
		title: "Deliverable-First",
		teaser: "Board-ready reports, straight from the field.",
		accent: "moss"
	},
	{
		slug: "two-surfaces-one-account",
		title: "Two Surfaces, One Account",
		teaser: "You coordinate. Your team executes. One shared record.",
		accent: "slate"
	},
	{
		slug: "children-first",
		title: "Children-First",
		teaser: "Build playspaces children can claim as their own.",
		accent: "terracotta"
	},
	{
		slug: "editorial-minimal",
		title: "Editorial Minimal",
		teaser: "Beyond accessible. Truly playable.",
		accent: "neutral"
	},
	{
		slug: "portfolio-at-scale",
		title: "Portfolio at Scale",
		teaser: "One playspace or thirty - assessed the same rigorous way.",
		accent: "slate"
	}
] as const;

/** Concepts that are built and ready to preview, mapped to their page component. */
const CONCEPT_COMPONENTS: Record<string, ComponentType> = {
	"manager-command-center": ManagerCommandCenterPage,
	"field-to-boardroom-loop": FieldToBoardroomLoopPage,
	"the-evidence": TheEvidencePage,
	"interactive-platform-tour": InteractivePlatformTourPage,
	"anti-clipboard": AntiClipboardPage,
	"deliverable-first": DeliverableFirstPage,
	"two-surfaces-one-account": TwoSurfacesOneAccountPage,
	"children-first": ChildrenFirstPage,
	"editorial-minimal": EditorialMinimalPage,
	"portfolio-at-scale": PortfolioAtScalePage
};

const conceptMetaMap = new Map(CONCEPT_META.map(meta => [meta.slug, meta]));

export function getConceptMeta(slug: string): ConceptMeta | undefined {
	return conceptMetaMap.get(slug);
}

export function getConceptComponent(slug: string): ComponentType | undefined {
	return CONCEPT_COMPONENTS[slug];
}

export function isConceptBuilt(slug: string): boolean {
	return slug in CONCEPT_COMPONENTS;
}

export function getBuiltConceptSlugs(): string[] {
	return Object.keys(CONCEPT_COMPONENTS);
}
