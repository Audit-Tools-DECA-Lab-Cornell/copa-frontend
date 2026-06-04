import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AdminToolbar({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<div
			className={cn(
				"sticky top-0 z-10 -mx-1 border-b border-edge/40 bg-background/95 px-1 py-3 backdrop-blur supports-backdrop-filter:bg-background/80",
				className
			)}>
			<div className="space-y-3">{children}</div>
		</div>
	);
}

export function AdminToolbarRow({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<div className={cn("flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", className)}>
			{children}
		</div>
	);
}

export function AdminToolbarGroup({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function ToolbarDivider({ className }: Readonly<{ className?: string }>) {
	return <span className={cn("hidden h-8 w-px shrink-0 bg-border lg:block", className)} aria-hidden="true" />;
}

export function ToolbarChip({
	children,
	className,
	tone = "neutral",
	title
}: Readonly<{
	children: ReactNode;
	className?: string;
	tone?: "neutral" | "draft" | "active" | "warning" | "violet";
	title?: string;
}>) {
	const toneClass = {
		neutral: "border-edge/50 bg-muted/30 text-foreground",
		draft: "border-status-pending-border bg-status-pending-surface text-solid-draft dark:border-solid-draft/40 dark:bg-solid-draft/25 dark:text-solid-draft-text",
		active: "border-status-success-border bg-status-success-surface/30 text-status-success",
		warning: "border-status-warning-border bg-status-warning-surface/30 text-status-warning",
		violet: "border-violet-400/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
	}[tone];

	return (
		<span
			className={cn(
				"inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium leading-none",
				toneClass,
				className
			)}
			title={title}>
			{children}
		</span>
	);
}

export function ToolbarLabel({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<span className={cn("text-xs font-semibold tracking-wide text-muted-foreground", className)}>{children}</span>
	);
}
