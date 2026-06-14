/**
 * Concept: The Anti-Clipboard.
 *
 * Audience: teams that are frustrated with compliance-only checklists,
 * equipment counts, and spreadsheets that can't answer whether children can
 * actually play at a site. The page opens on the pain, builds around an
 * explicit before/after contrast, and closes with evidence the clipboard
 * can't produce.
 *
 * All visible copy is written from the visitor's point of view. Internal
 * strategy terms, data-model names, and developer language are in comments
 * only — never on the page.
 */

import Link from "next/link";
import {
	AlertCircle,
	ArrowRight,
	CheckSquare,
	ClipboardX,
	Download,
	Eye,
	FileText,
	Globe,
	Heart,
	Layers,
	Lightbulb,
	MapPin,
	MoveRight,
	ShieldCheck,
	Shuffle,
	Smile,
	Sparkles,
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
	combinedReport: "/screenshots/Framed/manager/FramedScreenshot_2.png",
	scoreSummary: "/screenshots/Framed/manager/FramedScreenshot_6.png",
	auditScorecard: "/screenshots/Framed/manager/FramedScreenshot_12.png",
	phoneFieldQuestions: "/marketing/field-questions-dark.png",
	phoneFieldDashboard: "/marketing/hero-dashboard-dark.png",
	phoneExecuteSection: "/marketing/step-execute-section.png",
	phoneSectionNotes: "/marketing/step-section-notes.png"
} as const;

