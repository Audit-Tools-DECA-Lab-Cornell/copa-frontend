"use client";

/**
 * Client island for the marketing header's mobile menu.
 *
 * Isolating the only stateful piece of the header here keeps LandingHeader - and
 * every landing page that uses it - a server component, so the pages render
 * statically with no client bundle beyond this small toggle.
 */

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MARKETING_ROUTES, type NavLink } from "@/components/landing/shared";
import { Button } from "@/components/ui/button";

export function MobileNav({
	links,
	ctaLabel,
	ctaHref
}: Readonly<{ links: NavLink[]; ctaLabel: string; ctaHref: string }>) {
	const [open, setOpen] = useState(false);

	return (
		<div className="md:hidden">
			<Button
				type="button"
				variant="outline"
				size="icon"
				onClick={() => setOpen(v => !v)}
				aria-label={open ? "Close menu" : "Open menu"}
				aria-expanded={open}>
				{open ? <X className="size-4" /> : <Menu className="size-4" />}
			</Button>

			{open ? (
				<div className="absolute inset-x-0 top-16 border-b border-t border-edge/60 bg-background px-4 py-4 shadow-card">
					<nav className="mx-auto flex w-full max-w-6xl flex-col gap-1" aria-label="Mobile navigation">
						{links.map(link => (
							<Button key={link.href} asChild variant="ghost" size="sm" className="justify-start">
								<a href={link.href} onClick={() => setOpen(false)}>
									{link.label}
								</a>
							</Button>
						))}
						<div className="mt-2 flex flex-col gap-2">
							<Button asChild variant="outline" size="sm">
								<Link href={MARKETING_ROUTES.signIn}>Sign in</Link>
							</Button>
							<Button asChild size="sm">
								<Link href={ctaHref}>{ctaLabel}</Link>
							</Button>
						</div>
					</nav>
				</div>
			) : null}
		</div>
	);
}
