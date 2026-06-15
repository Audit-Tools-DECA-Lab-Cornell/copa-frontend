/**
 * Concept: Manager Command Center.
 *
 * Audience: the buyer - a programme manager or coordinator who runs play-quality
 * assessments across a team and several sites. The page is written entirely from
 * that person's point of view: coordinate the program on the web, equip auditors
 * with the field app, and walk away with board-ready reports.
 *
 * All visible copy is user-facing. Device shots use the pre-framed laptop exports
 * and transparent phone renders via the shared marketing primitives.
 */

import {
	ArrowRight,
	BarChart3,
	Check,
	ClipboardList,
	Download,
	FileText,
	FolderKanban,
	ListChecks,
	type LucideIcon,
	MapPin,
	RotateCcw,
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
	places: screenshotUrl("/screenshots/Framed/manager/places/01-overview/01.png"),
	projects: screenshotUrl("/screenshots/Framed/manager/projects/01-overview/01.png"),
	audits: screenshotUrl("/screenshots/Framed/manager/audits/01-overview/02.png"),
	roster: screenshotUrl("/screenshots/Framed/manager/auditors/02-invite-dialog-open.png"),
	combinedReport: screenshotUrl("/screenshots/Framed/manager/reports/place-report/01-overview/01.png"),
	scoreSummary: screenshotUrl("/screenshots/Framed/manager/reports/detail/01-overview/01.png"),
	phoneFieldDashboard: "/marketing/hero-dashboard-dark.png",
	phoneQuestions: "/marketing/field-questions-dark.png",
	phoneReports: "/marketing/reports-preview-portrait.png"
};

const NAV: NavLink[] = [
	{ href: "#command", label: "Command center" },
	{ href: "#oversight", label: "Oversight" },
	{ href: "#field", label: "Field app" },
	{ href: "#reports", label: "Reports" },
	{ href: "#pricing", label: "Pricing" }
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.02fr_1.08fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
				<div className="max-w-xl">
					<Eyebrow>For programme managers &amp; coordinators</Eyebrow>

					<h1
						id="hero-heading"
						className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						Run your whole play-quality program from one place.
					</h1>

					<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
						COPA gives you a single workspace to coordinate projects, assign auditors, track every audit in
						progress, and turn fieldwork into board-ready reports - across one playspace or thirty.
					</p>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg">
							<Link href={MARKETING_ROUTES.signUp}>
								Start an audit
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<a href="#reports">See a sample report</a>
						</Button>
					</div>

					<p className="mt-6 text-sm text-muted-foreground">
						Research-informed · Expert-reviewed · Field-tested
					</p>
				</div>

				<DeviceScene className="lg:pb-10 lg:pl-10">
					<FramedMacbook
						src={SHOT.places}
						alt="COPA manager workspace on a laptop showing places across the account with total, submitted, and in-progress counts and an average Play Value and Usability score"
						priority
						glow="moss"
						sizes="(min-width: 1024px) 40rem, 92vw"
					/>
					<FloatingPhone
						src={SHOT.phoneFieldDashboard}
						alt="COPA field app on a phone showing an auditor's assigned and completed audits with a priority task and offline-ready status"
						glow="terracotta"
						sizes="(min-width: 1024px) 13rem, 36vw"
						className="absolute -bottom-6 -left-2 w-[38%] max-w-[11rem] sm:-left-6 sm:w-[34%] lg:-bottom-2 lg:left-0"
					/>
				</DeviceScene>
			</div>
		</section>
	);
}

// ─── Problem ──────────────────────────────────────────────────────────────────

