"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef, ExpandedState, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	useReactTable
} from "@tanstack/react-table";
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	CopyIcon,
	DownloadIcon,
	FileTextIcon,
	PlusCircleIcon,
	SearchIcon
} from "lucide-react";

import type { AuditActivityRow } from "./audits-table";
import { getAuditorTableLabel } from "./auditor-display";
import { BuildPlaceReportDialogView } from "./build-place-report-dialog";
import { formatAuditCodeReference, formatDateTimeLabel, formatScoreLabel, formatScorePairLabel } from "./utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getExecutionModeLabel } from "@/lib/audit/score-mode-helpers";
import { cn } from "@/lib/utils";

/**
 * Parent row data shown in the main expandable table.
 */
interface PlaceGroup {
	id: string;
	placeId: string;
	projectId: string;
	placeName: string;
	projectName: string;
	accountNames: string[];
	rows: AuditActivityRow[];
	submittedRows: AuditActivityRow[];
	reportCount: number;
	auditCount: number;
	surveyCount: number;
	fullCount: number;
	latestSubmittedAt: string | null;
	latestSubmittedRow: AuditActivityRow | null;
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
	toolbarFilters?: React.ReactNode;
}

const fallbackText = (key: string) => {
	const values: Record<string, string> = {
		noRecentActivity: "—",
		pending: "Pending"
	};
	return values[key] ?? key;
};

/**
 * Build a stable human-readable name for each project/place grouping.
 */
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

/**
 * Keep report rows ordered by most recent submission first within each place.
 */
function getSubmittedRows(rows: AuditActivityRow[]): AuditActivityRow[] {
	return rows
		.filter(row => row.status === "SUBMITTED")
		.sort((left, right) => new Date(right.submittedAt ?? 0).getTime() - new Date(left.submittedAt ?? 0).getTime());
}

/**
 * Format the score consistently across the place summary and submission rows.
 */
function formatSubmissionScore(row: AuditActivityRow): string {
	return row.scorePair
		? formatScorePairLabel(row.scorePair, fallbackText)
		: formatScoreLabel(row.score, fallbackText);
}

/**
 * Group submissions by project-place pair so expansion stays correct even when a place appears in multiple projects.
 */
function buildPlaceGroups(rows: AuditActivityRow[]): PlaceGroup[] {
	const groupedRows = new Map<string, AuditActivityRow[]>();
	for (const row of rows) {
		const groupKey = `${getProjectId(row)}:::${getPlaceId(row)}`;
		const currentRows = groupedRows.get(groupKey) ?? [];
		groupedRows.set(groupKey, [...currentRows, row]);
	}

	return Array.from(groupedRows.entries()).map(([groupKey, groupRows]) => {
		const submittedRows = getSubmittedRows(groupRows);
		const latestSubmittedRow = submittedRows[0] ?? null;
		const accountNames = Array.from(
			new Set(groupRows.map(row => row.accountName?.trim()).filter((value): value is string => Boolean(value)))
		);

		return {
			id: groupKey,
			placeId: getPlaceId(groupRows[0] ?? latestSubmittedRow ?? rows[0]),
			projectId: getProjectId(groupRows[0] ?? latestSubmittedRow ?? rows[0]),
			placeName: getPlaceName(groupRows[0] ?? latestSubmittedRow ?? rows[0]),
			projectName: getProjectName(groupRows[0] ?? latestSubmittedRow ?? rows[0]),
			accountNames,
			rows: groupRows,
			submittedRows,
			reportCount: submittedRows.length,
			auditCount: submittedRows.filter(row => row.executionMode === "audit").length,
			surveyCount: submittedRows.filter(row => row.executionMode === "survey").length,
			fullCount: submittedRows.filter(row => row.executionMode === "both").length,
			latestSubmittedAt: latestSubmittedRow?.submittedAt ?? null,
			latestSubmittedRow,
			searchText: groupRows
				.flatMap(row => [
					row.auditCode,
					row.auditorCode,
					row.auditorDisplayName,
					row.accountName,
					getProjectName(row),
					getPlaceName(row),
					row.executionMode
				])
				.filter((value): value is string => Boolean(value))
				.join(" ")
				.toLowerCase()
		};
	});
}

/**
 * Provide the secondary line under the place name without spending a whole column on project text.
 */
function formatPlaceContext(group: PlaceGroup): string {
	if (group.accountNames.length === 0) {
		return group.projectName;
	}

	return [group.projectName, group.accountNames.join(", ")].join(" · ");
}

/**
 * Resolve whether the place has enough submitted data to build a place report.
 */
