/**
 * Concept: Deliverable-First.
 *
 * Audience: grant writers, programme directors, and board-driven buyers who
 * evaluate COPA by the artifact they can circulate and defend. The page is
 * organised output-first: the report is the hero and every section works
 * backward toward how that artifact gets produced.
 *
 * Section order:
 *  1. Hero - the Combined Place Report (reports/place-report/01-overview/01.png) as a product shot
 *  2. What the report proves - score summary + domain breakdown
 *  3. Export formats - PDF / Excel / CSV / ZIP + raw data view
 *  4. How it is produced - field audit → scoring → report (phone + audits table)
 *  5. Research foundation - brief authority block
 *  6. Final CTA - tangible, output-focused
 *
 * All visible copy is user-facing. No internal/dev terms, no role enum names,
 * no invented metrics.
 */

import {
	ArrowRight,
	BarChart3,
	Check,
	ChevronRight,
	ClipboardCheck,
	Download,
	FileSpreadsheet,
	FileText,
	FolderArchive,
	type LucideIcon,
	ShieldCheck,
	SlidersHorizontal,
	Smartphone
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

// ─── Asset paths ──────────────────────────────────────────────────────────────

const SHOT = {
	combinedReport: screenshotUrl("/screenshots/Framed/manager/reports/place-report/01-overview/01.png"),
	scoreSummary: screenshotUrl("/screenshots/Framed/manager/reports/detail/01-overview/01.png"),
	rawData: screenshotUrl("/screenshots/Framed/manager/raw-data/01-overview/01.png"),
	auditsTable: screenshotUrl("/screenshots/Framed/manager/audits/01-overview/02.png"),
	auditScorecard: screenshotUrl("/screenshots/Framed/manager/audits/detail/01-overview/01.png"),
	phoneReportScoring: "/marketing/report-scoring-tilted.png",
	phoneReportDetail: "/marketing/step-report-detail.png"
};

const NAV: NavLink[] = [
	{ href: "#report", label: "The report" },
	{ href: "#scores", label: "What it proves" },
	{ href: "#exports", label: "Export formats" },
	{ href: "#how", label: "How it works" },
	{ href: "#research", label: "Research" }
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section
			id="report"
			className="relative overflow-hidden border-b border-edge/40 scroll-mt-20"
			aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-0 sm:px-6 lg:px-8 lg:pt-20">
				<div className="mx-auto max-w-3xl text-center">
					<Eyebrow>The deliverable</Eyebrow>
					<h1
						id="hero-heading"
						className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						Board-ready reports, straight from the field.
					</h1>
					<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
						The evidence you hand to the people who control decisions and money - structured, defensible,
						and ready to export the moment the fieldwork is done.
					</p>
					<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
						<Button asChild size="lg">
							<a href="#exports">
								See a sample report
								<ArrowRight className="size-4" />
							</a>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link href={MARKETING_ROUTES.signUp}>Start an audit</Link>
						</Button>
					</div>
					<p className="mt-6 text-sm text-muted-foreground">
						Research-informed · Expert-reviewed · Field-tested
					</p>
				</div>

				{/* Report product shot - full-bleed at the bottom of the hero so it
				    bleeds into the next section, giving it the weight of a product hero */}
				<div className="relative mt-14 px-0 sm:px-4 lg:px-10">
					<FramedMacbook
						src={SHOT.combinedReport}
						alt="COPA Combined Place Report on a laptop showing Play Value and Usability results with a score breakdown by domain and PDF and Excel export options"
						priority
						glow="moss"
						sizes="(min-width: 1024px) 72rem, 96vw"
						className="mx-auto max-w-5xl"
					/>
				</div>
			</div>
		</section>
	);
}

// ─── What the report proves ───────────────────────────────────────────────────

