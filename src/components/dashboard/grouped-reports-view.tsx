"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef, ExpandedState, GroupingState, Row, RowSelectionState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getGroupedRowModel,
	getSortedRowModel,
	useReactTable
} from "@tanstack/react-table";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	CopyIcon,
	DownloadIcon,
	FileTextIcon,
	InfoIcon,
	PlusCircleIcon,
	SearchIcon,
	SparklesIcon
} from "lucide-react";

import type { AuditActivityRow } from "./audits-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExecutionModeLabel } from "@/lib/audit/score-mode-helpers";
import { cn } from "@/lib/utils";

import { formatAuditCodeReference, formatDateTimeLabel, formatScoreLabel, formatScorePairLabel } from "./utils";

interface PlaceGroup {
	placeId: string;
	placeName: string;
	projectId: string;
	projectName: string;
	rows: AuditActivityRow[];
}

interface ReportTableRow extends AuditActivityRow {
	projectGroupKey: string;
	placeGroupKey: string;
	searchText: string;
}

export interface GroupedReportsViewProps {
	rows: AuditActivityRow[];
	basePath: string;
	onExportSelected?: (selectedIds: string[]) => void;
	rolePrefix: "admin" | "manager";
	searchValue?: string;
	onSearchValueChange?: (value: string) => void;
	isSearching?: boolean;
	totalCount?: number;
}

const fallbackText = (key: string) => {
	const values: Record<string, string> = {
		noRecentActivity: "—",
		pending: "Pending"
	};
	return values[key] ?? key;
};

function getProjectName(row: AuditActivityRow): string {
	return row.projectName ?? "Unknown project";
}

function getPlaceName(row: AuditActivityRow): string {
	return row.placeName ?? "Unknown place";
}

function getProjectId(row: AuditActivityRow): string {
	return row.projectId ?? "unknown-project";
}

function getPlaceId(row: AuditActivityRow): string {
	return row.placeId ?? "unknown-place";
}

function toReportTableRows(rows: AuditActivityRow[]): ReportTableRow[] {
	return rows.map(row => {
		const projectName = getProjectName(row);
		const placeName = getPlaceName(row);
		return {
			...row,
			projectGroupKey: `${projectName}:::${getProjectId(row)}`,
			placeGroupKey: `${placeName}:::${getPlaceId(row)}`,
			searchText: [row.auditCode, row.auditorCode, projectName, placeName, row.accountName]
				.filter((value): value is string => Boolean(value))
				.join(" ")
				.toLowerCase()
		};
	});
}

function makePlaceGroup(rows: AuditActivityRow[]): PlaceGroup {
	const firstRow = rows[0];
	return {
		placeId: firstRow ? getPlaceId(firstRow) : "unknown-place",
		placeName: firstRow ? getPlaceName(firstRow) : "Unknown place",
		projectId: firstRow ? getProjectId(firstRow) : "unknown-project",
		projectName: firstRow ? getProjectName(firstRow) : "Unknown project",
		rows
	};
}

function getSubmittedRows(rows: AuditActivityRow[]): AuditActivityRow[] {
	return rows
		.filter(row => row.status === "SUBMITTED")
		.sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime());
}

function getModeRows(rows: AuditActivityRow[], mode: "audit" | "survey" | "both"): AuditActivityRow[] {
	return getSubmittedRows(rows).filter(row => row.executionMode === mode);
}

function scoreLabel(row: AuditActivityRow): string {
	return row.scorePair
		? formatScorePairLabel(row.scorePair, fallbackText)
		: formatScoreLabel(row.score, fallbackText);
}

function submissionMeta(row: AuditActivityRow): string {
	return [row.auditorCode, formatDateTimeLabel(row.submittedAt, fallbackText)].filter(Boolean).join(" · ");
}

interface SelectableSubmissionCardProps {
	row: AuditActivityRow;
	selected: boolean;
	name: string;
	onSelect: () => void;
}

