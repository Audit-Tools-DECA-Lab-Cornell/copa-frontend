import assert from "node:assert/strict";
import test from "node:test";

import { assertApiBaseUrlsAgree } from "../helpers/api";

/**
 * Runs `assertApiBaseUrlsAgree` against a specific pair of environment values
 * and restores whatever the surrounding process had set.
 */
function withEnv(seeding: string | undefined, app: string | undefined, run: () => void): void {
	const previous = {
		seeding: process.env.E2E_API_BASE_URL,
		app: process.env.NEXT_PUBLIC_API_BASE_URL
	};
	const apply = (key: string, value: string | undefined) => {
		if (value === undefined) {
			delete process.env[key];
			return;
		}
		process.env[key] = value;
	};

	apply("E2E_API_BASE_URL", seeding);
	apply("NEXT_PUBLIC_API_BASE_URL", app);
	try {
		run();
	} finally {
		apply("E2E_API_BASE_URL", previous.seeding);
		apply("NEXT_PUBLIC_API_BASE_URL", previous.app);
	}
}

const SEEDING = "https://seeded-api.example.com";

test("conflicting API base URLs fail with both values named", () => {
	withEnv(SEEDING, "http://127.0.0.1:8000", () => {
		assert.throws(assertApiBaseUrlsAgree, (error: Error) => {
			// The message has to name both sides: the whole failure mode is that one
			// of them is a stale default nobody remembers setting.
			assert.match(error.message, /seeded-api\.example\.com/);
			assert.match(error.message, /127\.0\.0\.1:8000/);
			return true;
		});
	});
});

test("matching API base URLs pass, ignoring a trailing slash", () => {
	withEnv(SEEDING, SEEDING, () => assertApiBaseUrlsAgree());
	withEnv(`${SEEDING}/`, SEEDING, () => assertApiBaseUrlsAgree());
	withEnv(SEEDING, `${SEEDING}//`, () => assertApiBaseUrlsAgree());
});

/**
 * Only an outright conflict is an error. A missing app URL is the normal local
 * setup - the Playwright config passes the seeding URL to the dev server it
 * starts - and neither set means both sides share the same local default.
 */
test("an absent app or seeding URL is not a conflict", () => {
	withEnv(SEEDING, undefined, () => assertApiBaseUrlsAgree());
	withEnv(undefined, SEEDING, () => assertApiBaseUrlsAgree());
	withEnv(undefined, undefined, () => assertApiBaseUrlsAgree());
	withEnv(SEEDING, "   ", () => assertApiBaseUrlsAgree());
});
