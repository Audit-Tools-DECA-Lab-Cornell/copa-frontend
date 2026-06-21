"use client";

import { Bug, Loader2, X } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { CldImage } from "@/components/cdn/cld-image";
import { UploadButton } from "@/components/cdn/upload";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { playspaceApi } from "@/lib/api/playspace";
import { type BugReportSeverity, type KnownIssueMatch, PlayspaceApiError } from "@/lib/api/playspace-types";
import { buildWebBugReportContext, entityRefsFromContext } from "@/lib/bug-report/context";
import { cn } from "@/lib/utils";

import { KnownIssueMatchList } from "./known-issue-match-list";

const SEVERITIES: readonly BugReportSeverity[] = ["blocking", "major", "minor"];

const SEVERITY_STYLES: Record<BugReportSeverity, { selected: string; dot: string }> = {
	blocking: {
		selected: "border-status-danger-border bg-status-danger-surface text-status-danger",
		dot: "bg-status-danger"
	},
	major: {
		selected: "border-status-warning-border bg-status-warning-surface text-status-warning",
		dot: "bg-status-warning"
	},
	minor: {
		selected: "border-status-info-border bg-status-info-surface text-status-info",
		dot: "bg-status-info"
	}
};

export interface BugReportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface Screenshot {
	url: string;
	publicId: string;
}

/**
 * Report-an-issue form. Captures a privacy-filtered diagnostic context
 * automatically, surfaces matching known issues before submitting, and accepts
 * an optional screenshot. Submission is online-only and degrades gracefully if
 * the screenshot upload is skipped.
 */