function WhatItProves() {
	const lenses: Array<{ name: string; body: string }> = [
		{
			name: "Provision",
			body: "What the space contains - the range and quantity of play opportunities available."
		},
		{
			name: "Variety",
			body: "The breadth of experience on offer, across sensory, physical, and social play."
		},
		{
			name: "Challenge",
			body: "How much the space invites risk, exploration, and progressive skill-building."
		},
		{
			name: "Sociability",
			body: "Whether the layout supports connection, collaboration, and mixed-age use."
		}
	];

	return (
		<section
			id="scores"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="scores-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
					<div className="max-w-xl">
						<Eyebrow>What the report proves</Eyebrow>
						<h2
							id="scores-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Scores a decision-maker can trust and a funder can verify.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							COPA evaluates two things a playspace must get right: what it offers children (Play Value),
							and who can genuinely use it (Usability). Each is scored across four lenses so you can see
							exactly where a space is strong and where it falls short.
						</p>

						<div className="mt-8 space-y-4">
							{lenses.map(lens => (
								<div key={lens.name} className="flex gap-3">
									<ChevronRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
									<div>
										<span className="text-sm font-semibold text-foreground">{lens.name}. </span>
										<span className="text-sm leading-relaxed text-muted-foreground">
											{lens.body}
										</span>
									</div>
								</div>
							))}
						</div>

						<p className="mt-6 border-l-2 border-primary pl-5 text-base font-medium leading-relaxed text-foreground">
							Ten playspace elements assessed across both constructs - from natural features and loose
							parts to seating, shade, and community context.
						</p>
					</div>

					<div className="space-y-6">
						<FramedMacbook
							src={SHOT.scoreSummary}
							alt="COPA report detail on a laptop showing an overall score summary with Play Value and Usability percentages alongside a domain-by-domain breakdown"
							glow="slate"
							sizes="(min-width: 1024px) 34rem, 92vw"
						/>
						<div className="flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
							<BarChart3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
							<p className="text-sm leading-relaxed text-muted-foreground">
								Every number in the report maps directly to fieldwork collected with the COPA
								instrument. The score you read is the same score your auditor recorded on site.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Export formats (inverted band) ──────────────────────────────────────────

function ExportFormats() {
	const formats: Array<{ icon: LucideIcon; label: string; body: string }> = [
		{
			icon: FileText,
			label: "PDF report",
			body: "A formatted document you can attach to a grant application, board pack, or planning submission."
		},
		{
			icon: FileSpreadsheet,
			label: "Excel workbook",
			body: "Structured data your team can sort, filter, and drop into an existing tracking dashboard."
		},
		{
			icon: Download,
			label: "CSV data",
			body: "Raw scores in a flat format compatible with any analysis tool or data platform."
		},
		{
			icon: FolderArchive,
			label: "ZIP bundle",
			body: "A complete data package organized by project, place, audit, and saved reports - for portfolio-level or research use."
		}
	];

	return (
		<section id="exports" className="scroll-mt-20 bg-foreground text-background" aria-labelledby="exports-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-background/70">
						Export in any format
					</p>
					<h2
						id="exports-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
						The right format for every audience.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-background/70">
						A board wants a PDF. Your data team wants a spreadsheet. A research partner wants structured
						CSV. One completed COPA cycle produces everything - you just choose what to hand over.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{formats.map(format => (
						<div
							key={format.label}
							className="rounded-card border border-background/10 bg-background/5 px-5 py-5 transition-colors duration-150 hover:bg-background/10">
							<span className="inline-flex size-10 items-center justify-center rounded-card bg-background/10 text-background">
								<format.icon className="size-4" aria-hidden />
							</span>
							<h3 className="mt-4 text-base font-semibold text-background">{format.label}</h3>
							<p className="mt-2 text-sm leading-relaxed text-background/65">{format.body}</p>
						</div>
					))}
				</div>

				<div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
					<FramedMacbook
						src={SHOT.rawData}
						alt="COPA report detail view on a laptop showing raw fieldwork data with structured export options for evidence and scoring data"
						glow="neutral"
						sizes="(min-width: 1024px) 38rem, 92vw"
					/>
					<div className="max-w-md">
						<h3 className="text-2xl font-semibold tracking-tight text-background">
							Every answer, not just the totals.
						</h3>
						<p className="mt-3 text-base leading-relaxed text-background/70">
							When a funder or ethics committee asks to see the underlying data, you can show them. The
							raw evidence export includes each field observation, organized the same way the instrument
							collected it.
						</p>
						<ul className="mt-5 space-y-2.5">
							{[
								"Question-level fieldwork data, not aggregates",
								"Traceability from score back to observation",
								"Ready for GIS, statistics, and external review"
							].map(item => (
								<li key={item} className="flex items-start gap-2.5 text-sm text-background/70">
									<Check className="mt-0.5 size-4 shrink-0 text-background/50" aria-hidden />
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

// ─── How it is produced ───────────────────────────────────────────────────────

function HowProduced() {
	const steps: Array<{ num: string; icon: LucideIcon; title: string; body: string }> = [
		{
			num: "01",
			icon: Smartphone,
			title: "Auditors complete fieldwork on the mobile app",
			body: "The COPA instrument guides auditors through ten playspace elements, capturing structured observations. The app works fully offline so a lost signal never interrupts the audit."
		},
		{
			num: "02",
			icon: SlidersHorizontal,
			title: "Submissions score automatically",
			body: "When fieldwork syncs, Play Value and Usability scores calculate immediately across all four lenses - Provision, Variety, Challenge, and Sociability. No manual tabulation."
		},
		{
			num: "03",
			icon: ClipboardCheck,
			title: "You build and export the report",
			body: "Merge the audit and any site survey into a single Combined Place Report on the web dashboard, then export it in the format the moment requires."
		}
	];

	return (
		<section id="how" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="how-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>How it is produced</Eyebrow>
					<h2
						id="how-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Field to report in three steps.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						The artifact your decision-makers receive starts with structured fieldwork. Here is the path
						from onsite observation to a document you can circulate.
					</p>
				</div>

				<div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
					{/* Steps column */}
					<div className="space-y-8">
						{steps.map((step, i) => (
							<div key={step.num} className="flex gap-5">
								<div className="flex flex-col items-center">
									<span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-edge/50 bg-muted font-mono text-sm font-semibold text-muted-foreground">
										{step.num}
									</span>
									{i < steps.length - 1 ? (
										<div className="mt-3 w-px flex-1 bg-edge/40" aria-hidden />
									) : null}
								</div>
								<div className="pb-8 lg:pb-0">
									<span className="inline-flex size-9 items-center justify-center rounded-card bg-primary/10 text-primary">
										<step.icon className="size-4" aria-hidden />
									</span>
									<h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
									<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
								</div>
							</div>
						))}
					</div>

					{/* Device column */}
					<div className="space-y-8">
						{/* Phone pair showing field → report arc */}
						<DeviceScene className="mx-auto flex w-full max-w-sm items-end justify-center gap-6">
							<FloatingPhone
								src={SHOT.phoneReportScoring}
								alt="COPA field app on a phone showing a score summary for a completed audit with Play Value and Usability results"
								glow="terracotta"
								sizes="(min-width: 1024px) 11rem, 36vw"
								className="w-[46%] translate-y-4"
							/>
							<FloatingPhone
								src={SHOT.phoneReportDetail}
								alt="COPA field app on a phone showing a report detail screen with place information and audit results"
								glow="slate"
								sizes="(min-width: 1024px) 12rem, 38vw"
								className="w-[52%] -translate-y-2"
							/>
						</DeviceScene>

						{/* Audits oversight table */}
						<FramedMacbook
							src={SHOT.auditsTable}
							alt="COPA audits oversight table on a laptop listing submitted audits with auditor names, dates, and Play Value and Usability scores"
							glow="moss"
							sizes="(min-width: 1024px) 34rem, 92vw"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Research foundation ──────────────────────────────────────────────────────

function Research() {
	const pillars: Array<{ title: string; body: string }> = [
		{
			title: "Affordance theory",
			body: "Scores are grounded in what a space actually invites children to do, not just what equipment is present."
		},
		{
			title: "Inclusive play and usability research",
			body: "Usability scoring reflects who can genuinely access and participate - not who is nominally permitted."
		},
		{
			title: "Children's perspectives",
			body: "The instrument design keeps the child's experience, not the administrator's checklist, as the reference point."
		},
		{
			title: "Iterative field testing",
			body: "The instrument has been refined through real assessment work, not just expert opinion."
		}
	];

	return (
		<section
			id="research"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="research-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
					<div className="max-w-xl">
						<Eyebrow>The research behind it</Eyebrow>
						<h2
							id="research-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Scores that hold up when questioned.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							When a board member, funder, or planning authority asks how the numbers were produced, you
							have an answer. COPA is built on established research literature and refined through expert
							review and field practice.
						</p>
						<div className="mt-6 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
							<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
							<p className="text-sm leading-relaxed text-muted-foreground">
								Developed under the direction of Dr. Thomas Morgenthaler and Dr. Janet Loebach. Designed
								for knowledgeable practitioners who bring professional judgement to their assessments.
								Formal psychometric validation is ongoing.
							</p>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						{pillars.map(pillar => (
							<Card key={pillar.title} className="gap-0 py-0">
								<CardContent className="space-y-2 px-5 pb-5 pt-5">
									<h3 className="text-sm font-semibold text-foreground">{pillar.title}</h3>
									<p className="text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
								</CardContent>
							</Card>
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
				<Eyebrow className="text-background/60">One COPA cycle</Eyebrow>
				<h2
					id="cta-heading"
					className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					See what you could hand upward after one COPA cycle.
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					A structured assessment, automatically scored, exported in the format your audience needs - ready
					before the meeting that decides the next stage of the project.
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

export function DeliverableFirstPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} />
			<main>
				<Hero />
				<WhatItProves />
				<ExportFormats />
				<HowProduced />
				<Research />
				<CtaBand />
			</main>
			<LandingFooter />
		</div>
	);
}
