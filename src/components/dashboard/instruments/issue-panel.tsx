"use client";

import { AlertTriangle, ArrowRight, CircleAlert, Info, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { languageLabel } from "./instrument-edit-context";
import { groupIssues, type InstrumentIssue, type IssueSeverity } from "./instrument-issues";

const SEVERITY_ORDER: Record<IssueSeverity, number> = { save: 0, publish: 1, warning: 2 };

const SEVERITY_STYLE: Record<IssueSeverity, { container: string; icon: string }> = {
	save: {
		container: "border-status-error-border bg-status-error-surface/20",
		icon: "text-destructive"
	},
	publish: {
		container: "border-status-warning-border bg-status-warning-surface/20",
		icon: "text-status-warning"
	},
	warning: {
		container: "border-edge/40 bg-muted/30",
		icon: "text-muted-foreground"
	}
};

/** How many issues of one severity to list before offering to expand. */
const COLLAPSED_LIMIT = 5;

/**
 * What still has to be sorted out, and a way to get to each one.
 *
 * Issues are grouped by what they block and then by language, so a long list
 * stays readable instead of becoming dozens of competing alerts. Every row is a
 * button: it switches to the right language and tab, opens the section and
 * question it lives in, and puts the cursor in the field that causes it.
 */
export function IssuePanel({
	issues,
	onReview,
	onRepair
}: Readonly<{
	issues: readonly InstrumentIssue[];
	onReview: (issue: InstrumentIssue) => void;
	/** Offered when broken keys can be fixed on a copy rather than by hand. */
	onRepair?: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	if (issues.length === 0) return null;

	const bySeverity = new Map<IssueSeverity, InstrumentIssue[]>();
	for (const issue of issues) {
		const bucket = bySeverity.get(issue.severity);
		if (bucket) bucket.push(issue);
		else bySeverity.set(issue.severity, [issue]);
	}

	const severities = [...bySeverity.keys()].sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b]);

	return (
		<div className="space-y-3" aria-live="polite">
			{severities.map(severity => {
				const group = bySeverity.get(severity) ?? [];
				const style = SEVERITY_STYLE[severity];
				const isExpanded = expanded[severity] ?? false;
				const byLocale = groupIssues(group);
				// The limit applies to each language's list, so the count has to be
				// summed the same way - otherwise the button offers to reveal rows
				// that are already on screen.
				const hiddenCount = [...byLocale.values()].reduce(
					(total, localeIssues) => total + Math.max(0, localeIssues.length - COLLAPSED_LIMIT),
					0
				);

				return (
					<section
						key={severity}
						className={`space-y-2 rounded-md border px-3 py-2.5 ${style.container}`}
						aria-label={t(`issueGroups.${severity}`)}>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
								{severity === "save" ? (
									<CircleAlert className={`h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
								) : severity === "publish" ? (
									<AlertTriangle className={`h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
								) : (
									<Info className={`h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
								)}
								{t(`issueGroups.${severity}`)}
								<span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
									{group.length}
								</span>
							</h3>
							{severity === "save" && onRepair ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-8 gap-1.5"
									onClick={onRepair}>
									<Wrench className="h-3.5 w-3.5" aria-hidden="true" />
									{t("repair.action")}
								</Button>
							) : null}
						</div>

						<p className="text-xs leading-relaxed text-muted-foreground">
							{t(`issueGroups.${severity}Body`)}
						</p>

						{[...byLocale.entries()].map(([locale, localeIssues]) => {
							const visible = isExpanded ? localeIssues : localeIssues.slice(0, COLLAPSED_LIMIT);
							return (
								<div key={locale} className="space-y-1">
									{byLocale.size > 1 && (
										<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
											{languageLabel(locale)}
										</p>
									)}
									<ul className="space-y-1">
										{visible.map(issue => (
											<li key={issue.id}>
												<button
													type="button"
													onClick={() => onReview(issue)}
													className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-background/70 focus-visible:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
													<span className="min-w-0 flex-1">
														<span className="block text-xs leading-5 text-foreground">
															{t(`issues.${issue.code}`, issue.values)}
														</span>
														<span className="block font-mono text-[10px] leading-4 text-muted-foreground">
															{issue.location}
														</span>
													</span>
													<span className="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
														{t("reviewIssue")}
														<ArrowRight className="h-3 w-3" aria-hidden="true" />
													</span>
												</button>
											</li>
										))}
									</ul>
								</div>
							);
						})}

						{hiddenCount > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 text-xs"
								aria-expanded={isExpanded}
								onClick={() => setExpanded(current => ({ ...current, [severity]: !isExpanded }))}>
								{isExpanded ? t("issuesShowLess") : t("issuesShowAll", { count: hiddenCount })}
							</Button>
						)}
					</section>
				);
			})}
		</div>
	);
}