function SelectableSubmissionCard({ row, selected, name, onSelect }: SelectableSubmissionCardProps) {
	return (
		<label
			className={cn(
				"group flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/40 hover:bg-accent/40",
				selected && "border-primary bg-primary/5 shadow-sm"
			)}>
			<input type="radio" name={name} className="sr-only" checked={selected} onChange={onSelect} />
			<div
				className={cn(
					"mt-0.5 flex size-5 items-center justify-center rounded-full border text-primary transition-colors",
					selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/35"
				)}>
				{selected ? <CheckIcon className="size-3.5" /> : null}
			</div>
			<div className="min-w-0 flex-1 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<code className="rounded-sm bg-secondary px-2 py-1 font-mono text-xs text-foreground">
						{formatAuditCodeReference(row.auditCode)}
					</code>
					{row.executionMode ? (
						<Badge variant="outline" className="text-[11px]">
							{getExecutionModeLabel(row.executionMode as "audit" | "survey" | "both")}
						</Badge>
					) : null}
				</div>
				<p className="text-xs text-muted-foreground">{submissionMeta(row)}</p>
				<p className="text-xs font-medium text-foreground">Score: {scoreLabel(row)}</p>
			</div>
		</label>
	);
}

interface BuildPlaceReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	placeGroup: PlaceGroup;
	rolePrefix: "admin" | "manager";
}

