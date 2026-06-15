/**
 * Interactive Platform Tour concept page.
 *
 * Audience: hands-on, product-savvy evaluators who want to see the actual
 * product screens before committing. The page is structured as a guided tour
 * of five named stops, each anchored by real product screenshots and a crisp
 * one-line caption per device. A sticky in-page tour nav lets readers jump to
 * any stop instantly.
 *
 * All visible copy is user-facing. No internal strategy terms, no data-model
 * names, no dev jargon on the page.
 */

import Link from "next/link";
import {
	ArrowRight,
	BarChart3,
	Check,
	ClipboardList,
	Download,
	FileText,
	FolderKanban,
	MapPin,
	RotateCcw,
	ShieldCheck,
	Users,
	WifiOff,
	type LucideIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
	AmbientGlows,
	Eyebrow,
	FloatingPhone,
	FramedMacbook,
	LandingFooter,
	LandingHeader,
	MARKETING_ROUTES,
	type NavLink
} from "@/components/landing/shared";

import { TourNav } from "@/components/landing/concepts/tour-nav";
import { screenshotUrl } from "@/lib/asset-url";

// ─── Asset paths ──────────────────────────────────────────────────────────────

const SHOT = {
	projects: screenshotUrl("/screenshots/Framed/manager/projects/01-overview/01.png"),
	places: screenshotUrl("/screenshots/Framed/manager/places/01-overview/01.png"),
	audits: screenshotUrl("/screenshots/Framed/manager/audits/01-overview/02.png"),
	roster: screenshotUrl("/screenshots/Framed/manager/auditors/02-invite-dialog-open.png"),
	scorecard: screenshotUrl("/screenshots/Framed/manager/audits/detail/01-overview/01.png"),
	scoreSummary: screenshotUrl("/screenshots/Framed/manager/reports/detail/01-overview/01.png"),
	combinedReport: screenshotUrl("/screenshots/Framed/manager/reports/place-report/01-overview/01.png"),
	dataExport: screenshotUrl("/screenshots/Framed/manager/raw-data/01-overview/01.png"),
	phoneFieldDashboard: "/marketing/hero-dashboard-dark.png",
	phoneQuestions: "/marketing/field-questions-dark.png"
};

// ─── Tour stop definitions ────────────────────────────────────────────────────

const NAV: NavLink[] = [
	{ href: "#stop-coordinate", label: "Coordinate" },
	{ href: "#stop-oversee", label: "Oversee" },
	{ href: "#stop-field", label: "In the field" },
	{ href: "#stop-score", label: "Score" },
	{ href: "#stop-report", label: "Report & export" }
];

// ─── Sticky tour nav ──────────────────────────────────────────────────────────

// The sticky tour nav with its active-stop tracking lives in ./tour-nav (client island).

// ─── Stop caption ─────────────────────────────────────────────────────────────

