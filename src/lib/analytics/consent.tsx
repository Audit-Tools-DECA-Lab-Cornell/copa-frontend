"use client";

import * as React from "react";
import { z } from "zod";

/**
 * Analytics consent state.
 *
 * The visitor's explicit choice (Accept/Decline) is stored locally on the device.
 * Whether a choice is *required* before analytics may run depends on the visitor's
 * region: in the EU/EEA, UK, and Switzerland nothing runs until they accept; in
 * other regions analytics is allowed by default unless the visitor declines. The
 * region flag is resolved on the server from the edge geo header and passed in.
 * This state is kept separate from general app preferences so it stays independent
 * of theme/language and is easy to remove later.
 */

const ANALYTICS_CONSENT_STORAGE_KEY = "playspace_analytics_consent";

const consentSchema = z.enum(["granted", "denied"]);

export type AnalyticsConsent = z.infer<typeof consentSchema>;

export interface AnalyticsConsentContextValue {
	/** The stored decision, or `undefined` while undecided or before hydration. */
	consent: AnalyticsConsent | undefined;
	/** Whether the visitor's region requires an explicit choice before tracking. */
	requiresConsent: boolean;
	/** Whether the visitor still needs to make a choice (region-aware). */
	shouldPromptForConsent: boolean;
	/** Whether analytics may run right now (region-aware, cookie-based tools). */
	analyticsAllowed: boolean;
	/** Whether the stored value has been read from the browser yet. */
	isHydrated: boolean;
	grant: () => void;
	deny: () => void;
}

const AnalyticsConsentContext = React.createContext<AnalyticsConsentContextValue | null>(null);

/**
 * Read the persisted consent decision with runtime validation.
 */
function readStoredConsent(): AnalyticsConsent | undefined {
	if (globalThis.window === undefined) {
		return undefined;
	}

	try {
		const rawValue = globalThis.window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
		if (!rawValue) {
			return undefined;
		}

		const result = consentSchema.safeParse(rawValue);
		return result.success ? result.data : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Persist the consent decision on the current device.
 */
function writeStoredConsent(consent: AnalyticsConsent): void {
	if (globalThis.window === undefined) {
		return;
	}

	try {
		globalThis.window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
	} catch {
		// Ignore storage failures so the app remains usable.
	}
}

interface AnalyticsConsentProviderProps {
	children: React.ReactNode;
	/**
	 * Whether the request originates from a consent-required region (EU/EEA, UK,
	 * Switzerland), resolved on the server from the edge geo header.
	 */
	requiresConsent: boolean;
}

/**
 * Provide analytics consent state to the app.
 */
export function AnalyticsConsentProvider({ children, requiresConsent }: Readonly<AnalyticsConsentProviderProps>) {
	const [consent, setConsent] = React.useState<AnalyticsConsent | undefined>(undefined);
	const [isHydrated, setIsHydrated] = React.useState(false);

	React.useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setConsent(readStoredConsent());
		setIsHydrated(true);
	}, []);

	const value = React.useMemo<AnalyticsConsentContextValue>(() => {
		// In consent-required regions nothing runs until the visitor accepts. In
		// other regions analytics runs unless the visitor has explicitly declined.
		const analyticsAllowed = requiresConsent ? consent === "granted" : consent !== "denied";
		const shouldPromptForConsent = requiresConsent && consent === undefined;

		return {
			consent,
			requiresConsent,
			shouldPromptForConsent,
			analyticsAllowed,
			isHydrated,
			grant: () => {
				writeStoredConsent("granted");
				setConsent("granted");
			},
			deny: () => {
				writeStoredConsent("denied");
				setConsent("denied");
			}
		};
	}, [consent, isHydrated, requiresConsent]);

	return <AnalyticsConsentContext.Provider value={value}>{children}</AnalyticsConsentContext.Provider>;
}

/**
 * Read the analytics consent state from the nearest provider.
 */
export function useAnalyticsConsent(): AnalyticsConsentContextValue {
	const context = React.useContext(AnalyticsConsentContext);

	if (context === null) {
		throw new Error("useAnalyticsConsent must be used within an AnalyticsConsentProvider.");
	}

	return context;
}
