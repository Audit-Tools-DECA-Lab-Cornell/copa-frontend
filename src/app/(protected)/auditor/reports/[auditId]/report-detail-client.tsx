"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { BackButton } from "@/components/dashboard/back-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { formatAuditCodeReference, formatDateTimeLabel, formatScoreLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AuditSession, playspaceApi } from "@/lib/api/playspace";
import { getEffectiveScoreTotals } from "@/lib/audit/score-mode-helpers";
import { useLocalizedInstrument } from "@/lib/instrument-translations";
import type { InstrumentQuestion, PreAuditQuestion } from "@/types/audit";
/**
 * Fall back to a readable label when no instrument option exists.
 */
function humanizeToken(value: string): string {
	return value
		.replaceAll("_", " ")
		.replaceAll("-", " ")
		.replaceAll(/\s+/g, " ")
		.trim()
		.replaceAll(/\b\w/g, character => character.toUpperCase());
}

/**
 * Resolve a stored option key into its display label from the instrument definition.
 */
function formatPreAuditValue(
	preAuditQuestionByKey: Readonly<Record<string, PreAuditQuestion>>,
	questionKey: string,
	value: string | null,
	notProvidedLabel: string
): string {
	if (!value) {
		return notProvidedLabel;
	}

	const question = preAuditQuestionByKey[questionKey];
	const matchingOption = question?.options.find(option => option.key === value);
	return matchingOption?.label ?? humanizeToken(value);
}

/**
 * Resolve a stored multi-select answer array into readable labels.
 */
function formatPreAuditValueList(
	preAuditQuestionByKey: Readonly<Record<string, PreAuditQuestion>>,
	questionKey: string,
	values: string[],
	notProvidedLabel: string
): string {
	if (values.length === 0) {
		return notProvidedLabel;
	}

	return values
		.map(value => formatPreAuditValue(preAuditQuestionByKey, questionKey, value, notProvidedLabel))
		.join(", ");
}

/**
 * Read one pre-audit question's stored value and format it for display.
 */
function getPreAuditDisplayValue(
	preAuditQuestionByKey: Readonly<Record<string, PreAuditQuestion>>,
	question: PreAuditQuestion,
	audit: AuditSession,
	notProvidedLabel: string
): string {
	switch (question.key) {
		case "place_size":
			return formatPreAuditValue(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.place_size,
				notProvidedLabel
			);
		case "current_users_0_5":
			return formatPreAuditValue(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.current_users_0_5,
				notProvidedLabel
			);
		case "current_users_6_12":
			return formatPreAuditValue(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.current_users_6_12,
				notProvidedLabel
			);
		case "current_users_13_17":
			return formatPreAuditValue(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.current_users_13_17,
				notProvidedLabel
			);
		case "current_users_18_plus":
			return formatPreAuditValue(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.current_users_18_plus,
				notProvidedLabel
			);
		case "playspace_busyness":
			return formatPreAuditValue(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.playspace_busyness,
				notProvidedLabel
			);
		case "season":
			return formatPreAuditValue(preAuditQuestionByKey, question.key, audit.pre_audit.season, notProvidedLabel);
		case "weather_conditions":
			return formatPreAuditValueList(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.weather_conditions,
				notProvidedLabel
			);
		case "wind_conditions":
			return formatPreAuditValue(
				preAuditQuestionByKey,
				question.key,
				audit.pre_audit.wind_conditions,
				notProvidedLabel
			);
		default:
			return notProvidedLabel;
	}
}

interface AuditorReportDetailClientProps {
	auditId: string;
}