const NAV: NavLink[] = [
	{ href: "#old-vs-new", label: "Old vs. new" },
	{ href: "#whole-system", label: "The whole picture" },
	{ href: "#structured-audit", label: "Structured audit" },
	{ href: "#evidence", label: "Evidence" }
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
	return (
		<section className="relative overflow-hidden border-b border-edge/40" aria-labelledby="hero-heading">
			<AmbientGlows />
			<div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
				<div className="mx-auto max-w-3xl text-center">
					<Eyebrow>A different kind of playspace assessment</Eyebrow>
					<h1
						id="hero-heading"
						className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
						There&apos;s more to a playspace than a clipboard can capture.
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
						Counting equipment tells you what&apos;s installed. It doesn&apos;t tell you whether children
						can actually play — whether the space invites exploration, accommodates every child, or holds
						attention beyond the first five minutes.
					</p>
					<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
						<Button asChild size="lg">
							<Link href={MARKETING_ROUTES.signUp}>
								Start an audit
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<a href="#evidence">See what the evidence looks like</a>
						</Button>
					</div>
					<p className="mt-6 text-sm text-muted-foreground">
						Research-informed · Expert-reviewed · Field-tested
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Old vs. new contrast ─────────────────────────────────────────────────────

type ContrastItem = { icon: LucideIcon; label: string };

const OLD_WAY: ContrastItem[] = [
	{ icon: CheckSquare, label: "Equipment count: swings, slides, climbers" },
	{ icon: CheckSquare, label: "ADA transfer points: present or absent" },
	{ icon: CheckSquare, label: "Fall-zone surfacing: compliant or not" },
	{ icon: CheckSquare, label: "Age-range markings: posted or missing" },
	{ icon: CheckSquare, label: "Maintenance issues: noted, filed, awaited" }
];

const NEW_WAY: ContrastItem[] = [
	{ icon: Eye, label: "Can children choose what to do and how to do it?" },
	{ icon: Shuffle, label: "Does the space offer variety — different types of challenge and play?" },
	{ icon: Heart, label: "Can every child find a way in, a way to belong?" },
	{ icon: Sparkles, label: "Are there materials, loose parts, or spaces that invite exploration?" },
	{ icon: Smile, label: "Does it support social play, retreat, and return — together and alone?" }
];

function OldVsNew() {
	return (
		<section id="old-vs-new" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="oldvsnew-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="mx-auto max-w-2xl text-center">
					<Eyebrow>What we usually count vs. what we should ask</Eyebrow>
					<h2
						id="oldvsnew-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						The real question isn&apos;t what&apos;s there. It&apos;s what children can do.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						Traditional checks are important for safety and compliance. But they leave the most important
						question unanswered: does this place support rich, varied, meaningful play?
					</p>
				</div>

				<div className="mt-12 grid gap-6 lg:grid-cols-2">
					{/* Old way */}
					<div className="rounded-card border border-edge/50 bg-muted/40 p-6 sm:p-8">
						<div className="mb-5 flex items-center gap-3">
							<span className="inline-flex size-9 items-center justify-center rounded-card bg-muted text-muted-foreground">
								<ClipboardX className="size-4" aria-hidden />
							</span>
							<h3 className="text-base font-semibold text-foreground">What we usually count</h3>
						</div>
						<ul className="space-y-3.5">
							{OLD_WAY.map(item => (
								<li key={item.label} className="flex items-start gap-3 text-sm text-muted-foreground">
									<item.icon
										className="mt-0.5 size-4 shrink-0 text-muted-foreground/60"
										aria-hidden
									/>
									<span>{item.label}</span>
								</li>
							))}
						</ul>
						<p className="mt-6 border-t border-edge/40 pt-4 text-xs leading-relaxed text-muted-foreground">
							Compliance checks are necessary — but they tell you about what is installed, not whether it
							works for children.
						</p>
					</div>

					{/* New way */}
					<div className="rounded-card border border-primary/25 bg-primary/5 p-6 sm:p-8">
						<div className="mb-5 flex items-center gap-3">
							<span className="inline-flex size-9 items-center justify-center rounded-card bg-primary/15 text-primary">
								<Lightbulb className="size-4" aria-hidden />
							</span>
							<h3 className="text-base font-semibold text-foreground">What COPA asks instead</h3>
						</div>
						<ul className="space-y-3.5">
							{NEW_WAY.map(item => (
								<li key={item.label} className="flex items-start gap-3 text-sm text-foreground">
									<item.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
									<span>{item.label}</span>
								</li>
							))}
						</ul>
						<p className="mt-6 border-t border-primary/20 pt-4 text-xs leading-relaxed text-muted-foreground">
							Grounded in Play Value and Usability — what a space affords, and who can genuinely take
							part.
						</p>
					</div>
				</div>

				{/* Bridge */}
				<div className="mt-8 flex items-center gap-4 rounded-card border border-edge/40 bg-card px-5 py-4">
					<MoveRight className="size-5 shrink-0 text-primary" aria-hidden />
					<p className="text-sm leading-relaxed text-muted-foreground">
						<span className="font-semibold text-foreground">COPA doesn&apos;t replace compliance.</span> It
						asks the questions that come after — and gives you evidence to act on.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── What counting misses ─────────────────────────────────────────────────────

type ElementItem = { icon: LucideIcon; name: string; body: string };

const ELEMENTS: ElementItem[] = [
	{
		icon: Layers,
		name: "Natural features",
		body: "Trees, water, sand, and earth that shift with seasons and invite open-ended engagement."
	},
	{
		icon: Shuffle,
		name: "Loose parts",
		body: "Movable materials that let children create, arrange, and transform the space themselves."
	},
	{
		icon: Globe,
		name: "Topography & surfaces",
		body: "Slopes, levels, and textures that create physical challenge and accessible routes."
	},
	{
		icon: MapPin,
		name: "Enclosure & open space",
		body: "Places to retreat, to hide, to watch — and places to run, see, and be seen."
	},
	{
		icon: Heart,
		name: "Seating & amenities",
		body: "Supports for caregivers, groups, and children who need a break or a base."
	},
	{
		icon: Eye,
		name: "Pathways",
		body: "How children and caregivers move through the space — and who can move where."
	},
	{
		icon: Sparkles,
		name: "Shade, weather & seasonality",
		body: "Whether the space stays usable across seasons and times of day."
	},
	{
		icon: FileText,
		name: "Rules & maintenance",
		body: "Signage, condition, and management signals that shape who feels welcome."
	},
	{
		icon: Globe,
		name: "Community & site context",
		body: "How the wider neighbourhood and local needs shape who uses the space and how."
	},
	{
		icon: Smile,
		name: "Manufactured features",
		body: "Installed equipment assessed not just for presence, but for what it affords."
	}
];

function WholeSystem() {
	return (
		<section
			id="whole-system"
			className="scroll-mt-20 border-b border-edge/40 bg-muted/30"
			aria-labelledby="system-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>The whole playspace</Eyebrow>
					<h2
						id="system-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						A playspace is a living system, not a list of equipment.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						A single slide tells you almost nothing. How it sits among natural features, loose parts,
						pathways, enclosure, and social space — that&apos;s where play quality lives. COPA evaluates the
						entire environment across ten elements.
					</p>
				</div>

				<div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
					{ELEMENTS.map(el => (
						<Card key={el.name} className="gap-0 py-0">
							<CardContent className="space-y-2 px-4 pb-4 pt-4">
								<span className="inline-flex size-8 items-center justify-center rounded-card bg-muted text-muted-foreground">
									<el.icon className="size-3.5" aria-hidden />
								</span>
								<h3 className="text-sm font-semibold leading-snug text-foreground">{el.name}</h3>
								<p className="text-xs leading-relaxed text-muted-foreground">{el.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

				<p className="mt-8 border-l-2 border-primary pl-5 text-base font-medium leading-relaxed text-foreground sm:text-lg">
					Because the playspace is a whole, the assessment has to be a whole. Counting one feature at a time
					can&apos;t produce a picture of how the space works for children.
				</p>
			</div>
		</section>
	);
}

// ─── Structured audit (inverted band, dark phones) ────────────────────────────

type StructureFeature = { icon: LucideIcon; title: string; body: string };

const STRUCTURE_FEATURES: StructureFeature[] = [
	{
		icon: CheckSquare,
		title: "Guided, not freeform",
		body: "Every assessor works through the same structured instrument — Provision, Variety, Challenge, Sociability — across the whole playspace. No two people scoring it differently."
	},
	{
		icon: FileText,
		title: "Notes and evidence built in",
		body: "The app captures observations and supporting notes as you go, so the scoring is grounded in what you actually saw — not reconstructed afterward."
	},
	{
		icon: Smile,
		title: "Offline, in the field",
		body: "A lost signal doesn't mean a lost day. Assigned audits are stored on the device, and sync when connectivity returns."
	}
];

function StructuredAudit() {
	return (
		<section
			id="structured-audit"
			className="scroll-mt-20 bg-foreground text-background"
			aria-labelledby="structured-heading">
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
				<div className="max-w-xl">
					<p className="text-(length:--eyebrow-size) font-semibold uppercase tracking-(--eyebrow-tracking) text-background/70">
						A structured alternative to the clipboard
					</p>
					<h2
						id="structured-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl">
						Structured and guided. Not just prettier.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-background/70">
						COPA isn&apos;t a digital version of a paper form. It&apos;s a different kind of instrument —
						one that walks assessors through the whole playspace with a consistent method, then turns those
						observations into scores you can compare and act on.
					</p>

					<ul className="mt-8 space-y-6">
						{STRUCTURE_FEATURES.map(feat => (
							<li key={feat.title} className="flex gap-4">
								<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-background/10 text-background">
									<feat.icon className="size-4" aria-hidden />
								</span>
								<div>
									<h3 className="text-base font-semibold text-background">{feat.title}</h3>
									<p className="mt-1 text-sm leading-relaxed text-background/65">{feat.body}</p>
								</div>
							</li>
						))}
					</ul>

					{/* Honest caveat — adds credibility */}
					<div className="mt-8 flex items-start gap-3 rounded-card border border-background/20 bg-background/8 px-4 py-3">
						<AlertCircle className="mt-0.5 size-4 shrink-0 text-background/60" aria-hidden />
						<p className="text-sm leading-relaxed text-background/65">
							<span className="font-semibold text-background/80">What COPA is not:</span> it&apos;s not a
							compliance checklist, and it&apos;s not automated. A COPA assessment is conducted by a
							knowledgeable practitioner — the tool structures and records their judgment, it doesn&apos;t
							replace it.
						</p>
					</div>
				</div>

				{/* HYBRID SLOT: premium multi-phone composite for the field section */}
				<DeviceScene className="mx-auto flex w-full max-w-md items-end justify-center gap-4 sm:gap-6">
					<FloatingPhone
						src={SHOT.phoneFieldQuestions}
						alt="COPA field app on a phone showing a guided audit question with structured answer options and section progress through the playspace elements"
						glow="terracotta"
						sizes="(min-width: 1024px) 13rem, 38vw"
						className="w-[46%] translate-y-4"
					/>
					<FloatingPhone
						src={SHOT.phoneFieldDashboard}
						alt="COPA field app on a phone showing an auditor's assigned and completed audits with offline-ready status and a priority task card"
						glow="slate"
						sizes="(min-width: 1024px) 14rem, 42vw"
						className="w-[52%] -translate-y-2"
					/>
				</DeviceScene>
			</div>
		</section>
	);
}

// ─── Evidence the clipboard can't produce ────────────────────────────────────

const EXPORT_FORMATS = ["PDF report", "Excel workbook", "CSV data", "ZIP bundle"];

const EVIDENCE_POINTS: Array<{ icon: LucideIcon; title: string; body: string }> = [
	{
		icon: Layers,
		title: "Play Value and Usability scores",
		body: "Every audit produces structured scores across Provision, Variety, Challenge, and Sociability — for what the space offers, and who can participate."
	},
	{
		icon: Eye,
		title: "A combined place report",
		body: "Merge an audit and a site survey into a single document. One place, one report, ready for a board meeting or funding conversation."
	},
	{
		icon: Download,
		title: "Export in the format you need",
		body: "PDF for stakeholders, Excel for further analysis, CSV for your own workflows. The same structured data, in the shape that serves the moment."
	}
];

function Evidence() {
	return (
		<section id="evidence" className="scroll-mt-20 border-b border-edge/40" aria-labelledby="evidence-heading">
			<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
				<div className="max-w-2xl">
					<Eyebrow>Evidence the clipboard can&apos;t produce</Eyebrow>
					<h2
						id="evidence-heading"
						className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
						From observation to evidence, without the manual assembly.
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-muted-foreground">
						When fieldwork is done, COPA turns it into something defensible — structured scores and a
						formatted report you can hand to funders, planners, or board members without an afternoon of
						cut-and-paste.
					</p>
				</div>

				{/* Main report screenshot */}
				<div className="mt-10">
					<DeviceScene>
						<FramedMacbook
							src={SHOT.combinedReport}
							alt="COPA combined place report on a laptop showing Play Value and Usability results with a per-lens breakdown and PDF and Excel export options"
							glow="moss"
							sizes="(min-width: 1024px) 60rem, 92vw"
							className="mx-auto max-w-4xl"
						/>
					</DeviceScene>
				</div>

				{/* Three evidence points */}
				<div className="mt-12 grid gap-4 sm:grid-cols-3">
					{EVIDENCE_POINTS.map(point => (
						<Card key={point.title} className="gap-0 py-0">
							<CardContent className="space-y-3 px-5 pb-5 pt-5">
								<span className="inline-flex size-10 items-center justify-center rounded-card bg-muted text-muted-foreground">
									<point.icon className="size-4" aria-hidden />
								</span>
								<h3 className="text-base font-semibold text-foreground">{point.title}</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">{point.body}</p>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Score summary laptop + export formats */}
				<div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
					<FramedMacbook
						src={SHOT.scoreSummary}
						alt="COPA report detail on a laptop showing an overall score summary with Play Value, Usability, and per-lens percentages and a domain-by-domain breakdown"
						glow="slate"
						sizes="(min-width: 1024px) 38rem, 92vw"
					/>
					<div className="max-w-md">
						<h3 className="text-2xl font-semibold tracking-tight text-foreground">
							Scores that hold up to scrutiny.
						</h3>
						<p className="mt-3 text-base leading-relaxed text-muted-foreground">
							Play Value and Usability are assessed through four scoring lenses — Provision, Variety,
							Challenge, and Sociability — grounded in affordance theory, inclusive design research, and
							children&apos;s perspectives. The framework was developed and expert-reviewed by Dr. Thomas
							Morgenthaler and Dr. Janet Loebach.
						</p>
						<div className="mt-6">
							<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
								Export when you&apos;re ready
							</p>
							<div className="mt-3 flex flex-wrap gap-2">
								{EXPORT_FORMATS.map(format => (
									<span
										key={format}
										className="inline-flex items-center gap-1.5 rounded-full border border-edge/50 bg-muted px-3 py-1 text-xs font-medium text-foreground">
										<Download className="size-3.5 text-muted-foreground" aria-hidden />
										{format}
									</span>
								))}
							</div>
						</div>
						<div className="mt-6 flex items-start gap-3">
							<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
							<p className="text-sm leading-relaxed text-muted-foreground">
								Formal psychometric validation is ongoing. COPA is designed for knowledgeable
								practitioners who bring professional context to the assessment.
							</p>
						</div>
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
				<Eyebrow className="text-background/60">Ready for something better?</Eyebrow>
				<h2
					id="cta-heading"
					className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-balance text-background sm:text-4xl lg:text-5xl">
					Leave the clipboard behind.
				</h2>
				<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-background/70">
					COPA gives you a structured method, a guided field tool, and a report that answers the question the
					clipboard never could — whether children can actually play.
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

export function AntiClipboardPage() {
	return (
		<div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.12),transparent_35%),linear-gradient(180deg,rgba(148,163,184,0.08),transparent_24%),hsl(var(--background))] text-foreground">
			<LandingHeader links={NAV} />
			<main>
				<Hero />
				<OldVsNew />
				<WholeSystem />
				<StructuredAudit />
				<Evidence />
				<CtaBand />
			</main>
			<LandingFooter />
		</div>
	);
}
