"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "../ui/select";

export interface DataTablePaginationProps<TData> {
	table: Table<TData>;
	pageSizeOptions?: number[];
}

/**
 * Shared pagination footer for dashboard data tables.
 */
export function DataTablePagination<TData>({
	table,
	pageSizeOptions = [5, 10, 20, 50, 100]
}: Readonly<DataTablePaginationProps<TData>>) {
	const t = useTranslations("tables.shared.pagination");
	const totalFilteredRows =
		table.options.manualFiltering || table.options.manualPagination
			? table.getRowCount()
			: table.getFilteredRowModel().rows.length;
	const { pageIndex, pageSize } = table.getState().pagination;
	const startRow = totalFilteredRows === 0 ? 0 : pageIndex * pageSize + 1;
	const endRow = totalFilteredRows === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalFilteredRows);

	return (
		<div className="flex flex-col border-t-2 border-edge/60 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
			<div className="text-sm text-muted-foreground flex-1">
				{t("showing", { start: startRow, end: endRow, total: totalFilteredRows })}
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
				<div className="inline-flex min-w-max items-center gap-3 text-sm text-muted-foreground whitespace-nowrap">
					<span className="text-sm text-muted-foreground whitespace-nowrap">{t("rowsPerPage")}</span>
					<Select value={pageSize.toString()} onValueChange={value => table.setPageSize(Number(value))}>
						<SelectTrigger>
							<SelectValue placeholder={t("rowsPerPage")} />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map(option => (
								<SelectItem key={option} value={option.toString()}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="touch-manipulation"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}>
						<ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
						{/* <span>Previous</span> */}
					</Button>
					<div className="min-w-max text-center text-sm text-muted-foreground tabular-nums">
						{t("page", { current: pageIndex + 1, total: Math.max(1, table.getPageCount()) })}
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="touch-manipulation"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}>
						{/* <span>Next</span> */}
						<ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
					</Button>
				</div>
			</div>
		</div>
	);
}
