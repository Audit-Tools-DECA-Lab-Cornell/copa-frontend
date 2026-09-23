"use client";

import {
	ActivityIcon,
	CalendarIcon,
	ChevronDownIcon,
	ChevronsDownUpIcon,
	ChevronsUpDownIcon,
	ChevronUpIcon,
	ClipboardListIcon,
	CloudSunIcon,
	HashIcon,
	LayersIcon,
	ListIcon,
	MapPinIcon,
	UserIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import {
	DomainEmptyNotice,
	DomainFilterControls,
	FilteredScopeNote,
	ReportFilterBanner,
	ReportFilterControls
} from "@/components/dashboard/report-filter-controls";
import { formatAuditCodeReference } from "@/components/dashboard/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditSession } from "@/lib/api/playspace";
import { parsePromptSegments } from "@/lib/audit/prompt-segments";
import {
	type ConstructSelection,
	createDefaultReportFilter,
	resolveDomainConstructSelection
} from "@/lib/audit/report-filter";
import type {
	ConstructRanking,
	DomainQuestionRow,
	RankedDomain,
	SociabilityDimensionRanking
} from "@/lib/audit/report-helpers";
import {
	buildConstructRankings,
	buildReportScoreProjection,
	buildSociabilityDimensionRankings,
	formatConstructDomainLine,
	getReportDomainConstructCoverage,
	getReportKnownDomainKeys,
	getSociabilityCoverage,
	normalizeDomainKey,
	roundedPercentOfMax,
	toDomainTitle
} from "@/lib/audit/report-helpers";
import {
	getEffectiveScoreTotals,
	getExecutionModeLabel,
	getScoreVariantBuckets,
	hasUnsureVariants,
	type ScoreVariantKey
} from "@/lib/audit/score-mode-helpers";
import { useReportFilter } from "@/lib/audit/use-report-filter";
import {
	joinSpaceAuditDisplayValues,
	readSpaceAuditQuestionValues,
	resolveSpaceAuditDisplayValues
} from "@/lib/export/audit/format-utils";
import { CONSTRUCT_ACCENT_COLORS, SCALE_ACCENT_COLORS } from "@/lib/export/audit/types";
import { cn } from "@/lib/utils";
import type { AuditScoreTotals, PlayspaceInstrument } from "@/types/audit";
import type { SociabilityDimensionKey } from "@/types/sociability";

import { JsonViewer } from "./raw-json";

// ── Layout constants ─────────────────────────────────────────────────────────
// Fixed column widths shared between bar cells and table cells for alignment.

const LABEL_COL_W = 140;
const SCALE_DATA_COL_W = 90;
const CONSTRUCT_DATA_COL_W = 120;
const BAR_TRACK_HEIGHT = 164;
const BAR_WIDTH = 44;

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number, max: number): string {
	if (max <= 0) return "--";
	return `${Math.round((value / max) * 100)}%`;
}

function renderScaleCellState(options: {
	label: string | null;
	applicable: boolean;
	isNotApplicable: boolean;
	isUnsure: boolean;
	followUpScalesAsked?: boolean;
	notApplicableLabel: string;
	unsureLabel: string;
}): React.ReactNode {
	const {
		label,
		applicable,
		isNotApplicable,
		isUnsure,
		followUpScalesAsked = true,
		notApplicableLabel,
		unsureLabel
	} = options;
	if (!applicable || !followUpScalesAsked) {
		return <span className="text-muted-foreground/50">-</span>;
	}
	if (isNotApplicable) {
		return <span className="text-foreground">{notApplicableLabel}</span>;
	}
	if (isUnsure) {
		return <span className="font-medium text-foreground">{unsureLabel}</span>;
	}
	return label ?? <span className="text-muted-foreground/50">-</span>;
}

function formatDateTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true
	}).format(date);
}

// ── Metric configuration ────────────────────────────────────────────────────

type MetricKey =
	| "provision"
	| "variety"
	| "challenge"
	| "sociability"
	| "sociability_play_alone"
	| "sociability_small_group"
	| "sociability_large_group"
	| "play_value"
	| "usability";

interface MetricDef {
	readonly key: MetricKey;
	/** Translation key suffix under `shared.reportView`. */
	readonly labelKey: string;
	readonly getValue: (t: AuditScoreTotals) => number;
	readonly getMax: (t: AuditScoreTotals) => number;
}

const SCALE_METRICS: readonly MetricDef[] = [
	{
		key: "provision",
		labelKey: "metricProvision",
		getValue: t => t.provision_total,
		getMax: t => t.provision_total_max
	},
	{
		key: "variety",
		labelKey: "metricVariety",
		getValue: t => t.variety_total,
		getMax: t => t.variety_total_max
	},
	{
		key: "challenge",
		labelKey: "metricChallenge",
		getValue: t => t.challenge_total,
		getMax: t => t.challenge_total_max
	}
];

/**
 * Sociability as three independent opportunities.
 *
 * Order here is storage order, not rank. All three share one colour and one column width so the
 * chart never suggests that larger-group play is worth more than playing alone.
 */
const SOCIABILITY_DIMENSION_METRICS: readonly MetricDef[] = [
	{
		key: "sociability_play_alone",
		labelKey: "metricSociabilityPlayAlone",
		getValue: t => t.sociability_breakdown?.play_alone.total ?? 0,
		getMax: t => t.sociability_breakdown?.play_alone.max ?? 0
	},
	{
		key: "sociability_small_group",
		labelKey: "metricSociabilitySmallGroup",
		getValue: t => t.sociability_breakdown?.small_group.total ?? 0,
		getMax: t => t.sociability_breakdown?.small_group.max ?? 0
	},
	{
		key: "sociability_large_group",
		labelKey: "metricSociabilityLargeGroup",
		getValue: t => t.sociability_breakdown?.large_group.total ?? 0,
		getMax: t => t.sociability_breakdown?.large_group.max ?? 0
	}
];

/** Sociability as one aggregate, for instruments that never captured the three opportunities. */
const SOCIABILITY_TOTAL_METRICS: readonly MetricDef[] = [
	{
		key: "sociability",
		labelKey: "metricSociability",
		getValue: t => t.sociability_total,
		getMax: t => t.sociability_total_max
	}
];

const CONSTRUCT_METRICS: readonly MetricDef[] = [
	{
		key: "play_value",
		labelKey: "metricPlayValue",
		getValue: t => t.play_value_total,
		getMax: t => t.play_value_total_max
	},
	{
		key: "usability",
		labelKey: "metricUsability",
		getValue: t => t.usability_total,
		getMax: t => t.usability_total_max
	}
];

/** Translation key suffix (under `shared.reportView`) per score variant. */
const SCORE_VARIANT_LABEL_KEYS: Record<ScoreVariantKey, string> = {
	canonical: "variantCanonical",
	unsure_as_zero: "variantZero",
	unsure_as_max: "variantMax"
};