function BuildPlaceReportDialog({ open, onOpenChange, placeGroup, rolePrefix }: BuildPlaceReportDialogProps) {
	const router = useRouter();
	const auditRows = React.useMemo(() => getModeRows(placeGroup.rows, "audit"), [placeGroup.rows]);
	const surveyRows = React.useMemo(() => getModeRows(placeGroup.rows, "survey"), [placeGroup.rows]);
	const fullRows = React.useMemo(() => getModeRows(placeGroup.rows, "both"), [placeGroup.rows]);
	const [selectedAuditId, setSelectedAuditId] = React.useState<string | null>(auditRows[0]?.id ?? null);
	const [selectedSurveyId, setSelectedSurveyId] = React.useState<string | null>(surveyRows[0]?.id ?? null);
	const [selectedFullAssessmentId, setSelectedFullAssessmentId] = React.useState<string | null>(
		fullRows[0]?.id ?? null
	);
	const [mode, setMode] = React.useState<"pair" | "full">(
		auditRows.length > 0 && surveyRows.length > 0 ? "pair" : "full"
	);

	const canBuildPair = selectedAuditId !== null && selectedSurveyId !== null;
	const canBuildFull = selectedFullAssessmentId !== null;
	const canBuild = mode === "pair" ? canBuildPair : canBuildFull;
	const selectedAudit = auditRows.find(row => row.id === selectedAuditId);
	const selectedSurvey = surveyRows.find(row => row.id === selectedSurveyId);
	const selectedFull = fullRows.find(row => row.id === selectedFullAssessmentId);

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
		if (open) {
			setSelectedAuditId(auditRows[0]?.id ?? null);
			setSelectedSurveyId(surveyRows[0]?.id ?? null);
			setSelectedFullAssessmentId(fullRows[0]?.id ?? null);
			setMode(auditRows.length > 0 && surveyRows.length > 0 ? "pair" : "full");
		}
	}, [auditRows, fullRows, open, surveyRows]);

	const buildHint =
		mode === "pair"
			? "Choose one submitted place audit and one submitted place survey. The builder combines both into a single full-assessment report."
			: "Choose one submission that was already completed as a full assessment.";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
				<div className="border-b bg-muted/30 px-6 py-5">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-xl">
							<SparklesIcon className="size-5 text-primary" />
							Build a place report
						</DialogTitle>
						<DialogDescription>
							Create a clear, shareable report for {placeGroup.placeName} in {placeGroup.projectName}.
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="space-y-5 p-6">
					<div className="grid gap-3 md:grid-cols-2">
						<button
							type="button"
							className={cn(
								"rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/35",
								mode === "pair" && "border-primary bg-primary/5 shadow-sm"
							)}
							onClick={() => setMode("pair")}>
							<div className="flex items-center justify-between gap-3">
								<p className="font-semibold">Audit + survey pair</p>
								<Badge variant={canBuildPair ? "default" : "secondary"}>
									{auditRows.length} audit · {surveyRows.length} survey
								</Badge>
							</div>
							<p className="mt-2 text-sm text-muted-foreground">
								Best when the place was evaluated with separate audit and survey submissions.
							</p>
						</button>
						<button
							type="button"
							className={cn(
								"rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/35",
								mode === "full" && "border-primary bg-primary/5 shadow-sm"
							)}
							onClick={() => setMode("full")}>
							<div className="flex items-center justify-between gap-3">
								<p className="font-semibold">Existing full assessment</p>
								<Badge variant={canBuildFull ? "default" : "secondary"}>
									{fullRows.length} available
								</Badge>
							</div>
							<p className="mt-2 text-sm text-muted-foreground">
								Use a submission that already contains audit and survey answers together.
							</p>
						</button>
					</div>

					<div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
						<div className="flex gap-2">
							<InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
							<p>{buildHint}</p>
						</div>
					</div>

					{mode === "pair" ? (
						<div className="grid gap-4 lg:grid-cols-2">
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h4 className="text-sm font-semibold">1. Select place audit</h4>
									<Badge variant="outline">{auditRows.length}</Badge>
								</div>
								{auditRows.length === 0 ? (
									<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
										No submitted place audits are available for this place.
									</p>
								) : (
									<div className="max-h-80 space-y-2 overflow-y-auto pr-1">
										{auditRows.map(row => (
											<SelectableSubmissionCard
												key={row.id}
												row={row}
												name="audit-selection"
												selected={selectedAuditId === row.id}
												onSelect={() => setSelectedAuditId(row.id)}
											/>
										))}
									</div>
								)}
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<h4 className="text-sm font-semibold">2. Select place survey</h4>
									<Badge variant="outline">{surveyRows.length}</Badge>
								</div>
								{surveyRows.length === 0 ? (
									<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
										No submitted place surveys are available for this place.
									</p>
								) : (
									<div className="max-h-80 space-y-2 overflow-y-auto pr-1">
										{surveyRows.map(row => (
											<SelectableSubmissionCard
												key={row.id}
												row={row}
												name="survey-selection"
												selected={selectedSurveyId === row.id}
												onSelect={() => setSelectedSurveyId(row.id)}
											/>
										))}
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-semibold">Select one full assessment</h4>
								<Badge variant="outline">{fullRows.length}</Badge>
							</div>
							{fullRows.length === 0 ? (
								<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
									No submitted full assessments are available for this place.
								</p>
							) : (
								<div className="grid max-h-96 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
									{fullRows.map(row => (
										<SelectableSubmissionCard
											key={row.id}
											row={row}
											name="full-selection"
											selected={selectedFullAssessmentId === row.id}
											onSelect={() => setSelectedFullAssessmentId(row.id)}
										/>
									))}
								</div>
							)}
						</div>
					)}

					<div className="rounded-xl border bg-muted/25 p-4">
						<p className="text-sm font-semibold">Report preview</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{mode === "pair" && selectedAudit && selectedSurvey
								? `Combines ${formatAuditCodeReference(selectedAudit.auditCode)} with ${formatAuditCodeReference(selectedSurvey.auditCode)}.`
								: mode === "full" && selectedFull
									? `Builds from ${formatAuditCodeReference(selectedFull.auditCode)}.`
									: "Select the required submissions to continue."}
						</p>
					</div>

					<div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="button" disabled={!canBuild} onClick={handleBuild}>
							<FileTextIcon data-icon="inline-start" />
							Build Report
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface CopyCodeButtonProps {
	value: string;
}

function CopyCodeButton({ value }: CopyCodeButtonProps) {
	const [isCopied, setIsCopied] = React.useState(false);
	const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	React.useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				globalThis.clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(value);
			setIsCopied(true);
			if (timeoutRef.current) {
				globalThis.clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = globalThis.setTimeout(() => setIsCopied(false), 1500);
		} catch {
			setIsCopied(false);
		}
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			onClick={handleCopy}
			aria-label={isCopied ? `Copied ${value}` : `Copy ${value}`}
			title={isCopied ? "Copied!" : "Copy code"}>
			{isCopied ? <CheckIcon className="size-3.5 text-status-success" /> : <CopyIcon className="size-3.5" />}
			<span className="sr-only" aria-live="polite">
				{isCopied ? "Copied!" : null}
			</span>
		</Button>
	);
}

function ScoreLegend() {
	return (
		<span className="inline-flex items-center gap-1">
			Score
			<Popover>
				<PopoverTrigger asChild>
					<Button type="button" variant="ghost" size="icon-xs" aria-label="Score abbreviation legend">
						<InfoIcon className="size-3.5 text-muted-foreground" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-56 text-sm" align="start">
					<p className="font-medium">Score legend</p>
					<p className="mt-1 text-muted-foreground">PV = Play Value. U = Usability.</p>
				</PopoverContent>
			</Popover>
		</span>
	);
}

interface GroupRowActionProps {
	row: Row<ReportTableRow>;
	placeGroup?: PlaceGroup;
	onBuildReport: (placeGroup: PlaceGroup) => void;
}

function GroupRowAction({ row, placeGroup, onBuildReport }: GroupRowActionProps) {
	if (!row.getIsGrouped() || row.depth !== 1 || !placeGroup) {
		return null;
	}

	const submittedCount = getSubmittedRows(placeGroup.rows).length;
	const canBuild =
		getModeRows(placeGroup.rows, "both").length > 0 ||
		(getModeRows(placeGroup.rows, "audit").length > 0 && getModeRows(placeGroup.rows, "survey").length > 0);

	return (
		<div className="flex items-center justify-end gap-2">
			<Badge variant="outline" className="hidden sm:inline-flex">
				{submittedCount} submitted
			</Badge>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={!canBuild}
				onClick={() => onBuildReport(placeGroup)}>
				<PlusCircleIcon data-icon="inline-start" />
				Build place report
			</Button>
		</div>
	);
}

export function GroupedReportsView({
	rows,
	basePath,
	onExportSelected,
	rolePrefix,
	searchValue,
	onSearchValueChange,
	isSearching = false,
	totalCount
}: GroupedReportsViewProps) {
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
	const [globalFilter, setGlobalFilter] = React.useState(searchValue ?? "");
	const [grouping, setGrouping] = React.useState<GroupingState>(["projectGroupKey", "placeGroupKey"]);
	const [expanded, setExpanded] = React.useState<ExpandedState>(true);
	const [buildPlaceGroup, setBuildPlaceGroup] = React.useState<PlaceGroup | null>(null);
	const skipNextSearchChangeRef = React.useRef(false);
	const previousSearchValueRef = React.useRef(searchValue);
	const tableRows = React.useMemo(() => toReportTableRows(rows), [rows]);
	const placeGroupsByKey = React.useMemo(() => {
		const groupedRows = new Map<string, AuditActivityRow[]>();
		for (const row of rows) {
			const key = `${getPlaceName(row)}:::${getPlaceId(row)}`;
			groupedRows.set(key, [...(groupedRows.get(key) ?? []), row]);
		}
		return new Map(Array.from(groupedRows, ([key, groupRows]) => [key, makePlaceGroup(groupRows)]));
	}, [rows]);

	React.useEffect(() => {
		const previousSearchValue = previousSearchValueRef.current;
		previousSearchValueRef.current = searchValue;
		if (
			searchValue !== undefined &&
			searchValue !== previousSearchValue &&
			searchValue !== globalFilter
		) {
			skipNextSearchChangeRef.current = true;
			setGlobalFilter(searchValue);
		}
	}, [globalFilter, searchValue]);

	React.useEffect(() => {
		setRowSelection({});
	}, [rows]);

	React.useEffect(() => {
		if (!onSearchValueChange) return;
		if (skipNextSearchChangeRef.current) {
			skipNextSearchChangeRef.current = false;
			return;
		}

		const timeout = globalThis.setTimeout(() => {
			onSearchValueChange(globalFilter.trim());
		}, 300);

		return () => globalThis.clearTimeout(timeout);
	}, [globalFilter, onSearchValueChange]);

	const columns = React.useMemo<ColumnDef<ReportTableRow>[]>(
		() => [
			...(onExportSelected
				? [
					{
						id: "select",
						header: "",
						enableGrouping: false,
						cell: ({ row, table }) => {
							if (row.getIsGrouped()) {
								return null;
							}
							const selection = table.getState().rowSelection;
							return (
								<Checkbox
									checked={Boolean(selection[row.id])}
									onCheckedChange={checked => row.toggleSelected(checked === true)}
									aria-label={`Select ${row.original.auditCode}`}
								/>
							);
						}
					} satisfies ColumnDef<ReportTableRow>
				]
				: []),
			{
				accessorKey: "projectGroupKey",
				header: "Project",
				cell: ({ row, getValue }) => {
					if (row.getIsGrouped()) {
						const label = String(getValue()).split(":::")[0];
						return (
							<button
								type="button"
								className="flex min-w-[240px] items-center gap-2 text-left font-semibold text-foreground"
								onClick={row.getToggleExpandedHandler()}>
								{row.getIsExpanded() ? (
									<ChevronDownIcon className="size-4" />
								) : (
									<ChevronRightIcon className="size-4" />
								)}
								<span>{label}</span>
								<Badge variant="secondary">{row.getLeafRows().length}</Badge>
							</button>
						);
					}
					return <span className="text-muted-foreground">{row.original.projectName ?? "—"}</span>;
				}
			},
			{
				accessorKey: "placeGroupKey",
				header: "Place",
				cell: ({ row, getValue }) => {
					if (row.getIsGrouped()) {
						const label = String(getValue()).split(":::")[0];
						return (
							<button
								type="button"
								className="flex min-w-[220px] items-center gap-2 text-left font-semibold text-foreground"
								onClick={row.getToggleExpandedHandler()}>
								{row.getIsExpanded() ? (
									<ChevronDownIcon className="size-4" />
								) : (
									<ChevronRightIcon className="size-4" />
								)}
								<span>{label}</span>
								<Badge variant="secondary">{row.getLeafRows().length}</Badge>
							</button>
						);
					}
					return <span>{row.original.placeName ?? "—"}</span>;
				}
			},
			{
				accessorKey: "auditCode",
				header: "Report",
				enableGrouping: false,
				cell: ({ row }) => {
					if (row.getIsGrouped()) return null;
					const mode = row.original.executionMode as "audit" | "survey" | "both" | null;
					return (
						<div className="min-w-[260px] space-y-2">
							<div className="flex items-center gap-2">
								<Link
									href={`${basePath}/${encodeURIComponent(row.original.id)}`}
									className="font-medium text-foreground hover:text-primary">
									{formatAuditCodeReference(row.original.auditCode)}
								</Link>
								<CopyCodeButton value={row.original.auditCode} />
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{mode ? (
									<Badge variant="outline" className="text-xs">
										{getExecutionModeLabel(mode)}
									</Badge>
								) : null}
								<span className="text-xs text-muted-foreground">
									Auditor {row.original.auditorCode}
								</span>
							</div>
						</div>
					);
				}
			},
			{
				accessorKey: "submittedAt",
				header: "Submitted",
				enableGrouping: false,
				cell: ({ row }) =>
					row.getIsGrouped() ? null : (
						<span>{formatDateTimeLabel(row.original.submittedAt, fallbackText)}</span>
					)
			},
			{
				id: "score",
				header: () => <ScoreLegend />,
				enableGrouping: false,
				cell: ({ row }) =>
					row.getIsGrouped() ? null : (
						<span className="font-mono text-sm tabular-nums">{scoreLabel(row.original)}</span>
					)
			},
			{
				id: "actions",
				header: "Actions",
				enableGrouping: false,
				cell: ({ row }) => {
					if (row.getIsGrouped()) {
						const placeGroup = placeGroupsByKey.get(String(row.getValue("placeGroupKey")));
						return <GroupRowAction row={row} placeGroup={placeGroup} onBuildReport={setBuildPlaceGroup} />;
					}

					return (
						<Button asChild variant="ghost" size="sm">
							<Link href={`${basePath}/${encodeURIComponent(row.original.id)}`}>View</Link>
						</Button>
					);
				}
			}
		],
		[basePath, onExportSelected, placeGroupsByKey]
	);

	// TanStack Table exposes stable instance methods; the React compiler lint can over-report this integration.
	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data: tableRows,
		columns,
		state: {
			grouping,
			expanded,
			globalFilter: onSearchValueChange ? "" : globalFilter,
			rowSelection
		},
		getRowId: row => row.id,
		onGroupingChange: setGrouping,
		onExpandedChange: setExpanded,
		onRowSelectionChange: setRowSelection,
		onGlobalFilterChange: updater => {
			setGlobalFilter(previous => String(typeof updater === "function" ? updater(previous) : (updater ?? "")));
		},
		globalFilterFn: (row, _columnId, filterValue) => {
			const query = String(filterValue).trim().toLowerCase();
			return query.length === 0 || row.original.searchText.includes(query);
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getGroupedRowModel: getGroupedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel()
	});

	const selectedReportIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
	const selectedCount = selectedReportIds.length;

	function clearSelection() {
		setRowSelection({});
	}

	const filteredLeafCount = table.getFilteredRowModel().rows.length;
	const loadedCount = rows.length;
	const reportedTotalCount = totalCount ?? loadedCount;
	const isPartialResultSet = reportedTotalCount > loadedCount;
	const placeCount = new Set(tableRows.map(row => row.placeGroupKey)).size;
	const projectCount = new Set(tableRows.map(row => row.projectGroupKey)).size;
	const allRowsExpanded = table.getIsAllRowsExpanded();

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
		<div className="space-y-4">
			<Card className="overflow-hidden">
				<CardHeader className="gap-4 border-b border-border/70">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<CardTitle>Grouped reports table</CardTitle>
							<CardDescription>
								Review submissions by project and place, then build a place report from the relevant
								group.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">{projectCount} projects</Badge>
							<Badge variant="secondary">{placeCount} places</Badge>
							<Badge variant="secondary">{loadedCount} reports loaded</Badge>
							{isPartialResultSet ? <Badge variant="outline">{reportedTotalCount} total</Badge> : null}
							{isSearching ? <Badge variant="outline">Searching…</Badge> : null}
						</div>
					</div>
					<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
						<div className="relative max-w-xl flex-1">
							<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={globalFilter}
								onChange={event => setGlobalFilter(event.target.value)}
								placeholder="Search report code, auditor, project, or place…"
								className="pl-9"
							/>
							{onSearchValueChange ? (
								<p className="mt-2 text-xs text-muted-foreground">
									Searches submitted reports on the server after you stop typing.
								</p>
							) : null}
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => table.toggleAllRowsExpanded(!allRowsExpanded)}
								aria-pressed={allRowsExpanded}>
								{allRowsExpanded ? "Collapse all" : "Expand all"}
							</Button>
							{selectedCount > 0 ? (
								<Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
									Clear selection
								</Button>
							) : null}
							{onExportSelected && selectedCount > 0 ? (
								<Button type="button" size="sm" onClick={() => onExportSelected(selectedReportIds)}>
									<DownloadIcon data-icon="inline-start" />
									Export {selectedCount}
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id} className="hover:bg-transparent">
									{headerGroup.headers.map(header => (
										<TableHead
											key={header.id}
											className={cn(header.id === "actions" && "text-right")}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length > 0 ? (
								table.getRowModel().rows.map(row => (
									<TableRow
										key={row.id}
										data-state={!row.getIsGrouped() && row.getIsSelected() ? "selected" : undefined}
										className={cn(
											row.getIsGrouped() && row.depth === 0 && "bg-muted/45 hover:bg-muted/55",
											row.getIsGrouped() && row.depth === 1 && "bg-primary/5 hover:bg-primary/10"
										)}>
										{row.getVisibleCells().map(cell => (
											<TableCell
												key={cell.id}
												className={cn(
													row.getIsGrouped() && "py-3",
													cell.column.id === "actions" && "text-right"
												)}>
												{cell.getIsPlaceholder()
													? null
													: flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow className="hover:bg-transparent">
									<TableCell
										colSpan={table.getVisibleLeafColumns().length}
										className="h-28 text-center text-sm text-muted-foreground">
										No reports match the current search.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
				<span>
					Showing {filteredLeafCount} of {loadedCount}
					{isPartialResultSet ? ` loaded (${reportedTotalCount} total matching reports)` : " reports"} grouped
					by project and place.
				</span>
				<span>
					{isPartialResultSet
						? "Narrow the search or filters to review reports that are not loaded yet."
						: onExportSelected
							? "Select individual rows for exports; use place group actions to build combined reports."
							: "Use place group actions to build combined reports."}
				</span>
			</div>

			{buildPlaceGroup ? (
				<BuildPlaceReportDialog
					open
					onOpenChange={open => {
						if (!open) setBuildPlaceGroup(null);
					}}
					placeGroup={buildPlaceGroup}
					rolePrefix={rolePrefix}
				/>
			) : null}
		</div>
	);
}
