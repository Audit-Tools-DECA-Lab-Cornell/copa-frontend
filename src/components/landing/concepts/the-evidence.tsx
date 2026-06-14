/**
 * Concept: The Evidence.
 *
 * Audience: researchers, occupational therapists, evaluators, and funders who
 * need to be convinced of methodological rigour before they engage with the
 * product. Credibility comes first; product features are secondary.
 *
 * The page is structured as an evidence brief, not a feature tour:
 *  1. Hero - clear claim, research framing, two CTAs.
 *  2. The method - what COPA measures, the four lenses, the 10 elements.
 *  3. How a score is built - score anatomy with supporting screenshots.
 *  4. The place report - structured, citable, exportable evidence artefact.
 *  5. The people and process - researchers, expert review, honest validation note.
 *  6. Quiet CTA.
 *
 * Visual register: editorial restraint. Hairline rules, narrow text measures,
 * typographic scale over device glamour. Screenshots are used purposefully to
 * show score transparency, not as product marketing.
 */

import Link from "next/link";
import {
	ArrowRight,
	BookOpen,
	Check,
	ChevronRight,
	FlaskConical,
	Layers,
	LayoutList,
	Scale,
	ShieldCheck,
	type LucideIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
	AmbientGlows,
	Eyebrow,
	FramedMacbook,
	LandingFooter,
	LandingHeader,
	MARKETING_ROUTES,
	type NavLink
} from "@/components/landing/shared";

// ─── Asset paths ──────────────────────────────────────────────────────────────

const SHOT = {
	scoreSummary: "/screenshots/Framed/manager/FramedScreenshot_6.png",
	rawDataExport: "/screenshots/Framed/manager/FramedScreenshot_4.png",
	combinedReport: "/screenshots/Framed/manager/FramedScreenshot_2.png",
	auditScorecard: "/screenshots/Framed/manager/FramedScreenshot_12.png",
	reportBuilderList: "/screenshots/Framed/manager/FramedScreenshot_10.png"
} as const;

