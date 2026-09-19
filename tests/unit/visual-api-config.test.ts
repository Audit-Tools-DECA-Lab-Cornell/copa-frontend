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

/**
 * A conflict has to mean "different backend", not "different spelling": aborting
 * a correctly configured run is as costly as missing a misconfigured one.
 */
test("spellings of the same backend are not a conflict", () => {
	const equivalent: ReadonlyArray<readonly [string, string]> = [
		["https://api.example.com", "https://api.example.com:443"],
		["http://api.example.com", "http://api.example.com:80"],
		["https://API.Example.com", "https://api.example.com"],
		["https://api.example.com/base/", "https://api.example.com/base"]
	];

	for (const [seeding, app] of equivalent) {
		withEnv(seeding, app, () =>
			assert.doesNotThrow(assertApiBaseUrlsAgree, `${seeding} and ${app} address the same backend`)
		);
	}
});

test("a genuinely different host, port or path prefix is still a conflict", () => {
	const different: ReadonlyArray<readonly [string, string]> = [
		["https://api.example.com", "https://other.example.com"],
		["https://api.example.com", "https://api.example.com:8443"],
		["https://api.example.com/base", "https://api.example.com/other"],
		["https://api.example.com", "http://api.example.com"]
	];

	for (const [seeding, app] of different) {
		withEnv(seeding, app, () =>
			assert.throws(assertApiBaseUrlsAgree, `${seeding} and ${app} are different backends`)
		);
	}
});

test("an unparseable base URL falls back to exact comparison", () => {
	withEnv("not a url", "not a url", () => assert.doesNotThrow(assertApiBaseUrlsAgree));
	withEnv("not a url", "https://api.example.com", () => assert.throws(assertApiBaseUrlsAgree));
});
