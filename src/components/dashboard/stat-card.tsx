import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "neutral" | "primary" | "success" | "warning" | "info" | "danger" | "violet";

const toneClassesByTone: Record<StatTone, string> = {
	neutral: "bg-solid-neutral",
	primary: "bg-solid-primary",
	success: "bg-status-success",
	warning: "bg-status-warning",
	info: "bg-stat-accent-info",
	danger: "bg-status-danger",
	violet: "bg-accent-violet"
};

const toneBorderByTone: Record<StatTone, string> = {
	neutral: "border-l-solid-neutral",
	primary: "border-l-solid-primary",
	success: "border-l-status-success",
	warning: "border-l-status-warning",
	info: "border-l-stat-accent-info",
	danger: "border-l-status-danger",
	violet: "border-l-accent-violet"
};

export interface StatCardProps {
	title: string;
	value: string;
	helper: string;
	tone?: StatTone;
	valueClassName?: string;
}

/**
 * Compact KPI card shared across dashboard pages.
 */
export function StatCard({ title, value, helper, tone = "neutral", valueClassName }: Readonly<StatCardProps>) {
	return (
		<Card
			className={cn(
				"relative flex flex-col justify-between gap-6 overflow-hidden border-l-2 bg-card/95",
				toneBorderByTone[tone]
			)}>
			<div className={cn("absolute inset-x-0 top-0 h-[3px]", toneClassesByTone[tone])} aria-hidden="true" />
			<CardHeader className="gap-2 border-edge/50">
				<CardTitle className="text-[13px] font-semibold tracking-[0.08em] text-text-secondary">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2.5">
				<div
					className={cn(
						"max-w-full overflow-hidden text-ellipsis font-mono text-[2.3rem] font-semibold leading-none tracking-tight text-foreground tabular-nums md:text-[2.5rem]",
						valueClassName
					)}>
					{value}
				</div>
				<p className="max-w-[28ch] text-sm leading-5 text-muted-foreground">{helper}</p>
			</CardContent>
		</Card>
	);
}
