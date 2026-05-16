import { useId } from "react";
import { useTranslations } from "next-intl";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionDisplayCondition } from "@/types/audit";

export function EditableField({
	label,
	value,
	multiline,
	mono,
	onChange
}: Readonly<{
	label: string;
	value: string;
	multiline?: boolean;
	mono?: boolean;
	onChange: (value: string) => void;
}>) {
	const id = useId();

	return (
		<div className="space-y-1">
			<Label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</Label>
			{multiline ? (
				<Textarea
					id={id}
					className={`min-h-[60px] text-sm ${mono ? "font-mono" : ""}`}
					value={value}
					autoComplete="off"
					onChange={e => onChange(e.target.value)}
				/>
			) : (
				<Input
					id={id}
					className={`text-sm ${mono ? "font-mono" : ""}`}
					value={value}
					autoComplete="off"
					onChange={e => onChange(e.target.value)}
				/>
			)}
		</div>
	);
}

export function StatBox({ label, value, textValue }: Readonly<{ label: string; value?: number; textValue?: string }>) {
	return (
		<div className="rounded-lg border border-border/70 bg-background p-3 flex flex-col justify-between gap-2">
			<p className="text-xs font-semibold text-muted-foreground">{label}</p>
			{textValue !== undefined ? (
				<p
					className="mt-0.5 text-xl text-primary font-bold no-scrollbar overflow-x-scroll whitespace-nowrap"
					title={textValue}>
					{textValue}
				</p>
			) : (
				<p className="text-2xl font-bold tabular-nums">{value}</p>
			)}
		</div>
	);
}

const SCALE_COLORS: Record<string, string> = {
	provision: "border-accent-slate/40 bg-accent-slate/10 text-accent-slate",
	diversity: "border-accent-moss/40 bg-accent-moss/10 text-accent-moss",
	challenge: "border-accent-terracotta/40 bg-accent-terracotta/10 text-accent-terracotta",
	sociability: "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
};

export function ScaleKeyBadge({ scaleKey }: Readonly<{ scaleKey: string }>) {
	const t = useTranslations("admin.instruments.content");
	const colorClasses = SCALE_COLORS[scaleKey] ?? "border-border bg-muted/40";
	const label = t.has(`scaleLabels.${scaleKey}`) ? t(`scaleLabels.${scaleKey}`) : scaleKey;

	return (
		<span
			className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium ${colorClasses}`}>
			{label}
		</span>
	);
}

export function DisplayConditionBadge({ condition }: Readonly<{ condition: QuestionDisplayCondition }>) {
	const t = useTranslations("admin.instruments.content");
	const optionKeysStr = condition.any_of_option_keys.join(", ");

	return (
		<Badge
			variant="outline"
			className="gap-1 border-status-warning-border bg-status-warning-surface text-xs text-status-warning">
			<GitBranch className="h-3 w-3" />
			{t("displayIfLabel", {
				questionKey: condition.question_key,
				scaleKey: condition.response_key,
				optionKeys: optionKeysStr
			})}
		</Badge>
	);
}
