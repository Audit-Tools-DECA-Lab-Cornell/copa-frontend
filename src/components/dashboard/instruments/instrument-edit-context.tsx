"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { InstrumentContent, Lang } from "./types";

/**
 * The canonical source language for an instrument.
 *
 * Keys (`section_key`, `question_key`, scale/option keys, …) and structure
 * (the number and order of sections, questions, options) are owned exclusively
 * by this language. The backend matches stored audit answers to questions by
 * these keys, so they must stay identical across every language. Other
 * languages are treated as translations of the base: only display copy is
 * editable there.
 */
export const BASE_INSTRUMENT_LANG = "en";

/**
 * Curated list of languages offered when adding a translation. Admins can still
 * type a custom BCP-47 code, but these cover the common cases with a friendly
 * label so the locale code is never guessed.
 */
export const COMMON_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
	{ code: "en", label: "English" },
	{ code: "de", label: "German - Deutsch" },
	{ code: "fr", label: "French - Français" },
	{ code: "es", label: "Spanish - Español" },
	{ code: "it", label: "Italian - Italiano" },
	{ code: "nl", label: "Dutch - Nederlands" },
	{ code: "pt", label: "Portuguese - Português" },
	{ code: "pl", label: "Polish - Polski" },
	{ code: "sv", label: "Swedish - Svenska" },
	{ code: "da", label: "Danish - Dansk" },
	{ code: "no", label: "Norwegian - Norsk" },
	{ code: "fi", label: "Finnish - Suomi" }
];

/**
 * Resolve the base language present in an instrument's content map.
 *
 * Prefers {@link BASE_INSTRUMENT_LANG}; falls back to the first available
 * language so a malformed bundle without `en` still has a structural source
 * of truth instead of locking every language.
 */
export function resolveBaseLang(content: InstrumentContent): string {
	if (content[BASE_INSTRUMENT_LANG as Lang]) {
		return BASE_INSTRUMENT_LANG;
	}
	return Object.keys(content)[0] ?? BASE_INSTRUMENT_LANG;
}

/**
 * Pretty label for a language code, using the curated list when known.
 */
export function languageLabel(code: string): string {
	return COMMON_LANGUAGES.find(l => l.code === code.toLowerCase())?.label ?? code.toUpperCase();
}

type InstrumentEditContextValue = Readonly<{
	/** Language currently being edited. */
	activeLang: string;
	/** Canonical source language for keys + structure. */
	baseLang: string;
	/**
	 * True when the active language is a translation of the base. In this mode
	 * keys and structure are read-only and only display copy may be edited.
	 */
	translationMode: boolean;
}>;

const InstrumentEditContext = createContext<InstrumentEditContextValue>({
	activeLang: BASE_INSTRUMENT_LANG,
	baseLang: BASE_INSTRUMENT_LANG,
	translationMode: false
});

/**
 * Provide editing context (active language, base language, translation mode)
 * to the whole instrument editor tree so individual editors can lock keys and
 * structure without prop-drilling.
 */
export function InstrumentEditProvider({
	activeLang,
	baseLang,
	children
}: Readonly<{ activeLang: string; baseLang: string; children: ReactNode }>) {
	const value = useMemo<InstrumentEditContextValue>(
		() => ({ activeLang, baseLang, translationMode: activeLang !== baseLang }),
		[activeLang, baseLang]
	);

	return <InstrumentEditContext.Provider value={value}>{children}</InstrumentEditContext.Provider>;
}

/**
 * Read the current instrument editing context.
 */
export function useInstrumentEdit(): InstrumentEditContextValue {
	return useContext(InstrumentEditContext);
}
