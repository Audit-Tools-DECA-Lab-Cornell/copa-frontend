"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { z } from "zod";
import { DESIGN_SYSTEM, applyDesignSystemVariables, clampDesignSystemFontScale } from "@/lib/design-system";
import {
	LANGUAGE_PREFERENCES,
	LOCALE_PREFERENCE_COOKIE_NAME,
	resolveLanguagePreference,
	resolveSupportedLanguage,
	type LanguagePreference,
	type ResolvedLanguage
} from "@/i18n/config";

const PREFERENCES_STORAGE_KEY = "playspace_web_preferences";
const MIN_FONT_SCALE = DESIGN_SYSTEM.fontScale.min;
const MAX_FONT_SCALE = DESIGN_SYSTEM.fontScale.max;
const THEME_MODES = ["system", "light", "dark"] as const;

const preferencesSchema = z.object({
	themeMode: z.enum(THEME_MODES),
	languagePreference: z.enum(LANGUAGE_PREFERENCES),
	fontScale: z.number().min(MIN_FONT_SCALE).max(MAX_FONT_SCALE),
	highContrast: z.boolean(),
	dyslexicFont: z.boolean()
});

export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedTheme = "light" | "dark";

export interface PreferencesContextValue {
	themeMode: ThemeMode;
	resolvedTheme: ResolvedTheme;
	languagePreference: LanguagePreference;
	resolvedLanguage: ResolvedLanguage;
	fontScale: number;
	highContrast: boolean;
	dyslexicFont: boolean;
	isHydrated: boolean;
	setThemeMode: (mode: ThemeMode) => void;
	setLanguagePreference: (language: LanguagePreference) => void;
	setFontScale: (scale: number) => void;
	setHighContrast: (enabled: boolean) => void;
	setDyslexicFont: (enabled: boolean) => void;
	resetPreferences: () => void;
}

interface PreferencesProviderProps {
	children: React.ReactNode;
	initialLanguagePreference: LanguagePreference;
	initialResolvedLanguage: ResolvedLanguage;
}

interface PreferencesState {
	themeMode: ThemeMode;
	languagePreference: LanguagePreference;
	fontScale: number;
	highContrast: boolean;
	dyslexicFont: boolean;
}

const DEFAULT_PREFERENCES: PreferencesState = {
	themeMode: "system",
	languagePreference: "system",
	fontScale: 1,
	highContrast: false,
	dyslexicFont: false
};

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null);

export type { LanguagePreference, ResolvedLanguage } from "@/i18n/config";

/**
 * Resolve the current OS theme for system-mode preferences.
 */
