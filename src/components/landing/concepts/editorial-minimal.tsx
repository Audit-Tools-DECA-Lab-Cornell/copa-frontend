/**
 * Concept: Editorial Minimal.
 *
 * Audience: design-sensitive institutional buyers - landscape architects, urban
 * play designers, and premium programme commissioners who respond to restraint
 * and authority rather than feature lists.
 *
 * The page earns trust through what it does NOT say. Each section is a single
 * statement paired with one carefully chosen visual. Negative space does the
 * persuasion that copy would undermine in this audience.
 *
 * PV / U score motif appears quietly in each section - never shouted, just
 * present - so the construct accumulates meaning as the visitor moves down.
 *
 * All visible copy is user-facing. No internal terminology, no data-model
 * names, no implementation details.
 */

import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import {
	AmbientGlows,
	DeviceScene,
	Eyebrow,
	FloatingPhone,
	FramedMacbook,
	LandingFooter,
	LandingHeader,
	MARKETING_ROUTES,
	type NavLink
} from "@/components/landing/shared";
import { Button } from "@/components/ui/button";
import { screenshotUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

// ─── Asset paths ──────────────────────────────────────────────────────────────

const SHOT = {
	scoreSummary: screenshotUrl("/screenshots/Framed/manager/reports/detail/01-overview/01.png"),
	projects: screenshotUrl("/screenshots/Framed/manager/projects/01-overview/01.png"),
	audits: screenshotUrl("/screenshots/Framed/manager/audits/01-overview/02.png"),
	combinedReport: screenshotUrl("/screenshots/Framed/manager/reports/place-report/01-overview/01.png"),
	phoneScoring: "/marketing/report-scoring-tilted.png",
	phoneField: "/marketing/field-questions-dark.png"
};

const NAV: NavLink[] = [
	{ href: "#method", label: "Method" },
	{ href: "#oversight", label: "Oversight" },
	{ href: "#field", label: "Field" },
	{ href: "#report", label: "Report" }
];

// ─── Score pill - the quiet recurring motif ───────────────────────────────────

/**
 * A small PV / U score indicator used as a visual anchor across sections.
 * Deliberately understated: monospace numerals, muted container, no color
 * emphasis. Its repetition is the signal.
 */
function ScorePill({ pv, u, className }: Readonly<{ pv: string; u: string; className?: string }>) {
	return (
		<div
			aria-label={`Play Value ${pv}, Usability ${u}`}
			className={cn(
				"inline-flex items-center gap-3 rounded-full border border-edge/40 bg-card px-4 py-2 shadow-card",
				className
			)}>
			<span className="flex items-baseline gap-1">
				<span className="font-mono text-xs font-semibold tabular-nums text-foreground">{pv}</span>
				<span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">PV</span>
			</span>
			<span aria-hidden className="h-3 w-px bg-edge/60" />
			<span className="flex items-baseline gap-1">
				<span className="font-mono text-xs font-semibold tabular-nums text-foreground">{u}</span>
				<span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">U</span>
			</span>
		</div>
	);
}

// ─── (a) Hero ─────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />

			<div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-20 pt-24 text-center sm:px-6 sm:pb-28 sm:pt-32 lg:px-8 lg:pb-36 lg:pt-40">
				<Eyebrow>Comprehensive Outdoor Playspace Audit Tool</Eyebrow>

				<h1
					id="hero-heading"
					className="mt-6 max-w-3xl text-5xl font-semibold leading-none tracking-[-0.03em] text-balance text-foreground sm:text-6xl lg:text-7xl">
					Beyond accessible.
					<br />
					Truly playable.
				</h1>

				<p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground">
					A structured audit that measures what a playspace actually offers children - not just what it
					complies with.
				</p>

				<div className="mt-10">
					<Button asChild size="lg">
						<Link href={MARKETING_ROUTES.signUp}>
							Start an audit
							<ArrowRight className="size-4" />
						</Link>
					</Button>
				</div>

				<div className="mt-14 w-full max-w-2xl">
					{/* HYBRID SLOT: premium full-bleed report phone render with selective focus post-processing */}
					<DeviceScene className="flex justify-center">
						<FloatingPhone
							src={SHOT.phoneScoring}
							alt="COPA field app on a phone showing a score summary with Play Value and Usability results after completing an audit"
							priority
							glow="slate"
							sizes="(min-width: 640px) 16rem, 54vw"
							className="w-[54%] max-w-[16rem] sm:w-[40%]"
						/>
					</DeviceScene>
				</div>
			</div>
		</section>
	);
}

// ─── (b) Oversight moment ─────────────────────────────────────────────────────

function OversightMoment() {
	return (
		<section id="oversight" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="oversight-heading">
			<div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
				<div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
					<h2
						id="oversight-heading"
						className="max-w-xs text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
						Every site. Every submission. One view.
					</h2>
					<ScorePill pv="74" u="68" className="shrink-0" />
				</div>

				<FramedMacbook
					src={SHOT.projects}
					alt="COPA manager dashboard on a laptop showing a project portfolio with active and completed projects and account-wide average Play Value and Usability scores"
					glow="slate"
					sizes="(min-width: 1024px) 56rem, 92vw"
					className="mx-auto max-w-3xl"
				/>
			</div>
		</section>
	);
}

