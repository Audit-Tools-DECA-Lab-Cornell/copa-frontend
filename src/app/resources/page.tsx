import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicResourceKindLabel, getPublicResources } from "@/lib/resources/public-resources";

export const metadata: Metadata = {
	title: "Resources | Playspace",
	description:
		"Read the Playspace Privacy Notice and Terms and Conditions for the web and mobile audit platform.",
	openGraph: {
		title: "Resources | Playspace",
		description:
			"Read the Playspace Privacy Notice and Terms and Conditions for the web and mobile audit platform."
	},
	robots: { index: true, follow: true }
};

export default function PublicResourcesIndexPage() {
	const resources = getPublicResources();

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
			<header className="flex flex-col gap-4">
				<div className="space-y-3">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
						Resources
					</h1>
					<p className="max-w-3xl text-base leading-7 text-muted-foreground">
						Privacy and legal documents for Playspace. These pages are always publicly accessible and
						reflect the current version of each document.
					</p>
				</div>
			</header>

			<div className="grid gap-4 md:grid-cols-2">
				{resources.map(resource => (
					<Card key={resource.slug} className="flex h-full flex-col border-border/70 bg-card/90">
						<CardHeader className="gap-3">
							<div className="flex items-center justify-between gap-3">
								<Badge variant="outline">{getPublicResourceKindLabel(resource.kind)}</Badge>
								<Badge variant="secondary">{resource.document.last_updated}</Badge>
							</div>
							<CardTitle>{resource.title}</CardTitle>
							<CardDescription>{resource.description}</CardDescription>
						</CardHeader>
						<CardContent className="mt-auto">
							<Button asChild variant="outline">
								<Link href={`/resources/${resource.slug}`}>
									Open
									<ArrowRight className="size-4" aria-hidden="true" />
								</Link>
							</Button>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
