"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export interface PaginationControlsProps {
	currentPage: number;
	pageCount: number;
	totalItems: number;
	pageSize: number;
	itemLabel: string;
	onPageChange: (nextPage: number) => void;
}

/**
 * Compact pagination footer shared across long dashboard lists.
 */
export function PaginationControls({
	currentPage,
	pageCount,
	totalItems,
	pageSize,
	itemLabel,
	onPageChange
}: Readonly<PaginationControlsProps>) {
	const t = useTranslations("shared.pagination");

	if (pageCount <= 1) {
		return null;
	}

	const rangeStart = (currentPage - 1) * pageSize + 1;
	const rangeEnd = Math.min(currentPage * pageSize, totalItems);

	return (
		<div className="flex flex-col gap-3 border-t-2 border-edge/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-sm text-muted-foreground">
				{t("showing", { start: rangeStart, end: rangeEnd, total: totalItems, itemLabel })}
			</p>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-1.5 touch-manipulation"
					disabled={currentPage <= 1}
					onClick={() => {
						onPageChange(currentPage - 1);
					}}>
					<ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
					{t("previous")}
				</Button>
				<p className="min-w-24 text-center text-sm text-muted-foreground tabular-nums">
					{t("page", { current: currentPage, total: pageCount })}
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-1.5 touch-manipulation"
					disabled={currentPage >= pageCount}
					onClick={() => {
						onPageChange(currentPage + 1);
					}}>
					{t("next")}
					<ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
				</Button>
			</div>
		</div>
	);
}
