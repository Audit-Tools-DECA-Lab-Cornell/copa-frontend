"use client";

import Script from "next/script";
import * as React from "react";

import { useAnalyticsConsent } from "@/lib/analytics/consent";
import { getGaMeasurementId, isGoogleAnalyticsConfigured } from "@/lib/analytics/google-analytics";
import { CONSENT_REQUIRED_REGION_CODES } from "@/lib/analytics/regions";

type GtagFn = (...args: unknown[]) => void;

/**
 * The four Google Consent Mode v2 signals, all set to the same state.
 */
function consentSignals(state: "granted" | "denied"): Record<string, "granted" | "denied"> {
	return {
		ad_storage: state,
		ad_user_data: state,
		ad_personalization: state,
		analytics_storage: state
	};
}

/**
 * Loads Google Analytics (GA4 / gtag.js) with Consent Mode v2.
 *
 * The gtag loader always runs in production (so Google's cookieless conversion
 * modeling works), but consent defaults to denied in the EU/EEA, UK, and
 * Switzerland — Google enforces this per region. Elsewhere consent defaults to
 * granted. When the visitor accepts or declines our banner, we forward the choice
 * to Google via a Consent Mode update so cookies are only set once granted.
 */
export function GoogleAnalytics() {
	const { consent } = useAnalyticsConsent();
	const measurementId = getGaMeasurementId();
	const isConfigured = isGoogleAnalyticsConfigured() && measurementId !== undefined;

	// Forward the visitor's explicit choice to Google. While undecided, the
	// region-scoped default set in the bootstrap script stands.
	React.useEffect(() => {
		if (!isConfigured || consent === undefined) {
			return;
		}

		const gtag = (globalThis.window as unknown as { gtag?: GtagFn } | undefined)?.gtag;
		gtag?.("consent", "update", consentSignals(consent === "granted" ? "granted" : "denied"));
	}, [isConfigured, consent]);

	if (!isConfigured) {
		return null;
	}

	const deniedByDefault = JSON.stringify(consentSignals("denied"));
	const grantedByDefault = JSON.stringify(consentSignals("granted"));
	const consentRequiredRegions = JSON.stringify(CONSENT_REQUIRED_REGION_CODES);

	return (
		<>
			<Script
				id="google-analytics-loader"
				src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
				strategy="afterInteractive"
			/>
			<Script id="google-analytics-init" strategy="afterInteractive">
				{`window.dataLayer = window.dataLayer || [];
				function gtag(){dataLayer.push(arguments);}
				gtag('consent', 'default', Object.assign(${grantedByDefault}, { wait_for_update: 500 }));
				gtag('consent', 'default', Object.assign(${deniedByDefault}, { region: ${consentRequiredRegions}, wait_for_update: 500 }));
				gtag('js', new Date());
				gtag('config', '${measurementId}');`}
			</Script>
		</>
	);
}
