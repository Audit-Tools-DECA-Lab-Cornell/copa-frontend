"use client";

/**
 * COPA Public Homepage - Major Redesign
 *
 * Implements all required sections from the COPA homepage brief:
 *  1. Header / Navigation
 *  2. Hero (floating product render + instrument stats)
 *  3. Problem section
 *  4. What COPA Measures (constructs + scoring lenses, anchored by a report render)
 *  5. Whole-Playspace Evaluation
 *  6. In the Field (inverted band: guided, offline, resumable audits)
 *  7. How It Works (alternating screenshot / step layout)
 *  8. Who Uses COPA
 *  9. Outcomes / Benefits (paired with the reports + export render)
 * 10. Research Foundation
 * 11. Pricing (web + mobile platform bundle - no invented dollar amounts)
 * 12. Access Options
 * 13. Final CTA band
 * 14. Site Footer
 *
 * Product renders live in public/marketing/ and are framed by the DeviceShot
 * primitive: transparent device PNGs on a token-based color halo with an alpha
 * drop shadow. Light and dark screens are mixed to show the app's two themes.
 *
 * Design system: shadcn Card/Button primitives, semantic foreground tokens,
 * dashboard header eyebrow scale, inverted bands, and report-style accent bars.
 *
 * Copy rules: no fake metrics, no AI language, no internal dev terms,
 * no fake institutional partners, no testimonials.
 */

import {
	ArrowRight,
	Building2,
	Check,
	FlaskConical,
	HeartHandshake,
	Landmark,
	ListChecks,
	type LucideIcon,
	Menu,
	Monitor,
	RotateCcw,
	School,
	Smartphone,
	TreePine,
	Users,
	WifiOff,
	X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type PvScaleKey, SCALE_ACCENT_BAR_CLASS_NAMES } from "@/lib/audit/scale-colors";
import { cn } from "@/lib/utils";

// ─── Route constants ──────────────────────────────────────────────────────────

const SIGN_UP_PATH = "/signup";
const SIGN_IN_PATH = "/login";

// ─── Shared primitives ────────────────────────────────────────────────────────

/** Section eyebrow - matches dashboard header eyebrow tokens. */
function Eyebrow({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-primary">
			{children}
		</p>
	);
}

/** Consistent icon treatment for audience cards - muted, no per-card accent colors. */
function IconBadge({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
	return (
		<span className="inline-flex size-10 items-center justify-center rounded-card bg-muted text-muted-foreground">
			<Icon className="size-4" aria-hidden />
		</span>
	);
}

/** Content card with optional top accent bar - mirrors report stat cards. */
function AccentCard({
	accent,
	className,
	children
}: Readonly<{ accent?: string; className?: string; children: React.ReactNode }>) {
	return (
		<Card className={cn("relative gap-0 overflow-hidden py-0", className)}>
			{accent ? <div className={cn("absolute inset-x-0 top-0 h-1", accent)} aria-hidden /> : null}
			<CardContent className="space-y-2 px-5 pb-5 pt-6">{children}</CardContent>
		</Card>
	);
}

// ─── Device showcase ──────────────────────────────────────────────────────────

type DeviceGlow = "primary" | "terracotta" | "moss" | "slate" | "violet" | "neutral";

const DEVICE_GLOW_CLASS: Record<DeviceGlow, string> = {
	primary: "bg-primary/20",
	terracotta: "bg-accent-terracotta/25",
	moss: "bg-accent-moss/20",
	slate: "bg-accent-slate/20",
	violet: "bg-accent-violet/20",
	neutral: "bg-foreground/10"
};

/**
 * Floating product screenshot. The source renders are transparent device PNGs,
 * so each sits on a soft brand-color halo with an alpha drop shadow - no card
 * chrome - which keeps the screens feeling tangible rather than pasted on.
 */
function DeviceShot({
	src,
	alt,
	width,
	height,
	priority = false,
	glow = "primary",
	sizes = "(min-width: 1024px) 24rem, (min-width: 640px) 60vw, 80vw",
	className,
	haloClassName
}: Readonly<{
	src: string;
	alt: string;
	width: number;
	height: number;
	priority?: boolean;
	glow?: DeviceGlow;
	sizes?: string;
	className?: string;
	haloClassName?: string;
}>) {
	return (
		<div className={cn("relative mx-auto w-full max-w-sm", className)}>
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
					DEVICE_GLOW_CLASS[glow],
					haloClassName
				)}
			/>
			<Image
				src={src}
				alt={alt}
				width={width}
				height={height}
				priority={priority}
				sizes={sizes}
				className="h-auto w-full select-none [filter:drop-shadow(0_28px_50px_rgba(15,23,42,0.22))]"
			/>
		</div>
	);
}

// ─── 1. Header ────────────────────────────────────────────────────────────────

