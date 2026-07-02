import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createElement } from "react";

import { getBuiltConceptSlugs, getConceptComponent, getConceptMeta } from "@/lib/landing/concepts";

export function generateStaticParams(): Array<{ slug: string }> {
	return getBuiltConceptSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
	const { slug } = await params;
	const meta = getConceptMeta(slug);

	if (!meta) {
		return { title: "COPA", robots: { index: false, follow: false } };
	}

	return {
		title: `${meta.title} | COPA preview`,
		description: meta.teaser,
		robots: { index: false, follow: false }
	};
}

export default async function ConceptRoute({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
	const { slug } = await params;

	const validSlugs = getBuiltConceptSlugs();
	if (!validSlugs.includes(slug)) {
		notFound();
	}

	const selected = getConceptComponent(slug);

	if (!selected) {
		notFound();
	}

	return createElement(selected);
}
