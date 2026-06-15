"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Compact, per-field premium "translate this block with AI" affordance.
 *
 * Like {@link AiTranslateButton} this is intentionally presentation-only: it
 * advertises an upcoming paid capability to translate a single text block on
 * demand. It performs no translation and has no click handler - the tooltip
 * explains it ships with a future premium plan. Shown next to individual
 * translatable fields while editing a non-base language.
 */
export function AiTranslateFieldButton({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations("admin.instruments.content");

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t("aiTranslateField")}
						className={cn(
							"h-6 w-6 shrink-0 text-violet-500/70 hover:bg-violet-500/10 hover:text-violet-600 dark:text-violet-300/70",
							className
						)}>
						<Sparkles className="h-3.5 w-3.5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="max-w-[240px]">{t("aiTranslateFieldTooltip")}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/**
 * Premium "Translate with AI" affordance.
 *
 * This is intentionally a presentation-only feature: it advertises an upcoming
 * paid capability to auto-translate the active language from the base language.
 * It performs no translation and makes no network calls - the popover explains
 * that it ships with a future premium plan. Wiring it to a real provider is the
 * only change needed to make it functional.
 *
 * @param targetLang The language that would be auto-filled, for the copy.
 * @param baseLang The source language translations would be generated from.
 */
export function AiTranslateButton({ targetLang, baseLang }: Readonly<{ targetLang: string; baseLang: string }>) {
	const t = useTranslations("admin.instruments.content");

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-10 gap-1.5 border-violet-400/50 bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300">
					<Sparkles className="h-4 w-4" />
					{t("aiTranslate")}
					<Badge
						variant="outline"
						className="ml-0.5 border-violet-400/50 bg-background/40 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
						{t("premiumBadge")}
					</Badge>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				<PopoverHeader>
					<PopoverTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-violet-500" />
						{t("aiTranslateTitle")}
					</PopoverTitle>
					<PopoverDescription>
						{t("aiTranslateDesc", {
							target: targetLang.toUpperCase(),
							base: baseLang.toUpperCase()
						})}
					</PopoverDescription>
				</PopoverHeader>
				<div className="mt-3 rounded-md border border-violet-400/30 bg-violet-500/5 p-3 text-xs text-muted-foreground">
					{t("aiTranslateComingSoon")}
				</div>
				<Button disabled className="mt-3 w-full gap-1.5" size="sm">
					<Sparkles className="h-4 w-4" />
					{t("aiTranslateCta")}
				</Button>
			</PopoverContent>
		</Popover>
	);
}
