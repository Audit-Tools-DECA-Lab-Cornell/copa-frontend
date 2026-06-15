/**
 * Shared marketing primitives for the public landing surfaces.
 *
 * These power the homepage-style concept pages: consistent header/footer chrome,
 * the eyebrow scale, and the device compositions that make product screens feel
 * tangible. Two device primitives matter:
 *
 *  - FramedMacbook: renders the pre-framed laptop exports (transparent PNGs that
 *    already include the device bezel) on a soft brand-color halo with an alpha
 *    drop shadow. No extra card chrome.
 *  - FloatingPhone: renders the transparent tilted phone renders the same way.
 *
 * Compose them inside a relative DeviceScene to stage multi-device shots
 * (a laptop with a phone floating in front, etc.).
 */

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { MobileNav } from "@/components/landing/mobile-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MARKETING_ROUTES = {
	signUp: "/signup",
	signIn: "/login"
} as const;

export type DeviceGlow = "primary" | "terracotta" | "moss" | "slate" | "violet" | "neutral";

const GLOW_CLASS: Record<DeviceGlow, string> = {
	primary: "bg-primary/20",
	terracotta: "bg-accent-terracotta/25",
	moss: "bg-accent-moss/20",
	slate: "bg-accent-slate/20",
	violet: "bg-accent-violet/22",
	neutral: "bg-foreground/10"
};

// ─── Eyebrow ────────────────────────────────────────────────────────────────

/** Section eyebrow - matches the dashboard header eyebrow tokens. */
export function Eyebrow({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
	return (
		<p
			className={cn(
				"text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-primary",
				className
			)}>
			{children}
		</p>
	);
}

// ─── Ambient background ───────────────────────────────────────────────────────

/** Soft brand-color blobs that keep device shots feeling lit, not pasted on. */
export function AmbientGlows({ className }: Readonly<{ className?: string }>) {
	return (
		<div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
			<div className="absolute -right-28 -top-24 size-96 rounded-full bg-accent-terracotta/10 blur-3xl" />
			<div className="absolute -left-24 top-44 size-80 rounded-full bg-accent-slate/10 blur-3xl" />
		</div>
	);
}

// ─── Device primitives ────────────────────────────────────────────────────────

/**
 * Wrapper for staging layered device compositions. Children are positioned
 * relative to this box, so a phone can float in front of a laptop, etc.
 */
export function DeviceScene({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
	return <div className={cn("relative", className)}>{children}</div>;
}

/**
 * Pre-framed laptop export. The source PNG already includes the device bezel
 * and transparent margins, so this only adds a brand-color halo and a soft
 * drop shadow. Source assets are 4340x2860 (≈1.517:1).
 *
 * HYBRID SLOT: pass a richer screenhance/frameuse composite to `src` (for
 * example a laptop-plus-phone scene) and it will drop straight in.
 */
export function FramedMacbook({
	src,
	alt,
	priority = false,
	glow = "primary",
	sizes = "(min-width: 1024px) 38rem, 92vw",
	className,
	haloClassName
}: Readonly<{
	src: string;
	alt: string;
	priority?: boolean;
	glow?: DeviceGlow;
	sizes?: string;
	className?: string;
	haloClassName?: string;
}>) {
	return (
		<div className={cn("relative w-full", className)}>
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute left-1/2 top-[46%] -z-10 h-[64%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[42%] blur-3xl",
					GLOW_CLASS[glow],
					haloClassName
				)}
			/>
			<Image
				src={src}
				alt={alt}
				width={2170}
				height={1430}
				priority={priority}
				sizes={sizes}
				className="h-auto w-full select-none [filter:drop-shadow(0_34px_60px_rgba(15,23,42,0.30))]"
			/>
		</div>
	);
}

/**
 * Transparent tilted phone render on a brand-color halo with a soft drop
 * shadow. Source assets are 1857x3096 (≈0.6:1).
 */
export function FloatingPhone({
	src,
	alt,
	priority = false,
	glow = "primary",
	sizes = "(min-width: 1024px) 16rem, 44vw",
	className,
	haloClassName
}: Readonly<{
	src: string;
	alt: string;
	priority?: boolean;
	glow?: DeviceGlow;
	sizes?: string;
	className?: string;
	haloClassName?: string;
}>) {
	return (
		<div className={cn("relative w-full max-w-[16rem]", className)}>
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
					GLOW_CLASS[glow],
					haloClassName
				)}
			/>
			<Image
				src={src}
				alt={alt}
				width={1857}
				height={3096}
				priority={priority}
				sizes={sizes}
				className="h-auto w-full select-none [filter:drop-shadow(0_26px_46px_rgba(15,23,42,0.26))]"
			/>
		</div>
	);
}

