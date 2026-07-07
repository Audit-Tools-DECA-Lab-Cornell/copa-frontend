import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionHeaderLevel = "h2" | "h3";

export type SectionHeaderVariant = "default" | "ruled" | "accent";

export interface SectionHeaderProps {
	title: string;
	description?: string;
	eyebrow?: string;
	actions?: ReactNode;
	/** Semantic heading level; visual size stays the same so hierarchy comes from page structure. */
	as?: SectionHeaderLevel;
	/**
	 * "default" - plain title block.
	 * "ruled" - hard bottom rule, for section breaks on the page canvas.
	 * "accent" - solid terracotta tick before the title, for the page's primary section.
	 */
	variant?: SectionHeaderVariant;
	className?: string;
}

/**
 * Shared section header for content groups below the page header.
 *
 * Sits between `DashboardHeader` (inverted page block) and `CardTitle`
 * (inside cards) in the header hierarchy and reuses the same
 * `--section-title-*` design tokens as `CardTitle`.
 */
export function SectionHeader({
	title,
	description,
	eyebrow,
	actions,
	as: Heading = "h2",
	variant = "default",
	className
}: Readonly<SectionHeaderProps>) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
				variant === "ruled" && "border-b-2 border-edge/60 pb-3",
				className
			)}>
			<div className={cn("space-y-1", variant === "accent" && "border-l-[3px] border-primary pl-3")}>
				{eyebrow ? (
					<p className="text-(length:--eyebrow-size) font-semibold tracking-(--eyebrow-tracking) text-text-secondary uppercase">
						{eyebrow}
					</p>
				) : null}
				<Heading className="text-(length:--section-title-size) leading-(--section-title-line-height) font-semibold tracking-(--section-title-tracking) text-balance text-foreground md:text-(length:--section-title-size-lg)">
					{title}
				</Heading>
				{description ? (
					<p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
				) : null}
			</div>
			{actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
		</div>
	);
}