function getBuildAvailability(group: PlaceGroup): { canBuild: boolean; reason: string | null } {
	if (group.fullCount > 0 || (group.auditCount > 0 && group.surveyCount > 0)) {
		return { canBuild: true, reason: null };
	}

	if (group.auditCount === 0 && group.surveyCount === 0) {
		return {
			canBuild: false,
			reason: "No submitted place audits or surveys are available for this place yet."
		};
	}

	if (group.auditCount === 0) {
		return {
			canBuild: false,
			reason: "Need at least one submitted place audit before building a place report."
		};
	}

	if (group.surveyCount === 0) {
		return {
			canBuild: false,
			reason: "Need at least one submitted place survey before building a place report."
		};
	}

	return {
		canBuild: false,
		reason: "Need either one full assessment or both a submitted audit and survey."
	};
}

/**
 * Reusable copy action for report identifiers in the expanded detail rows.
 */
function CopyCodeButton({ value }: Readonly<{ value: string }>) {
	const [isCopied, setIsCopied] = React.useState(false);
	const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	React.useEffect(() => {
		return () => {
			if (timeoutRef.current !== null) {
				globalThis.clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(value);
			setIsCopied(true);
			if (timeoutRef.current !== null) {
				globalThis.clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = globalThis.setTimeout(() => {
				setIsCopied(false);
			}, 1500);
		} catch {
			setIsCopied(false);
		}
	}

	return (
		<Button type="button" variant="ghost" size="icon-xs" onClick={handleCopy} aria-label={`Copy ${value}`}>
			{isCopied ? <CheckIcon className="size-3.5 text-status-success" /> : <CopyIcon className="size-3.5" />}
		</Button>
	);
}

/**
 * Small sortable table header used in the place-level summary table.
 */
function SortableHeader({
	title,
	sorted,
	onClick,
	align = "left"
}: Readonly<{
	title: string;
	sorted: false | "asc" | "desc";
	onClick: () => void;
	align?: "left" | "right";
}>) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-2 text-left transition-colors hover:text-foreground",
				align === "right" && "justify-end"
			)}>
			<span>{title}</span>
			{sorted === "asc" ? (
				<ArrowUpIcon className="size-3.5" />
			) : sorted === "desc" ? (
				<ArrowDownIcon className="size-3.5" />
			) : (
				<ArrowUpDownIcon className="size-3.5 opacity-60" />
			)}
		</button>
	);
}

/**
 * Render the build action on the place row and keep any tooltip inside the table card.
 */
