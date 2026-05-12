import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicResourceDocument } from "@/components/resources/public-resource-document";
import { getPublicResourceBySlug, getPublicResources } from "@/lib/resources/public-resources";

type PageParams = { slug: string };

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
	return getPublicResources().map(resource => ({ slug: resource.slug }));
}

export async function generateMetadata({
	params
}: Readonly<{
	params: Promise<PageParams>;
}>): Promise<Metadata> {
	const { slug } = await params;
	const resource = getPublicResourceBySlug(slug);

	if (!resource) {
		return {
			title: "Resource Not Found",
			description: "The requested Playspace public resource could not be found."
		};
	}

	return {
		title: `${resource.title} | Playspace`,
		description: resource.description,
		openGraph: {
			title: `${resource.title} | Playspace`,
			description: resource.description
		},
		robots: { index: true, follow: true }
	};
}

export default async function PublicResourcePage({
	params
}: Readonly<{
	params: Promise<PageParams>;
}>) {
	const { slug } = await params;
	const resource = getPublicResourceBySlug(slug);

	if (!resource) {
		notFound();
	}

	return <PublicResourceDocument resource={resource} />;
}
