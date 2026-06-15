import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { e2eIds } from "../fixtures/ids";
import type { BrowserSessionRole } from "./api";
import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "./api";

export type VisualRouteRole = BrowserSessionRole;

export interface VisualRouteTarget {
	readonly role: VisualRouteRole;
	readonly route: string;
	readonly label: string;
	readonly screenshotPath: readonly string[];
	readonly waitForText?: RegExp | string;
}

export interface SeededVisualRoutes {
	readonly admin: readonly VisualRouteTarget[];
	readonly manager: readonly VisualRouteTarget[];
	readonly auditor: readonly VisualRouteTarget[];
	readonly ids: {
		readonly managerAccountId: string;
		readonly projectId: string;
		readonly placeId: string;
		readonly managerAuditId: string | null;
		readonly auditorAuditId: string | null;
		readonly auditorPlaceId: string | null;
		readonly auditorProjectId: string | null;
		readonly auditorProfileId: string | null;
		// A place that has both a submitted place audit and a submitted place
		// survey, so the combined ("audit + survey pair") place report can be
		// built and viewed. Null when no such place exists in the seed.
		readonly combinedPlaceId: string | null;
		readonly combinedPlaceName: string | null;
		readonly combinedProjectId: string | null;
		readonly combinedAuditId: string | null;
		readonly combinedSurveyId: string | null;
	};
}

export interface CombinedReportSources {
	readonly placeId: string;
	readonly placeName: string;
	readonly projectId: string;
	readonly auditId: string;
	readonly surveyId: string;
}

interface PaginatedItems<TItem> {
	readonly items: readonly TItem[];
}

async function readJson<TPayload>(response: { json(): Promise<unknown> }): Promise<TPayload> {
	return (await response.json()) as TPayload;
}

async function fetchManagerAuditId(request: APIRequestContext): Promise<string | null> {
	const token = await loginViaApi(request, "manager");
	const response = await request.get(
		`${getApiBaseUrl()}/playspace/accounts/${e2eIds.managerAccountId}/audits?page_size=100`,
		{ headers: bearerHeaders(token) }
	);
	await expectOk(response);
	const payload = await readJson<PaginatedItems<{ audit_id: string; status: string }>>(response);
	return payload.items.find(audit => audit.status === "SUBMITTED")?.audit_id ?? payload.items[0]?.audit_id ?? null;
}

interface SubmittedAuditRow {
	readonly audit_id: string;
	readonly status: string;
	readonly execution_mode: "audit" | "survey" | "both" | null;
	readonly place_id: string;
	readonly place_name: string;
	readonly project_id: string;
}

/**
 * Find a place that has both a submitted place audit and a submitted place
 * survey so the combined place report ("audit + survey pair") can be built and
 * loaded with real source ids. Returns the audit/survey to combine, or null
 * when the seed has no place with both sides submitted.
 */
async function fetchCombinedReportSources(request: APIRequestContext): Promise<CombinedReportSources | null> {
	const token = await loginViaApi(request, "manager");
	const response = await request.get(
		`${getApiBaseUrl()}/playspace/accounts/${e2eIds.managerAccountId}/audits?page_size=100`,
		{ headers: bearerHeaders(token) }
	);
	await expectOk(response);
	const payload = await readJson<PaginatedItems<SubmittedAuditRow>>(response);

	const byPlace = new Map<string, SubmittedAuditRow[]>();
	for (const row of payload.items) {
		if (row.status !== "SUBMITTED") continue;
		const rows = byPlace.get(row.place_id) ?? [];
		rows.push(row);
		byPlace.set(row.place_id, rows);
	}

	for (const rows of byPlace.values()) {
		const audit = rows.find(row => row.execution_mode === "audit");
		const survey = rows.find(row => row.execution_mode === "survey");
		if (audit && survey) {
			return {
				placeId: audit.place_id,
				placeName: audit.place_name,
				projectId: audit.project_id,
				auditId: audit.audit_id,
				surveyId: survey.audit_id
			};
		}
	}

	return null;
}

