"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { AuditorSummary } from "@/lib/api/playspace";

import { DataTable, getMultiValueFilterFn } from "./data-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import type { EntityRowAction } from "./entity-row-actions";
import { EntityRowActions } from "./entity-row-actions";
import { formatDateTimeLabel } from "./utils";

export interface AuditorsTableProps {
	auditors: AuditorSummary[];
	title?: string;
	description?: string;
	basePath?: string;
	action?: React.ReactNode;
	toolbarExtra?: React.ReactNode;
	getRowActions?: (auditor: AuditorSummary) => EntityRowAction[];
	pageSize?: number;
	emptyMessage?: string;
}

const capitalizeWord = (word: string) => {
	return word.charAt(0).toLocaleUpperCase() + word.slice(1);
};
const capitalizeRole = (role: string) => {
	return role
		.split(" ")
		.map(word => capitalizeWord(word))
		.join(" ");
};

/**
 * Manager-facing auditor roster with sortable workload and recency columns.
 */
export function AuditorsTable({
	auditors,
	title,
	description,
	basePath = "/manager/auditors",
	action,
	toolbarExtra,
	getRowActions,
	pageSize = 10,
	emptyMessage
}: Readonly<AuditorsTableProps>) {
	const t = useTranslations("tables.auditors");
	const formatT = useTranslations("common.format");
	const columns = React.useMemo<ColumnDef<AuditorSummary>[]>(
		() => [
			{
				id: "identity",
				accessorFn: auditor => `${auditor.auditor_code} ${auditor.full_name} ${auditor.email ?? ""}`,
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.auditor")} />,
				cell: ({ row }) => (
					<div className="min-w-[240px] space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="font-mono text-primary">
								{row.original.auditor_code}
							</Badge>
							{row.original.role ? (
								<Badge variant="secondary" style={{ textTransform: "capitalize" }}>
									{row.original.role}
								</Badge>
							) : null}
						</div>
						<Link
							href={`${basePath}/${encodeURIComponent(row.original.id)}`}
							className="font-medium text-foreground transition-colors hover:text-primary">
							{row.original.full_name}
						</Link>
						<p className="text-sm text-muted-foreground">{row.original.email ?? t("emailPending")}</p>
					</div>
				),
				enableHiding: false
			},
			{
				accessorKey: "role",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.role")} />,
				filterFn: getMultiValueFilterFn<AuditorSummary>(),
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground" style={{ textTransform: "capitalize" }}>
						{row.original.role ?? t("rolePending")}
					</span>
				)
			},
			{
				accessorKey: "assignments_count",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.assignments")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono text-foreground tabular-nums">
						{row.original.assignments_count}
					</span>
				)
			},
			{
				accessorKey: "completed_audits",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.completed")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right font-mono text-foreground tabular-nums">
						{row.original.completed_audits}
					</span>
				)
			},
			{
				accessorKey: "last_active_at",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.lastActive")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block text-right text-sm text-muted-foreground tabular-nums">
						{formatDateTimeLabel(row.original.last_active_at, formatT)}
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
						} satisfies ColumnDef<AuditorSummary>
					]
				: [])
		],
		[basePath, formatT, getRowActions, t]
	);

	const roleOptions = React.useMemo(() => {
		return Array.from(
			new Set(auditors.map(auditor => auditor.role).filter((value): value is string => Boolean(value)))
		)
			.sort((left, right) => left.localeCompare(right))
			.map(role => ({
				label: capitalizeRole(role),
				value: role
			}));
	}, [auditors]);

	return (
		<DataTable
			title={title ?? t("title")}
			description={description ?? t("description")}
			columns={columns}
			data={auditors}
			searchColumnId="identity"
			searchPlaceholder={t("searchPlaceholder")}
			filterConfigs={[
				{
					columnId: "role",
					title: t("columns.role"),
					options: roleOptions
				}
			]}
			toolbarExtra={toolbarExtra}
			action={action}
			pageSize={pageSize}
			emptyMessage={emptyMessage ?? t("emptyMessage")}
			initialSorting={[{ id: "last_active_at", desc: true }]}
		/>
	);
}
