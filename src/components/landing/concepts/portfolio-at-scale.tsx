/**
 * Concept: Portfolio at Scale.
 *
 * Audience: municipalities, park systems, funding agencies, multi-site research
 * programs, and any organisation running COPA assessments across many places and
 * teams. The page is written from the perspective of an institutional buyer who
 * needs standardised, comparable, and exportable evidence across a whole
 * portfolio — not just one playspace.
 *
 * All visible copy is user-facing. No strategy terms, internal labels, or
 * developer terminology appear on screen.
 */

import Link from "next/link";
import {
	ArrowRight,
	BarChart3,
	Check,
	Database,
	Download,
	FileSpreadsheet,
	FolderKanban,
	Globe,
	MapPin,
	Scale,
	ShieldCheck,
	Users,
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
	projects: "/screenshots/Framed/manager/projects/01-overview/01.png",
	places: "/screenshots/Framed/manager/places/01-overview/01.png",
	roster: "/screenshots/Framed/manager/auditors/02-invite-dialog-open.png",
	audits: "/screenshots/Framed/manager/audits/01-overview/02.png",
	combinedReport: "/screenshots/Framed/manager/reports/place-report/01-overview/01.png",
	scoreSummary: "/screenshots/Framed/manager/reports/detail/01-overview/01.png",
	rawData: "/screenshots/Framed/manager/raw-data/01-overview/01.png",
	phoneReportScoring: "/marketing/report-scoring-tilted.png",
	phoneReportsPreview: "/marketing/reports-preview-portrait.png"
} as const;

const NAV: NavLink[] = [
	{ href: "#portfolio", label: "Portfolio" },
	{ href: "#workforce", label: "Workforce" },
	{ href: "#outputs", label: "Outputs" },
	{ href: "#data", label: "Data export" },
	{ href: "#partnership", label: "Partnership" }
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
				<div className="max-w-xl">
					<Eyebrow>For municipalities, agencies &amp; research programmes</Eyebrow>

					<h1
						id="hero-heading"
						className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						One playspace or thirty — assessed the same rigorous way.
					</h1>

					<p className="mt-5 text-lg leading-relaxed text-muted-foreground">
						COPA gives your organisation a single, standardised approach to Play Value and Usability
						assessment. Comparable scores, coordinated teams, and structured data ready for analysis —
						across every site in your portfolio.
					</p>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg">
							<Link href={MARKETING_ROUTES.signIn}>
								Talk about a partnership
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link href={MARKETING_ROUTES.signUp}>Start an audit</Link>
						</Button>
					</div>

					<p className="mt-6 text-sm text-muted-foreground">
						Research-informed · Expert-reviewed · Designed for institutional practice
					</p>
				</div>

				<DeviceScene className="lg:pb-10 lg:pl-10">
					<FramedMacbook
						src={SHOT.projects}
						alt="COPA project portfolio on a laptop showing an account-wide portfolio with total, active, and completed projects alongside average Play Value and Usability scores across all sites"
						priority
						glow="slate"
						sizes="(min-width: 1024px) 42rem, 92vw"
					/>
					<FloatingPhone
						src={SHOT.phoneReportScoring}
						alt="COPA field app on a phone showing a score summary with Play Value and Usability results after a completed audit"
						glow="moss"
						sizes="(min-width: 1024px) 12rem, 34vw"
						className="absolute -bottom-6 -left-2 w-[36%] max-w-[10rem] sm:-left-6 sm:w-[32%] lg:-bottom-2 lg:left-0"
					/>
				</DeviceScene>
			</div>
		</section>
	);
}

// ─── Portfolio overview ────────────────────────────────────────────────────────

