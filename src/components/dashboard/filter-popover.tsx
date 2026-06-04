"use client";

import { FilterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export interface FilterPopoverOption {
	label: string;
	value: string;
}

export interface FilterPopoverProps {
	/** Display label shown on the trigger button and popover heading. */
	title: string;
	/** Available options rendered as checkboxes. */
	options: FilterPopoverOption[];
	/** Currently selected option values. */
	selectedValues: string[];
	/** Called whenever the selection changes. */
	onChange: (values: string[]) => void;
	/** Render the trigger as a bru-btn-neutral block instead of a shadcn Button. */
	bruTrigger?: boolean;
}

/**
 * A reusable multi-select filter popover used in server-paginated table
 * toolbars.  Selections apply immediately (no staged draft state) and are
 * reflected on the trigger button as a count badge.
 */
export function FilterPopover({ title, options, selectedValues, onChange, bruTrigger }: FilterPopoverProps) {
	function handleCheckedChange(value: string, checked: boolean): void {
		if (checked) {
			onChange([...selectedValues, value]);
		} else {
			onChange(selectedValues.filter(v => v !== value));
		}
	}

	const countPill =
		selectedValues.length > 0 ? (
			<span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded border-0 bg-white/20 px-1 font-mono text-[11px] leading-none">
				{selectedValues.length}
			</span>
		) : null;

	return (
		<Popover>
			<PopoverTrigger asChild>
				{bruTrigger ? (
					<button type="button" className="bru-btn bru-btn-neutral gap-2">
						<FilterIcon className="size-3.5 shrink-0" />
						{title}
						{countPill}
					</button>
				) : (
					<Button variant="secondary" size="sm" className="gap-2 px-3.5">
						<FilterIcon className="size-3.5 shrink-0" />
						{title}
						{countPill}
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent className="w-64 p-3" align="start">
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="text-sm font-medium">{title}</h4>
						{selectedValues.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-auto p-0 text-xs text-muted-foreground"
								onClick={() => onChange([])}>
								Clear
							</Button>
						)}
					</div>
					<Separator />
					<div className="max-h-60 space-y-2 overflow-y-auto">
						{options.map(option => (
							<div key={option.value} className="flex items-center gap-2">
								<Checkbox
									id={`filter-${title}-${option.value}`}
									checked={selectedValues.includes(option.value)}
									onCheckedChange={checked => handleCheckedChange(option.value, checked === true)}
								/>
								<Label
									htmlFor={`filter-${title}-${option.value}`}
									className="text-sm font-normal leading-none">
									{option.label}
								</Label>
							</div>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
