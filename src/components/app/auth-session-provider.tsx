"use client";

import * as React from "react";

import { getBrowserAuthSession } from "@/lib/auth/browser-session";
import type { AuthSession } from "@/lib/auth/session";

const AuthSessionContext = React.createContext<AuthSession | null>(null);

export interface AuthSessionProviderProps {
	initialSession: AuthSession | null;
	children: React.ReactNode;
}

/**
 * Hydrate a shared auth session context for client dashboard screens.
 */
export function AuthSessionProvider({ initialSession, children }: Readonly<AuthSessionProviderProps>) {
	const [session, setSession] = React.useState<AuthSession | null>(initialSession);

	React.useEffect(() => {
		const browserSession = getBrowserAuthSession();
		if (browserSession !== null) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSession(browserSession);
		}
	}, []);

	return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>;
}

/**
 * Read the current auth session from the nearest protected-layout provider.
 */
export function useAuthSession(): AuthSession | null {
	return React.useContext(AuthSessionContext);
}
