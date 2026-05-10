import { useTranslations } from "next-intl";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDiffPath } from "./utils";

export interface InstrumentChange {
	path: (string | number)[];
	oldValue: unknown;
	newValue: unknown;
}

export function ReviewChangesDialog({
	open,
	changes,
	isPending,
	onConfirm,
	onCancel
}: Readonly<{
	open: boolean;
	changes: InstrumentChange[];
	isPending: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	return (
		<AlertDialog open={open} onOpenChange={open ? undefined : onCancel}>
			<AlertDialogContent className="max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle>{t("reviewTitle")}</AlertDialogTitle>
					<AlertDialogDescription>{t("reviewDescription")}</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="my-4">
					<h4 className="mb-2 text-sm font-semibold flex items-center gap-2">
						<AlertCircle className="h-4 w-4 text-status-warning" />
						{t("detectedChanges", { count: changes.length })}
					</h4>
					<ScrollArea className="h-[300px] rounded-md border border-border/60 bg-muted/20 p-4">
						{changes.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full py-8 text-center">
								<CheckCircle2 className="h-8 w-8 text-status-success mb-2 opacity-50" />
								<p className="text-sm text-muted-foreground">{t("noChanges")}</p>
							</div>
						) : (
							<div className="space-y-6">
								{changes.map((change, idx) => (
									<div key={idx} className="space-y-2">
										<p className="font-mono text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded inline-block">
											{formatDiffPath(change.path)}
										</p>
										<div className="flex items-center gap-2 text-sm">
											<div className="flex-1 rounded border border-status-error-border bg-status-error-surface/20 p-2 line-through opacity-70">
												{JSON.stringify(change.oldValue)}
											</div>
											<ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
											<div className="flex-1 rounded border border-status-success-border bg-status-success-surface/20 p-2 font-medium">
												{JSON.stringify(change.newValue)}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</ScrollArea>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isPending}
						className="bg-status-success hover:bg-status-success/90">
						{isPending ? t("publishing") : t("publishAndActivate")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

