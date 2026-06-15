import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicResourceKindLabel, getPublicResources, type PublicResource } from "@/lib/resources/public-resources";

export function PublicResourceDocument({ resource }: Readonly<{ resource: PublicResource }>) {
	const { document } = resource;
	const relatedResources = getPublicResources().filter(candidate => candidate.slug !== resource.slug);

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Button asChild size="sm" variant="ghost">
					<Link href="/resources">
						<ArrowLeft className="size-4" aria-hidden="true" />
						All resources
					</Link>
				</Button>
				<Badge variant="outline">{getPublicResourceKindLabel(resource.kind)}</Badge>
			</div>

			<header className="flex flex-col gap-4">
				<Badge variant="secondary" className="w-fit">
					{document.eyebrow}
				</Badge>
				<div className="space-y-3">
					<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
						{document.title}
					</h1>
					<p className="text-sm text-muted-foreground">Updated {document.last_updated}</p>
					<p className="max-w-3xl text-base leading-7 text-muted-foreground">{document.summary}</p>
				</div>
			</header>

			<div className="space-y-4">
				{document.sections.map(section => (
					<Card key={section.key}>
						<CardHeader className="pb-2">
							<CardTitle className="text-xl">{section.title}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{section.body.map(paragraph => (
								<p key={paragraph} className="text-sm leading-7 text-muted-foreground sm:text-base">
									{paragraph}
								</p>
							))}
							{section.bullets.length > 0 ? (
								<ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base">
									{section.bullets.map(bullet => (
										<li key={bullet}>{bullet}</li>
									))}
								</ul>
							) : null}
						</CardContent>
					</Card>
				))}
			</div>

			{relatedResources.length > 0 ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-xl">Related resources</CardTitle>
						<CardDescription>Other public Playspace documents.</CardDescription>
					</CardHeader>
					<CardContent className={relatedResources.length === 1 ? "" : "grid gap-3 md:grid-cols-2"}>
						{relatedResources.map(relatedResource => (
							<Link
								key={relatedResource.slug}
								href={`/resources/${relatedResource.slug}`}
								className="group flex items-start justify-between gap-4 rounded-card border border-edge/40 bg-card/80 p-4 transition-colors hover:border-primary/35 hover:bg-accent/50">
								<div className="space-y-1">
									<p className="text-sm font-semibold text-foreground">{relatedResource.title}</p>
									<p className="text-sm leading-6 text-muted-foreground">
										{relatedResource.description}
									</p>
								</div>
								<ArrowRight
									className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
									aria-hidden="true"
								/>
							</Link>
						))}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
