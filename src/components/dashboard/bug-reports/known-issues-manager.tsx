"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { playspaceApi } from "@/lib/api/playspace";
import type { KnownIssue, KnownIssueStatus } from "@/lib/api/playspace-types";

import { KnownIssueStatusBadge, Pill } from "./bug-report-badges";

const KNOWN_ISSUE_STATUSES: readonly KnownIssueStatus[] = ["open", "monitoring", "fixed"];

export function KnownIssuesManager() {
	const t = useTranslations("bugReport.admin.knownIssues");
	const statusT = useTranslations("bugReport.knownIssueStatus");
	const queryClient = useQueryClient();

	const [formOpen, setFormOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [symptoms, setSymptoms] = useState("");
	const [workaround, setWorkaround] = useState("");
	const [status, setStatus] = useState<KnownIssueStatus>("open");
	const [isPublished, setIsPublished] = useState(true);

	const issuesQuery = useQuery({
		queryKey: ["playspace", "admin", "known-issues"],
		queryFn: () => playspaceApi.bugReports.admin.knownIssues.list()
	});

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["playspace", "admin", "known-issues"] });

	const createIssue = useMutation({
		mutationFn: () =>
			playspaceApi.bugReports.admin.knownIssues.create({
				title: title.trim(),
				symptoms: symptoms.trim(),
				workaround: workaround.trim() === "" ? undefined : workaround.trim(),
				status,
				tags: [],
				surfaces: [],
				is_published: isPublished
			}),
		onSuccess: () => {
			toast.success(t("toast.created"));
			setTitle("");
			setSymptoms("");
			setWorkaround("");
			setStatus("open");
			setIsPublished(true);
			setFormOpen(false);
			void invalidate();
		},
		onError: () => toast.error(t("toast.error"))
	});

	const togglePublish = useMutation({
		mutationFn: (issue: KnownIssue) =>
			playspaceApi.bugReports.admin.knownIssues.update(issue.id, { is_published: !issue.is_published }),
		onSuccess: () => void invalidate(),
		onError: () => toast.error(t("toast.error"))
	});

	const deleteIssue = useMutation({
		mutationFn: (issueId: string) => playspaceApi.bugReports.admin.knownIssues.delete(issueId),
		onSuccess: () => {
			toast.success(t("toast.deleted"));
			void invalidate();
		},
		onError: () => toast.error(t("toast.error"))
	});

	const canCreate = title.trim().length > 0 && symptoms.trim().length > 0 && !createIssue.isPending;
	const issues = issuesQuery.data ?? [];
	const publishedCount = issues.filter(i => i.is_published).length;

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-3 rounded-card border border-edge/60 bg-muted/30 p-4">
				<div className="flex items-start gap-3">
					<span className="grid size-9 shrink-0 place-items-center rounded-full bg-status-warning-surface text-status-warning">
						<Lightbulb className="size-4.5" aria-hidden="true" />
					</span>
					<div>
						<p className="text-sm font-medium text-foreground">{t("explainerTitle")}</p>
						<p className="mt-0.5 text-sm text-text-secondary">{t("explainerBody")}</p>
					</div>
				</div>
				<Collapsible open={formOpen} onOpenChange={setFormOpen}>
					<CollapsibleTrigger asChild>
						<Button type="button" size="sm">
							<Plus className="size-4" aria-hidden="true" />
							{t("create")}
						</Button>
					</CollapsibleTrigger>
				</Collapsible>
			</div>

			<Collapsible open={formOpen} onOpenChange={setFormOpen}>
				<CollapsibleContent>
					<div className="grid gap-4 rounded-card border border-edge/60 p-5">
						<p className="text-sm font-semibold">{t("createHeading")}</p>
						<div className="grid gap-1.5">
							<Label htmlFor="known-issue-title">{t("fields.title")}</Label>
							<Input
								id="known-issue-title"
								value={title}
								onChange={e => setTitle(e.target.value)}
								placeholder={t("placeholders.title")}
							/>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<Label htmlFor="known-issue-symptoms">{t("fields.symptoms")}</Label>
								<Textarea
									id="known-issue-symptoms"
									rows={3}
									value={symptoms}
									onChange={e => setSymptoms(e.target.value)}
									placeholder={t("placeholders.symptoms")}
								/>
							</div>
							<div className="grid gap-1.5">
								<Label htmlFor="known-issue-workaround">{t("fields.workaround")}</Label>
								<Textarea
									id="known-issue-workaround"
									rows={3}
									value={workaround}
									onChange={e => setWorkaround(e.target.value)}
									placeholder={t("placeholders.workaround")}
								/>
							</div>
						</div>
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div className="grid gap-1.5">
								<Label htmlFor="known-issue-status">{t("fields.status")}</Label>
								<Select value={status} onValueChange={v => setStatus(v as KnownIssueStatus)}>
									<SelectTrigger id="known-issue-status" className="w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{KNOWN_ISSUE_STATUSES.map(value => (
											<SelectItem key={value} value={value}>
												{statusT(value)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2">
								<Checkbox
									id="known-issue-published"
									checked={isPublished}
									onCheckedChange={v => setIsPublished(v === true)}
								/>
								<Label htmlFor="known-issue-published" className="cursor-pointer">
									{t("fields.published")}
								</Label>
							</div>
							<Button type="button" disabled={!canCreate} onClick={() => createIssue.mutate()}>
								{t("create")}
							</Button>
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>

			{issuesQuery.isLoading ? (
				<div className="space-y-2">
					{[0, 1].map(i => (
						<Skeleton key={i} className="h-20 w-full rounded-md" />
					))}
				</div>
			) : issues.length === 0 ? (
				<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
			) : (
				<>
					<p className="text-xs text-text-secondary">
						{t("summary", { total: issues.length, published: publishedCount })}
					</p>
					<ul className="grid gap-3">
						{issues.map(issue => (
							<li key={issue.id} className="rounded-card border border-edge/60 p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<p className="font-medium text-foreground">{issue.title}</p>
											<KnownIssueStatusBadge status={issue.status} />
											<Pill tone={issue.is_published ? "success" : "neutral"}>
												{issue.is_published ? t("published") : t("draft")}
											</Pill>
										</div>
										<p className="mt-1.5 text-sm text-text-secondary">{issue.symptoms}</p>
										{issue.workaround ? (
											<p className="mt-2 text-sm text-foreground">
												<span className="font-medium">{t("workaroundLabel")}: </span>
												{issue.workaround}
											</p>
										) : null}
									</div>
									<div className="flex shrink-0 items-center gap-3">
										<label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
											<Checkbox
												checked={issue.is_published}
												onCheckedChange={() => togglePublish.mutate(issue)}
												aria-label={issue.is_published ? t("unpublish") : t("publish")}
											/>
											{t("publishedShort")}
										</label>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => deleteIssue.mutate(issue.id)}
											aria-label={t("delete")}>
											<Trash2 className="size-4" aria-hidden="true" />
										</Button>
									</div>
								</div>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
