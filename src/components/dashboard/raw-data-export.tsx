"use client";

import * as React from "react";
import { CheckIcon, DownloadIcon, FilterIcon, Loader2Icon, Rows3Icon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// ── Shared export types ─────────────────────────────────────────────────────────

export type ExportFormat = "json" | "csv" | "xlsx";
export type ExportEntity = "projects" | "places" | "audits" | "reports";

/** A single named flat table within a multi-sheet workbook. */
export interface WorkbookSheet {
	/** Sheet/array name (e.g. "Projects"). Excel sheet names are truncated to 31 chars. */
	sheetName: string;
	/** Flat row records - each object's keys become the column headers. */
	records: Record<string, unknown>[];
}

/** Optional bundle metadata recorded at the top of the JSON relational bundle. */
export interface WorkbookBundleMeta {
	generated_at?: string;
	scope?: string;
}

// ── Download helpers ─────────────────────────────────────────────────────────────

export function escapeCsvValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function recordsToCsv(records: Record<string, unknown>[]): string {
	if (records.length === 0) return "";
	const headers = Object.keys(records[0]);
	return [headers.join(","), ...records.map(r => headers.map(h => escapeCsvValue(r[h])).join(","))].join("\n");
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

/** De-duplicate and clamp sheet names so Excel accepts them (≤ 31 chars, unique). */
function normalizeSheetName(name: string, used: Set<string>): string {
	const base = name.slice(0, 31) || "Sheet";
	let candidate = base;
	let suffix = 1;
	while (used.has(candidate)) {
		const tail = `_${suffix}`;
		candidate = `${base.slice(0, 31 - tail.length)}${tail}`;
		suffix += 1;
	}
	used.add(candidate);
	return candidate;
}

/**
 * Download an ordered set of linked flat tables as one deliverable.
 *
 * - XLSX: a multi-sheet workbook, one worksheet per sheet (parent sheet first).
 * - JSON: a relational bundle `{ generated_at, scope, <sheet>: [...] }` mirroring the sheets.
 * - CSV: a single table - the first (parent) sheet only, since CSV cannot hold linked tables.
 */
export async function downloadWorkbook(
	sheets: WorkbookSheet[],
	format: ExportFormat,
	filename: string,
	bundleMeta: WorkbookBundleMeta = {}
): Promise<void> {
	if (format === "json") {
		const bundle: Record<string, unknown> = {
			generated_at: bundleMeta.generated_at ?? new Date().toISOString(),
			...(bundleMeta.scope !== undefined ? { scope: bundleMeta.scope } : {})
		};
		for (const sheet of sheets) {
			bundle[sheet.sheetName.toLowerCase()] = sheet.records;
		}
		triggerBlobDownload(
			new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
			`${filename}.json`
		);
		return;
	}

	if (format === "csv") {
		// CSV is inherently one table: deliver the parent (first) sheet only.
		const parent = sheets[0]?.records ?? [];
		triggerBlobDownload(
			new Blob(["\uFEFF" + recordsToCsv(parent)], { type: "text/csv;charset=utf-8;" }),
			`${filename}.csv`
		);
		return;
	}

	const { utils, writeFile } = await import("xlsx");
	const workbook = utils.book_new();
	const usedNames = new Set<string>();
	for (const sheet of sheets) {
		const worksheet = utils.json_to_sheet(sheet.records);
		utils.book_append_sheet(workbook, worksheet, normalizeSheetName(sheet.sheetName, usedNames));
	}
	writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Download a single flat table. Convenience wrapper around downloadWorkbook for
 * leaf exports (Audits/Reports) that have no descendant sheets.
 */
export async function downloadSingleSheet(
	records: Record<string, unknown>[],
	format: ExportFormat,
	filename: string,
	sheetName: string = "Records"
): Promise<void> {
	await downloadWorkbook([{ sheetName, records }], format, filename);
}

// ── Collection namespace bar ─────────────────────────────────────────────────────

interface CollectionNamespaceBarProps {
	entityLabel: string;
	totalCount: number | undefined;
	selectedCount: number;
	isFetching: boolean;
	onClearSelection: () => void;
	/** Labels for i18n - defaults to English if omitted. */
	selectedLabel?: string;
	clearLabel?: string;
}

export function CollectionNamespaceBar({
	entityLabel,
	totalCount,
	selectedCount,
	isFetching,
	onClearSelection,
	selectedLabel,
	clearLabel = "clear"
}: CollectionNamespaceBarProps) {
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-edge/40 bg-muted/20 px-3.5 py-2">
			{/* Record count with entity name */}
			<div className="flex items-center gap-1.5">
				{isFetching ? (
					<Loader2Icon className="size-3 animate-spin text-muted-foreground" aria-hidden="true" />
				) : (
					<Rows3Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				)}
				<span className="font-mono text-[13px] text-muted-foreground">
					{totalCount !== undefined ? (
						<>
							<span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>{" "}
							{entityLabel}
						</>
					) : (
						"-"
					)}
				</span>
			</div>

			{/* Selected pill - only visible when rows are selected */}
			{selectedCount > 0 && (
				<>
					<Separator orientation="vertical" className="h-3.5 shrink-0" />
					<div className="flex items-center gap-1.5">
						<span
							className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
							style={{
								background: "rgba(0, 168, 90, 0.10)",
								color: "#00a85a",
								border: "1px solid rgba(0, 168, 90, 0.28)"
							}}>
							<CheckIcon className="size-2.5" aria-hidden="true" />
							{selectedLabel ?? `${selectedCount.toLocaleString()} selected`}
						</span>
						<button
							type="button"
							onClick={onClearSelection}
							className="inline-flex items-center gap-0.5 rounded text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus:outline-none"
							aria-label="Clear selection">
							<XIcon className="size-2.5" aria-hidden="true" />
							{clearLabel}
						</button>
					</div>
				</>
			)}
		</div>
	);
}

// ── Selection Status Bar (floats above table when rows are selected) ──────────────

export interface SelectionBarLabels {
	selectedText: string;
	exportSelected: string;
	deselectAll: string;
}

const DEFAULT_SELECTION_LABELS: SelectionBarLabels = {
	selectedText: "selected",
	exportSelected: "Export selected",
	deselectAll: "Deselect all"
};

interface SelectionBarProps {
	selectedCount: number;
	isExporting: boolean;
	onExportSelected: () => void;
	onClearSelection: () => void;
	labels?: Partial<SelectionBarLabels>;
}

export function SelectionBar({
	selectedCount,
	isExporting,
	onExportSelected,
	onClearSelection,
	labels: labelsProp
}: SelectionBarProps) {
	const labels = { ...DEFAULT_SELECTION_LABELS, ...labelsProp };
	if (selectedCount === 0) return null;
	return (
		<div
			className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm"
			style={{
				background: "rgba(0, 168, 90, 0.07)",
				borderColor: "rgba(0, 168, 90, 0.25)"
			}}>
			<div className="flex items-center gap-2">
				<span
					className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
					style={{ background: "#00a85a", color: "#fff" }}
					aria-hidden="true">
					{selectedCount > 99 ? "99+" : selectedCount}
				</span>
				<span className="font-medium" style={{ color: "#007a40" }}>
					{`${selectedCount.toLocaleString()} ${labels.selectedText}`}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					size="sm"
					disabled={isExporting}
					className="h-8 gap-1.5 text-white"
					style={{ background: "#00a85a" }}
					onClick={onExportSelected}
					onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#008f4c")}
					onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#00a85a")}>
					{isExporting ? (
						<Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
					) : (
						<DownloadIcon className="size-3.5" aria-hidden="true" />
					)}
					{labels.exportSelected}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 gap-1.5 text-muted-foreground"
					onClick={onClearSelection}>
					<XIcon className="size-3.5" aria-hidden="true" />
					{labels.deselectAll}
				</Button>
			</div>
		</div>
	);
}

// ── Filter Popover (reused across all tabs) ───────────────────────────────────────

interface FilterPopoverProps {
	title: string;
	options: Array<{ label: string; value: string }>;
	selectedValues: string[];
	onChange: (values: string[]) => void;
	clearLabel?: string;
	emptyLabel?: string;
}

export function FilterPopover({
	title,
	options,
	selectedValues,
	onChange,
	clearLabel = "Clear",
	emptyLabel = "No options available"
}: FilterPopoverProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-9 gap-2 px-3.5">
					<FilterIcon className="size-4" aria-hidden="true" />
					{title}
					{selectedValues.length > 0 && (
						<Badge variant="secondary" className="rounded-sm px-1.5 font-mono text-xs">
							{selectedValues.length}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-3" align="start">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="text-sm font-medium">{title}</h4>
						{selectedValues.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="xs"
								className="h-6 px-2 text-xs"
								onClick={() => onChange([])}>
								{clearLabel}
							</Button>
						)}
					</div>
					<Separator />
					<div className="max-h-52 space-y-2 overflow-y-auto">
						{options.map(option => (
							<div key={option.value} className="flex items-center gap-2">
								<Checkbox
									id={`fp-${option.value}`}
									checked={selectedValues.includes(option.value)}
									onCheckedChange={checked => {
										onChange(
											checked
												? [...selectedValues, option.value]
												: selectedValues.filter(v => v !== option.value)
										);
									}}
								/>
								<Label htmlFor={`fp-${option.value}`} className="cursor-pointer text-sm font-normal">
									{option.label}
								</Label>
							</div>
						))}
						{options.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
