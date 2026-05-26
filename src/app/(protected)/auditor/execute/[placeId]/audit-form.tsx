"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { playspaceApi, type AuditDraftPatch, type AuditSession } from "@/lib/api/playspace";
import { useLocalizedInstrument } from "@/lib/instrument-translations";
import {
	buildNextQuestionAnswers,
	getInstrumentSectionLocalProgress,
	getPreAuditValues,
	getVisiblePreAuditQuestions,
	getVisibleSections,
	isRequiredPreAuditComplete
} from "@/lib/audit/selectors";
import { BackButton } from "@/components/dashboard/back-button";
import { formatAuditCodeReference } from "@/components/dashboard/utils";
import type {
	ExecutionMode,
	QuestionResponsePayload,
	InstrumentSection,
	PlayspaceInstrument,
	PreAuditQuestion
} from "@/types/audit";
import { AuditQuestionCard } from "@/components/audit/question-card";
import { SectionQuestionTable } from "@/components/audit/section-question-table";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { parsePromptSegments } from "@/lib/audit/prompt-segments";
import { Fragment } from "react";

export interface AuditExecuteFormProps {
	placeId: string;
	projectId: string;
}

type ExecutionModeSelection = ExecutionMode | "";

interface SectionDraftState {
	readonly note: string;
	readonly responses: Record<string, QuestionResponsePayload>;
}

interface SectionProgressRow {
	readonly section: InstrumentSection;
	readonly progress: {
		readonly visibleQuestionCount: number;
		readonly answeredQuestionCount: number;
		readonly isComplete: boolean;
	};
}

interface PreambleLine {
	readonly kind: "paragraph" | "ordered" | "bullet";
	readonly marker: string | null;
	readonly text: string;
}

interface ParsedPreambleBlock {
	readonly headingLevel: 2 | 3;
	readonly heading: string;
	readonly lines: readonly PreambleLine[];
}

type ExecuteTranslator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Format a save timestamp for status messaging.
 */
