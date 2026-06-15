"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { ProjectSummary } from "@/lib/api/playspace";
import { cn } from "@/lib/utils";

import { DataTable, getMultiValueFilterFn } from "./data-table";
import { DataTableColumnHeader } from "./data-table-column-header";
import type { EntityRowAction } from "./entity-row-actions";
import { EntityRowActions } from "./entity-row-actions";
import { formatProjectDateRange, formatScorePairLabel, getProjectStatusClassName } from "./utils";

export interface ProjectsTableProps {
	projects: ProjectSummary[];
	basePath?: string;
	title?: string;
	description?: string;
	action?: React.ReactNode;
	getRowActions?: (project: ProjectSummary) => EntityRowAction[];
	pageSize?: number;
	emptyMessage?: string;
}

/**
 * Enterprise project listing shared by dashboard and manager project screens.
 */
export function ProjectsTable({
	projects,
	basePath = "/manager/projects",
	title,
	description,
	action,
	getRowActions,
	pageSize = 8,
	emptyMessage
}: Readonly<ProjectsTableProps>) {
	const t = useTranslations("tables.projects");
	const formatT = useTranslations("common.format");
	const columns = React.useMemo<ColumnDef<ProjectSummary>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.project")} />,
				cell: ({ row }) => {
					const project = row.original;

					return (
						<div className="min-w-[280px] space-y-1">
							<Link
								href={`${basePath}/${encodeURIComponent(project.id)}`}
								className="font-medium text-foreground transition-colors hover:text-primary">
								{project.name}
							</Link>
							<p className="max-w-xl text-sm text-muted-foreground">
								{project.overview ?? t("overviewPending")}
							</p>
						</div>
					);
				}
			},
			{
				accessorKey: "place_types",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.placeTypes")} />,
				filterFn: getMultiValueFilterFn<ProjectSummary>(),
				cell: ({ row }) => {
					const placeTypes = row.original.place_types;
					if (placeTypes.length === 0) {
						return <span className="text-sm text-muted-foreground">{t("notSpecified")}</span>;
					}

					return (
						<div className="flex min-w-[220px] flex-wrap gap-1.5">
							{placeTypes.slice(0, 3).map(placeType => (
								<Badge
									key={`${row.original.id}_${placeType}`}
									variant="secondary"
									style={{ textTransform: "capitalize" }}>
									{placeType}
								</Badge>
							))}
							{placeTypes.length > 3 ? <Badge variant="outline">+{placeTypes.length - 3}</Badge> : null}
						</div>
					);
				}
			},
			{
				accessorKey: "status",
				header: ({ column }) => <DataTableColumnHeader column={column} title={t("columns.status")} />,
				filterFn: getMultiValueFilterFn<ProjectSummary>(),
				cell: ({ row }) => (
					<Badge
						variant="outline"
						className={cn(
							getProjectStatusClassName(row.original.status),
							"min-w-[110px] font-medium justify-center"
						)}>
						{t(`status.${row.original.status}`)}
					</Badge>
				)
			},
			{
				id: "date_range",
				accessorFn: project => `${project.start_date ?? ""}|${project.end_date ?? ""}`,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.dates")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block min-w-[150px] text-right text-sm text-muted-foreground tabular-nums">
						{formatProjectDateRange(row.original, formatT)}
					</span>
				),
				sortingFn: (leftRow, rightRow) => {
					const leftValue = leftRow.original.start_date ?? leftRow.original.end_date ?? "";
					const rightValue = rightRow.original.start_date ?? rightRow.original.end_date ?? "";
					return leftValue.localeCompare(rightValue);
				}
			},
			{
				id: "coverage",
				accessorFn: project => project.places_count,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.coverage")} align="end" />
				),
				cell: ({ row }) => (
					<div className="min-w-[140px] text-right text-sm text-muted-foreground tabular-nums">
						<p>{t("coverage.places", { count: row.original.places_count })}</p>
						<p>{t("coverage.auditors", { count: row.original.auditors_count })}</p>
					</div>
				)
			},
			{
				accessorKey: "average_scores",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={t("columns.meanScore")} align="end" />
				),
				cell: ({ row }) => (
					<span className="block min-w-[110px] text-right font-mono text-foreground tabular-nums">
						{formatScorePairLabel(row.original.average_scores, formatT)}
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
						} satisfies ColumnDef<ProjectSummary>
					]
				: [])
		],
		[basePath, formatT, getRowActions, t]
	);

	const placeTypeOptions = React.useMemo(() => {
		const uniquePlaceTypes = Array.from(new Set(projects.flatMap(project => project.place_types))).sort(
			(left, right) => left.localeCompare(right)
		);

		return uniquePlaceTypes.map(placeType => ({
			label: placeType,
			value: placeType
		}));
	}, [projects]);

	const statusOptions = React.useMemo(() => {
		return Array.from(new Set(projects.map(project => project.status))).map(status => ({
			label: t(`status.${status}`),
			value: status
		}));
	}, [projects, t]);

	return (
		<DataTable
			title={title ?? t("title")}
			description={description ?? t("description")}
			columns={columns}
			data={projects}
			searchColumnId="name"
			searchPlaceholder={t("searchPlaceholder")}
			filterConfigs={[
				{
					columnId: "status",
					title: t("columns.status"),
					options: statusOptions
				},
				{
					columnId: "place_types",
					title: t("columns.placeTypes"),
					options: placeTypeOptions
				}
			]}
			action={action}
			pageSize={pageSize}
			emptyMessage={emptyMessage ?? t("emptyMessage")}
			initialSorting={[{ id: "name", desc: false }]}
		/>
	);
}
