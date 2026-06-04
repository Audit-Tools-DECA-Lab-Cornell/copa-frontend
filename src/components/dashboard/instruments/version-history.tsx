import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
	BadgeCheck,
	CalendarDays,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	GitBranch,
	History,
	Plus,
	Trash2
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { InstrumentContentViewer } from "./instrument-content-viewer";
import type { InstrumentContent, InstrumentVersionRow } from "./types";
import { suggestNextPublishedVersion } from "./utils";

interface VersionHistoryProps {
	versions: InstrumentVersionRow[];
	activeVersion: string | null;
	isPending: boolean;
	onActivateVersion: (v: InstrumentVersionRow) => void;
	onEditDraft: (version: string, content: InstrumentContent, parentInstrumentId: string) => void;
	onDeleteVersion: (v: InstrumentVersionRow) => void;
}

interface VersionBranch {
	root: InstrumentVersionRow;
	drafts: InstrumentVersionRow[];
}

function sortVersions(versions: InstrumentVersionRow[]): InstrumentVersionRow[] {
	return [...versions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function buildBranches(versions: InstrumentVersionRow[]): VersionBranch[] {
	const byId = new Map(versions.map(version => [version.id, version]));
	const draftsByParent = new Map<string, InstrumentVersionRow[]>();
	const roots: InstrumentVersionRow[] = [];

	for (const version of versions) {
		const parentId = version.parent_instrument_id;
		const hasVisibleParent = parentId !== null && byId.has(parentId) && !version.is_active;

		if (!hasVisibleParent) {
			roots.push(version);
			continue;
		}

		const currentDrafts = draftsByParent.get(parentId) ?? [];
		draftsByParent.set(parentId, [...currentDrafts, version]);
	}

	return sortVersions(roots).map(root => ({
		root,
		drafts: sortVersions(draftsByParent.get(root.id) ?? [])
	}));
}

export function VersionHistory({
	versions,
	activeVersion,
	isPending,
	onActivateVersion,
	onEditDraft,
	onDeleteVersion
}: Readonly<VersionHistoryProps>) {
	const t = useTranslations("admin.instruments");
	const [expandedList, setExpandedList] = useState(false);
	const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
	const [expandedBranchIds, setExpandedBranchIds] = useState<ReadonlySet<string>>(() => new Set());

	const branches = useMemo(() => buildBranches(versions), [versions]);
	const displayBranches = expandedList ? branches : branches.slice(0, 3);
	const hasMore = branches.length > 3;

	// Publications are the non-draft (root) rows; the next publication number is
	// derived from the highest of these, matching the server.
	const publishedVersions = useMemo(
		() => versions.filter(version => version.parent_instrument_id === null).map(version => version.version),
		[versions]
	);

	if (branches.length === 0) return null;

	function toggleVersionDetails(id: string) {
		setExpandedVersionId(current => (current === id ? null : id));
	}

	function toggleBranch(id: string) {
		setExpandedBranchIds(current => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	function renderVersionActions(version: InstrumentVersionRow) {
		const deleteButton = (
			<Button
				variant="outline"
				size="sm"
				disabled={!version.can_delete || isPending}
				data-testid="delete-version-button"
				onClick={() => onDeleteVersion(version)}>
				<Trash2 className="mr-2 h-4 w-4" />
				{t("versionHistory.delete")}
			</Button>
		);

		return (
			<div className="flex flex-wrap items-center justify-end gap-2">
				{version.is_active && (
					<Button
						variant="outline"
						size="sm"
						data-testid="edit-duplicate-button"
						onClick={() =>
							onEditDraft(version.version, version.content as unknown as InstrumentContent, version.id)
						}>
						<Plus className="mr-2 h-4 w-4" />
						{t("editThisVersion")}
					</Button>
				)}
				<Button
					variant={expandedVersionId === version.id ? "secondary" : "outline"}
					size="sm"
					data-testid="toggle-detail-button"
					onClick={() => toggleVersionDetails(version.id)}>
					{expandedVersionId === version.id ? (
						<ChevronUp className="mr-2 h-4 w-4" />
					) : (
						<ChevronDown className="mr-2 h-4 w-4" />
					)}
					{expandedVersionId === version.id
						? t("versionHistory.hideDetails")
						: t("versionHistory.viewDetails")}
				</Button>
				{!version.is_active && (
					<>
						{version.can_delete ? (
							deleteButton
						) : (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<span>{deleteButton}</span>
									</TooltipTrigger>
									<TooltipContent>
										<p>
											{t("versionHistory.deleteBlockedInUse", {
												count: version.submission_count
											})}
										</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
						<Button
							variant="secondary"
							size="sm"
							disabled={isPending}
							onClick={() => onActivateVersion(version)}>
							{t("versionHistory.makeActive")}
						</Button>
					</>
				)}
			</div>
		);
	}

	function renderVersionMeta(version: InstrumentVersionRow, variant: "root" | "draft") {
		return (
			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={
							variant === "root" ? "font-mono text-sm font-bold" : "font-mono text-sm font-semibold"
						}>
						v{version.version}
					</span>
					{version.is_active ? (
						<Badge variant="outline" className="border-status-success text-[10px] text-status-success">
							{t("versionHistory.active")}
						</Badge>
					) : (
						<Badge variant="secondary" className="text-[10px]">
							{t(variant === "draft" ? "versionHistory.draft" : "versionHistory.inactive")}
						</Badge>
					)}
					{variant === "draft" && (
						<Badge variant="outline" className="text-[10px]">
							{t("versionHistory.branchLabel")}
						</Badge>
					)}
					{!version.is_active && version.submission_count > 0 && version.parent_instrument_id === null && (
						<Badge variant="outline" className="text-[10px]">
							{t("versionHistory.auditUsage", { count: version.submission_count })}
						</Badge>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<CalendarDays className="h-3 w-3" />
						{format(new Date(version.created_at), "MMM d, yyyy HH:mm")}
					</span>
					{version.activated_at && (
						<span className="flex items-center gap-1 text-status-success/80">
							{t("versionHistory.activated", {
								date: format(new Date(version.activated_at), "MMM d, yyyy")
							})}
						</span>
					)}
				</div>
			</div>
		);
	}

	function renderVersionDetails(version: InstrumentVersionRow) {
		if (expandedVersionId !== version.id) return null;

		return (
			<div className="border-t border-border/40 bg-muted/5 px-4 pb-6 pt-6">
				<InstrumentContentViewer
					content={version.content as unknown as InstrumentContent}
					version={version.version}
					hideBorder={true}
				/>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-border/60 bg-card/40">
			<div className="flex flex-col gap-2 border-b border-border/40 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<History className="h-4 w-4 text-muted-foreground" />
					<h3 className="text-sm font-semibold">{t("versionHistory.title")}</h3>
					<Badge variant="secondary" className="ml-2 font-mono text-[10px]">
						{t("versionHistory.versions", { count: versions.length })}
					</Badge>
				</div>
				<p className="text-xs text-muted-foreground">{t("versionHistory.branchHelp")}</p>
				{activeVersion ? (
					<p className="text-xs text-muted-foreground">
						{t("versionHistory.versioningHelp", {
							activeVersion,
							nextDraftExample: `${activeVersion}.1`,
							nextPublishedExample: suggestNextPublishedVersion(publishedVersions)
						})}
					</p>
				) : null}
			</div>
			<div className="divide-y divide-border/40">
				{displayBranches.map(({ root, drafts }) => {
					const branchExpanded = expandedBranchIds.has(root.id);
					const hasDrafts = drafts.length > 0;

					return (
						<div key={root.id} className="flex flex-col bg-background/30">
							<div
								className={`flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 lg:flex-row lg:items-center lg:justify-between ${
									root.is_active ? "bg-status-success-surface/10" : ""
								}`}>
								<div className="flex min-w-0 items-start gap-3">
									<button
										type="button"
										className="mt-0.5 rounded-md border border-border/70 p-1 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
										disabled={!hasDrafts}
										aria-label={t("versionHistory.toggleBranches")}
										onClick={() => toggleBranch(root.id)}>
										{branchExpanded ? (
											<ChevronDown className="size-4" />
										) : (
											<ChevronRight className="size-4" />
										)}
									</button>
									<div className="mt-1">
										{root.is_active ? (
											<BadgeCheck className="h-5 w-5 text-status-success" />
										) : (
											<div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
										)}
									</div>
									<div className="min-w-0 space-y-2">
										{renderVersionMeta(root, "root")}
										<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
											<GitBranch className="h-3.5 w-3.5" />
											<span>{t("versionHistory.branchCount", { count: drafts.length })}</span>
										</div>
									</div>
								</div>
								{renderVersionActions(root)}
							</div>
							{renderVersionDetails(root)}
							{branchExpanded && (
								<div className="border-t border-border/40 bg-muted/10 px-4 py-3">
									{hasDrafts ? (
										<div className="space-y-2 border-l border-border/70 pl-4">
											{drafts.map(draft => (
												<div
													key={draft.id}
													className="overflow-hidden rounded-md border bg-background shadow-sm">
													<div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
														<div className="flex min-w-0 items-start gap-3">
															<div className="mt-2 h-px w-4 bg-border" />
															{renderVersionMeta(draft, "draft")}
														</div>
														{renderVersionActions(draft)}
													</div>
													{renderVersionDetails(draft)}
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											{t("versionHistory.noBranches")}
										</p>
									)}
								</div>
							)}
						</div>
					);
				})}
				{hasMore && (
					<div className="bg-muted/10 p-2 text-center">
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-xs text-muted-foreground"
							onClick={() => setExpandedList(!expandedList)}>
							{expandedList
								? t("versionHistory.showLess")
								: t("versionHistory.showMore", { count: branches.length - 3 })}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
