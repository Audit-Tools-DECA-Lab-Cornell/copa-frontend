import { useId } from "react";
import { useTranslations } from "next-intl";
import { GitBranch, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SCALE_BADGE_CLASS_NAMES, type PvScaleKey } from "@/lib/audit/scale-colors";
import type { QuestionDisplayCondition } from "@/types/audit";

import { useInstrumentEdit } from "./instrument-edit-context";
import { AiTranslateFieldButton } from "./ai-translate-button";

export function EditableField({
	label,
	value,
	multiline,
	mono,
	isKey,
	onChange
}: Readonly<{
	label: string;
	value: string;
	multiline?: boolean;
	mono?: boolean;
	/**
	 * Marks this field as a stable identifier (a key or a reference to one).
	 * Keys are owned by the base language; while translating another language
	 * the field renders read-only so the structural contract can't drift.
	 */
	isKey?: boolean;
	onChange: (value: string) => void;
}>) {
	const id = useId();
	const t = useTranslations("admin.instruments.content");
	const { translationMode, baseLang } = useInstrumentEdit();

	if (isKey && translationMode) {
		return (
			<LockedKeyField label={label} value={value} hint={t("keyLockedHint", { lang: baseLang.toUpperCase() })} />
		);
	}

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={id} className="text-xs text-muted-foreground">
					{label}
				</Label>
				{translationMode && <AiTranslateFieldButton className="-my-1" />}
			</div>
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

/** Read-only key field in translation mode (edit on base language). */
function LockedKeyField({ label, value, hint }: Readonly<{ label: string; value: string; hint: string }>) {
	return (
		<div className="space-y-1">
			<div className="flex items-center gap-1.5">
				<Label className="text-xs text-muted-foreground">{label}</Label>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Lock className="h-3 w-3 text-muted-foreground/70" aria-label={hint} />
						</TooltipTrigger>
						<TooltipContent>{hint}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<div
				className="flex h-9 items-center rounded-md border border-dashed border-edge/50 bg-muted/40 px-3 font-mono text-sm text-muted-foreground"
				title={hint}>
				<span className="truncate">{value || "-"}</span>
			</div>
		</div>
	);
}

export function StatBox({ label, value, textValue }: Readonly<{ label: string; value?: number; textValue?: string }>) {
	return (
		<div className="rounded-lg border border-edge/50 bg-background p-3 flex flex-col justify-between gap-2">
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

export function ScaleKeyBadge({ scaleKey }: Readonly<{ scaleKey: string }>) {
	const t = useTranslations("admin.instruments.content");
	const colorClasses = SCALE_BADGE_CLASS_NAMES[scaleKey as PvScaleKey] ?? "border-edge/40 bg-muted/40";
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
