import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { captureCatalog } from "../visual/catalog";
import type { SeededIds } from "../visual/catalog/types";

const APP_ROOT = path.resolve(import.meta.dirname, "..", "..", "src", "app");

/**
 * Stand-in seed ids so every target yields a concrete route. Real ids only
 * matter at capture time; here the route's *shape* is what gets checked.
 */
const SAMPLE_IDS = new Proxy({} as SeededIds, {
	get: () => "seed-id"
});

function isRouteGroup(segment: string): boolean {
	return segment.startsWith("(") && segment.endsWith(")");
}

/** `[[...slug]]` - a catch-all that also matches zero segments. */
function isOptionalCatchAll(segment: string): boolean {
	return segment.startsWith("[[...");
}

function isCatchAllSegment(segment: string): boolean {
	return segment.startsWith("[...") || isOptionalCatchAll(segment);
}

/** `[id]` - consumes exactly one segment, unlike a catch-all. */
function isDynamicSegment(segment: string): boolean {
	return segment.startsWith("[") && segment.endsWith("]") && !isCatchAllSegment(segment);
}

function childDirectories(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter(entry => statSync(path.join(dir, entry)).isDirectory());
}

function hasPageFile(dir: string): boolean {
	return existsSync(path.join(dir, "page.tsx")) || existsSync(path.join(dir, "page.ts"));
}

/**
 * Resolves a URL pathname against the App Router tree: route groups `(name)`
 * are transparent, `[param]` consumes one segment, `[...param]` consumes the
 * rest, and `[[...param]]` also matches none. Returns true when some directory
 * on that path holds a `page` file.
 *
 * The last segment being consumed does not end the search: the page may still
 * sit inside a route group or an optional catch-all below this directory, as
 * `/` does when it is served from `app/(marketing)/page.tsx`.
 */
function routeHasPage(dir: string, segments: readonly string[]): boolean {
	if (segments.length === 0 && hasPageFile(dir)) {
		return true;
	}

	for (const child of childDirectories(dir)) {
		const childDir = path.join(dir, child);

		// A route group sits between URL segments without consuming one.
		if (isRouteGroup(child)) {
			if (routeHasPage(childDir, segments)) return true;
			continue;
		}

		// A catch-all swallows every remaining segment; only the optional form
		// matches when none are left.
		if (isCatchAllSegment(child)) {
			if ((segments.length > 0 || isOptionalCatchAll(child)) && hasPageFile(childDir)) return true;
			continue;
		}

		if (segments.length === 0) continue;

		const [segment, ...rest] = segments;
		if ((child === segment || isDynamicSegment(child)) && routeHasPage(childDir, rest)) {
			return true;
		}
	}

	return false;
}

function toPathSegments(route: string): readonly string[] {
	return new URL(route, "http://localhost").pathname.split("/").filter(Boolean);
}

/**
 * `routeHasPage` is the load-bearing half of the check below, so pin its App
 * Router semantics against a throwaway tree rather than only against the real
 * one, where most of these shapes do not currently appear.
 */
test("routeHasPage resolves App Router directory shapes", () => {
	const root = mkdtempSync(path.join(os.tmpdir(), "route-resolver-"));
	try {
		for (const dir of [
			"plain",
			"(group)/grouped",
			"nested/(group)",
			"dynamic/[id]",
			"catchall/[...rest]",
			"optional/[[...rest]]"
		]) {
			mkdirSync(path.join(root, dir), { recursive: true });
			writeFileSync(path.join(root, dir, "page.tsx"), "");
		}

		const resolves = (route: string) => routeHasPage(root, toPathSegments(route));

		assert.equal(resolves("/plain"), true);
		// A route group is transparent, both mid-path and as the last hop.
		assert.equal(resolves("/grouped"), true);
		assert.equal(resolves("/nested"), true);
		assert.equal(resolves("/dynamic/anything"), true);
		// A catch-all takes the rest; the optional form also takes none.
		assert.equal(resolves("/catchall/a/b/c"), true);
		assert.equal(resolves("/optional"), true);
		assert.equal(resolves("/optional/a/b"), true);

		// A required catch-all does not match an empty remainder, and a
		// one-segment [id] does not swallow a deeper path.
		assert.equal(resolves("/catchall"), false);
		assert.equal(resolves("/dynamic/one/two"), false);
		assert.equal(resolves("/missing"), false);
		assert.equal(resolves("/plain/deeper"), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

/**
 * The catalog outlives the pages it points at: /admin/system was folded into
 * the instruments screen and left a dead target behind, which Percy could only
 * report as a 30s "main is not visible" timeout. Catch it here instead.
 */
test("every capture target points at a route the app still serves", () => {
	const dead = captureCatalog
		.map(target => target.route(SAMPLE_IDS))
		.filter((route): route is string => route !== null)
		.filter(route => !routeHasPage(APP_ROOT, toPathSegments(route)));

	assert.deepEqual(dead, [], `capture targets with no matching page: ${dead.join(", ")}`);
});

/**
 * Percy keys snapshots by name and silently discards later duplicates, so a
 * repeated label costs visual coverage without failing the run.
 */
test("every capture state has a unique Percy snapshot label", () => {
	const seen = new Set<string>();
	const duplicates: string[] = [];

	for (const target of captureCatalog) {
		for (const state of target.states) {
			if (seen.has(state.label)) {
				duplicates.push(state.label);
				continue;
			}
			seen.add(state.label);
		}
	}

	assert.deepEqual(duplicates, [], `duplicate Percy labels: ${duplicates.join(", ")}`);
});
