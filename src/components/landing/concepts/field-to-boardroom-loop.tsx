/**
 * Landing page: Field-to-Boardroom Loop.
 *
 * Audience: managers and programme coordinators who need to see the full
 * assessment cycle before committing. The page is organized as four numbered
 * stages that trace a single audit from initial planning through to a
 * board-ready report - showing how the web dashboard and the field app
 * hand off to each other at each turn.
 *
 * All visible copy is written from the visitor's point of view. No internal
 * terms, data-model names, or implementation details appear in the UI.
 */

import {
	ArrowRight,
	Check,
	ChevronRight,
	ClipboardCheck,
	Download,
	FileText,
	FolderOpen,
	type LucideIcon,
	RefreshCw,
	ShieldCheck,
	Smartphone,
	Users,
	WifiOff
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
	projects: screenshotUrl("/screenshots/Framed/manager/projects/01-overview/01.png"),
	places: screenshotUrl("/screenshots/Framed/manager/places/01-overview/01.png"),
	roster: screenshotUrl("/screenshots/Framed/manager/auditors/02-invite-dialog-open.png"),
	audits: screenshotUrl("/screenshots/Framed/manager/audits/01-overview/02.png"),
	combinedReport: screenshotUrl("/screenshots/Framed/manager/reports/place-report/01-overview/01.png"),
	scoreSummary: screenshotUrl("/screenshots/Framed/manager/reports/detail/01-overview/01.png"),
	auditScorecard: screenshotUrl("/screenshots/Framed/manager/audits/detail/01-overview/01.png"),
	phoneFieldDashboard: "/marketing/hero-dashboard-dark.png",
	phoneQuestions: "/marketing/field-questions-dark.png",
	phoneSectionNotes: "/marketing/step-section-notes.png",
	phoneExecute: "/marketing/step-execute-section.png",
	phoneReportDetail: "/marketing/step-report-detail.png",
	phoneReports: "/marketing/reports-preview-portrait.png"
};

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV: NavLink[] = [
	{ href: "#stage-01", label: "Plan" },
	{ href: "#stage-02", label: "Audit" },
	{ href: "#stage-03", label: "Capture" },
	{ href: "#stage-04", label: "Report" },
	{ href: "#method", label: "Method" }
];

// ─── Stage connector line (desktop) ──────────────────────────────────────────

function StageNumber({ n, label, inverted = false }: { n: string; label: string; inverted?: boolean }) {
	return (
		<div className="flex items-center gap-3">
			<span
				className={cn(
					"inline-flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold tabular-nums ring-2",
					inverted
						? "bg-background/10 text-background ring-background/30"
						: "bg-primary/10 text-primary ring-primary/20"
				)}>
				{n}
			</span>
			<span
				className={cn(
					"text-[11px] font-bold uppercase tracking-[0.12em]",
					inverted ? "text-background/60" : "text-muted-foreground"
				)}>
				{label}
			</span>
		</div>
	);
}

// ─── Through-line divider ─────────────────────────────────────────────────────