// ─── Header ───────────────────────────────────────────────────────────────────

export type NavLink = { href: string; label: string };

const DEFAULT_NAV: NavLink[] = [
	{ href: "#problem", label: "The Problem" },
	{ href: "#how", label: "How It Works" },
	{ href: "#pricing", label: "Pricing" }
];

/** Sticky marketing header shared across the public landing surfaces. */
export function LandingHeader({
	links = DEFAULT_NAV,
	ctaLabel = "Start an audit",
	ctaHref = MARKETING_ROUTES.signUp
}: Readonly<{ links?: NavLink[]; ctaLabel?: string; ctaHref?: string }>) {
	return (
		<header className="sticky top-0 z-50 border-b border-edge/60 bg-background/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				<Link href="/" className="flex items-center gap-2.5" aria-label="COPA - home">
					<Image
						className="flex size-9 items-center justify-center rounded-card border border-edge/50 bg-surface-raised shadow-card"
						src="/icon.png"
						alt=""
						width={48}
						height={48}
						aria-hidden
					/>
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold leading-5 text-foreground">COPA</p>
						<p className="truncate text-xs text-muted-foreground">Play Value &amp; Usability</p>
					</div>
				</Link>

				<nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
					{links.map(link => (
						<Button key={link.href} asChild variant="ghost" size="sm">
							<a href={link.href}>{link.label}</a>
						</Button>
					))}
				</nav>

				<div className="hidden items-center gap-2 md:flex">
					<Button asChild variant="outline" size="sm">
						<Link href={MARKETING_ROUTES.signIn}>Sign in</Link>
					</Button>
					<Button asChild size="sm">
						<Link href={ctaHref}>{ctaLabel}</Link>
					</Button>
				</div>

				<MobileNav links={links} ctaLabel={ctaLabel} ctaHref={ctaHref} />
			</div>
		</header>
	);
}

// ─── Footer ───────────────────────────────────────────────────────────────────

/** Shared marketing footer. */
export function LandingFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="border-t-2 border-edge/50 bg-card/70">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
				<Link href="/" className="flex items-center gap-2.5" aria-label="COPA - home">
					<span className="flex size-9 items-center justify-center rounded-card border border-edge/50 bg-surface-raised shadow-card">
						<Image src="/icon.png" alt="" width={32} height={32} aria-hidden />
					</span>
					<span className="font-heading text-lg font-bold tracking-tight text-foreground">COPA</span>
				</Link>
				<p className="max-w-xl text-sm leading-6 text-muted-foreground">
					Comprehensive Outdoor Playspace Audit Tool. Research-informed, expert-reviewed, and built for
					practice.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline" size="sm">
						<Link href={MARKETING_ROUTES.signIn}>Sign in</Link>
					</Button>
					<Button asChild size="sm">
						<Link href={MARKETING_ROUTES.signUp}>
							Start an audit
							<ArrowRight className="size-4" />
						</Link>
					</Button>
				</div>
			</div>
			<div className="border-t border-edge/50">
				<div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
					<p className="text-xs text-muted-foreground">
						© {year} COPA - Comprehensive Outdoor Playspace Audit Tool. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
