import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { getRequestLanguageState } from "@/i18n/server-locale";
import { requestRequiresAnalyticsConsent } from "@/lib/analytics/server-region";

import { Providers } from "./providers";

/**
 * Request-scoped providers for the app.
 *
 * Resolving the locale, message catalog, and analytics-consent region all read
 * cookies/headers, which makes this component dynamic. The root layout renders
 * it inside a `<Suspense>` boundary so the static document shell can be served
 * immediately while these request-time values stream in.
 */
export async function RequestProviders({ children }: Readonly<{ children: React.ReactNode }>) {
	const { locale, preference } = await getRequestLanguageState();
	const messages = await getMessages();
	const analyticsRequiresConsent = await requestRequiresAnalyticsConsent();

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<Providers
				initialLanguagePreference={preference}
				initialResolvedLanguage={locale}
				analyticsRequiresConsent={analyticsRequiresConsent}>
				{children}
			</Providers>
		</NextIntlClientProvider>
	);
}