function Problem() {
	const pains: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: ClipboardList,
			title: "Fieldwork scattered everywhere",
			body: "Paper forms, photos, and spreadsheets spread across auditors and inboxes - with no single place that shows what is done and what is still open."
		},
		{
			icon: ListChecks,
			title: "No consistent method",
			body: "Every assessor measures a little differently, so results can't be compared across sites, seasons, or team members."
		},
		{
			icon: FileText,
			title: "Nothing you can defend",
			body: "When a board or funder asks for evidence, you're left assembling a story by hand instead of exporting one."
		}
	];

	return (
		<section
			id="problem"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="problem-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The coordination gap</Eyebrow>
					<h2
						id="problem-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Coordinating playspace assessments shouldn&apos;t mean chasing spreadsheets.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						You&apos;re responsible for the program - the sites, the people, the deadlines, and the evidence
						at the end. The work is hard enough without the tooling getting in the way.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-3">
					{pains.map(pain => (
						<Card key={pain.title} className="gap-0 py-0">
							<CardContent className="space-y-3 px-5 pb-5 pt-5">
								<span className="inline-flex size-10 items-center justify-center rounded-card bg-muted text-muted-foreground">
									<pain.icon className="size-4" aria-hidden />
								</span>
								<h3 className="text-base font-semibold text-foreground">{pain.title}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{pain.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

				<p className="mt-8 border-l-2 border-primary pl-5 text-base font-medium leading-relaxed text-foreground sm:text-lg">
					COPA puts the whole program in one workspace - so you spend your time on decisions, not on
					assembling the picture.
				</p>
			</div>
		</section>
	);
}

// ─── Command center ───────────────────────────────────────────────────────────

function CommandCenter() {
	const points: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: FolderKanban,
			title: "Every project and place in view",
			body: "See active projects, the places connected to them, and where each assessment stands - without opening a single spreadsheet."
		},
		{
			icon: BarChart3,
			title: "Live Play Value & Usability scores",
			body: "Submitted audits roll up into account-level scoring, so program health is visible the moment work comes in."
		},
		{
			icon: Users,
			title: "Your team, organized",
			body: "Track auditors, assignments, and recent activity from one account view instead of a dozen message threads."
		}
	];

	return (
		<section id="command" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="command-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
					<div className="max-w-xl">
						<Eyebrow>Your command center</Eyebrow>
						<h2
							id="command-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							See your entire program at a glance.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							The web dashboard is where you run the program. Projects, places, auditors, and completed
							work are organized the moment you sign in.
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

					<FramedMacbook
						src={SHOT.projects}
						alt="COPA manager dashboard on a laptop showing a project portfolio with total, active, and completed projects and an account-wide average Play Value and Usability score"
						glow="slate"
						sizes="(min-width: 1024px) 36rem, 92vw"
					/>
				</div>
			</div>
		</section>
	);
}

// ─── Oversight ────────────────────────────────────────────────────────────────

function Oversight() {
	return (
		<section
			id="oversight"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="oversight-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>Total oversight</Eyebrow>
					<h2
						id="oversight-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Know exactly where every audit stands.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Sort by status, auditor, or score. Spot what&apos;s in progress and what&apos;s been submitted
						at a glance - so nothing sits unfinished without you knowing.
					</p>
				</div>

				<div className="mt-10">
					<FramedMacbook
						src={SHOT.audits}
						alt="COPA audits table on a laptop listing submitted audits with their auditor, dates, and Play Value and Usability scores"
						glow="moss"
						sizes="(min-width: 1024px) 60rem, 92vw"
						className="mx-auto max-w-4xl"
					/>
				</div>

				<div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
					<FramedMacbook
						src={SHOT.roster}
						alt="COPA auditor management on a laptop with the invite-auditor dialog open over a roster showing assignments and completed audits"
						glow="violet"
						sizes="(min-width: 1024px) 34rem, 92vw"
					/>
					<div className="max-w-md">
						<h3 className="text-2xl font-semibold tracking-tight text-foreground">
							Build and manage your auditor team.
						</h3>
						<p className="mt-3 text-base leading-relaxed text-muted-foreground">
							Invite auditors, assign them across places, and watch workload and progress in one roster.
							New team members start delivering audits without a steep learning curve.
						</p>
						<ul className="mt-5 space-y-2.5">
							{[
								"Invite auditors and onboard them in minutes",
								"Assign work across multiple places",
								"Track assignments, activity, and completed audits"
							].map(item => (
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

// ─── Field app (inverted band) ────────────────────────────────────────────────

function FieldApp() {
	const features: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: ListChecks,
			title: "Guided, structured audits",
			body: "Auditors work through the COPA instrument step by step, with prompts that cover the whole playspace - not just equipment."
		},
		{
			icon: WifiOff,
			title: "Works offline, in the field",
			body: "Assigned audits are stored on the device, so a lost signal never means a lost day of fieldwork."
		},
		{
			icon: RotateCcw,
			title: "Resume and sync automatically",
			body: "Drafts pick up where they left off and submissions sync the moment connectivity returns."
		}
	];

	return (
		<section id="field" className="scroll-mt-20 bg-foreground text-background" aria-labelledby="field-heading">
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
				<div className="max-w-xl">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-background/70">
						What you give your team
					</p>
					<h2
						id="field-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
						Equip your auditors with a tool they&apos;ll actually use.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-background/70">
						The mobile field app is the kit you hand your team. It keeps onsite work consistent and reliable
						- and protects the data you depend on for reporting.
					</p>

					<ul className="mt-8 space-y-5">
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
				</div>

				{/* HYBRID SLOT: a premium multi-phone composite (screenhance/frameuse) can
				    replace this staged pair for an even richer field scene. */}
				<DeviceScene className="mx-auto flex w-full max-w-md items-end justify-center gap-4 sm:gap-6">
					<FloatingPhone
						src={SHOT.phoneQuestions}
						alt="COPA field app on a phone showing a guided audit question with answer options and section progress"
						glow="terracotta"
						sizes="(min-width: 1024px) 13rem, 38vw"
						className="w-[46%] translate-y-4"
					/>
					<FloatingPhone
						src={SHOT.phoneFieldDashboard}
						alt="COPA field app on a phone showing an auditor's assigned audits and offline-ready status"
						glow="slate"
						sizes="(min-width: 1024px) 14rem, 42vw"
						className="w-[52%] -translate-y-2"
					/>
				</DeviceScene>
			</div>
		</section>
	);
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function Reports() {
	const formats = ["PDF report", "Excel workbook", "CSV data", "ZIP bundle"];

	return (
		<section id="reports" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="reports-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The deliverable</Eyebrow>
					<h2
						id="reports-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Reports that move decisions forward.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Every submitted audit becomes a clear, structured report. Merge an audit and a site survey into
						a single combined place report, then export it for the conversation that needs it.
					</p>
				</div>

				<div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
					<DeviceScene>
						<FramedMacbook
							src={SHOT.combinedReport}
							alt="COPA combined place report on a laptop with Play Value and Usability results and export options for PDF and spreadsheet formats"
							glow="moss"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
						<FloatingPhone
							src={SHOT.phoneReports}
							alt="COPA reports list on a phone showing completed audits with their Play Value and Usability scores"
							glow="terracotta"
							sizes="(min-width: 1024px) 11rem, 30vw"
							className="absolute -bottom-4 right-0 w-[30%] max-w-[8.5rem] sm:-right-4"
						/>
					</DeviceScene>

					<div className="max-w-md">
						<h3 className="text-2xl font-semibold tracking-tight text-foreground">
							Walk in with evidence in hand.
						</h3>
						<p className="mt-3 text-base leading-relaxed text-muted-foreground">
							Bring structured findings to any board meeting, funding review, or design charrette. The
							same scores you see in the dashboard are what your stakeholders receive.
						</p>
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
				</div>

				<div className="mt-12">
					<FramedMacbook
						src={SHOT.scoreSummary}
						alt="COPA report detail on a laptop showing an overall score summary with Play Value, Usability, and Sociability percentages and a domain-by-domain breakdown"
						glow="slate"
						sizes="(min-width: 1024px) 56rem, 92vw"
						className="mx-auto max-w-3xl"
					/>
				</div>
			</div>
		</section>
	);
}

// ─── Framework (brief authority) ──────────────────────────────────────────────

function Framework() {
	const facts: Array<{ value: string; label: string; body: string }> = [
		{
			value: "2",
			label: "Core constructs",
			body: "Play Value and Usability - what a space offers, and who can truly take part."
		},
		{
			value: "4",
			label: "Scoring lenses",
			body: "Provision, Variety, Challenge, and Sociability, applied across the whole playspace."
		},
		{
			value: "10",
			label: "Playspace elements",
			body: "From natural features to pathways and amenities - the environment as a whole system."
		}
	];

	return (
		<section className="border-b border-edge/40 bg-muted/30" aria-labelledby="framework-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The method underneath</Eyebrow>
					<h2
						id="framework-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Built on a rigorous, research-informed framework.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA scores aren&apos;t a checklist tally. They&apos;re grounded in research on children&apos;s
						play, affordance theory, and inclusive design - so the evidence you present holds up to
						scrutiny.
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
						Dr. Janet Loebach, and designed for knowledgeable practitioners who bring professional context
						to the assessment.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
	const surfaces: Array<{ icon: LucideIcon; title: string; audience: string; body: string }> = [
		{
			icon: MapPin,
			title: "Web dashboard",
			audience: "For you and your coordinators",
			body: "Plan projects, manage places and assignments, review submitted work, and generate and export reports."
		},
		{
			icon: Smartphone,
			title: "Mobile field app",
			audience: "For your auditors onsite",
			body: "Complete assigned audits in the field, save drafts offline, resume interrupted work, and sync when connectivity returns."
		}
	];

	const tiers = [
		{
			name: "Field Pilot",
			price: "Contact for quote",
			priceNote: "One playspace or a small team testing COPA",
			featured: false,
			features: [
				"Complete the COPA audit, site survey, or both",
				"Assign auditors to specific playspaces",
				"Save mobile drafts offline for onsite work",
				"Review automated Play Value and Usability scores",
				"Export individual audit reports as PDF or spreadsheet files"
			],
			cta: "Start an audit",
			href: MARKETING_ROUTES.signUp
		},
		{
			name: "Coordinated Programme",
			price: "Custom access",
			priceNote: "Multiple playspaces and a coordinated team",
			featured: true,
			features: [
				"Everything in Field Pilot",
				"Invite managers and onboard field auditors",
				"Assign auditors across multiple places",
				"Track project, place, and audit progress from the dashboard",
				"Merge audit and survey submissions into a combined place report",
				"Save selected place reports for future review"
			],
			cta: "Start a programme",
			href: MARKETING_ROUTES.signUp
		},
		{
			name: "Portfolio & Research Partnership",
			price: "Contact for partnership quote",
			priceNote: "Large portfolios, agencies, and research teams",
			featured: false,
			features: [
				"Everything in Coordinated Programme",
				"Export organization-wide raw data as structured ZIP bundles",
				"Organize data by project, place, audit, and saved report",
				"Support GIS, statistics, and external research workflows",
				"Discuss instrument and administrative configuration with the COPA team"
			],
			cta: "Contact the COPA team",
			href: MARKETING_ROUTES.signIn
		}
	];

	return (
		<section id="pricing" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="pricing-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>Pricing</Eyebrow>
					<h2
						id="pricing-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Access that matches your assessment scale.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Every plan includes both the web dashboard and the mobile field app. You coordinate; your
						auditors deliver assessments in the field.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2">
					{surfaces.map(surface => (
						<Card key={surface.title} className="gap-0 py-0">
							<CardContent className="space-y-3 px-5 pb-5 pt-5">
								<span className="inline-flex size-10 items-center justify-center rounded-card bg-muted text-muted-foreground">
									<surface.icon className="size-4" aria-hidden />
								</span>
								<div>
									<h3 className="text-base font-semibold text-foreground">{surface.title}</h3>
									<p className="mt-1 text-xs font-medium text-muted-foreground">{surface.audience}</p>
								</div>
								<p className="text-sm leading-relaxed text-muted-foreground">{surface.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

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
								<p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
									{tier.price}
								</p>
								<p className="mt-1 text-xs font-medium text-muted-foreground">{tier.priceNote}</p>

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

// ─── Final CTA ────────────────────────────────────────────────────────────────

function CtaBand() {
	return (
		<section className="px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-20" aria-labelledby="cta-heading">
			<div className="mx-auto w-full max-w-6xl rounded-card border-0 bg-foreground px-6 py-14 text-center text-background shadow-[0_6px_0_rgba(0,0,0,0.22),0_12px_28px_rgba(0,0,0,0.18)] sm:px-12 lg:py-20">
				<h2
					id="cta-heading"
					className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					Bring your whole play-quality program into one place.
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					Coordinate the sites, equip the team, and leave every assessment with evidence you can act on.
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

export function ManagerCommandCenterPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} />
			<main>
				<Hero />
				<Problem />
				<CommandCenter />
				<Oversight />
				<FieldApp />
				<Reports />
				<Framework />
				<Pricing />
				<CtaBand />
			</main>
			<LandingFooter />
		</div>
	);
}
