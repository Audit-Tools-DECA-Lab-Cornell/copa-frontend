"use client";

import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { playspaceApi } from "@/lib/api/playspace";
import { type BugReportSeverity, type KnownIssueMatch, PlayspaceApiError } from "@/lib/api/playspace-types";
import { buildWebBugReportContext, entityRefsFromContext } from "@/lib/bug-report/context";

import { KnownIssueMatchList } from "./known-issue-match-list";

const SEVERITIES: readonly BugReportSeverity[] = ["blocking", "major", "minor"];

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

	const reset = React.useCallback(() => {
		setTitle("");
		setDescription("");
		setSeverity("major");
		setScreenshot(null);
		setMatches([]);
		setHasCheckedMatches(false);
		setIsSubmitting(false);
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
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("subtitle")}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
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
						<Label htmlFor="bug-report-severity">{t("fields.severity")}</Label>
						<Select value={severity} onValueChange={value => setSeverity(value as BugReportSeverity)}>
							<SelectTrigger id="bug-report-severity">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SEVERITIES.map(value => (
									<SelectItem key={value} value={value}>
										{t(`severity.${value}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-1.5">
						<Label>{t("fields.screenshot")}</Label>
						<p className="text-xs text-muted-foreground">{t("screenshotPrivacyNote")}</p>
						<div className="flex items-center gap-2">
							<UploadButton
								label={screenshot ? t("screenshotReplace") : t("screenshotAdd")}
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
							{screenshot ? (
								<Button type="button" variant="ghost" size="sm" onClick={() => setScreenshot(null)}>
									{t("screenshotRemove")}
								</Button>
							) : null}
						</div>
					</div>

					<KnownIssueMatchList matches={matches} />
				</div>

				<DialogFooter>
					<Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
						{t("cancel")}
					</Button>
					<Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
