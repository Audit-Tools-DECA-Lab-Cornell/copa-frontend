"use client";

import type { LucideIcon } from "lucide-react";
import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export interface EntityRowAction {
	label: string;
	href?: string;
	onSelect?: () => void;
	icon?: LucideIcon;
	variant?: "default" | "destructive";
	disabled?: boolean;
}

export interface EntityRowActionsProps {
	label?: string;
	actions: EntityRowAction[];
}

/**
 * Reusable dropdown action menu used by entity tables.
 */
export function EntityRowActions({ label = "Actions", actions }: Readonly<EntityRowActionsProps>) {
	const t = useTranslations("shared.entityRowActions");
	const visibleActions = actions.filter(action => !action.disabled);
	if (visibleActions.length === 0) {
		return null;
	}
	const resolvedLabel = label === "Actions" ? t("label") : label;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="touch-manipulation"
					aria-label={resolvedLabel}>
					<MoreHorizontalIcon className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuLabel>{resolvedLabel}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{visibleActions.map(action => {
					const Icon = action.icon;

					if (action.href) {
						return (
							<DropdownMenuItem key={action.label} asChild variant={action.variant ?? "default"}>
								<Link href={action.href} className="flex items-center gap-2">
									{Icon ? <Icon className="size-4" /> : null}
									<span>{action.label}</span>
								</Link>
							</DropdownMenuItem>
						);
					}

					return (
						<DropdownMenuItem
							key={action.label}
							variant={action.variant ?? "default"}
							onClick={action.onSelect}
							className="flex items-center gap-2">
							{Icon ? <Icon className="size-4" /> : null}
							<span>{action.label}</span>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
