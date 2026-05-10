"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, FileTextIcon, InfoIcon, Layers2Icon } from "lucide-react";

import type { AuditActivityRow } from "./audits-table";
import { formatAuditCodeReference, formatDateTimeLabel, formatScoreLabel, formatScorePairLabel } from "./utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getExecutionModeLabel } from "@/lib/audit/score-mode-helpers";
import { cn } from "@/lib/utils";

interface PlaceGroup {
	placeId: string;
	placeName: string;
	projectId: string;
	projectName: string;
	rows: AuditActivityRow[];
}

interface BuildPlaceReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	placeGroup: PlaceGroup;
	rolePrefix: "admin" | "manager";
}

type BuilderMode = "pair" | "full";

const fallbackText = (key: string) => {
	const values: Record<string, string> = {
		noRecentActivity: "—",
		pending: "Pending"
	};

	return values[key] ?? key;
};

function getSubmittedRows(rows: readonly AuditActivityRow[]): AuditActivityRow[] {
	return [...rows]
		.filter(row => row.status === "SUBMITTED")
		.sort((left, right) => new Date(right.submittedAt ?? 0).getTime() - new Date(left.submittedAt ?? 0).getTime());
}

function resolveInitialMode(
	auditRows: readonly AuditActivityRow[],
	surveyRows: readonly AuditActivityRow[],
	fullRows: readonly AuditActivityRow[]
): BuilderMode {
	if (auditRows.length > 0 && surveyRows.length > 0) {
		return "pair";
	}

	if (fullRows.length > 0) {
		return "full";
	}

	return "pair";
}

function formatSubmissionScore(row: AuditActivityRow): string {
	return row.scorePair
		? formatScorePairLabel(row.scorePair, fallbackText)
		: formatScoreLabel(row.score, fallbackText);
}

function CountBadge({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<Badge variant="secondary" className="text-xs">
			{children}
		</Badge>
	);
}

interface ModeCardProps {
	label: string;
	countLabel: string;
	available: boolean;
	selected: boolean;
	onSelect: () => void;
}

// Fix 1: Title spans full width on its own row; count badge and availability
// status are on the second row, spaced between.
function ModeCard({ label, countLabel, available, selected, onSelect }: Readonly<ModeCardProps>) {
	return (
		<button
			type="button"
			onClick={available ? onSelect : undefined}
			disabled={!available}
			aria-pressed={selected}
			className={cn(
				"flex flex-col gap-2 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				selected
					? "border-primary bg-primary/5 shadow-sm"
					: available
						? "border-border bg-card hover:border-foreground/20 hover:bg-accent/25"
						: "cursor-not-allowed border-border/50 bg-muted/30 opacity-70"
			)}>
			{/* Row 1: full-width title */}
			<p className="w-full text-sm font-semibold text-foreground">{label}</p>

			{/* Row 2: availability status (left) + count badge (right) */}
			<div className="flex w-full items-center justify-between gap-3">
				<p className="text-xs font-medium text-muted-foreground">{available ? "Available" : "Unavailable"}</p>
				<CountBadge>{countLabel}</CountBadge>
			</div>
		</button>
	);
}

interface SubmissionOptionProps {
	row: AuditActivityRow;
	selected: boolean;
	onSelect: () => void;
	inputName: string;
}

// Fix 2 & 3: No left-side radio spacer — content starts flush at the left edge.
// Selection indicator (check circle) moves to the top-right corner.
// "Submitted at" label added before the datetime value.
function SubmissionOption({ row, selected, onSelect, inputName }: Readonly<SubmissionOptionProps>) {
	const mode = row.executionMode as "audit" | "survey" | "both" | null;
	const modeLabel = mode ? getExecutionModeLabel(mode) : "Submission";

	return (
		<label
			className={cn(
				"group relative flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-all duration-150",
				"hover:border-foreground/20 hover:bg-accent/25 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
				selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
			)}>
			<input type="radio" name={inputName} className="sr-only" checked={selected} onChange={onSelect} />

			{/* Fix 3: Check indicator pinned to top-right */}
			<div
				className={cn(
					"absolute right-3 top-3 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
					selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
				)}>
				{selected ? <CheckIcon className="size-3.5" /> : null}
			</div>

			{/* Fix 2: Content starts at the very left — no left padding offset */}
			<div className="flex min-w-0 flex-col gap-3">
				<div className="min-w-0 space-y-2 pr-8">
					<p className="truncate text-sm font-semibold text-foreground">
						{formatAuditCodeReference(row.auditCode)}
					</p>

					<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<Badge variant="outline" className="text-[11px]">
							{modeLabel}
						</Badge>
						<span className="font-mono">{row.auditorCode}</span>
					</div>

					{/* Fix 3: Explicit "Submitted at" label */}
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<span className="font-medium text-muted-foreground">Submitted at</span>
						<span>{formatDateTimeLabel(row.submittedAt, fallbackText)}</span>
					</div>
				</div>

				<div className="py-1 text-right">
					<p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Score</p>
					<p className="font-mono text-sm text-foreground">{formatSubmissionScore(row)}</p>
				</div>
			</div>
		</label>
	);
}

