"use client";

import {
	CalendarIcon,
	CheckCircle2Icon,
	ClockIcon,
	FileTextIcon,
	FolderOpenIcon,
	LockIcon,
	MapPinIcon,
	UserIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AuditSession } from "@/lib/api/playspace";
import { parsePromptSegments } from "@/lib/audit/prompt-segments";
import { getEffectiveScoreTotals, getExecutionModeLabel } from "@/lib/audit/score-mode-helpers";
import type { InstrumentQuestion, PlayspaceInstrument, QuestionResponsePayload } from "@/types/audit";

import { AuditExportActions } from "./audit-export-actions";
import { StatCard } from "./stat-card";
import { type DashboardTranslator, formatDateTimeLabel, formatScoreLabel } from "./utils";

// ── Internal Helpers ──────────────────────────────────────────────────

/**
 * Format the audit status into a human-readable label.
 */
function formatStatusLabel(status: string): string {
	switch (status) {
		case "IN_PROGRESS":
			return "In Progress";
		case "PAUSED":
			return "Paused";
		case "SUBMITTED":
			return "Submitted";
		default:
			return status;
	}
}

/**
 * Pick the badge variant based on the audit status.
 */
function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
	if (status === "SUBMITTED") {
		return "default";
	}
	return "secondary";
}

/**
 * Resolve the human-friendly execution mode label from the audit session.
 * Prefers the user-selected mode; falls back to the meta-level mode.
 */
function resolveExecutionModeLabel(audit: AuditSession): string {
	const mode = audit.selected_execution_mode ?? audit.meta.execution_mode;
	return getExecutionModeLabel(mode);
}

/**
 * Format a timestamp for display as a date + time.
 */
function formatTimestamp(value: string | null): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		return "-";
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}
	return parsed.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}

/**
 * Derive the summary score from an audit session using mode-appropriate score totals.
 */
function deriveSummaryScore(audit: AuditSession): number | null {
	const effective = getEffectiveScoreTotals(audit.scores);
	if (effective === null) {
		return null;
	}
	return Math.round((effective.play_value_total + effective.usability_total) * 10) / 10;
}

/**
 * Format a percentage string from a numerator and denominator.
 */
function formatPercent(value: number, max: number): string {
	if (max <= 0) {
		return "-";
	}
	const pct = (value / max) * 100;
	const rounded = Math.round(pct * 10) / 10;
	return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

/**
 * Resolve the human-friendly answer text for a scaled question.
 */
function formatScaledAnswer(question: InstrumentQuestion, scaleKey: string, answerKey: string | undefined): string {
	if (typeof answerKey !== "string" || answerKey.trim().length === 0) {
		return "-";
	}
	const scale = question.scales.find(s => s.key === scaleKey);
	if (scale === undefined) {
		return answerKey;
	}
	const option = scale.options.find(o => o.key === answerKey);
	if (option === undefined) {
		return answerKey;
	}
	return option.label.replaceAll("**", "").trim();
}

/**
 * Resolve the answer text for a checklist question.
 */
function formatChecklistAnswerText(question: InstrumentQuestion, answers: QuestionResponsePayload): string {
	const selectedKeys = answers["selected_option_keys"];
	if (!Array.isArray(selectedKeys) || selectedKeys.length === 0) {
		return "-";
	}
	const labels: string[] = selectedKeys
		.filter((key): key is string => typeof key === "string")
		.map(key => {
			if (key === "other") {
				return Object.values(answers["other_details"] as Record<string, string>).join(", ");
			}
			const option = question.options.find(o => o.key === key);
			return option?.label ?? key;
		});
	return labels.join(", ");
}

// ── Score Summary Panel ─────────────────────────────────────────────

interface ScoreSummaryProps {
	readonly audit: AuditSession;
	readonly formatT: DashboardTranslator;
}

/**
 * Score overview cards for a submitted audit showing PV, U, and component scores.
 */
function ScoreSummary({ audit, formatT }: ScoreSummaryProps) {
	const overall = getEffectiveScoreTotals(audit.scores);
	const summaryScore = deriveSummaryScore(audit);

	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<StatCard
				title="Summary Score"
				value={formatScoreLabel(summaryScore, formatT)}
				helper="Combined Play Value and Usability total."
				tone="info"
			/>
			<StatCard
				title="Play Value"
				value={overall ? formatPercent(overall.play_value_total, overall.play_value_total_max) : "-"}
				helper={
					overall
						? `${Math.round(overall.play_value_total * 10) / 10} / ${Math.round(overall.play_value_total_max * 10) / 10}`
						: "Pending"
				}
				tone="success"
			/>
			<StatCard
				title="Usability"
				value={overall ? formatPercent(overall.usability_total, overall.usability_total_max) : "-"}
				helper={
					overall
						? `${Math.round(overall.usability_total * 10) / 10} / ${Math.round(overall.usability_total_max * 10) / 10}`
						: "Pending"
				}
				tone="violet"
			/>
			<StatCard
				title="Duration"
				value={audit.total_minutes !== null ? `${audit.total_minutes} min` : "-"}
				helper="Total audit session duration."
				tone="warning"
			/>
		</div>
	);
}

