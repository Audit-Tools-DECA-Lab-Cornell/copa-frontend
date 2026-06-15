"use client";

import type {
	ColumnDef,
	ColumnFiltersState,
	FilterFn,
	PaginationState,
	SortingState,
	Updater,
	VisibilityState
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { type DataTableFilterConfig, DataTableToolbar } from "./data-table-toolbar";

export const multiValueFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
	if (!Array.isArray(filterValue) || filterValue.length === 0) {
		return true;
	}

	const cellValue = row.getValue(columnId);
	if (Array.isArray(cellValue)) {
		const normalizedCellValues = new Set(cellValue.map(String));
		return filterValue.some(value => normalizedCellValues.has(String(value)));
	}

	return filterValue.includes(String(cellValue));
};

export function getMultiValueFilterFn<TData>(): FilterFn<TData> {
	return multiValueFilterFn as FilterFn<TData>;
}

export interface DataTableProps<TData, TValue> {
	title?: string;
	description?: string;
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	searchColumnId?: string;
	searchPlaceholder?: string;
	filterConfigs?: DataTableFilterConfig[];
	toolbarExtra?: React.ReactNode;
	action?: React.ReactNode;
	emptyMessage?: string;
	initialSorting?: SortingState;
	pageSize?: number;
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
	onRowClick?: (row: TData) => void;
}

/**
 * Shared enterprise-style data table used across dashboard entity screens.
 */
export function DataTable<TData, TValue>({
	title,
	description,
	columns,
	data,
	searchColumnId,
	searchPlaceholder,
	filterConfigs = [],
	toolbarExtra,
	action,
	emptyMessage,
	initialSorting = [],
	pageSize = 10,
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
	isFetching = false,
	onRowClick
}: Readonly<DataTableProps<TData, TValue>>) {
	const t = useTranslations("tables.shared");
	const [internalSorting, setInternalSorting] = React.useState<SortingState>(initialSorting);
	const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize
	});
	const sorting = sortingState ?? internalSorting;
	const columnFilters = columnFiltersState ?? internalColumnFilters;
	const pagination = paginationState ?? internalPagination;

	const handleSortingChange = React.useCallback(
		(updater: Updater<SortingState>) => {
			const nextState = typeof updater === "function" ? updater(sorting) : updater;
			if (onSortingStateChange) {
				onSortingStateChange(nextState);
				return;
			}
			setInternalSorting(nextState);
		},
		[onSortingStateChange, sorting]
	);
	const handleColumnFiltersChange = React.useCallback(
		(updater: Updater<ColumnFiltersState>) => {
			const nextState = typeof updater === "function" ? updater(columnFilters) : updater;
			if (onColumnFiltersStateChange) {
				onColumnFiltersStateChange(nextState);
				return;
			}
			setInternalColumnFilters(nextState);
		},
		[columnFilters, onColumnFiltersStateChange]
	);
	const handlePaginationChange = React.useCallback(
		(updater: Updater<PaginationState>) => {
			const nextState = typeof updater === "function" ? updater(pagination) : updater;
			if (onPaginationStateChange) {
				onPaginationStateChange(nextState);
				return;
			}
			setInternalPagination(nextState);
		},
		[onPaginationStateChange, pagination]
	);

	const table = useReactTable({
		data,
		columns,
		filterFns: {
			multiValue: multiValueFilterFn
		},
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			pagination
		},
		onSortingChange: handleSortingChange,
		onColumnFiltersChange: handleColumnFiltersChange,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: handlePaginationChange,
		manualPagination,
		manualSorting,
		manualFiltering,
		rowCount,
		pageCount,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
		getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
		getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel()
	});

	return (
		<Card className="overflow-hidden">
			{title || description ? (
				<CardHeader className="gap-1 border-b-2 pb-4 border-edge/50">
					{title ? <CardTitle>{title}</CardTitle> : null}
					{description ? <CardDescription>{description}</CardDescription> : null}
				</CardHeader>
			) : null}
			<DataTableToolbar
				table={table}
				searchColumnId={searchColumnId}
				searchPlaceholder={searchPlaceholder}
				filterConfigs={filterConfigs}
				toolbarExtra={toolbarExtra}
				action={action}
				isFetching={isFetching}
			/>
			{/* min height is the number of rows * the height of the row */}
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow key={headerGroup.id} className="hover:bg-transparent">
								{headerGroup.headers.map(header => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length > 0 ? (
							table.getRowModel().rows.map(row => {
								const rowProps =
									typeof onRowClick === "function"
										? {
												onClick: () => onRowClick(row.original),
												className: "cursor-pointer hover:bg-muted/50"
											}
										: {};
								return (
									<TableRow key={row.id} data-state={row.getIsSelected() && "selected"} {...rowProps}>
										{row.getVisibleCells().map(cell => (
											<TableCell key={cell.id}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								);
							})
						) : (
							<TableRow className="hover:bg-transparent">
								<TableCell
									colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
									className="h-28 text-center text-sm text-muted-foreground">
									{emptyMessage ?? t("emptyMessage")}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
			<DataTablePagination table={table} />
		</Card>
	);
}
