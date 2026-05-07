"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	FileTextIcon,
	DownloadIcon,
	PlusCircleIcon,
	CheckIcon,
	CopyIcon
} from "lucide-react";

import type { AuditActivityRow } from "./audits-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getExecutionModeLabel } from "@/lib/audit/score-mode-helpers";
import { formatDateTimeLabel, formatScorePairLabel, formatScoreLabel, formatAuditCodeReference } from "./utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlaceGroup {
	placeId: string;
	placeName: string;
	projectId: string;
	projectName: string;
	rows: AuditActivityRow[];
}

interface ProjectGroup {
	projectId: string;
	projectName: string;
	placeGroups: PlaceGroup[];
}

export interface GroupedReportsViewProps {
	rows: AuditActivityRow[];
	basePath: string;
	onExportSelected?: (selectedIds: string[]) => void;
	rolePrefix: "admin" | "manager";
}

// ── Grouping Logic ───────────────────────────────────────────────────────────

function groupByProjectAndPlace(rows: AuditActivityRow[]): ProjectGroup[] {
	const projectMap = new Map<string, { name: string; placeMap: Map<string, PlaceGroup> }>();

	for (const row of rows) {
		const projectId = row.projectId ?? "unknown";
		const projectName = row.projectName ?? "Unknown Project";
		const placeId = row.placeId ?? "unknown";
		const placeName = row.placeName ?? "Unknown Place";

		if (!projectMap.has(projectId)) {
			projectMap.set(projectId, { name: projectName, placeMap: new Map() });
		}
		const project = projectMap.get(projectId)!;

		if (!project.placeMap.has(placeId)) {
			project.placeMap.set(placeId, {
				placeId,
				placeName,
				projectId,
				projectName,
				rows: []
			});
		}
		project.placeMap.get(placeId)!.rows.push(row);
	}

	const projectGroups: ProjectGroup[] = [];
	for (const [projectId, { name, placeMap }] of projectMap) {
		projectGroups.push({
			projectId,
			projectName: name,
			placeGroups: Array.from(placeMap.values())
		});
	}

	return projectGroups;
}

// ── Build Place Report Dialog ────────────────────────────────────────────────

interface BuildPlaceReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	placeGroup: PlaceGroup;
	rolePrefix: "admin" | "manager";
}

