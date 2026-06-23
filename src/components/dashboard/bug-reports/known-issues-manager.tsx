"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Column, ColumnDef, ExpandedState, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	useReactTable
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { playspaceApi } from "@/lib/api/playspace";
import type { KnownIssue, KnownIssueStatus } from "@/lib/api/playspace-types";
import { cn } from "@/lib/utils";

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
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const [sorting, setSorting] = useState<SortingState>([]);

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
	const issues = useMemo(() => issuesQuery.data ?? [], [issuesQuery.data]);
	const publishedCount = issues.filter(i => i.is_published).length;

	const columns = useMemo<ColumnDef<KnownIssue>[]>(
		() => [
			{
				id: "issue",
				accessorFn: row => row.title,
				header: ({ column }) => (
					<SortableHeader title={t("columns.issue")} column={column} sortByLabel={t("sortBy")} />
				),
				cell: ({ row }) => {
					const issue = row.original;
					const isOpen = row.getIsExpanded();
					return (
						<button
							type="button"
							onClick={row.getToggleExpandedHandler()}
							aria-expanded={isOpen}
							aria-label={issue.title}
							className="group/toggle flex w-full min-w-[260px] items-start gap-2.5 py-0.5 text-left">
							<span
								className={cn(
									"mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-edge/50 bg-card text-text-secondary transition-colors group-hover/toggle:border-edge group-hover/toggle:text-foreground",
									isOpen && "border-solid-primary/40 bg-solid-primary/10 text-solid-primary"
								)}>
								{isOpen ? (
									<ChevronDown className="size-4" aria-hidden="true" />
								) : (
									<ChevronRight className="size-4" aria-hidden="true" />
								)}
							</span>
							<span className="flex min-w-0 flex-col gap-1.5">
								<KnownIssueStatusBadge status={issue.status} />
								<span className="truncate font-semibold text-foreground">{issue.title}</span>
							</span>
						</button>
					);
				}
			},
			{
				id: "visibility",
				accessorFn: row => (row.is_published ? 1 : 0),
				header: ({ column }) => (
					<SortableHeader title={t("columns.visibility")} column={column} sortByLabel={t("sortBy")} />
				),
				cell: ({ row }) => {
					const issue = row.original;
					return (
						<label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
							<Checkbox
								checked={issue.is_published}
								onCheckedChange={() => togglePublish.mutate(issue)}
								aria-label={issue.is_published ? t("unpublish") : t("publish")}
							/>
							<Pill tone={issue.is_published ? "success" : "neutral"}>
								{issue.is_published ? t("published") : t("draft")}
							</Pill>
						</label>
					);
				}
			},
			{
				id: "actions",
				enableSorting: false,
				header: () => <span className="block text-right">{t("columns.actions")}</span>,
				cell: ({ row }) => (
					<div className="flex justify-end">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => deleteIssue.mutate(row.original.id)}
							aria-label={t("delete")}>
							<Trash2 className="size-4" aria-hidden="true" />
						</Button>
					</div>
				)
			}
		],
		[t, togglePublish, deleteIssue]
	);

	const table = useReactTable({
		data: issues,
		columns,
		state: { expanded, sorting },
		getRowId: row => row.id,
		onExpandedChange: setExpanded,
		onSortingChange: setSorting,
		getRowCanExpand: () => true,
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getSortedRowModel: getSortedRowModel()
	});

	const visibleRows = table.getRowModel().rows;

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden p-0">
				<CardHeader className="gap-2 border-b-2 border-edge/50 py-5">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-1">
							<CardTitle>{t("title")}</CardTitle>
							<CardDescription>{t("explainerBody")}</CardDescription>
						</div>
						<div className="flex items-center gap-2 self-start">
							{issues.length > 0 ? (
								<Badge variant="secondary">
									{t("summary", { published: publishedCount, total: issues.length })}
								</Badge>
							) : null}
							<Button type="button" size="sm" onClick={() => setFormOpen(open => !open)}>
								<Plus className="size-4" aria-hidden="true" />
								{t("create")}
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					{formOpen ? (
						<div className="grid gap-4 border-b-2 border-edge/50 px-6 py-5">
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
					) : null}

					{issuesQuery.isLoading ? (
						<div className="space-y-2 p-6">
							{[0, 1, 2].map(i => (
								<Skeleton key={i} className="h-16 w-full rounded-md" />
							))}
						</div>
					) : issues.length === 0 ? (
						<div className="p-6">
							<EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
						</div>
					) : (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map(headerGroup => (
									<TableRow key={headerGroup.id} className="hover:bg-transparent">
										{headerGroup.headers.map(header => {
											const sorted = header.column.getIsSorted();
											return (
												<TableHead
													key={header.id}
													aria-sort={
														sorted === "asc"
															? "ascending"
															: sorted === "desc"
																? "descending"
																: "none"
													}
													className={cn(header.id === "actions" && "text-right")}>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
												</TableHead>
											);
										})}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{visibleRows.map(row => (
									<Fragment key={row.id}>
										<TableRow data-state={row.getIsExpanded() ? "selected" : undefined}>
											{row.getVisibleCells().map(cell => (
												<TableCell
													key={cell.id}
													className={cn(
														"align-middle",
														cell.column.id === "actions" && "text-right"
													)}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
										</TableRow>
										{row.getIsExpanded() ? (
											<TableRow className="bg-muted/25 hover:bg-muted/25">
												<TableCell colSpan={row.getVisibleCells().length} className="px-6 py-5">
													<div className="rounded-md border border-edge/40 bg-background p-4 shadow-[0_3px_0_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.08)]">
														<KnownIssueDetail issue={row.original} />
													</div>
												</TableCell>
											</TableRow>
										) : null}
									</Fragment>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function KnownIssueDetail({ issue }: Readonly<{ issue: KnownIssue }>) {
	const t = useTranslations("bugReport.admin.knownIssues");
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<section>
				<h4 className="mb-1.5 text-xs font-bold tracking-wide text-foreground uppercase">
					{t("fields.symptoms")}
				</h4>
				<p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{issue.symptoms}</p>
			</section>
			<section>
				<h4 className="mb-1.5 text-xs font-bold tracking-wide text-foreground uppercase">
					{t("fields.workaround")}
				</h4>
				<p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
					{issue.workaround ? issue.workaround : <span className="text-text-secondary">-</span>}
				</p>
			</section>
		</div>
	);
}

function SortableHeader({
	title,
	column,
	sortByLabel
}: Readonly<{
	title: string;
	column: Column<KnownIssue, unknown>;
	sortByLabel: string;
}>) {
	const sorted = column.getIsSorted();
	return (
		<button
			type="button"
			onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			aria-label={sortByLabel.replace("{column}", title)}
			className={cn(
				"flex w-full items-center gap-2 text-left transition-colors hover:text-foreground",
				sorted && "font-bold text-foreground"
			)}>
			<span>{title}</span>
			{sorted === "asc" ? (
				<ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />
			) : sorted === "desc" ? (
				<ArrowDown className="size-3.5 shrink-0" aria-hidden="true" />
			) : (
				<ArrowUpDown className="size-3.5 shrink-0 opacity-40" aria-hidden="true" />
			)}
		</button>
	);
}