function SiteHeader() {
	const [open, setOpen] = React.useState(false);

	const links = [
		{ href: "#problem", label: "The Problem" },
		{ href: "#measures", label: "What It Measures" },
		{ href: "#how", label: "How It Works" },
		{ href: "#audiences", label: "Who Uses It" },
		{ href: "#pricing", label: "Pricing" },
		{ href: "#access", label: "Access" }
	];

	return (
		<header className="sticky top-0 z-50 border-b border-edge/60 bg-background/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				<Link href="/" className="flex items-center gap-2.5" aria-label="COPA - home">
					{/* <span className="flex size-9 items-center justify-center rounded-card border border-edge/50 bg-surface-raised shadow-card"> */}
					<Image
						className="flex size-9 items-center justify-center rounded-card border border-edge/50 bg-surface-raised shadow-card"
						src="/icon.png"
						alt=""
						width={48}
						height={48}
						aria-hidden
					/>
					{/* </span> */}
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
						<Link href={SIGN_IN_PATH}>Sign in</Link>
					</Button>
					<Button asChild size="sm">
						<Link href={SIGN_UP_PATH}>Start an audit</Link>
					</Button>
				</div>

				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => setOpen(v => !v)}
					aria-label={open ? "Close menu" : "Open menu"}
					aria-expanded={open}
					className="md:hidden">
					{open ? <X className="size-4" /> : <Menu className="size-4" />}
				</Button>
			</div>

			{open ? (
				<div className="border-t border-edge/60 bg-background px-4 py-4 md:hidden">
					<nav className="flex flex-col gap-1" aria-label="Mobile navigation">
						{links.map(link => (
							<Button key={link.href} asChild variant="ghost" size="sm" className="justify-start">
								<a href={link.href} onClick={() => setOpen(false)}>
									{link.label}
								</a>
							</Button>
						))}
						<div className="mt-2 flex flex-col gap-2">
							<Button asChild variant="outline" size="sm">
								<Link href={SIGN_IN_PATH}>Sign in</Link>
							</Button>
							<Button asChild size="sm">
								<Link href={SIGN_UP_PATH}>Start an audit</Link>
							</Button>
						</div>
					</nav>
				</div>
			) : null}
		</header>
	);
}

// ─── 2. Hero ──────────────────────────────────────────────────────────────────

function Hero() {
	const stats: Array<[string, string]> = [
		["2", "Core constructs"],
		["4", "Scoring lenses"],
		["10", "Playspace elements"]
	];

	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			{/* Ambient brand gradient - keeps the dark device feeling lit, not pasted on. */}
			<div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute -right-28 -top-24 size-96 rounded-full bg-accent-terracotta/10 blur-3xl" />
				<div className="absolute -left-24 top-44 size-80 rounded-full bg-accent-slate/10 blur-3xl" />
			</div>

			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-24 lg:pt-20">
				<div className="max-w-xl">
					<Eyebrow>Research-informed outdoor play assessment</Eyebrow>

					<h1
						id="hero-heading"
						className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						Beyond accessible. <span className="text-primary">Truly playable.</span>
					</h1>

					<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
						COPA is a research-informed framework that helps researchers, educators, designers, and planners
						evaluate the full richness of outdoor play opportunities - for children with and without
						disabilities.
					</p>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg">
							<Link href={SIGN_UP_PATH}>
								Start an audit
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<a href="#how">See how COPA works</a>
						</Button>
					</div>

					<dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-edge/50 pt-6">
						{stats.map(([value, label]) => (
							<div key={label}>
								<dt className="font-mono text-2xl font-semibold tabular-nums text-foreground">
									{value}
								</dt>
								<dd className="mt-0.5 text-xs leading-tight text-muted-foreground">{label}</dd>
							</div>
						))}
					</dl>
				</div>

				<DeviceShot
					src="/marketing/hero-dashboard-dark.png"
					alt="COPA mobile field dashboard showing assigned and completed playspace audits, a priority task with a progress bar, and offline-ready status"
					width={1857}
					height={3096}
					priority
					glow="terracotta"
					sizes="(min-width: 1024px) 26rem, 70vw"
					className="max-w-[17rem] sm:max-w-sm"
				/>
			</div>
		</section>
	);
}

// ─── 3. Problem ───────────────────────────────────────────────────────────────

