import "@fontsource/opendyslexic";
import "./globals.css";

import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

import { getRequestLanguageState } from "@/i18n/server-locale";
import { requestRequiresAnalyticsConsent } from "@/lib/analytics/server-region";
import { DESIGN_SYSTEM, getDesignSystemCssVariables } from "@/lib/design-system";

import { Providers } from "./providers";

const bodyFont = Geist({
	variable: "--font-body",
	subsets: ["latin"]
});

const headingFont = Space_Grotesk({
	variable: "--font-heading",
	subsets: ["latin"],
	weight: ["500", "700"]
});

const monoFont = JetBrains_Mono({
	variable: "--font-code",
	subsets: ["latin"]
});

const initialDesignSystemStyle = getDesignSystemCssVariables({
	theme: DESIGN_SYSTEM.defaultTheme,
	contrast: DESIGN_SYSTEM.defaultContrast,
	fontScale: DESIGN_SYSTEM.fontScale.default
}) as CSSProperties;

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("metadata");
	const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;
	return {
		title: t("title"),
		description: t("description"),
		verification: { google: googleSiteVerification }
	};
}

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { locale, preference } = await getRequestLanguageState();
	const messages = await getMessages();
	const analyticsRequiresConsent = await requestRequiresAnalyticsConsent();

	return (
		<html
			lang={locale}
			suppressHydrationWarning
			className={DESIGN_SYSTEM.defaultTheme === "dark" ? "dark" : undefined}
			data-contrast={DESIGN_SYSTEM.defaultContrast}
			data-dyslexic-font="false"
			style={initialDesignSystemStyle}>
			<body className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable} antialiased`}>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<Providers
						initialLanguagePreference={preference}
						initialResolvedLanguage={locale}
						analyticsRequiresConsent={analyticsRequiresConsent}>
						{children}
					</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
