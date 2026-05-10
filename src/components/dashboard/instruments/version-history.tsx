import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, CalendarDays, ChevronDown, ChevronUp, History, Plus } from "lucide-react";
import { format } from "date-fns";
import type { InstrumentContent, InstrumentVersionRow } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstrumentContentViewer } from "./instrument-content-viewer";

export function VersionHistory({
	versions,
	isPending,
	onActivateVersion,
	onEditDraft
}: Readonly<{
	versions: InstrumentVersionRow[];
	isPending: boolean;
	onActivateVersion: (v: InstrumentVersionRow) => void;
	onEditDraft: (version: string, content: InstrumentContent) => void;
}>) {
	const t = useTranslations("admin.instruments");
	const [expandedList, setExpandedList] = useState(false);
	const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

	const sortedVersions = useMemo(() => {
		return [...versions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	}, [versions]);

	const displayVersions = expandedList ? sortedVersions : sortedVersions.slice(0, 3);
	const hasMore = sortedVersions.length > 3;

	if (sortedVersions.length === 0) return null;

	const handleToggleVersion = (id: string) => {
		setExpandedVersionId(expandedVersionId === id ? null : id);
	};

	return (
		<div className="rounded-lg border border-border/60 bg-card/40">
			<div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
				<History className="h-4 w-4 text-muted-foreground" />
				<h3 className="text-sm font-semibold">{t("versionHistory.title")}</h3>
				<Badge variant="secondary" className="ml-2 font-mono text-[10px]">
					{t("versionHistory.versions", { count: sortedVersions.length })}
				</Badge>
			</div>
			<div className="divide-y divide-border/40">
				{displayVersions.map(v => {
					const isExpanded = expandedVersionId === v.id;
					return (
						<div key={v.version} className="flex flex-col">
							<div
								className={`flex items-center justify-between p-4 transition-colors hover:bg-muted/30 ${
									v.is_active ? "bg-status-success-surface/10" : ""
								} ${isExpanded ? "bg-muted/20" : ""}`}>
								<div className="flex items-start gap-4">
									<div className="mt-1">
										{v.is_active ? (
											<BadgeCheck className="h-5 w-5 text-status-success" />
										) : (
											<div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
										)}
									</div>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-mono text-sm font-bold">v{v.version}</span>
											{v.is_active && (
												<Badge
													variant="outline"
													className="border-status-success text-[10px] text-status-success">
													{t("versionHistory.active")}
												</Badge>
											)}
										</div>
										<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
											<span className="flex items-center gap-1">
												<CalendarDays className="h-3 w-3" />
												{format(new Date(v.created_at), "MMM d, yyyy HH:mm")}
											</span>
											{v.activated_at && (
												<span className="flex items-center gap-1 text-status-success/80">
													{t("versionHistory.activated", {
														date: format(new Date(v.activated_at), "MMM d, yyyy")
													})}
												</span>
											)}
										</div>
									</div>
								</div>
								<div className="flex items-center gap-2">
									{v.is_active && (
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												onEditDraft(v.version, v.content as unknown as InstrumentContent)
											}>
											<Plus className="mr-2 h-4 w-4" />
											{t("editThisVersion")}
										</Button>
									)}
									<Button
										variant={isExpanded ? "secondary" : "outline"}
										size="sm"
										data-testid="toggle-detail-button"
										onClick={() => handleToggleVersion(v.id)}>
										{isExpanded ? (
											<ChevronUp className="mr-2 h-4 w-4" />
										) : (
											<ChevronDown className="mr-2 h-4 w-4" />
										)}
										{isExpanded ? t("versionHistory.hideDetails") : t("versionHistory.viewDetails")}
									</Button>
									{!v.is_active && (
										<Button
											variant="secondary"
											size="sm"
											disabled={isPending}
											onClick={() => onActivateVersion(v)}>
											{t("versionHistory.makeActive")}
										</Button>
									)}
								</div>
							</div>
							{isExpanded && (
								<div className="border-t border-border/40 bg-muted/5 px-4 pb-6 pt-6">
									<InstrumentContentViewer
										content={v.content as unknown as InstrumentContent}
										version={v.version}
										hideBorder={true}
									/>
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
								: t("versionHistory.showMore", { count: sortedVersions.length - 3 })}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
