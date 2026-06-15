import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CONCEPT_META, type ConceptAccent, isConceptBuilt } from "@/lib/landing/concepts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
	title: "COPA landing-page concepts",
	description: "Internal preview gallery of COPA public landing-page directions.",
	robots: { index: false, follow: false }
};

const ACCENT_DOT: Record<ConceptAccent, string> = {
	moss: "bg-accent-moss",
	terracotta: "bg-accent-terracotta",
	slate: "bg-accent-slate",
	violet: "bg-accent-violet",
	neutral: "bg-foreground/60"
};

/** Internal chooser for comparing public landing-page directions. */
export default function ConceptsIndexRoute() {
	return (
		<div className="min-h-dvh bg-background text-foreground">
			<header className="border-b border-edge/60 bg-background/90 backdrop-blur">
				<div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
					<div>
						<p className="text-sm font-semibold text-foreground">COPA landing concepts</p>
						<p className="text-xs text-muted-foreground">Internal preview · not a public page</p>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href="/">Current homepage</Link>
					</Button>
				</div>
			</header>

			<main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
				<div className="max-w-2xl">
					<h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Landing-page directions
					</h1>
					<p className="mt-3 text-base leading-relaxed text-muted-foreground">
						Each link opens a complete, standalone landing page written for a specific audience. Open one to
						compare its narrative, layout, and visuals against the live homepage.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2">
					{CONCEPT_META.map((concept, index) => {
						const built = isConceptBuilt(concept.slug);
						const body = (
							<CardContent className="flex h-full flex-col gap-3 px-5 pb-5 pt-5">
								<div className="flex items-center gap-2.5">
									<span
										className={cn("size-2.5 rounded-full", ACCENT_DOT[concept.accent])}
										aria-hidden
									/>
									<span className="font-mono text-xs text-muted-foreground">
										{String(index + 1).padStart(2, "0")}
									</span>
									{built ? null : (
										<span className="ml-auto rounded-full border border-edge/50 bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
											In progress
										</span>
									)}
								</div>
								<div className="flex-1">
									<h2 className="text-lg font-semibold text-foreground">{concept.title}</h2>
									<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
										{concept.teaser}
									</p>
								</div>
								{built ? (
									<span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
										Open preview
										<ArrowRight className="size-4" />
									</span>
								) : null}
							</CardContent>
						);

						return built ? (
							<Link
								key={concept.slug}
								href={`/concepts/${concept.slug}`}
								className="group rounded-card transition-colors">
								<Card className="h-full gap-0 py-0 transition-colors group-hover:border-foreground/25">
									{body}
								</Card>
							</Link>
						) : (
							<Card key={concept.slug} className="h-full gap-0 py-0 opacity-70">
								{body}
							</Card>
						);
					})}
				</div>
			</main>
		</div>
	);
}