async function fetchAuditorSeedData(request: APIRequestContext): Promise<{
	readonly auditId: string | null;
	readonly placeId: string | null;
	readonly projectId: string | null;
}> {
	const token = await loginViaApi(request, "auditor");
	const response = await request.get(`${getApiBaseUrl()}/playspace/auditor/me/places?page_size=100`, {
		headers: bearerHeaders(token)
	});
	await expectOk(response);
	const payload = await readJson<
		PaginatedItems<{
			place_id: string;
			project_id: string;
			audit_id: string | null;
			place_audit_status: string;
		}>
	>(response);
	const place = payload.items.find(item => item.place_audit_status !== "submitted") ?? payload.items[0] ?? null;
	const reportPlace = payload.items.find(item => item.audit_id !== null) ?? place;
	return {
		auditId: reportPlace?.audit_id ?? null,
		placeId: place?.place_id ?? null,
		projectId: place?.project_id ?? null
	};
}

async function fetchManagerAuditorId(request: APIRequestContext): Promise<string | null> {
	const token = await loginViaApi(request, "manager");
	const response = await request.get(`${getApiBaseUrl()}/playspace/accounts/${e2eIds.managerAccountId}/auditors`, {
		headers: bearerHeaders(token)
	});
	await expectOk(response);
	const payload = await readJson<Array<{ id: string }>>(response);
	return payload[0]?.id ?? null;
}