// ── Meta Information Card ───────────────────────────────────────────

interface MetaInfoCardProps {
	readonly audit: AuditSession;
}

/**
 * Key-value display of audit metadata: place, project, auditor, dates, mode, etc.
 */
function MetaInfoCard({ audit }: MetaInfoCardProps) {
	const rows: Array<{ icon: React.ReactNode; label: string; value: string }> = [
		{ icon: <FileTextIcon className="size-4" />, label: "Audit Code", value: audit.audit_code },
		{ icon: <MapPinIcon className="size-4" />, label: "Place", value: audit.place_name },
		{ icon: <FolderOpenIcon className="size-4" />, label: "Project", value: audit.project_name },
		{ icon: <UserIcon className="size-4" />, label: "Auditor", value: audit.auditor_code },
		{ icon: <CalendarIcon className="size-4" />, label: "Started", value: formatTimestamp(audit.started_at) },
		{
			icon: <CheckCircle2Icon className="size-4" />,
			label: "Submitted",
			value: formatTimestamp(audit.submitted_at)
		},
		{
			icon: <ClockIcon className="size-4" />,
			label: "Duration",
			value: audit.total_minutes !== null ? `${audit.total_minutes} min` : "-"
		},
		{ icon: <FileTextIcon className="size-4" />, label: "Execution Mode", value: resolveExecutionModeLabel(audit) },
		{
			icon: <FileTextIcon className="size-4" />,
			label: "Instrument",
			value: `${audit.instrument_key} v${audit.instrument_version}`
		}
	];
	const finalComments = audit.meta.final_comments?.trim() ?? "";
	if (finalComments.length > 0) {
		rows.push({
			icon: <FileTextIcon className="size-4" />,
			label: "Final Comments",
			value: finalComments
		});
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base font-semibold">Audit Information</CardTitle>
			</CardHeader>
			<CardContent className="space-y-0">
				{rows.map((row, idx) => (
					<React.Fragment key={row.label}>
						<div className="flex items-center gap-3 py-3">
							<span className="text-muted-foreground">{row.icon}</span>
							<span className="min-w-[140px] text-sm font-medium text-muted-foreground">{row.label}</span>
							<span className="text-sm text-foreground">{row.value}</span>
						</div>
						{idx < rows.length - 1 && <Separator />}
					</React.Fragment>
				))}
			</CardContent>
		</Card>
	);
}

// ── Pre-Audit Answers ───────────────────────────────────────────────

interface PreAuditCardProps {
	readonly audit: AuditSession;
	readonly instrument: PlayspaceInstrument | undefined;
}

/**
 * Display the pre-audit context answers (place size, weather, user counts, etc.)
 */
