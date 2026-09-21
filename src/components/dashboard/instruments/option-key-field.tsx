"use client";

import { Check, KeyRound, Lock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { issueElementId, type IssueTarget } from "./instrument-issues";
import { useOptionKeySessionOrNoop } from "./option-key-session";
import {
	applyOptionKeyOverride,
	isScaleOptionScope,
	OPTION_KEY_MAX_LENGTH,
	type OptionOwnerScope
} from "./option-keys";

/**
 * The stored identity of one answer.
 *
 * Ordinary editing never needs it: the key is minted when the answer is added
 * and then stays fixed, so renaming the label cannot re-point audits that have
 * already chosen it. It is shown as a quiet detail beneath the wording, and only
 * an answer added in this editing session - one no audit can have answered yet -
 * can still be given a key of the admin's choosing.
 */
export function OptionKeyChip({
	scope,
	optionKey,
	optionIndex,
	locale
}: Readonly<{
	scope: OptionOwnerScope;
	optionKey: string;
	optionIndex: number;
	locale: string;
}>) {
	const t = useTranslations("admin.instruments.content");
	const session = useOptionKeySessionOrNoop();
	const editable = session.canOverride(scope, optionKey);
	const open = session.isOverrideOpenFor(scope, optionKey);

	const target: IssueTarget = {
		locale,
		tab: scopeTab(scope),
		sectionKey: "sectionKey" in scope ? scope.sectionKey : undefined,
		questionKey: "questionKey" in scope ? scope.questionKey : undefined,
		scaleKey: "scaleKey" in scope ? scope.scaleKey : undefined,
		optionIndex,
		field: "optionKey"
	};

	return (
		<div className="flex min-w-0 items-center gap-1.5">
			<span
				id={issueElementId(target)}
				data-testid="option-key"
				tabIndex={-1}
				title={optionKey}
				className="min-w-0 truncate font-mono text-[10px] leading-4 text-muted-foreground/70">
				{optionKey || "-"}
			</span>
			{editable ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					aria-expanded={open}
					className="h-5 shrink-0 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
					onClick={() => (open ? session.cancelOverride() : session.openOverride(scope, optionKey))}>
					<KeyRound className="mr-1 h-3 w-3" aria-hidden="true" />
					{t("optionKeyAdvanced")}
				</Button>
			) : (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Lock
								className="h-3 w-3 shrink-0 text-muted-foreground/50"
								aria-label={t("optionKeyFixedHint")}
							/>
						</TooltipTrigger>
						<TooltipContent className="max-w-[260px]">{t("optionKeyFixedHint")}</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}
		</div>
	);
}

function scopeTab(scope: OptionOwnerScope): IssueTarget["tab"] {
	switch (scope.kind) {
		case "preAudit":
			return "preAudit";
		case "scaleGuidance":
			return "scales";
		case "executionModes":
			return "overview";
		default:
			return "sections";
	}
}

/**
 * Type a key for one answer and apply it as a single change.
 *
 * Apply validates the candidate and rewrites exactly the row it was opened for,
 * found by its current key rather than its position. A refusal keeps the typed
 * text and leaves the draft untouched, so nothing is half-applied.
 */
export function OptionKeyOverridePanel<T extends { key: string }>({
	scope,
	options,
	onApply
}: Readonly<{
	scope: OptionOwnerScope;
	options: readonly T[];
	onApply: (options: T[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const session = useOptionKeySessionOrNoop();
	const inputId = useId();
	const hintId = useId();
	const errorId = useId();

	const pending = session.pending;
	if (pending === null) return null;

	const currentKey = pending.optionKey;
	const errorCode = pending.code;

	function handleApply() {
		const candidate = (pending?.value ?? "").trim();
		const result = applyOptionKeyOverride(options, currentKey, candidate, session.retiredKeys(scope), {
			scaleOption: isScaleOptionScope(scope)
		});
		if (!result.ok) {
			session.failOverride(result.code);
			return;
		}
		// The old key stays reserved for the session: an audit answer can only mean
		// one thing, so a later answer must not be able to claim it back.
		session.noteRetired(scope, [currentKey]);
		session.noteCreated(scope, candidate);
		onApply(result.options);
		session.finishOverride();
	}

	return (
		<div className="rounded-md border border-accent-violet-border bg-accent-violet-surface/40 p-2.5">
			<div className="flex flex-wrap items-end gap-2">
				<div className="min-w-[200px] flex-1 space-y-1">
					<Label htmlFor={inputId} className="text-[11px] font-medium text-foreground">
						{t("optionKeyHeading")}
					</Label>
					<Input
						id={inputId}
						autoFocus
						value={pending.value}
						maxLength={OPTION_KEY_MAX_LENGTH}
						aria-invalid={errorCode ? true : undefined}
						aria-describedby={errorCode ? `${hintId} ${errorId}` : hintId}
						onChange={event => session.changeOverride(event.target.value)}
						onKeyDown={event => {
							if (event.key === "Enter") {
								event.preventDefault();
								handleApply();
							} else if (event.key === "Escape") {
								session.cancelOverride();
							}
						}}
						className="h-8 font-mono text-xs"
					/>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<Button type="button" size="sm" className="h-8 gap-1.5" onClick={handleApply}>
						<Check className="h-3.5 w-3.5" aria-hidden="true" />
						{t("optionKeyApply")}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="h-8 gap-1.5"
						onClick={() => session.cancelOverride()}>
						<X className="h-3.5 w-3.5" aria-hidden="true" />
						{t("optionKeyCancel")}
					</Button>
				</div>
			</div>
			<p id={hintId} className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
				{t("optionKeyOverrideHint")}
			</p>
			{errorCode ? (
				<p id={errorId} role="alert" className="mt-1 text-[11px] font-medium leading-4 text-destructive">
					{t(`optionKeyErrors.${errorCode}`)}
				</p>
			) : null}
		</div>
	);
}
