"use client";

import * as React from "react";
import {
	CalendarIcon,
	UserIcon,
	MapPinIcon,
	ClipboardListIcon,
	HashIcon,
	ActivityIcon,
	LayersIcon,
	ChevronsUpDownIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	ListIcon,
	ChevronsDownUpIcon
} from "lucide-react";

import { JsonViewer } from "./raw-json";

import type { AuditScoreTotals, PlayspaceInstrument } from "@/types/audit";
import type { AuditSession } from "@/lib/api/playspace";
import { getEffectiveScoreTotals, getExecutionModeLabel } from "@/lib/audit/score-mode-helpers";
import type { DomainQuestionRow, ConstructRanking } from "@/lib/audit/report-helpers";
import {
	buildDomainReportRows,
	buildConstructRankings,
	toDomainTitle,
	formatConstructDomainLine,
	roundedPercentOfMax
} from "@/lib/audit/report-helpers";
import { SCALE_ACCENT_COLORS } from "@/lib/export/audit/types";
import { parsePromptSegments } from "@/lib/audit/prompt-segments";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatAuditCodeReference } from "@/components/dashboard/utils";

// ── Layout constants ─────────────────────────────────────────────────────────
// Fixed column widths shared between bar cells and table cells for alignment.

const LABEL_COL_W = 140;
const SCALE_DATA_COL_W = 90;
const CONSTRUCT_DATA_COL_W = 120;
const BAR_TRACK_HEIGHT = 164;
const BAR_WIDTH = 44;

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number, max: number): string {
	if (max <= 0) return "N/A";
	return `${Math.round((value / max) * 100)}%`;
}

function renderScaleCellState(options: {
	label: string | null;
	applicable: boolean;
	isNotApplicable: boolean;
	followUpScalesAsked?: boolean;
}): React.ReactNode {
	const { label, applicable, isNotApplicable, followUpScalesAsked = true } = options;
	if (!applicable || !followUpScalesAsked) {
		return <span className="text-muted-foreground/50">—</span>;
	}
	if (isNotApplicable) {
		return <span className="text-foreground">Not applicable</span>;
	}
	return label ?? <span className="text-muted-foreground/50">—</span>;
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

type MetricKey = "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";

interface MetricDef {
	readonly key: MetricKey;
	readonly label: string;
	readonly shortLabel: string;
	readonly getValue: (t: AuditScoreTotals) => number;
	readonly getMax: (t: AuditScoreTotals) => number;
}

const SCALE_METRICS: readonly MetricDef[] = [
	{
		key: "provision",
		label: "Provision",
		shortLabel: "Provision",
		getValue: t => t.provision_total,
		getMax: t => t.provision_total_max
	},
	{
		key: "diversity",
		label: "Diversity",
		shortLabel: "Diversity",
		getValue: t => t.diversity_total,
		getMax: t => t.diversity_total_max
	},
	{
		key: "challenge",
		label: "Challenge",
		shortLabel: "Challenge",
		getValue: t => t.challenge_total,
		getMax: t => t.challenge_total_max
	},
	{
		key: "sociability",
		label: "Sociability",
		shortLabel: "Sociability",
		getValue: t => t.sociability_total,
		getMax: t => t.sociability_total_max
	}
];

const CONSTRUCT_METRICS: readonly MetricDef[] = [
	{
		key: "play_value",
		label: "Play Value",
		shortLabel: "PV",
		getValue: t => t.play_value_total,
		getMax: t => t.play_value_total_max
	},
	{
		key: "usability",
		label: "Usability",
		shortLabel: "U",
		getValue: t => t.usability_total,
		getMax: t => t.usability_total_max
	}
];

// ── Bar colors & thresholds ──────────────────────────────────────────────────
// Each bar is colored by its metric identity (not its score). The four PVUA scale
// bars use the shared design-system scale colors; the two headline constructs use a
// balanced teal/gold pair — co-equal peers, distinct from the scales and the brand
// clay. Score tiers are shown as two dotted threshold lines.

const BAR_COLORS: Record<MetricKey, string> = {
	provision: SCALE_ACCENT_COLORS.provision,
	diversity: SCALE_ACCENT_COLORS.diversity,
	challenge: SCALE_ACCENT_COLORS.challenge,
	sociability: SCALE_ACCENT_COLORS.sociability,
	play_value: "#2E7D78",
	usability: "#C7972F"
};

// Percentage cutoffs where the legacy bar color used to change. Now rendered as
// horizontal dotted lines across each bar, labeled at the start of each group.
const BAR_THRESHOLDS = [40, 70] as const;

// ── Bar group ────────────────────────────────────────────────────────────────

/** One vertical bar track (no labels), centered within its data column. */
function BarTrack({
	metric,
	scores,
	colWidth
}: Readonly<{ metric: MetricDef; scores: AuditScoreTotals | null; colWidth: number }>) {
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
				aria-label={`${metric.label}: ${isNa ? "not assessed" : `${percentage}%`}`}>
				{!isNa && fillHeight > 0 ? (
					<div
						className="w-full rounded-b-sm opacity-90"
						style={{ height: fillHeight, backgroundColor: barColor }}
					/>
				) : isNa ? (
					<div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/50">
						—
					</div>
				) : null}
			</div>
		</div>
	);
}

