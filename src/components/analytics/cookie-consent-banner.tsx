"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { isClarityConfigured } from "@/lib/analytics/clarity";
import { useAnalyticsConsent } from "@/lib/analytics/consent";
import { isGoogleAnalyticsConfigured } from "@/lib/analytics/google-analytics";

/**
 * Bottom-of-screen consent prompt for analytics.
 *
 * Shown only when a choice is actually needed: the visitor is in a consent-required
 * region (EU/EEA, UK, Switzerland), has not yet decided, and at least one analytics
 * tool is configured for this environment (so there is nothing to prompt for in dev
 * or preview). Visitors elsewhere are not interrupted. Accepting enables analytics;
 * declining keeps it off. The decision is remembered so the prompt does not return.
 */
export function CookieConsentBanner() {
	const t = useTranslations("cookieConsent");
	const { shouldPromptForConsent, isHydrated, grant, deny } = useAnalyticsConsent();

	const analyticsConfigured = isClarityConfigured() || isGoogleAnalyticsConfigured();

	if (!isHydrated || !shouldPromptForConsent || !analyticsConfigured) {
		return null;
	}

	return (
		<div
			role="dialog"
			aria-label={t("title")}
			className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg sm:p-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
				<div className="space-y-1">
					<p className="text-sm font-medium">{t("title")}</p>
					<p className="text-sm text-muted-foreground">{t("message")}</p>
				</div>
				<div className="flex shrink-0 gap-2">
					<Button type="button" variant="outline" size="sm" onClick={deny}>
						{t("decline")}
					</Button>
					<Button type="button" size="sm" onClick={grant}>
						{t("accept")}
					</Button>
				</div>
			</div>
		</div>
	);
}
