import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
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

function isDynamicSegment(segment: string): boolean {
	return segment.startsWith("[") && segment.endsWith("]");
}

function isCatchAllSegment(segment: string): boolean {
	return segment.startsWith("[...") || segment.startsWith("[[...");
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
 * are transparent, `[param]` consumes one segment, and `[...param]` consumes
 * the rest. Returns true when some directory on that path holds a `page` file.
 */
function routeHasPage(dir: string, segments: readonly string[]): boolean {
	if (segments.length === 0) {
		return hasPageFile(dir);
	}

	const [segment, ...rest] = segments;
	for (const child of childDirectories(dir)) {
		// A route group sits between URL segments without consuming one.
		if (isRouteGroup(child) && routeHasPage(path.join(dir, child), segments)) {
			return true;
		}
		if (isCatchAllSegment(child) && hasPageFile(path.join(dir, child))) {
			return true;
		}
		if ((child === segment || isDynamicSegment(child)) && routeHasPage(path.join(dir, child), rest)) {
			return true;
		}
	}

	return false;
}

function toPathSegments(route: string): readonly string[] {
	return new URL(route, "http://localhost").pathname.split("/").filter(Boolean);
}

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
