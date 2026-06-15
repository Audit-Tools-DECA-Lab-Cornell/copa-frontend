/**
 * Concept: Children First.
 *
 * Audience: advocacy groups, nonprofits, community programs, and inclusive-design
 * champions who believe every child deserves a playspace that truly works for them.
 * The page leads with WHY - the child's experience - before showing the tool.
 *
 * Copy is written from the visitor's point of view: a practitioner or advocate who
 * cares about children's access to meaningful play, and who needs credible evidence
 * to make the case to funders, designers, or decision-makers.
 *
 * All visible copy is user-facing. No internal terms, data-model names, or backend
 * language appears on the page.
 */

import {
	ArrowRight,
	Check,
	Compass,
	Download,
	Eye,
	Footprints,
	Heart,
	Layers,
	type LucideIcon,
	ShieldCheck,
	Smile,
	Sparkles,
	Users
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { screenshotUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

// ─── Asset paths ──────────────────────────────────────────────────────────────

const SHOT = {
	placeDetail: "/marketing/step-place-detail.png",
	executeSection: "/marketing/step-execute-section.png",
	sectionNotes: "/marketing/step-section-notes.png",
	reportDetail: "/marketing/step-report-detail.png",
	fieldQuestions: "/marketing/field-questions-dark.png",
	heroDashboard: "/marketing/hero-dashboard-dark.png",
	combinedReport: screenshotUrl("/screenshots/Framed/manager/reports/place-report/01-overview/01.png"),
	scoreSummary: screenshotUrl("/screenshots/Framed/manager/reports/detail/01-overview/01.png"),
	reportScoring: "/marketing/report-scoring-tilted.png"
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV: NavLink[] = [
	{ href: "#the-question", label: "The question" },
	{ href: "#the-gap", label: "The gap" },
	{ href: "#in-the-field", label: "In the field" },
	{ href: "#the-report", label: "The report" },
	{ href: "#the-research", label: "Research" }
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
				<div className="max-w-xl">
					<Eyebrow>For advocates, nonprofits &amp; community programs</Eyebrow>

					<h1
						id="hero-heading"
						className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						Build playspaces children can claim as their own.
					</h1>

					<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
						Can every child choose, explore, belong, and play together here? COPA gives you a structured,
						research-informed way to find out - and the evidence to act on what you learn.
					</p>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg">
							<Link href={MARKETING_ROUTES.signUp}>
								Start measuring what matters
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<a href="#the-gap">See what we measure</a>
						</Button>
					</div>

					<p className="mt-6 text-sm text-muted-foreground">
						Research-informed · Expert-reviewed · Built for the field
					</p>
				</div>

				{/* HYBRID SLOT: a full-bleed child's-eye view or an overhead playground
				    photograph composited with the phone scene would amplify the emotional
				    opening here. */}
				<DeviceScene className="mx-auto flex w-full max-w-sm items-end justify-center gap-5 lg:max-w-none">
					<FloatingPhone
						src={SHOT.placeDetail}
						alt="COPA field app on a phone showing a playspace location with a map pin, place name, and audit task list ready to start"
						glow="moss"
						priority
						sizes="(min-width: 1024px) 14rem, 40vw"
						className="w-[46%] translate-y-5"
					/>
					<FloatingPhone
						src={SHOT.executeSection}
						alt="COPA field app on a phone showing an auditor working through the Natural Features section of a playspace audit with guided questions"
						glow="terracotta"
						priority
						sizes="(min-width: 1024px) 15rem, 44vw"
						className="w-[52%] -translate-y-2"
					/>
				</DeviceScene>
			</div>
		</section>
	);
}

// ─── The child's question ─────────────────────────────────────────────────────

interface PlayDimension {
	icon: LucideIcon;
	question: string;
	body: string;
}

function ChildsQuestion() {
	const dimensions: PlayDimension[] = [
		{
			icon: Compass,
			question: "Can I choose?",
			body: "Does the space offer real options - different activities, levels of challenge, and ways to play - so every child can find something that calls to them?"
		},
		{
			icon: Footprints,
			question: "Can I explore?",
			body: "Is there room to move independently, discover new things, and take manageable risks without being steered away or left out?"
		},
		{
			icon: Heart,
			question: "Do I belong here?",
			body: "Can every child - regardless of ability, age, or background - participate fully, not just reach the edge of the space?"
		},
		{
			icon: Eye,
			question: "Can I retreat and return?",
			body: "Are there spaces to pause, observe, and re-enter at a child's own pace - supporting children who need a moment before joining in?"
		},
		{
			icon: Users,
			question: "Can we play together?",
			body: "Does the environment invite cooperation, shared play, and social connection across the full range of children who use it?"
		},
		{
			icon: Sparkles,
			question: "Is there variety and invitation?",
			body: "Does the space offer a range of elements - natural, manufactured, social, and sensory - so there is always something new to discover?"
		}
	];

	return (
		<section id="the-question" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="question-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The child&apos;s question</Eyebrow>
					<h2
						id="question-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Can I really play here?
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Every child who arrives at a playspace is asking this question. Not out loud - but through every
						choice they make, every barrier they encounter, and every moment they stay or walk away.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{dimensions.map(dim => (
						<Card
							key={dim.question}
							className="gap-0 py-0 transition-shadow duration-200 hover:shadow-lift">
							<CardContent className="space-y-3 px-5 pb-6 pt-5">
								<span className="inline-flex size-10 items-center justify-center rounded-card bg-primary/10 text-primary">
									<dim.icon className="size-4" aria-hidden />
								</span>
								<h3 className="text-base font-semibold text-foreground">{dim.question}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{dim.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

				<p className="mt-10 border-l-2 border-primary pl-5 text-base font-medium leading-relaxed text-foreground sm:text-lg">
					These are the questions that matter. COPA is built to answer them - systematically, in the field,
					with findings you can bring back to the people who shape these spaces.
				</p>
			</div>
		</section>
	);
}

// ─── The gap ──────────────────────────────────────────────────────────────────

function TheGap() {
	return (
		<section
			id="the-gap"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="gap-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="grid gap-12 lg:grid-cols-2 lg:items-start">
					<div className="max-w-xl">
						<Eyebrow>Beyond accessible</Eyebrow>
						<h2
							id="gap-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Reaching the playground is not the same as playing in it.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							A ramp to the gate is access. Whether a child can explore, choose, take part, and feel like
							they belong once they are inside - that is usability. And usability is what most assessments
							miss.
						</p>
						<p className="mt-4 text-base leading-relaxed text-muted-foreground">
							COPA assesses two things together: what a space has to offer (Play Value) and who can
							genuinely take part in it (Usability). Both are evaluated through four lenses that hold the
							space accountable to the full range of children who use it.
						</p>
					</div>

					<div className="grid gap-4">
						{[
							{
								label: "Provision",
								description:
									"What is actually present? Are there enough elements, features, and opportunities to support meaningful play for everyone?"
							},
							{
								label: "Variety",
								description:
									"How diverse is the range of experiences, materials, and play types on offer - enough to invite children with different interests and needs?"
							},
							{
								label: "Challenge",
								description:
									"Does the space offer appropriate risk and stretch - opportunities for children to test themselves and grow in confidence?"
							},
							{
								label: "Sociability",
								description:
									"Does the environment support connection, cooperation, and play alongside others - across ages, abilities, and backgrounds?"
							}
						].map((lens, i) => (
							<div
								key={lens.label}
								className={cn(
									"flex gap-4 rounded-card border border-edge/40 bg-card px-5 py-4 transition-shadow duration-200 hover:shadow-card"
								)}>
								<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
									{i + 1}
								</span>
								<div>
									<h3 className="text-sm font-semibold text-foreground">{lens.label}</h3>
									<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
										{lens.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="mt-10 grid gap-6 sm:grid-cols-3">
					{[
						{
							value: "2",
							label: "Core constructs",
							note: "Play Value and Usability — what a space offers, and who can truly take part."
						},
						{
							value: "4",
							label: "Scoring lenses",
							note: "Provision, Variety, Challenge, and Sociability applied across the whole playspace."
						},
						{
							value: "10",
							label: "Playspace elements",
							note: "From natural features and loose parts to seating, shade, and community context."
						}
					].map(stat => (
						<Card key={stat.label} className="gap-0 py-0">
							<CardContent className="space-y-2 px-5 pb-5 pt-6">
								<p className="font-mono text-4xl font-semibold tabular-nums text-foreground">
									{stat.value}
								</p>
								<h3 className="text-sm font-semibold text-foreground">{stat.label}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{stat.note}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── In the field (inverted band) ────────────────────────────────────────────

function InTheField() {
	const steps: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: Footprints,
			title: "Walk the space with children in mind",
			body: "The app guides you through each of the ten playspace elements - natural features, surfaces, loose parts, pathways, seating, and more - so nothing is overlooked."
		},
		{
			icon: Layers,
			title: "Capture what you see, not just what you expect",
			body: "Structured questions, open notes, and contextual prompts let you record the real experience: what is present, what is missing, and what children actually encounter."
		},
		{
			icon: Smile,
			title: "Works wherever children play",
			body: "Audits are stored on your device and work without a signal - in parks, schoolyards, and community spaces. Save, pause, and pick back up whenever you are ready."
		}
	];

	return (
		<section
			id="in-the-field"
			className="scroll-mt-20 bg-foreground text-background"
			aria-labelledby="field-heading">
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
				<div className="max-w-xl">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-background/70">
						Meeting children where they play
					</p>
					<h2
						id="field-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
						The assessment happens in the space - not behind a desk.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-background/70">
						Real understanding of a playspace requires being in it. The COPA field app takes you through a
						structured assessment on-site, keeping your focus on what children experience rather than what
						the plans say.
					</p>

					<ul className="mt-8 space-y-5">
						{steps.map(step => (
							<li key={step.title} className="flex gap-4">
								<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-background/10 text-background">
									<step.icon className="size-4" aria-hidden />
								</span>
								<div>
									<h3 className="text-base font-semibold text-background">{step.title}</h3>
									<p className="mt-1 text-sm leading-relaxed text-background/65">{step.body}</p>
								</div>
							</li>
						))}
					</ul>
				</div>

				{/* HYBRID SLOT: a full outdoor-play photograph behind a translucent phone
				    scene would make this section feel warmer and more site-specific. */}
				<DeviceScene className="mx-auto flex w-full max-w-md items-end justify-center gap-4 sm:gap-6">
					<FloatingPhone
						src={SHOT.executeSection}
						alt="COPA field app on a phone showing a structured audit question for the Manufactured Features section of a playspace with multiple answer options"
						glow="terracotta"
						sizes="(min-width: 1024px) 13rem, 38vw"
						className="w-[46%] translate-y-4"
					/>
					<FloatingPhone
						src={SHOT.sectionNotes}
						alt="COPA field app on a phone showing a notes capture screen where the auditor has recorded observations about a specific playspace section"
						glow="slate"
						sizes="(min-width: 1024px) 14rem, 42vw"
						className="w-[52%] -translate-y-2"
					/>
				</DeviceScene>
			</div>
		</section>
	);
}

// ─── From conviction to change ────────────────────────────────────────────────

function FromConvictionToChange() {
	const formats = ["PDF report", "Excel workbook", "CSV data", "ZIP bundle"];

	return (
		<section id="the-report" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="report-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>From the field to the funding conversation</Eyebrow>
					<h2
						id="report-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Turn what you saw into something decision-makers can act on.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						A completed audit becomes a structured place report - organized by construct, scoring lens, and
						playspace element. Clear enough to share with a funder. Specific enough to hand to a designer.
						Consistent enough to compare across sites.
					</p>
				</div>

				<div className="mt-10">
					<DeviceScene>
						<FramedMacbook
							src={SHOT.combinedReport}
							alt="COPA combined place report on a laptop showing Play Value and Usability results across all scoring lenses with PDF and Excel export options and the source audit submissions listed below"
							glow="moss"
							sizes="(min-width: 1024px) 60rem, 92vw"
							className="mx-auto max-w-4xl"
						/>
					</DeviceScene>
				</div>

				<div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
					<div className="max-w-md">
						<h3 className="text-2xl font-semibold tracking-tight text-foreground">
							Evidence that holds up to scrutiny.
						</h3>
						<p className="mt-3 text-base leading-relaxed text-muted-foreground">
							Whether you are making the case to a local authority, a community foundation, or a design
							team, COPA gives you structured findings - not a personal impression - that can be examined,
							questioned, and built on.
						</p>
						<ul className="mt-6 space-y-2.5">
							{[
								"Scores broken down by Play Value and Usability",
								"Results for each of the four scoring lenses",
								"Element-by-element findings across the whole space",
								"Export in the format your audience needs"
							].map(item => (
								<li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
									<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
									<span>{item}</span>
								</li>
							))}
						</ul>
						<div className="mt-6">
							<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
								Export in the format you need
							</p>
							<div className="mt-3 flex flex-wrap gap-2">
								{formats.map(format => (
									<span
										key={format}
										className="inline-flex items-center gap-1.5 rounded-full border border-edge/50 bg-muted px-3 py-1 text-xs font-medium text-foreground">
										<Download className="size-3.5 text-muted-foreground" aria-hidden />
										{format}
									</span>
								))}
							</div>
						</div>
					</div>

					<DeviceScene className="mx-auto w-full max-w-sm lg:max-w-none">
						<FramedMacbook
							src={SHOT.scoreSummary}
							alt="COPA report detail on a laptop showing an overall score summary with Play Value percentage, Usability percentage, and a breakdown of Provision, Variety, Challenge, and Sociability results"
							glow="slate"
							sizes="(min-width: 1024px) 34rem, 92vw"
						/>
						<FloatingPhone
							src={SHOT.reportScoring}
							alt="COPA field app on a phone showing a completed audit score summary with Play Value and Usability results"
							glow="terracotta"
							sizes="(min-width: 1024px) 10rem, 28vw"
							className="absolute -bottom-4 -right-2 w-[28%] max-w-[8rem] sm:-right-4"
						/>
					</DeviceScene>
				</div>
			</div>
		</section>
	);
}

// ─── Research foundation ──────────────────────────────────────────────────────

function TheResearch() {
	return (
		<section
			id="the-research"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="research-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
					<div className="max-w-xl">
						<Eyebrow>The research</Eyebrow>
						<h2
							id="research-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Built on the science of how children play.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							COPA draws on affordance theory, inclusive play and usability research, and children&apos;s
							own perspectives on what makes a playspace work for them. The framework was developed
							through expert review and iterative field testing - not assembled from a checklist.
						</p>
						<p className="mt-4 text-base leading-relaxed text-muted-foreground">
							The scoring framework is designed for practitioners who bring professional knowledge and
							contextual judgement to the assessment. Formal psychometric validation is ongoing.
						</p>

						<div className="mt-8 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
							<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
							<p className="text-sm leading-relaxed text-muted-foreground">
								Developed with researchers Dr. Thomas Morgenthaler (lead) and Dr. Janet Loebach
								(collaborating). Expert-reviewed and grounded in inclusive design and children&apos;s
								play research.
							</p>
						</div>
					</div>

					<div className="grid gap-4">
						{[
							{
								heading: "Affordance theory",
								body: "COPA assesses what opportunities a playspace actually affords different children - not just what the equipment is rated to do. What one child can use, another may not. The framework accounts for that."
							},
							{
								heading: "Children's perspectives",
								body: "The constructs reflect what children themselves say matters: the freedom to choose, the chance to take risks, the ability to join in, and the variety that keeps them coming back."
							},
							{
								heading: "Inclusive play research",
								body: "Usability is assessed across the full population of children who visit the space - including children with varying abilities - so gaps in access do not go unnoticed."
							},
							{
								heading: "Iterative field testing",
								body: "The instrument was refined through real fieldwork, not just desk review. The questions reflect what is actually possible to observe and record in a live playspace."
							}
						].map(item => (
							<div
								key={item.heading}
								className="rounded-card border border-edge/40 bg-card px-5 py-4 transition-shadow duration-150 hover:shadow-card">
								<h3 className="text-sm font-semibold text-foreground">{item.heading}</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function CtaBand() {
	return (
		<section className="px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-20" aria-labelledby="cta-heading">
			<div className="mx-auto w-full max-w-6xl rounded-card border-0 bg-foreground px-6 py-14 text-center text-background shadow-[0_6px_0_rgba(0,0,0,0.22),0_12px_28px_rgba(0,0,0,0.18)] sm:px-12 lg:py-20">
				<Eyebrow className="text-background/60">Get started</Eyebrow>
				<h2
					id="cta-heading"
					className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					Every child deserves a playspace that works for them.
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					Start with a single audit. Understand what is really happening in the space. Build the case for
					something better.
				</p>
				<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
					<Button asChild size="lg" variant="secondary">
						<Link href={MARKETING_ROUTES.signUp}>
							Start measuring what matters
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button
						asChild
						size="lg"
						variant="outline"
						className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
						<Link href={MARKETING_ROUTES.signIn}>Sign in</Link>
					</Button>
				</div>
				<p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-background/50">
					Research-informed · Expert-reviewed by Dr. Thomas Morgenthaler and Dr. Janet Loebach · Field-tested
					in real playspaces
				</p>
			</div>
		</section>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChildrenFirstPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} ctaLabel="Start measuring what matters" />
			<main>
				<Hero />
				<ChildsQuestion />
				<TheGap />
				<InTheField />
				<FromConvictionToChange />
				<TheResearch />
				<CtaBand />
			</main>
			<LandingFooter />
		</div>
	);
}
