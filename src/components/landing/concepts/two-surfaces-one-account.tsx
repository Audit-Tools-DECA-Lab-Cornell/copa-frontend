/**
 * Concept: Two Surfaces, One Account.
 *
 * Audience: organizations that coordinate office-based program management
 * and field delivery. The manager is the buyer; the page is written from
 * their perspective throughout. Auditors are referenced as the team the
 * manager equips and oversees.
 *
 * Structure: explicit web <-> mobile pairings that show the same program
 * data living on both surfaces, reinforcing the single-account story.
 * Section order is distinct from the Manager Command Center concept.
 *
 * All visible copy is user-facing only. No internal dev terms, data model
 * names, or backend implementation details appear in the UI.
 */

import Link from "next/link";
import {
	ArrowRight,
	BarChart3,
	Check,
	ClipboardCheck,
	Download,
	FolderKanban,
	Globe,
	Link2,
	ListChecks,
	MapPin,
	RefreshCcw,
	ShieldCheck,
	Smartphone,
	Users,
	WifiOff,
	type LucideIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

// ─── Asset paths ──────────────────────────────────────────────────────────────

const SHOT = {
	projects: "/screenshots/Framed/manager/FramedScreenshot_30.png",
	audits: "/screenshots/Framed/manager/FramedScreenshot_20.png",
	roster: "/screenshots/Framed/manager/FramedScreenshot_22.png",
	combinedReport: "/screenshots/Framed/manager/FramedScreenshot_2.png",
	scoreSummary: "/screenshots/Framed/manager/FramedScreenshot_6.png",
	phoneHeroDark: "/marketing/hero-dashboard-dark.png",
	phoneQuestionsDark: "/marketing/field-questions-dark.png",
	phoneExecuteSection: "/marketing/step-execute-section.png",
	phoneSectionNotes: "/marketing/step-section-notes.png",
	phoneReportScoring: "/marketing/report-scoring-tilted.png"
} as const;

const NAV: NavLink[] = [
	{ href: "#manager-surface", label: "Your dashboard" },
	{ href: "#auditor-surface", label: "Their field app" },
	{ href: "#shared-record", label: "One account" },
	{ href: "#framework", label: "The method" },
	{ href: "#get-started", label: "Get started" }
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
				<div className="max-w-xl">
					<Eyebrow>Web dashboard + mobile field app</Eyebrow>

					<h1
						id="hero-heading"
						className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						You coordinate. Your team executes. One shared record.
					</h1>

					<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
						A web command surface for you, a guided field app for your auditors, one account that keeps
						everything in sync - from the first assignment to the final report.
					</p>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg">
							<Link href={MARKETING_ROUTES.signUp}>
								Start an audit
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<a href="#shared-record">See the shared record</a>
						</Button>
					</div>

					<p className="mt-6 text-sm text-muted-foreground">
						Research-informed · Expert-reviewed · Field-tested
					</p>
				</div>

				{/* Web laptop with dark field-app phone floating in front */}
				<DeviceScene className="lg:pb-10 lg:pl-6">
					<FramedMacbook
						src={SHOT.projects}
						alt="COPA web dashboard on a laptop showing a projects portfolio with total, active, and completed projects alongside an account-wide Play Value and Usability score"
						priority
						glow="moss"
						sizes="(min-width: 1024px) 40rem, 92vw"
					/>
					<FloatingPhone
						src={SHOT.phoneHeroDark}
						alt="COPA mobile field app on a phone showing an auditor's assigned and completed audits with an offline-ready status indicator"
						glow="terracotta"
						sizes="(min-width: 1024px) 13rem, 36vw"
						className="absolute -bottom-6 -left-2 w-[38%] max-w-[11rem] sm:-left-6 sm:w-[34%] lg:-bottom-2 lg:left-0"
					/>
				</DeviceScene>
			</div>
		</section>
	);
}

// ─── Role clarity strip ────────────────────────────────────────────────────────

