import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { cookies, headers } from "next/headers";

import {
	DEFAULT_WEB_LOCALE,
	isLanguagePreference,
	type LanguagePreference,
	LOCALE_PREFERENCE_COOKIE_NAME,
	type ResolvedLanguage,
	resolveLanguagePreference
} from "@/i18n/config";

type IntlMessages = Record<string, unknown>;
const MESSAGES_DIR = resolve(process.cwd(), "messages");

export interface RequestLanguageState {
	readonly locale: ResolvedLanguage;
	readonly preference: LanguagePreference;
}

/**
 * Resolve the request locale from the persisted language preference cookie and
 * the request's `Accept-Language` header.
 */
export async function getRequestLanguageState(): Promise<RequestLanguageState> {
	const cookieStore = await cookies();
	const headerStore = await headers();
	const rawPreference = cookieStore.get(LOCALE_PREFERENCE_COOKIE_NAME)?.value ?? "system";
	const languagePreference = isLanguagePreference(rawPreference) ? rawPreference : "system";
	const locale = resolveLanguagePreference(languagePreference, headerStore.get("accept-language"));

	return {
		locale,
		preference: languagePreference
	};
}

/**
 * Load the message catalog for the requested locale, falling back to English
 * when a locale file has not been generated yet.
 */
export async function loadLocaleMessages(locale: ResolvedLanguage): Promise<IntlMessages> {
	const localeFilePath = resolve(MESSAGES_DIR, `${locale}.json`);
	if (existsSync(localeFilePath)) {
		return (await import(`../../messages/${locale}.json`)).default as IntlMessages;
	}

	return (await import(`../../messages/${DEFAULT_WEB_LOCALE}.json`)).default as IntlMessages;
}