// ─── (c) Field moment ─────────────────────────────────────────────────────────

function FieldMoment() {
	return (
		<section
			id="field"
			className="scroll-mt-20 border-b border-edge/40 bg-foreground"
			aria-labelledby="field-heading">
			<div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
				<div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:items-center">
					<div>
						<p
							className={cn(
								"text-(length:--eyebrow-size) font-semibold uppercase",
								"tracking-(--eyebrow-tracking) text-background/60"
							)}>
							In the field
						</p>
						<h2
							id="field-heading"
							className="mt-5 max-w-xs text-2xl font-semibold tracking-tight text-balance text-background sm:text-3xl">
							Structured. Guided.
							<br />
							Works without signal.
						</h2>

						<p className="mt-5 max-w-sm text-base leading-relaxed text-background/65">
							Auditors work through every element of the playspace step by step. Drafts save to the
							device, so a lost connection never interrupts fieldwork.
						</p>

						<ScorePill pv="-" u="-" className="mt-8 border-background/20 bg-background/10" />
					</div>

					{/* HYBRID SLOT: offline-badge overlay render positioned on phone for premium campaign shoot */}
					<DeviceScene className="flex justify-center lg:justify-end">
						<FloatingPhone
							src={SHOT.phoneField}
							alt="COPA field app on a phone displaying a guided audit question with answer options, showing structured step-by-step progress through a playspace section"
							glow="neutral"
							sizes="(min-width: 1024px) 14rem, 48vw"
							className="w-[54%] max-w-56 sm:w-[40%] lg:w-[60%]"
						/>
					</DeviceScene>
				</div>
			</div>
		</section>
	);
}

// ─── (d) Report moment ────────────────────────────────────────────────────────

function ReportMoment() {
	return (
		<section id="report" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="report-heading">
			<div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
				<div className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
					<h2
						id="report-heading"
						className="max-w-xs text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
						A report you can present anywhere.
					</h2>
					<ScorePill pv="81" u="72" className="shrink-0" />
				</div>

				<FramedMacbook
					src={SHOT.combinedReport}
					alt="COPA combined place report on a laptop showing Play Value and Usability results with domain-by-domain breakdown and PDF and Excel export options"
					glow="moss"
					sizes="(min-width: 1024px) 56rem, 92vw"
					className="mx-auto max-w-3xl"
				/>

				<p className="mx-auto mt-10 max-w-md text-center text-base leading-relaxed text-muted-foreground">
					Provision. Variety. Challenge. Sociability. Across Play Value and Usability. Exportable as PDF,
					Excel, or CSV.
				</p>
			</div>
		</section>
	);
}

// ─── (e) Method note ──────────────────────────────────────────────────────────

/**
 * Brief authority section for the framework. Kept to one paragraph and one
 * accreditation line - enough to satisfy a professional buyer, not so much
 * that it turns into a literature review.
 */
function MethodNote() {
	return (
		<section
			id="method"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="method-heading">
			<div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
				<div className="mx-auto max-w-2xl">
					<Eyebrow>The framework</Eyebrow>
					<h2
						id="method-heading"
						className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
						Play Value and Usability.
					</h2>

					<p className="mt-6 text-lg leading-[1.75] text-muted-foreground">
						COPA assesses two constructs - what a playspace offers (Play Value) and who can genuinely take
						part (Usability). Each is scored across four lenses: Provision, Variety, Challenge, and
						Sociability. Together they cover the whole environment: natural features, surfaces, loose parts,
						shade, pathways, seating, community context, and more.
					</p>

					<div className="mt-8 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
						<ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
						<p className="text-sm leading-relaxed text-muted-foreground">
							Developed with researchers Dr. Thomas Morgenthaler and Dr. Janet Loebach. Grounded in
							affordance theory, inclusive play research, and children&apos;s perspectives.
							Expert-reviewed and field-tested.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── (f) Closing CTA ──────────────────────────────────────────────────────────

function ClosingCta() {
	return (
		<section className="px-4 pb-16 pt-20 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24" aria-labelledby="closing-heading">
			<div className="mx-auto w-full max-w-5xl">
				<div className="flex flex-col items-center text-center">
					<ScorePill pv="PV" u="U" className="mb-8" />

					<h2
						id="closing-heading"
						className="max-w-xl text-3xl font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-4xl lg:text-5xl">
						Start with one playspace.
					</h2>

					<p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
						Research-informed. Expert-reviewed. Built for the people who take play seriously.
					</p>

					<div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
						<Button asChild size="lg">
							<Link href={MARKETING_ROUTES.signUp}>
								Start an audit
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link href={MARKETING_ROUTES.signIn}>Sign in</Link>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function EditorialMinimalPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} />
			<main>
				<Hero />
				<OversightMoment />
				<FieldMoment />
				<ReportMoment />
				<MethodNote />
				<ClosingCta />
			</main>
			<LandingFooter />
		</div>
	);
}
