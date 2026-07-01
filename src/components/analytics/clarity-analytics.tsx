"use client";

import Script from "next/script";

import { getClarityProjectId, isClarityConfigured } from "@/lib/analytics/clarity";
import { useAnalyticsConsent } from "@/lib/analytics/consent";

/**
 * Loads the Microsoft Clarity tracking snippet when analytics is allowed.
 *
 * Renders nothing unless Clarity is configured for this environment (project id
 * set, production build) and analytics is permitted for the visitor: in
 * consent-required regions that means after they accept the banner; elsewhere it
 * runs by default unless they declined. The official Clarity bootstrap snippet is
 * injected through `next/script` after the page becomes interactive so it never
 * blocks first paint.
 */
export function ClarityAnalytics() {
	const { analyticsAllowed } = useAnalyticsConsent();
	const projectId = getClarityProjectId();

	if (!isClarityConfigured() || projectId === undefined || !analyticsAllowed) {
		return null;
	}

	return (
		<Script id="microsoft-clarity" strategy="afterInteractive">
			{`(function(c,l,a,r,i,t,y){
				c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
				t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
				y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
			})(window, document, "clarity", "script", "${projectId}");`}
		</Script>
	);
}
