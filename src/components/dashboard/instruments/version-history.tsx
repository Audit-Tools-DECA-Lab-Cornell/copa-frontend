import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
	BadgeCheck,
	CalendarDays,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	GitBranch,
	History,
	Pencil,
	Trash2
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { InstrumentContentViewer } from "./instrument-content-viewer";
import type { InstrumentContent, InstrumentVersionRow } from "./types";
import { isDraftBranchVersion, suggestNextPublishedVersion } from "./utils";

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

	// Publications are the root (non-draft) rows; the preview's next number is the highest of these.
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
		const isExpanded = expandedVersionId === version.id;

		const detailsButton = (
			<button
				type="button"
				className="bru-btn bru-btn-ghost"
				data-testid="toggle-detail-button"
				aria-expanded={isExpanded}
				onClick={() => toggleVersionDetails(version.id)}>
				{isExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
				{isExpanded ? t("versionHistory.hideDetails") : t("versionHistory.viewDetails")}
			</button>
		);

		const deleteButton = (
			<button
				type="button"
				className="bru-btn bru-btn-danger"
				disabled={!version.can_delete || isPending}
				data-testid="delete-version-button"
				aria-label={t("versionHistory.deleteAria", { version: version.version })}
				onClick={() => onDeleteVersion(version)}>
				<Trash2 aria-hidden="true" />
				{t("versionHistory.delete")}
			</button>
		);

		return (
			<div className="flex flex-wrap items-center justify-end gap-2">
				{detailsButton}
				{version.is_active ? (
					<button
						type="button"
						className="bru-btn bru-btn-primary"
						data-testid="edit-duplicate-button"
						onClick={() =>
							onEditDraft(version.version, version.content as unknown as InstrumentContent, version.id)
						}>
						<Pencil aria-hidden="true" />
						{t("editThisVersion")}
					</button>
				) : (
					<>
						<button
							type="button"
							className="bru-btn bru-btn-primary"
							disabled={isPending}
							onClick={() => onActivateVersion(version)}>
							<Check aria-hidden="true" />
							{t("versionHistory.makeActive")}
						</button>
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
					</>
				)}
			</div>
		);
	}

	function renderVersionMeta(version: InstrumentVersionRow, variant: "root" | "draft") {
		// Orphan: a root carrying a draft-shaped number — a draft branch whose parent was deleted.
		const isOrphan = variant === "root" && !version.is_active && isDraftBranchVersion(version.version);

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
						<span className="bru-badge bru-badge-active" role="img" aria-label={t("versionHistory.active")}>
							{t("versionHistory.active")}
						</span>
					) : variant === "draft" ? (
						<span
							className="bru-badge bru-badge-draft"
							role="img"
							aria-label={t("versionHistory.branchLabel")}>
							{t("versionHistory.branchLabel")}
						</span>
					) : (
						<span
							className="bru-badge bru-badge-inactive"
							role="img"
							aria-label={t("versionHistory.inactive")}>
							{t("versionHistory.inactive")}
						</span>
					)}
					{isOrphan && (
						<span
							className="bru-badge bru-badge-orphan"
							role="img"
							aria-label={t("versionHistory.orphanedHelp")}
							title={t("versionHistory.orphanedHelp")}>
							{t("versionHistory.orphaned")}
						</span>
					)}
					{!version.is_active && version.submission_count > 0 && version.parent_instrument_id === null && (
						<span
							className="bru-badge bru-badge-inactive"
							role="img"
							aria-label={t("versionHistory.auditUsage", { count: version.submission_count })}>
							{t("versionHistory.auditUsage", { count: version.submission_count })}
						</span>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<CalendarDays className="h-3 w-3" aria-hidden="true" />
						{format(new Date(version.created_at), "MMM d, yyyy HH:mm")}
					</span>
					{version.activated_at && (
						<span
							className={`flex items-center gap-1 ${
								version.is_active ? "text-status-success/80" : "text-muted-foreground"
							}`}>
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
			<div className="border-t border-edge/30 bg-muted/5 px-4 pb-6 pt-6">
				<InstrumentContentViewer
					content={version.content as unknown as InstrumentContent}
					version={version.version}
					hideBorder={true}
				/>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-edge/50 bg-card/40">
			<div className="flex flex-col gap-2 border-b border-edge/30 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
					<h3 className="text-sm font-semibold">{t("versionHistory.title")}</h3>
					<Badge variant="secondary" className="ml-2 font-mono text-[10px]">
						{t("versionHistory.versions", { count: versions.length })}
					</Badge>
				</div>
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
								} ${branchExpanded ? "bru-version-row--expanded" : ""}`}>
								<div className="flex min-w-0 items-start gap-3">
									<button
										type="button"
										className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
										disabled={!hasDrafts}
										aria-expanded={branchExpanded}
										aria-label={t("versionHistory.expandBranchesAria", { version: root.version })}
										title={t("versionHistory.toggleBranchesHelp")}
										onClick={() => toggleBranch(root.id)}>
										{branchExpanded ? (
											<ChevronDown className="size-4" aria-hidden="true" />
										) : (
											<ChevronRight className="size-4" aria-hidden="true" />
										)}
									</button>
									<div className="mt-1">
										{root.is_active ? (
											<BadgeCheck className="h-5 w-5 text-status-success" aria-hidden="true" />
										) : (
											<div
												className="h-5 w-5 rounded-full border-2 border-muted-foreground/30"
												aria-hidden="true"
											/>
										)}
									</div>
									<div className="min-w-0 space-y-2">
										{renderVersionMeta(root, "root")}
										{hasDrafts && (
											<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
												<GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
												<span>{t("versionHistory.branchCount", { count: drafts.length })}</span>
											</div>
										)}
									</div>
								</div>
								{renderVersionActions(root)}
							</div>
							{renderVersionDetails(root)}
							{branchExpanded && (
								<div className="border-t border-edge/30 bg-muted/10 px-4 py-3">
									{hasDrafts ? (
										<div className="space-y-3">
											{drafts.map(draft => (
												<div
													key={draft.id}
													className="bru-draft-branch-card overflow-hidden rounded-md bg-background shadow-card">
													<span
														className="sr-only"
														role="img"
														aria-label={t("versionHistory.childBranchAria")}
													/>
													<div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
														<div className="flex min-w-0 items-start gap-3">
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
						<button
							type="button"
							className="bru-btn bru-btn-ghost"
							onClick={() => setExpandedList(!expandedList)}>
							{expandedList
								? t("versionHistory.showLess")
								: t("versionHistory.showMore", { count: branches.length - 3 })}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
