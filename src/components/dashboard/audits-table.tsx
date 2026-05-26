"use client";

import * as React from "react";
import type { ColumnDef, ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getExecutionModeLabel } from "@/lib/audit/score-mode-helpers";
import { getAuditorTableLabel } from "@/components/dashboard/auditor-display";

import { DataTable, getMultiValueFilterFn } from "./data-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import type { EntityRowAction } from "./entity-row-actions";
import { EntityRowActions } from "./entity-row-actions";
import { formatAuditCodeReference, formatDateTimeLabel, formatScoreLabel, formatScorePairLabel } from "./utils";

export interface AuditActivityRow {
	id: string;
	auditCode: string;
	status: string;
	auditorCode: string;
	auditorDisplayName?: string | null;
	placeName?: string | null;
	placeId?: string | null;
	projectName?: string | null;
	projectId?: string | null;
	accountName?: string | null;
	executionMode?: string | null;
	startedAt: string | null;
	submittedAt: string | null;
	score: number | null;
	scorePair?: {
		pv: number;
		u: number;
	} | null;
}

export interface AuditsTableProps {
	rows: AuditActivityRow[];
	title?: string;
	description?: string;
	basePath?: string;
	action?: React.ReactNode;
	toolbarExtra?: React.ReactNode;
	pageSize?: number;
	emptyMessage?: string;
	getRowActions?: (row: AuditActivityRow) => EntityRowAction[];
	sortingState?: SortingState;
	onSortingStateChange?: (nextState: SortingState) => void;
	columnFiltersState?: ColumnFiltersState;
	onColumnFiltersStateChange?: (nextState: ColumnFiltersState) => void;
	paginationState?: PaginationState;
	onPaginationStateChange?: (nextState: PaginationState) => void;
	manualPagination?: boolean;
	manualSorting?: boolean;
	manualFiltering?: boolean;
	rowCount?: number;
	pageCount?: number;
	isFetching?: boolean;
	onRowClick?: (row: AuditActivityRow) => void;
}

interface AuditIdentityCellProps {
	auditCode: string;
	auditorCode: string;
	auditorDisplayName?: string | null;
	placeName?: string | null;
	projectName?: string | null;
	accountName?: string | null;
	href?: string;
}

/**
 * Human-first audit row heading with a machine-code reference and copy affordance.
 */
function AuditIdentityCell({
	auditCode,
	auditorCode,
	auditorDisplayName,
	placeName,
	projectName,
	accountName,
	href
}: Readonly<AuditIdentityCellProps>) {
	const t = useTranslations("tables.audits");
	const [isCopied, setIsCopied] = React.useState(false);
	const resetTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const primaryLabel = placeName ?? projectName ?? accountName ?? auditCode;
	const auditorLabel = getAuditorTableLabel(auditorCode, auditorDisplayName);
	const lineage = [accountName, projectName]
		.filter((value): value is string => Boolean(value && value.trim().length > 0))
		.join(" · ");

	React.useEffect(() => {
		return () => {
			if (resetTimeoutRef.current !== null) {
				globalThis.clearTimeout(resetTimeoutRef.current);
			}
		};
	}, []);

	async function handleCopyAuditCode() {
		try {
			await navigator.clipboard.writeText(auditCode);
			setIsCopied(true);
			if (resetTimeoutRef.current !== null) {
				globalThis.clearTimeout(resetTimeoutRef.current);
			}
			resetTimeoutRef.current = globalThis.setTimeout(() => {
				setIsCopied(false);
			}, 1600);
		} catch {
			setIsCopied(false);
		}
	}

	return (
		<div className="min-w-[320px] space-y-2">
			<div className="space-y-1">
				{href ? (
					<Link href={href} className="font-medium text-foreground transition-colors hover:text-primary">
						{primaryLabel}
					</Link>
				) : (
					<p className="font-medium text-foreground">{primaryLabel}</p>
				)}
				{lineage.length > 0 ? <p className="text-sm text-muted-foreground">{lineage}</p> : null}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<code
					title={auditCode}
					className="rounded-sm bg-secondary px-2 py-1 font-mono text-[13px] tracking-[0.04em] text-foreground">
					{formatAuditCodeReference(auditCode)}
				</code>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					className="h-7 gap-1.5 px-2 text-xs"
					onClick={handleCopyAuditCode}
					aria-label={t("copyAuditCode", { auditCode })}>
					{isCopied ? (
						<CheckIcon data-icon="inline-start" aria-hidden="true" />
					) : (
						<CopyIcon data-icon="inline-start" aria-hidden="true" />
					)}
					<span>{isCopied ? t("copied") : t("copyId")}</span>
				</Button>
			</div>
			<p className="text-sm text-muted-foreground">
				{t("auditorLabel")}{" "}
				{auditorDisplayName ? (
					<span className="font-medium text-foreground">{auditorLabel}</span>
				) : (
					<span className="font-mono text-foreground tracking-[0.04em]">{auditorLabel}</span>
				)}
			</p>
		</div>
	);
}

