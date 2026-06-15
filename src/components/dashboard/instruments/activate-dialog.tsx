import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";

export function ActivateDialog({
	open,
	isPending,
	versionLabel,
	nextPublishedVersion,
	onConfirm,
	onCancel
}: Readonly<{
	open: boolean;
	isPending: boolean;
	versionLabel: string | null;
	nextPublishedVersion: string | null;
	onConfirm: () => void;
	onCancel: () => void;
}>) {
	const t = useTranslations("admin.instruments");
	return (
		<Dialog
			open={open}
			onOpenChange={o => {
				if (!o) onCancel();
			}}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("versionHistory.confirmActivateTitle")}</DialogTitle>
					<DialogDescription>
						{versionLabel && nextPublishedVersion
							? t("versionHistory.confirmActivateWithVersion", {
									version: versionLabel,
									nextVersion: nextPublishedVersion
								})
							: t("versionHistory.confirmActivate")}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						{t("versionHistory.cancel")}
					</Button>
					<Button onClick={onConfirm} disabled={isPending}>
						{t("versionHistory.activate")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