function BuildPlaceReportButton({
	group,
	onBuild,
	tooltipContainer
}: Readonly<{
	group: PlaceGroup;
	onBuild: (group: PlaceGroup) => void;
	tooltipContainer: HTMLElement | null;
}>) {
	const availability = getBuildAvailability(group);

	if (availability.canBuild) {
		return (
			<Button type="button" variant="outline" size="sm" onClick={() => onBuild(group)}>
				<PlusCircleIcon data-icon="inline-start" />
				Build place report
			</Button>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex">
					<Button type="button" variant="outline" size="sm" disabled>
						<PlusCircleIcon data-icon="inline-start" />
						Build place report
					</Button>
				</span>
			</TooltipTrigger>
			{availability.reason ? (
				<TooltipContent container={tooltipContainer} side="top" align="end" className="max-w-56 text-left">
					{availability.reason}
				</TooltipContent>
			) : null}
		</Tooltip>
	);
}

/**
 * Expanded inline sub-table showing the actual submissions for one place.
 */
function PlaceSubmissionTable({
	group,
	basePath,
	showSelection,
	selectedReportIds,
	onReportSelectionChange,
	onPlaceSelectionChange
}: Readonly<{
	group: PlaceGroup;
	basePath: string;
	showSelection: boolean;
	selectedReportIds: Record<string, boolean>;
	onReportSelectionChange: (reportId: string, checked: boolean) => void;
	onPlaceSelectionChange: (group: PlaceGroup, checked: boolean) => void;
}>) {
	const selectedCount = group.submittedRows.filter(row => selectedReportIds[row.id]).length;
	const allSelected = group.reportCount > 0 && selectedCount === group.reportCount;
	const someSelected = selectedCount > 0 && selectedCount < group.reportCount;

	return (
		<div className="space-y-3 rounded-md border bg-background p-4 shadow-sm">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-foreground">Submitted reports</p>
					<p className="text-xs text-muted-foreground">
						Expand a place to review individual submissions without leaving the table.
					</p>
				</div>
				<Badge variant="secondary">{group.reportCount} reports</Badge>
			</div>

			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						{showSelection ? (
							<TableHead className="w-14 text-center">
								<Checkbox
									checked={allSelected ? true : someSelected ? "indeterminate" : false}
									onCheckedChange={checked => onPlaceSelectionChange(group, checked === true)}
									aria-label={`Select reports for ${group.placeName}`}
								/>
							</TableHead>
						) : null}
						<TableHead>Report</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Auditor</TableHead>
						<TableHead>Submitted</TableHead>
						<TableHead>Score</TableHead>
						<TableHead className="text-right">Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{group.submittedRows.map(row => {
						const mode = row.executionMode as "audit" | "survey" | "both" | null;

						return (
							<TableRow key={row.id}>
								{showSelection ? (
									<TableCell className="w-14 text-center">
										<Checkbox
											checked={Boolean(selectedReportIds[row.id])}
											onCheckedChange={checked =>
												onReportSelectionChange(row.id, checked === true)
											}
											aria-label={`Select ${row.auditCode}`}
										/>
									</TableCell>
								) : null}
								<TableCell className="min-w-[280px] py-3">
									<div className="space-y-2">
										<div className="flex flex-wrap items-center gap-2">
											<Link
												href={`${basePath}/${encodeURIComponent(row.id)}`}
												className="font-medium text-foreground transition-colors hover:text-primary">
												{formatAuditCodeReference(row.auditCode)}
											</Link>
											<CopyCodeButton value={row.auditCode} />
										</div>
										<p className="text-xs text-muted-foreground">{formatPlaceContext(group)}</p>
									</div>
								</TableCell>
								<TableCell className="py-3">
									{mode ? (
										<Badge variant="outline" className="whitespace-nowrap text-xs font-medium">
											{getExecutionModeLabel(mode)}
										</Badge>
									) : (
										<span className="text-sm text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell className="py-3 text-sm">
									{row.auditorDisplayName ? (
										<span className="font-medium text-foreground">
											{getAuditorTableLabel(row.auditorCode, row.auditorDisplayName)}
										</span>
									) : (
										<span className="font-mono">{row.auditorCode}</span>
									)}
								</TableCell>
								<TableCell className="py-3 text-sm text-muted-foreground">
									{formatDateTimeLabel(row.submittedAt, fallbackText)}
								</TableCell>
								<TableCell className="py-3 font-mono text-sm tabular-nums">
									{formatSubmissionScore(row)}
								</TableCell>
								<TableCell className="py-3 text-right">
									<Button asChild variant="ghost" size="sm">
										<Link href={`${basePath}/${encodeURIComponent(row.id)}`}>View</Link>
									</Button>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

/**
 * Expandable place-first reports view that keeps TanStack state management but removes the sparse grouped columns.
 */
export function GroupedReportsView({
	rows,
	basePath,
	onExportSelected,
	rolePrefix,
	searchValue,
	onSearchValueChange,
	isSearching = false,
	toolbarFilters
}: Readonly<GroupedReportsViewProps>) {
	const tableCardContentRef = React.useRef<HTMLDivElement | null>(null);
	const [buildPlaceGroup, setBuildPlaceGroup] = React.useState<PlaceGroup | null>(null);
	const [expanded, setExpanded] = React.useState<ExpandedState>({});
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "latestSubmittedAt", desc: true }]);
	const [globalFilter, setGlobalFilter] = React.useState(searchValue ?? "");
	const [selectedReportIds, setSelectedReportIds] = React.useState<Record<string, boolean>>({});
	const skipNextSearchChangeRef = React.useRef(false);

	const placeGroups = React.useMemo(() => buildPlaceGroups(rows), [rows]);

	const [prevSearchValue, setPrevSearchValue] = React.useState(searchValue);

	if (searchValue !== prevSearchValue) {
		setPrevSearchValue(searchValue);
		if (searchValue !== undefined && searchValue !== globalFilter) {
			skipNextSearchChangeRef.current = true;
			setGlobalFilter(searchValue);
		}
	}

	React.useEffect(() => {
		if (!onSearchValueChange) {
			return;
		}

		if (skipNextSearchChangeRef.current) {
			skipNextSearchChangeRef.current = false;
			return;
		}

		const timeout = globalThis.setTimeout(() => {
			onSearchValueChange(globalFilter.trim());
		}, 300);

		return () => globalThis.clearTimeout(timeout);
	}, [globalFilter, onSearchValueChange]);

	const [prevRows, setPrevRows] = React.useState(rows);

	if (rows !== prevRows) {
		setPrevRows(rows);
		const validReportIds = new Set(rows.map(row => row.id));
		setSelectedReportIds(currentSelection => {
			const nextSelection = Object.fromEntries(
				Object.entries(currentSelection).filter(
					([reportId, isSelected]) => validReportIds.has(reportId) && isSelected
				)
			);
			return Object.keys(nextSelection).length === Object.keys(currentSelection).length
				? currentSelection
				: nextSelection;
		});
	}

	/**
	 * Update one report selection entry without disturbing the rest of the expanded place state.
	 */
	function handleReportSelectionChange(reportId: string, checked: boolean) {
		setSelectedReportIds(currentSelection => {
			if (checked) {
				return { ...currentSelection, [reportId]: true };
			}

			const nextSelection = { ...currentSelection };
			delete nextSelection[reportId];
			return nextSelection;
		});
	}

	function handlePlaceSelectionChange(group: PlaceGroup, checked: boolean) {
		setSelectedReportIds(currentSelection => {
			const nextSelection = { ...currentSelection };
			for (const row of group.submittedRows) {
				if (checked) {
					nextSelection[row.id] = true;
				} else {
					delete nextSelection[row.id];
				}
			}
			return nextSelection;
		});
	}

	function clearSelection() {
		setSelectedReportIds({});
	}

	const columns = React.useMemo<ColumnDef<PlaceGroup>[]>(
		() => [
			{
				id: "place",
				accessorFn: row => row.placeName,
				header: ({ column }) => (
					<SortableHeader
						title="Place"
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) => (
					<div className="min-w-[320px] py-1">
						<button
							type="button"
							className="flex w-full items-start gap-3 text-left"
							onClick={row.getToggleExpandedHandler()}>
							<span className="mt-0.5 rounded-md border border-border/70 p-1 text-muted-foreground">
								{row.getIsExpanded() ? (
									<ChevronDownIcon className="size-4" />
								) : (
									<ChevronRightIcon className="size-4" />
								)}
							</span>
							<span className="min-w-0 space-y-1">
								<span className="block font-semibold text-foreground">{row.original.placeName}</span>
								<span className="block text-sm text-muted-foreground">
									{formatPlaceContext(row.original)}
								</span>
							</span>
						</button>
					</div>
				)
			},
			{
				id: "reportCount",
				accessorFn: row => row.reportCount,
				header: ({ column }) => (
					<SortableHeader
						title="Submitted reports"
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) => (
					<div className="min-w-[220px] space-y-2 py-1">
						<p className="font-medium text-foreground">{row.original.reportCount} submitted</p>
						<div className="flex flex-wrap gap-2">
							{row.original.auditCount > 0 ? (
								<Badge variant="outline" className="text-xs">
									{row.original.auditCount} audit{row.original.auditCount === 1 ? "" : "s"}
								</Badge>
							) : null}
							{row.original.surveyCount > 0 ? (
								<Badge variant="outline" className="text-xs">
									{row.original.surveyCount} survey{row.original.surveyCount === 1 ? "" : "s"}
								</Badge>
							) : null}
							{row.original.fullCount > 0 ? (
								<Badge variant="outline" className="text-xs">
									{row.original.fullCount} full
								</Badge>
							) : null}
						</div>
					</div>
				)
			},
			{
				id: "latestSubmittedAt",
				accessorFn: row => row.latestSubmittedAt ?? "",
				header: ({ column }) => (
					<SortableHeader
						title="Latest submission"
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) => (
					<div className="min-w-[190px] space-y-1 py-1">
						<p className="text-sm font-medium text-foreground">
							{formatDateTimeLabel(row.original.latestSubmittedAt, fallbackText)}
						</p>
						<p className="text-xs text-muted-foreground">
							{row.original.latestSubmittedRow
								? `Latest auditor ${getAuditorTableLabel(
										row.original.latestSubmittedRow.auditorCode,
										row.original.latestSubmittedRow.auditorDisplayName
									)}`
								: "No submitted reports yet"}
						</p>
					</div>
				)
			},
			{
				id: "actions",
				enableSorting: false,
				header: () => <span className="block text-right">Actions</span>,
				cell: ({ row }) => (
					<div className="flex justify-end py-1">
						<BuildPlaceReportButton
							group={row.original}
							onBuild={setBuildPlaceGroup}
							tooltipContainer={tableCardContentRef.current}
						/>
					</div>
				)
			}
		],
		[]
	);

	const table = useReactTable({
		data: placeGroups,
		columns,
		state: {
			expanded,
			sorting,
			globalFilter
		},
		getRowId: row => row.id,
		onExpandedChange: setExpanded,
		onSortingChange: setSorting,
		onGlobalFilterChange: updater => {
			setGlobalFilter(previousValue =>
				String(typeof updater === "function" ? updater(previousValue) : (updater ?? ""))
			);
		},
		getRowCanExpand: row => row.original.reportCount > 0,
		globalFilterFn: (row, _columnId, filterValue) => {
			const query = String(filterValue).trim().toLowerCase();
			return query.length === 0 || row.original.searchText.includes(query);
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel()
	});

	const selectedIds = React.useMemo(
		() => Object.keys(selectedReportIds).filter(reportId => selectedReportIds[reportId]),
		[selectedReportIds]
	);
	const selectedCount = selectedIds.length;
	const filteredPlaceCount = table.getRowModel().rows.length;
	const totalPlaceCount = placeGroups.length;
	const totalReportCount = rows.length;

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
		<TooltipProvider>
			<div className="space-y-4">
				<Card className="overflow-hidden">
					<CardHeader className="gap-4 border-b border-border/70">
						<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
							<div>
								<CardTitle>Place reports</CardTitle>
								<CardDescription>
									Open a place to review submitted reports and build a place report once the right
									submissions are available.
								</CardDescription>
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge variant="secondary">{totalPlaceCount} places</Badge>
								<Badge variant="secondary">{totalReportCount} reports</Badge>
								{isSearching ? <Badge variant="outline">Searching…</Badge> : null}
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-0">
						<div ref={tableCardContentRef} className="relative">
							<div className="flex flex-col gap-4 border-b border-border/70 px-6 py-5">
								<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
									<div className="min-w-0 flex-1 lg:max-w-sm">
										<div className="relative">
											<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
												<SearchIcon className="size-4 text-muted-foreground" />
											</div>
											<Input
												value={globalFilter}
												onChange={event => setGlobalFilter(event.target.value)}
												placeholder="Search report code, auditor, project, or place…"
												className="h-10 pl-10"
											/>
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-2 sm:justify-end">
										{isSearching ? <Badge variant="outline">Updating results…</Badge> : null}
									</div>
								</div>

								<div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-start">
									<div className="flex flex-wrap items-center gap-2">{toolbarFilters}</div>

									<div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => table.toggleAllRowsExpanded(true)}>
											Expand all
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => table.toggleAllRowsExpanded(false)}>
											Collapse all
										</Button>
										{selectedCount > 0 ? (
											<Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
												Clear selection
											</Button>
										) : null}
										{onExportSelected && selectedCount > 0 ? (
											<Button
												type="button"
												size="sm"
												onClick={() => onExportSelected(selectedIds)}>
												<DownloadIcon data-icon="inline-start" />
												Export {selectedCount}
											</Button>
										) : null}
									</div>
								</div>
							</div>

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
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
												</TableHead>
											))}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{table.getRowModel().rows.length > 0 ? (
										table.getRowModel().rows.map(row => (
											<React.Fragment key={row.id}>
												<TableRow data-state={row.getIsExpanded() ? "selected" : undefined}>
													{row.getVisibleCells().map(cell => (
														<TableCell
															key={cell.id}
															className={cn(
																cell.column.id === "actions" && "text-right"
															)}>
															{flexRender(cell.column.columnDef.cell, cell.getContext())}
														</TableCell>
													))}
												</TableRow>
												{row.getIsExpanded() ? (
													<TableRow className="bg-muted/25 hover:bg-muted/25">
														<TableCell
															colSpan={row.getVisibleCells().length}
															className="px-6 py-5">
															<PlaceSubmissionTable
																group={row.original}
																basePath={basePath}
																showSelection={Boolean(onExportSelected)}
																selectedReportIds={selectedReportIds}
																onReportSelectionChange={handleReportSelectionChange}
																onPlaceSelectionChange={handlePlaceSelectionChange}
															/>
														</TableCell>
													</TableRow>
												) : null}
											</React.Fragment>
										))
									) : (
										<TableRow className="hover:bg-transparent">
											<TableCell
												colSpan={columns.length}
												className="h-28 text-center text-sm text-muted-foreground">
												No places match the current search.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
					<span>
						Showing {filteredPlaceCount} of {totalPlaceCount} places with {totalReportCount} submitted
						reports.
					</span>
					<span>
						Open a place to review its submissions
						{selectedCount > 0
							? ` or export ${selectedCount} selected report${selectedCount === 1 ? "" : "s"}`
							: ""}
						.
					</span>
				</div>

				{buildPlaceGroup ? (
					<BuildPlaceReportDialogView
						open
						onOpenChange={open => {
							if (!open) {
								setBuildPlaceGroup(null);
							}
						}}
						placeGroup={buildPlaceGroup}
						rolePrefix={rolePrefix}
					/>
				) : null}
			</div>
		</TooltipProvider>
	);
}
