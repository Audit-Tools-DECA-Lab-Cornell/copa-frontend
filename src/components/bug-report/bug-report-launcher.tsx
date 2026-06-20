"use client";

import { Bug } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { isBugReportingEnabled } from "@/lib/bug-report/feature";

import { BugReportDialog } from "./bug-report-dialog";

/**
 * Floating "Report an issue" entry point. Mounted once in the authenticated app
 * shell so it appears on every protected page without duplication, and only when
 * the developer-mode flag is enabled.
 */
export function BugReportLauncher() {
	const t = useTranslations("bugReport");
	const [open, setOpen] = React.useState(false);

	if (!isBugReportingEnabled()) {
		return null;
	}

	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="secondary"
				className="fixed bottom-4 right-4 z-50 shadow-lg"
				onClick={() => setOpen(true)}
				aria-label={t("launch")}>
				<Bug className="size-4" aria-hidden="true" />
				<span className="hidden sm:inline">{t("launch")}</span>
			</Button>
			<BugReportDialog open={open} onOpenChange={setOpen} />
		</>
	);
}
