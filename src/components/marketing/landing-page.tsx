"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import {
	ArrowRight,
	Check,
	ClipboardCheck,
	FileText,
	Gauge,
	Map as MapIcon,
	Menu,
	Save,
	Sparkles,
	Users,
	X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatItem = { value: string; label: string };
type FeatureItem = { icon: string; title: string; body: string };
type StepItem = { title: string; body: string };
type PricingTier = {
	id: string;
	name: string;
	priceMonthly: string;
	priceAnnual: string;
	description: string;
	cta: string;
	highlight: boolean;
	features: string[];
};
type FaqItem = { q: string; a: string };

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
	clipboard: ClipboardCheck,
	users: Users,
	gauge: Gauge,
	map: MapIcon,
	save: Save,
	file: FileText
};

const SIGN_UP_PATH = "/signup";
const SIGN_IN_PATH = "/login";

function priceIsNumeric(value: string): boolean {
	return /\d/.test(value);
}

/** Eyebrow label used to introduce each section. */
function Eyebrow({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
			<span className="h-px w-6 bg-primary/50" aria-hidden />
			{children}
		</span>
	);
}

/** Sticky translucent top navigation with a mobile sheet. */
function SiteHeader() {
	const t = useTranslations("landing.nav");
	const [open, setOpen] = React.useState(false);

	const links = [
		{ href: "#features", label: t("features") },
		{ href: "#how", label: t("how") },
		{ href: "#pricing", label: t("pricing") },
		{ href: "#faq", label: t("faq") }
	];

	return (
		<header className="sticky top-0 z-50 border-b border-edge/50 bg-canvas/80 backdrop-blur-xl">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				<Link href="/" className="flex items-center gap-2.5">
					<span className="flex size-9 items-center justify-center rounded-card border border-edge/50 bg-surface-raised shadow-card">
						<Image src="/icon.png" alt="" width={24} height={24} />
					</span>
					<span className="font-heading text-lg font-bold tracking-tight text-text-primary">COPA</span>
				</Link>

				<nav className="hidden items-center gap-1 md:flex">
					{links.map(link => (
						<a
							key={link.href}
							href={link.href}
							className="rounded-field px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary">
							{link.label}
						</a>
					))}
				</nav>

				<div className="hidden items-center gap-2 md:flex">
					<Button asChild variant="ghost" size="sm">
						<Link href={SIGN_IN_PATH}>{t("signIn")}</Link>
					</Button>
					<Button asChild size="sm">
						<Link href={SIGN_UP_PATH}>{t("getStarted")}</Link>
					</Button>
				</div>

				<button
					type="button"
					onClick={() => setOpen(value => !value)}
					aria-label={open ? t("closeMenu") : t("openMenu")}
					aria-expanded={open}
					className="inline-flex size-9 items-center justify-center rounded-field border border-edge/50 bg-surface-raised text-text-primary md:hidden">
					{open ? <X className="size-4" /> : <Menu className="size-4" />}
				</button>
			</div>

			{open ? (
				<div className="border-t border-edge/50 bg-canvas/95 px-4 py-4 backdrop-blur-xl md:hidden">
					<nav className="flex flex-col gap-1">
						{links.map(link => (
							<a
								key={link.href}
								href={link.href}
								onClick={() => setOpen(false)}
								className="rounded-field px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary">
								{link.label}
							</a>
						))}
						<div className="mt-2 flex flex-col gap-2">
							<Button asChild variant="outline" size="sm">
								<Link href={SIGN_IN_PATH}>{t("signIn")}</Link>
							</Button>
							<Button asChild size="sm">
								<Link href={SIGN_UP_PATH}>{t("getStarted")}</Link>
							</Button>
						</div>
					</nav>
				</div>
			) : null}
		</header>
	);
}

