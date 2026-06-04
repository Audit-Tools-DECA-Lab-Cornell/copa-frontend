import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getPublicResources } from "@/lib/resources/public-resources";

export function PublicResourcesShell({ children }: Readonly<{ children: React.ReactNode }>) {
	const resources = getPublicResources();

	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))]">
			<header className="border-b border-edge/60 bg-background/90 backdrop-blur">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<Link href="/resources" className="flex min-w-0 items-center gap-3">
							<div className="flex size-11 items-center justify-center rounded-2xl border border-edge/40 bg-card shadow-card">
								<Image src="/icon.png" alt="Playspace" width={32} height={32} />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
									Playspace
								</p>
								<p className="truncate text-sm text-muted-foreground">Privacy & legal documents</p>
							</div>
						</Link>

						<Button asChild size="sm" variant="outline">
							<Link href="/login">Sign in</Link>
						</Button>
					</div>

					<nav
						aria-label="Public resource navigation"
						className="flex flex-wrap items-center gap-2 border-t-2 border-edge/50 pt-4">
						{resources.map(resource => (
							<Button key={resource.slug} asChild size="sm" variant="ghost">
								<Link href={`/resources/${resource.slug}`}>{resource.title}</Link>
							</Button>
						))}
					</nav>
				</div>
			</header>

			<main>{children}</main>

			<footer className="border-t-2 border-edge/50 bg-card/70">
				<div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
					<div className="space-y-3">
						<p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Playspace</p>
						<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
							This area contains the current privacy and legal documents for Playspace. These pages are
							always publicly accessible and reflect the most recent version of each document.
						</p>
					</div>

					<div className="space-y-3">
						<p className="text-sm font-semibold text-foreground">Documents</p>
						<ul className="space-y-2 text-sm text-muted-foreground">
							{resources.map(resource => (
								<li key={resource.slug}>
									<Link
										href={`/resources/${resource.slug}`}
										className="transition-colors hover:text-foreground">
										{resource.title}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>
			</footer>
		</div>
	);
}
