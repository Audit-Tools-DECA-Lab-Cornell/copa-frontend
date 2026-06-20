"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { KnownIssueMatch } from "@/lib/api/playspace-types";

export interface KnownIssueMatchListProps {
	matches: readonly KnownIssueMatch[];
}

/**
 * Shows likely known-issue matches (with workarounds) so a reporter can resolve
 * their problem before filing a duplicate.
 */
export function KnownIssueMatchList({ matches }: Readonly<KnownIssueMatchListProps>) {
	const t = useTranslations("bugReport");

	if (matches.length === 0) {
		return null;
	}

	return (
		<section className="rounded-md border border-border bg-muted/40 p-3">
			<p className="mb-2 text-sm font-medium">{t("matches.heading")}</p>
			<ul className="grid gap-2">
				{matches.map(match => (
					<li key={match.id} className="rounded-md border border-border bg-background p-3">
						<div className="flex items-start justify-between gap-2">
							<p className="text-sm font-medium">{match.title}</p>
							<Badge variant="outline">{t(`knownIssueStatus.${match.status}`)}</Badge>
						</div>
						<p className="mt-1 text-sm text-muted-foreground">{match.symptoms}</p>
						{match.workaround ? (
							<p className="mt-2 text-sm">
								<span className="font-medium">{t("matches.workaroundLabel")}: </span>
								{match.workaround}
							</p>
						) : null}
					</li>
				))}
			</ul>
		</section>
	);
}