/** Stylized product window rendered entirely from design tokens. */
function ProductMock() {
	const t = useTranslations("landing.mock");

	const domains = [
		{ label: t("domainProvision"), value: 86, color: "var(--accent-terracotta)" },
		{ label: t("domainDiversity"), value: 72, color: "var(--accent-moss)" },
		{ label: t("domainChallenge"), value: 64, color: "var(--accent-slate)" },
		{ label: t("domainSociability"), value: 79, color: "var(--accent-violet)" }
	];

	const places = [
		{ name: "Maplewood Commons", pv: "4.3", u: "4.6", done: true },
		{ name: "Harbor Point Play", pv: "3.8", u: "4.1", done: true },
		{ name: "Cedar Hollow Field", pv: "—", u: "—", done: false }
	];

	return (
		<div className="overflow-hidden rounded-2xl border border-edge/60 bg-surface shadow-lift">
			<div className="flex items-center gap-2 border-b border-edge/50 bg-surface-sunken px-4 py-3">
				<span className="size-3 rounded-full bg-status-danger/70" aria-hidden />
				<span className="size-3 rounded-full bg-status-warning/70" aria-hidden />
				<span className="size-3 rounded-full bg-status-success/70" aria-hidden />
				<span className="ml-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
					{t("workspace")}
				</span>
			</div>

			<div className="space-y-4 p-5">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{t("project")}</p>
				</div>

				<div className="grid grid-cols-3 gap-3">
					<div className="rounded-card border border-edge/50 bg-surface-raised p-3">
						<p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{t("places")}</p>
						<p className="mt-1 font-heading text-2xl font-bold text-text-primary">18</p>
					</div>
					<div className="rounded-card border border-edge/50 bg-surface-raised p-3">
						<p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{t("score")}</p>
						<p className="mt-1 font-heading text-2xl font-bold text-text-primary">4.1</p>
					</div>
					<div className="rounded-card border border-edge/50 bg-surface-raised p-3">
						<p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
							{t("completion")}
						</p>
						<p className="mt-1 font-heading text-2xl font-bold text-status-success">83%</p>
					</div>
				</div>

				<div className="rounded-card border border-edge/50 bg-surface-raised p-4">
					<p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
						{t("domains")}
					</p>
					<div className="space-y-2.5">
						{domains.map(domain => (
							<div key={domain.label} className="flex items-center gap-3">
								<span className="w-20 shrink-0 text-xs text-text-secondary">{domain.label}</span>
								<span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
									<span
										className="block h-full rounded-full"
										style={{ width: `${domain.value}%`, backgroundColor: domain.color }}
									/>
								</span>
								<span className="w-8 shrink-0 text-right text-xs font-semibold text-text-primary">
									{(domain.value / 20).toFixed(1)}
								</span>
							</div>
						))}
					</div>
				</div>

				<div className="space-y-1.5">
					{places.map(place => (
						<div
							key={place.name}
							className="flex items-center justify-between rounded-card border border-edge/40 bg-surface-raised px-3 py-2.5">
							<span className="truncate text-sm font-medium text-text-primary">{place.name}</span>
							<span className="flex items-center gap-3">
								<span className="hidden font-mono text-xs text-text-secondary sm:inline">
									{t("pv")} {place.pv} · {t("u")} {place.u}
								</span>
								<span
									className={cn(
										"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
										place.done
											? "bg-status-success-surface text-status-success"
											: "bg-status-in-progress-surface text-status-in-progress"
									)}>
									{place.done ? t("statusComplete") : t("statusInProgress")}
								</span>
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/** Hero section with layered ambient glows. */
function Hero() {
	const t = useTranslations("landing.hero");

	return (
		<section className="relative overflow-hidden">
			{/* Ambient glows + grid */}
			<div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-accent-terracotta/20 blur-[120px]" />
				<div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-accent-slate/20 blur-[120px]" />
				<div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-accent-moss/15 blur-[120px]" />
				<div
					className="absolute inset-0 opacity-[0.4]"
					style={{
						backgroundImage:
							"linear-gradient(var(--edge) 1px, transparent 1px), linear-gradient(90deg, var(--edge) 1px, transparent 1px)",
						backgroundSize: "56px 56px",
						maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
						WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)"
					}}
				/>
			</div>

			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-28 lg:pt-24">
				<div className="max-w-xl">
					<span className="inline-flex items-center gap-2 rounded-full border border-edge/60 bg-surface-raised/80 px-3 py-1 text-xs font-medium text-text-secondary shadow-card backdrop-blur">
						<Sparkles className="size-3.5 text-primary" />
						{t("badge")}
					</span>

					<h1 className="mt-6 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
						{t("titleLead")}{" "}
						<span className="bg-gradient-to-r from-accent-terracotta via-accent-moss to-accent-slate bg-clip-text text-transparent">
							{t("titleAccent")}
						</span>
					</h1>

					<p className="mt-6 text-lg leading-relaxed text-text-secondary">{t("subtitle")}</p>

					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Button asChild size="lg">
							<Link href={SIGN_UP_PATH}>
								{t("ctaPrimary")}
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<a href="#how">{t("ctaSecondary")}</a>
						</Button>
					</div>

					<p className="mt-6 text-sm text-text-muted">{t("trust")}</p>
				</div>

				<div className="relative">
					<div
						aria-hidden
						className="absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-tr from-accent-terracotta/15 via-transparent to-accent-slate/15 blur-2xl"
					/>
					<ProductMock />
				</div>
			</div>
		</section>
	);
}

/** Compact metrics strip beneath the hero. */
function StatsStrip() {
	const t = useTranslations("landing.stats");
	const items = t.raw("items") as StatItem[];

	return (
		<section className="border-y border-edge/50 bg-surface/60">
			<div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
				{items.map(item => (
					<div key={item.label} className="text-center sm:text-left">
						<p className="font-heading text-3xl font-bold tracking-tight text-text-primary lg:text-4xl">
							{item.value}
						</p>
						<p className="mt-1 text-sm leading-snug text-text-muted">{item.label}</p>
					</div>
				))}
			</div>
		</section>
	);
}

/** Feature grid. */
function Features() {
	const t = useTranslations("landing.features");
	const items = t.raw("items") as FeatureItem[];

	return (
		<section id="features" className="scroll-mt-20">
			<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
				<div className="max-w-2xl">
					<Eyebrow>{t("eyebrow")}</Eyebrow>
					<h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-text-secondary">{t("subtitle")}</p>
				</div>

				<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map(item => {
						const Icon = FEATURE_ICONS[item.icon] ?? ClipboardCheck;
						return (
							<div
								key={item.title}
								className="group rounded-2xl border border-edge/50 bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift">
								<span className="inline-flex size-11 items-center justify-center rounded-card border border-edge/50 bg-surface-raised text-primary transition-colors group-hover:bg-primary/10">
									<Icon className="size-5" />
								</span>
								<h3 className="mt-4 font-heading text-lg font-semibold text-text-primary">
									{item.title}
								</h3>
								<p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.body}</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

/** Numbered "how it works" steps. */
function HowItWorks() {
	const t = useTranslations("landing.how");
	const steps = t.raw("steps") as StepItem[];

	return (
		<section id="how" className="scroll-mt-20 border-y border-edge/50 bg-surface/40">
			<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
				<div className="max-w-2xl">
					<Eyebrow>{t("eyebrow")}</Eyebrow>
					<h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
						{t("title")}
					</h2>
				</div>

				<ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{steps.map((step, index) => (
						<li
							key={step.title}
							className="relative rounded-2xl border border-edge/50 bg-surface p-6">
							<span className="inline-flex size-10 items-center justify-center rounded-card bg-solid-primary font-heading text-base font-bold text-solid-primary-text shadow-solid-primary">
								{String(index + 1).padStart(2, "0")}
							</span>
							<h3 className="mt-4 font-heading text-lg font-semibold text-text-primary">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}

/** Scoring-model showcase with a visual score card. */
function Showcase() {
	const t = useTranslations("landing.showcase");
	const points = t.raw("points") as string[];

	return (
		<section className="scroll-mt-20">
			<div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
				<div>
					<Eyebrow>{t("eyebrow")}</Eyebrow>
					<h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-text-secondary">{t("body")}</p>
					<ul className="mt-6 space-y-3">
						{points.map(point => (
							<li key={point} className="flex items-start gap-3">
								<span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-status-success-surface text-status-success">
									<Check className="size-3.5" />
								</span>
								<span className="text-sm leading-relaxed text-text-secondary">{point}</span>
							</li>
						))}
					</ul>
				</div>

				<div className="relative">
					<div
						aria-hidden
						className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-accent-moss/15 via-transparent to-accent-terracotta/15 blur-2xl"
					/>
					<div className="rounded-2xl border border-edge/60 bg-surface p-6 shadow-lift">
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-card border border-edge/50 bg-surface-raised p-5 text-center">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
									Play Value
								</p>
								<p className="mt-2 font-heading text-5xl font-bold text-accent-terracotta">4.3</p>
								<p className="mt-1 text-xs text-text-muted">PV</p>
							</div>
							<div className="rounded-card border border-edge/50 bg-surface-raised p-5 text-center">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
									Usability
								</p>
								<p className="mt-2 font-heading text-5xl font-bold text-accent-slate">4.6</p>
								<p className="mt-1 text-xs text-text-muted">U</p>
							</div>
						</div>
						<div className="mt-4 grid grid-cols-4 gap-2">
							{[
								{ k: "Provision", v: "4.5" },
								{ k: "Diversity", v: "3.9" },
								{ k: "Challenge", v: "3.6" },
								{ k: "Sociability", v: "4.2" }
							].map(domain => (
								<div
									key={domain.k}
									className="rounded-card border border-edge/40 bg-surface-raised px-2 py-3 text-center">
									<p className="font-heading text-lg font-bold text-text-primary">{domain.v}</p>
									<p className="mt-0.5 text-[10px] leading-tight text-text-muted">{domain.k}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

/** Pricing with a monthly / annual billing toggle. */
function Pricing() {
	const t = useTranslations("landing.pricing");
	const tiers = t.raw("tiers") as PricingTier[];
	const [annual, setAnnual] = React.useState(true);

	return (
		<section id="pricing" className="scroll-mt-20 border-t border-edge/50 bg-surface/40">
			<div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
				<div className="mx-auto max-w-2xl text-center">
					<div className="flex justify-center">
						<Eyebrow>{t("eyebrow")}</Eyebrow>
					</div>
					<h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
						{t("title")}
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-text-secondary">{t("subtitle")}</p>
				</div>

				{/* Billing toggle */}
				<div className="mt-8 flex items-center justify-center gap-3">
					<div className="inline-flex items-center rounded-pill border border-edge/60 bg-surface p-1">
						<button
							type="button"
							onClick={() => setAnnual(false)}
							aria-pressed={!annual}
							className={cn(
								"rounded-pill px-4 py-1.5 text-sm font-medium transition-colors",
								!annual ? "bg-solid-primary text-solid-primary-text" : "text-text-secondary"
							)}>
							{t("monthly")}
						</button>
						<button
							type="button"
							onClick={() => setAnnual(true)}
							aria-pressed={annual}
							className={cn(
								"rounded-pill px-4 py-1.5 text-sm font-medium transition-colors",
								annual ? "bg-solid-primary text-solid-primary-text" : "text-text-secondary"
							)}>
							{t("annual")}
						</button>
					</div>
					<span className="rounded-full bg-status-success-surface px-2.5 py-1 text-xs font-semibold text-status-success">
						{t("annualNote")}
					</span>
				</div>

				<div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-start">
					{tiers.map(tier => {
						const price = annual ? tier.priceAnnual : tier.priceMonthly;
						const numeric = priceIsNumeric(price);
						return (
							<div
								key={tier.id}
								className={cn(
									"relative flex flex-col rounded-2xl border bg-surface p-6 transition-all duration-200",
									tier.highlight
										? "border-primary/60 shadow-lift lg:-translate-y-3"
										: "border-edge/50 hover:border-edge"
								)}>
								{tier.highlight ? (
									<span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-solid-primary px-3 py-1 text-xs font-semibold text-solid-primary-text shadow-solid-primary">
										{t("mostPopular")}
									</span>
								) : null}

								<h3 className="font-heading text-lg font-bold text-text-primary">{tier.name}</h3>
								<p className="mt-1.5 min-h-10 text-sm leading-snug text-text-muted">
									{tier.description}
								</p>

								<div className="mt-5 flex items-end gap-1">
									<span className="font-heading text-4xl font-bold tracking-tight text-text-primary">
										{price}
									</span>
									{numeric ? (
										<span className="pb-1 text-sm text-text-muted">{t("perMonth")}</span>
									) : null}
								</div>
								<p className="mt-1 h-4 text-xs text-text-muted">
									{numeric && annual ? t("billedAnnually") : ""}
								</p>

								<Button
									asChild
									className="mt-5 w-full"
									variant={tier.highlight ? "default" : "outline"}>
									<Link href={tier.id === "enterprise" ? SIGN_IN_PATH : SIGN_UP_PATH}>{tier.cta}</Link>
								</Button>

								<ul className="mt-6 space-y-3 border-t border-edge/50 pt-6">
									{tier.features.map(feature => (
										<li key={feature} className="flex items-start gap-2.5">
											<Check className="mt-0.5 size-4 shrink-0 text-status-success" />
											<span className="text-sm leading-snug text-text-secondary">{feature}</span>
										</li>
									))}
								</ul>
							</div>
						);
					})}
				</div>

				<p className="mt-8 text-center text-sm text-text-muted">{t("note")}</p>
			</div>
		</section>
	);
}

/** FAQ accordion using native disclosure elements (no JS required). */
function Faq() {
	const t = useTranslations("landing.faq");
	const items = t.raw("items") as FaqItem[];

	return (
		<section id="faq" className="scroll-mt-20">
			<div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
				<div className="text-center">
					<div className="flex justify-center">
						<Eyebrow>{t("eyebrow")}</Eyebrow>
					</div>
					<h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
						{t("title")}
					</h2>
				</div>

				<div className="mt-10 space-y-3">
					{items.map(item => (
						<details
							key={item.q}
							className="group rounded-2xl border border-edge/50 bg-surface px-5 py-1 transition-colors open:border-primary/40 [&_summary]:list-none">
							<summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-left font-heading text-base font-semibold text-text-primary">
								{item.q}
								<span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-edge/60 text-text-muted transition-transform duration-200 group-open:rotate-45">
									<svg viewBox="0 0 16 16" className="size-3" aria-hidden>
										<path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.6" fill="none" />
									</svg>
								</span>
							</summary>
							<p className="pb-5 pr-8 text-sm leading-relaxed text-text-secondary">{item.a}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

/** Closing call to action band. */
function CtaBand() {
	const t = useTranslations("landing.cta");

	return (
		<section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
			<div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] border border-edge/60 bg-surface px-6 py-14 text-center sm:px-12 lg:py-20">
				<div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
					<div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-accent-terracotta/20 blur-[100px]" />
					<div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-accent-slate/20 blur-[100px]" />
				</div>
				<h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
					{t("title")}
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-lg text-text-secondary">{t("subtitle")}</p>
				<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
					<Button asChild size="lg">
						<Link href={SIGN_UP_PATH}>
							{t("primary")}
							<ArrowRight className="size-4" />
						</Link>
					</Button>
					<Button asChild size="lg" variant="outline">
						<Link href={SIGN_IN_PATH}>{t("secondary")}</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

/** Site footer. */
function SiteFooter() {
	const t = useTranslations("landing.footer");
	const year = new Date().getFullYear();

	const columns = [
		{
			heading: t("product"),
			links: [
				{ label: t("links.features"), href: "#features" },
				{ label: t("links.pricing"), href: "#pricing" },
				{ label: t("links.how"), href: "#how" }
			]
		},
		{
			heading: t("company"),
			links: [
				{ label: t("links.resources"), href: "/resources" },
				{ label: t("links.faq"), href: "#faq" },
				{ label: t("links.signIn"), href: SIGN_IN_PATH }
			]
		}
	];

	return (
		<footer className="border-t border-edge/50 bg-surface/60">
			<div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
				<div className="max-w-sm">
					<Link href="/" className="flex items-center gap-2.5">
						<span className="flex size-9 items-center justify-center rounded-card border border-edge/50 bg-surface-raised shadow-card">
							<Image src="/icon.png" alt="" width={24} height={24} />
						</span>
						<span className="font-heading text-lg font-bold tracking-tight text-text-primary">COPA</span>
					</Link>
					<p className="mt-4 text-sm leading-relaxed text-text-muted">{t("tagline")}</p>
				</div>

				{columns.map(column => (
					<div key={column.heading}>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
							{column.heading}
						</p>
						<ul className="mt-4 space-y-2.5">
							{column.links.map(link => (
								<li key={link.label}>
									<Link
										href={link.href}
										className="text-sm text-text-secondary transition-colors hover:text-text-primary">
										{link.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>

			<div className="border-t border-edge/50">
				<div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
					<p className="text-xs text-text-muted">
						© {year} {t("copyright")}
					</p>
				</div>
			</div>
		</footer>
	);
}

/** Public marketing landing page for COPA. */
export function LandingPage() {
	return (
		<div className="min-h-dvh bg-canvas text-text-primary">
			<SiteHeader />
			<main>
				<Hero />
				<StatsStrip />
				<Features />
				<HowItWorks />
				<Showcase />
				<Pricing />
				<Faq />
				<CtaBand />
			</main>
			<SiteFooter />
		</div>
	);
}