function formatTime(date: Date): string {
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Convert a nullable string-or-array value into one nullable string.
 */
function readSingleValue(value: string | string[] | undefined): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

/**
 * Convert a nullable string-or-array value into a clean string array.
 */
function readMultiValue(value: string | string[] | undefined): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Normalize one optional free-text field by trimming blank values to null.
 */
function normalizeOptionalText(value: string): string | null {
	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

/**
 * Clone nested section response maps from one audit session.
 */
function createSectionDrafts(
	auditSession: AuditSession,
	instrument: PlayspaceInstrument
): Record<string, SectionDraftState> {
	const drafts: Record<string, SectionDraftState> = {};

	for (const section of instrument.sections) {
		const storedSection = auditSession.sections[section.section_key];
		const responses = Object.fromEntries(
			Object.entries(storedSection?.responses ?? {}).map(([questionKey, questionAnswers]) => [
				questionKey,
				cloneQuestionResponsePayload(questionAnswers)
			])
		);

		drafts[section.section_key] = {
			note: storedSection?.note ?? "",
			responses
		};
	}

	return drafts;
}

function cloneQuestionResponsePayload(value: QuestionResponsePayload): QuestionResponsePayload {
	const next: QuestionResponsePayload = {};
	for (const [answerKey, answerValue] of Object.entries(value)) {
		if (typeof answerValue === "string" || answerValue === null) {
			next[answerKey] = answerValue;
			continue;
		}

		if (Array.isArray(answerValue)) {
			next[answerKey] = [...answerValue];
			continue;
		}

		next[answerKey] = { ...answerValue };
	}
	return next;
}

/**
 * Build one canonical aggregate draft-save payload from local form state.
 */
function buildDraftPatchFromState(input: {
	selectedMode: ExecutionModeSelection;
	finalComments: string;
	preAuditValues: Record<string, string | string[]>;
	sectionDrafts: Record<string, SectionDraftState>;
	schemaVersion: number;
	expectedRevision: number;
}): AuditDraftPatch {
	const normalizedFinalComments = normalizeOptionalText(input.finalComments);
	const meta =
		input.selectedMode || normalizedFinalComments
			? {
					execution_mode: input.selectedMode || null,
					final_comments: normalizedFinalComments
				}
			: null;

	return {
		expected_revision: input.expectedRevision,
		aggregate: {
			schema_version: input.schemaVersion,
			meta,
			pre_audit: {
				place_size: readSingleValue(input.preAuditValues.place_size),
				current_users_0_5: readSingleValue(input.preAuditValues.current_users_0_5),
				current_users_6_12: readSingleValue(input.preAuditValues.current_users_6_12),
				current_users_13_17: readSingleValue(input.preAuditValues.current_users_13_17),
				current_users_18_plus: readSingleValue(input.preAuditValues.current_users_18_plus),
				playspace_busyness: readSingleValue(input.preAuditValues.playspace_busyness),
				season: readSingleValue(input.preAuditValues.season),
				weather_conditions: readMultiValue(input.preAuditValues.weather_conditions),
				wind_conditions: readSingleValue(input.preAuditValues.wind_conditions)
			},
			sections: Object.fromEntries(
				Object.entries(input.sectionDrafts).map(([sectionKey, draft]) => [
					sectionKey,
					{
						responses: draft.responses,
						note: draft.note.trim().length > 0 ? draft.note : null
					}
				])
			)
		},
		sections: {}
	};
}

/**
 * Format audit timestamps and computed auto fields for display.
 */
function formatAutoValue(
	questionKey: string,
	auditSession: AuditSession,
	auditorCode: string | null,
	t: ExecuteTranslator
): string {
	const startedAt = new Date(auditSession.started_at);
	const submittedAt = auditSession.submitted_at ? new Date(auditSession.submitted_at) : null;

	if (questionKey === "auditor_code") {
		return auditorCode ?? t("auditInfo.auditorCodePending");
	}

	if (questionKey === "audit_date") {
		return startedAt.toLocaleDateString();
	}

	if (questionKey === "started_at") {
		return startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	if (questionKey === "submitted_at") {
		return submittedAt
			? submittedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
			: t("preAudit.auto.generatedOnSubmit");
	}

	if (questionKey === "total_minutes") {
		return auditSession.total_minutes === null
			? t("preAudit.auto.calculatedOnSubmit")
			: t("preAudit.auto.minutes", { count: auditSession.total_minutes });
	}

	return "";
}

/**
 * Pick the first incomplete section, or the first visible section when all are complete.
 */
function getInitialActiveSectionKey(sectionRows: readonly SectionProgressRow[]): string | null {
	const firstIncomplete = sectionRows.find(sectionRow => !sectionRow.progress.isComplete);
	return firstIncomplete?.section.section_key ?? sectionRows[0]?.section.section_key ?? null;
}

/**
 * Parse `**bold**` prompt markers into renderable text segments.
 */

/**
 * Parse one markdown-like preamble block into headings and content lines.
 */
function parsePreambleBlock(rawBlock: string): ParsedPreambleBlock {
	const lines = rawBlock.split("\n");
	const headingLine = lines.shift() ?? "";
	const headingLevel = headingLine.startsWith("### ") ? 3 : 2;
	const heading = headingLine.replace(/^###\s+/, "").replace(/^##\s+/, "");
	const parsedLines: PreambleLine[] = [];

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (trimmedLine.length === 0) {
			continue;
		}

		const orderedMatch = /^(\d+\.)\s+(.*)$/.exec(trimmedLine);
		if (orderedMatch !== null) {
			parsedLines.push({
				kind: "ordered",
				marker: orderedMatch[1] ?? null,
				text: orderedMatch[2] ?? ""
			});
			continue;
		}

		const bulletMatch = /^-\s+(.*)$/.exec(trimmedLine);
		if (bulletMatch !== null) {
			parsedLines.push({
				kind: "bullet",
				marker: "•",
				text: bulletMatch[1] ?? ""
			});
			continue;
		}

		parsedLines.push({
			kind: "paragraph",
			marker: null,
			text: trimmedLine
		});
	}

	return {
		headingLevel,
		heading,
		lines: parsedLines
	};
}

export function AuditExecuteForm({ placeId, projectId }: Readonly<AuditExecuteFormProps>) {
	const t = useTranslations("auditor.execute");
	const authSession = useAuthSession();
	const [selectedMode, setSelectedMode] = React.useState<ExecutionModeSelection>("");
	const [activeSectionKey, setActiveSectionKey] = React.useState<string | null>(null);
	const [session, setSession] = React.useState<AuditSession | null>(null);
	const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
	const [saveError, setSaveError] = React.useState<string | null>(null);
	const [preAuditValues, setPreAuditValues] = React.useState<Record<string, string | string[]>>({});
	const [sectionDrafts, setSectionDrafts] = React.useState<Record<string, SectionDraftState>>({});
	const [finalComments, setFinalComments] = React.useState("");
	const initializedAuditIdRef = React.useRef<string | null>(null);
	const lastQueuedJsonRef = React.useRef<string | null>(null);
	const lastSavedJsonRef = React.useRef<string | null>(null);

	const createOrResumeQuery = useQuery({
		queryKey: ["playspace", "auditor", "execute", projectId, placeId],
		queryFn: () => playspaceApi.auditor.createOrResumeAudit(placeId, projectId)
	});
	const instrument = useLocalizedInstrument(session?.instrument ?? createOrResumeQuery.data?.instrument ?? null);

	React.useEffect(() => {
		if (!createOrResumeQuery.data) {
			return;
		}

		const incomingSession = createOrResumeQuery.data;
		if (initializedAuditIdRef.current === incomingSession.audit_id) {
			return;
		}

		const nextSelectedMode: ExecutionModeSelection =
			incomingSession.selected_execution_mode ??
			incomingSession.meta.execution_mode ??
			(incomingSession.allowed_execution_modes.length === 1 ? incomingSession.allowed_execution_modes[0] : "");
		const nextFinalComments = incomingSession.meta.final_comments ?? "";
		const nextPreAuditValues = getPreAuditValues(incomingSession);
		const nextSectionDrafts = createSectionDrafts(incomingSession, instrument!);

		initializedAuditIdRef.current = incomingSession.audit_id;
		const initialPatch = buildDraftPatchFromState({
			selectedMode: nextSelectedMode,
			finalComments: nextFinalComments,
			preAuditValues: nextPreAuditValues,
			sectionDrafts: nextSectionDrafts,
			schemaVersion: incomingSession.schema_version,
			expectedRevision: incomingSession.revision
		});
		const initialPatchJson = JSON.stringify(initialPatch.aggregate ?? null);
		lastQueuedJsonRef.current = initialPatchJson;
		lastSavedJsonRef.current = initialPatchJson;
		setSession(incomingSession);
		setSelectedMode(nextSelectedMode);
		setFinalComments(nextFinalComments);
		setPreAuditValues(nextPreAuditValues);
		setSectionDrafts(nextSectionDrafts);
		setSaveError(null);
	}, [createOrResumeQuery.data, instrument]);

	const patchDraft = useMutation({
		mutationFn: async (input: { auditId: string; patch: AuditDraftPatch; aggregateJson: string }) =>
			playspaceApi.auditor.patchAuditDraft(input.auditId, input.patch),
		onSuccess: (saveResult, variables) => {
			lastQueuedJsonRef.current = variables.aggregateJson;
			lastSavedJsonRef.current = variables.aggregateJson;
			setLastSavedAt(new Date(saveResult.saved_at));
			setSaveError(null);
			setSession(currentSession => {
				if (currentSession === null) {
					return currentSession;
				}

				return {
					...currentSession,
					schema_version: saveResult.schema_version,
					revision: saveResult.revision,
					aggregate: {
						...currentSession.aggregate,
						schema_version: saveResult.schema_version,
						revision: saveResult.revision
					}
				};
			});
		},
		onError: error => {
			lastQueuedJsonRef.current = lastSavedJsonRef.current;
			setSaveError(error instanceof Error ? error.message : t("errors.autoSaveFailed"));
		}
	});

	const submitAudit = useMutation({
		mutationFn: async (input: { auditId: string; expectedRevision: number }) =>
			playspaceApi.auditor.submitAudit(input.auditId, input.expectedRevision),
		onSuccess: updatedSession => {
			setSession(updatedSession);
			setFinalComments(updatedSession.meta.final_comments ?? "");
			setLastSavedAt(new Date());
			setSaveError(null);
		},
		onError: error => {
			setSaveError(error instanceof Error ? error.message : t("errors.submitFailed"));
		}
	});

	const buildDraftPatch = React.useCallback((): AuditDraftPatch => {
		if (session === null) {
			return {
				expected_revision: 0,
				aggregate: {
					schema_version: 1,
					meta: null,
					pre_audit: null,
					sections: {}
				},
				sections: {}
			};
		}

		return buildDraftPatchFromState({
			selectedMode,
			finalComments,
			preAuditValues,
			sectionDrafts,
			schemaVersion: session.schema_version,
			expectedRevision: session.revision
		});
	}, [finalComments, preAuditValues, sectionDrafts, selectedMode, session]);

	React.useEffect(() => {
		if (!session || session.status === "SUBMITTED") {
			return;
		}

		const patch = buildDraftPatch();
		const serializedAggregateJson = JSON.stringify(patch.aggregate ?? null);
		if (serializedAggregateJson === lastQueuedJsonRef.current) {
			return;
		}

		lastQueuedJsonRef.current = serializedAggregateJson;
		setSaveError(null);

		const timeoutHandle = globalThis.setTimeout(() => {
			patchDraft.mutate({
				auditId: session.audit_id,
				patch,
				aggregateJson: serializedAggregateJson
			});
		}, 900);

		return () => {
			globalThis.clearTimeout(timeoutHandle);
		};
	}, [buildDraftPatch, patchDraft, session]);

	const executionMode = selectedMode === "" ? null : selectedMode;
	const preambleBlocks = React.useMemo(() => {
		return instrument?.preamble.map(parsePreambleBlock) ?? [];
	}, [instrument]);
	const auditInfoQuestions = React.useMemo(() => {
		return instrument?.pre_audit_questions.filter(question => question.page_key === "audit_info") ?? [];
	}, [instrument?.pre_audit_questions]);
	const spaceAuditQuestions = React.useMemo(() => {
		return getVisiblePreAuditQuestions(
			instrument?.pre_audit_questions.filter(question => question.page_key === "space_setup") ?? [],
			executionMode
		);
	}, [executionMode, instrument?.pre_audit_questions]);
	const matrixSpaceAuditQuestions = React.useMemo(() => {
		return spaceAuditQuestions.filter(question => question.group_key === "current_users_matrix");
	}, [spaceAuditQuestions]);
	const standaloneSpaceAuditQuestions = React.useMemo(() => {
		return spaceAuditQuestions.filter(question => question.group_key !== "current_users_matrix");
	}, [spaceAuditQuestions]);
	const instrumentRef = instrument!;
	const visibleSections = React.useMemo(() => {
		return getVisibleSections(
			instrumentRef,
			executionMode,
			Object.fromEntries(
				Object.entries(sectionDrafts).map(([sectionKey, draft]) => [sectionKey, draft.responses])
			)
		);
	}, [executionMode, instrumentRef, sectionDrafts]);

	const sectionRows = React.useMemo<SectionProgressRow[]>(() => {
		return visibleSections.map(section => ({
			section,
			progress: getInstrumentSectionLocalProgress(section, sectionDrafts[section.section_key]?.responses ?? {})
		}));
	}, [sectionDrafts, visibleSections]);

	React.useEffect(() => {
		if (sectionRows.length === 0) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- sync active section with visible sections
			setActiveSectionKey(null);
			return;
		}

		const currentSectionStillVisible = sectionRows.some(
			sectionRow => sectionRow.section.section_key === activeSectionKey
		);
		if (currentSectionStillVisible) {
			return;
		}

		setActiveSectionKey(getInitialActiveSectionKey(sectionRows));
	}, [activeSectionKey, sectionRows]);

	const activeSectionIndex = sectionRows.findIndex(sectionRow => sectionRow.section.section_key === activeSectionKey);
	const activeSection = activeSectionIndex >= 0 ? sectionRows[activeSectionIndex] : null;
	const previousSection = activeSectionIndex > 0 ? sectionRows[activeSectionIndex - 1] : null;
	const nextSection =
		activeSectionIndex >= 0 && activeSectionIndex < sectionRows.length - 1
			? sectionRows[activeSectionIndex + 1]
			: null;

	const requiredPreAuditComplete = isRequiredPreAuditComplete(
		instrument?.pre_audit_questions ?? [],
		preAuditValues,
		executionMode
	);
	const answeredVisibleQuestions = sectionRows.reduce((totalAnswered, sectionRow) => {
		return totalAnswered + sectionRow.progress.answeredQuestionCount;
	}, 0);
	const totalVisibleQuestions = sectionRows.reduce((totalQuestions, sectionRow) => {
		return totalQuestions + sectionRow.progress.visibleQuestionCount;
	}, 0);
	const readyToSubmit =
		executionMode !== null &&
		requiredPreAuditComplete &&
		sectionRows.every(sectionRow => sectionRow.progress.isComplete);
	const isReadOnly = session?.status === "SUBMITTED";
	const incompleteSectionCount = sectionRows.filter(sectionRow => !sectionRow.progress.isComplete).length;
	const submissionBlockers = [
		executionMode === null ? t("submission.blockers.chooseExecutionMode") : null,
		!requiredPreAuditComplete ? t("submission.blockers.completePreAudit") : null,
		incompleteSectionCount > 0
			? t("submission.blockers.finishRemainingSections", { count: incompleteSectionCount })
			: null
	].filter((value): value is string => value !== null);
	const activeSectionQuestionRows = React.useMemo(() => {
		if (activeSection === null) {
			return [];
		}

		return activeSection.section.questions.map(question => ({
			question,
			selectedAnswers: sectionDrafts[activeSection.section.section_key]?.responses[question.question_key] ?? {}
		}));
	}, [activeSection, sectionDrafts]);

	function handleSaveNow() {
		if (!session || isReadOnly) {
			return;
		}

		const patch = buildDraftPatch();
		const aggregateJson = JSON.stringify(patch.aggregate ?? null);
		if (aggregateJson === lastSavedJsonRef.current) {
			return;
		}

		lastQueuedJsonRef.current = aggregateJson;
		patchDraft.mutate({
			auditId: session.audit_id,
			patch,
			aggregateJson
		});
	}

	function handlePreAuditSingleSelect(questionKey: string, optionKey: string) {
		if (isReadOnly) {
			return;
		}

		setPreAuditValues(currentValues => ({
			...currentValues,
			[questionKey]: optionKey
		}));
	}

	function handlePreAuditToggleSelect(questionKey: string, optionKey: string) {
		if (isReadOnly) {
			return;
		}

		setPreAuditValues(currentValues => {
			const currentValue = currentValues[questionKey];
			const currentItems = Array.isArray(currentValue) ? currentValue : [];
			const nextItems = currentItems.includes(optionKey)
				? currentItems.filter(value => value !== optionKey)
				: [...currentItems, optionKey];

			return {
				...currentValues,
				[questionKey]: nextItems
			};
		});
	}

	function handleQuestionAnswer(sectionKey: string, questionKey: string, nextAnswers: QuestionResponsePayload) {
		if (isReadOnly) {
			return;
		}

		setSectionDrafts(currentDrafts => {
			const currentSectionDraft = currentDrafts[sectionKey] ?? { note: "", responses: {} };

			return {
				...currentDrafts,
				[sectionKey]: {
					...currentSectionDraft,
					responses: {
						...currentSectionDraft.responses,
						[questionKey]: nextAnswers
					}
				}
			};
		});
	}

	function handleSectionNoteChange(sectionKey: string, nextNote: string) {
		if (isReadOnly) {
			return;
		}

		setSectionDrafts(currentDrafts => {
			const currentSectionDraft = currentDrafts[sectionKey] ?? { note: "", responses: {} };
			return {
				...currentDrafts,
				[sectionKey]: {
					...currentSectionDraft,
					note: nextNote
				}
			};
		});
	}

	if (createOrResumeQuery.isLoading) {
		return <div className="h-64 animate-pulse rounded-card border border-border bg-card" />;
	}

	if (createOrResumeQuery.isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("error.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">{t("error.description")}</p>
					<BackButton href="/auditor/places" label={t("actions.backToPlaces")} />
				</CardContent>
			</Card>
		);
	}

	if (createOrResumeQuery.data && !instrument) {
		return <div className="h-40 animate-pulse rounded-card border border-border bg-card" />;
	}

	if (!session) {
		return <div className="h-64 animate-pulse rounded-card border border-border bg-card" />;
	}

	return (
		<div className="space-y-6">
			<div className="sticky top-16 z-20 -mx-4 border-b border-border/70 bg-background/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-2">
						<h1 className="text-2xl font-semibold tracking-tight">{t("header.title")}</h1>
						<p className="text-sm text-muted-foreground">
							{t("header.place", { name: session.place_name })}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2 lg:justify-end">
						<Badge variant="outline" className="font-medium text-foreground">
							{t(`status.${session.status.toLowerCase()}`)}
						</Badge>
						<Badge variant="secondary" className="font-medium">
							{t("header.questionsAnswered", {
								answered: answeredVisibleQuestions,
								total: totalVisibleQuestions
							})}
						</Badge>
						{patchDraft.isPending ? (
							<Badge variant="secondary">{t("header.saving")}</Badge>
						) : lastSavedAt ? (
							<Badge variant="secondary">{t("header.savedAt", { time: formatTime(lastSavedAt) })}</Badge>
						) : (
							<Badge variant="outline">{t("header.noUnsavedChanges")}</Badge>
						)}
						{saveError ? <Badge variant="destructive">{saveError}</Badge> : null}
						<BackButton href="/auditor/places" label={t("actions.backToPlaces")} />
						<Button
							type="button"
							variant="outline"
							onClick={handleSaveNow}
							disabled={patchDraft.isPending || isReadOnly}>
							{t("actions.saveNow")}
						</Button>
						<Button
							type="button"
							disabled={!readyToSubmit || submitAudit.isPending || isReadOnly}
							onClick={() => {
								submitAudit.mutate({
									auditId: session.audit_id,
									expectedRevision: session.revision
								});
							}}>
							{submitAudit.isPending ? t("actions.submitting") : t("actions.submitAudit")}
						</Button>
					</div>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("setup.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">{t("setup.subtitle")}</p>
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
						<div className="space-y-4">
							{preambleBlocks.map(block => (
								<PreambleBlockCard key={`${block.headingLevel}:${block.heading}`} block={block} />
							))}
						</div>
						<div className="space-y-4">
							<Card>
								<CardHeader>
									<CardTitle>{t("setup.roleTitle")}</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<p className="text-sm text-muted-foreground">{t("setup.roleQuestion")}</p>
									<div className="grid gap-3">
										{instrument?.execution_modes
											.filter(mode =>
												session.allowed_execution_modes.includes(mode.key as ExecutionMode)
											)
											.map(mode => {
												const isSelected = selectedMode === mode.key;

												return (
													<button
														key={mode.key}
														type="button"
														disabled={isReadOnly}
														onClick={() => {
															setSelectedMode(mode.key as ExecutionMode);
														}}
														className={cn(
															"rounded-card border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
															isSelected
																? "border-primary bg-primary/12 shadow-field"
																: "border-action-outline-border bg-card hover:bg-secondary/60",
															isReadOnly && "cursor-not-allowed opacity-70"
														)}>
														<p className="text-sm font-medium text-foreground">
															{mode.label}
														</p>
														<p className="mt-2 text-sm text-muted-foreground">
															{mode.description ?? t("executionMode.noDescription")}
														</p>
													</button>
												);
											})}
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("auditInfo.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">{t("auditInfo.subtitle")}</p>
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
						<div className="grid gap-4 md:grid-cols-2">
							{auditInfoQuestions.map(question => (
								<AutoFieldCard
									key={question.key}
									question={question}
									value={formatAutoValue(question.key, session, authSession?.auditorCode ?? null, t)}
								/>
							))}
						</div>
						<div className="field-card">
							<div className="field-card-body space-y-3">
								<div className="space-y-1">
									<h3 className="field-card-title">{t("auditInfo.summaryTitle")}</h3>
									<p className="field-card-meta">{t("auditInfo.summaryDescription")}</p>
								</div>
								<div className="space-y-2 text-sm text-muted-foreground">
									<p>
										{t("auditInfo.auditCode", {
											value: formatAuditCodeReference(session.audit_code)
										})}
									</p>
									<p>{t("auditInfo.place", { value: session.place_name })}</p>
									<p>{t("auditInfo.project", { value: session.project_name })}</p>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{executionMode === "survey" ? (
				<Card>
					<CardHeader>
						<CardTitle>{t("spaceAudit.skippedTitle")}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">{t("spaceAudit.skippedDescription")}</p>
					</CardContent>
				</Card>
			) : executionMode !== null ? (
				<Card>
					<CardHeader>
						<CardTitle>{t("spaceAudit.title")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">{t("spaceAudit.subtitle")}</p>
						{matrixSpaceAuditQuestions.length > 0 ? (
							<MatrixPreAuditCard
								questions={matrixSpaceAuditQuestions}
								values={preAuditValues}
								disabled={isReadOnly}
								onSelectOption={(questionKey, optionKey) => {
									handlePreAuditSingleSelect(questionKey, optionKey);
								}}
							/>
						) : null}
						<div className="grid gap-4 lg:grid-cols-2">
							{standaloneSpaceAuditQuestions.map(question => {
								const questionValue = preAuditValues[question.key];
								return (
									<ChoiceFieldCard
										key={question.key}
										question={question}
										value={questionValue}
										disabled={isReadOnly}
										onSingleSelect={optionKey => {
											handlePreAuditSingleSelect(question.key, optionKey);
										}}
										onToggleSelect={optionKey => {
											handlePreAuditToggleSelect(question.key, optionKey);
										}}
									/>
								);
							})}
						</div>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>{t("sections.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{executionMode === null ? (
						<p className="text-sm text-muted-foreground">{t("sections.chooseMode")}</p>
					) : (
						<>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-sm text-muted-foreground">
									{incompleteSectionCount > 0
										? t("sections.incompleteSummary", { count: incompleteSectionCount })
										: t("sections.completeSummary")}
								</p>
								<Badge variant={readyToSubmit ? "secondary" : "outline"}>
									{readyToSubmit
										? t("submission.readyBadge")
										: t("sections.remainingBadge", { count: incompleteSectionCount })}
								</Badge>
							</div>
							<div className="grid gap-3 lg:grid-cols-2">
								{sectionRows.map(sectionRow => {
									const remainingQuestionCount =
										sectionRow.progress.visibleQuestionCount -
										sectionRow.progress.answeredQuestionCount;
									const isActive = sectionRow.section.section_key === activeSectionKey;

									return (
										<button
											key={sectionRow.section.section_key}
											type="button"
											onClick={() => {
												setActiveSectionKey(sectionRow.section.section_key);
											}}
											className={cn(
												"rounded-card border p-4 text-left transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
												isActive
													? "border-primary bg-primary/12 shadow-field"
													: sectionRow.progress.isComplete
														? "border-status-success-border border-l-4 border-l-status-success bg-status-success-surface hover:bg-status-success-surface"
														: "border-action-outline-border bg-card hover:bg-secondary/60"
											)}>
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<p className="font-medium text-foreground">
														{sectionRow.section.title}
													</p>
													<p className="text-sm text-muted-foreground">
														{t("sections.answered", {
															answered: sectionRow.progress.answeredQuestionCount,
															total: sectionRow.progress.visibleQuestionCount
														})}
													</p>
													<p className="text-xs text-muted-foreground">
														{sectionRow.progress.isComplete
															? t("sections.allRequiredComplete")
															: t("sections.questionsRemaining", {
																	count: remainingQuestionCount
																})}
													</p>
												</div>
												<Badge
													variant={sectionRow.progress.isComplete ? "secondary" : "outline"}>
													{sectionRow.progress.isComplete ? (
														<span className="inline-flex items-center gap-1.5">
															<CheckCircle2Icon className="size-3.5" aria-hidden="true" />
															<span>{t("common.complete")}</span>
														</span>
													) : (
														t("sections.remainingShort", { count: remainingQuestionCount })
													)}
												</Badge>
											</div>
										</button>
									);
								})}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("submission.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						{readyToSubmit ? t("submission.readyDescription") : t("submission.incompleteDescription")}
					</p>
					{readyToSubmit ? (
						<div className="space-y-2">
							<Label htmlFor="submission-final-comments">{t("submission.finalCommentsLabel")}</Label>
							<Textarea
								id="submission-final-comments"
								value={finalComments}
								onChange={event => {
									if (isReadOnly) {
										return;
									}
									setFinalComments(event.target.value);
								}}
								placeholder={t("submission.finalCommentsPlaceholder")}
								disabled={isReadOnly}
								rows={6}
							/>
							<p className="text-sm text-muted-foreground">{t("submission.finalCommentsHint")}</p>
						</div>
					) : null}
					{submissionBlockers.length > 0 ? (
						<ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
							{submissionBlockers.map(blocker => (
								<li key={blocker}>{blocker}</li>
							))}
						</ul>
					) : null}
					<Badge variant={readyToSubmit ? "secondary" : "outline"}>
						{readyToSubmit
							? t("submission.readyBadge")
							: t("submission.remainingBadge", { count: submissionBlockers.length })}
					</Badge>
				</CardContent>
			</Card>

			{activeSection ? (
				<Card>
					<CardHeader>
						<CardTitle>{activeSection.section.title}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<RichTextLine
							text={activeSection.section.description ?? "Description Unavailable"}
							secondaryText={
								"**Instructions:** " + (activeSection.section.instruction ?? "Instruction Unavailable")
							}
							className="text-sm text-muted-foreground"
						/>

						<div className="space-y-4">
							<div
								className={cn(
									"hidden xl:block",
									activeSection.section.questions.some(
										question => question.question_type === "checklist"
									)
										? "xl:hidden"
										: undefined
								)}>
								<SectionQuestionTable
									rows={activeSectionQuestionRows}
									disabled={isReadOnly}
									onSelectAnswer={(questionKey: string, scaleKey: string, optionKey: string) => {
										const question = activeSection.section.questions.find(
											currentQuestion => currentQuestion.question_key === questionKey
										);
										if (!question) {
											return;
										}

										handleQuestionAnswer(
											activeSection.section.section_key,
											questionKey,
											buildNextQuestionAnswers(
												activeSectionQuestionRows.find(
													row => row.question.question_key === questionKey
												)?.selectedAnswers ?? {},
												question,
												scaleKey,
												optionKey
											)
										);
									}}
								/>
							</div>
							<div className="space-y-4 xl:hidden">
								{activeSection.section.questions.map(question => (
									<AuditQuestionCard
										key={question.question_key}
										question={question}
										selectedAnswers={
											sectionDrafts[activeSection.section.section_key]?.responses[
												question.question_key
											] ?? {}
										}
										disabled={isReadOnly}
										onChangeAnswers={(questionKey, nextAnswers) => {
											handleQuestionAnswer(
												activeSection.section.section_key,
												questionKey,
												nextAnswers
											);
										}}
									/>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor={`section-note-${activeSection.section.section_key}`}>
								{t("activeSection.notesLabel")}
							</Label>
							<p className="text-sm leading-6 text-muted-foreground">
								{activeSection.section.notes_prompt ?? t("activeSection.notesFallback")}
							</p>
							<Textarea
								id={`section-note-${activeSection.section.section_key}`}
								rows={5}
								disabled={isReadOnly}
								value={sectionDrafts[activeSection.section.section_key]?.note ?? ""}
								onChange={event => {
									handleSectionNoteChange(activeSection.section.section_key, event.target.value);
								}}
								placeholder={t("activeSection.notesPlaceholder")}
							/>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									disabled={previousSection === null}
									onClick={() => {
										if (previousSection) {
											setActiveSectionKey(previousSection.section.section_key);
										}
									}}>
									{t("activeSection.previousSection")}
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={nextSection === null}
									onClick={() => {
										if (nextSection) {
											setActiveSectionKey(nextSection.section.section_key);
										}
									}}>
									{t("activeSection.nextSection")}
								</Button>
							</div>
							<Badge variant={activeSection.progress.isComplete ? "secondary" : "outline"}>
								{t("sections.answered", {
									answered: activeSection.progress.answeredQuestionCount,
									total: activeSection.progress.visibleQuestionCount
								})}
							</Badge>
						</div>
					</CardContent>
				</Card>
			) : null}

			{isReadOnly ? (
				<Card>
					<CardHeader>
						<CardTitle>{t("submittedCard.title")}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">{t("submittedCard.description")}</p>
						<Button asChild variant="outline">
							<Link href={`/auditor/reports/${encodeURIComponent(session.audit_id)}`}>
								{t("submittedCard.openReport")}
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}

interface FieldCardProps {
	readonly title: string;
	readonly description: string | null | undefined;
	readonly children: React.ReactNode;
}

/**
 * Shared framed field shell used by pre-audit cards.
 */
function FieldCard({ title, description, children }: Readonly<FieldCardProps>) {
	return (
		<div className="field-card">
			<div className="field-card-body">
				<div className="space-y-1">
					<h3 className="field-card-title">{title}</h3>
					{description ? <p className="field-card-meta">{description}</p> : null}
				</div>
				{children}
			</div>
		</div>
	);
}

interface AutoFieldCardProps {
	readonly question: PreAuditQuestion;
	readonly value: string;
}

/**
 * Render one read-only pre-audit auto field.
 */
function AutoFieldCard({ question, value }: Readonly<AutoFieldCardProps>) {
	return (
		<FieldCard title={question.label} description={question.description}>
			<p className="text-sm font-semibold text-foreground">{value}</p>
		</FieldCard>
	);
}

interface PreambleBlockCardProps {
	readonly block: ParsedPreambleBlock;
}

/**
 * Render one structured preamble block.
 */
function PreambleBlockCard({ block }: Readonly<PreambleBlockCardProps>) {
	const isScaleBlock = block.headingLevel === 3;

	return (
		<div
			className={cn(
				"rounded-card border p-4",
				isScaleBlock ? "border-primary/25 bg-primary/5" : "border-border bg-card"
			)}>
			<div className="space-y-3">
				<h3 className={cn("font-semibold", isScaleBlock ? "text-primary" : "text-foreground")}>
					{block.heading}
				</h3>
				<div className="space-y-2">
					{block.lines.map((line, index) => {
						if (line.kind === "paragraph") {
							return (
								<RichTextLine
									key={`${block.heading}-${index.toString()}`}
									text={line.text}
									className="text-sm leading-6 text-muted-foreground"
								/>
							);
						}

						return (
							<div
								key={`${block.heading}-${index.toString()}`}
								className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
								<span className="min-w-4 font-semibold text-foreground">{line.marker}</span>
								<RichTextLine text={line.text} className="flex-1" />
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

interface RichTextLineProps {
	readonly text: string;
	readonly secondaryText?: string;
	readonly className?: string;
}

/**
 * Render one line with inline bold markers preserved.
 */
function RichTextLine({ text, secondaryText, className }: Readonly<RichTextLineProps>) {
	const segments = parsePromptSegments(text);
	const secondarySegments = parsePromptSegments(secondaryText ?? "");

	return (
		<p className={cn("text-sm leading-6 text-muted-foreground", className)}>
			{segments.map((segment, index) => (
				<Fragment key={`${segment.text}-${index.toString()}`}>
					<span
						key={`${segment.text}-${index.toString()}`}
						className={segment.bold ? "font-semibold text-primary" : undefined}>
						{segment.text}
					</span>
				</Fragment>
			))}
			{secondaryText ? (
				<div className="text-sm leading-6 mt-4 text-muted-foreground">
					{secondarySegments.map((segment, index) => (
						<Fragment key={`${segment.text}-${index.toString()}`}>
							<span
								key={`${segment.text}-${index.toString()}`}
								className={segment.bold ? "font-semibold text-primary" : undefined}>
								{segment.text}
							</span>
						</Fragment>
					))}
				</div>
			) : null}
		</p>
	);
}

interface ChoiceFieldCardProps {
	readonly question: PreAuditQuestion;
	readonly value: string | string[] | undefined;
	readonly disabled: boolean;
	readonly onSingleSelect: (optionKey: string) => void;
	readonly onToggleSelect: (optionKey: string) => void;
}

/**
 * Render one selectable pre-audit field using instrument-defined options.
 */
function ChoiceFieldCard({
	question,
	value,
	disabled,
	onSingleSelect,
	onToggleSelect
}: Readonly<ChoiceFieldCardProps>) {
	const selectedValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];

	return (
		<FieldCard title={question.label} description={question.description}>
			<div className="grid gap-2 sm:grid-cols-2">
				{question.options.map(option => {
					const isSelected = selectedValues.includes(option.key);

					return (
						<Button
							key={`${question.key}.${option.key}`}
							type="button"
							variant="outline"
							disabled={disabled}
							className={cn(
								"h-auto min-h-12 justify-center whitespace-normal px-4 py-3 text-center",
								isSelected
									? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
									: "border-action-outline-border bg-background text-foreground hover:border-foreground/35 hover:bg-secondary/70"
							)}
							onClick={() => {
								if (question.input_type === "single_select") {
									onSingleSelect(option.key);
									return;
								}

								onToggleSelect(option.key);
							}}>
							{option.label}
						</Button>
					);
				})}
			</div>
		</FieldCard>
	);
}

interface MatrixPreAuditCardProps {
	readonly questions: readonly PreAuditQuestion[];
	readonly values: Readonly<Record<string, string | string[]>>;
	readonly disabled: boolean;
	readonly onSelectOption: (questionKey: string, optionKey: string) => void;
}

/**
 * Render the age-group matrix for the onsite setup step.
 */
function MatrixPreAuditCard({ questions, values, disabled, onSelectOption }: Readonly<MatrixPreAuditCardProps>) {
	const t = useTranslations("auditor.execute.spaceAudit");
	const matrixOptions = questions[0]?.options ?? [];

	if (questions.length === 0) {
		return null;
	}

	return (
		<FieldCard title={t("matrixTitle")} description={t("matrixDescription")}>
			<div className="overflow-x-auto">
				<div
					className="grid min-w-[720px] rounded-card border border-border"
					style={{
						gridTemplateColumns: [
							"minmax(180px, 1.3fr)",
							...matrixOptions.map(() => "minmax(120px, 1fr)")
						].join(" ")
					}}>
					<div className="border-r border-border bg-secondary/50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
						{t("matrixAgeColumn")}
					</div>
					{matrixOptions.map(option => (
						<div
							key={option.key}
							className="border-r border-border bg-secondary/50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary last:border-r-0">
							{option.label}
						</div>
					))}
					{questions.map((question, rowIndex) => (
						<React.Fragment key={question.key}>
							<div
								className={cn(
									"border-r border-t border-border px-4 py-4",
									rowIndex % 2 === 0 ? "bg-card" : "bg-secondary/20"
								)}>
								<p className="text-sm font-medium text-foreground">{question.label}</p>
							</div>
							{matrixOptions.map(option => {
								const isSelected = values[question.key] === option.key;

								return (
									<div
										key={`${question.key}.${option.key}`}
										className={cn(
											"border-r border-t border-border px-3 py-3 last:border-r-0",
											rowIndex % 2 === 0 ? "bg-card" : "bg-secondary/20"
										)}>
										<Button
											type="button"
											variant="outline"
											disabled={disabled}
											className={cn(
												"h-auto w-full justify-center whitespace-normal px-3 py-3 text-center",
												isSelected
													? "border-primary bg-primary text-primary-foreground"
													: "border-action-outline-border bg-background text-foreground hover:bg-secondary/60"
											)}
											onClick={() => {
												onSelectOption(question.key, option.key);
											}}>
											{option.label}
										</Button>
									</div>
								);
							})}
						</React.Fragment>
					))}
				</div>
			</div>
		</FieldCard>
	);
}