/**
 * A group of bars rendered as three aligned rows — percentage labels, a fixed-height
 * track row, and metric labels — so each column lines up with the table below. The two
 * threshold cutoffs are drawn as single dotted lines running continuously across the
 * whole track row, with their values labeled once on the left axis.
 */
function BarGroup({
	metrics,
	scores,
	colWidth
}: Readonly<{ metrics: readonly MetricDef[]; scores: AuditScoreTotals | null; colWidth: number }>) {
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
							{isNa ? "N/A" : `${percentage}%`}
						</div>
					);
				})}
			</div>

			{/* Track row + continuous threshold lines */}
			<div className="relative mt-1.5 flex" style={{ height: BAR_TRACK_HEIGHT }}>
				{/* Left axis — threshold values labeled once */}
				<div className="relative" style={{ width: LABEL_COL_W }}>
					{BAR_THRESHOLDS.map(th => (
						<span
							key={th}
							className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground"
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
						{m.shortLabel}
					</div>
				))}
			</div>
		</>
	);
}

// ── Aligned score display (bars + table) ─────────────────────────────────────

function AlignedScoreDisplay({
	scores,
	showLabels = true
}: Readonly<{ scores: AuditScoreTotals | null; showLabels?: boolean }>) {
	const scaleTableW = LABEL_COL_W + SCALE_DATA_COL_W * SCALE_METRICS.length;
	const constructTableW = LABEL_COL_W + CONSTRUCT_DATA_COL_W * CONSTRUCT_METRICS.length;

	return (
		<div className="overflow-x-auto">
			<div className="flex items-end gap-4" style={{ minWidth: scaleTableW + constructTableW + 16 }}>
				{/* Scale group */}
				<div style={{ width: scaleTableW }}>
					{showLabels ? (
						<p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Scale Scores
						</p>
					) : null}
					<BarGroup metrics={SCALE_METRICS} scores={scores} colWidth={SCALE_DATA_COL_W} />
					<ScoreSubTable
						metrics={SCALE_METRICS}
						scores={scores}
						dataColW={SCALE_DATA_COL_W}
						tableW={scaleTableW}
					/>
				</div>

				{/* Construct group */}
				<div style={{ width: constructTableW }}>
					{showLabels ? (
						<p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Play Value & Usability
						</p>
					) : null}
					<BarGroup metrics={CONSTRUCT_METRICS} scores={scores} colWidth={CONSTRUCT_DATA_COL_W} />
					<ScoreSubTable
						metrics={CONSTRUCT_METRICS}
						scores={scores}
						dataColW={CONSTRUCT_DATA_COL_W}
						tableW={constructTableW}
					/>
				</div>
			</div>
		</div>
	);
}

