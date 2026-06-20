"use client";

import { Expand, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { CldImage } from "@/components/cdn/cld-image";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface BugReportScreenshotProps {
	url: string | null;
	publicId: string | null;
	reportTitle: string;
}

/**
 * Screenshot thumbnail that opens a full-size lightbox. Renders the optimized
 * Cloudinary image when a public id is present, falling back to the raw secure
 * URL (older reports) or an empty state.
 */
export function BugReportScreenshot({ url, publicId, reportTitle }: Readonly<BugReportScreenshotProps>) {
	const t = useTranslations("bugReport.admin.screenshot");

	if (!url && !publicId) {
		return (
			<div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-text-secondary">
				<ImageOff className="size-5" aria-hidden="true" />
				<span className="text-xs">{t("none")}</span>
			</div>
		);
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<button
					type="button"
					className="group relative block w-full overflow-hidden rounded-md border border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					aria-label={t("view")}>
					{publicId ? (
						<CldImage
							src={publicId}
							width={480}
							height={270}
							crop="fill"
							gravity="north"
							alt={t("alt", { title: reportTitle })}
							className="h-40 w-full object-cover object-top"
						/>
					) : (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={url ?? ""}
							alt={t("alt", { title: reportTitle })}
							className="h-40 w-full object-cover object-top"
						/>
					)}
					<span className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition group-hover:bg-foreground/30 group-hover:opacity-100">
						<Expand className="size-5 text-background" aria-hidden="true" />
					</span>
				</button>
			</DialogTrigger>
			<DialogContent className="max-w-3xl p-2">
				<DialogTitle className="sr-only">{t("alt", { title: reportTitle })}</DialogTitle>
				{publicId ? (
					<CldImage
						src={publicId}
						width={1200}
						height={1200}
						crop="fit"
						alt={t("alt", { title: reportTitle })}
						className="h-auto max-h-[80vh] w-full rounded-md object-contain"
					/>
				) : (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={url ?? ""}
						alt={t("alt", { title: reportTitle })}
						className="h-auto max-h-[80vh] w-full rounded-md object-contain"
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
