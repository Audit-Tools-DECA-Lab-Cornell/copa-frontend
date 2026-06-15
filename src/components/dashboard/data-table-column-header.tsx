"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableColumnHeaderProps<TData, TValue> extends React.ComponentProps<"div"> {
	column: Column<TData, TValue>;
	title: string;
	align?: "start" | "end";
}

/**
 * Shared sortable column header used across dashboard tables.
 */
export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
	align = "start"
}: Readonly<DataTableColumnHeaderProps<TData, TValue>>) {
	if (!column.getCanSort()) {
		return (
			<div
				className={cn(
					"flex w-full items-center leading-none font-semibold",
					align === "end" ? "justify-end text-right" : "justify-start",
					className
				)}>
				{title}
			</div>
		);
	}

	const sortedState = column.getIsSorted();

	return (
		<div
			className={cn(
				"flex w-full items-center gap-2",
				align === "end" ? "justify-end" : "justify-start",
				className
			)}>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className={cn(
					"h-8 rounded-md text-xs font-semibold tracking-[0.08em] text-foreground/70 hover:text-foreground",
					align === "end" ? "ml-auto justify-end px-0 text-right" : "-ml-3 px-3"
				)}
				onClick={() => column.toggleSorting(sortedState === "asc")}>
				<span>{title}</span>
				{sortedState === "desc" ? (
					<ArrowDownIcon className="size-3.5" />
				) : sortedState === "asc" ? (
					<ArrowUpIcon className="size-3.5" />
				) : (
					<ArrowUpDownIcon className="size-3.5" />
				)}
			</Button>
		</div>
	);
}