export function AuditorReportDetailClient({ auditId }: Readonly<AuditorReportDetailClientProps>) {
	const t = useTranslations("auditor.reportDetail");
	const formatT = useTranslations("common.format");

	const auditQuery = useQuery({
		queryKey: ["playspace", "auditor", "audit", auditId],
		queryFn: () => playspaceApi.auditor.getAudit(auditId),
		enabled: typeof auditId === "string" && auditId.length > 0
	});
	const audit = auditQuery.data ?? null;
	const instrument = useLocalizedInstrument(audit?.instrument ?? null);
	const sectionTitleByKey = React.useMemo(() => {
		if (!instrument) return {} as Readonly<Record<string, string>>;
		return Object.fromEntries(instrument.sections.map(section => [section.section_key, section.title])) as Readonly<
			Record<string, string>
		>;
	}, [instrument]);
	const preAuditQuestionByKey = React.useMemo(() => {
		if (!instrument) return {} as Readonly<Record<string, PreAuditQuestion>>;
		return Object.fromEntries(instrument.pre_audit_questions.map(question => [question.key, question])) as Readonly<
			Record<string, PreAuditQuestion>
		>;
	}, [instrument]);
	const visibleSetupQuestions = React.useMemo(() => {
		return instrument?.pre_audit_questions.filter(question => {
			if (question.page_key !== "space_setup") {
				return false;
			}

			if (audit?.meta.execution_mode === null) {
				return true;
			}

			return audit ? question.visible_modes.includes(audit.meta.execution_mode) : false;
		});
	}, [audit, instrument?.pre_audit_questions]);
	const sectionRows = React.useMemo(() => {
		return audit ? Object.values(audit.sections) : [];
	}, [audit]);

	// Collect question notes per section key from responses.
	// Only include notes from questions that actually have notes_prompt (using instrument if available).
	const questionNotesBySectionKey = React.useMemo(() => {
		if (!audit) return {} as Readonly<Record<string, { questionKey: string; note: string }[]>>;
		const result: Record<string, { questionKey: string; note: string }[]> = {};
		const questionHasPrompt = new Set<string>();
		if (instrument) {
			instrument.sections.forEach(sec => {
				sec.questions.forEach((q: InstrumentQuestion) => {
					if (q.notes_prompt) questionHasPrompt.add(q.question_key);
				});
			});
		}
		Object.entries(audit.sections).forEach(([sectionKey, sectionState]) => {
			const notes: { questionKey: string; note: string }[] = [];
			const responses = sectionState.responses ?? {};
			Object.entries(responses).forEach(([questionKey, payload]) => {
				if (instrument && !questionHasPrompt.has(questionKey)) return;
				const raw = (payload as Record<string, unknown>).question_note;
				if (typeof raw === "string" && raw.trim().length > 0) {
					notes.push({ questionKey, note: raw.trim() });
				}
			});
			if (notes.length > 0) result[sectionKey] = notes;
		});
		return result as Readonly<Record<string, { questionKey: string; note: string }[]>>;
	}, [audit, instrument]);

	const canResumeAudit = audit ? audit.status !== "SUBMITTED" : false;
	const notedSectionCount = sectionRows.filter(section => {
		const hasNote = typeof section.note === "string" && section.note.trim().length > 0;
		const hasQuestionNotes = (questionNotesBySectionKey[section.section_key]?.length ?? 0) > 0;
		return hasNote || hasQuestionNotes;
	}).length;
	const emptySectionCount = sectionRows.length - notedSectionCount;
	const [showEmptySections, setShowEmptySections] = React.useState(false);
	const [showSectionCodes, setShowSectionCodes] = React.useState(false);

	const [prevNotedCount, setPrevNotedCount] = React.useState(notedSectionCount);
	if (notedSectionCount !== prevNotedCount) {
		setPrevNotedCount(notedSectionCount);
		if (notedSectionCount === 0 && !showEmptySections) {
			setShowEmptySections(true);
		}
	}

	const orderedSectionRows = React.useMemo(() => {
		const sectionsWithNotes: typeof sectionRows = [];
		const sectionsWithoutNotes: typeof sectionRows = [];

		for (const section of sectionRows) {
			const hasNote = typeof section.note === "string" && section.note.trim().length > 0;
			const hasQuestionNotes = (questionNotesBySectionKey[section.section_key]?.length ?? 0) > 0;
			if (hasNote || hasQuestionNotes) {
				sectionsWithNotes.push(section);
				continue;
			}

			sectionsWithoutNotes.push(section);
		}

		return showEmptySections ? [...sectionsWithNotes, ...sectionsWithoutNotes] : sectionsWithNotes;
	}, [sectionRows, showEmptySections, questionNotesBySectionKey]);

	if (auditQuery.isLoading || !auditId) {
		return <div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />;
	}

	if (auditQuery.isError || !audit) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("error.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">{t("error.description")}</p>
					<BackButton href="/auditor/reports" label={t("actions.backToReports")} />
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={audit.place_name}
				description={t("header.description", {
					auditCode: formatAuditCodeReference(audit.audit_code),
					status: t(`status.${audit.status.toLowerCase()}`)
				})}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						{canResumeAudit ? (
							<Button asChild>
								<Link
									href={`/auditor/execute/${encodeURIComponent(audit.place_id)}?projectId=${encodeURIComponent(audit.project_id)}`}>
									{t("actions.resumeAudit")}
								</Link>
							</Button>
						) : null}
						<BackButton href="/auditor/reports" label={t("actions.backToReports")} />
					</div>
				}
			/>
			{canResumeAudit ? (
				<Card>
					<CardHeader>
						<CardTitle>{t("inProgressCard.title")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">{t("inProgressCard.description")}</p>
						<Button asChild>
							<Link
								href={`/auditor/execute/${encodeURIComponent(audit.place_id)}?projectId=${encodeURIComponent(audit.project_id)}`}>
								{t("inProgressCard.continue")}
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}
			<div className="grid gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>{t("metadata.title")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>{`Project ${audit.project_name}`}</p>
						<p>{t("metadata.started", { value: formatDateTimeLabel(audit.started_at, formatT) })}</p>
						<p>{t("metadata.submitted", { value: formatDateTimeLabel(audit.submitted_at, formatT) })}</p>
						<p>
							{t("metadata.executionMode", {
								value: audit.meta.execution_mode
									? t(`executionMode.${audit.meta.execution_mode}`)
									: t("metadata.notSelected")
							})}
						</p>
						{audit.meta.final_comments ? (
							<p>
								{t("metadata.finalComments", {
									value: audit.meta.final_comments
								})}
							</p>
						) : null}
						<p>
							{t("metadata.readyToSubmit", {
								value: audit.progress.ready_to_submit ? t("metadata.yes") : t("metadata.no")
							})}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>{t("scores.title")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						{(() => {
							const effective = getEffectiveScoreTotals(audit.scores);
							return (
								<>
									<p>
										{t("scores.summary", {
											value: formatScoreLabel(
												effective
													? effective.play_value_total + effective.usability_total
													: null,
												formatT
											)
										})}
									</p>
									<p>
										{t("scores.playValue", {
											value: effective ? String(effective.play_value_total) : formatT("pending")
										})}
									</p>
									<p>
										{t("scores.usability", {
											value: effective ? String(effective.usability_total) : formatT("pending")
										})}
									</p>
									<p>
										{t("scores.sociability", {
											value: effective ? String(effective.sociability_total) : formatT("pending")
										})}
									</p>
								</>
							);
						})()}
					</CardContent>
				</Card>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>{t("preAudit.title")}</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
					{visibleSetupQuestions?.map(question => (
						<p key={question.key}>
							<span className="font-medium text-foreground">{question.label}: </span>
							{getPreAuditDisplayValue(preAuditQuestionByKey, question, audit, t("preAudit.notProvided"))}
						</p>
					))}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>{t("sectionNotes.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{sectionRows.length === 0 ? (
						<p className="text-sm text-muted-foreground">{t("sectionNotes.empty")}</p>
					) : (
						<>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-sm text-muted-foreground">
									{t("sectionNotes.summary", {
										notedCount: notedSectionCount,
										totalCount: sectionRows.length
									})}
								</p>
								<div className="flex flex-wrap items-center gap-2">
									{emptySectionCount > 0 ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => {
												setShowEmptySections(currentValue => !currentValue);
											}}>
											{showEmptySections
												? t("sectionNotes.hideEmptySections", { count: emptySectionCount })
												: t("sectionNotes.showEmptySections", { count: emptySectionCount })}
										</Button>
									) : null}
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => {
											setShowSectionCodes(currentValue => !currentValue);
										}}>
										{showSectionCodes
											? t("sectionNotes.hideSectionCodes")
											: t("sectionNotes.showSectionCodes")}
									</Button>
								</div>
							</div>
							{orderedSectionRows.length === 0 ? (
								<div className="rounded-card border border-dashed border-edge/50 p-4">
									<p className="font-medium text-foreground">
										{t("sectionNotes.noCapturedNotesTitle")}
									</p>
									<p className="mt-2 text-sm text-muted-foreground">
										{t("sectionNotes.noCapturedNotesDescription")}
									</p>
								</div>
							) : (
								<div className="grid gap-3 md:grid-cols-2">
									{orderedSectionRows.map(section => {
										const hasNote =
											typeof section.note === "string" && section.note.trim().length > 0;
										const questionNotes = questionNotesBySectionKey[section.section_key] ?? [];
										const hasAnyNote = hasNote || questionNotes.length > 0;

										return (
											<div
												key={section.section_key}
												className="rounded-card border border-edge/40 bg-card/60 p-4">
												<div className="flex flex-wrap items-start justify-between gap-3">
													<div className="space-y-1">
														<p className="font-medium text-foreground">
															{sectionTitleByKey[section.section_key] ??
																section.section_key}
														</p>
														{showSectionCodes ? (
															<code className="inline-flex rounded-md bg-muted/65 px-2 py-1 font-mono text-[13px] tracking-[0.04em] text-foreground/80">
																{section.section_key}
															</code>
														) : null}
													</div>
													{hasAnyNote ? (
														<Badge variant="secondary" className="font-medium">
															{t("sectionNotes.capturedNote")}
														</Badge>
													) : null}
												</div>
												{hasNote ? (
													<p className="mt-3 text-sm text-muted-foreground">{section.note}</p>
												) : !hasAnyNote ? (
													<p className="mt-3 text-sm text-muted-foreground">
														<span aria-hidden="true">-</span>
														<span className="sr-only">
															{t("sectionNotes.noNoteCaptured")}
														</span>
													</p>
												) : null}
												{questionNotes.length > 0 ? (
													<div className="mt-3 space-y-2">
														{questionNotes.map(({ questionKey, note }) => (
															<div
																key={questionKey}
																className="rounded-md bg-muted/40 px-3 py-2 text-sm">
																<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
																	{questionKey} - {t("sectionNotes.comment")}
																</p>
																<p className="text-foreground">{note}</p>
															</div>
														))}
													</div>
												) : null}
											</div>
										);
									})}
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
