"use client";

import { AlertTriangle, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { ConditionResolutions, RepairPlan } from "./option-key-repair";

/**
 * Give every answer in a copy its own key, with the exact changes shown first.
 *
 * Nothing about the source version changes: the repair produces a working copy
 * the admin still has to save. Labels, scores, flags, order and keys that are
 * already sound are carried over untouched - only rows that cannot be told
 * apart get a new key.
 */
export function RepairDialog({
	open,
	plan,
	onConfirm,
	onCancel
}: Readonly<{
	open: boolean;
	plan: RepairPlan | null;
	onConfirm: (resolutions: ConditionResolutions) => void;
	onCancel: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const [resolutions, setResolutions] = useState<ConditionResolutions>({});

	if (!plan) return null;

	const unresolved = plan.conditionChoices.filter(choice => !resolutions[choice.id]);
	const blocked = plan.blockedMismatches.length > 0;
	const canConfirm = plan.repairable && unresolved.length === 0;

	function close() {
		setResolutions({});
		onCancel();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next) close();
			}}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Wrench className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						{t("repair.title")}
					</DialogTitle>
					<DialogDescription>{t("repair.description")}</DialogDescription>
				</DialogHeader>

				{blocked ? (
					<div
						role="alert"
						className="space-y-2 rounded-md border border-status-error-border bg-status-error-surface/20 px-3 py-2.5">
						<p className="flex items-center gap-2 text-sm font-medium text-foreground">
							<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
							{t("repair.blockedTitle")}
						</p>
						<p className="text-xs leading-relaxed text-muted-foreground">{t("repair.blockedBody")}</p>
						<ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
							{plan.blockedMismatches.slice(0, 8).map(mismatch => (
								<li key={`${mismatch.locale}-${mismatch.owner}-${mismatch.reason}`}>
									<span className="font-mono">{mismatch.locale.toUpperCase()}</span> ·{" "}
									<span className="font-mono">{mismatch.owner}</span> ·{" "}
									{t(`repair.mismatch.${mismatch.reason}`)}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{!blocked && plan.generatorUnavailable ? (
					<div
						role="alert"
						className="space-y-1 rounded-md border border-status-error-border bg-status-error-surface/20 px-3 py-2.5">
						<p className="flex items-center gap-2 text-sm font-medium text-foreground">
							<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
							{t("repair.generatorUnavailableTitle")}
						</p>
						<p className="text-xs leading-relaxed text-muted-foreground">
							{t("repair.generatorUnavailableBody")}
						</p>
					</div>
				) : null}

				{!blocked && !plan.generatorUnavailable && plan.repairs.length === 0 ? (
					<p className="text-sm text-muted-foreground">{t("repair.nothingToDo")}</p>
				) : null}

				{!blocked && plan.repairs.length > 0 ? (
					<div className="space-y-3">
						<div className="space-y-1.5">
							<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{t("repair.changesHeading", { count: plan.repairs.length })}
							</Label>
							<ScrollArea className="max-h-56 rounded-md border border-edge/40">
								<table className="w-full text-left text-xs">
									<thead className="sticky top-0 bg-muted/60">
										<tr>
											<th className="px-2 py-1.5 font-medium text-muted-foreground">
												{t("repair.columnRow")}
											</th>
											<th className="px-2 py-1.5 font-medium text-muted-foreground">
												{t("optionLabel")}
											</th>
											<th className="px-2 py-1.5 font-medium text-muted-foreground">
												{t("repair.columnChange")}
											</th>
										</tr>
									</thead>
									<tbody>
										{plan.repairs.map(repair => (
											<tr key={repair.id} className="border-t border-edge/25 align-top">
												<td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
													{repair.location}
												</td>
												<td className="px-2 py-1.5">{repair.label || "-"}</td>
												<td className="px-2 py-1.5 font-mono text-[11px]">
													<span className="text-destructive line-through">
														{repair.oldKey || "-"}
													</span>{" "}
													<span aria-hidden="true">→</span>{" "}
													<span className="text-foreground">{repair.newKey}</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</ScrollArea>
						</div>

						{plan.conditionChoices.length > 0 ? (
							<div className="space-y-2">
								<Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{t("repair.choicesHeading")}
								</Label>
								<p className="text-xs leading-relaxed text-muted-foreground">
									{t("repair.choicesBody")}
								</p>
								{plan.conditionChoices.map(choice => (
									<div
										key={choice.id}
										className="space-y-1 rounded-md border border-status-warning-border bg-status-warning-surface/20 px-2.5 py-2">
										<p className="text-xs text-foreground">
											{t("repair.choiceLabel", {
												questionKey: choice.questionKey,
												sourceQuestionKey: choice.sourceQuestionKey,
												key: choice.ambiguousKey
											})}
										</p>
										<Select
											value={resolutions[choice.id] ?? ""}
											onValueChange={value =>
												setResolutions(current => ({ ...current, [choice.id]: value }))
											}>
											<SelectTrigger className="h-9 w-full text-sm">
												<SelectValue placeholder={t("repair.choicePlaceholder")} />
											</SelectTrigger>
											<SelectContent>
												{choice.candidates.map(candidate => (
													<SelectItem key={candidate.newKey} value={candidate.newKey}>
														{t("repair.choiceOption", {
															position: candidate.position,
															label: candidate.label || candidate.newKey
														})}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								))}
							</div>
						) : null}

						<p className="text-xs leading-relaxed text-muted-foreground">{t("repair.draftOnlyNote")}</p>
					</div>
				) : null}

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={close}>
						{t("cancel")}
					</Button>
					<Button
						disabled={!canConfirm}
						title={unresolved.length > 0 ? t("repair.resolveFirst") : undefined}
						onClick={() => {
							onConfirm(resolutions);
							setResolutions({});
						}}>
						{t("repair.confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