const NAV: NavLink[] = [
	{ href: "#method", label: "The method" },
	{ href: "#score-anatomy", label: "Score anatomy" },
	{ href: "#place-report", label: "Place reports" },
	{ href: "#researchers", label: "Researchers" }
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />

			{/* Narrow editorial column - evidence pages breathe with white space */}
			<div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
				<Eyebrow>Research-informed assessment</Eyebrow>

				<h1
					id="hero-heading"
					className="mt-4 text-4xl font-semibold leading-[1.06] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
					Play-quality evidence your funders and peers will respect.
				</h1>

				<p className="mt-6 max-w-2xl text-xl leading-relaxed text-muted-foreground">
					COPA grounds every score in published research on play affordances, inclusive design, and
					children&apos;s perspectives. Each observation maps to a defined construct, so the evidence you
					produce is transparent and defensible - not a checklist aggregate.
				</p>

				<div className="mt-10 flex flex-col gap-3 sm:flex-row">
					<Button asChild size="lg">
						<Link href={MARKETING_ROUTES.signUp}>
							Request a research pilot
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button asChild size="lg" variant="outline">
						<a href="#method">See the method</a>
					</Button>
				</div>

				{/* Trust signals - restrained, no invented numbers */}
				<div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
					{[
						"Grounded in affordance theory",
						"Inclusive play & usability research",
						"Expert-reviewed instrument",
						"Field-tested with practitioners"
					].map(signal => (
						<span key={signal} className="flex items-center gap-1.5 text-sm text-muted-foreground">
							<Check className="size-3.5 shrink-0 text-primary" aria-hidden />
							{signal}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── The Method ───────────────────────────────────────────────────────────────

const LENSES: Array<{ name: string; body: string }> = [
	{
		name: "Provision",
		body: "What opportunities and resources does the space provide? This lens captures the range and richness of what is on offer."
	},
	{
		name: "Variety",
		body: "How varied are the experiences, materials, and settings available? Variety broadens the range of children who can find something meaningful."
	},
	{
		name: "Challenge",
		body: "Does the space invite risk, mastery, and progression? Challenge is what makes engagement possible at different developmental stages."
	},
	{
		name: "Sociability",
		body: "How well does the space support interaction, cooperation, and belonging? Sociability addresses both physical layout and social affordances."
	}
];

const ELEMENTS: Array<{ name: string }> = [
	{ name: "Natural features" },
	{ name: "Manufactured features" },
	{ name: "Topography & surfaces" },
	{ name: "Loose parts" },
	{ name: "Enclosure & open space" },
	{ name: "Pathways" },
	{ name: "Seating & amenities" },
	{ name: "Shade, weather & seasonality" },
	{ name: "Rules, management & maintenance" },
	{ name: "Community & site context" }
];

function TheMethod() {
	return (
		<section id="method" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="method-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				{/* Constructs */}
				<div className="mx-auto max-w-3xl">
					<Eyebrow>What COPA measures</Eyebrow>
					<h2
						id="method-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Two constructs. Every observation placed within one.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA evaluates playspaces through two complementary constructs rooted in the research
						literature. Play Value (PV) asks what the environment affords for play; Usability (U) asks who
						can genuinely participate and on what terms.
					</p>

					<div className="mt-8 grid gap-4 sm:grid-cols-2">
						{[
							{
								label: "Play Value",
								abbr: "PV",
								body: "Captures the richness and variety of play opportunities a space provides - across physical, social, sensory, and creative dimensions.",
								accent: "border-l-primary"
							},
							{
								label: "Usability",
								abbr: "U",
								body: "Evaluates whether the space can be accessed and used by a full range of children - including those with different abilities, ages, and backgrounds.",
								accent: "border-l-accent-moss"
							}
						].map(construct => (
							<div
								key={construct.label}
								className={cn(
									"rounded-card border border-edge/40 bg-card px-5 py-5 border-l-4",
									construct.accent
								)}>
								<div className="flex items-baseline gap-2">
									<p className="font-mono text-2xl font-semibold text-foreground">{construct.abbr}</p>
									<p className="text-base font-semibold text-foreground">{construct.label}</p>
								</div>
								<p className="mt-3 text-sm leading-relaxed text-muted-foreground">{construct.body}</p>
							</div>
						))}
					</div>
				</div>

				{/* Hairline rule */}
				<div className="mx-auto my-16 max-w-3xl border-t border-edge/40" aria-hidden />

				{/* Four lenses */}
				<div className="mx-auto max-w-3xl">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-muted-foreground">
						The four scoring lenses
					</p>
					<h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
						Each construct is scored across four lenses.
					</h3>
					<p className="mt-3 text-base leading-relaxed text-muted-foreground">
						Both Play Value and Usability are evaluated through the same four lenses, applied across the
						whole playspace. This means every score is decomposable - you can see exactly which dimension
						drove the result.
					</p>

					<div className="mt-8 space-y-0 divide-y divide-edge/40 rounded-card border border-edge/40 bg-card">
						{LENSES.map((lens, i) => (
							<div key={lens.name} className="flex gap-5 px-5 py-5">
								<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
									{i + 1}
								</span>
								<div>
									<p className="text-sm font-semibold text-foreground">{lens.name}</p>
									<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lens.body}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Hairline rule */}
				<div className="mx-auto my-16 max-w-3xl border-t border-edge/40" aria-hidden />

				{/* 10 elements */}
				<div className="mx-auto max-w-3xl">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-muted-foreground">
						The whole playspace
					</p>
					<h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
						10 elements. The environment as a system, not a checklist.
					</h3>
					<p className="mt-3 text-base leading-relaxed text-muted-foreground">
						COPA treats the playspace as an integrated environment rather than a list of equipment.
						Observations are structured across ten elements that together describe the physical, social, and
						contextual conditions of the site.
					</p>

					<ol className="mt-8 grid gap-2 sm:grid-cols-2">
						{ELEMENTS.map((el, i) => (
							<li key={el.name} className="flex items-center gap-3 text-sm text-muted-foreground">
								<span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-edge/50 bg-muted font-mono text-[11px] font-semibold tabular-nums text-foreground">
									{i + 1}
								</span>
								{el.name}
							</li>
						))}
					</ol>

					<p className="mt-6 border-l-2 border-primary pl-5 text-sm leading-relaxed text-muted-foreground">
						The four lenses are applied across all ten elements, for both Play Value and Usability. That
						structure is what makes cross-site and longitudinal comparisons methodologically sound.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Score anatomy ────────────────────────────────────────────────────────────

function ScoreAnatomy() {
	const steps: Array<{ icon: LucideIcon; heading: string; body: string }> = [
		{
			icon: LayoutList,
			heading: "Structured observations, not impressions",
			body: "Each element is assessed through prompted, defined questions tied to a specific lens. There is no free-form rating - every response has a defined meaning within the framework."
		},
		{
			icon: Layers,
			heading: "Scores roll up, fully traceable",
			body: "Lens scores aggregate to construct scores (PV and U). Every number in the summary can be traced back to the individual observations that produced it."
		},
		{
			icon: Scale,
			heading: "Percentages, not raw tallies",
			body: "Scores are expressed as percentage of maximum possible within each lens and construct, so they are comparable across playspaces of different scale and type."
		}
	];

	return (
		<section
			id="score-anatomy"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="score-anatomy-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="mx-auto max-w-3xl">
					<Eyebrow>How a score is built</Eyebrow>
					<h2
						id="score-anatomy-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						See exactly how observation becomes a number.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						The score summary is not a black box. Each percentage is the direct product of structured
						observations mapped to a defined scoring rubric. You can inspect the data behind any result.
					</p>

					<div className="mt-10 space-y-6">
						{steps.map(step => (
							<div key={step.heading} className="flex gap-4">
								<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-card border border-edge/40 text-foreground">
									<step.icon className="size-4" aria-hidden />
								</span>
								<div>
									<h3 className="text-base font-semibold text-foreground">{step.heading}</h3>
									<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Score summary screenshot - primary evidence screen */}
				<div className="mt-14">
					<FramedMacbook
						src={SHOT.scoreSummary}
						alt="COPA score summary on a laptop showing a completed audit with Play Value and Usability percentages at the top, followed by a domain-by-domain breakdown of Provision, Variety, Challenge, and Sociability scores for both constructs"
						glow="slate"
						sizes="(min-width: 1024px) 52rem, 92vw"
						className="mx-auto max-w-3xl"
					/>
					<p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
						The score summary breaks down Play Value and Usability by lens - Provision, Variety, Challenge,
						and Sociability - so the source of any result is immediately visible.
					</p>
				</div>

				{/* Raw data export - the 'see the data' screen */}
				<div className="mx-auto mt-16 max-w-3xl">
					<div className="flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
						<FlaskConical className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
						<div>
							<p className="text-sm font-semibold text-foreground">
								The raw observation data is exportable.
							</p>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
								Beyond the score summary, the underlying responses for every audit are accessible and
								exportable as structured data. Researchers can bring COPA output directly into their
								statistical workflows.
							</p>
						</div>
					</div>
				</div>

				<div className="mt-10">
					<FramedMacbook
						src={SHOT.rawDataExport}
						alt="COPA report detail on a laptop showing the raw observation data export view with structured field-by-field response data and export controls"
						glow="moss"
						sizes="(min-width: 1024px) 52rem, 92vw"
						className="mx-auto max-w-3xl"
					/>
					<p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
						The report detail view exposes every observation behind a score, so reviewers and collaborators
						can verify the evidence before citing it.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── The Place Report ─────────────────────────────────────────────────────────

function PlaceReport() {
	const features: Array<{ heading: string; body: string }> = [
		{
			heading: "Structured, not narrative",
			body: "The report is organised around the COPA framework - constructs and lenses - rather than free prose. Reviewers can find any section immediately."
		},
		{
			heading: "Citable scores with traceable methodology",
			body: "Each PV and U score includes the lens breakdown that produced it. The methodology is documented in the instrument itself, not separately."
		},
		{
			heading: "Exportable in the format your workflow requires",
			body: "Export as PDF for presentations and archiving, Excel for further analysis, CSV for statistical software, or a structured ZIP bundle for research data management."
		},
		{
			heading: "Multiple audit submissions can be merged",
			body: "Where the same playspace has been audited more than once, submissions can be combined into a single place report - useful for inter-rater exercises and longitudinal comparison."
		}
	];

	return (
		<section
			id="place-report"
			className="scroll-mt-20 border-b border-edge/40"
			aria-labelledby="place-report-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="mx-auto max-w-3xl">
					<Eyebrow>The deliverable</Eyebrow>
					<h2
						id="place-report-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						A place report you can cite, share, and act on.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						The COPA place report is a structured evidence artefact. It is not a dashboard export reskinned
						as a document - it is designed from the start to survive a funder review or a peer conversation.
					</p>
				</div>

				{/* Report screenshot - full-width emphasis */}
				<div className="mt-12">
					<FramedMacbook
						src={SHOT.combinedReport}
						alt="COPA combined place report on a laptop showing Play Value and Usability headline scores at the top with a domain-by-domain breakdown below and PDF and Excel export options visible in the toolbar"
						glow="primary"
						sizes="(min-width: 1024px) 60rem, 92vw"
						className="mx-auto max-w-4xl"
					/>
				</div>

				{/* Feature list - editorial treatment */}
				<div className="mx-auto mt-14 max-w-3xl space-y-0 divide-y divide-edge/40 rounded-card border border-edge/40 bg-card">
					{features.map(feature => (
						<div key={feature.heading} className="flex gap-4 px-5 py-5">
							<ChevronRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
							<div>
								<p className="text-sm font-semibold text-foreground">{feature.heading}</p>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
							</div>
						</div>
					))}
				</div>

				{/* Export format tags */}
				<div className="mx-auto mt-8 max-w-3xl">
					<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
						Available export formats
					</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{["PDF", "Excel workbook", "CSV", "ZIP bundle"].map(fmt => (
							<span
								key={fmt}
								className="inline-flex items-center rounded-full border border-edge/50 bg-muted px-3 py-1 text-xs font-medium text-foreground">
								{fmt}
							</span>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── The People & Process ─────────────────────────────────────────────────────

function ResearchersAndProcess() {
	const foundations: Array<{ icon: LucideIcon; heading: string; body: string }> = [
		{
			icon: BookOpen,
			heading: "Affordance theory",
			body: "Scores are grounded in the concept of affordances - what an environment makes possible for a child to perceive and act on - drawing on established research in developmental and environmental psychology."
		},
		{
			icon: ShieldCheck,
			heading: "Inclusive play & usability research",
			body: "Usability scoring draws on inclusive design frameworks and usability research that foreground children with a range of abilities, ages, and backgrounds."
		},
		{
			icon: FlaskConical,
			heading: "Children's perspectives",
			body: "The framework is informed by research that centres children's own accounts of what makes spaces valuable, not only adult proxies for quality."
		}
	];

	return (
		<section
			id="researchers"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="researchers-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				{/* Research foundations */}
				<div className="mx-auto max-w-3xl">
					<Eyebrow>The research foundation</Eyebrow>
					<h2
						id="researchers-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Scores grounded in established theory.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA is not a practitioner heuristic packaged as an instrument. The constructs and scoring
						lenses are derived from specific bodies of research that have been applied and tested in
						playspace and environmental design contexts.
					</p>

					<div className="mt-10 space-y-4">
						{foundations.map(found => (
							<Card key={found.heading} className="gap-0 py-0">
								<CardContent className="flex gap-4 px-5 py-5">
									<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-card border border-edge/40 text-foreground">
										<found.icon className="size-4" aria-hidden />
									</span>
									<div>
										<h3 className="text-sm font-semibold text-foreground">{found.heading}</h3>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
											{found.body}
										</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Hairline rule */}
				<div className="mx-auto my-16 max-w-3xl border-t border-edge/40" aria-hidden />

				{/* People */}
				<div className="mx-auto max-w-3xl">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-muted-foreground">
						The people behind the instrument
					</p>
					<h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
						Expert-designed. Practitioner-tested.
					</h3>
					<p className="mt-3 text-base leading-relaxed text-muted-foreground">
						The COPA instrument was developed and reviewed by researchers with specific expertise in
						children&apos;s play environments, inclusive design, and field assessment methods.
					</p>

					<div className="mt-8 grid gap-4 sm:grid-cols-2">
						{[
							{
								name: "Dr. Thomas Morgenthaler",
								role: "Lead researcher",
								note: "Developed the COPA framework, constructs, and scoring methodology. Leads the iterative refinement of the instrument through field testing and expert consultation."
							},
							{
								name: "Dr. Janet Loebach",
								role: "Collaborating researcher",
								note: "Brings expertise in children&apos;s outdoor environments and inclusive play design to the instrument review process."
							}
						].map(person => (
							<div key={person.name} className="rounded-card border border-edge/40 bg-card px-5 py-5">
								<p className="text-base font-semibold text-foreground">{person.name}</p>
								<p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.07em] text-primary">
									{person.role}
								</p>
								<p
									className="mt-3 text-sm leading-relaxed text-muted-foreground"
									dangerouslySetInnerHTML={{ __html: person.note }}
								/>
							</div>
						))}
					</div>

					{/* Honest note on validation status */}
					<div className="mt-6 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
						<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
						<div>
							<p className="text-sm font-semibold text-foreground">
								Expert review and iterative field testing.
							</p>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
								The instrument has undergone expert review and iterative field testing with
								practitioners. Formal psychometric validation studies are ongoing. COPA is designed for
								use by knowledgeable practitioners who bring professional and contextual judgment to the
								assessment - it is a structured tool in skilled hands, not a fully automated score.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Quiet CTA ────────────────────────────────────────────────────────────────

function QuietCta() {
	return (
		<section className="border-b border-edge/40 bg-foreground text-background" aria-labelledby="cta-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="mx-auto max-w-2xl">
					<h2
						id="cta-heading"
						className="text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
						Ready to put rigorous play-quality evidence to work?
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-background/70">
						Whether you are planning a research pilot, evaluating sites for a grant application, or building
						an evidence base for a design intervention - COPA gives you a structured, defensible starting
						point.
					</p>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg" variant="secondary">
							<Link href={MARKETING_ROUTES.signUp}>
								Request a research pilot
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
							<Link href={MARKETING_ROUTES.signIn}>Sign in to your account</Link>
						</Button>
					</div>

					<p className="mt-6 text-sm text-background/50">
						COPA is currently delivered through pilots and partner conversations. Contact the team to
						discuss a research partnership.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TheEvidencePage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} ctaLabel="Request a pilot" ctaHref={MARKETING_ROUTES.signUp} />
			<main>
				<Hero />
				<TheMethod />
				<ScoreAnatomy />
				<PlaceReport />
				<ResearchersAndProcess />
				<QuietCta />
			</main>
			<LandingFooter />
		</div>
	);
}