function Problem() {
	const countedItems = [
		"Number of equipment pieces",
		"ADA transfer access points",
		"Fall-zone compliance",
		"Age-range markings",
		"Equipment condition ratings",
		"Surface type and coverage"
	];

	const copaItems = [
		["Choose", "how to engage?"],
		["Explore", "and take risks at their own level?"],
		["Belong", "- not just arrive?"],
		["Retreat, regulate, and return", "?"],
		["Play together", "with children of diverse abilities?"],
		["Find richness, variety, and invitation", "?"]
	] as [string, string][];

	return (
		<section
			id="problem"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="problem-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The gap</Eyebrow>
					<h2
						id="problem-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						We&apos;ve been measuring what adults can see.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Most playspaces are assessed by counting features, checking compliance, and measuring clearance
						zones. These matter. But they don&apos;t answer the question children actually live:{" "}
						<em>Can I really play here?</em>
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2">
					<Card className="gap-0 py-0">
						<CardContent className="space-y-4 px-6 pb-6 pt-6">
							<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
								What we&apos;ve been counting
							</p>
							<ul className="space-y-3">
								{countedItems.map(item => (
									<li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
										<span className="size-1.5 shrink-0 rounded-full bg-border" aria-hidden />
										{item}
									</li>
								))}
							</ul>
						</CardContent>
					</Card>

					<Card className="gap-0 border-primary/20 bg-primary/5 py-0">
						<CardContent className="space-y-4 px-6 pb-6 pt-6">
							<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
								What COPA asks instead
							</p>
							<ul className="space-y-3">
								{copaItems.map(([strong, rest]) => (
									<li
										key={strong}
										className="flex items-start gap-3 text-sm leading-snug text-muted-foreground">
										<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
										<span>
											Can children{" "}
											<strong className="font-semibold text-foreground">{strong} </strong>
											{rest}
										</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</div>

				<blockquote className="mt-8 border-l-2 border-primary pl-5 text-base font-medium leading-relaxed text-foreground sm:text-lg">
					&ldquo;Accessibility asks: can a child reach the playground. Usability asks: can children with
					diverse abilities participate, explore, choose, and belong once they get there.&rdquo;
				</blockquote>
			</div>
		</section>
	);
}

// ─── 4. What COPA Measures ────────────────────────────────────────────────────

function WhatCopasMeasures() {
	const lenses: Array<{ key: PvScaleKey; title: string; question: string }> = [
		{
			key: "provision",
			title: "Provision",
			question: "What features, materials, and opportunities are present?"
		},
		{
			key: "variety",
			title: "Variety",
			question: "Is there genuine variety in type, scale, and approach?"
		},
		{
			key: "challenge",
			title: "Challenge",
			question: "Can children find appropriate risk and growth at their own level?"
		},
		{
			key: "sociability",
			title: "Sociability",
			question: "Does the space support shared play, mixed abilities, and togetherness?"
		}
	];

	return (
		<section id="measures" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="measures-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:gap-16">
					<div>
						<div className="max-w-xl">
							<Eyebrow>What COPA measures</Eyebrow>
							<h2
								id="measures-heading"
								className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
								Two constructs. Four scoring lenses.
							</h2>
							<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
								Every playspace receives scores on two primary constructs, each assessed through four
								lenses that ask not just <em>Is it there?</em> but{" "}
								<em>How well does it serve diverse children?</em>
							</p>
						</div>

						<div className="mt-8 grid gap-4 sm:grid-cols-2">
							<AccentCard accent="bg-accent-terracotta">
								<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									Primary construct
								</p>
								<p className="font-mono text-5xl font-semibold text-accent-terracotta">PV</p>
								<h3 className="text-xl font-semibold text-foreground">Play Value</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">
									The variety, richness, and flexibility of play opportunities a space supports. A
									high play value space offers many ways to engage - physical, social, creative,
									sensory, and restorative - across a range of abilities and interests.
								</p>
							</AccentCard>
							<AccentCard accent="bg-accent-slate">
								<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									Primary construct
								</p>
								<p className="font-mono text-5xl font-semibold text-accent-slate">U</p>
								<h3 className="text-xl font-semibold text-foreground">Usability</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">
									Whether children with diverse abilities can actually participate, not just access.
									Usability considers how well the space supports children who move, sense, process,
									and communicate differently - individually and together.
								</p>
							</AccentCard>
						</div>
					</div>

					<figure className="lg:pl-2">
						<DeviceShot
							src="/marketing/report-scoring-tilted.png"
							alt="COPA report screen showing Play Value and Usability scores with a Provision, Variety, Challenge, and Sociability breakdown for a playspace"
							width={1857}
							height={3096}
							glow="slate"
							sizes="(min-width: 1024px) 22rem, 60vw"
							className="max-w-[16rem] sm:max-w-xs"
						/>
						<figcaption className="mt-5 text-center text-sm leading-relaxed text-muted-foreground">
							Every audit resolves to comparable Play Value and Usability scores - the same four lenses,
							applied the same way, on every space.
						</figcaption>
					</figure>
				</div>

				<div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{lenses.map(lens => (
						<AccentCard key={lens.key} accent={SCALE_ACCENT_BAR_CLASS_NAMES[lens.key]}>
							<h3 className="text-base font-semibold text-foreground">{lens.title}</h3>
							<p className="text-sm leading-relaxed text-muted-foreground italic">{lens.question}</p>
						</AccentCard>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── 5. Whole-Playspace Evaluation ───────────────────────────────────────────

function WholePlayspace() {
	const cells = [
		{
			wide: true,
			title: "Natural features",
			body: "Trees, vegetation, soil, water, boulders, and topography - the features that invite open-ended, sensory-rich play that manufactured equipment alone cannot replicate.",
			tags: ["Vegetation", "Water", "Soil", "Landform"]
		},
		{
			wide: false,
			title: "Manufactured features",
			body: "Fixed equipment and structures evaluated for variety, design quality, and range of invitation - not just presence.",
			tags: []
		},
		{
			wide: false,
			title: "Topography & surfaces",
			body: "Slopes, elevation changes, and varied ground textures that shape movement, challenge, and sensory experience.",
			tags: []
		},
		{
			wide: false,
			title: "Loose parts & malleable materials",
			body: "Sand, gravel, and moveable objects children can manipulate, combine, and transform.",
			tags: ["Open-ended", "Creative agency"]
		},
		{
			wide: false,
			title: "Enclosure & open space",
			body: "Enclosed spaces for retreat alongside open areas for running, gathering, and free movement.",
			tags: []
		},
		{
			wide: false,
			title: "Pathways & circulation",
			body: "How children move through the space - routes, loops, dead-ends, and thresholds that invite or restrict exploration.",
			tags: []
		},
		{
			wide: false,
			title: "Seating & amenities",
			body: "Surfaces, furnishings, shade structures, water access, and comfort features that extend how long and how well children can play.",
			tags: []
		},
		{
			wide: false,
			title: "Shade, weather & seasonality",
			body: "How sun, climate, and seasonal conditions affect the comfort and usability of the space year-round.",
			tags: []
		},
		{
			wide: false,
			title: "Rules, management & maintenance",
			body: "Posted rules, supervision practices, and upkeep quality - and how management decisions expand or restrict children's play.",
			tags: []
		},
		{
			wide: false,
			title: "Community & site context",
			body: "Connections to surrounding places, community identity, ecological character, and the neighbourhood relationships that shape who belongs.",
			tags: []
		}
	];

	return (
		<section
			id="wholespace"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="wholespace-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The whole playspace</Eyebrow>
					<h2
						id="wholespace-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Equipment is only the beginning.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA evaluates the entire environment as a living system of possibilities, constraints, and
						choices - not only what was purchased and installed.
					</p>
				</div>

				<div className="mt-10 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{cells.map(cell => (
						<Card key={cell.title} className={cn("gap-0 py-0", cell.wide && "sm:col-span-2")}>
							<CardContent className="space-y-2 px-5 pb-5 pt-5">
								<h3 className="text-sm font-semibold text-foreground">{cell.title}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{cell.body}</p>
								{cell.tags.length > 0 ? (
									<div className="flex flex-wrap gap-1.5 pt-1">
										{cell.tags.map(tag => (
											<span
												key={tag}
												className="inline-block rounded-full border border-edge/40 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
												{tag}
											</span>
										))}
									</div>
								) : null}
							</CardContent>
						</Card>
					))}
				</div>

				<p className="mt-10 border-l-2 border-primary pl-5 text-lg font-semibold leading-snug text-foreground sm:text-xl">
					A playspace is not a collection of features.
					<br />
					<span className="text-base font-normal text-muted-foreground">
						It is a living environment of possibilities, constraints, relationships, and choices.
					</span>
				</p>
			</div>
		</section>
	);
}

// ─── 6. In the Field (Zeigarnik / offline band) ──────────────────────────────

function FieldBand() {
	const points = [
		{
			icon: ListChecks,
			title: "Guided, section by section",
			body: "Structured prompts walk auditors through every element of a playspace, so nothing important is missed in the field."
		},
		{
			icon: WifiOff,
			title: "Built for no signal",
			body: "Audits run fully offline. Responses, notes, and photos are stored on the device and sync the moment connectivity returns."
		},
		{
			icon: RotateCcw,
			title: "Never lose your place",
			body: "Each audit tracks its own progress. Step away mid-visit and pick up exactly where you left off."
		}
	];

	return (
		<section
			id="field"
			className="scroll-mt-20 border-b border-edge/40 bg-foreground text-background"
			aria-labelledby="field-heading">
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
				<div className="order-2 max-w-xl lg:order-1">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-background/55">
						In the field
					</p>
					<h2
						id="field-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
						Designed to be finished onsite.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-background/70">
						A COPA audit is a guided sequence, not a blank form. Auditors move through each section with
						clear progress - and the tool holds their place until the assessment is complete.
					</p>

					<ul className="mt-8 space-y-5">
						{points.map(point => {
							const Icon = point.icon;
							return (
								<li key={point.title} className="flex gap-4">
									<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-background/10 text-background">
										<Icon className="size-4" aria-hidden />
									</span>
									<div>
										<h3 className="text-base font-semibold">{point.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-background/70">{point.body}</p>
									</div>
								</li>
							);
						})}
					</ul>
				</div>

				<div className="order-1 lg:order-2">
					<DeviceShot
						src="/marketing/field-questions-dark.png"
						alt="COPA mobile audit in progress, showing Provision questions on section three of seven for a playspace with selectable answer options"
						width={1857}
						height={3096}
						glow="terracotta"
						sizes="(min-width: 1024px) 26rem, 70vw"
						className="max-w-[17rem] sm:max-w-sm"
						haloClassName="bg-accent-terracotta/30"
					/>
				</div>
			</div>
		</section>
	);
}

// ─── 7. How It Works ─────────────────────────────────────────────────────────

function HowItWorks() {
	const steps: Array<{
		title: string;
		body: string;
		img: string;
		alt: string;
		glow: DeviceGlow;
	}> = [
		{
			title: "Assign a playspace",
			body: "Select or add the outdoor playspace to assess. Capture site information, location context, and relevant background before the visit.",
			img: "/marketing/step-place-detail.png",
			alt: "COPA place detail screen showing a playspace with its location, project, and assessment status before an audit begins",
			glow: "moss"
		},
		{
			title: "Complete an onsite audit",
			body: "Work through the COPA instrument in the field. Structured prompts guide observation of all playspace elements - not just equipment.",
			img: "/marketing/step-execute-section.png",
			alt: "COPA mobile audit section showing Playspace Character and Community questions with answer options during an onsite assessment",
			glow: "slate"
		},
		{
			title: "Capture observations and notes",
			body: "Record structured responses, contextual notes, and photo documentation, organised by construct, domain, and assessment lens.",
			img: "/marketing/step-section-notes.png",
			alt: "COPA mobile section notes screen with a free-text field for recommendations and save-and-next actions",
			glow: "terracotta"
		},
		{
			title: "Generate reports and guide decisions",
			body: "Review Play Value and Usability scores, domain breakdowns, and findings. Export reports to support renovation planning, funding requests, and design review.",
			img: "/marketing/step-report-detail.png",
			alt: "COPA report detail screen showing Play Value and Usability scoring tables with per-lens breakdowns for a playspace",
			glow: "violet"
		}
	];

	return (
		<section id="how" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="how-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="max-w-2xl">
					<Eyebrow>How it works</Eyebrow>
					<h2
						id="how-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						From site visit to shared understanding.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA guides structured observation, turns fieldwork into scored assessments, and produces
						reports that support planning, design, funding, and advocacy conversations.
					</p>
				</div>

				<ol className="mt-14 space-y-16 lg:space-y-24" aria-label="How COPA works - four steps">
					{steps.map((step, i) => {
						const flipped = i % 2 === 1;
						return (
							<li key={step.title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
								<div className={cn(flipped && "lg:order-2")}>
									<span className="inline-flex size-11 items-center justify-center rounded-card bg-solid-primary font-mono text-sm font-semibold text-solid-primary-text shadow-solid-primary">
										{String(i + 1).padStart(2, "0")}
									</span>
									<h3 className="mt-5 text-2xl font-semibold tracking-tight text-balance text-foreground">
										{step.title}
									</h3>
									<p className="mt-3 text-base leading-relaxed text-muted-foreground">{step.body}</p>
								</div>
								<div className={cn(flipped && "lg:order-1")}>
									<DeviceShot
										src={step.img}
										alt={step.alt}
										width={1857}
										height={3096}
										glow={step.glow}
										sizes="(min-width: 1024px) 22rem, 55vw"
										className="max-w-[15rem] sm:max-w-xs"
									/>
								</div>
							</li>
						);
					})}
				</ol>
			</div>
		</section>
	);
}

// ─── 8. Who Uses COPA ─────────────────────────────────────────────────────────

function WhoUsesCopa() {
	const audiences = [
		{
			icon: FlaskConical,
			title: "Researchers",
			body: "Use COPA as a structured instrument for comparative studies of play affordances, usability, and inclusive design across sites and populations."
		},
		{
			icon: School,
			title: "Schools & Educators",
			body: "Evaluate schoolyard environments as learning and development spaces. Build the case for improvements with evidence-based documentation."
		},
		{
			icon: HeartHandshake,
			title: "OTs & Child Development Practitioners",
			body: "Understand how outdoor environments support or limit children's sensory, motor, social, and emotional development across abilities."
		},
		{
			icon: TreePine,
			title: "Landscape Architects & Designers",
			body: "Evaluate existing spaces before redesign. Use COPA findings to ground design decisions in children's actual experiences and needs."
		},
		{
			icon: Building2,
			title: "Park Agencies & Municipalities",
			body: "Audit playspaces across a system. Prioritise investments, allocate maintenance resources, and track improvements with consistent, comparable scores."
		},
		{
			icon: Landmark,
			title: "Funders & Policymakers",
			body: "Ground grant decisions and policy frameworks in documented evidence about play quality, inclusion, and the gap between what exists and what's needed."
		},
		{
			icon: Users,
			title: "Community Organizations",
			body: "Advocate for improvements to neighbourhood playspaces with structured evidence. Build shared language between residents, practitioners, and decision-makers."
		}
	];

	return (
		<section
			id="audiences"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="audiences-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>Who uses COPA</Eyebrow>
					<h2
						id="audiences-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Built for every professional who shapes children&apos;s outdoor environments.
					</h2>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{audiences.map(a => (
						<Card key={a.title} className="gap-0 py-0">
							<CardContent className="space-y-3 px-5 pb-5 pt-5">
								<IconBadge icon={a.icon} />
								<h3 className="text-base font-semibold text-foreground">{a.title}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{a.body}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── 9. Outcomes ─────────────────────────────────────────────────────────────

function Outcomes() {
	const items = [
		{
			title: "Identify strengths and gaps",
			body: "See clearly where a playspace excels and where it fails to support diverse children - without guesswork."
		},
		{
			title: "Prioritise renovations and investments",
			body: "Use scored domain data to make the case for which changes will have the greatest impact on play quality and inclusion."
		},
		{
			title: "Build shared language across disciplines",
			body: "Give researchers, designers, practitioners, planners, and advocates a common framework for discussing play quality."
		},
		{
			title: "Support inclusive play for all children",
			body: "Go beyond ADA compliance to understand whether children with diverse abilities can genuinely participate and belong."
		},
		{
			title: "Produce reports that move decisions forward",
			body: "Export clear, structured findings that can accompany planning submissions, grant applications, and community presentations."
		},
		{
			title: "Compare across spaces and over time",
			body: "Track change, document the impact of improvements, and compare play quality across a district, system, or research cohort."
		}
	];

	return (
		<section id="outcomes" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="outcomes-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
					<div className="lg:sticky lg:top-24 lg:self-start">
						<Eyebrow>What COPA enables</Eyebrow>
						<h2
							id="outcomes-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Turn observation into evidence.
							<br />
							Evidence into action.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							From a single field visit to a board-ready report, COPA produces structured findings your
							team can act on, share, and compare.
						</p>

						<figure className="mt-8">
							<DeviceShot
								src="/marketing/reports-preview-portrait.png"
								alt="COPA reports list showing completed playspace audits with Play Value and Usability scores and CSV, Excel, and PDF export options"
								width={1419}
								height={2796}
								glow="moss"
								sizes="(min-width: 1024px) 20rem, 60vw"
								className="max-w-[15rem] sm:max-w-xs lg:mx-0"
							/>
							<figcaption className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
								Reports that move decisions forward - exportable as PDF, Excel, or CSV for planning,
								funding, and design review.
							</figcaption>
						</figure>
					</div>

					<ul className="grid gap-4 sm:grid-cols-2 lg:content-start">
						{items.map(item => (
							<li key={item.title}>
								<Card className="h-full gap-0 py-0">
									<CardContent className="flex h-full items-start gap-4 px-5 pb-5 pt-5">
										<span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-status-success-surface text-status-success">
											<Check className="size-3.5" aria-hidden />
										</span>
										<div>
											<h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
											<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
												{item.body}
											</p>
										</div>
									</CardContent>
								</Card>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

// ─── 10. Research Foundation ──────────────────────────────────────────────────

function ResearchFoundation() {
	const pillars = [
		{
			color: "bg-accent-terracotta",
			title: "Affordance theory",
			body: "COPA is grounded in how environments offer or withhold opportunities for action - not just what features exist, but what children perceive as possible."
		},
		{
			color: "bg-accent-moss",
			title: "Inclusive play and usability research",
			body: "The framework draws on research involving children with and without disabilities, examining how diverse abilities shape the experience of outdoor playspaces."
		},
		{
			color: "bg-accent-slate",
			title: "Children's perspectives",
			body: "COPA's constructs are informed by how children - not only adults - describe, value, and use outdoor environments."
		},
		{
			color: "bg-accent-violet",
			title: "Iterative field testing",
			body: "The instrument has been developed through ongoing expert review and field testing across diverse playspace types and contexts."
		}
	];

	return (
		<section
			id="research"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="research-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>Research foundation</Eyebrow>
					<h2
						id="research-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Grounded in evidence. Designed for practice.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA is informed by decades of scholarship on children&apos;s play, affordance theory, inclusive
						design, and usability research - and by the perspectives of children themselves.
					</p>
				</div>

				<div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
					<div className="space-y-3">
						{pillars.map(p => (
							<AccentCard key={p.title} accent={p.color}>
								<h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
							</AccentCard>
						))}

						<Card className="border-primary/20 bg-primary/5 gap-0 py-0">
							<CardContent className="px-5 pb-5 pt-5 text-sm leading-relaxed text-muted-foreground">
								COPA is described as research-informed and expert-reviewed. Formal validation and
								psychometric studies are part of ongoing development. Results should be interpreted by
								knowledgeable practitioners with appropriate professional context.
							</CardContent>
						</Card>
					</div>

					<div className="space-y-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
							Research team
						</p>

						{[
							{
								role: "Lead Researcher",
								name: "Dr. Thomas Morgenthaler",
								note: "Play environment research, inclusive outdoor design, and the development of the COPA assessment framework."
							},
							{
								role: "Collaborating Researcher",
								name: "Dr. Janet Loebach",
								note: "Children's environmental experience, independent mobility, and the design of child-supportive outdoor spaces."
							}
						].map(r => (
							<Card key={r.name} className="gap-0 py-0">
								<CardContent className="space-y-2 px-5 pb-5 pt-5">
									<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
										{r.role}
									</p>
									<p className="text-base font-semibold text-foreground">{r.name}</p>
									<p className="text-sm leading-relaxed text-muted-foreground">{r.note}</p>
								</CardContent>
							</Card>
						))}

						<Card className="gap-0 py-0">
							<CardContent className="space-y-2 px-5 pb-5 pt-5">
								<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									Instrument design
								</p>
								<p className="text-sm leading-relaxed text-muted-foreground">
									COPA was designed for practical use by knowledgeable adults: researchers,
									practitioners, planners, and educators who bring professional context to the
									assessment process.
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── 11. Pricing ──────────────────────────────────────────────────────────────

/**
 * Pricing is marketing copy only: no backend billing gates and no invented prices.
 * The section explains access scope while Access Options explains audience fit.
 */
function PricingSection() {
	const platformSurfaces = [
		{
			icon: Monitor,
			title: "Web dashboard",
			audience: "Managers, coordinators, and administrators",
			body: "Plan projects, manage places and auditor assignments, review submitted work, generate saved place reports, and export data for analysis."
		},
		{
			icon: Smartphone,
			title: "Mobile field app",
			audience: "Auditors onsite",
			body: "Complete assigned audits in the field, save drafts offline, resume interrupted work, and sync submissions when connectivity returns."
		}
	];

	const tiers = [
		{
			name: "Field Pilot",
			price: "Contact for quote",
			priceNote: "One playspace, focused pilot, or small team",
			featured: false,
			description:
				"For a focused assessment of one playspace or a small team testing COPA in practice before wider rollout.",
			features: [
				"Complete the COPA audit, site survey, or both",
				"Assign auditors to specific playspaces",
				"Use mobile offline draft saving for onsite work",
				"Use the web audit fallback when desktop entry is preferred",
				"Review automated Play Value and Usability scores",
				"Export individual audit reports as PDF or spreadsheet files"
			],
			cta: "Start an audit",
			href: SIGN_UP_PATH
		},
		{
			name: "Coordinated Programme",
			price: "Custom access",
			priceNote: "Multiple playspaces and a coordinated team",
			featured: true,
			description:
				"For schools, districts, community organizations, and design teams coordinating COPA across several places.",
			features: [
				"Everything in Field Pilot",
				"Invite managers and onboard field auditors",
				"Assign auditors across multiple places",
				"Track project, place, and audit progress from the web dashboard",
				"Merge audit and survey submissions into a combined place report",
				"Save selected place reports for future review"
			],
			cta: "Start a programme",
			href: SIGN_UP_PATH
		},
		{
			name: "Portfolio & Research Partnership",
			price: "Contact for partnership quote",
			priceNote: "Large portfolios, agencies, funders, and research teams",
			featured: false,
			description:
				"For municipalities, park systems, funders, and research teams working across many playspaces or formal studies.",
			features: [
				"Everything in Coordinated Programme",
				"Export organization-wide raw data as structured ZIP bundles",
				"Use export-ready notifications for large data packages",
				"Organize data by project, place, audit, and saved report",
				"Support GIS, statistics, and external research workflows",
				"Discuss instrument and administrative configuration needs with the COPA team"
			],
			cta: "Contact the COPA team",
			href: SIGN_IN_PATH
		}
	];

	return (
		<section
			id="pricing"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="pricing-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>Pricing</Eyebrow>
					<h2
						id="pricing-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Choose the COPA access path that matches your assessment scale.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA access is scoped around the number of playspaces, auditor team size, reporting needs, and
						whether the work is a pilot, coordinated programme, or portfolio-level study.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2">
					{platformSurfaces.map(surface => (
						<Card key={surface.title} className="gap-0 py-0">
							<CardContent className="space-y-3 px-5 pb-5 pt-5">
								<IconBadge icon={surface.icon} />
								<div>
									<h3 className="text-base font-semibold text-foreground">{surface.title}</h3>
									<p className="mt-1 text-xs font-medium text-muted-foreground">{surface.audience}</p>
								</div>
								<p className="text-sm leading-relaxed text-muted-foreground">{surface.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

				<p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
					COPA includes both surfaces: managers coordinate projects, places, auditors, reports, and exports on
					web; auditors complete assigned assessments through the mobile field app or web audit fallback.
				</p>

				<div className="mt-10 grid gap-4 lg:grid-cols-3">
					{tiers.map(tier => (
						<Card
							key={tier.name}
							className={cn(
								"flex h-full flex-col gap-0 py-0",
								tier.featured && "border-primary/40 shadow-lift lg:-mt-2 lg:mb-2"
							)}>
							<CardContent className="flex flex-1 flex-col px-5 pb-5 pt-6">
								{tier.featured ? (
									<span className="mb-3 inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
										Most common
									</span>
								) : null}

								<h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
								<p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
									{tier.price}
								</p>
								<p className="mt-1 text-xs font-medium text-muted-foreground">{tier.priceNote}</p>
								<p className="mt-4 text-sm leading-relaxed text-muted-foreground">{tier.description}</p>

								<ul className="mt-6 flex-1 space-y-2.5" aria-label={`${tier.name} includes`}>
									{tier.features.map(feature => (
										<li
											key={feature}
											className="flex items-start gap-2.5 text-sm text-muted-foreground">
											<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
											<span>{feature}</span>
										</li>
									))}
								</ul>

								<div className="mt-8">
									<Button asChild className="w-full" variant={tier.featured ? "default" : "outline"}>
										<Link href={tier.href}>
											{tier.cta}
											<ArrowRight className="size-4" />
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				<p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
					COPA is currently scoped through pilots and partner conversations, so public monthly prices are not
					listed.
				</p>
			</div>
		</section>
	);
}

// ─── 12. Access Options ───────────────────────────────────────────────────────

/**
 * Access section - audience-specific entry points that complement the programme tiers above.
 * Describes who each workflow is for; web + mobile are included in every path.
 */
function AccessOptions() {
	const options = [
		{
			pill: "Research",
			featured: false,
			title: "Research pilots and academic studies",
			for: "Researchers and academic teams",
			body: "For teams using COPA to structure play environment research, pilot field protocols, or prepare export-ready datasets for external analysis.",
			cta: "Contact the COPA team",
			href: SIGN_IN_PATH
		},
		{
			pill: "Practice",
			featured: true,
			title: "Schools and community organizations",
			for: "Educators, school districts, community groups",
			body: "For teams assessing playgrounds, schoolyards, and community playspaces to document current conditions and support improvement conversations.",
			cta: "Start an audit",
			href: SIGN_UP_PATH
		},
		{
			pill: "Planning",
			featured: false,
			title: "Municipalities, park agencies, and design teams",
			for: "Planners, landscape architects, public agencies",
			body: "For professionals evaluating multiple outdoor play environments and using structured findings to support planning, renovation, or design decisions.",
			cta: "Request access",
			href: SIGN_IN_PATH
		},
		{
			pill: "Institutional",
			featured: false,
			title: "Institutional and funder partnerships",
			for: "Funders, foundations, and institutional partners",
			body: "For partners supporting community play infrastructure who need a consistent framework for understanding strengths, gaps, and improvement opportunities.",
			cta: "Get in touch",
			href: SIGN_IN_PATH
		}
	];

	return (
		<section id="access" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="access-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>Access options</Eyebrow>
					<h2
						id="access-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						For research teams, practitioners, and agencies.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Pricing above explains the scale of access. These options explain who COPA is designed to serve
						and which conversation best fits your work.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2">
					{options.map(opt => (
						<Card
							key={opt.title}
							className={cn(
								"flex h-full flex-col gap-0 py-0",
								opt.featured && "border-primary/40 shadow-lift"
							)}>
							<CardContent className="flex flex-1 flex-col px-5 pb-5 pt-5">
								<span
									className={cn(
										"mb-3 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
										opt.featured
											? "border-primary/30 bg-primary/10 text-primary"
											: "border-edge/40 bg-muted text-muted-foreground"
									)}>
									{opt.pill}
								</span>

								<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									For
								</p>
								<h3 className="mt-1.5 text-lg font-semibold text-foreground">{opt.title}</h3>
								<p className="mt-1 text-xs font-medium text-muted-foreground">{opt.for}</p>
								<p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{opt.body}</p>

								<div className="mt-6">
									<Button
										asChild
										className="w-full sm:w-auto"
										variant={opt.featured ? "default" : "outline"}>
										<Link href={opt.href}>
											{opt.cta}
											<ArrowRight className="size-4" />
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── 13. Final CTA band ───────────────────────────────────────────────────────

function CtaBand() {
	return (
		<section className="pt-20 px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20" aria-labelledby="cta-heading">
			<div className="mx-auto w-full max-w-6xl rounded-card border-0 bg-foreground px-6 py-14 text-center text-background shadow-[0_6px_0_rgba(0,0,0,0.22),0_12px_28px_rgba(0,0,0,0.18)] sm:px-12 lg:py-20">
				<h2
					id="cta-heading"
					className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					Build playspaces children can claim as their own.
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					A playspace should not merely be a place built <em>for</em> children. It should become a place
					children can make their own - through choice, discovery, belonging, and the freedom to play on their
					own terms.
				</p>
				<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
					<Button asChild size="lg" variant="secondary">
						<Link href={SIGN_UP_PATH}>
							Start an audit
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button
						asChild
						size="lg"
						variant="outline"
						className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
						<Link href={SIGN_IN_PATH}>Sign in</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

// ─── 14. Footer ───────────────────────────────────────────────────────────────

function SiteFooter() {
	const year = new Date().getFullYear();

	const columns = [
		{
			heading: "Tool",
			links: [
				{ label: "What it measures", href: "#measures" },
				{ label: "How it works", href: "#how" },
				{ label: "Who uses it", href: "#audiences" },
				{ label: "Pricing", href: "#pricing" },
				{ label: "Access options", href: "#access" }
			]
		},
		{
			heading: "Account",
			links: [
				{ label: "Create account", href: SIGN_UP_PATH },
				{ label: "Sign in", href: SIGN_IN_PATH },
				{ label: "Research foundation", href: "#research" }
			]
		}
	];

	return (
		<footer className="border-t-2 border-edge/50 bg-card/70">
			<div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
				<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
					<Link href="/" className="flex items-center gap-2.5" aria-label="COPA - home">
						<span className="flex size-9 items-center justify-center rounded-card border border-edge/50 bg-surface-raised shadow-card">
							<Image src="/icon.png" alt="" width={32} height={32} aria-hidden />
						</span>
						<span className="font-heading text-lg font-bold tracking-tight text-text-primary">COPA</span>
					</Link>
					<p className="text-sm leading-6 text-muted-foreground">
						Comprehensive Outdoor Playspace Audit Tool. Research-informed, expert-reviewed, and built for
						practice.
					</p>
				</div>

				{columns.map(col => (
					<div key={col.heading} className="space-y-3">
						<p className="text-sm font-semibold text-foreground">{col.heading}</p>
						<ul className="space-y-2 text-sm text-muted-foreground">
							{col.links.map(link => (
								<li key={link.label}>
									<Link href={link.href} className="transition-colors hover:text-foreground">
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
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

// ─── Page composition ─────────────────────────────────────────────────────────

/** Public marketing homepage for the Comprehensive Outdoor Playspace Audit Tool. */
export function LandingPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<SiteHeader />
			<main>
				<Hero />
				<Problem />
				<WhatCopasMeasures />
				<WholePlayspace />
				<FieldBand />
				<HowItWorks />
				<WhoUsesCopa />
				<Outcomes />
				<ResearchFoundation />
				<PricingSection />
				<AccessOptions />
				<CtaBand />
			</main>
			<SiteFooter />
		</div>
	);
}