function RoleClarity() {
	const roles: Array<{ icon: LucideIcon; surface: string; who: string; description: string }> = [
		{
			icon: Globe,
			surface: "Web dashboard",
			who: "You - the manager",
			description:
				"Create projects, add places, invite auditors, track what is in progress, and pull completed reports when you need them."
		},
		{
			icon: Smartphone,
			surface: "Mobile field app",
			who: "Your auditors on site",
			description:
				"Receive assignments, complete guided assessments in the field, capture notes offline, and submit when back online."
		},
		{
			icon: Link2,
			surface: "One account",
			who: "Both surfaces, always in sync",
			description:
				"Work on either surface flows into the same program. No exports to chase, no files to merge - one shared record drives both."
		}
	];

	return (
		<section className="border-b border-edge/40 bg-muted/30" aria-labelledby="role-clarity-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>Two roles, two surfaces</Eyebrow>
					<h2
						id="role-clarity-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Each surface is built for the work it hosts.
					</h2>
					<p className="mt-4 text-base leading-relaxed text-muted-foreground">
						Separate tools designed for separate contexts - but always connected to the same account and the
						same audit data.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-3">
					{roles.map(role => (
						<Card key={role.surface} className="gap-0 py-0">
							<CardContent className="space-y-3 px-5 pb-6 pt-5">
								<span className="inline-flex size-10 items-center justify-center rounded-card bg-primary/10 text-primary">
									<role.icon className="size-4" aria-hidden />
								</span>
								<div>
									<h3 className="text-base font-semibold text-foreground">{role.surface}</h3>
									<p className="mt-0.5 text-xs font-medium text-muted-foreground">{role.who}</p>
								</div>
								<p className="text-sm leading-relaxed text-muted-foreground">{role.description}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Manager surface ──────────────────────────────────────────────────────────

function ManagerSurface() {
	const capabilities: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: FolderKanban,
			title: "Projects and places at a glance",
			body: "See every project you run, the places attached to each, and how far along every assessment is - without opening a single spreadsheet."
		},
		{
			icon: BarChart3,
			title: "Scores that update as work comes in",
			body: "Submitted audits roll up into account-level Play Value and Usability scores the moment an auditor syncs from the field."
		},
		{
			icon: Users,
			title: "Your full team, in one roster",
			body: "Invite auditors, assign them to specific places, and track workload and completion without chasing people across inboxes."
		}
	];

	return (
		<section
			id="manager-surface"
			className="scroll-mt-20 border-b border-edge/40"
			aria-labelledby="manager-surface-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				{/* Label strip */}
				<div className="mb-10 flex items-center gap-3">
					<span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold uppercase tracking-[0.07em] text-primary">
						<Globe className="size-3.5" aria-hidden />
						Your surface
					</span>
					<span className="text-sm text-muted-foreground">Runs in your browser</span>
				</div>

				<div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
					<div className="max-w-xl">
						<Eyebrow>The web dashboard</Eyebrow>
						<h2
							id="manager-surface-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Coordinate the whole program without leaving your desk.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							The web dashboard is your command surface. Set up the program, keep tabs on every site, and
							pull reports the moment field work is submitted.
						</p>

						<ul className="mt-8 space-y-5">
							{capabilities.map(cap => (
								<li key={cap.title} className="flex gap-4">
									<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-primary/10 text-primary">
										<cap.icon className="size-4" aria-hidden />
									</span>
									<div>
										<h3 className="text-base font-semibold text-foreground">{cap.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{cap.body}</p>
									</div>
								</li>
							))}
						</ul>
					</div>

					{/* Stacked laptop screens showing the web surfaces */}
					<div className="space-y-6 lg:space-y-8">
						<FramedMacbook
							src={SHOT.projects}
							alt="COPA web dashboard on a laptop showing the projects portfolio view with project counts and account-wide Play Value and Usability scores"
							glow="moss"
							sizes="(min-width: 1024px) 36rem, 92vw"
						/>
						<FramedMacbook
							src={SHOT.audits}
							alt="COPA web dashboard on a laptop showing the audits oversight table listing submitted audits with their assigned auditor, date, and Play Value and Usability scores"
							glow="slate"
							sizes="(min-width: 1024px) 36rem, 92vw"
						/>
					</div>
				</div>

				{/* Roster wide shot */}
				<div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
					<FramedMacbook
						src={SHOT.roster}
						alt="COPA auditor management page on a laptop with the invite-auditor dialog open over a roster showing team members, their roles, and completed audit counts"
						glow="violet"
						sizes="(min-width: 1024px) 36rem, 92vw"
					/>
					<div className="max-w-md">
						<h3 className="text-2xl font-semibold tracking-tight text-foreground">
							Build your team. Assign the work. Track everything.
						</h3>
						<p className="mt-3 text-base leading-relaxed text-muted-foreground">
							Invite auditors with a single step - they receive access to the field app, see their
							assigned places, and start delivering audits without a long onboarding process.
						</p>
						<ul className="mt-5 space-y-2.5">
							{[
								"Invite auditors and get them active in minutes",
								"Assign individuals to one place or many",
								"Track active assignments, completion, and audit scores from the roster"
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

// ─── Auditor surface (inverted band) ─────────────────────────────────────────

function AuditorSurface() {
	const features: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: ListChecks,
			title: "Guided step by step",
			body: "The field app walks auditors through the full COPA instrument, section by section. Every element of the playspace is covered, every time."
		},
		{
			icon: WifiOff,
			title: "No signal? No problem",
			body: "Assigned audits are stored on the device before the auditor heads out. A lost connection on site never means a lost day of work."
		},
		{
			icon: RefreshCcw,
			title: "Resume, then sync",
			body: "Interrupted audits pick up exactly where they left off. Completed submissions sync to the web dashboard the moment connectivity returns."
		},
		{
			icon: ClipboardCheck,
			title: "Notes and observations captured on site",
			body: "Auditors can record section notes and observations in the moment, so the evidence is where it belongs - with the assessment."
		}
	];

	return (
		<section
			id="auditor-surface"
			className="scroll-mt-20 bg-foreground text-background"
			aria-labelledby="auditor-surface-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				{/* Label strip (inverted) */}
				<div className="mb-10 flex items-center gap-3">
					<span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-background/20 bg-background/10 px-3 text-xs font-semibold uppercase tracking-[0.07em] text-background/80">
						<Smartphone className="size-3.5" aria-hidden />
						Their surface
					</span>
					<span className="text-sm text-background/60">Runs on iOS and Android</span>
				</div>

				<div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
					{/* Phone cluster - DARK phones together for cohesion */}
					{/* HYBRID SLOT: replace with a premium multi-phone composite framing all three dark renders for an even richer field scene */}
					<DeviceScene className="relative mx-auto flex w-full max-w-sm items-end justify-center gap-3 sm:gap-5 lg:order-first lg:max-w-none">
						<FloatingPhone
							src={SHOT.phoneQuestionsDark}
							alt="COPA mobile field app on a phone showing a guided audit question with multiple answer options and section-level progress"
							glow="terracotta"
							sizes="(min-width: 1024px) 13rem, 36vw"
							className="w-[42%] translate-y-6"
						/>
						<FloatingPhone
							src={SHOT.phoneHeroDark}
							alt="COPA mobile field app on a phone showing an auditor's assigned audits with an offline-ready status banner and a highlighted priority task"
							glow="slate"
							sizes="(min-width: 1024px) 14rem, 40vw"
							className="w-[48%] -translate-y-2"
						/>
					</DeviceScene>

					<div className="max-w-xl">
						<Eyebrow className="text-background/70">The field app</Eyebrow>
						<h2
							id="auditor-surface-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
							Give your team a tool that holds up in the field.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-background/70">
							The mobile app is what you hand to auditors before they head out. It keeps assessments
							structured and consistent across every site - and protects the data you need for reporting.
						</p>

						<ul className="mt-8 space-y-5">
							{features.map(feature => (
								<li key={feature.title} className="flex gap-4">
									<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-background/10 text-background">
										<feature.icon className="size-4" aria-hidden />
									</span>
									<div>
										<h3 className="text-base font-semibold text-background">{feature.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-background/65">
											{feature.body}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Secondary row: LIGHT section phones showing the capture flow */}
				<div className="mt-16 border-t border-background/10 pt-14">
					<p className="text-center text-sm font-semibold uppercase tracking-[0.08em] text-background/50">
						What your auditors see at each step
					</p>
					<div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-2 lg:gap-10">
						<div className="flex flex-col items-center gap-4">
							<FloatingPhone
								src={SHOT.phoneExecuteSection}
								alt="COPA mobile field app showing an auditor working through a section with scoring options and progress indicators"
								glow="neutral"
								sizes="(min-width: 1024px) 18rem, 44vw"
								className="w-full max-w-[14rem] sm:max-w-[16rem]"
							/>
							<p className="text-center text-sm font-medium text-background/70">
								Working through a section
							</p>
						</div>
						<div className="flex flex-col items-center gap-4">
							<FloatingPhone
								src={SHOT.phoneSectionNotes}
								alt="COPA mobile field app showing a section notes screen where an auditor captures on-site observations"
								glow="neutral"
								sizes="(min-width: 1024px) 18rem, 44vw"
								className="w-full max-w-[14rem] sm:max-w-[16rem]"
							/>
							<p className="text-center text-sm font-medium text-background/70">
								Capturing section observations
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Pairing callout ──────────────────────────────────────────────────────────

function PairingCallout() {
	const pairs: Array<{ web: string; field: string }> = [
		{
			web: "You assign a place to an auditor on the web.",
			field: "They see it immediately in the field app."
		},
		{
			web: "You set up the project structure on the dashboard.",
			field: "They work through the guided audit on site."
		},
		{
			web: "You review scores and status as work comes in.",
			field: "They sync submissions the moment they reconnect."
		},
		{
			web: "You export the combined report from the dashboard.",
			field: "The scores come directly from their submitted fieldwork."
		}
	];

	return (
		<section className="border-b border-edge/40 bg-muted/30" aria-labelledby="pairing-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>How the two surfaces connect</Eyebrow>
					<h2
						id="pairing-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Every web action has a field counterpart.
					</h2>
					<p className="mt-4 text-base leading-relaxed text-muted-foreground">
						The moment you act on the dashboard, your team sees the result in the field - and vice versa.
						Nothing falls through the gap between coordination and delivery.
					</p>
				</div>

				<div className="mt-10 grid gap-3 lg:gap-4">
					{pairs.map((pair, i) => (
						<div
							key={i}
							className="grid grid-cols-1 overflow-hidden rounded-card border border-edge/40 bg-card sm:grid-cols-[1fr_auto_1fr]">
							{/* Web side */}
							<div className="flex items-center gap-3 px-5 py-4 sm:py-5">
								<span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
									<Globe className="size-3.5" aria-hidden />
								</span>
								<p className="text-sm leading-snug text-foreground">{pair.web}</p>
							</div>

							{/* Connector arrow */}
							<div className="hidden items-center justify-center border-x border-edge/30 bg-muted/60 px-4 sm:flex">
								<ArrowRight className="size-4 text-muted-foreground" aria-hidden />
							</div>

							{/* Field side */}
							<div className="flex items-center gap-3 border-t border-edge/30 px-5 py-4 sm:border-t-0 sm:py-5">
								<span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-terracotta/15 text-accent-terracotta">
									<Smartphone className="size-3.5" aria-hidden />
								</span>
								<p className="text-sm leading-snug text-foreground">{pair.field}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── Shared record ────────────────────────────────────────────────────────────

function SharedRecord() {
	const formats = ["PDF report", "Excel workbook", "CSV data", "ZIP bundle"];

	return (
		<section
			id="shared-record"
			className="scroll-mt-20 border-b border-edge/40"
			aria-labelledby="shared-record-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>One shared record</Eyebrow>
					<h2
						id="shared-record-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Field data and dashboard reports come from the same source of truth.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						There is no manual step between what your auditors submit and what you see on the dashboard. The
						scores, the breakdowns, and the exports all come from the same shared audit record - so you can
						stand behind everything in the report.
					</p>
				</div>

				{/* Mirrored pairing: web report and phone score */}
				<div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
					{/* Laptop full report */}
					<div className="space-y-6">
						<FramedMacbook
							src={SHOT.combinedReport}
							alt="COPA combined place report on a laptop showing Play Value and Usability results merged from all submitted audits, with PDF and Excel export options"
							glow="moss"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
						<FramedMacbook
							src={SHOT.scoreSummary}
							alt="COPA report score summary on a laptop showing an overall Play Value score, a Usability score, and a domain-by-domain breakdown across Provision, Variety, Challenge, and Sociability"
							glow="slate"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
					</div>

					{/* Phone score + explanation */}
					<div className="flex flex-col gap-8 lg:sticky lg:top-24">
						<div className="flex justify-center">
							<FloatingPhone
								src={SHOT.phoneReportScoring}
								alt="COPA mobile field app showing an audit score summary on a phone with Play Value and Usability results after an auditor completes a session"
								glow="terracotta"
								sizes="(min-width: 1024px) 14rem, 40vw"
								className="w-[55%] max-w-[13rem]"
							/>
						</div>

						<Card className="gap-0 py-0">
							<CardContent className="space-y-4 px-5 pb-6 pt-5">
								<h3 className="text-lg font-semibold text-foreground">
									What you see on the dashboard is what the auditor submitted.
								</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">
									Scores visible to your auditors on the mobile app after submitting come from the
									same calculation that drives the combined place report on your dashboard. One
									assessment, one record, two views.
								</p>
								<ul className="space-y-2">
									{[
										"Play Value and Usability scores computed from submitted fieldwork",
										"Provision, Variety, Challenge, and Sociability breakdowns on both surfaces",
										"Export the same evidence your team collected - nothing added, nothing lost"
									].map(item => (
										<li
											key={item}
											className="flex items-start gap-2.5 text-sm text-muted-foreground">
											<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
											<span>{item}</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>

						<div>
							<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
								Export from the dashboard in the format you need
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
			</div>
		</section>
	);
}

// ─── Framework ────────────────────────────────────────────────────────────────

function Framework() {
	const facts: Array<{ value: string; label: string; body: string }> = [
		{
			value: "2",
			label: "Core constructs",
			body: "Play Value and Usability - what a playspace offers, and who can genuinely take part."
		},
		{
			value: "4",
			label: "Scoring lenses",
			body: "Provision, Variety, Challenge, and Sociability applied across the whole playspace."
		},
		{
			value: "10",
			label: "Playspace elements",
			body: "Natural features, surfaces, loose parts, pathways, amenities, shade, management, and more."
		}
	];

	return (
		<section
			id="framework"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="framework-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The method behind both surfaces</Eyebrow>
					<h2
						id="framework-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Built on a rigorous, research-informed framework.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						The guided questions in the field app and the scores on your dashboard are grounded in the same
						framework - research on children&apos;s play, affordance theory, and inclusive design.
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
						Dr. Janet Loebach. Designed for knowledgeable practitioners who bring professional context to
						the assessment. Formal psychometric validation is ongoing.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function CtaBand() {
	return (
		<section
			id="get-started"
			className="scroll-mt-20 px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-20"
			aria-labelledby="cta-heading">
			<div className="mx-auto w-full max-w-6xl overflow-hidden rounded-card bg-foreground px-6 py-14 text-center text-background shadow-[0_6px_0_rgba(0,0,0,0.22),0_12px_28px_rgba(0,0,0,0.18)] sm:px-12 lg:py-20">
				<Eyebrow className="text-background/60">See how one account runs both</Eyebrow>
				<h2
					id="cta-heading"
					className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					Coordinate from the web. Execute in the field. Review it all in one place.
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					One account connects your dashboard and your team&apos;s field app. Start a project, invite your
					auditors, and collect your first assessment today.
				</p>

				<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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

				{/* Surface reminder strip */}
				<div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
					<div className="flex items-center gap-2 text-sm text-background/60">
						<Globe className="size-4" aria-hidden />
						Web dashboard for coordinators
					</div>
					<div className="hidden h-4 w-px bg-background/20 sm:block" aria-hidden />
					<div className="flex items-center gap-2 text-sm text-background/60">
						<Smartphone className="size-4" aria-hidden />
						Mobile field app for auditors
					</div>
					<div className="hidden h-4 w-px bg-background/20 sm:block" aria-hidden />
					<div className="flex items-center gap-2 text-sm text-background/60">
						<MapPin className="size-4" aria-hidden />
						One shared account
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TwoSurfacesOneAccountPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} />
			<main>
				<Hero />
				<RoleClarity />
				<ManagerSurface />
				<AuditorSurface />
				<PairingCallout />
				<SharedRecord />
				<Framework />
				<CtaBand />
			</main>
			<LandingFooter />
		</div>
	);
}