function EmptySelectionState({ message }: Readonly<{ message: string }>) {
	return (
		<div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center">
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
}

function SelectionSection({
	title,
	countLabel,
	children
}: Readonly<{
	title: string;
	countLabel: string;
	children: React.ReactNode;
}>) {
	return (
		<section className="space-y-3 rounded-xl border bg-muted/10 p-4">
			<div className="flex items-center justify-between gap-3">
				<h4 className="text-sm font-semibold text-foreground">{title}</h4>
				<span className="text-xs font-medium text-muted-foreground">{countLabel}</span>
			</div>
			{children}
		</section>
	);
}

export function BuildPlaceReportDialogView({
	open,
	onOpenChange,
	placeGroup,
	rolePrefix
}: Readonly<BuildPlaceReportDialogProps>) {
	const router = useRouter();

	const submittedRows = React.useMemo(() => getSubmittedRows(placeGroup.rows), [placeGroup.rows]);

	const auditRows = React.useMemo(() => submittedRows.filter(row => row.executionMode === "audit"), [submittedRows]);

	const surveyRows = React.useMemo(
		() => submittedRows.filter(row => row.executionMode === "survey"),
		[submittedRows]
	);

	const fullRows = React.useMemo(() => submittedRows.filter(row => row.executionMode === "both"), [submittedRows]);

	const [selectedAuditId, setSelectedAuditId] = React.useState<string | null>(auditRows[0]?.id ?? null);
	const [selectedSurveyId, setSelectedSurveyId] = React.useState<string | null>(surveyRows[0]?.id ?? null);
	const [selectedFullAssessmentId, setSelectedFullAssessmentId] = React.useState<string | null>(
		fullRows[0]?.id ?? null
	);
	const [mode, setMode] = React.useState<BuilderMode>(resolveInitialMode(auditRows, surveyRows, fullRows));

	const canBuildPair = selectedAuditId !== null && selectedSurveyId !== null;
	const canBuildFull = selectedFullAssessmentId !== null;
	const canBuild = mode === "pair" ? canBuildPair : canBuildFull;

	const selectedAudit = auditRows.find(row => row.id === selectedAuditId);
	const selectedSurvey = surveyRows.find(row => row.id === selectedSurveyId);
	const selectedFull = fullRows.find(row => row.id === selectedFullAssessmentId);

	const disabledReason =
		mode === "pair"
			? !selectedAuditId && !selectedSurveyId
				? "Select one place audit and one place survey to continue."
				: !selectedAuditId
					? "Select a place audit to continue."
					: !selectedSurveyId
						? "Select a place survey to continue."
						: null
			: !selectedFullAssessmentId
				? "Select a full assessment to continue."
				: null;

	const hintText =
		mode === "pair"
			? "Choose one submitted place audit and one submitted place survey. The report builder will combine both into a single full-assessment report."
			: "Choose one existing full assessment submission that already contains both audit and survey answers.";

	const previewText =
		mode === "pair"
			? selectedAudit && selectedSurvey
				? `Builds one place report from ${formatAuditCodeReference(selectedAudit.auditCode)} and ${formatAuditCodeReference(selectedSurvey.auditCode)}.`
				: "Select both submissions to preview the combined place report."
			: selectedFull
				? `Builds one place report from ${formatAuditCodeReference(selectedFull.auditCode)}.`
				: "Select one full assessment to preview the place report.";

	const [prevDeps, setPrevDeps] = React.useState({ auditRows, fullRows, open, surveyRows });
	if (
		auditRows !== prevDeps.auditRows ||
		fullRows !== prevDeps.fullRows ||
		open !== prevDeps.open ||
		surveyRows !== prevDeps.surveyRows
	) {
		setPrevDeps({ auditRows, fullRows, open, surveyRows });
		if (open) {
			setSelectedAuditId(auditRows[0]?.id ?? null);
			setSelectedSurveyId(surveyRows[0]?.id ?? null);
			setSelectedFullAssessmentId(fullRows[0]?.id ?? null);
			setMode(resolveInitialMode(auditRows, surveyRows, fullRows));
		}
	}

	function handleBuild() {
		if (mode === "pair" && canBuildPair && selectedAuditId && selectedSurveyId) {
			router.push(
				`/${rolePrefix}/reports/place-report?audit=${selectedAuditId}&survey=${selectedSurveyId}&placeId=${placeGroup.placeId}`
			);
			onOpenChange(false);
			return;
		}

		if (mode === "full" && canBuildFull && selectedFullAssessmentId) {
			router.push(
				`/${rolePrefix}/reports/place-report?submission=${selectedFullAssessmentId}&placeId=${placeGroup.placeId}`
			);
			onOpenChange(false);
		}
	}

	return (
		<TooltipProvider>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0"
					showCloseButton>
					<div className="border-b bg-muted/30 px-6 py-5">
						<DialogHeader className="gap-3 text-left">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="space-y-2">
									<DialogTitle className="text-xl">Build a place report</DialogTitle>

									<DialogDescription className="max-w-2xl text-sm">
										Create a clear, shareable report for{" "}
										<span className="font-medium text-foreground">{placeGroup.placeName}</span> in{" "}
										<span className="font-medium text-foreground">{placeGroup.projectName}</span>.
									</DialogDescription>
								</div>

								<div className="flex flex-wrap gap-2">
									<CountBadge>{submittedRows.length} submitted</CountBadge>
								</div>
							</div>
						</DialogHeader>
					</div>

					<div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
						<div className="grid gap-3 md:grid-cols-2">
							<ModeCard
								label="Audit + survey pair"
								countLabel={`${auditRows.length} audits · ${surveyRows.length} surveys`}
								available={auditRows.length > 0 && surveyRows.length > 0}
								selected={mode === "pair"}
								onSelect={() => setMode("pair")}
							/>

							<ModeCard
								label="Existing full assessment"
								countLabel={`${fullRows.length} available`}
								available={fullRows.length > 0}
								selected={mode === "full"}
								onSelect={() => setMode("full")}
							/>
						</div>

						<div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
							<InfoIcon className="size-4 shrink-0 text-primary" />
							<p className="text-sm leading-6 text-muted-foreground">{hintText}</p>
						</div>

						{mode === "pair" ? (
							<div className="flex flex-col gap-4">
								<SelectionSection
									title="1. Select place audit"
									countLabel={`${auditRows.length} available`}>
									{auditRows.length === 0 ? (
										<EmptySelectionState message="No submitted place audits are available for this place." />
									) : (
										<div
											className={cn(
												"grid gap-3",
												auditRows.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
											)}>
											{auditRows.map(row => (
												<SubmissionOption
													key={row.id}
													row={row}
													selected={selectedAuditId === row.id}
													onSelect={() => setSelectedAuditId(row.id)}
													inputName="audit-selection"
												/>
											))}
										</div>
									)}
								</SelectionSection>

								<SelectionSection
									title="2. Select place survey"
									countLabel={`${surveyRows.length} available`}>
									{surveyRows.length === 0 ? (
										<EmptySelectionState message="No submitted place surveys are available for this place." />
									) : (
										<div
											className={cn(
												"grid gap-3",
												surveyRows.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
											)}>
											{surveyRows.map(row => (
												<SubmissionOption
													key={row.id}
													row={row}
													selected={selectedSurveyId === row.id}
													onSelect={() => setSelectedSurveyId(row.id)}
													inputName="survey-selection"
												/>
											))}
										</div>
									)}
								</SelectionSection>
							</div>
						) : (
							<SelectionSection
								title="Select full assessment"
								countLabel={`${fullRows.length} available`}>
								{fullRows.length === 0 ? (
									<EmptySelectionState message="No submitted full assessments are available for this place." />
								) : (
									<div
										className={cn(
											"grid gap-3",
											fullRows.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
										)}>
										{fullRows.map(row => (
											<SubmissionOption
												key={row.id}
												row={row}
												selected={selectedFullAssessmentId === row.id}
												onSelect={() => setSelectedFullAssessmentId(row.id)}
												inputName="full-selection"
											/>
										))}
									</div>
								)}
							</SelectionSection>
						)}

						<div className="flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3">
							<Layers2Icon className="size-4 shrink-0 text-primary" />
							<p className="text-sm leading-6 text-muted-foreground">{previewText}</p>
						</div>
					</div>

					<DialogFooter className="border-t bg-background px-6 py-4">
						<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>

							<Tooltip>
								<TooltipTrigger asChild>
									<div>
										<Button type="button" disabled={!canBuild} onClick={handleBuild}>
											<FileTextIcon data-icon="inline-start" />
											Build report
										</Button>
									</div>
								</TooltipTrigger>

								{disabledReason ? <TooltipContent side="top">{disabledReason}</TooltipContent> : null}
							</Tooltip>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
