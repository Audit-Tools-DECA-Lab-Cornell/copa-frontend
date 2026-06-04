import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { AUTH_COOKIE_NAMES } from "@/lib/auth/role";
import {
	auditSessionSchema,
	auditorDashboardSummarySchema,
	auditorPlaceSchema,
	instrumentResponseSchema,
	paginatedResponseSchema,
	PlayspaceApiError,
	type AuditSession,
	type AuditorDashboardSummary,
	type AuditorPlace,
	type InstrumentResponse,
	type PaginatedResponse
} from "@/lib/api/playspace-types";
import { playspaceInstrumentSchema, type PlayspaceInstrument } from "@/types/audit";

/**
 * Build a Next.js fetch-cache tag for a given instrument key + language.
 * The same tag is consumed by `revalidateInstrument` to invalidate the cache
 * after a backend publishes a new instrument version.
 */
function buildInstrumentCacheTag(instrumentKey: string, lang: string): string {
	return `instrument:${instrumentKey}:${lang}`;
}

/**
 * Resolve the API base URL from env (NEXT_PUBLIC_API_BASE_URL) with a localhost fallback.
 * Identical defaulting to the browser-side helper in api-client.ts so dev environments stay
 * consistent across client and server.
 */
function getServerApiBaseUrl(): string {
	const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (configured && configured.trim().length > 0) {
		return configured;
	}
	return "http://127.0.0.1:8000";
}

/**
 * Read the bearer token from the request cookies in a server component.
 * Returns null if the user is not authenticated.
 */
async function getServerAccessToken(): Promise<string | null> {
	const cookieStore = await cookies();
	return cookieStore.get(AUTH_COOKIE_NAMES.accessToken)?.value ?? null;
}

/**
 * Convert any non-OK response payload into a useful error message, matching
 * the shape FastAPI returns ({ detail: "..." }).
 */
function getServerErrorMessage(payload: unknown, fallback: string): string {
	if (typeof payload === "string" && payload.trim().length > 0) {
		return payload;
	}
	if (typeof payload === "object" && payload !== null && "detail" in payload) {
		const detail = payload.detail;
		if (typeof detail === "string" && detail.trim().length > 0) {
			return detail;
		}
	}
	return fallback;
}

/**
 * Options accepted by `fetchServerJson`. `next` is the standard Next.js fetch
 * cache directive — we expose it so callers can opt into ISR-style caching with
 * tags. Phase C3 uses this to cache the static instrument fetch.
 */
export interface ServerFetchOptions {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	body?: unknown;
	cache?: RequestCache;
	next?: { revalidate?: number | false; tags?: string[] };
	requireAuth?: boolean;
}

/**
 * Authenticated server-side fetch + Zod validation.
 * Throws `PlayspaceApiError` on transport failure, non-OK status, or schema mismatch.
 */
export async function fetchServerJson<TValue>(
	path: string,
	schema: z.ZodType<TValue>,
	options: ServerFetchOptions = {}
): Promise<TValue> {
	const { method = "GET", body, cache, next, requireAuth = true } = options;

	const headers: HeadersInit = {
		Accept: "application/json"
	};

	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
	}

	if (requireAuth) {
		const accessToken = await getServerAccessToken();
		if (!accessToken) {
			throw new PlayspaceApiError("Authenticated session required.", 401);
		}
		headers.Authorization = `Bearer ${accessToken}`;
	}

	const url = `${getServerApiBaseUrl()}${path}`;
	const fetchInit: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	};

	if (cache) {
		fetchInit.cache = cache;
	}
	if (next) {
		fetchInit.next = next;
	}
	if (!cache && !next) {
		fetchInit.cache = "no-store";
	}

	const response = await fetch(url, fetchInit);

	if (!response.ok) {
		const payload: unknown = await response.json().catch(() => null);
		throw new PlayspaceApiError(
			getServerErrorMessage(payload, `${method} ${path} request failed.`),
			response.status
		);
	}

	const payload: unknown = await response.json();
	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		throw new PlayspaceApiError(`Schema validation failed for ${method} ${path}.`, 0);
	}
	return parsed.data;
}

/**
 * Fetch one audit session by id on the server.
 * Same endpoint as `playspaceApi.auditor.getAudit` / `admin.auditDetail` /
 * `accounts.auditDetail` — the route is role-aware on the backend.
 */
export async function getServerAudit(auditId: string): Promise<AuditSession> {
	return fetchServerJson(`/playspace/audits/${encodeURIComponent(auditId)}`, auditSessionSchema);
}

/**
 * Fetch a localized instrument definition on the server with Next.js data
 * caching. The instrument is essentially read-only between deploys; tagged
 * caching means subsequent server renders read from the in-memory cache instead
 * of hitting FastAPI. Invalidate via `revalidateInstrument(key, lang)` or
 * `POST /api/internal/revalidate-instrument`.
 */
export async function getServerInstrument(instrumentKey: string, lang: string = "en"): Promise<PlayspaceInstrument> {
	const query = new URLSearchParams({ lang });
	return fetchServerJson(
		`/playspace/instruments/active/${encodeURIComponent(instrumentKey)}?${query.toString()}`,
		playspaceInstrumentSchema,
		{
			cache: "force-cache",
			next: {
				revalidate: 3600,
				tags: [buildInstrumentCacheTag(instrumentKey, lang)]
			}
		}
	);
}

/** Server prefetch for admin instrument versions (`no-store`; mirrors `admin.instruments.list`). */
export async function getServerAdminInstruments(instrumentKey: string = "pvua_v5_2"): Promise<InstrumentResponse[]> {
	const query = new URLSearchParams({ instrument_key: instrumentKey });
	return fetchServerJson(`/playspace/admin/instruments?${query.toString()}`, z.array(instrumentResponseSchema), {
		cache: "no-store"
	});
}

/**
 * Fetch the authenticated auditor's dashboard summary on the server.
 * Mirrors `playspaceApi.auditor.dashboardSummary()` from the browser client.
 */
export async function getServerAuditorDashboardSummary(): Promise<AuditorDashboardSummary> {
	return fetchServerJson("/playspace/auditor/me/dashboard-summary", auditorDashboardSummarySchema);
}

/**
 * Fetch the auditor's assigned places on the server. Default page size matches
 * the dashboard query so the prefetched cache lines up with the client's
 * `useQuery({ queryKey: [..., "assignedPlaces", "dashboard"] })` call.
 */
export async function getServerAuditorAssignedPlaces(
	options: { page?: number; pageSize?: number; sort?: string } = {}
): Promise<PaginatedResponse<AuditorPlace>> {
	const { page = 1, pageSize = 100, sort } = options;
	const params = new URLSearchParams();
	params.set("page", String(page));
	params.set("page_size", String(pageSize));
	if (sort) {
		params.set("sort", sort);
	}
	return fetchServerJson(
		`/playspace/auditor/me/places?${params.toString()}`,
		paginatedResponseSchema(auditorPlaceSchema)
	);
}

/**
 * Manually invalidate the cached instrument for a given key + language.
 * Use after publishing a new instrument version on the backend, either via the
 * `/api/internal/revalidate-instrument` route handler or directly in a server
 * action.
 */
export function revalidateInstrument(instrumentKey: string, lang: string = "en"): string {
	const tag = buildInstrumentCacheTag(instrumentKey, lang);
	revalidateTag(tag);
	return tag;
}