function getSystemTheme(): ResolvedTheme {
	if (globalThis.window === undefined) {
		return "dark";
	}

	return globalThis.window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Normalize any requested font scale into the supported range.
 */
function clampFontScale(scale: number): number {
	return clampDesignSystemFontScale(scale);
}

/**
 * Resolve the concrete theme after accounting for system mode.
 */
function resolveTheme(themeMode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
	if (themeMode === "system") {
		return systemTheme;
	}

	return themeMode;
}

/**
 * Read persisted preferences from browser storage with runtime validation.
 */
function readStoredPreferences(fallbackPreferences: PreferencesState): PreferencesState {
	if (globalThis.window === undefined) {
		return fallbackPreferences;
	}

	try {
		const rawValue = globalThis.window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
		if (!rawValue) {
			return fallbackPreferences;
		}

		const parsedValue: unknown = JSON.parse(rawValue);
		const result = preferencesSchema.safeParse(parsedValue);
		return result.success
			? {
					themeMode: result.data.themeMode,
					languagePreference: result.data.languagePreference,
					fontScale: clampFontScale(result.data.fontScale),
					highContrast: result.data.highContrast,
					dyslexicFont: result.data.dyslexicFont
				}
			: fallbackPreferences;
	} catch {
		return fallbackPreferences;
	}
}

/**
 * Persist preferences locally on the current device.
 */
function writeStoredPreferences(preferences: PreferencesState): void {
	if (globalThis.window === undefined) {
		return;
	}

	try {
		globalThis.window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
	} catch {
		// Ignore storage failures so the app remains usable.
	}
}

/**
 * Persist the language preference in a cookie that the server can read during
 * the next request.
 */
function writeLanguagePreferenceCookie(languagePreference: LanguagePreference): void {
	if (globalThis.document === undefined) {
		return;
	}

	const encodedPreference = encodeURIComponent(languagePreference);
	const oneYearInSeconds = 60 * 60 * 24 * 365;
	globalThis.document.cookie = `${LOCALE_PREFERENCE_COOKIE_NAME}=${encodedPreference}; Path=/; Max-Age=${oneYearInSeconds}; SameSite=Lax`;
}

/**
 * Apply the active preferences to the document root.
 */
function applyPreferencesToDocument(input: {
	resolvedTheme: ResolvedTheme;
	resolvedLanguage: ResolvedLanguage;
	fontScale: number;
	highContrast: boolean;
	dyslexicFont: boolean;
}): void {
	if (globalThis.document === undefined) {
		return;
	}

	const root = globalThis.document.documentElement;
	root.classList.toggle("dark", input.resolvedTheme === "dark");
	root.dataset.contrast = input.highContrast ? "high" : "standard";
	root.dataset.dyslexicFont = input.dyslexicFont ? "true" : "false";
	root.lang = input.resolvedLanguage;
	applyDesignSystemVariables(root, {
		theme: input.resolvedTheme,
		contrast: input.highContrast ? "high" : "standard",
		fontScale: input.fontScale,
		dyslexicFont: input.dyslexicFont
	});
}

/**
 * Web preference provider for theme, language, and accessibility controls.
 */
export function PreferencesProvider({
	children,
	initialLanguagePreference,
	initialResolvedLanguage
}: Readonly<PreferencesProviderProps>) {
	const router = useRouter();
	const [preferences, setPreferences] = React.useState<PreferencesState>(() => ({
		...DEFAULT_PREFERENCES,
		languagePreference: initialLanguagePreference
	}));
	const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>("dark");
	const [systemLanguage, setSystemLanguage] = React.useState<ResolvedLanguage>(initialResolvedLanguage);
	const [isHydrated, setIsHydrated] = React.useState(false);
	const lastResolvedLanguageRef = React.useRef<ResolvedLanguage>(initialResolvedLanguage);
	const initialPreferences = React.useMemo<PreferencesState>(() => {
		return {
			...DEFAULT_PREFERENCES,
			languagePreference: initialLanguagePreference
		};
	}, [initialLanguagePreference]);

	React.useEffect(() => {
		const nextSystemTheme = getSystemTheme();
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSystemTheme(nextSystemTheme);
		 
		setSystemLanguage(resolveSupportedLanguage(globalThis.window?.navigator.language ?? initialResolvedLanguage));
		 
		setPreferences(readStoredPreferences(initialPreferences));
		 
		setIsHydrated(true);

		if (globalThis.window === undefined) {
			return;
		}

		const mediaQuery = globalThis.window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (event: MediaQueryListEvent) => {
			setSystemTheme(event.matches ? "dark" : "light");
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, [initialPreferences, initialResolvedLanguage]);

	const resolvedTheme = resolveTheme(preferences.themeMode, systemTheme);
	const resolvedLanguage = resolveLanguagePreference(preferences.languagePreference, systemLanguage);

	React.useEffect(() => {
		applyPreferencesToDocument({
			resolvedTheme,
			resolvedLanguage,
			fontScale: preferences.fontScale,
			highContrast: preferences.highContrast,
			dyslexicFont: preferences.dyslexicFont
		});
	}, [preferences.dyslexicFont, preferences.fontScale, preferences.highContrast, resolvedLanguage, resolvedTheme]);

	React.useEffect(() => {
		if (!isHydrated) {
			return;
		}

		writeStoredPreferences(preferences);
		writeLanguagePreferenceCookie(preferences.languagePreference);
	}, [isHydrated, preferences]);

	React.useEffect(() => {
		if (!isHydrated) {
			return;
		}

		if (lastResolvedLanguageRef.current === resolvedLanguage) {
			return;
		}

		lastResolvedLanguageRef.current = resolvedLanguage;
		router.refresh();
	}, [isHydrated, resolvedLanguage, router]);

	const value = React.useMemo<PreferencesContextValue>(() => {
		return {
			themeMode: preferences.themeMode,
			resolvedTheme,
			languagePreference: preferences.languagePreference,
			resolvedLanguage,
			fontScale: preferences.fontScale,
			highContrast: preferences.highContrast,
			dyslexicFont: preferences.dyslexicFont,
			isHydrated,
			setThemeMode: (mode: ThemeMode) => {
				setPreferences(currentValue => ({
					...currentValue,
					themeMode: mode
				}));
			},
			setLanguagePreference: (language: LanguagePreference) => {
				setPreferences(currentValue => ({
					...currentValue,
					languagePreference: language
				}));
			},
			setFontScale: (scale: number) => {
				setPreferences(currentValue => ({
					...currentValue,
					fontScale: clampFontScale(scale)
				}));
			},
			setHighContrast: (enabled: boolean) => {
				setPreferences(currentValue => ({
					...currentValue,
					highContrast: enabled
				}));
			},
			setDyslexicFont: (enabled: boolean) => {
				setPreferences(currentValue => ({
					...currentValue,
					dyslexicFont: enabled
				}));
			},
			resetPreferences: () => {
				setPreferences(DEFAULT_PREFERENCES);
			}
		};
	}, [
		isHydrated,
		preferences.dyslexicFont,
		preferences.fontScale,
		preferences.highContrast,
		preferences.languagePreference,
		preferences.themeMode,
		resolvedLanguage,
		resolvedTheme
	]);

	return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

/**
 * Read the active web preferences from the nearest provider.
 */
export function usePreferences(): PreferencesContextValue {
	const context = React.useContext(PreferencesContext);

	if (context === null) {
		throw new Error("usePreferences must be used within a PreferencesProvider.");
	}

	return context;
}

export const WEB_THEME_OPTIONS: readonly ThemeMode[] = THEME_MODES;
export const WEB_LANGUAGE_OPTIONS: readonly LanguagePreference[] = LANGUAGE_PREFERENCES;
export const WEB_MIN_FONT_SCALE = MIN_FONT_SCALE;
export const WEB_MAX_FONT_SCALE = MAX_FONT_SCALE;