function formatTotalMaxPct(total: number, max: number): string {
	return `${total} / ${max} (${pct(total, max)})`;
}

function VariantComparisonTable({
	unsureAnswerCount,
	totalsByVariant,
	visibleConstructs
}: Readonly<{
	unsureAnswerCount: number;
	totalsByVariant: Readonly<Record<ScoreVariantKey, AuditScoreTotals | null>>;
	visibleConstructs: ConstructSelection;
}>) {
	const t = useTranslations("shared.reportView");
	if (unsureAnswerCount <= 0) {
		return null;
	}
	const rows: ScoreVariantKey[] = ["canonical", "unsure_as_zero", "unsure_as_max"];
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("unsureInterpretations")}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[440px] text-sm">
						<thead className="text-left text-muted-foreground">
							<tr>
								<th className="py-2 pr-4 font-medium">{t("interpretation")}</th>
								{visibleConstructs.playValue ? (
									<th className="py-2 pr-4 font-medium">{t("metricPlayValue")}</th>
								) : null}
								{visibleConstructs.usability ? (
									<th className="py-2 pr-4 font-medium">{t("metricUsability")}</th>
								) : null}
								<th className="py-2 font-medium">{t("summary")}</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(row => {
								const totals = totalsByVariant[row];
								const summaryTotal =
									totals === null
										? 0
										: (visibleConstructs.playValue ? totals.play_value_total : 0) +
											(visibleConstructs.usability ? totals.usability_total : 0);
								const summaryMax =
									totals === null
										? 0
										: (visibleConstructs.playValue ? totals.play_value_total_max : 0) +
											(visibleConstructs.usability ? totals.usability_total_max : 0);
								return (
									<tr key={row} className="border-t border-border/60">
										<td className="py-2 pr-4 font-medium">{t(SCORE_VARIANT_LABEL_KEYS[row])}</td>
										{visibleConstructs.playValue ? (
											<td className="py-2 pr-4 tabular-nums">
												{totals === null
													? "--"
													: formatTotalMaxPct(
															totals.play_value_total,
															totals.play_value_total_max
														)}
											</td>
										) : null}
										{visibleConstructs.usability ? (
											<td className="py-2 pr-4 tabular-nums">
												{totals === null
													? "--"
													: formatTotalMaxPct(
															totals.usability_total,
															totals.usability_total_max
														)}
											</td>
										) : null}
										<td className="py-2 tabular-nums">
											{formatTotalMaxPct(summaryTotal, summaryMax)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<p className="mt-3 text-xs text-muted-foreground">
					{t("unsureCountFound", { count: unsureAnswerCount })}
				</p>
			</CardContent>
		</Card>
	);
}

// ── Bar colors & thresholds ──────────────────────────────────────────────────
// Each bar is colored by its metric identity (not its score). The four PVUA scale
// bars use the shared design-system scale colors; the two headline constructs use a
// balanced teal/gold pair - co-equal peers, distinct from the scales and the brand
// clay. Score tiers are shown as two dotted threshold lines.

const BAR_COLORS: Record<MetricKey, string> = {
	provision: SCALE_ACCENT_COLORS.provision,
	variety: SCALE_ACCENT_COLORS.variety,
	challenge: SCALE_ACCENT_COLORS.challenge,
	// One colour for all four Sociability bars: the three opportunities are equal measures, so a
	// per-dimension palette would read as a ranking.
	sociability: SCALE_ACCENT_COLORS.sociability,
	sociability_play_alone: SCALE_ACCENT_COLORS.sociability,
	sociability_small_group: SCALE_ACCENT_COLORS.sociability,
	sociability_large_group: SCALE_ACCENT_COLORS.sociability,
	play_value: CONSTRUCT_ACCENT_COLORS.playValue,
	usability: CONSTRUCT_ACCENT_COLORS.usability
};

// Percentage cutoffs where the legacy bar color used to change. Now rendered as
// horizontal dotted lines across each bar, labeled at the start of each group.
const BAR_THRESHOLDS = [33.3, 66.6] as const;

// ── Bar group ────────────────────────────────────────────────────────────────

/** One vertical bar track (no labels), centered within its data column. */
function BarTrack({
	metric,
	scores,
	colWidth
}: Readonly<{ metric: MetricDef; scores: AuditScoreTotals | null; colWidth: number }>) {
	const t = useTranslations("shared.reportView");
	const value = scores === null ? 0 : metric.getValue(scores);
	const max = scores === null ? 0 : metric.getMax(scores);
	const isNa = scores === null || max <= 0;
	const percentage = roundedPercentOfMax(value, max);
	const fillRatio = isNa ? 0 : Math.min(1, value / max);
	const fillHeight = Math.round(fillRatio * BAR_TRACK_HEIGHT);
	const barColor = BAR_COLORS[metric.key];

	return (
		<div className="flex justify-center" style={{ width: colWidth }}>
			<div
				className={cn(
					"flex items-end overflow-hidden rounded border",
					isNa ? "border-dashed border-edge/30 bg-muted/30" : "border-edge/40 bg-muted/60"
				)}
				style={{ width: BAR_WIDTH, height: BAR_TRACK_HEIGHT }}
				role="meter"
				aria-valuenow={value}
				aria-valuemin={0}
				aria-valuemax={max}
				aria-label={`${t(metric.labelKey)}: ${isNa ? t("notAssessed") : `${percentage}%`}`}>
				{!isNa && fillHeight > 0 ? (
					<div
						className="w-full rounded-b-sm opacity-90"
						style={{ height: fillHeight, backgroundColor: barColor }}
					/>
				) : isNa ? (
					<div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/50">
						-
					</div>
				) : null}
			</div>
		</div>
	);
}

/**
 * A group of bars rendered as three aligned rows - percentage labels, a fixed-height
 * track row, and metric labels - so each column lines up with the table below. The two
 * threshold cutoffs are drawn as single dotted lines running continuously across the
 * whole track row, with their values labeled once on the left axis.
 */
function BarGroup({
	metrics,
	scores,
	colWidth
}: Readonly<{ metrics: readonly MetricDef[]; scores: AuditScoreTotals | null; colWidth: number }>) {
	const t = useTranslations("shared.reportView");
	return (
		<>
			{/* Percentage labels */}
			<div className="flex">
				<div style={{ width: LABEL_COL_W }} />
				{metrics.map(m => {
					const value = scores === null ? 0 : m.getValue(scores);
					const max = scores === null ? 0 : m.getMax(scores);
					const isNa = scores === null || max <= 0;
					const percentage = roundedPercentOfMax(value, max);
					return (
						<div
							key={m.key}
							className={cn(
								"text-center text-xs font-bold tabular-nums",
								isNa ? "text-muted-foreground" : "text-foreground"
							)}
							style={{ width: colWidth }}>
							{isNa ? t("na") : `${percentage}%`}
						</div>
					);
				})}
			</div>

			{/* Track row + continuous threshold lines */}
			<div className="relative mt-1.5 flex" style={{ height: BAR_TRACK_HEIGHT }}>
				{/* Left axis - threshold values labeled once */}
				<div className="relative" style={{ width: LABEL_COL_W }}>
					{BAR_THRESHOLDS.map(th => (
						<span
							key={th}
							className="absolute right-2 text-[10px] font-medium tabular-nums text-muted-foreground"
							style={{ bottom: (th / 100) * BAR_TRACK_HEIGHT }}>
							{th}%
						</span>
					))}
				</div>
				{metrics.map(m => (
					<BarTrack key={m.key} metric={m} scores={scores} colWidth={colWidth} />
				))}
				{/* Continuous dotted cutoff lines spanning the data columns */}
				{BAR_THRESHOLDS.map(th => (
					<div
						key={th}
						aria-hidden
						className="pointer-events-none absolute border-t border-dashed border-foreground/45"
						style={{ left: LABEL_COL_W, right: 0, bottom: (th / 100) * BAR_TRACK_HEIGHT }}
					/>
				))}
			</div>

			{/* Metric labels */}
			<div className="mt-1.5 flex">
				<div style={{ width: LABEL_COL_W }} />
				{metrics.map(m => (
					<div
						key={m.key}
						className="text-center text-xs leading-tight text-muted-foreground"
						style={{ width: colWidth }}>
						{t(m.labelKey)}
					</div>
				))}
			</div>
		</>
	);
}

// ── Aligned score display (bars + table) ─────────────────────────────────────

/**
 * Score chart in three independent groups: the three scored scales, the three Sociability
 * opportunities, and the two headline constructs.
 *
 * Each group is its own block so the eight measures never collapse into one narrow table. The
 * groups wrap onto separate lines when the viewport is narrow instead of forcing a page-wide
 * horizontal scroll.
 */
function AlignedScoreDisplay({
	scores,
	showLabels = true,
	visibleConstructs = { playValue: true, usability: true }
}: Readonly<{
	scores: AuditScoreTotals | null;
	showLabels?: boolean;
	visibleConstructs?: ConstructSelection;
}>) {
	const t = useTranslations("shared.reportView");
	const capturesDimensions = scores?.sociability_breakdown != null;
	const sociabilityMetrics = capturesDimensions ? SOCIABILITY_DIMENSION_METRICS : SOCIABILITY_TOTAL_METRICS;
	const constructMetrics = CONSTRUCT_METRICS.filter(metric =>
		metric.key === "play_value" ? visibleConstructs.playValue : visibleConstructs.usability
	);

	const scaleTableW = LABEL_COL_W + SCALE_DATA_COL_W * SCALE_METRICS.length;
	// The Sociability group keeps one footprint whether it shows three opportunities or the single
	// legacy aggregate: the column widens instead of the group shrinking, so a 5.31 report has no
	// stranded narrow column and the "not captured" note has full width to wrap in.
	const sociabilityTableW = LABEL_COL_W + SCALE_DATA_COL_W * SOCIABILITY_DIMENSION_METRICS.length;
	const sociabilityDataColW = (sociabilityTableW - LABEL_COL_W) / sociabilityMetrics.length;
	const constructTableW = LABEL_COL_W + CONSTRUCT_DATA_COL_W * constructMetrics.length;

	return (
		<div className="flex flex-wrap items-end gap-x-4 gap-y-6">
			{/* Provision, Variety, Challenge */}
			<div className="max-w-full overflow-x-auto">
				<div style={{ width: scaleTableW }}>
					{showLabels ? <GroupHeading>{t("scaleScores")}</GroupHeading> : null}
					<BarGroup metrics={SCALE_METRICS} scores={scores} colWidth={SCALE_DATA_COL_W} />
					<ScoreSubTable
						metrics={SCALE_METRICS}
						scores={scores}
						dataColW={SCALE_DATA_COL_W}
						tableW={scaleTableW}
					/>
				</div>
			</div>

			{/* Sociability: three equal opportunities, or the legacy aggregate */}
			<div className="max-w-full overflow-x-auto">
				<div style={{ width: sociabilityTableW }}>
					{showLabels ? <GroupHeading>{t("sociabilityScores")}</GroupHeading> : null}
					<BarGroup metrics={sociabilityMetrics} scores={scores} colWidth={sociabilityDataColW} />
					<ScoreSubTable
						metrics={sociabilityMetrics}
						scores={scores}
						dataColW={sociabilityDataColW}
						tableW={sociabilityTableW}
					/>
					{capturesDimensions ? null : (
						<p className="mt-2 text-[11px] leading-4 text-muted-foreground">
							{t("sociabilityBreakdownNotCaptured")}
						</p>
					)}
				</div>
			</div>

			{/* Play Value, Usability */}
			{constructMetrics.length > 0 ? (
				<div className="max-w-full overflow-x-auto">
					<div style={{ width: constructTableW }}>
						{showLabels ? <GroupHeading>{t("playValueUsability")}</GroupHeading> : null}
						<BarGroup metrics={constructMetrics} scores={scores} colWidth={CONSTRUCT_DATA_COL_W} />
						<ScoreSubTable
							metrics={constructMetrics}
							scores={scores}
							dataColW={CONSTRUCT_DATA_COL_W}
							tableW={constructTableW}
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}

function GroupHeading({ children }: Readonly<{ children: React.ReactNode }>) {
	return <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

function ScoreSubTable({
	metrics,
	scores,
	dataColW,
	tableW
}: Readonly<{ metrics: readonly MetricDef[]; scores: AuditScoreTotals | null; dataColW: number; tableW: number }>) {
	const t = useTranslations("shared.reportView");
	const rows: Array<{ rowKey: string; label: string; cells: string[]; alt: boolean }> = [
		{
			rowKey: "scoreAchieved",
			label: t("scoreAchieved"),
			cells: metrics.map(m => (scores === null ? "-" : String(m.getValue(scores)))),
			alt: false
		},
		{
			rowKey: "maxScore",
			label: t("maxScore"),
			cells: metrics.map(m => {
				const max = scores === null ? 0 : m.getMax(scores);
				return max <= 0 ? "-" : String(max);
			}),
			alt: true
		}
	];

	return (
		<div className="overflow-hidden rounded-sm border border-edge/40" style={{ width: tableW }}>
			{/* Header */}
			<div className="flex bg-primary">
				<div className="border-r border-primary-foreground/20 px-3 py-2" style={{ width: LABEL_COL_W }} />
				{metrics.map((m, i) => (
					<div
						key={m.key}
						className={cn(
							"px-3 py-2 text-center text-xs font-bold text-primary-foreground",
							i < metrics.length - 1 && "border-r border-primary-foreground/20"
						)}
						style={{ width: dataColW }}>
						{t(m.labelKey)}
					</div>
				))}
			</div>
			{/* Data rows */}
			{rows.map(row => (
				<div
					key={row.rowKey}
					className={cn("flex border-t border-edge/40", row.alt ? "bg-muted/40" : "bg-card")}>
					<div
						className="border-r border-edge/40 px-3 py-2 text-xs font-bold text-muted-foreground"
						style={{ width: LABEL_COL_W }}>
						{row.label}
					</div>
					{row.cells.map((cell, i) => (
						<div
							key={`${row.rowKey}-${i}`}
							className={cn(
								"px-3 py-2 text-center font-mono text-xs tabular-nums",
								i < row.cells.length - 1 && "border-r border-edge/40"
							)}
							style={{ width: dataColW }}>
							{cell}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

// ── Metadata row ─────────────────────────────────────────────────────────────

function MetadataRow({
	icon: Icon,
	label,
	children
}: Readonly<{ icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }>) {
	return (
		<div className="flex items-start gap-3">
			<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
				<Icon className="size-3.5 text-muted-foreground" />
			</div>
			<div className="min-w-0">
				<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
				<div className="text-sm text-foreground">{children}</div>
			</div>
		</div>
	);
}

function PlayspaceContextCard({
	audit,
	instrument
}: Readonly<{ audit: AuditSession; instrument: PlayspaceInstrument | null }>) {
	const t = useTranslations("shared.reportView");
	const questions = instrument?.pre_audit_questions.filter(question => question.page_key === "space_setup") ?? [];
	const rows = questions.map(question => ({
		key: question.key,
		label: question.label,
		value:
			joinSpaceAuditDisplayValues(
				resolveSpaceAuditDisplayValues(question, readSpaceAuditQuestionValues(audit, question))
			) || t("notProvided")
	}));

	if (rows.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<CloudSunIcon className="size-4 text-primary" />
					{t("playspaceContext")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
					{rows.map(row => (
						<div key={row.key} className="space-y-1">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{row.label}
							</p>
							<p className="text-sm text-foreground">{row.value}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

// ── Stat card ────────────────────────────────────────────────────────────────

function ReportStatCard({
	label,
	value,
	helper,
	accent = "bg-primary"
}: Readonly<{ label: string; value: string; helper?: string; accent?: string }>) {
	return (
		<Card className="relative flex flex-col justify-between gap-3 overflow-hidden border-edge/40 bg-card/95">
			<div className={cn("absolute inset-x-0 top-0 h-1", accent)} aria-hidden="true" />
			<CardHeader className="gap-1 pb-0 pt-5">
				<CardTitle className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1.5 pb-4">
				<div className="font-mono text-xl font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-2xl">
					{value}
				</div>
				{helper !== undefined ? <p className="text-[11px] leading-4 text-muted-foreground">{helper}</p> : null}
			</CardContent>
		</Card>
	);
}

// ── Domain items table (extended view) ───────────────────────────────────────

function DomainItemsTable({
	questions,
	visibleConstructs,
	selection
}: Readonly<{
	questions: DomainQuestionRow[];
	visibleConstructs: ConstructSelection;
	selection: ConstructSelection;
}>) {
	const t = useTranslations("shared.reportView");
	const notApplicableLabel = t("notApplicable");
	const unsureLabel = t("unsure");
	if (questions.length === 0) {
		return <p className="text-xs text-muted-foreground italic">{t("noItemData")}</p>;
	}

	return (
		<div className="overflow-x-auto rounded-md border border-edge/40">
			<table className="w-full min-w-[800px] border-collapse text-xs">
				<thead>
					<tr className="bg-muted/60">
						<th className="w-16 border-b border-r border-edge/40 px-3 py-2 text-left font-bold text-muted-foreground">
							{t("itemId")}
						</th>
						<th className="border-b border-r border-edge/40 px-3 py-2 text-left font-bold text-muted-foreground">
							{t("itemLabel")}
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							{t("metricProvision")}
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							{t("metricVariety")}
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							{t("metricChallenge")}
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							{t("metricSociability")}
						</th>
						{visibleConstructs.playValue ? (
							<th
								className={cn(
									"w-20 border-b border-edge/40 px-3 py-2 text-center font-bold text-primary",
									visibleConstructs.usability && "border-r"
								)}>
								{t("metricPvShort")}
							</th>
						) : null}
						{visibleConstructs.usability ? (
							<th className="w-20 border-b border-edge/40 px-3 py-2 text-center font-bold text-primary">
								{t("metricUShort")}
							</th>
						) : null}
					</tr>
				</thead>
				<tbody>
					{questions.map((q, idx) => {
						const idParts = q.questionKey.match(/\d+/g);
						const formattedId = idParts !== null ? idParts.join(".") : String(idx + 1);

						return (
							<tr key={q.rowKey} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
								<td className="border-r border-edge/40 px-3 py-2 font-mono tabular-nums text-muted-foreground">
									{formattedId}
								</td>
								<td
									className="border-r border-edge/40 px-3 py-2 text-foreground"
									style={{ maxWidth: 360 }}>
									{q.sourceLabel !== null ? (
										<div className="mb-1.5">
											<Badge variant="outline" className="text-[10px]">
												{q.sourceLabel}
											</Badge>
										</div>
									) : null}
									<span className="line-clamp-2">
										{parsePromptSegments(q.questionText).map((segment, index) => (
											<React.Fragment key={`${q.questionKey}-seg-${index.toString()}`}>
												<span className={segment.bold ? "font-semibold" : undefined}>
													{segment.text}
												</span>
											</React.Fragment>
										))}
									</span>
									{q.checklistAnswerLabel !== null ? (
										<p className="mt-1.5 rounded-sm border border-edge/40 bg-muted/40 px-2 py-1 text-[11px] leading-4 text-muted-foreground">
											<span className="font-semibold text-foreground">{t("selectedAnswer")}</span>
											{q.checklistAnswerLabel}
										</p>
									) : null}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{renderScaleCellState({
										label: q.provisionLabel,
										applicable: q.provisionApplicable,
										isNotApplicable: q.provisionIsNotApplicable,
										isUnsure: q.provisionIsUnsure,
										notApplicableLabel,
										unsureLabel
									})}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{renderScaleCellState({
										label: q.varietyLabel,
										applicable: q.varietyApplicable,
										isNotApplicable: q.varietyIsNotApplicable,
										isUnsure: q.varietyIsUnsure,
										followUpScalesAsked: q.followUpScalesAsked,
										notApplicableLabel,
										unsureLabel
									})}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{renderScaleCellState({
										label: q.challengeLabel,
										applicable: q.challengeApplicable,
										isNotApplicable: q.challengeIsNotApplicable,
										isUnsure: q.challengeIsUnsure,
										followUpScalesAsked: q.followUpScalesAsked,
										notApplicableLabel,
										unsureLabel
									})}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{q.sociabilityLabels !== null ? (
										<SociabilitySelectionCell labels={q.sociabilityLabels} />
									) : (
										renderScaleCellState({
											label: q.sociabilityLabel,
											applicable: q.sociabilityApplicable,
											isNotApplicable: q.sociabilityIsNotApplicable,
											isUnsure: q.sociabilityIsUnsure,
											followUpScalesAsked: q.followUpScalesAsked,
											notApplicableLabel,
											unsureLabel
										})
									)}
								</td>
								{visibleConstructs.playValue ? (
									<td
										className={cn(
											"px-3 py-2 text-center font-mono tabular-nums",
											visibleConstructs.usability && "border-r border-edge/40"
										)}>
										{selection.playValue
											? q.playValueScore !== null && q.playValueMax !== null
												? `${q.playValueScore}/${q.playValueMax}`
												: "-"
											: ""}
									</td>
								) : null}
								{visibleConstructs.usability ? (
									<td className="px-3 py-2 text-center font-mono tabular-nums">
										{selection.usability
											? q.usabilityScore !== null && q.usabilityMax !== null
												? `${q.usabilityScore}/${q.usabilityMax}`
												: "-"
											: ""}
									</td>
								) : null}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

/**
 * List the play opportunities an auditor selected for one item.
 *
 * Selections are stacked, unnumbered, and identically styled - the auditor may pick any combination
 * and no combination outranks another.
 */
function SociabilitySelectionCell({ labels }: Readonly<{ labels: readonly string[] }>) {
	const t = useTranslations("shared.reportView");

	if (labels.length === 0) {
		return <span className="text-muted-foreground">{t("sociabilityNoneSelected")}</span>;
	}

	return (
		<ul className="space-y-0.5 text-left">
			{labels.map(label => (
				<li key={label} className="text-[11px] leading-4 text-foreground">
					{label}
				</li>
			))}
		</ul>
	);
}

// ── Best/Worst table ─────────────────────────────────────────────────────────

type ConstructKey = "provision" | "variety" | "challenge" | "sociability" | "play_value" | "usability";

/** Translation key suffix (under `shared.reportView`) per construct. */
const CONSTRUCT_LABEL_KEYS: Record<ConstructKey, string> = {
	provision: "constructProvision",
	variety: "constructVariety",
	challenge: "constructChallengeOpportunities",
	sociability: "constructSociabilitySupport",
	play_value: "constructPlayValue",
	usability: "constructUsability"
};

const CONSTRUCT_GRID: readonly (readonly [ConstructKey, ConstructKey, ConstructKey])[] = [
	["provision", "variety", "challenge"],
	["sociability", "play_value", "usability"]
];

const CONSTRUCT_HEADER_CLASS_NAMES: Record<ConstructKey, string> = {
	provision: "bg-scale-provision text-solid-primary-text",
	variety: "bg-scale-variety text-solid-primary-text",
	challenge: "bg-scale-challenge text-solid-primary-text",
	sociability: "bg-scale-sociability text-solid-primary-text",
	play_value: "bg-status-warning text-primary-foreground",
	usability: "bg-primary text-primary-foreground"
};

/** Translation key suffix (under `shared.reportView`) per Sociability opportunity. */
const SOCIABILITY_DIMENSION_LABEL_KEYS: Record<SociabilityDimensionKey, string> = {
	play_alone: "metricSociabilityPlayAlone",
	small_group: "metricSociabilitySmallGroup",
	large_group: "metricSociabilityLargeGroup"
};

/**
 * Highest and lowest domains for each Sociability opportunity, side by side.
 *
 * Each opportunity gets its own card with its own examples - the three are separate measures, so a
 * single "best Sociability domain" would hide which opportunity a place actually supports.
 */
function SociabilityBestWorstSection({ rankings }: Readonly<{ rankings: readonly SociabilityDimensionRanking[] }>) {
	const t = useTranslations("shared.reportView");

	if (rankings.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("sociabilityHighestLowest")}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{rankings.map(ranking => (
						<div
							key={ranking.dimensionKey}
							className="flex flex-col overflow-hidden rounded-lg border border-edge/40">
							<div className="bg-scale-sociability px-3 py-2 text-solid-primary-text">
								<p className="text-center text-xs font-bold">
									{t(SOCIABILITY_DIMENSION_LABEL_KEYS[ranking.dimensionKey])}
								</p>
							</div>
							{!ranking.hasSufficientData ? (
								<div className="flex-1 px-3 py-4">
									<p className="text-xs leading-5 text-muted-foreground">
										{ranking.comparableDomainCount === 0
											? t("sociabilityRankingNoData")
											: t("sociabilityRankingSingleDomain", {
													domain: ranking.bestDomains[0]?.domainTitle ?? ""
												})}
									</p>
								</div>
							) : ranking.allTied ? (
								<div className="flex-1 px-3 py-4">
									<p className="mb-1.5 text-xs font-bold text-muted-foreground">
										{t("sociabilityRankingAllTiedTitle")}
									</p>
									<RankedDomainList domains={ranking.bestDomains} />
								</div>
							) : (
								<>
									<div className="border-b border-edge/40 bg-status-success-surface px-3 py-2.5">
										<div className="mb-1 flex items-center gap-1.5">
											<div className="size-2 rounded-full bg-status-success" aria-hidden />
											<span className="text-xs font-bold text-muted-foreground">
												{t("highestScored")}
											</span>
										</div>
										<RankedDomainList domains={ranking.bestDomains} />
									</div>
									<div className="flex-1 bg-status-danger-surface px-3 py-2.5">
										<div className="mb-1 flex items-center gap-1.5">
											<div className="size-2 rounded-full bg-status-danger" aria-hidden />
											<span className="text-xs font-bold text-muted-foreground">
												{t("lowestScored")}
											</span>
										</div>
										<RankedDomainList domains={ranking.worstDomains} />
									</div>
								</>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

/** Every domain tied at one rank, each with its raw score and percentage. */
function RankedDomainList({ domains }: Readonly<{ domains: readonly RankedDomain[] }>) {
	const t = useTranslations("shared.reportView");

	if (domains.length === 0) {
		return <p className="text-sm text-muted-foreground">-</p>;
	}

	return (
		<ul className="space-y-1.5">
			{domains.map(domain => (
				<li key={domain.domainTitle}>
					<p className="text-sm leading-5 text-foreground">{domain.domainTitle}</p>
					<p className="text-xs tabular-nums text-muted-foreground">
						{formatConstructDomainLine(domain.score, domain.max)}
						{" · "}
						{domain.percent}%
					</p>
				</li>
			))}
			{domains.length > 1 ? (
				<li className="text-[11px] italic leading-4 text-muted-foreground">
					{t("rankingTiedCount", { count: domains.length })}
				</li>
			) : null}
		</ul>
	);
}

function BestWorstSection({
	rankings,
	visibleConstructs
}: Readonly<{ rankings: ConstructRanking[]; visibleConstructs: ConstructSelection }>) {
	const t = useTranslations("shared.reportView");
	const rankingByKey = new Map(rankings.map(r => [r.constructKey, r] as const));
	const visibleGrid = CONSTRUCT_GRID.map(row =>
		row.filter(key =>
			key === "play_value"
				? visibleConstructs.playValue
				: key === "usability"
					? visibleConstructs.usability
					: true
		)
	).filter(row => row.length > 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("highestLowestDomains")}</CardTitle>
			</CardHeader>
			<CardContent>
				{rankings.length === 0 ? (
					<p className="text-sm text-muted-foreground">{t("notEnoughDomainData")}</p>
				) : (
					<div className="space-y-3">
						{visibleGrid.map((row, rowIdx) => (
							<div key={`bw-row-${rowIdx}`} className="grid gap-3 sm:grid-cols-3">
								{row.map(key => {
									const ranking = rankingByKey.get(key);
									return (
										<div key={key} className="overflow-hidden rounded-lg border border-edge/40">
											<div className={cn("px-3 py-2", CONSTRUCT_HEADER_CLASS_NAMES[key])}>
												<p className="text-center text-xs font-bold">{t(CONSTRUCT_LABEL_KEYS[key])}</p>
											</div>
											<div className="border-b border-edge/40 bg-status-success-surface px-3 py-2.5">
												<div className="mb-1 flex items-center gap-1.5">
													<div className="size-2 rounded-full bg-status-success" />
													<span className="text-xs font-bold text-muted-foreground">
														{t("highestScored")}
													</span>
												</div>
												{ranking?.bestDomain !== null && ranking?.bestDomain !== undefined ? (
													<>
														<p className="text-sm text-foreground">
															{ranking.bestDomain.domainTitle}
														</p>
														<p className="text-xs text-muted-foreground">
															{formatConstructDomainLine(
																ranking.bestDomain.score,
																ranking.bestDomain.max
															)}
															{" · "}
															{pct(ranking.bestDomain.score, ranking.bestDomain.max)}
														</p>
													</>
												) : (
													<p className="text-sm text-muted-foreground">-</p>
												)}
											</div>
											<div className="bg-status-danger-surface px-3 py-2.5">
												<div className="mb-1 flex items-center gap-1.5">
													<div className="size-2 rounded-full bg-status-danger" />
													<span className="text-xs font-bold text-muted-foreground">
														{t("lowestScored")}
													</span>
												</div>
												{ranking?.worstDomain !== null && ranking?.worstDomain !== undefined ? (
													<>
														<p className="text-sm text-foreground">
															{ranking.worstDomain.domainTitle}
														</p>
														<p className="text-xs text-muted-foreground">
															{formatConstructDomainLine(
																ranking.worstDomain.score,
																ranking.worstDomain.max
															)}
															{" · "}
															{pct(ranking.worstDomain.score, ranking.worstDomain.max)}
														</p>
													</>
												) : (
													<p className="text-sm text-muted-foreground">-</p>
												)}
											</div>
										</div>
									);
								})}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ── Main component ───────────────────────────────────────────────────────────

export interface AuditReportViewProps {
	readonly audit: AuditSession;
	readonly instrument?: PlayspaceInstrument | null;
	/** Role-scoped base path (e.g. "/admin", "/manager") for cross-navigation links. */
	readonly basePath?: string | undefined;
	/**
	 * Report key from `buildReportIdentity`, naming where this report's construct
	 * filter is stored. Omit to render without filter controls.
	 */
	readonly reportIdentity?: string | undefined;
	/** Signed-in reader's email, used to namespace stored filter selections. */
	readonly userEmail?: string | null | undefined;
}

/**
 * Full formatted audit report view with aligned score bars, domain breakdown,
 * item-level toggle, overall scores, best/worst table, and export.
 */
export function AuditReportView({
	audit,
	instrument = null,
	basePath,
	reportIdentity,
	userEmail
}: Readonly<AuditReportViewProps>) {
	const t = useTranslations("shared.reportView");
	const [selectedVariant, setSelectedVariant] = React.useState<ScoreVariantKey>("canonical");
	const displayAudit = React.useMemo<AuditSession>(() => {
		const selectedScores = getScoreVariantBuckets(audit.scores, selectedVariant);
		return {
			...audit,
			scores: {
				...audit.scores,
				execution_mode: selectedScores.execution_mode,
				audit: selectedScores.audit,
				survey: selectedScores.survey,
				overall: selectedScores.overall,
				by_section: selectedScores.by_section,
				by_domain: selectedScores.by_domain
			}
		};
	}, [audit, selectedVariant]);
	const knownDomainKeys = React.useMemo(
		() =>
			instrument === null
				? Object.keys(audit.scores.by_domain).map(normalizeDomainKey)
				: getReportKnownDomainKeys(audit, instrument),
		[audit, instrument]
	);
	const reportFilter = useReportFilter(reportIdentity ?? "", userEmail, knownDomainKeys);
	const filteringEnabled = reportIdentity !== undefined && instrument !== null;
	const activeFilter = filteringEnabled ? reportFilter.filter : createDefaultReportFilter();

	const domainConstructCoverage = React.useMemo(() => {
		if (instrument === null) return {};
		return getReportDomainConstructCoverage(audit, instrument);
	}, [audit, instrument]);

	const projection = React.useMemo(
		() =>
			instrument === null ? null : buildReportScoreProjection(audit, instrument, activeFilter, selectedVariant),
		[audit, instrument, activeFilter, selectedVariant]
	);
	const domainRows = React.useMemo(() => projection?.domainRows ?? [], [projection]);
	const isFiltered = projection?.isFiltered ?? false;
	const visibleConstructs = projection?.visibleConstructs ?? {
		playValue: true,
		usability: true
	};
	const includedUnsureAnswerCount = projection?.unsureAnswerCount ?? audit.scores.unsure_answer_count;

	const overall = projection === null ? getEffectiveScoreTotals(displayAudit.scores) : projection.overall;
	const overallPvPct = overall !== null ? pct(overall.play_value_total, overall.play_value_total_max) : "-";
	const overallUPct = overall !== null ? pct(overall.usability_total, overall.usability_total_max) : "-";
	const overallSocPct = overall !== null ? pct(overall.sociability_total, overall.sociability_total_max) : "-";
	const overallCombined =
		overall === null
			? t("pending")
			: [
					...(visibleConstructs.playValue ? [`PV ${overallPvPct}`] : []),
					...(visibleConstructs.usability ? [`U ${overallUPct}`] : [])
				].join(" · ");
	const overallMaxHelper =
		overall === null
			? undefined
			: visibleConstructs.playValue && visibleConstructs.usability
				? t("maxPvU", {
						pv: overall.play_value_total_max,
						u: overall.usability_total_max
					})
				: t("maxScoreEq", {
						value: visibleConstructs.playValue ? overall.play_value_total_max : overall.usability_total_max
					});
	const totalsByVariant = React.useMemo<Record<ScoreVariantKey, AuditScoreTotals | null>>(
		() => ({
			canonical:
				instrument === null
					? getEffectiveScoreTotals(audit.scores, "canonical")
					: buildReportScoreProjection(audit, instrument, activeFilter, "canonical").overall,
			unsure_as_zero:
				instrument === null
					? getEffectiveScoreTotals(audit.scores, "unsure_as_zero")
					: buildReportScoreProjection(audit, instrument, activeFilter, "unsure_as_zero").overall,
			unsure_as_max:
				instrument === null
					? getEffectiveScoreTotals(audit.scores, "unsure_as_max")
					: buildReportScoreProjection(audit, instrument, activeFilter, "unsure_as_max").overall
		}),
		[audit, instrument, activeFilter]
	);

	const rankings = React.useMemo(() => {
		if (domainRows.length < 2) return [];
		return buildConstructRankings(domainRows);
	}, [domainRows]);

	// Only instruments that captured the three opportunities can be ranked per opportunity.
	const sociabilityRankings = React.useMemo(() => {
		if (overall?.sociability_breakdown == null) return [];
		return buildSociabilityDimensionRankings(domainRows);
	}, [domainRows, overall]);

	const sociabilityCoverage = getSociabilityCoverage(overall);

	const domainKeys = Object.keys(displayAudit.scores.by_domain);
	const hasDomains = domainKeys.length > 0;
	const hasInstrumentDomains = domainRows.length > 0;

	const allDomainAccordionKeys = React.useMemo(() => {
		if (hasInstrumentDomains) return domainRows.map(r => r.domainKey);
		return domainKeys;
	}, [hasInstrumentDomains, domainRows, domainKeys]);

	const [openDomains, setOpenDomains] = React.useState<string[]>([]);
	const [itemToggles, setItemToggles] = React.useState<Record<string, boolean>>({});

	// Plain handlers - the React Compiler memoizes these automatically, so manual
	// useCallback wrappers would only fight the compiler's dependency inference.
	const expandAll = () => {
		setOpenDomains([...allDomainAccordionKeys]);
	};

	const collapseAll = () => {
		setOpenDomains([]);
		setItemToggles({});
	};

	const toggleItems = (domainKey: string) => {
		setItemToggles(prev => ({ ...prev, [domainKey]: prev[domainKey] !== true }));
	};

	return (
		<div className="space-y-6">
			{/* ── 1. Audit metadata ────────────────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<ActivityIcon className="size-4 text-primary" />
							{t("auditDetails")}
							<Badge
								variant={audit.status === "SUBMITTED" ? "default" : "secondary"}
								className="uppercase">
								{audit.status}
							</Badge>
						</CardTitle>
						{basePath !== undefined && (
							<a href={`${basePath}/audits/${audit.audit_id}`}>
								<Button variant="outline" size="sm" className="gap-1.5 text-xs">
									<ClipboardListIcon className="size-3.5" />
									{t("viewAuditDetails")}
								</Button>
							</a>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<MetadataRow icon={HashIcon} label={t("auditCode")}>
							<div className="space-y-1.5">
								<p className="font-medium text-foreground">
									{formatAuditCodeReference(audit.audit_code)}
								</p>
								<div className="overflow-x-auto no-scrollbar">
									<code className="inline-block min-w-max whitespace-nowrap rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
										{audit.audit_code}
									</code>
								</div>
							</div>
						</MetadataRow>
						<MetadataRow icon={UserIcon} label={t("auditor")}>
							<code className="inline-flex break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
								{audit.auditor_code}
							</code>
						</MetadataRow>
						<MetadataRow icon={MapPinIcon} label={t("place")}>
							{audit.place_name}
						</MetadataRow>
						<MetadataRow icon={LayersIcon} label={t("auditType")}>
							<Badge variant="outline" className="text-xs font-medium">
								{getExecutionModeLabel(audit.scores.execution_mode)}
							</Badge>
						</MetadataRow>
						<MetadataRow icon={CalendarIcon} label={t("started")}>
							{formatDateTime(audit.started_at)}
						</MetadataRow>
						<MetadataRow icon={CalendarIcon} label={t("submitted")}>
							{audit.submitted_at !== null ? (
								formatDateTime(audit.submitted_at)
							) : (
								<span className="italic text-muted-foreground">{t("notYetSubmitted")}</span>
							)}
						</MetadataRow>
						<MetadataRow icon={ClipboardListIcon} label={t("progress")}>
							<span className="font-mono tabular-nums">
								{audit.progress.answered_visible_questions} / {audit.progress.total_visible_questions}
							</span>{" "}
							{t("questions")}
						</MetadataRow>
					</div>
				</CardContent>
			</Card>

			<PlayspaceContextCard audit={audit} instrument={instrument} />

			{filteringEnabled ? (
				<>
					<ReportFilterBanner filter={activeFilter} onShowFullReport={reportFilter.showFullReport} />
					<ReportFilterControls
						filter={activeFilter}
						onOverallChange={reportFilter.setOverall}
						onApplyToAllDomains={reportFilter.applyToAllDomains}
						onReset={reportFilter.reset}
					/>
				</>
			) : null}

			{hasUnsureVariants(audit.scores) && includedUnsureAnswerCount > 0 ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("scoreInterpretation")}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{(["canonical", "unsure_as_zero", "unsure_as_max"] as const).map(variant => (
								<Button
									key={variant}
									type="button"
									size="sm"
									variant={selectedVariant === variant ? "default" : "outline"}
									onClick={() => setSelectedVariant(variant)}>
									{t(SCORE_VARIANT_LABEL_KEYS[variant])}
								</Button>
							))}
						</div>
						<p className="mt-3 text-sm text-muted-foreground">{t("interpretationHelp")}</p>
					</CardContent>
				</Card>
			) : null}

			<VariantComparisonTable
				unsureAnswerCount={includedUnsureAnswerCount}
				totalsByVariant={totalsByVariant}
				visibleConstructs={visibleConstructs}
			/>

			{/* ── 2. Score summary ─────────────────────────────────── */}
			<div className="space-y-3">
				<h2 className="text-base font-bold text-foreground">{t("scoreSummary")}</h2>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<ReportStatCard
						label={t("overallScore")}
						value={overallCombined}
						helper={overallMaxHelper}
						accent="bg-accent-terracotta"
					/>
					{visibleConstructs.playValue ? (
						<ReportStatCard
							label={t("metricPlayValue")}
							value={overall !== null ? `${overall.play_value_total} (${overallPvPct})` : "-"}
							helper={
								overall !== null ? t("maxScoreEq", { value: overall.play_value_total_max }) : undefined
							}
							accent="bg-status-warning"
						/>
					) : null}
					{visibleConstructs.usability ? (
						<ReportStatCard
							label={t("metricUsability")}
							value={overall !== null ? `${overall.usability_total} (${overallUPct})` : "-"}
							helper={
								overall !== null ? t("maxScoreEq", { value: overall.usability_total_max }) : undefined
							}
							accent="bg-primary"
						/>
					) : null}
					<ReportStatCard
						label={t("metricSociability")}
						value={overall !== null ? `${overall.sociability_total} (${overallSocPct})` : "-"}
						helper={
							overall !== null ? t("maxScoreEq", { value: overall.sociability_total_max }) : undefined
						}
						accent="bg-status-success"
					/>
				</div>
			</div>

			{/* ── 4. Domain breakdown ─────────────────────────────── */}
			{hasDomains ? (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<CardTitle className="text-base">{t("domainBreakdown")}</CardTitle>
							<div className="flex gap-1.5">
								<Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={expandAll}>
									<ChevronsUpDownIcon className="size-3.5" />
									{t("expandAll")}
								</Button>
								<Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={collapseAll}>
									<ChevronsDownUpIcon className="size-3.5" />
									{t("collapseAll")}
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<Accordion
							type="multiple"
							value={openDomains}
							onValueChange={setOpenDomains}
							className="w-full">
							{hasInstrumentDomains
								? domainRows.map(row => (
										<DomainAccordionItem
											key={row.domainKey}
											domainKey={row.domainKey}
											title={row.domainTitle}
											scores={row.scoreTotals}
											notes={row.sectionNotes}
											questions={row.questions}
											selection={resolveDomainConstructSelection(activeFilter, row.domainKey)}
											visibleConstructs={visibleConstructs}
											showItems={itemToggles[row.domainKey] === true}
											onToggleItems={() => toggleItems(row.domainKey)}
											filterControls={
												filteringEnabled ? (
													<DomainFilterControls
														domainKey={row.domainKey}
														domainTitle={row.domainTitle}
														selection={resolveDomainConstructSelection(
															activeFilter,
															row.domainKey
														)}
														coverage={domainConstructCoverage[row.domainKey]}
														hasOverride={row.domainKey in activeFilter.domainOverrides}
														onChange={selection =>
															reportFilter.setDomain(row.domainKey, selection)
														}
														onUseReportSetting={() =>
															reportFilter.clearDomain(row.domainKey)
														}
													/>
												) : null
											}
											emptyNotice={
												filteringEnabled && row.itemCount === 0 ? (
													<DomainEmptyNotice
														selection={resolveDomainConstructSelection(
															activeFilter,
															row.domainKey
														)}
													/>
												) : null
											}
											scopeNote={
												filteringEnabled ? (
													<FilteredScopeNote
														selection={resolveDomainConstructSelection(
															activeFilter,
															row.domainKey
														)}
													/>
												) : null
											}
										/>
									))
								: domainKeys.map(domainKey => (
										<DomainAccordionItem
											key={domainKey}
											domainKey={domainKey}
											title={toDomainTitle(domainKey)}
											scores={displayAudit.scores.by_domain[domainKey] ?? null}
											notes={[]}
											questions={[]}
											selection={{ playValue: true, usability: true }}
											visibleConstructs={{ playValue: true, usability: true }}
											showItems={false}
											onToggleItems={() => undefined}
										/>
									))}
						</Accordion>
					</CardContent>
				</Card>
			) : null}

			{/* ── 5. Overall scores ───────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("overallScores")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<AlignedScoreDisplay scores={overall} visibleConstructs={visibleConstructs} />
					{sociabilityCoverage !== null ? (
						<p className="text-xs text-muted-foreground">
							{t("sociabilityCoverage", {
								captured: sociabilityCoverage.captured,
								eligible: sociabilityCoverage.eligible
							})}
						</p>
					) : null}
				</CardContent>
			</Card>

			{/* ── 6. Best & Worst ─────────────────────────────────── */}
			{rankings.length > 0 ? (
				<BestWorstSection rankings={rankings} visibleConstructs={visibleConstructs} />
			) : null}
			<SociabilityBestWorstSection rankings={sociabilityRankings} />

			{/* ── 7. Raw JSON toggle ──────────────────────────────── */}
			{/* Hidden while filtered: this panel shows the unfiltered backend scores,
			    which would contradict every figure above it. */}
			{isFiltered ? null : <JsonViewer data={audit.scores} title="audit-scores.json" defaultOpen={true} />}
		</div>
	);
}

// ── Domain accordion item ────────────────────────────────────────────────────

function DomainAccordionItem({
	domainKey,
	title,
	scores,
	notes,
	questions,
	selection,
	visibleConstructs,
	showItems,
	onToggleItems,
	filterControls = null,
	emptyNotice = null,
	scopeNote = null
}: Readonly<{
	domainKey: string;
	title: string;
	scores: AuditScoreTotals | null;
	notes: string[];
	questions: DomainQuestionRow[];
	selection: ConstructSelection;
	visibleConstructs: ConstructSelection;
	showItems: boolean;
	onToggleItems: () => void;
	/** Construct toggles for this domain, or null when filtering is unavailable. */
	filterControls?: React.ReactNode;
	/** Shown when a filter has removed every question in this domain. */
	emptyNotice?: React.ReactNode;
	/** Scope label for shared-scale totals under a single-construct filter. */
	scopeNote?: React.ReactNode;
}>) {
	const t = useTranslations("shared.reportView");
	const scoreLabel =
		scores === null
			? t("pending")
			: [
					...(selection.playValue ? [`PV ${pct(scores.play_value_total, scores.play_value_total_max)}`] : []),
					...(selection.usability ? [`U ${pct(scores.usability_total, scores.usability_total_max)}`] : [])
				].join(" · ");
	return (
		<AccordionItem value={domainKey}>
			<AccordionTrigger className="text-sm">
				<div className="flex flex-1 items-center justify-between gap-3 pr-2">
					<span className="text-left font-bold text-foreground">{title}</span>
					<span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono tabular-nums text-primary">
						{scoreLabel}
					</span>
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-4 pt-1">
					{filterControls}
					{emptyNotice}

					<AlignedScoreDisplay scores={scores} showLabels={false} visibleConstructs={selection} />
					{scores !== null ? scopeNote : null}

					{notes.length > 0 ? (
						<div className="space-y-1.5 rounded-md bg-muted/40 px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								{t("auditorNotes")}
							</p>
							{notes.map((note, idx) => (
								<p key={`note-${idx}`} className="text-xs text-foreground">
									{note}
								</p>
							))}
						</div>
					) : null}

					{questions.length > 0 ? (
						<div className="space-y-2">
							<Button
								variant="ghost"
								size="sm"
								className="gap-1.5 text-xs text-muted-foreground"
								onClick={onToggleItems}>
								<ListIcon className="size-3.5" />
								{showItems ? t("hideItems") : t("showItems", { count: questions.length })}
								{showItems ? (
									<ChevronUpIcon className="size-3" />
								) : (
									<ChevronDownIcon className="size-3" />
								)}
							</Button>
							{showItems ? (
								<DomainItemsTable
									questions={questions}
									visibleConstructs={visibleConstructs}
									selection={selection}
								/>
							) : null}
						</div>
					) : null}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