function StageDivider({ inverted = false }: { inverted?: boolean }) {
	return (
		<div aria-hidden className="flex items-center gap-3 py-2">
			<div className={cn("h-px flex-1", inverted ? "bg-background/15" : "bg-edge/40")} />
			<ChevronRight
				className={cn("size-4 shrink-0", inverted ? "text-background/30" : "text-muted-foreground/40")}
			/>
			<div className={cn("h-px flex-1", inverted ? "bg-background/15" : "bg-edge/40")} />
		</div>
	);
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
					<div className="max-w-xl">
						<Eyebrow>The complete assessment cycle</Eyebrow>

						<h1
							id="hero-heading"
							className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
							Assign. Audit. Report. Repeat.
						</h1>

						<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
							From your desk to the field and back - one system that closes the loop. Plan your assessment
							on the web, let your team collect data in the field, and walk away with a report you can act
							on.
						</p>

						<div className="mt-8 flex flex-wrap gap-3">
							<Button asChild size="lg">
								<Link href={MARKETING_ROUTES.signUp}>
									Start an audit
									<ArrowRight className="size-4" />
								</Link>
							</Button>
							<Button asChild size="lg" variant="outline">
								<a href="#stage-01">See how it works</a>
							</Button>
						</div>

						<p className="mt-6 text-sm text-muted-foreground">
							Research-informed · Expert-reviewed · Field-tested
						</p>
					</div>

					{/* Four-stage sequence overview as numbered steps */}
					<div className="grid gap-3 sm:grid-cols-2">
						{[
							{
								n: "01",
								title: "Plan & assign",
								body: "Create projects, add playspaces, invite auditors, and assign work - all before your team leaves the office.",
								icon: FolderOpen
							},
							{
								n: "02",
								title: "Audit on site",
								body: "Auditors follow a structured guided flow on their phones, covering the whole playspace systematically.",
								icon: Smartphone
							},
							{
								n: "03",
								title: "Capture & sync",
								body: "Offline drafts protect fieldwork from spotty connections. Everything syncs automatically when back online.",
								icon: WifiOff
							},
							{
								n: "04",
								title: "Report & decide",
								body: "Submitted data becomes a structured Play Value and Usability report - exportable and ready to share.",
								icon: FileText
							}
						].map(step => (
							<Card key={step.n} className="gap-0 py-0">
								<CardContent className="space-y-3 px-4 pb-4 pt-4">
									<div className="flex items-center gap-2.5">
										<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
											<span className="font-mono text-xs font-bold text-primary">{step.n}</span>
										</span>
										<step.icon className="size-4 text-muted-foreground" aria-hidden />
									</div>
									<h2 className="text-sm font-semibold text-foreground">{step.title}</h2>
									<p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Stage 01: Plan & assign ──────────────────────────────────────────────────

function StageOne() {
	const points: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: FolderOpen,
			title: "Organise by project and place",
			body: "Group playspaces under a project so you can track progress, compare scores, and report at the programme level."
		},
		{
			icon: Users,
			title: "Build your auditor roster",
			body: "Invite auditors, review their work history, and assign them to specific playspaces - all from one roster view."
		},
		{
			icon: ClipboardCheck,
			title: "Everything confirmed before the visit",
			body: "Auditors receive their assignments on their phones before they leave. No phone calls, no printed lists."
		}
	];

	return (
		<section id="stage-01" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="stage-01-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<StageNumber n="01" label="Plan & assign - web" />
				<StageDivider />

				<div className="mt-8 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
					<div className="max-w-xl">
						<h2
							id="stage-01-heading"
							className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Set up the programme before your team heads out.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							The web dashboard is where the assessment begins. Create your project, add the playspaces
							you want to evaluate, and assign auditors - in the time it takes to run a short meeting.
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

					{/* HYBRID SLOT: a laptop + roster phone composite for a richer two-screen planning feel */}
					<DeviceScene className="relative">
						<FramedMacbook
							src={SHOT.projects}
							alt="COPA manager dashboard on a laptop showing a projects portfolio with total, active, and completed projects plus account-wide average Play Value and Usability scores"
							glow="moss"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
						<FramedMacbook
							src={SHOT.roster}
							alt="COPA auditor management on a laptop with the invite-auditor dialog open over a roster showing assignments and progress"
							glow="violet"
							sizes="(min-width: 1024px) 28rem, 70vw"
							className="absolute -bottom-6 -right-4 w-[62%] max-w-88 filter-[drop-shadow(0_28px_48px_rgba(15,23,42,0.32))] sm:-right-8"
						/>
					</DeviceScene>
				</div>
			</div>
		</section>
	);
}

// ─── Stage 02: Audit on site (dark band) ─────────────────────────────────────

function StageTwo() {
	const capabilities: Array<{ title: string; body: string }> = [
		{
			title: "Guided, section-by-section flow",
			body: "COPA walks auditors through all 10 playspace elements in order - natural features, equipment, surfaces, pathways, seating, shade, maintenance, and more."
		},
		{
			title: "Covers Play Value and Usability in one visit",
			body: "A single assessment captures both what the space offers (Play Value) and how accessible and inclusive it is (Usability), rated across four scoring lenses each."
		},
		{
			title: "Notes and observations captured in context",
			body: "Auditors add notes as they go, tied to the right section. No post-visit reconstruction from memory."
		}
	];

	return (
		<section
			id="stage-02"
			className="scroll-mt-20 bg-foreground text-background"
			aria-labelledby="stage-02-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<StageNumber n="02" label="Audit on site - mobile" inverted />
				<StageDivider inverted />

				<div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
					{/* HYBRID SLOT: a three-phone arc (dashboard + question flow + notes) for a rich field-team scene */}
					<DeviceScene className="mx-auto flex w-full max-w-lg items-end justify-center gap-3 sm:gap-5">
						<FloatingPhone
							src={SHOT.phoneQuestions}
							alt="COPA field app on a phone showing a guided audit question with multiple-choice answers and section progress"
							glow="terracotta"
							sizes="(min-width: 1024px) 13rem, 36vw"
							className="w-[40%] translate-y-6"
						/>
						<FloatingPhone
							src={SHOT.phoneFieldDashboard}
							alt="COPA field app on a phone showing an auditor's assigned and completed audits with a priority task and offline-ready status indicator"
							glow="slate"
							sizes="(min-width: 1024px) 15rem, 42vw"
							className="w-[48%] -translate-y-2"
						/>
						<FloatingPhone
							src={SHOT.phoneExecute}
							alt="COPA field app on a phone showing an active audit section with a checklist of elements being assessed"
							glow="neutral"
							sizes="(min-width: 1024px) 11rem, 30vw"
							className="hidden w-[36%] translate-y-8 sm:block"
						/>
					</DeviceScene>

					<div className="max-w-xl lg:pl-6">
						<h2
							id="stage-02-heading"
							className="text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
							Your team does the fieldwork. COPA keeps it consistent.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-background/70">
							The mobile app is what auditors carry to the playspace. It gives them a structured,
							repeatable method so every assessment covers the same ground - and the scores you compare
							later actually mean something.
						</p>

						<ul className="mt-8 space-y-5">
							{capabilities.map(cap => (
								<li key={cap.title} className="flex gap-4">
									<Check className="mt-0.5 size-4 shrink-0 text-background/70" aria-hidden />
									<div>
										<h3 className="text-sm font-semibold text-background">{cap.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-background/60">{cap.body}</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Stage 03: Capture & sync ─────────────────────────────────────────────────

function StageThree() {
	const guarantees: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: WifiOff,
			title: "No signal? No problem.",
			body: "Assigned audits are stored on the device before the team leaves. Losing a connection mid-assessment does not lose the data."
		},
		{
			icon: ClipboardCheck,
			title: "Pick up where you left off",
			body: "Interrupted visits - a rain shower, a call, a second day on a large site - are not a problem. Drafts resume exactly where the auditor stopped."
		},
		{
			icon: RefreshCw,
			title: "Auto-sync when back online",
			body: "Completed sections upload in the background the moment connectivity returns. Nothing to remember; nothing to manually export."
		}
	];

	return (
		<section
			id="stage-03"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="stage-03-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<StageNumber n="03" label="Capture & sync - mobile" />
				<StageDivider />

				<div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
					<div className="max-w-xl">
						<h2
							id="stage-03-heading"
							className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							The data comes home - even when the signal does not.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							Playspaces are rarely in the best spots for mobile reception. COPA is built around that
							reality: offline-first storage, automatic sync, and resumable drafts mean a spotty
							connection is an inconvenience, not a risk to your programme.
						</p>

						<ul className="mt-8 space-y-5">
							{guarantees.map(g => (
								<li key={g.title} className="flex gap-4">
									<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-primary/10 text-primary">
										<g.icon className="size-4" aria-hidden />
									</span>
									<div>
										<h3 className="text-base font-semibold text-foreground">{g.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
									</div>
								</li>
							))}
						</ul>

						<div className="mt-8 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
							<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
							<p className="text-sm leading-relaxed text-muted-foreground">
								From the moment an auditor arrives at a playspace to the moment the data appears on your
								dashboard - COPA keeps the chain intact.
							</p>
						</div>
					</div>

					{/* HYBRID SLOT: a phone-in-landscape crop showing offline indicator + sync animation */}
					<DeviceScene className="mx-auto flex w-full max-w-sm items-center justify-center gap-4">
						<FloatingPhone
							src={SHOT.phoneSectionNotes}
							alt="COPA field app on a phone showing a section notes screen where an auditor is adding observations during an offline visit"
							glow="terracotta"
							sizes="(min-width: 1024px) 16rem, 52vw"
							className="w-[72%] max-w-56"
						/>
					</DeviceScene>
				</div>
			</div>
		</section>
	);
}

// ─── Stage 04: Report & decide ────────────────────────────────────────────────

function StageFour() {
	const exportFormats = ["PDF report", "Excel workbook", "CSV data", "ZIP bundle"];

	const reportPoints: Array<{ title: string; body: string }> = [
		{
			title: "Provision, Variety, Challenge, Sociability",
			body: "Four scoring lenses applied to Play Value and Usability give stakeholders a structured picture - not just a single number."
		},
		{
			title: "One combined place report",
			body: "Merge an audit and a site survey into a single, board-ready document for the playspace. Domain breakdowns included."
		},
		{
			title: "Export in the format you need",
			body: "PDF for presentations, Excel and CSV for analysis and planning, ZIP for archiving or sharing the full data set."
		}
	];

	return (
		<section id="stage-04" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="stage-04-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<StageNumber n="04" label="Report & decide - web" />
				<StageDivider />

				<div className="mt-8">
					<div className="max-w-2xl">
						<h2
							id="stage-04-heading"
							className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Walk into every meeting with evidence, not a summary.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							When submitted work comes in, the dashboard computes Play Value and Usability scores
							automatically. Combine submissions into a place report, export it in the format your
							stakeholders need, and move from fieldwork to decision in a single workflow.
						</p>
					</div>

					{/* Wide combined-report shot */}
					<div className="mt-10">
						<FramedMacbook
							src={SHOT.combinedReport}
							alt="COPA combined place report on a laptop showing Play Value and Usability results across all four scoring lenses with PDF and Excel export options"
							glow="moss"
							sizes="(min-width: 1024px) 62rem, 92vw"
							className="mx-auto max-w-4xl"
						/>
					</div>

					<div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
						<div className="space-y-5">
							{reportPoints.map(point => (
								<div
									key={point.title}
									className="flex gap-4 rounded-card border border-edge/30 bg-card px-5 py-4">
									<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
									<div>
										<h3 className="text-sm font-semibold text-foreground">{point.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
											{point.body}
										</p>
									</div>
								</div>
							))}
						</div>

						<div className="space-y-6">
							<FramedMacbook
								src={SHOT.scoreSummary}
								alt="COPA report detail on a laptop showing an overall score summary with Play Value and Usability percentages and a domain-by-domain breakdown"
								glow="slate"
								sizes="(min-width: 1024px) 30rem, 92vw"
							/>

							<div>
								<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
									Export in the format you need
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									{exportFormats.map(fmt => (
										<span
											key={fmt}
											className="inline-flex items-center gap-1.5 rounded-full border border-edge/50 bg-muted px-3 py-1 text-xs font-medium text-foreground">
											<Download className="size-3.5 text-muted-foreground" aria-hidden />
											{fmt}
										</span>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Method / research foundation ─────────────────────────────────────────────

function Method() {
	const facts: Array<{ value: string; label: string; body: string }> = [
		{
			value: "2",
			label: "Core constructs",
			body: "Play Value assesses what a space affords. Usability assesses who can genuinely take part. Both are scored in every audit."
		},
		{
			value: "4",
			label: "Scoring lenses",
			body: "Provision, Variety, Challenge, and Sociability - applied to both constructs so scores are structured, not subjective."
		},
		{
			value: "10",
			label: "Playspace elements",
			body: "Every assessment covers natural features, manufactured features, topography, loose parts, enclosure, pathways, seating, shade, maintenance, and community context."
		}
	];

	return (
		<section
			id="method"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="method-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The method behind the loop</Eyebrow>
					<h2
						id="method-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Built on rigorous, research-informed assessment - not checklists.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						The scores auditors collect are grounded in children&apos;s play research, affordance theory,
						and inclusive design. When you present results to a board or funder, they stand up to scrutiny.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-3">
					{facts.map(fact => (
						<Card key={fact.label} className="gap-0 py-0">
							<CardContent className="space-y-2 px-5 pb-5 pt-6">
								<p className="font-mono text-4xl font-semibold tabular-nums text-foreground">
									{fact.value}
								</p>
								<h3 className="text-base font-semibold text-foreground">{fact.label}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{fact.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="mt-6 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
					<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
					<p className="text-sm leading-relaxed text-muted-foreground">
						Developed through expert review and field testing with researchers Dr. Thomas Morgenthaler and
						Dr. Janet Loebach. Designed for practitioners who bring professional context to each assessment.
						Formal validation is ongoing.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Closing CTA band ─────────────────────────────────────────────────────────

function ClosingBand() {
	return (
		<section
			className="bg-foreground px-4 pb-16 pt-20 text-background sm:px-6 lg:px-8 lg:pb-20"
			aria-labelledby="closing-heading">
			<div className="mx-auto w-full max-w-6xl">
				<div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.12em] text-background/50">
							Start the loop
						</p>
						<h2
							id="closing-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
							Start the loop on one playspace.
						</h2>
						<p className="mt-4 max-w-xl text-lg leading-relaxed text-background/70">
							Set up a project, invite an auditor, and run your first assessment. The whole cycle takes
							one visit - and the report is waiting for you when they sync.
						</p>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

					{/* Compact stage recap */}
					<div className="grid gap-3 sm:grid-cols-2 lg:w-72 lg:grid-cols-1">
						{[
							{ n: "01", label: "Plan & assign" },
							{ n: "02", label: "Audit on site" },
							{ n: "03", label: "Capture & sync" },
							{ n: "04", label: "Report & decide" }
						].map((stage, i, arr) => (
							<div key={stage.n} className="flex items-center gap-3">
								<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-background/10 font-mono text-xs font-bold text-background">
									{stage.n}
								</span>
								<span className="text-sm font-medium text-background/70">{stage.label}</span>
								{i < arr.length - 1 ? (
									<ChevronRight
										className="ml-auto hidden size-4 text-background/30 lg:block"
										aria-hidden
									/>
								) : null}
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function FieldToBoardroomLoopPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} />
			<main>
				<Hero />
				<StageOne />
				<StageTwo />
				<StageThree />
				<StageFour />
				<Method />
				<ClosingBand />
			</main>
			<LandingFooter />
		</div>
	);
}
