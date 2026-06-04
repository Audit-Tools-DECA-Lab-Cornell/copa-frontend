"use client";

import * as React from "react";
import type { ColumnFiltersState, Table, VisibilityState } from "@tanstack/react-table";
import { ListFilterIcon, Loader2Icon, Settings2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export interface DataTableFilterOption {
	label: string;
	value: string;
}

export interface DataTableFilterConfig {
	columnId: string;
	title: string;
	options: DataTableFilterOption[];
}

export interface DataTableToolbarProps<TData> {
	table: Table<TData>;
	searchColumnId?: string;
	searchPlaceholder?: string;
	filterConfigs?: DataTableFilterConfig[];
	toolbarExtra?: React.ReactNode;
	action?: React.ReactNode;
	isFetching?: boolean;
}

/**
 * Read a multi-select filter value from TanStack state as a string array.
 */
function readStringArrayFilterValue(rawValue: unknown): string[] {
	if (!Array.isArray(rawValue)) {
		return [];
	}

	return rawValue.filter((value): value is string => typeof value === "string");
}

/**
 * Compare two string arrays without caring about item order.
 */
function areStringArraysEqual(leftValues: readonly string[], rightValues: readonly string[]): boolean {
	if (leftValues.length !== rightValues.length) {
		return false;
	}

	const leftSet = new Set(leftValues);
	return rightValues.every(value => leftSet.has(value));
}

/**
 * Convert an internal column identifier into a human-readable label.
 */
function humanizeColumnId(columnId: string): string {
	const withSpaces = columnId
		.replaceAll("_", " ")
		.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
		.trim();
	if (withSpaces.length === 0) {
		return columnId;
	}

	return `${withSpaces.charAt(0).toUpperCase()}${withSpaces.slice(1)}`;
}

/**
 * Normalize free-text search before it is committed to the table state.
 */
function normalizeSearchValue(value: string): string {
	return value.trim();
}

/**
 * Create an empty draft object for the configured multi-select filters.
 */
function createEmptyDraftFilterValues(filterConfigs: readonly DataTableFilterConfig[]): Record<string, string[]> {
	return Object.fromEntries(filterConfigs.map(config => [config.columnId, [] as string[]]));
}

/**
 * Remove managed filters while preserving unrelated table filters.
 */
function filterOutColumnFilters(
	columnFilters: Readonly<ColumnFiltersState>,
	excludedColumnIds: ReadonlySet<string>
): ColumnFiltersState {
	return columnFilters.filter(filter => !excludedColumnIds.has(filter.id));
}

/**
 * Shared table toolbar with smooth search, staged filters, and staged column visibility controls.
 */
export function DataTableToolbar<TData>({
	table,
	searchColumnId,
	searchPlaceholder,
	filterConfigs = [],
	toolbarExtra,
	action,
	isFetching = false
}: Readonly<DataTableToolbarProps<TData>>) {
	const t = useTranslations("tables.shared.toolbar");
	const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : null;
	const hideableColumns = React.useMemo(() => {
		return table.getAllColumns().filter(column => column.getCanHide());
	}, [table]);
	const tableState = table.getState();
	const rawSearchValue = searchColumn?.getFilterValue();
	const committedSearchValue = typeof rawSearchValue === "string" ? rawSearchValue : "";
	const committedFilterValues = React.useMemo(() => {
		const nextFilterValues: Record<string, string[]> = {};
		for (const config of filterConfigs) {
			const matchedFilter = tableState.columnFilters.find(filter => filter.id === config.columnId);
			nextFilterValues[config.columnId] = readStringArrayFilterValue(matchedFilter?.value);
		}
		return nextFilterValues;
	}, [filterConfigs, tableState.columnFilters]);
	const committedColumnVisibility = React.useMemo(() => {
		const nextVisibilityState: VisibilityState = {};
		for (const column of hideableColumns) {
			nextVisibilityState[column.id] = tableState.columnVisibility[column.id] ?? column.getIsVisible();
		}
		return nextVisibilityState;
	}, [hideableColumns, tableState.columnVisibility]);
	const committedFilterSignature = JSON.stringify(committedFilterValues);
	const committedColumnVisibilitySignature = JSON.stringify(committedColumnVisibility);
	const emptyDraftFilterValues = React.useMemo(() => {
		return createEmptyDraftFilterValues(filterConfigs);
	}, [filterConfigs]);
	const managedFilterColumnIds = React.useMemo(() => {
		return new Set(filterConfigs.map(config => config.columnId));
	}, [filterConfigs]);
	const [draftSearchValue, setDraftSearchValue] = React.useState(committedSearchValue);
	const [draftFilterValues, setDraftFilterValues] = React.useState<Record<string, string[]>>(() => {
		return committedFilterValues;
	});
	const [draftColumnVisibility, setDraftColumnVisibility] = React.useState<VisibilityState>(() => {
		return committedColumnVisibility;
	});
	const [isFiltersMenuOpen, setIsFiltersMenuOpen] = React.useState(false);
	const [isColumnsMenuOpen, setIsColumnsMenuOpen] = React.useState(false);
	const resolvedSearchPlaceholder = searchPlaceholder ?? t("searchPlaceholder");
	const appliedFilterCount = React.useMemo(() => {
		return filterConfigs.reduce((count, config) => {
			return count + (committedFilterValues[config.columnId] ?? []).length;
		}, 0);
	}, [committedFilterValues, filterConfigs]);
	const hasDraftFilterSelections = React.useMemo(() => {
		return filterConfigs.some(config => {
			return (draftFilterValues[config.columnId] ?? []).length > 0;
		});
	}, [draftFilterValues, filterConfigs]);
	const hasPendingFilterChanges = React.useMemo(() => {
		return filterConfigs.some(config => {
			return !areStringArraysEqual(
				draftFilterValues[config.columnId] ?? [],
				committedFilterValues[config.columnId] ?? []
			);
		});
	}, [committedFilterValues, draftFilterValues, filterConfigs]);
	const hasPendingColumnVisibilityChanges = React.useMemo(() => {
		return hideableColumns.some(column => {
			return (draftColumnVisibility[column.id] ?? true) !== (committedColumnVisibility[column.id] ?? true);
		});
	}, [committedColumnVisibility, draftColumnVisibility, hideableColumns]);
	const canShowAllColumns = React.useMemo(() => {
		return hideableColumns.some(column => {
			return (draftColumnVisibility[column.id] ?? true) === false;
		});
	}, [draftColumnVisibility, hideableColumns]);

	const [prevCommittedSearchValue, setPrevCommittedSearchValue] = React.useState(committedSearchValue);
	if (committedSearchValue !== prevCommittedSearchValue) {
		setPrevCommittedSearchValue(committedSearchValue);
		setDraftSearchValue(committedSearchValue);
	}

	const [prevIsFiltersMenuOpen, setPrevIsFiltersMenuOpen] = React.useState(isFiltersMenuOpen);
	const [prevCommittedFilterSignature, setPrevCommittedFilterSignature] = React.useState(committedFilterSignature);
	if (isFiltersMenuOpen !== prevIsFiltersMenuOpen || committedFilterSignature !== prevCommittedFilterSignature) {
		setPrevIsFiltersMenuOpen(isFiltersMenuOpen);
		setPrevCommittedFilterSignature(committedFilterSignature);
		if (!isFiltersMenuOpen) {
			setDraftFilterValues(committedFilterValues);
		}
	}

	const [prevIsColumnsMenuOpen, setPrevIsColumnsMenuOpen] = React.useState(isColumnsMenuOpen);
	const [prevCommittedColumnVisibilitySignature, setPrevCommittedColumnVisibilitySignature] = React.useState(
		committedColumnVisibilitySignature
	);
	if (
		isColumnsMenuOpen !== prevIsColumnsMenuOpen ||
		committedColumnVisibilitySignature !== prevCommittedColumnVisibilitySignature
	) {
		setPrevIsColumnsMenuOpen(isColumnsMenuOpen);
		setPrevCommittedColumnVisibilitySignature(committedColumnVisibilitySignature);
		if (!isColumnsMenuOpen) {
			setDraftColumnVisibility(committedColumnVisibility);
		}
	}

	const commitSearchValue = React.useCallback(
		(rawValue: string) => {
			if (!searchColumnId) {
				return;
			}

			const normalizedValue = normalizeSearchValue(rawValue);
			const normalizedCommittedValue = normalizeSearchValue(committedSearchValue);
			if (normalizedValue === normalizedCommittedValue) {
				return;
			}

			const nextColumnFilters = filterOutColumnFilters(table.getState().columnFilters, new Set([searchColumnId]));
			if (normalizedValue.length > 0) {
				nextColumnFilters.push({
					id: searchColumnId,
					value: normalizedValue
				});
			}

			table.setColumnFilters(nextColumnFilters);
			table.setPageIndex(0);
		},
		[committedSearchValue, searchColumnId, table]
	);

	React.useEffect(() => {
		if (!searchColumnId) {
			return;
		}

		const timeoutId = globalThis.setTimeout(() => {
			commitSearchValue(draftSearchValue);
		}, 300);

		return () => {
			globalThis.clearTimeout(timeoutId);
		};
	}, [commitSearchValue, draftSearchValue, searchColumnId]);

	const handleToggleFilterValue = React.useCallback((columnId: string, optionValue: string, nextChecked: boolean) => {
		setDraftFilterValues(currentValue => {
			const currentColumnValues = currentValue[columnId] ?? [];
			const nextValues = nextChecked
				? Array.from(new Set([...currentColumnValues, optionValue]))
				: currentColumnValues.filter(value => value !== optionValue);
			return {
				...currentValue,
				[columnId]: nextValues
			};
		});
	}, []);

	const handleFiltersMenuOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			setDraftFilterValues(committedFilterValues);
			setIsFiltersMenuOpen(nextOpen);
		},
		[committedFilterValues]
	);

	const resetDraftFilters = React.useCallback(() => {
		setDraftFilterValues(emptyDraftFilterValues);
	}, [emptyDraftFilterValues]);

	const applyFilterChanges = React.useCallback(() => {
		if (!hasPendingFilterChanges) {
			return;
		}

		const nextColumnFilters = filterOutColumnFilters(table.getState().columnFilters, managedFilterColumnIds);
		for (const config of filterConfigs) {
			const nextValues = draftFilterValues[config.columnId] ?? [];
			if (nextValues.length > 0) {
				nextColumnFilters.push({
					id: config.columnId,
					value: nextValues
				});
			}
		}

		table.setColumnFilters(nextColumnFilters);
		table.setPageIndex(0);
		setIsFiltersMenuOpen(false);
	}, [draftFilterValues, filterConfigs, hasPendingFilterChanges, managedFilterColumnIds, table]);

	const handleColumnsMenuOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			setDraftColumnVisibility(committedColumnVisibility);
			setIsColumnsMenuOpen(nextOpen);
		},
		[committedColumnVisibility]
	);

	const showAllColumns = React.useCallback(() => {
		setDraftColumnVisibility(currentValue => {
			const nextVisibilityState: VisibilityState = { ...currentValue };
			for (const column of hideableColumns) {
				nextVisibilityState[column.id] = true;
			}
			return nextVisibilityState;
		});
	}, [hideableColumns]);

	const applyColumnVisibilityChanges = React.useCallback(() => {
		if (!hasPendingColumnVisibilityChanges) {
			return;
		}

		table.setColumnVisibility(draftColumnVisibility);
		setIsColumnsMenuOpen(false);
	}, [draftColumnVisibility, hasPendingColumnVisibilityChanges, table]);

	return (
		<div className="flex flex-col gap-4 px-6 pb-2 lg:justify-between lg:pt-2">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				{searchColumn ? (
					<div className="min-w-0 flex-1 lg:max-w-sm">
						<Input
							value={draftSearchValue}
							onChange={event => setDraftSearchValue(event.target.value)}
							onKeyDown={event => {
								if (event.key === "Enter") {
									event.preventDefault();
									commitSearchValue(draftSearchValue);
								}
							}}
							placeholder={resolvedSearchPlaceholder}
							className="h-10 w-full"
							aria-label={resolvedSearchPlaceholder}
						/>
					</div>
				) : (
					<div className="flex-1" />
				)}
				<div className="flex flex-wrap items-center gap-2 sm:justify-end">
					{isFetching ? (
						<Badge variant="outline" className="gap-1.5">
							<Loader2Icon className="size-3.5 animate-spin" />
							{t("updating")}
						</Badge>
					) : null}
				</div>
			</div>
			<div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-start">
				<div className="flex flex-wrap items-center gap-2">
					{toolbarExtra}
					{filterConfigs.length > 0 ? (
						<DropdownMenu open={isFiltersMenuOpen} onOpenChange={handleFiltersMenuOpenChange}>
							<DropdownMenuTrigger asChild>
								<Button type="button" variant="secondary" size="sm" className="gap-2 px-3.5">
									<ListFilterIcon className="size-3.5 shrink-0" />
									<span>{t("filters")}</span>
									{appliedFilterCount > 0 ? (
										<span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded border-0 bg-white/20 px-1 font-mono text-[11px] leading-none">
											{appliedFilterCount}
										</span>
									) : null}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-80 p-0">
								<div className="max-h-80 space-y-3 overflow-y-auto p-2.5">
									<DropdownMenuLabel className="px-2 py-1">{t("filters")}</DropdownMenuLabel>
									{filterConfigs.map((config, configIndex) => (
										<React.Fragment key={config.columnId}>
											{configIndex > 0 ? <DropdownMenuSeparator /> : null}
											<div className="space-y-1.5">
												<DropdownMenuLabel className="px-2 py-1 text-[13px]">
													{config.title}
												</DropdownMenuLabel>
												{config.options.length > 0 ? (
													config.options.map(option => {
														const selectedValues = draftFilterValues[config.columnId] ?? [];
														const isChecked = selectedValues.includes(option.value);

														return (
															<DropdownMenuCheckboxItem
																key={`${config.columnId}_${option.value}`}
																checked={isChecked}
																onSelect={event => event.preventDefault()}
																onCheckedChange={checked => {
																	handleToggleFilterValue(
																		config.columnId,
																		option.value,
																		Boolean(checked)
																	);
																}}>
																{option.label}
															</DropdownMenuCheckboxItem>
														);
													})
												) : (
													<p className="px-3 py-2 text-sm text-muted-foreground">
														{t("noOptions")}
													</p>
												)}
											</div>
										</React.Fragment>
									))}
								</div>
								<div className="flex items-center justify-between gap-2 border-t-2 border-edge/50 p-2.5">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={resetDraftFilters}
										disabled={!hasDraftFilterSelections && !hasPendingFilterChanges}>
										{t("reset")}
									</Button>
									<Button
										type="button"
										size="sm"
										onClick={applyFilterChanges}
										disabled={!hasPendingFilterChanges}>
										{t("applyChanges")}
									</Button>
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
					{action}
					{hideableColumns.length > 0 ? (
						<DropdownMenu open={isColumnsMenuOpen} onOpenChange={handleColumnsMenuOpenChange}>
							<DropdownMenuTrigger asChild>
								<Button type="button" variant="secondary" size="sm" className="gap-2 px-3.5">
									<Settings2Icon className="size-3.5 shrink-0" />
									<span>{t("columns")}</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-60 p-0">
								<div className="max-h-80 overflow-y-auto p-2.5">
									<DropdownMenuLabel className="px-2 py-1">{t("toggleColumns")}</DropdownMenuLabel>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="mb-2 w-full justify-start px-2"
										onClick={showAllColumns}
										disabled={!canShowAllColumns}>
										{t("showAllColumns")}
									</Button>
									<DropdownMenuSeparator />
									<div className="space-y-1 pt-2">
										{hideableColumns.map(column => (
											<DropdownMenuCheckboxItem
												key={column.id}
												checked={draftColumnVisibility[column.id] ?? column.getIsVisible()}
												onSelect={event => event.preventDefault()}
												onCheckedChange={checked => {
													setDraftColumnVisibility(currentValue => ({
														...currentValue,
														[column.id]: Boolean(checked)
													}));
												}}>
												{humanizeColumnId(column.id)}
											</DropdownMenuCheckboxItem>
										))}
									</div>
								</div>
								<div className="flex justify-end border-t-2 border-edge/50 p-2.5">
									<Button
										type="button"
										size="sm"
										onClick={applyColumnVisibilityChanges}
										disabled={!hasPendingColumnVisibilityChanges}>
										{t("applyChanges")}
									</Button>
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			</div>
		</div>
	);
}