function Portfolio() {
	const capabilities: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: FolderKanban,
			title: "Organise work into projects",
			body: "Group sites under named projects — by season, funding cycle, district, or any structure that matches how your programme runs."
		},
		{
			icon: BarChart3,
			title: "Portfolio-wide averages at a glance",
			body: "Play Value and Usability scores roll up to the account level the moment audits come in, so programme-wide health is always current."
		},
		{
			icon: MapPin,
			title: "Every place, tracked in one list",
			body: "See total, submitted, and in-progress counts for every place in your account. No spreadsheet maintenance required."
		}
	];

	return (
		<section id="portfolio" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="portfolio-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
					<div className="max-w-xl">
						<Eyebrow>Your portfolio</Eyebrow>
						<h2
							id="portfolio-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							See the whole portfolio and every site within it.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
							Whether you manage a dozen parks or a hundred, COPA keeps your projects and places in one
							organised view — with progress and scores updating as fieldwork is submitted.
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

					<DeviceScene>
						<FramedMacbook
							src={SHOT.places}
							alt="COPA places dashboard on a laptop showing all sites in the account with total, submitted, and in-progress audit counts and overall Play Value and Usability scores"
							glow="moss"
							sizes="(min-width: 1024px) 38rem, 92vw"
						/>
					</DeviceScene>
				</div>
			</div>
		</section>
	);
}

// ─── Scale indicator band ──────────────────────────────────────────────────────

function ScaleBand() {
	const indicators: Array<{ value: string; label: string }> = [
		{ value: "2", label: "Assessment constructs (Play Value and Usability)" },
		{ value: "4", label: "Scoring lenses per construct" },
		{ value: "10", label: "Playspace elements evaluated" },
		{ value: "1", label: "Standardised method across every site" }
	];

	return (
		<div className="border-b border-edge/40 bg-muted/40" aria-label="COPA scale at a glance">
			<div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
				<dl className="grid grid-cols-2 gap-y-8 sm:grid-cols-4">
					{indicators.map(ind => (
						<div key={ind.label} className="flex flex-col gap-1 px-4">
							<dt className="font-mono text-4xl font-semibold tabular-nums text-foreground">
								{ind.value}
							</dt>
							<dd className="text-sm leading-relaxed text-muted-foreground">{ind.label}</dd>
						</div>
					))}
				</dl>
			</div>
		</div>
	);
}

// ─── Coordinated workforce ────────────────────────────────────────────────────