/**
 * Shared audit activity table used by manager and admin monitoring views.
 */
export function AuditsTable({
	rows,
	title,
	description,
	basePath,
	action,
	toolbarExtra,
	pageSize = 10,
	emptyMessage,
	getRowActions,
	sortingState,
	onSortingStateChange,
	columnFiltersState,
	onColumnFiltersStateChange,
	paginationState,
	onPaginationStateChange,
	manualPagination = false,
	manualSorting = false,
	manualFiltering = false,
	rowCount,
	pageCount,
	onRowClick,
	isFetching = false
}: Readonly<AuditsTableProps>) {
	const t = useTranslations("tables.audits");
	const formatT = useTranslations("common.format");
	const columns = React.useMemo<ColumnDef<AuditActivityRow>[]>(
		() => [
			{
				id: "audit_code",
				accessorFn: row =>
					[
						row.auditCode,
						row.auditorCode,
						row.auditorDisplayName,
						row.placeName,
						row.projectName,
						row.accountName
					]
						.filter(Boolean)
						.join(" "),
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.audit")} />,
				cell: ({ row }) => (
					<AuditIdentityCell
						auditCode={row.original.auditCode}
						auditorCode={row.original.auditorCode}
						auditorDisplayName={row.original.auditorDisplayName}
						placeName={row.original.placeName}
						projectName={row.original.projectName}
						accountName={row.original.accountName}
						href={basePath ? `${basePath}/${encodeURIComponent(row.original.id)}` : undefined}
					/>
				),
				enableHiding: false
			},
			{
				accessorKey: "status",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.status")} />,
				filterFn: getMultiValueFilterFn<AuditActivityRow>(),
				cell: ({ row }) => (
					<Badge
						variant={row.original.status === "SUBMITTED" ? "default" : "secondary"}
						className="font-medium">
						{t(`status.${row.original.status.toLowerCase()}`)}
					</Badge>
				)
			},
			{
				id: "execution_mode",
				accessorFn: row => row.executionMode ?? null,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.auditType")} />,
				cell: ({ row }) => {
					const mode = row.original.executionMode;
					if (mode === null || mode === undefined) {
						return <span className="text-sm text-muted-foreground">—</span>;
					}
					return (
						<Badge variant="outline" className="text-xs font-medium whitespace-nowrap">
							{getExecutionModeLabel(mode as "audit" | "survey" | "both")}
						</Badge>
					);
				}
			},
			{
				id: "started_at",
				accessorFn: row => row.startedAt ?? "",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.started")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.startedAt, formatT)}
					</span>
				)
			},
			{
				id: "submitted_at",
				accessorFn: row => row.submittedAt ?? "",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.submitted")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.submittedAt, formatT)}
					</span>
				)
			},
			{
				id: "summary_score",
				accessorFn: row => row.score ?? null,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.score")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono text-foreground tabular-nums">
						{row.original.scorePair
							? formatScorePairLabel(row.original.scorePair, formatT)
							: formatScoreLabel(row.original.score, formatT)}
					</span>
				)
			},
			...(getRowActions
				? [
						{
							id: "actions",
							enableSorting: false,
							enableHiding: false,
							cell: ({ row }) => <EntityRowActions actions={getRowActions(row.original)} />
						} satisfies ColumnDef<AuditActivityRow>
					]
				: [])
		],
		[basePath, formatT, getRowActions, t]
	);

	const statusOptions = React.useMemo(() => {
		return (["IN_PROGRESS", "PAUSED", "SUBMITTED"] as const).map(status => ({
			label: status.toLowerCase().replaceAll("_", " "),
			value: status
		}));
	}, []);

	return (
		<DataTable
			title={title ?? t("title")}
			description={description ?? t("description")}
			columns={columns}
			data={rows}
			searchColumnId="audit_code"
			searchPlaceholder={t("searchPlaceholder")}
			filterConfigs={[
				{
					columnId: "status",
					title: t("columns.status"),
					options: statusOptions
				}
			]}
			toolbarExtra={toolbarExtra}
			action={action}
			pageSize={pageSize}
			emptyMessage={emptyMessage ?? t("emptyMessage")}
			initialSorting={[{ id: "submitted_at", desc: true }]}
			sortingState={sortingState}
			onSortingStateChange={onSortingStateChange}
			columnFiltersState={columnFiltersState}
			onColumnFiltersStateChange={onColumnFiltersStateChange}
			paginationState={paginationState}
			onPaginationStateChange={onPaginationStateChange}
			manualPagination={manualPagination}
			manualSorting={manualSorting}
			manualFiltering={manualFiltering}
			rowCount={rowCount}
			pageCount={pageCount}
			isFetching={isFetching}
			onRowClick={onRowClick}
		/>
	);
}
