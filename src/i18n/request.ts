import { getRequestConfig } from "next-intl/server";

import { getRequestLanguageState, loadLocaleMessages } from "@/i18n/server-locale";

export default getRequestConfig(async () => {
	const { locale } = await getRequestLanguageState();

	return {
		locale,
		messages: await loadLocaleMessages(locale)
	};
});