function Workforce() {
	return (
		<section
			id="workforce"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="workforce-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="max-w-2xl">
					<Eyebrow>Coordinated workforce</Eyebrow>
					<h2
						id="workforce-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Many auditors. One consistent method.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Scale your assessment programme without sacrificing consistency. Every auditor works through the
						same COPA instrument on the same guided mobile experience, so scores are comparable regardless
						of who collected them or when.
					</p>
				</div>

				<div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-start">
					<div>
						<FramedMacbook
							src={SHOT.roster}
							alt="COPA auditor management on a laptop showing a roster of auditors with an invite-auditor dialog open, displaying assigned places, roles, and completed audits"
							glow="violet"
							sizes="(min-width: 1024px) 32rem, 92vw"
						/>
						<div className="mt-5 space-y-2.5 px-1">
							<h3 className="text-lg font-semibold text-foreground">Build and grow your field team.</h3>
							<p className="text-sm leading-relaxed text-muted-foreground">
								Invite auditors, assign them to specific sites, and track their progress from a single
								roster. New team members can start delivering audits without a long ramp-up period.
							</p>
							<ul className="mt-4 space-y-2">
								{[
									"Invite auditors and get them onsite quickly",
									"Assign individuals across multiple places and projects",
									"Track completion status without chasing emails"
								].map(item => (
									<li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
										<Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
										<span>{item}</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					<div>
						<FramedMacbook
							src={SHOT.audits}
							alt="COPA audits oversight table on a laptop listing submitted audits with their auditor, submission dates, place name, and Play Value and Usability scores"
							glow="slate"
							sizes="(min-width: 1024px) 32rem, 92vw"
						/>
						<div className="mt-5 space-y-2.5 px-1">
							<h3 className="text-lg font-semibold text-foreground">
								Every submission, in one oversight table.
							</h3>
							<p className="text-sm leading-relaxed text-muted-foreground">
								Sort and filter submitted audits by site, auditor, date, or score. Spot gaps in coverage
								and identify which places are still awaiting fieldwork at a glance.
							</p>
							<ul className="mt-4 space-y-2">
								{[
									"Filter by status, site, or auditor across the whole programme",
									"Review Play Value and Usability scores as they come in",
									"Identify outstanding work without manual tracking"
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
			</div>
		</section>
	);
}

// ─── Comparable outputs (inverted band) ───────────────────────────────────────

function ComparableOutputs() {
	const points: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: Scale,
			title: "Scores that stand up to comparison",
			body: "Because every audit uses the same COPA instrument and the same scoring lenses, a Play Value score from one site means the same thing as the same score from another — across your whole portfolio."
		},
		{
			icon: Globe,
			title: "Track change over time",
			body: "Re-assess the same place in a later season or after a capital improvement and compare results directly. Consistent method makes longitudinal comparisons meaningful."
		},
		{
			icon: Users,
			title: "Evidence for every stakeholder",
			body: "The combined place report brings audit and site survey into one document. Present the same structured findings to funders, boards, and design teams without repackaging data."
		}
	];

	return (
		<section id="outputs" className="scroll-mt-20 bg-foreground text-background" aria-labelledby="outputs-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
					<div className="max-w-xl">
						<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-background/70">
							Comparable outputs
						</p>
						<h2
							id="outputs-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
							Reports you can compare across sites and over time.
						</h2>
						<p className="mt-4 text-lg leading-relaxed text-background/70">
							Standardised assessment is only useful if the outputs are equally consistent. COPA produces
							structured reports with the same scoring framework applied to every site — so comparisons
							are meaningful, not approximate.
						</p>

						<ul className="mt-8 space-y-5">
							{points.map(point => (
								<li key={point.title} className="flex gap-4">
									<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-background/10 text-background">
										<point.icon className="size-4" aria-hidden />
									</span>
									<div>
										<h3 className="text-base font-semibold text-background">{point.title}</h3>
										<p className="mt-1 text-sm leading-relaxed text-background/65">{point.body}</p>
									</div>
								</li>
							))}
						</ul>
					</div>

					{/* HYBRID SLOT: a premium composite showing the combined report laptop overlaid
					    with two phone report screens would strengthen this panel. */}
					<DeviceScene className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
						<FramedMacbook
							src={SHOT.combinedReport}
							alt="COPA combined place report on a laptop showing Play Value and Usability results with a domain-by-domain breakdown and PDF and Excel export options"
							glow="neutral"
							haloClassName="bg-background/8"
							sizes="(min-width: 1024px) 32rem, 92vw"
						/>
						<FramedMacbook
							src={SHOT.scoreSummary}
							alt="COPA report detail on a laptop showing an overall score summary with Play Value, Usability, and per-lens percentages for Provision, Variety, Challenge, and Sociability"
							glow="neutral"
							haloClassName="bg-background/6"
							sizes="(min-width: 1024px) 28rem, 84vw"
							className="mx-auto max-w-[88%]"
						/>
					</DeviceScene>
				</div>
			</div>
		</section>
	);
}

// ─── Data for analysis ────────────────────────────────────────────────────────

function DataForAnalysis() {
	const exportFormats: Array<{ icon: LucideIcon; label: string; description: string }> = [
		{
			icon: FileSpreadsheet,
			label: "Excel workbook",
			description:
				"Structured audit data with scoring breakdowns, ready for pivot tables and statistical analysis."
		},
		{
			icon: Download,
			label: "CSV data",
			description: "Flat-file exports of place, audit, and score records for import into GIS or research tools."
		},
		{
			icon: Database,
			label: "ZIP bundle",
			description:
				"Full organisation export — projects, places, audits, and saved reports in one structured archive."
		},
		{
			icon: FileSpreadsheet,
			label: "PDF report",
			description:
				"Board-ready formatted reports for individual places or combined audit and site-survey outputs."
		}
	];

	return (
		<section id="data" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="data-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
					<DeviceScene>
						<FramedMacbook
							src={SHOT.rawData}
							alt="COPA report detail on a laptop showing structured raw data and evidence records with export options for downloading the full dataset as an Excel or ZIP file"
							glow="slate"
							sizes="(min-width: 1024px) 40rem, 92vw"
						/>
					</DeviceScene>

					<div className="max-w-md">
						<Eyebrow>Data for analysis</Eyebrow>
						<h2
							id="data-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Structured exports that feed your existing tools.
						</h2>
						<p className="mt-4 text-base leading-relaxed text-muted-foreground">
							COPA organises assessment data so it can leave the dashboard and enter your analysis
							pipeline. Export full organisation data for use in GIS platforms, statistical software, or
							external research programmes — structured by project, place, and audit.
						</p>

						<div className="mt-8 space-y-3">
							{exportFormats.map(fmt => (
								<div
									key={fmt.label}
									className="flex items-start gap-3 rounded-card border border-edge/40 bg-card px-4 py-3">
									<span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-card bg-muted text-muted-foreground">
										<fmt.icon className="size-3.5" aria-hidden />
									</span>
									<div>
										<p className="text-sm font-semibold text-foreground">{fmt.label}</p>
										<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
											{fmt.description}
										</p>
									</div>
								</div>
							))}
						</div>

						<div className="mt-6 flex items-start gap-3 rounded-card border border-primary/20 bg-primary/5 px-4 py-3">
							<ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
							<p className="text-xs leading-relaxed text-muted-foreground">
								Organisation-wide exports are available to account managers and do not include auditor
								personal details — only the assessment data and scoring records your analysis needs.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Research foundation ──────────────────────────────────────────────────────

function ResearchFoundation() {
	const lenses: Array<{ label: string; body: string }> = [
		{
			label: "Provision",
			body: "What elements are present and accessible to the children using this space?"
		},
		{
			label: "Variety",
			body: "How diverse are the play opportunities across features, challenge levels, and social settings?"
		},
		{
			label: "Challenge",
			body: "Does the space offer appropriate physical, cognitive, and social challenge for different age groups?"
		},
		{
			label: "Sociability",
			body: "How well does the space support interaction, cooperation, and different group sizes?"
		}
	];

	return (
		<section className="border-b border-edge/40 bg-muted/30" aria-labelledby="research-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
					<div className="max-w-md">
						<Eyebrow>The method</Eyebrow>
						<h2
							id="research-heading"
							className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
							Scores that hold up across sites because the method holds up first.
						</h2>
						<p className="mt-4 text-base leading-relaxed text-muted-foreground">
							COPA assesses two constructs — Play Value and Usability — each through four scoring lenses
							applied consistently across all ten playspace elements. Scores are grounded in affordance
							theory, inclusive play research, and children&apos;s perspectives, then reviewed and
							field-tested by researchers with play environment expertise.
						</p>
						<div className="mt-6 flex items-start gap-3 rounded-card border border-edge/40 bg-card px-5 py-4">
							<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
							<p className="text-sm leading-relaxed text-muted-foreground">
								Developed with Dr. Thomas Morgenthaler (lead researcher) and Dr. Janet Loebach. Formal
								psychometric validation is ongoing; the instrument is designed for knowledgeable
								practitioners who bring professional context to each assessment.
							</p>
						</div>
					</div>

					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
							Four scoring lenses — applied to every site, every audit
						</p>
						<div className="mt-4 grid gap-3 sm:grid-cols-2">
							{lenses.map(lens => (
								<Card key={lens.label} className="gap-0 py-0">
									<CardContent className="space-y-2 px-4 pb-4 pt-4">
										<h3 className="text-sm font-semibold text-foreground">{lens.label}</h3>
										<p className="text-xs leading-relaxed text-muted-foreground">{lens.body}</p>
									</CardContent>
								</Card>
							))}
						</div>
						<p className="mt-4 text-xs leading-relaxed text-muted-foreground">
							The same four lenses evaluate both Play Value and Usability — so scores across constructs,
							sites, and seasons are directly comparable.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Partnership CTA ──────────────────────────────────────────────────────────

function PartnershipCta() {
	const partnerTypes: Array<{ icon: LucideIcon; title: string; body: string }> = [
		{
			icon: MapPin,
			title: "Municipalities &amp; park systems",
			body: "Assess playspaces across your district with a consistent method. Build an evidence base for capital improvement prioritisation and equity reporting."
		},
		{
			icon: Globe,
			title: "Funding agencies",
			body: "Require standardised Play Value and Usability evidence from grant recipients. Compare outcomes across funded sites using a shared assessment framework."
		},
		{
			icon: Users,
			title: "Research programmes",
			body: "Run multi-site assessments with consistent data collection. Export structured records to feed statistical analysis, GIS, and longitudinal research."
		}
	];

	return (
		<section
			id="partnership"
			className="scroll-mt-20 border-b border-edge/40"
			aria-labelledby="partnership-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>Partnership</Eyebrow>
					<h2
						id="partnership-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						Built for organisations that need assessment at scale.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						COPA&apos;s portfolio and data-export capabilities are designed for institutional use. Tell us
						about your programme and we&apos;ll discuss how COPA fits.
					</p>
				</div>

				<div className="mt-10 grid gap-4 sm:grid-cols-3">
					{partnerTypes.map(pt => (
						<Card key={pt.title} className="gap-0 py-0">
							<CardContent className="space-y-3 px-5 pb-5 pt-5">
								<span className="inline-flex size-10 items-center justify-center rounded-card bg-muted text-muted-foreground">
									<pt.icon className="size-4" aria-hidden />
								</span>
								<h3
									className="text-base font-semibold text-foreground"
									dangerouslySetInnerHTML={{ __html: pt.title }}
								/>
								<p className="text-sm leading-relaxed text-muted-foreground">{pt.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="mt-10 rounded-card border border-edge/40 bg-muted/30 px-6 py-8 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
					<div className="max-w-xl">
						<h3 className="text-xl font-semibold text-foreground">
							Discuss your portfolio with the COPA team.
						</h3>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
							Portfolio pricing, instrument configuration, and data-export options are scoped through
							partner conversations. No standard monthly rate applies at this scale — we work with you
							directly.
						</p>
					</div>
					<div className="mt-6 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
						<Button asChild size="lg">
							<Link href={MARKETING_ROUTES.signIn}>
								Talk about a partnership
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link href={MARKETING_ROUTES.signUp}>Start an audit</Link>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Final CTA band ───────────────────────────────────────────────────────────

function CtaBand() {
	return (
		<section className="px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-20" aria-labelledby="cta-heading">
			<div className="mx-auto w-full max-w-6xl rounded-card border-0 bg-foreground px-6 py-14 text-center text-background shadow-[0_6px_0_rgba(0,0,0,0.22),0_12px_28px_rgba(0,0,0,0.18)] sm:px-12 lg:py-20">
				<h2
					id="cta-heading"
					className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					Bring standardised assessment to every site in your portfolio.
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					The same rigorous method. Comparable scores across every place. Structured data ready for your
					analysis pipeline.
				</p>
				<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
					<Button asChild size="lg" variant="secondary">
						<Link href={MARKETING_ROUTES.signIn}>
							Talk about a partnership
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button
						asChild
						size="lg"
						variant="outline"
						className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
						<Link href={MARKETING_ROUTES.signUp}>Start an audit</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PortfolioAtScalePage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} ctaLabel="Talk about a partnership" ctaHref={MARKETING_ROUTES.signIn} />
			<main>
				<Hero />
				<Portfolio />
				<ScaleBand />
				<Workforce />
				<ComparableOutputs />
				<DataForAnalysis />
				<ResearchFoundation />
				<PartnershipCta />
				<CtaBand />
			</main>
			<LandingFooter />
		</div>
	);
}
