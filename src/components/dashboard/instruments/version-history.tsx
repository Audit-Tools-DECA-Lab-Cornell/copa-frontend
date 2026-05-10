import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, CalendarDays, History, Sparkles } from "lucide-react";
import { format } from "date-fns";
import type { InstrumentVersionRow } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function VersionHistory({
	versions,
	isPending,
	onActivateVersion,
	onSelectVersion
}: Readonly<{
	versions: InstrumentVersionRow[];
	isPending: boolean;
	onActivateVersion: (v: InstrumentVersionRow) => void;
	onSelectVersion: (v: InstrumentVersionRow) => void;
}>) {
	const t = useTranslations("admin.instruments.versionHistory");
	const [expanded, setExpanded] = useState(false);

	const sortedVersions = useMemo(() => {
		return [...versions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	}, [versions]);

	const displayVersions = expanded ? sortedVersions : sortedVersions.slice(0, 3);
	const hasMore = sortedVersions.length > 3;

	if (sortedVersions.length === 0) return null;

	return (
		<div className="rounded-lg border border-border/60 bg-card/40">
			<div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
				<History className="h-4 w-4 text-muted-foreground" />
				<h3 className="text-sm font-semibold">{t("title")}</h3>
				<Badge variant="secondary" className="ml-2 font-mono text-[10px]">
					{sortedVersions.length} {t("versions")}
				</Badge>
			</div>
			<div className="divide-y divide-border/40">
				{displayVersions.map(v => (
					<div
						key={v.version}
						className={`flex items-center justify-between p-4 transition-colors hover:bg-muted/30 ${
							v.is_active ? "bg-status-success-surface/10" : ""
						}`}>
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
											{t("active")}
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
											<Sparkles className="h-3 w-3" />
											{t("activated")} {format(new Date(v.activated_at), "MMM d, yyyy")}
										</span>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								data-testid="edit-duplicate-button"
								onClick={() => onSelectVersion(v)}>
								{t("viewDetails")}
							</Button>
							{!v.is_active && (
								<Button
									variant="secondary"
									size="sm"
									disabled={isPending}
									onClick={() => onActivateVersion(v)}>
									{t("makeActive")}
								</Button>
							)}
						</div>
					</div>
				))}
				{hasMore && (
					<div className="bg-muted/10 p-2 text-center">
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-xs text-muted-foreground"
							onClick={() => setExpanded(!expanded)}>
							{expanded ? t("showLess") : t("showMore", { count: sortedVersions.length - 3 })}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