export async function buildSeededVisualRoutes(request: APIRequestContext): Promise<SeededVisualRoutes> {
	const [managerAuditId, auditorData, auditorProfileId, combinedSources] = await Promise.all([
		fetchManagerAuditId(request),
		fetchAuditorSeedData(request),
		fetchManagerAuditorId(request),
		fetchCombinedReportSources(request)
	]);
	const projectId = e2eIds.urbanProjectId;
	const placeId = e2eIds.riversidePlaceId;

	const manager: VisualRouteTarget[] = [
		{
			role: "manager",
			route: "/manager/dashboard",
			label: "Manager Dashboard",
			screenshotPath: ["web", "manager", "dashboard", "overview.png"],
			waitForText: /manager dashboard/i
		},
		{
			role: "manager",
			route: "/manager/projects",
			label: "Manager Projects",
			screenshotPath: ["web", "manager", "projects", "overview.png"],
			waitForText: /^Projects$/
		},
		{
			role: "manager",
			route: `/manager/projects/${projectId}`,
			label: "Manager Project Detail",
			screenshotPath: ["web", "manager", "projects", "detail", "overview.png"]
		},
		{
			role: "manager",
			route: "/manager/places",
			label: "Manager Places",
			screenshotPath: ["web", "manager", "places", "overview.png"]
		},
		{
			role: "manager",
			route: `/manager/places/${placeId}?projectId=${projectId}`,
			label: "Manager Place Detail",
			screenshotPath: ["web", "manager", "places", "detail", "overview.png"]
		},
		{
			role: "manager",
			route: "/manager/auditors",
			label: "Manager Auditors",
			screenshotPath: ["web", "manager", "auditors", "overview.png"]
		},
		...(auditorProfileId
			? [
					{
						role: "manager" as const,
						route: `/manager/auditors/${auditorProfileId}`,
						label: "Manager Auditor Detail",
						screenshotPath: ["web", "manager", "auditors", "detail", "overview.png"] as const
					}
				]
			: []),
		{
			role: "manager",
			route: "/manager/audits",
			label: "Manager Audits",
			screenshotPath: ["web", "manager", "audits", "overview.png"]
		},
		...(managerAuditId
			? [
					{
						role: "manager" as const,
						route: `/manager/audits/${managerAuditId}`,
						label: "Manager Audit Detail",
						screenshotPath: ["web", "manager", "audits", "detail", "overview.png"] as const
					}
				]
			: []),
		{
			role: "manager",
			route: "/manager/reports",
			label: "Manager Reports",
			screenshotPath: ["web", "manager", "reports", "overview.png"]
		},
		...(managerAuditId
			? [
					{
						role: "manager" as const,
						route: `/manager/reports/${managerAuditId}`,
						label: "Manager Report Detail",
						screenshotPath: ["web", "manager", "reports", "detail", "overview.png"] as const
					}
				]
			: []),
		{
			role: "manager",
			route: "/manager/reports/place-report",
			label: "Manager Place Report Builder",
			screenshotPath: ["web", "manager", "reports", "place-report", "overview.png"]
		},
		{
			role: "manager",
			route: "/manager/raw-data",
			label: "Manager Raw Data",
			screenshotPath: ["web", "manager", "raw-data", "overview.png"]
		},
		{
			role: "manager",
			route: "/settings",
			label: "Manager Settings",
			screenshotPath: ["web", "manager", "settings", "overview.png"]
		}
	];

	const admin: VisualRouteTarget[] = [
		{
			role: "admin",
			route: "/admin/dashboard",
			label: "Admin Dashboard",
			screenshotPath: ["web", "admin", "dashboard", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/accounts",
			label: "Admin Accounts",
			screenshotPath: ["web", "admin", "accounts", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/projects",
			label: "Admin Projects",
			screenshotPath: ["web", "admin", "projects", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/places",
			label: "Admin Places",
			screenshotPath: ["web", "admin", "places", "overview.png"]
		},
		{
			role: "admin",
			route: `/admin/places/${placeId}`,
			label: "Admin Place Detail",
			screenshotPath: ["web", "admin", "places", "detail", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/auditors",
			label: "Admin Auditors",
			screenshotPath: ["web", "admin", "auditors", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/audits",
			label: "Admin Audits",
			screenshotPath: ["web", "admin", "audits", "overview.png"]
		},
		...(managerAuditId
			? [
					{
						role: "admin" as const,
						route: `/admin/audits/${managerAuditId}`,
						label: "Admin Audit Detail",
						screenshotPath: ["web", "admin", "audits", "detail", "overview.png"] as const
					},
					{
						role: "admin" as const,
						route: `/admin/reports/${managerAuditId}`,
						label: "Admin Report Detail",
						screenshotPath: ["web", "admin", "reports", "detail", "overview.png"] as const
					}
				]
			: []),
		{
			role: "admin",
			route: "/admin/reports",
			label: "Admin Reports",
			screenshotPath: ["web", "admin", "reports", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/reports/place-report",
			label: "Admin Place Report Builder",
			screenshotPath: ["web", "admin", "reports", "place-report", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/raw-data",
			label: "Admin Raw Data",
			screenshotPath: ["web", "admin", "raw-data", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/instruments",
			label: "Admin Instruments",
			screenshotPath: ["web", "admin", "instruments", "overview.png"]
		},
		{
			role: "admin",
			route: "/admin/system",
			label: "Admin System",
			screenshotPath: ["web", "admin", "system", "overview.png"]
		},
		{
			role: "admin",
			route: "/settings",
			label: "Admin Settings",
			screenshotPath: ["web", "admin", "settings", "overview.png"]
		}
	];

	const auditor: VisualRouteTarget[] = [
		{
			role: "auditor",
			route: "/auditor/dashboard",
			label: "Auditor Dashboard",
			screenshotPath: ["web", "auditor", "dashboard", "overview.png"]
		},
		...(auditorData.placeId && auditorData.projectId
			? [
					{
						role: "auditor" as const,
						route: `/auditor/execute/${auditorData.placeId}?projectId=${auditorData.projectId}`,
						label: "Auditor Execute",
						screenshotPath: ["web", "auditor", "execute", "overview.png"] as const
					}
				]
			: []),
		{
			role: "auditor",
			route: "/auditor/reports",
			label: "Auditor Reports",
			screenshotPath: ["web", "auditor", "reports", "overview.png"]
		},
		...(auditorData.auditId
			? [
					{
						role: "auditor" as const,
						route: `/auditor/reports/${auditorData.auditId}`,
						label: "Auditor Report Detail",
						screenshotPath: ["web", "auditor", "reports", "detail", "overview.png"] as const
					}
				]
			: []),
		{
			role: "auditor",
			route: "/settings",
			label: "Auditor Settings",
			screenshotPath: ["web", "auditor", "settings", "overview.png"]
		}
	];

	return {
		admin,
		manager,
		auditor,
		ids: {
			managerAccountId: e2eIds.managerAccountId,
			projectId,
			placeId,
			managerAuditId,
			auditorAuditId: auditorData.auditId,
			auditorPlaceId: auditorData.placeId,
			auditorProjectId: auditorData.projectId,
			auditorProfileId,
			combinedPlaceId: combinedSources?.placeId ?? null,
			combinedPlaceName: combinedSources?.placeName ?? null,
			combinedProjectId: combinedSources?.projectId ?? null,
			combinedAuditId: combinedSources?.auditId ?? null,
			combinedSurveyId: combinedSources?.surveyId ?? null
		}
	};
}

export async function waitForVisualRoute(page: Page, target: VisualRouteTarget): Promise<void> {
	await page.waitForLoadState("domcontentloaded");
	// Bounded: pages that never reach true network idle must not block here.
	await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
	await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });
	if (target.waitForText !== undefined) {
		await expect(page.getByText(target.waitForText).first()).toBeVisible({ timeout: 30_000 });
	}
}