export function BugReportDialog({ open, onOpenChange }: Readonly<BugReportDialogProps>) {
	const t = useTranslations("bugReport");
	const pathname = usePathname();
	const params = useParams();

	const [title, setTitle] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [severity, setSeverity] = React.useState<BugReportSeverity>("major");
	const [screenshot, setScreenshot] = React.useState<Screenshot | null>(null);
	const [matches, setMatches] = React.useState<KnownIssueMatch[]>([]);
	const [hasCheckedMatches, setHasCheckedMatches] = React.useState(false);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [screenshotWidgetOpen, setScreenshotWidgetOpen] = React.useState(false);

	const reset = React.useCallback(() => {
		setTitle("");
		setDescription("");
		setSeverity("major");
		setScreenshot(null);
		setMatches([]);
		setHasCheckedMatches(false);
		setIsSubmitting(false);
		setScreenshotWidgetOpen(false);
	}, []);

	const handleOpenChange = React.useCallback(
		(next: boolean) => {
			if (!next) reset();
			onOpenChange(next);
		},
		[onOpenChange, reset]
	);

	const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isSubmitting;

	const handleSubmit = React.useCallback(async () => {
		if (!canSubmit) return;

		// Online-only: never attempt a submit while offline; the form keeps its
		// contents so the reporter can retry once they are back online.
		if (typeof navigator !== "undefined" && navigator.onLine === false) {
			toast.error(t("errors.offline"));
			return;
		}

		// Show known-issue matches once before the first real submit (deflection).
		if (!hasCheckedMatches) {
			setIsSubmitting(true);
			try {
				const found = await playspaceApi.bugReports.matchKnownIssues(`${title} ${description}`, "web");
				setHasCheckedMatches(true);
				if (found.length > 0) {
					setMatches(found);
					setIsSubmitting(false);
					return;
				}
			} catch {
				// A matcher failure must never block reporting.
				setHasCheckedMatches(true);
			}
			setIsSubmitting(false);
		}

		setIsSubmitting(true);
		try {
			const context = buildWebBugReportContext({ pathname, params });
			await playspaceApi.bugReports.create({
				surface: "web",
				title: title.trim(),
				description: description.trim(),
				severity,
				...entityRefsFromContext(context),
				context,
				screenshot_url: screenshot?.url,
				screenshot_public_id: screenshot?.publicId
			});
			toast.success(t("success"));
			handleOpenChange(false);
		} catch (error) {
			const message = error instanceof PlayspaceApiError ? error.message : t("errors.generic");
			toast.error(message);
			setIsSubmitting(false);
		}
	}, [canSubmit, description, handleOpenChange, hasCheckedMatches, params, pathname, screenshot, severity, t, title]);

	const submitLabel = hasCheckedMatches && matches.length > 0 ? t("submitAnyway") : t("submit");

	return (
		<Dialog open={open} onOpenChange={handleOpenChange} modal={!screenshotWidgetOpen}>
			<DialogContent
				className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg"
				onInteractOutside={event => {
					if (screenshotWidgetOpen) event.preventDefault();
				}}>
				<DialogHeader className="space-y-0 border-b border-edge/60 p-5">
					<div className="flex items-center gap-3">
						<span
							className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-primary"
							aria-hidden="true">
							<Bug className="size-5" />
						</span>
						<div className="grid gap-0.5 text-left">
							<DialogTitle>{t("title")}</DialogTitle>
							<DialogDescription>{t("subtitle")}</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="grid gap-4 p-5">
					<div className="grid gap-1.5">
						<Label htmlFor="bug-report-title">{t("fields.title")}</Label>
						<Input
							id="bug-report-title"
							value={title}
							maxLength={200}
							placeholder={t("placeholders.title")}
							onChange={event => setTitle(event.target.value)}
						/>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="bug-report-description">{t("fields.description")}</Label>
						<Textarea
							id="bug-report-description"
							value={description}
							rows={5}
							maxLength={5000}
							placeholder={t("placeholders.description")}
							onChange={event => setDescription(event.target.value)}
						/>
					</div>

					<div className="grid gap-1.5">
						<Label>{t("fields.severity")}</Label>
						<div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("fields.severity")}>
							{SEVERITIES.map(value => {
								const selected = severity === value;
								return (
									<button
										key={value}
										type="button"
										role="radio"
										aria-checked={selected}
										onClick={() => setSeverity(value)}
										className={cn(
											"flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
											selected
												? SEVERITY_STYLES[value].selected
												: "border-border bg-card text-text-secondary hover:bg-accent"
										)}>
										<span
											className={cn("size-1.5 rounded-full", SEVERITY_STYLES[value].dot)}
											aria-hidden="true"
										/>
										{t(`severity.${value}`)}
									</button>
								);
							})}
						</div>
					</div>

					<div className="grid gap-1.5">
						<Label>{t("fields.screenshot")}</Label>
						<p className="text-xs text-muted-foreground">{t("screenshotPrivacyNote")}</p>
						{screenshot ? (
							<div className="grid gap-2">
								<div className="relative overflow-hidden rounded-md border border-border">
									<CldImage
										src={screenshot.publicId}
										width={520}
										height={280}
										crop="fill"
										gravity="north"
										alt={t("fields.screenshot")}
										className="h-44 w-full object-cover object-top"
									/>
									<button
										type="button"
										onClick={() => setScreenshot(null)}
										aria-label={t("screenshotRemove")}
										className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-foreground/60 text-background transition hover:bg-foreground/80">
										<X className="size-4" />
									</button>
								</div>
								<UploadButton
									label={t("screenshotReplace")}
									onWidgetOpenChange={setScreenshotWidgetOpen}
									onUploaded={result => {
										const info = result.info;
										if (info && typeof info === "object" && "secure_url" in info) {
											setScreenshot({
												url: String(info.secure_url),
												publicId: String(info.public_id)
											});
										}
									}}
								/>
							</div>
						) : (
							<UploadButton
								label={t("screenshotAdd")}
								onWidgetOpenChange={setScreenshotWidgetOpen}
								onUploaded={result => {
									const info = result.info;
									if (info && typeof info === "object" && "secure_url" in info) {
										setScreenshot({
											url: String(info.secure_url),
											publicId: String(info.public_id)
										});
									}
								}}
							/>
						)}
					</div>

					<KnownIssueMatchList matches={matches} />
				</div>

				<DialogFooter className="border-t border-edge/60 p-5">
					<Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
						{t("cancel")}
					</Button>
					<Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
						{isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								{t("submitting")}
							</>
						) : (
							submitLabel
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
