import "@fontsource/opendyslexic";
import "./globals.css";

import type { Metadata } from "next";
import localFont from "next/font/local";
import type { CSSProperties } from "react";
import { Suspense } from "react";

import { DESIGN_SYSTEM, getDesignSystemCssVariables } from "@/lib/design-system";

import enMessages from "../../messages/en.json";
import { RequestProviders } from "./request-providers";

const bodyFont = localFont({
	variable: "--font-body",
	display: "swap",
	src: [
		{ path: "./fonts/Geist/Geist-VariableFont_wght.ttf", weight: "100 900", style: "normal" },
		{ path: "./fonts/Geist/Geist-Italic-VariableFont_wght.ttf", weight: "100 900", style: "italic" }
	]
});

const headingFont = localFont({
	variable: "--font-heading",
	display: "swap",
	src: [
		{
			path: "./fonts/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf",
			weight: "300 700",
			style: "normal"
		}
	]
});

const monoFont = localFont({
	variable: "--font-code",
	display: "swap",
	src: [
		{
			path: "./fonts/JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf",
			weight: "100 800",
			style: "normal"
		},
		{
			path: "./fonts/JetBrains_Mono/JetBrainsMono-Italic-VariableFont_wght.ttf",
			weight: "100 800",
			style: "italic"
		}
	]
});

const initialDesignSystemStyle = getDesignSystemCssVariables({
	theme: DESIGN_SYSTEM.defaultTheme,
	contrast: DESIGN_SYSTEM.defaultContrast,
	fontScale: DESIGN_SYSTEM.fontScale.default
}) as CSSProperties;

/**
 * Root metadata is static default-locale (English) content so the document shell
 * prerenders without reading request state. Localized, request-scoped metadata
 * (if any) belongs on the individual pages that need it.
 */
export function generateMetadata(): Metadata {
	const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;
	return {
		title: enMessages.metadata.title,
		description: enMessages.metadata.description,
		verification: { google: googleSiteVerification }
	};
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	// The document is a static `en` shell: the html/body wrapper, fonts, and
	// design-system tokens prerender with no request-time reads, so every route
	// gets an instant static shell (Partial Prerendering). The request-scoped
	// locale, messages, and analytics-consent region are resolved in
	// `RequestProviders`, which streams in behind the Suspense boundary. The
	// client `PreferencesProvider` corrects `<html lang>` once it resolves the
	// visitor's real locale.
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={DESIGN_SYSTEM.defaultTheme === "dark" ? "dark" : undefined}
			data-contrast={DESIGN_SYSTEM.defaultContrast}
			data-dyslexic-font="false"
			style={initialDesignSystemStyle}>
			<body className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable} antialiased`}>
				<Suspense fallback={<div className="min-h-dvh bg-background" aria-hidden />}>
					<RequestProviders>{children}</RequestProviders>
				</Suspense>
			</body>
		</html>
	);
}