function PreAuditCard({ audit, instrument }: PreAuditCardProps) {
	const preAudit = audit.pre_audit;
	const questions = instrument?.pre_audit_questions ?? [];

	const entries: Array<{ label: string; value: string }> = [];
	for (const question of questions) {
		const rawValue = preAudit[question.key as keyof typeof preAudit];
		if (rawValue === null || rawValue === undefined) {
			continue;
		}

		let displayValue: string;
		if (Array.isArray(rawValue)) {
			const labels = rawValue.map(key => {
				const opt = question.options.find(o => o.key === key);
				return opt?.label ?? key;
			});
			displayValue = labels.length > 0 ? labels.join(", ") : "-";
		} else if (typeof rawValue === "string" && rawValue.trim().length > 0) {
			const opt = question.options.find(o => o.key === rawValue);
			displayValue = opt?.label ?? rawValue;
		} else {
			continue;
		}

		entries.push({ label: question.label, value: displayValue });
	}

	if (entries.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base font-semibold">Pre-Audit Context</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
					{entries.map(entry => (
						<div key={entry.label} className="space-y-1">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{entry.label}
							</p>
							<p className="text-sm text-foreground">{entry.value}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

// ── Section Responses Accordion ─────────────────────────────────────

interface SectionResponsesProps {
	readonly audit: AuditSession;
	readonly instrument: PlayspaceInstrument | undefined;
}

/**
 * Expandable accordion of instrument sections with per-question answers.
 */
function SectionResponses({ audit, instrument }: SectionResponsesProps) {
	if (instrument === undefined) {
		return null;
	}

	const executionMode = audit.selected_execution_mode ?? audit.meta.execution_mode;
	const sections = instrument.sections.filter(section => {
		const sectionState = audit.sections[section.section_key];
		if (sectionState === undefined) {
			return false;
		}
		return section.questions.some(q => {
			if (executionMode !== null && q.mode !== "both" && q.mode !== executionMode) {
				return false;
			}
			return true;
		});
	});

	if (sections.length === 0) {
		return null;
	}

	const defaultOpen = sections.map(s => s.section_key);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base font-semibold">Audit Responses</CardTitle>
			</CardHeader>
			<CardContent>
				<Accordion type="multiple" defaultValue={defaultOpen}>
					{sections.map(section => {
						const sectionState = audit.sections[section.section_key];
						const sectionScores = audit.scores.by_section[section.section_key];
						const visibleQuestions = section.questions.filter(q => {
							if (executionMode !== null && q.mode !== "both" && q.mode !== executionMode) {
								return false;
							}
							if (q.display_if !== null && q.display_if !== undefined) {
								const parentAnswers = sectionState?.responses[q.display_if.question_key];
								if (parentAnswers === undefined) {
									return false;
								}
								const selectedValue = parentAnswers[q.display_if.response_key];
								if (typeof selectedValue === "string") {
									return q.display_if.any_of_option_keys.includes(selectedValue);
								}
								if (Array.isArray(selectedValue)) {
									return selectedValue.some(
										entry =>
											typeof entry === "string" &&
											q.display_if !== null &&
											q.display_if !== undefined &&
											q.display_if.any_of_option_keys.includes(entry)
									);
								}
								return false;
							}
							return true;
						});

						return (
							<AccordionItem key={section.section_key} value={section.section_key}>
								<AccordionTrigger className="text-sm font-semibold">
									<div className="flex items-center gap-3">
										<span>
											{parsePromptSegments(section.title).map((segment, index) => (
												<React.Fragment
													key={`${section.section_key}-title-${index.toString()}`}>
													<span
														className={
															segment.bold ? "font-semibold text-primary" : undefined
														}>
														{segment.text}
													</span>
												</React.Fragment>
											))}
										</span>
										{sectionScores ? (
											<Badge variant="outline" className="font-mono text-xs">
												PV {Math.round(sectionScores.play_value_total * 10) / 10} | U{" "}
												{Math.round(sectionScores.usability_total * 10) / 10}
											</Badge>
										) : null}
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className="space-y-3">
										{visibleQuestions.map(question => {
											const answers = sectionState?.responses[question.question_key] ?? {};
											return (
												<QuestionRow
													key={question.question_key}
													question={question}
													answers={answers}
												/>
											);
										})}
										{sectionState?.note ? (
											<div className="mt-4 rounded-lg border border-edge/40 bg-muted/30 p-4">
												<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
													Section Note
												</p>
												<p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
													{sectionState.note}
												</p>
											</div>
										) : null}
									</div>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			</CardContent>
		</Card>
	);
}

// ── Question Row ────────────────────────────────────────────────────

interface QuestionRowProps {
	readonly question: InstrumentQuestion;
	readonly answers: QuestionResponsePayload;
}

/**
 * Single question display with the prompt and its answer(s).
 */
function QuestionRow({ question, answers }: QuestionRowProps) {
	const promptSegments = parsePromptSegments(question.prompt);
	const questionComment = typeof answers.question_note === "string" ? answers.question_note.trim() : "";

	const promptNode = (
		<p className="text-sm font-medium text-foreground">
			{promptSegments.map((segment, index) => (
				<React.Fragment key={`${question.question_key}-seg-${index.toString()}`}>
					<span className={segment.bold ? "font-semibold text-primary" : undefined}>{segment.text}</span>
				</React.Fragment>
			))}
		</p>
	);

	if (question.question_type === "checklist") {
		return (
			<div className="rounded-lg border border-edge/30 bg-card p-4">
				{promptNode}
				<p className="mt-1.5 text-sm text-muted-foreground">{formatChecklistAnswerText(question, answers)}</p>
				{questionComment.length > 0 ? (
					<div className="mt-3 rounded-md border border-edge/40 bg-muted/30 p-3">
						<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Auditor Comment
						</p>
						<p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{questionComment}</p>
					</div>
				) : null}
			</div>
		);
	}

	const scaleKeys = ["provision", "variety", "sociability", "challenge"] as const;
	const answerEntries = scaleKeys
		.map(key => {
			const rawAnswer = answers[key];
			const answerKey = typeof rawAnswer === "string" ? rawAnswer : undefined;
			const label = formatScaledAnswer(question, key, answerKey);
			const scale = question.scales.find(s => s.key === key);
			return label !== "-" && scale ? { scaleTitle: scale.title, answer: label } : null;
		})
		.filter((entry): entry is { scaleTitle: string; answer: string } => entry !== null);

	return (
		<div className="rounded-lg border border-edge/30 bg-card p-4">
			{promptNode}
			{answerEntries.length > 0 ? (
				<div className="mt-2 flex flex-wrap gap-2">
					{answerEntries.map(entry => (
						<Badge key={entry.scaleTitle} variant="outline" className="text-xs">
							{entry.scaleTitle}: {entry.answer}
						</Badge>
					))}
				</div>
			) : (
				<p className="mt-1.5 text-sm text-muted-foreground">No response recorded</p>
			)}
			{questionComment.length > 0 ? (
				<div className="mt-3 rounded-md border border-edge/40 bg-muted/30 p-3">
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Auditor Comment
					</p>
					<p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{questionComment}</p>
				</div>
			) : null}
		</div>
	);
}

// ── Unsubmitted Audit Restricted Card ───────────────────────────────

interface UnsubmittedAuditCardProps {
	readonly audit: AuditSession;
}

/**
 * Restricted view for unsubmitted audits showing only header info with a lock icon.
 */
function UnsubmittedAuditCard({ audit }: UnsubmittedAuditCardProps) {
	const progress = audit.progress;
	const progressPercent =
		progress.total_visible_questions > 0
			? Math.round((progress.answered_visible_questions / progress.total_visible_questions) * 100)
			: 0;

	return (
		<Card className="border-dashed">
			<CardContent className="py-10">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="flex size-14 items-center justify-center rounded-full bg-muted">
						<LockIcon className="size-6 text-muted-foreground" />
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-foreground">Audit Not Yet Submitted</h3>
						<p className="max-w-md text-sm text-muted-foreground">
							This audit is still in progress. Detailed responses and scores will become visible once the
							auditor submits the audit.
						</p>
					</div>
					<div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
						<span>
							Progress: <strong className="text-foreground">{progressPercent}%</strong>
						</span>
						<span>
							Questions answered:{" "}
							<strong className="text-foreground">
								{progress.answered_visible_questions} / {progress.total_visible_questions}
							</strong>
						</span>
						<span>
							Sections completed:{" "}
							<strong className="text-foreground">
								{progress.completed_section_count} / {progress.visible_section_count}
							</strong>
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// ── Main Export ──────────────────────────────────────────────────────

export interface AuditDetailViewProps {
	/** The full audit session payload. */
	readonly audit: AuditSession;
	/** Dashboard-scoped breadcrumb items rendered above the header. */
	readonly breadcrumbs: Array<{ label: string; href?: string }>;
	/** The role-specific eyebrow text, e.g. "Administrator Workspace". */
	readonly eyebrow: string;
	/** Role-scoped base path (e.g. "/admin", "/manager") for cross-navigation links. */
	readonly basePath?: string | undefined;
}

/**
 * Shared audit detail view used by both admin and manager audit detail pages.
 *
 * For submitted audits, shows the full score summary, metadata, pre-audit context,
 * and expandable section-by-section responses with export capabilities.
 *
 * For unsubmitted audits, shows the header metadata with a restricted-access card
 * and progress summary.
 */
export function AuditDetailView({ audit, breadcrumbs, eyebrow, basePath }: AuditDetailViewProps) {
	const formatT = useTranslations("common.format");
	const isSubmitted = audit.status === "SUBMITTED";
	const instrument = audit.instrument;

	return (
		<div className="space-y-6">
			{/* ── Header ── */}
			<div className="space-y-4">
				{breadcrumbs.length > 0 && (
					<nav className="flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
						{breadcrumbs.map((crumb, idx) => (
							<React.Fragment key={crumb.label}>
								{crumb.href ? (
									<a href={crumb.href} className="font-medium hover:text-foreground hover:underline">
										{crumb.label}
									</a>
								) : (
									<span className="font-medium text-foreground">{crumb.label}</span>
								)}
								{idx < breadcrumbs.length - 1 && <span>/</span>}
							</React.Fragment>
						))}
					</nav>
				)}
				<div className="flex flex-col gap-4 rounded-card border border-edge/40 bg-card/70 p-6 shadow-card md:p-7">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-2">
							<p className="text-(length:--eyebrow-size) font-semibold tracking-(--eyebrow-tracking) text-text-secondary uppercase">
								{eyebrow}
							</p>
							<div className="space-y-1.5">
								<div className="flex flex-wrap items-center gap-3">
									<h1 className="text-3xl font-semibold leading-tight md:text-4xl">
										{audit.place_name}
									</h1>
									<Badge variant={getStatusBadgeVariant(audit.status)} className="font-medium">
										{formatStatusLabel(audit.status)}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground md:text-base">
									{audit.project_name} · {audit.auditor_code} ·{" "}
									{isSubmitted
										? `Submitted ${formatDateTimeLabel(audit.submitted_at, formatT)}`
										: `Started ${formatDateTimeLabel(audit.started_at, formatT)}`}
								</p>
							</div>
						</div>
						<div className="flex flex-col items-start gap-2 lg:items-end">
							{isSubmitted && basePath !== undefined && (
								<a href={`${basePath}/reports/${audit.audit_id}`}>
									<Button variant="outline" size="sm" className="gap-1.5">
										<FileTextIcon className="size-3.5" />
										View Report
									</Button>
								</a>
							)}
							{isSubmitted && instrument !== undefined && (
								<AuditExportActions audit={audit} instrument={instrument} />
							)}
						</div>
					</div>
				</div>
			</div>

			{isSubmitted ? (
				<>
					{/* ── Score Summary ── */}
					<ScoreSummary audit={audit} formatT={formatT} />

					{/* ── Detailed Score Breakdown ── */}
					{(() => {
						const effectiveBreakdown = getEffectiveScoreTotals(audit.scores);
						if (effectiveBreakdown === null) {
							return null;
						}
						return (
							<Card>
								<CardHeader>
									<CardTitle className="text-base font-semibold">Score Breakdown</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
										{(
											[
												{
													label: "Provision",
													totalKey: "provision_total",
													maxKey: "provision_total_max"
												},
												{
													label: "Variety",
													totalKey: "variety_total",
													maxKey: "variety_total_max"
												},
												{
													label: "Sociability",
													totalKey: "sociability_total",
													maxKey: "sociability_total_max"
												},
												{
													label: "Challenge",
													totalKey: "challenge_total",
													maxKey: "challenge_total_max"
												}
											] as const
										).map(({ label, totalKey, maxKey }) => {
											const numTotal = effectiveBreakdown[totalKey];
											const numMax = effectiveBreakdown[maxKey];
											return (
												<div
													key={label}
													className="space-y-2 rounded-lg border border-edge/40 p-4">
													<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
														{label}
													</p>
													<p className="font-mono text-2xl font-semibold tabular-nums">
														{formatPercent(numTotal, numMax)}
													</p>
													<p className="text-xs text-muted-foreground">
														{Math.round(numTotal * 10) / 10} /{" "}
														{Math.round(numMax * 10) / 10}
													</p>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>
						);
					})()}

					{/* ── Audit Metadata ── */}
					<MetaInfoCard audit={audit} />

					{/* ── Pre-Audit Context ── */}
					<PreAuditCard audit={audit} instrument={instrument} />

					{/* ── Section Responses ── */}
					<SectionResponses audit={audit} instrument={instrument} />
				</>
			) : (
				<>
					{/* ── Header metadata for non-submitted ── */}
					<MetaInfoCard audit={audit} />

					{/* ── Restricted notice ── */}
					<UnsubmittedAuditCard audit={audit} />
				</>
			)}
		</div>
	);
}
