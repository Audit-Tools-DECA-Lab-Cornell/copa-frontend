"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

import { ClarityAnalytics } from "@/components/analytics/clarity-analytics";
import { CookieConsentBanner } from "@/components/analytics/cookie-consent-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PreferencesProvider } from "@/components/app/preferences-provider";
import type { LanguagePreference, ResolvedLanguage } from "@/i18n/config";
import { AnalyticsConsentProvider } from "@/lib/analytics/consent";

export interface ProvidersProps {
	children: React.ReactNode;
	initialLanguagePreference: LanguagePreference;
	initialResolvedLanguage: ResolvedLanguage;
	analyticsRequiresConsent: boolean;
}

/**
 * App-wide client providers (React Query, etc.).
 */
export function Providers({
	children,
	initialLanguagePreference,
	initialResolvedLanguage,
	analyticsRequiresConsent
}: Readonly<ProvidersProps>) {
	const [queryClient] = React.useState(() => {
		return new QueryClient({
			defaultOptions: {
				queries: {
					retry: 1,
					staleTime: 30_000,
					refetchOnWindowFocus: false
				},
				mutations: {
					retry: 0
				}
			}
		});
	});

	return (
		<PreferencesProvider
			initialLanguagePreference={initialLanguagePreference}
			initialResolvedLanguage={initialResolvedLanguage}>
			<QueryClientProvider client={queryClient}>
				<AnalyticsConsentProvider requiresConsent={analyticsRequiresConsent}>
					{children}
					<ClarityAnalytics />
					<GoogleAnalytics />
					<CookieConsentBanner />
				</AnalyticsConsentProvider>
			</QueryClientProvider>
		</PreferencesProvider>
	);
}