function BuildPlaceReportDialog({ open, onOpenChange, placeGroup, rolePrefix }: BuildPlaceReportDialogProps) {
	const router = useRouter();
	const [selectedAuditId, setSelectedAuditId] = React.useState<string | null>(null);
	const [selectedSurveyId, setSelectedSurveyId] = React.useState<string | null>(null);
	const [selectedFullAssessmentId, setSelectedFullAssessmentId] = React.useState<string | null>(null);
	const [mode, setMode] = React.useState<"pair" | "full">("pair");

	const submittedRows = placeGroup.rows.filter(r => r.status === "SUBMITTED");
	const auditRows = submittedRows.filter(r => r.executionMode === "audit");
	const surveyRows = submittedRows.filter(r => r.executionMode === "survey");
	const fullRows = submittedRows.filter(r => r.executionMode === "both");

	const canBuildPair = selectedAuditId !== null && selectedSurveyId !== null;
	const canBuildFull = selectedFullAssessmentId !== null;
	const canBuild = mode === "pair" ? canBuildPair : canBuildFull;

	function handleBuild() {
		if (mode === "pair" && canBuildPair) {
			router.push(
				`/${rolePrefix}/reports/place-report?audit=${selectedAuditId}&survey=${selectedSurveyId}&placeId=${placeGroup.placeId}`
			);
			onOpenChange(false);
		} else if (mode === "full" && canBuildFull) {
			router.push(
				`/${rolePrefix}/reports/place-report?submission=${selectedFullAssessmentId}&placeId=${placeGroup.placeId}`
			);
			onOpenChange(false);
		}
	}

	React.useEffect(() => {
		if (!open) {
			setSelectedAuditId(null);
			setSelectedSurveyId(null);
			setSelectedFullAssessmentId(null);
			setMode("pair");
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Build Place Report</DialogTitle>
					<DialogDescription>
						Select submissions to build a report for {placeGroup.placeName}.
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-2">
					<Button
						type="button"
						variant={mode === "pair" ? "default" : "outline"}
						size="sm"
						onClick={() => setMode("pair")}>
						Audit + Survey Pair
					</Button>
					<Button
						type="button"
						variant={mode === "full" ? "default" : "outline"}
						size="sm"
						onClick={() => setMode("full")}>
						Full Assessment
					</Button>
				</div>

				<Separator />

				{mode === "pair" ? (
					<div className="flex flex-col gap-4">
						<div>
							<h4 className="mb-2 text-sm font-medium">Select Place Audit (1 required)</h4>
							{auditRows.length === 0 ? (
								<p className="text-sm text-muted-foreground">No submitted place audits available.</p>
							) : (
								<div className="flex flex-col gap-1.5">
									{auditRows.map(row => (
										<label
											key={row.id}
											className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent">
											<input
												type="radio"
												name="audit-selection"
												className="sr-only"
												checked={selectedAuditId === row.id}
												onChange={() => setSelectedAuditId(row.id)}
											/>
											<div className="flex-1">
												<p className="text-sm font-medium">
													{formatAuditCodeReference(row.auditCode)}
												</p>
												<p className="text-xs text-muted-foreground">
													{row.auditorCode} &middot;{" "}
													{row.submittedAt
														? new Date(row.submittedAt).toLocaleDateString()
														: "—"}
												</p>
											</div>
											{selectedAuditId === row.id && (
												<CheckIcon className="size-4 text-primary" />
											)}
										</label>
									))}
								</div>
							)}
						</div>
						<div>
							<h4 className="mb-2 text-sm font-medium">Select Place Survey (1 required)</h4>
							{surveyRows.length === 0 ? (
								<p className="text-sm text-muted-foreground">No submitted place surveys available.</p>
							) : (
								<div className="flex flex-col gap-1.5">
									{surveyRows.map(row => (
										<label
											key={row.id}
											className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent">
											<input
												type="radio"
												name="survey-selection"
												className="sr-only"
												checked={selectedSurveyId === row.id}
												onChange={() => setSelectedSurveyId(row.id)}
											/>
											<div className="flex-1">
												<p className="text-sm font-medium">
													{formatAuditCodeReference(row.auditCode)}
												</p>
												<p className="text-xs text-muted-foreground">
													{row.auditorCode} &middot;{" "}
													{row.submittedAt
														? new Date(row.submittedAt).toLocaleDateString()
														: "—"}
												</p>
											</div>
											{selectedSurveyId === row.id && (
												<CheckIcon className="size-4 text-primary" />
											)}
										</label>
									))}
								</div>
							)}
						</div>
					</div>
				) : (
					<div>
						<h4 className="mb-2 text-sm font-medium">Select Full Assessment (1 required)</h4>
						{fullRows.length === 0 ? (
							<p className="text-sm text-muted-foreground">No submitted full assessments available.</p>
						) : (
							<div className="flex flex-col gap-1.5">
								{fullRows.map(row => (
									<label
										key={row.id}
										className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent">
										<input
											type="radio"
											name="full-selection"
											className="sr-only"
											checked={selectedFullAssessmentId === row.id}
											onChange={() => setSelectedFullAssessmentId(row.id)}
										/>
										<div className="flex-1">
											<p className="text-sm font-medium">
												{formatAuditCodeReference(row.auditCode)}
											</p>
											<p className="text-xs text-muted-foreground">
												{row.auditorCode} &middot;{" "}
												{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "—"}
											</p>
										</div>
										{selectedFullAssessmentId === row.id && (
											<CheckIcon className="size-4 text-primary" />
										)}
									</label>
								))}
							</div>
						)}
					</div>
				)}

				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button type="button" disabled={!canBuild} onClick={handleBuild}>
						<FileTextIcon data-icon="inline-start" />
						Build Report
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ── Submission Row ───────────────────────────────────────────────────────────

interface SubmissionRowProps {
	row: AuditActivityRow;
	basePath: string;
	isSelected: boolean;
	onSelectionChange: (id: string, selected: boolean) => void;
}

function SubmissionRow({ row, basePath, isSelected, onSelectionChange }: SubmissionRowProps) {
	const mode = row.executionMode as "audit" | "survey" | "both" | null;

	return (
		<div className="flex items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-accent/30">
			<Checkbox
				checked={isSelected}
				onCheckedChange={checked => onSelectionChange(row.id, checked === true)}
				aria-label={`Select ${row.auditCode}`}
			/>
			<Link href={`${basePath}/${encodeURIComponent(row.id)}`} className="flex flex-1 items-center gap-4">
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<code className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs">
							{formatAuditCodeReference(row.auditCode)}
						</code>
						{mode && (
							<Badge variant="outline" className="text-xs">
								{getExecutionModeLabel(mode)}
							</Badge>
						)}
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						Auditor: {row.auditorCode}
						{row.submittedAt && <> &middot; Submitted {new Date(row.submittedAt).toLocaleDateString()}</>}
					</p>
				</div>
				<div className="text-right">
					{row.scorePair ? (
						<span className="font-mono text-sm tabular-nums">
							PV {row.scorePair.pv} | U {row.scorePair.u}
						</span>
					) : row.score !== null ? (
						<span className="font-mono text-sm tabular-nums">{row.score}</span>
					) : (
						<span className="text-sm text-muted-foreground">—</span>
					)}
				</div>
			</Link>
		</div>
	);
}

// ── Place Group Card ─────────────────────────────────────────────────────────

interface PlaceGroupCardProps {
	placeGroup: PlaceGroup;
	basePath: string;
	selectedIds: Set<string>;
	onSelectionChange: (id: string, selected: boolean) => void;
	rolePrefix: "admin" | "manager";
}

function PlaceGroupCard({ placeGroup, basePath, selectedIds, onSelectionChange, rolePrefix }: PlaceGroupCardProps) {
	const [isOpen, setIsOpen] = React.useState(true);
	const [buildDialogOpen, setBuildDialogOpen] = React.useState(false);
	const submittedCount = placeGroup.rows.filter(r => r.status === "SUBMITTED").length;

	return (
		<>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<div className="rounded-lg border bg-card">
					<CollapsibleTrigger asChild>
						<button
							type="button"
							className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/30">
							<div className="flex items-center gap-3">
								{isOpen ? (
									<ChevronDownIcon className="size-4 text-muted-foreground" />
								) : (
									<ChevronRightIcon className="size-4 text-muted-foreground" />
								)}
								<div>
									<p className="font-medium">{placeGroup.placeName}</p>
									<p className="text-xs text-muted-foreground">
										{submittedCount} submitted {submittedCount === 1 ? "report" : "reports"}
									</p>
								</div>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={e => {
									e.stopPropagation();
									setBuildDialogOpen(true);
								}}>
								<PlusCircleIcon data-icon="inline-start" />
								Build Place Report
							</Button>
						</button>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<Separator />
						<div className="flex flex-col gap-2 p-3">
							{placeGroup.rows.map(row => (
								<SubmissionRow
									key={row.id}
									row={row}
									basePath={basePath}
									isSelected={selectedIds.has(row.id)}
									onSelectionChange={onSelectionChange}
								/>
							))}
						</div>
					</CollapsibleContent>
				</div>
			</Collapsible>
			<BuildPlaceReportDialog
				open={buildDialogOpen}
				onOpenChange={setBuildDialogOpen}
				placeGroup={placeGroup}
				rolePrefix={rolePrefix}
			/>
		</>
	);
}

// ── Main Grouped View ────────────────────────────────────────────────────────

export function GroupedReportsView({ rows, basePath, onExportSelected, rolePrefix }: GroupedReportsViewProps) {
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

	const projectGroups = React.useMemo(() => groupByProjectAndPlace(rows), [rows]);
	const hasMultipleProjects = projectGroups.length > 1;

	function handleSelectionChange(id: string, selected: boolean) {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (selected) {
				next.add(id);
			} else {
				next.delete(id);
			}
			return next;
		});
	}

	function handleClearSelection() {
		setSelectedIds(new Set());
	}

	if (rows.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<FileTextIcon className="mx-auto size-10 text-muted-foreground/50" />
					<p className="mt-3 text-sm text-muted-foreground">No submitted reports yet.</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{selectedIds.size > 0 && (
				<div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-sm">
					<p className="text-sm font-medium">
						{selectedIds.size} {selectedIds.size === 1 ? "report" : "reports"} selected
					</p>
					<div className="flex items-center gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={handleClearSelection}>
							Clear
						</Button>
						{onExportSelected && (
							<Button type="button" size="sm" onClick={() => onExportSelected(Array.from(selectedIds))}>
								<DownloadIcon data-icon="inline-start" />
								Export Selected
							</Button>
						)}
					</div>
				</div>
			)}

			{hasMultipleProjects ? (
				projectGroups.map(projectGroup => (
					<Card key={projectGroup.projectId}>
						<CardHeader>
							<CardTitle className="text-lg">{projectGroup.projectName}</CardTitle>
							<CardDescription>
								{projectGroup.placeGroups.length}{" "}
								{projectGroup.placeGroups.length === 1 ? "place" : "places"}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col gap-3">
								{projectGroup.placeGroups.map(placeGroup => (
									<PlaceGroupCard
										key={placeGroup.placeId}
										placeGroup={placeGroup}
										basePath={basePath}
										selectedIds={selectedIds}
										onSelectionChange={handleSelectionChange}
										rolePrefix={rolePrefix}
									/>
								))}
							</div>
						</CardContent>
					</Card>
				))
			) : (
				<div className="flex flex-col gap-3">
					{projectGroups.flatMap(pg =>
						pg.placeGroups.map(placeGroup => (
							<PlaceGroupCard
								key={placeGroup.placeId}
								placeGroup={placeGroup}
								basePath={basePath}
								selectedIds={selectedIds}
								onSelectionChange={handleSelectionChange}
								rolePrefix={rolePrefix}
							/>
						))
					)}
				</div>
			)}
		</div>
	);
}