function ScoreSubTable({
	metrics,
	scores,
	dataColW,
	tableW
}: Readonly<{ metrics: readonly MetricDef[]; scores: AuditScoreTotals | null; dataColW: number; tableW: number }>) {
	const rows: Array<{ label: string; cells: string[]; alt: boolean }> = [
		{
			label: "Score Achieved",
			cells: metrics.map(m => (scores === null ? "—" : String(m.getValue(scores)))),
			alt: false
		},
		{
			label: "Max Score",
			cells: metrics.map(m => {
				const max = scores === null ? 0 : m.getMax(scores);
				return max <= 0 ? "—" : String(max);
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
						{m.shortLabel}
					</div>
				))}
			</div>
			{/* Data rows */}
			{rows.map(row => (
				<div
					key={row.label}
					className={cn("flex border-t border-edge/40", row.alt ? "bg-muted/40" : "bg-card")}>
					<div
						className="border-r border-edge/40 px-3 py-2 text-xs font-bold text-muted-foreground"
						style={{ width: LABEL_COL_W }}>
						{row.label}
					</div>
					{row.cells.map((cell, i) => (
						<div
							key={`${row.label}-${i}`}
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

function DomainItemsTable({ questions }: Readonly<{ questions: DomainQuestionRow[] }>) {
	if (questions.length === 0) {
		return <p className="text-xs text-muted-foreground italic">No item-level data available.</p>;
	}

	return (
		<div className="overflow-x-auto rounded-md border border-edge/40">
			<table className="w-full min-w-[800px] border-collapse text-xs">
				<thead>
					<tr className="bg-muted/60">
						<th className="w-16 border-b border-r border-edge/40 px-3 py-2 text-left font-bold text-muted-foreground">
							ID
						</th>
						<th className="border-b border-r border-edge/40 px-3 py-2 text-left font-bold text-muted-foreground">
							Item
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							Provision
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							Diversity
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							Challenge
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-muted-foreground">
							Sociability
						</th>
						<th className="w-20 border-b border-r border-edge/40 px-3 py-2 text-center font-bold text-primary">
							PV
						</th>
						<th className="w-20 border-b border-edge/40 px-3 py-2 text-center font-bold text-primary">U</th>
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
											<span className="font-semibold text-foreground">Selected: </span>
											{q.checklistAnswerLabel}
										</p>
									) : null}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{renderScaleCellState({
										label: q.provisionLabel,
										applicable: q.provisionApplicable,
										isNotApplicable: q.provisionIsNotApplicable
									})}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{renderScaleCellState({
										label: q.diversityLabel,
										applicable: q.diversityApplicable,
										isNotApplicable: q.diversityIsNotApplicable,
										followUpScalesAsked: q.followUpScalesAsked
									})}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{renderScaleCellState({
										label: q.challengeLabel,
										applicable: q.challengeApplicable,
										isNotApplicable: q.challengeIsNotApplicable,
										followUpScalesAsked: q.followUpScalesAsked
									})}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center text-muted-foreground">
									{renderScaleCellState({
										label: q.sociabilityLabel,
										applicable: q.sociabilityApplicable,
										isNotApplicable: q.sociabilityIsNotApplicable,
										followUpScalesAsked: q.followUpScalesAsked
									})}
								</td>
								<td className="border-r border-edge/40 px-3 py-2 text-center font-mono tabular-nums">
									{q.playValueScore !== null && q.playValueMax !== null
										? `${q.playValueScore}/${q.playValueMax}`
										: "—"}
								</td>
								<td className="px-3 py-2 text-center font-mono tabular-nums">
									{q.usabilityScore !== null && q.usabilityMax !== null
										? `${q.usabilityScore}/${q.usabilityMax}`
										: "—"}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ── Best/Worst table ─────────────────────────────────────────────────────────

type ConstructKey = "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";

const CONSTRUCT_LABELS: Record<ConstructKey, string> = {
	provision: "Provision",
	diversity: "Diversity",
	challenge: "Challenge Opportunities",
	sociability: "Sociability Support",
	play_value: "Play Value",
	usability: "Usability"
};

const CONSTRUCT_GRID: readonly (readonly [ConstructKey, ConstructKey, ConstructKey])[] = [
	["provision", "diversity", "challenge"],
	["sociability", "play_value", "usability"]
];

function BestWorstSection({ rankings }: Readonly<{ rankings: ConstructRanking[] }>) {
	const rankingByKey = new Map(rankings.map(r => [r.constructKey, r] as const));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Highest & Lowest Scored Domains</CardTitle>
			</CardHeader>
			<CardContent>
				{rankings.length === 0 ? (
					<p className="text-sm text-muted-foreground">Not enough domain data for comparison.</p>
				) : (
					<div className="space-y-3">
						{CONSTRUCT_GRID.map((row, rowIdx) => (
							<div key={`bw-row-${rowIdx}`} className="grid gap-3 sm:grid-cols-3">
								{row.map(key => {
									const ranking = rankingByKey.get(key);
									return (
										<div key={key} className="overflow-hidden rounded-lg border border-edge/40">
											<div className="bg-primary px-3 py-2">
												<p className="text-center text-xs font-bold text-primary-foreground">
													{CONSTRUCT_LABELS[key]}
												</p>
											</div>
											<div className="border-b border-edge/40 bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/20">
												<div className="mb-1 flex items-center gap-1.5">
													<div className="size-2 rounded-full bg-emerald-500" />
													<span className="text-xs font-bold text-muted-foreground">
														Highest Scored
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
													<p className="text-sm text-muted-foreground">—</p>
												)}
											</div>
											<div className="bg-rose-50 px-3 py-2.5 dark:bg-rose-950/20">
												<div className="mb-1 flex items-center gap-1.5">
													<div className="size-2 rounded-full bg-rose-500" />
													<span className="text-xs font-bold text-muted-foreground">
														Lowest Scored
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
													<p className="text-sm text-muted-foreground">—</p>
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
}

/**
 * Full formatted audit report view with aligned score bars, domain breakdown,
 * item-level toggle, overall scores, best/worst table, and export.
 */
export function AuditReportView({ audit, instrument = null, basePath }: Readonly<AuditReportViewProps>) {
	const overall = getEffectiveScoreTotals(audit.scores);
	const overallPvPct = overall !== null ? pct(overall.play_value_total, overall.play_value_total_max) : "—";
	const overallUPct = overall !== null ? pct(overall.usability_total, overall.usability_total_max) : "—";
	const overallSocPct = overall !== null ? pct(overall.sociability_total, overall.sociability_total_max) : "—";
	const overallCombined = overall !== null ? `PV ${overallPvPct} · U ${overallUPct}` : "Pending";

	const domainRows = React.useMemo(() => {
		if (instrument === null) return [];
		return buildDomainReportRows(audit, instrument);
	}, [audit, instrument]);

	const rankings = React.useMemo(() => {
		if (domainRows.length < 2) return [];
		return buildConstructRankings(domainRows);
	}, [domainRows]);

	const domainKeys = Object.keys(audit.scores.by_domain);
	const hasDomains = domainKeys.length > 0;
	const hasInstrumentDomains = domainRows.length > 0;

	const allDomainAccordionKeys = React.useMemo(() => {
		if (hasInstrumentDomains) return domainRows.map(r => r.domainKey);
		return domainKeys;
	}, [hasInstrumentDomains, domainRows, domainKeys]);

	const [openDomains, setOpenDomains] = React.useState<string[]>([]);
	const [itemToggles, setItemToggles] = React.useState<Record<string, boolean>>({});

	const expandAll = React.useCallback(() => {
		setOpenDomains([...allDomainAccordionKeys]);
	}, [allDomainAccordionKeys]);

	const collapseAll = React.useCallback(() => {
		setOpenDomains([]);
		setItemToggles({});
	}, []);

	const toggleItems = React.useCallback((domainKey: string) => {
		setItemToggles(prev => ({ ...prev, [domainKey]: prev[domainKey] !== true }));
	}, []);

	return (
		<div className="space-y-6">
			{/* ── 1. Audit metadata ────────────────────────────────── */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<ActivityIcon className="size-4 text-primary" />
							Audit Details
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
									View Audit Details
								</Button>
							</a>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<MetadataRow icon={HashIcon} label="Audit Code">
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
						<MetadataRow icon={UserIcon} label="Auditor">
							<code className="inline-flex break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
								{audit.auditor_code}
							</code>
						</MetadataRow>
						<MetadataRow icon={MapPinIcon} label="Place">
							{audit.place_name}
						</MetadataRow>
						<MetadataRow icon={LayersIcon} label="Audit Type">
							<Badge variant="outline" className="text-xs font-medium">
								{getExecutionModeLabel(audit.scores.execution_mode)}
							</Badge>
						</MetadataRow>
						<MetadataRow icon={CalendarIcon} label="Started">
							{formatDateTime(audit.started_at)}
						</MetadataRow>
						<MetadataRow icon={CalendarIcon} label="Submitted">
							{audit.submitted_at !== null ? (
								formatDateTime(audit.submitted_at)
							) : (
								<span className="italic text-muted-foreground">Not yet submitted</span>
							)}
						</MetadataRow>
						<MetadataRow icon={ClipboardListIcon} label="Progress">
							<span className="font-mono tabular-nums">
								{audit.progress.answered_visible_questions} / {audit.progress.total_visible_questions}
							</span>{" "}
							questions
						</MetadataRow>
					</div>
				</CardContent>
			</Card>

			{/* ── 2. Score summary ─────────────────────────────────── */}
			<div className="space-y-3">
				<h2 className="text-base font-bold text-foreground">Score Summary</h2>
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<ReportStatCard
						label="Overall Score"
						value={overallCombined}
						helper={
							overall !== null
								? `Max PV = ${overall.play_value_total_max}, Max U = ${overall.usability_total_max}`
								: undefined
						}
						accent="bg-accent-terracotta"
					/>
					<ReportStatCard
						label="Play Value"
						value={overall !== null ? `${overall.play_value_total} (${overallPvPct})` : "—"}
						helper={overall !== null ? `Max score = ${overall.play_value_total_max}` : undefined}
						accent="bg-amber-500"
					/>
					<ReportStatCard
						label="Usability"
						value={overall !== null ? `${overall.usability_total} (${overallUPct})` : "—"}
						helper={overall !== null ? `Max score = ${overall.usability_total_max}` : undefined}
						accent="bg-primary"
					/>
					<ReportStatCard
						label="Sociability"
						value={overall !== null ? `${overall.sociability_total} (${overallSocPct})` : "—"}
						helper={overall !== null ? `Max score = ${overall.sociability_total_max}` : undefined}
						accent="bg-emerald-500"
					/>
				</div>
			</div>

			{/* ── 4. Domain breakdown ─────────────────────────────── */}
			{hasDomains ? (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<CardTitle className="text-base">Domain Breakdown</CardTitle>
							<div className="flex gap-1.5">
								<Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={expandAll}>
									<ChevronsUpDownIcon className="size-3.5" />
									Expand All
								</Button>
								<Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={collapseAll}>
									<ChevronsDownUpIcon className="size-3.5" />
									Collapse All
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
											showItems={itemToggles[row.domainKey] === true}
											onToggleItems={() => toggleItems(row.domainKey)}
										/>
									))
								: domainKeys.map(domainKey => (
										<DomainAccordionItem
											key={domainKey}
											domainKey={domainKey}
											title={toDomainTitle(domainKey)}
											scores={audit.scores.by_domain[domainKey] ?? null}
											notes={[]}
											questions={[]}
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
					<CardTitle className="text-base">Overall Scores</CardTitle>
				</CardHeader>
				<CardContent>
					<AlignedScoreDisplay scores={overall} />
				</CardContent>
			</Card>

			{/* ── 6. Best & Worst ─────────────────────────────────── */}
			{rankings.length > 0 ? <BestWorstSection rankings={rankings} /> : null}

			{/* ── 7. Raw JSON toggle ──────────────────────────────── */}
			<JsonViewer data={audit.scores} title="audit-scores.json" defaultOpen={true} />
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
	showItems,
	onToggleItems
}: Readonly<{
	domainKey: string;
	title: string;
	scores: AuditScoreTotals | null;
	notes: string[];
	questions: DomainQuestionRow[];
	showItems: boolean;
	onToggleItems: () => void;
}>) {
	return (
		<AccordionItem value={domainKey}>
			<AccordionTrigger className="text-sm">
				<div className="flex flex-1 items-center justify-between gap-3 pr-2">
					<span className="text-left font-bold text-foreground">{title}</span>
					<span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono tabular-nums text-primary">
						{scores !== null
							? `PV ${pct(scores.play_value_total, scores.play_value_total_max)} · U ${pct(scores.usability_total, scores.usability_total_max)}`
							: "Pending"}
					</span>
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<div className="space-y-4 pt-1">
					<AlignedScoreDisplay scores={scores} showLabels={false} />

					{notes.length > 0 ? (
						<div className="space-y-1.5 rounded-md bg-muted/40 px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Auditor Notes
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
								{showItems ? "Hide Items" : `Show Items (${questions.length})`}
								{showItems ? (
									<ChevronUpIcon className="size-3" />
								) : (
									<ChevronDownIcon className="size-3" />
								)}
							</Button>
							{showItems ? <DomainItemsTable questions={questions} /> : null}
						</div>
					) : null}
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