function ScreenCaption({ children }: Readonly<{ children: React.ReactNode }>) {
	return <p className="mt-2 text-center text-xs font-medium leading-snug text-muted-foreground/80">{children}</p>;
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-12 pt-14 text-center sm:px-6 lg:px-8 lg:pb-16 lg:pt-20">
				<Eyebrow>Product tour</Eyebrow>
				<h1
					id="hero-heading"
					className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
					See the platform that turns site visits into decisions.
				</h1>
				<p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
					Five stops. Real screens. Every major capability, exactly as it looks in practice - from
					coordinating your programme to exporting a board-ready report.
				</p>
				<div className="flex flex-col gap-3 sm:flex-row">
					<Button asChild size="lg">
						<Link href={MARKETING_ROUTES.signUp}>
							Start an audit
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button asChild size="lg" variant="outline">
						<a href="#stop-coordinate">Take the tour</a>
					</Button>
				</div>
				<p className="text-sm text-muted-foreground">Research-informed · Expert-reviewed · Field-tested</p>

				{/* Hero device composition: projects portfolio + places side by side */}
				<div className="mt-6 grid w-full max-w-5xl gap-4 sm:grid-cols-2">
					<div>
						<FramedMacbook
							src={SHOT.projects}
							alt="COPA manager workspace on a laptop showing a project portfolio with total, active, and completed project counts and an account-wide average Play Value and Usability score"
							priority
							glow="slate"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
						<ScreenCaption>Your project portfolio, live in the dashboard</ScreenCaption>
					</div>
					<div>
						<FramedMacbook
							src={SHOT.places}
							alt="COPA places table on a laptop showing site names with total, submitted, and in-progress audit counts alongside overall Play Value and Usability scores"
							priority
							glow="moss"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
						<ScreenCaption>Every playspace in your programme at a glance</ScreenCaption>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Stop 1: Coordinate ───────────────────────────────────────────────────────

function StopCoordinate() {
	const points: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: FolderKanban,
			title: "Projects and places in one view",
			body: "See every project, the sites underneath it, and current assessment status without opening a spreadsheet."
		},
		{
			icon: BarChart3,
			title: "Live Play Value & Usability scores",
			body: "Submitted fieldwork rolls up to account-level scoring the moment an auditor syncs. No manual calculation required."
		},
		{
			icon: MapPin,
			title: "Track progress by place",
			body: "Know which sites have submitted audits, which are in progress, and which haven't started - across your entire portfolio."
		}
	];

	return (
		<section
			id="stop-coordinate"
			className="scroll-mt-32 border-b border-edge/40"
			aria-labelledby="coordinate-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
					<div>
						<div className="flex items-center gap-2">
							<span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
								1
							</span>
							<Eyebrow>Coordinate</Eyebrow>
						</div>
						<h2
							id="coordinate-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							See your whole programme the moment you sign in.
						</h2>
						<p className="mt-4 text-base leading-relaxed text-muted-foreground">
							The web dashboard organizes everything you manage in one place: projects, playspaces, audit
							status, and rolling scores. You always know where the programme stands.
						</p>
						<ul className="mt-8 space-y-5">
							{points.map(point => (
								<li key={point.title} className="flex gap-4">
									<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-primary/10 text-primary">
										<point.icon className="size-4" aria-hidden />
									</span>
									<div>
										<h3 className="text-base font-semibold text-foreground">{point.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
											{point.body}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>

					<div className="flex flex-col gap-6">
						<div>
							<FramedMacbook
								src={SHOT.projects}
								alt="COPA project portfolio on a laptop with columns for total, active, and completed project counts and an account Portfolio Mean Play Value and Usability score at the top"
								glow="slate"
								sizes="(min-width: 1024px) 38rem, 92vw"
							/>
							<ScreenCaption>Project portfolio — total, active, and completed at a glance</ScreenCaption>
						</div>
						<div>
							<FramedMacbook
								src={SHOT.places}
								alt="COPA places table on a laptop listing sites with submitted and in-progress audit counts and an overall Play Value and Usability score per site"
								glow="moss"
								sizes="(min-width: 1024px) 38rem, 92vw"
							/>
							<ScreenCaption>Places table — audit status and scores for every site</ScreenCaption>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Stop 2: Oversee ──────────────────────────────────────────────────────────

function StopOversee() {
	const checks = [
		"Sort and filter by auditor, date, status, or score",
		"Spot what is in progress and what has been submitted",
		"Invite new auditors and onboard them in minutes",
		"Assign auditors across multiple places from one screen"
	];

	return (
		<section
			id="stop-oversee"
			className="scroll-mt-32 border-b border-edge/40 bg-muted/30"
			aria-labelledby="oversee-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="flex items-center gap-2">
					<span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
						2
					</span>
					<Eyebrow>Oversee</Eyebrow>
				</div>
				<h2
					id="oversee-heading"
					className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
					Know exactly where every audit stands — and who is doing it.
				</h2>
				<p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
					The audits table and auditor roster give you a clear picture of workload, progress, and team
					activity without chasing individual messages.
				</p>

				<div className="mt-10">
					<FramedMacbook
						src={SHOT.audits}
						alt="COPA audits oversight table on a laptop listing submitted audits with auditor name, submission date, duration, Play Value score, and Usability score for each row"
						glow="slate"
						sizes="(min-width: 1024px) 56rem, 92vw"
						className="mx-auto max-w-4xl"
					/>
					<ScreenCaption>Audits table — every submission with auditor, dates, and PV/U scores</ScreenCaption>
				</div>

				<div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
					<div>
						<FramedMacbook
							src={SHOT.roster}
							alt="COPA auditor management screen on a laptop with the invite-auditor dialog open over a roster showing each auditor's role, assignments, and completed audits"
							glow="violet"
							sizes="(min-width: 1024px) 36rem, 92vw"
						/>
						<ScreenCaption>Auditor roster with the invite dialog open</ScreenCaption>
					</div>
					<div className="max-w-md lg:pt-4">
						<h3 className="text-2xl font-semibold tracking-tight text-foreground">
							Manage your team from one screen.
						</h3>
						<p className="mt-3 text-base leading-relaxed text-muted-foreground">
							Build your auditor roster, handle assignments, and watch progress - all in the same
							dashboard you use to review submissions.
						</p>
						<ul className="mt-6 space-y-3">
							{checks.map(item => (
								<li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
									<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
									<span>{item}</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Stop 3: In the field (inverted band) ─────────────────────────────────────

function StopField() {
	const features: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: ClipboardList,
			title: "Guided, step-by-step audit flow",
			body: "Auditors work through the COPA instrument screen by screen - from section overview to question responses to notes - with clear prompts at every step."
		},
		{
			icon: WifiOff,
			title: "Works offline, every time",
			body: "Assigned audits are stored directly on the device. A lost signal never means lost data or a wasted trip."
		},
		{
			icon: RotateCcw,
			title: "Pick up where you left off",
			body: "Interrupted mid-section? Drafts save automatically. When connectivity returns, completed audits sync to your dashboard."
		}
	];

	return (
		<section id="stop-field" className="scroll-mt-32 bg-foreground text-background" aria-labelledby="field-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="flex items-center gap-2">
					<span className="flex size-6 items-center justify-center rounded-full bg-background/20 text-[11px] font-bold text-background">
						3
					</span>
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-background/60">
						In the field
					</p>
				</div>
				<h2
					id="field-heading"
					className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
					What your auditors see on the ground.
				</h2>
				<p className="mt-4 max-w-2xl text-lg leading-relaxed text-background/70">
					The mobile field app gives auditors a structured, reliable way to capture every section of the COPA
					instrument - even when they are deep in a park with no signal.
				</p>

				<div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
					<ul className="space-y-6 lg:pt-2">
						{features.map(feature => (
							<li key={feature.title} className="flex gap-4">
								<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-background/10 text-background">
									<feature.icon className="size-4" aria-hidden />
								</span>
								<div>
									<h3 className="text-base font-semibold text-background">{feature.title}</h3>
									<p className="mt-1 text-sm leading-relaxed text-background/65">{feature.body}</p>
								</div>
							</li>
						))}
					</ul>

					{/* Four-phone grid: paired DARK screens for the inverted band */}
					<div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<FloatingPhone
									src={SHOT.phoneFieldDashboard}
									alt="COPA mobile field app showing an auditor's assigned and completed audits, with a priority task highlighted and an offline-ready status indicator"
									glow="neutral"
									sizes="(min-width: 1024px) 14rem, 42vw"
									className="max-w-full"
								/>
								<p className="mt-2 text-center text-[11px] font-medium leading-snug text-background/55">
									Assigned audits, offline-ready
								</p>
							</div>
							<div>
								<FloatingPhone
									src={SHOT.phoneQuestions}
									alt="COPA mobile field app showing a guided audit question with multiple-choice answer options and a section progress indicator at the top"
									glow="neutral"
									sizes="(min-width: 1024px) 14rem, 42vw"
									className="max-w-full"
								/>
								<p className="mt-2 text-center text-[11px] font-medium leading-snug text-background/55">
									Guided question flow
								</p>
							</div>
						</div>
						{/* HYBRID SLOT: replace this two-phone row with a premium multi-phone composite for an even richer field scene */}
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Stop 4: Score ────────────────────────────────────────────────────────────

function StopScore() {
	const lenses = [
		{ label: "Provision", body: "What resources and features are present?" },
		{ label: "Variety", body: "How diverse are the types of play available?" },
		{ label: "Challenge", body: "How much opportunity is there for risk and exploration?" },
		{ label: "Sociability", body: "How well does the space support social and group play?" }
	];

	return (
		<section id="stop-score" className="scroll-mt-32 border-b border-edge/40" aria-labelledby="score-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="flex items-center gap-2">
					<span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
						4
					</span>
					<Eyebrow>Score</Eyebrow>
				</div>
				<h2
					id="score-heading"
					className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
					Scores you can read, defend, and act on.
				</h2>
				<p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
					Every submitted audit produces a structured scorecard. Play Value and Usability are each measured
					through four lenses, so you know not just how a site scores overall - but exactly where to focus
					next.
				</p>

				<div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
					<div className="flex flex-col gap-6">
						<div>
							<FramedMacbook
								src={SHOT.scorecard}
								alt="COPA single audit scorecard on a laptop showing a Summary Score, Play Value percentage, Usability percentage, audit duration, and a per-lens breakdown with Provision, Variety, Challenge, and Sociability scores"
								glow="moss"
								sizes="(min-width: 1024px) 38rem, 92vw"
							/>
							<ScreenCaption>Audit scorecard — PV, U, and per-lens breakdown in one view</ScreenCaption>
						</div>
						<div>
							<FramedMacbook
								src={SHOT.scoreSummary}
								alt="COPA report score summary on a laptop with an overall score, Play Value and Usability percentages, and a domain-by-domain score breakdown across the ten playspace elements"
								glow="slate"
								sizes="(min-width: 1024px) 38rem, 92vw"
							/>
							<ScreenCaption>
								Report summary — domain-by-domain breakdown across all ten elements
							</ScreenCaption>
						</div>
					</div>

					<div className="max-w-sm lg:pt-4">
						<h3 className="text-xl font-semibold tracking-tight text-foreground">
							Four lenses. Two constructs. One clear picture.
						</h3>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
							COPA applies the same four scoring lenses to both Play Value and Usability, across all ten
							playspace elements.
						</p>
						<ul className="mt-6 space-y-4">
							{lenses.map(lens => (
								<li
									key={lens.label}
									className="rounded-card border border-edge/50 bg-muted/40 px-4 py-3">
									<p className="text-sm font-semibold text-foreground">{lens.label}</p>
									<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{lens.body}</p>
								</li>
							))}
						</ul>
						<div className="mt-6 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-4 py-3">
							<ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
							<p className="text-xs leading-relaxed text-muted-foreground">
								Grounded in affordance theory and inclusive play research. Developed with Dr. Thomas
								Morgenthaler and Dr. Janet Loebach.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Stop 5: Report & export ──────────────────────────────────────────────────

function StopReport() {
	const formats = [
		{ label: "PDF report", icon: FileText },
		{ label: "Excel workbook", icon: FileText },
		{ label: "CSV data", icon: FileText },
		{ label: "ZIP bundle", icon: Download }
	];

	const highlights = [
		"Merge an audit and a site survey into one combined place report",
		"Export the same scores you see in the dashboard",
		"Bring structured findings to boards, funders, and design teams",
		"Raw data export supports GIS, statistics, and research workflows"
	];

	return (
		<section
			id="stop-report"
			className="scroll-mt-32 border-b border-edge/40 bg-muted/30"
			aria-labelledby="report-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="flex items-center gap-2">
					<span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
						5
					</span>
					<Eyebrow>Report & export</Eyebrow>
				</div>
				<h2
					id="report-heading"
					className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
					Leave every site visit with evidence you can share.
				</h2>
				<p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
					COPA turns submitted fieldwork into clear, structured reports. Export in the format your audience
					needs - a board-ready PDF, a spreadsheet for a colleague, or raw data for a research workflow.
				</p>

				<div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-start">
					<div>
						<FramedMacbook
							src={SHOT.combinedReport}
							alt="COPA combined place report on a laptop showing Play Value and Usability results with source submissions listed and export options for PDF and Excel visible in the interface"
							glow="moss"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
						<ScreenCaption>Combined place report — ready to export as PDF or Excel</ScreenCaption>
					</div>
					<div>
						<FramedMacbook
							src={SHOT.dataExport}
							alt="COPA report detail on a laptop showing score summary sections and a raw data export option that packages the evidence behind each score into a structured download"
							glow="slate"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
						<ScreenCaption>Report detail with raw data export for deeper analysis</ScreenCaption>
					</div>
				</div>

				<div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
							Export in the format you need
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{formats.map(format => (
								<span
									key={format.label}
									className="inline-flex items-center gap-1.5 rounded-full border border-edge/50 bg-background px-3 py-1.5 text-xs font-medium text-foreground">
									<Download className="size-3 text-muted-foreground" aria-hidden />
									{format.label}
								</span>
							))}
						</div>
					</div>
					<ul className="space-y-2.5">
						{highlights.map(item => (
							<li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
								<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
								<span>{item}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

// ─── Tour summary ─────────────────────────────────────────────────────────────

function TourSummary() {
	const stops = [
		{
			icon: FolderKanban,
			stop: "Stop 1",
			title: "Coordinate",
			body: "Projects, places, and scores organized the moment you sign in."
		},
		{
			icon: Users,
			stop: "Stop 2",
			title: "Oversee",
			body: "Full audit table and auditor roster - nothing sits unfinished without you knowing."
		},
		{
			icon: WifiOff,
			stop: "Stop 3",
			title: "In the field",
			body: "Structured, offline-ready mobile audits that sync the moment signal returns."
		},
		{
			icon: BarChart3,
			stop: "Stop 4",
			title: "Score",
			body: "Play Value and Usability across four lenses - clear, comparable, defensible."
		},
		{
			icon: Download,
			stop: "Stop 5",
			title: "Report & export",
			body: "Combined place reports and raw data in PDF, Excel, CSV, or ZIP."
		}
	];

	return (
		<section className="border-b border-edge/40" aria-labelledby="summary-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The full picture</Eyebrow>
					<h2
						id="summary-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Everything you saw - in one place.
					</h2>
					<p className="mt-4 text-base leading-relaxed text-muted-foreground">
						COPA connects every part of the assessment process: from planning the programme to stepping onto
						a site, scoring it, and exporting findings that move decisions forward.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{stops.map((stop, i) => (
						<Card key={stop.title} className="gap-0 py-0">
							<CardContent className="space-y-3 px-4 pb-5 pt-5">
								<div className="flex items-center gap-2">
									<span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
										{i + 1}
									</span>
									<span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
										{stop.stop}
									</span>
								</div>
								<span className="inline-flex size-9 items-center justify-center rounded-card bg-primary/10 text-primary">
									<stop.icon className="size-4" aria-hidden />
								</span>
								<h3 className="text-base font-semibold text-foreground">{stop.title}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{stop.body}</p>
							</CardContent>
						</Card>
					))}
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
				<h2
					id="cta-heading"
					className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					Ready to run your first audit?
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					Sign up, invite your team, and start turning site visits into decisions - with every screen you just
					saw.
				</p>
				<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
					<Button asChild size="lg" variant="secondary">
						<Link href={MARKETING_ROUTES.signUp}>
							Start an audit
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
			</div>
		</section>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InteractivePlatformTourPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} />
			<TourNav />
			<main>
				<Hero />
				<StopCoordinate />
				<StopOversee />
				<StopField />
				<StopScore />
				<StopReport />
				<TourSummary />
				<CtaBand />
			</main>
			<LandingFooter />
		</div>
	);
}
