"use client";

import { isAxiosError } from "axios";
import { z } from "zod";

import { api } from "@/lib/api/api-client";
import {
	PlayspaceApiError,
	accountDetailSchema,
	accountManagementResponseSchema,
	accountUpdateRequestSchema,
	adminAccountRowSchema,
	adminAuditRowSchema,
	adminAuditorRowSchema,
	adminAuditsExportResponseSchema,
	adminOverviewSchema,
	adminPlaceRowSchema,
	adminPlacesExportBundleSchema,
	adminPlacesExportResponseSchema,
	adminProjectRowSchema,
	adminProjectsExportBundleSchema,
	adminProjectsExportResponseSchema,
	adminSystemSchema,
	managerAuditsExportResponseSchema,
	managerPlacesExportBundleSchema,
	managerProjectsExportBundleSchema,
	assignmentSchema,
	assignmentWriteSchema,
	auditDraftPatchSchema,
	auditDraftSaveSchema,
	auditSessionSchema,
	auditorAuditSummarySchema,
	auditorCreateRequestSchema,
	auditorDashboardSummarySchema,
	auditorPlaceSchema,
	auditorProfileDetailSchema,
	auditorSummarySchema,
	changePasswordRequestSchema,
	myAuditorProfileSchema,
	myAuditorProfileUpdateSchema,
	myManagerProfileSchema,
	myManagerProfileUpdateSchema,
	auditorUpdateRequestSchema,
	bulkAssignmentWriteSchema,
	instrumentCreateRequestSchema,
	instrumentResponseSchema,
	instrumentUpdateRequestSchema,
	managerAuditsListSchema,
	managerInviteCreatedResponseSchema,
	managerInviteListItemSchema,
	managerPlacesListSchema,
	managerProfileSchema,
	paginatedResponseSchema,
	placeAuditHistoryItemSchema,
	playspaceInstrumentSchema,
	placeCreateRequestSchema,
	placeDetailSchema,
	placeHistorySchema,
	placeSummarySchema,
	placeUpdateRequestSchema,
	projectCreateRequestSchema,
	projectDetailSchema,
	projectStatsSchema,
	projectSummarySchema,
	projectUpdateRequestSchema,
	type AccountDetail,
	type AccountManagementResponse,
	type AdminAccountRow,
	type AdminAccountsQuery,
	type AdminAuditRow,
	type AdminAuditorRow,
	type AdminAuditorsQuery,
	type AdminAuditsExportResponse,
	type AdminAuditsQuery,
	type AdminExportQuery,
	type ExportReadyNotifyPayload,
	type AdminOverview,
	type AdminPlaceRow,
	type AdminPlacesExportBundle,
	type AdminPlacesExportResponse,
	type AdminPlacesQuery,
	type AdminProjectRow,
	type AdminProjectsExportBundle,
	type AdminProjectsExportResponse,
	type AdminProjectsQuery,
	type AdminSystem,
	type Assignment,
	type AssignmentWrite,
	type AuditDraftPatch,
	type AuditDraftSave,
	type AuditSession,
	type AuditorAuditSummary,
	type AuditorAuditsQuery,
	type AuditorDashboardSummary,
	type AuditorPlace,
	type AuditorPlacesQuery,
	type ChangePasswordRequest,
	type AuditorProfileDetail,
	type AuditorSummary,
	type BulkAssignmentWrite,
	type ManagerAuditsExportResponse,
	type ManagerAuditsList,
	type ManagerExportQuery,
	type ManagerPlacesExportBundle,
	type ManagerProjectsExportBundle,
	type MyAuditorProfile,
	type MyAuditorProfileUpdate,
	type MyManagerProfile,
	type MyManagerProfileUpdate,
	type ManagerAuditsQuery,
	type ManagerPlacesList,
	type ManagerPlacesQuery,
	type ManagerInviteCreatedResponse,
	type ManagerInviteListItem,
	type ManagerProfile,
	type PaginatedResponse,
	type PlayspaceInstrument,
	type PlaceAuditHistoryItem,
	type PlaceDetail,
	type PlaceHistory,
	type PlaceSummary,
	type ProjectDetail,
	type ProjectStats,
	type ProjectSummary
} from "./playspace-types";

export * from "./playspace-types";
/**
 * Convert a non-OK response payload into a readable error message.
 */
function getErrorMessage(payload: unknown, fallbackMessage: string): string {
	if (typeof payload === "string" && payload.trim().length > 0) {
		return payload;
	}

	if (typeof payload === "object" && payload !== null && "detail" in payload) {
		const detail = payload.detail;
		if (typeof detail === "string" && detail.trim().length > 0) {
			return detail;
		}
	}

	return fallbackMessage;
}

/**
 * Convert a RequestInit-style body into Axios request data.
 */
function normalizeRequestBody(body: BodyInit | null | undefined): unknown {
	if (body == null) {
		return undefined;
	}

	if (typeof body === "string") {
		if (body.trim().length === 0) {
			return undefined;
		}

		try {
			return JSON.parse(body) as unknown;
		} catch {
			return body;
		}
	}

	return body;
}

/**
 * Build a default error message from a failed request config.
 */
function getRequestFallbackMessage(method: string | undefined, path: string): string {
	const normalizedMethod = method?.trim().toUpperCase() ?? "GET";
	return `${normalizedMethod} ${path} request failed.`;
}

/**
 * Normalize unknown thrown values into PlayspaceApiError.
 */
function toPlayspaceApiError(
	error: unknown,
	fallbackMethod: string | undefined,
	fallbackPath: string
): PlayspaceApiError {
	if (error instanceof PlayspaceApiError) {
		return error;
	}

	if (isAxiosError(error)) {
		const status = error.response?.status ?? 0;
		const fallbackMessage = getRequestFallbackMessage(fallbackMethod, fallbackPath);
		return new PlayspaceApiError(getErrorMessage(error.response?.data, fallbackMessage), status);
	}

	if (error instanceof Error) {
		return new PlayspaceApiError(error.message, 0);
	}

	return new PlayspaceApiError(getRequestFallbackMessage(fallbackMethod, fallbackPath), 0);
}

/**
 * Fetch JSON from the backend and validate the shape at runtime.
 */
async function fetchValidatedJson<TValue>(
	path: string,
	schema: z.ZodType<TValue>,
	init?: RequestInit
): Promise<TValue> {
	try {
		const response = await api.request({
			url: path,
			method: init?.method,
			data: normalizeRequestBody(init?.body),
			headers: {
				Accept: "application/json"
			}
		});

		try {
			return schema.parse(response.data);
		} catch {
			throw new PlayspaceApiError("The server returned an unexpected response shape.", response.status);
		}
	} catch (error) {
		throw toPlayspaceApiError(error, init?.method, path);
	}
}

/**
 * Execute one request that should return no JSON payload.
 */
async function fetchNoContent(path: string, init: RequestInit): Promise<void> {
	try {
		await api.request({
			url: path,
			method: init.method,
			data: normalizeRequestBody(init.body),
			headers: {
				Accept: "application/json"
			}
		});
	} catch (error) {
		throw toPlayspaceApiError(error, init.method, path);
	}
}

type QueryValue = number | string | readonly string[] | undefined | null;

/**
 * Build a stable query string for list endpoints with repeated filter params.
 */
function buildQueryString(params: Readonly<Record<string, QueryValue>>): string {
	const searchParams = new URLSearchParams();

	for (const [key, rawValue] of Object.entries(params)) {
		if (rawValue == null) {
			continue;
		}

		if (Array.isArray(rawValue)) {
			for (const value of rawValue) {
				const normalizedValue = value.trim();
				if (normalizedValue.length > 0) {
					searchParams.append(key, normalizedValue);
				}
			}
			continue;
		}

		if (typeof rawValue === "number") {
			searchParams.set(key, String(rawValue));
			continue;
		}

		const normalizedValue = typeof rawValue === "string" ? rawValue.trim() : rawValue;
		if (typeof normalizedValue === "string" && normalizedValue.length > 0) {
			searchParams.set(key, normalizedValue);
		}
	}

	const query = searchParams.toString();
	return query.length > 0 ? `?${query}` : "";
}

/**
 * Playspace dashboard API surface used by the web app.
 */
export const playspaceApi = {
	exports: {
		/**
		 * Notify the requesting manager/admin by email that their raw-data export
		 * finished building. Best-effort: the backend always returns 204, so a
		 * delivery failure never surfaces as an export error.
		 */
		notifyReady: async (payload: ExportReadyNotifyPayload): Promise<void> =>
			fetchNoContent("/playspace/exports/notify-ready", {
				method: "POST",
				body: JSON.stringify(payload)
			})
	},
	accounts: {
		get: async (accountId: string): Promise<AccountDetail> =>
			fetchValidatedJson(`/playspace/accounts/${encodeURIComponent(accountId)}`, accountDetailSchema),
		managerProfiles: async (accountId: string): Promise<ManagerProfile[]> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/manager-profiles`,
				z.array(managerProfileSchema)
			),
		projects: async (accountId: string): Promise<ProjectSummary[]> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/projects`,
				z.array(projectSummarySchema)
			),
		auditors: async (accountId: string): Promise<AuditorSummary[]> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/auditors`,
				z.array(auditorSummarySchema)
			),
		places: async (accountId: string, query: ManagerPlacesQuery = {}): Promise<ManagerPlacesList> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/places${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					project_id: query.projectIds,
					auditor_id: query.auditorIds,
					audit_status: query.auditStatuses,
					survey_status: query.surveyStatuses
				})}`,
				managerPlacesListSchema
			),
		audits: async (accountId: string, query: ManagerAuditsQuery = {}): Promise<ManagerAuditsList> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/audits${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					project_id: query.projectIds,
					auditor_id: query.auditorIds,
					place_id: query.placeIds,
					status: query.statuses
				})}`,
				managerAuditsListSchema
			),
		auditDetail: async (auditId: string): Promise<AuditSession> =>
			fetchValidatedJson(`/playspace/audits/${encodeURIComponent(auditId)}`, auditSessionSchema),
		exportProjectsBundle: async (
			accountId: string,
			query: ManagerExportQuery = {}
		): Promise<ManagerProjectsExportBundle> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/export/projects/bundle${buildQueryString({
					search: query.search,
					project_id: query.projectIds
				})}`,
				managerProjectsExportBundleSchema
			),
		exportPlacesBundle: async (
			accountId: string,
			query: ManagerExportQuery = {}
		): Promise<ManagerPlacesExportBundle> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/export/places/bundle${buildQueryString({
					search: query.search,
					project_id: query.projectIds,
					place_id: query.placeIds,
					audit_status: query.auditStatuses,
					survey_status: query.surveyStatuses
				})}`,
				managerPlacesExportBundleSchema
			),
		exportAudits: async (accountId: string, query: ManagerExportQuery = {}): Promise<ManagerAuditsExportResponse> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/export/audits${buildQueryString({
					search: query.search,
					project_id: query.projectIds,
					auditor_id: query.auditorIds,
					place_id: query.placeIds,
					status: query.statuses
				})}`,
				managerAuditsExportResponseSchema
			),
		exportReports: async (
			accountId: string,
			query: ManagerExportQuery = {}
		): Promise<ManagerAuditsExportResponse> =>
			fetchValidatedJson(
				`/playspace/accounts/${encodeURIComponent(accountId)}/export/reports${buildQueryString({
					search: query.search,
					project_id: query.projectIds
				})}`,
				managerAuditsExportResponseSchema
			)
	},
	projects: {
		get: async (projectId: string): Promise<ProjectDetail> =>
			fetchValidatedJson(`/playspace/projects/${encodeURIComponent(projectId)}`, projectDetailSchema),
		stats: async (projectId: string): Promise<ProjectStats> =>
			fetchValidatedJson(`/playspace/projects/${encodeURIComponent(projectId)}/stats`, projectStatsSchema),
		places: async (projectId: string): Promise<PlaceSummary[]> =>
			fetchValidatedJson(
				`/playspace/projects/${encodeURIComponent(projectId)}/places`,
				z.array(placeSummarySchema)
			)
	},
	places: {
		audits: async (placeId: string, projectId: string): Promise<PlaceAuditHistoryItem[]> =>
			fetchValidatedJson(
				`/playspace/places/${encodeURIComponent(placeId)}/audits${buildQueryString({ project_id: projectId })}`,
				z.array(placeAuditHistoryItemSchema)
			),
		history: async (placeId: string, projectId: string): Promise<PlaceHistory> =>
			fetchValidatedJson(
				`/playspace/places/${encodeURIComponent(placeId)}/history${buildQueryString({ project_id: projectId })}`,
				placeHistorySchema
			)
	},
	assignments: {
		list: async (auditorProfileId: string): Promise<Assignment[]> =>
			fetchValidatedJson(
				`/playspace/auditor-profiles/${encodeURIComponent(auditorProfileId)}/assignments`,
				z.array(assignmentSchema)
			),
		create: async (auditorProfileId: string, payload: AssignmentWrite): Promise<Assignment> => {
			const parsedPayload = assignmentWriteSchema.parse(payload);
			return fetchValidatedJson(
				`/playspace/auditor-profiles/${encodeURIComponent(auditorProfileId)}/assignments`,
				assignmentSchema,
				{
					method: "POST",
					body: JSON.stringify(parsedPayload)
				}
			);
		},
		update: async (
			auditorProfileId: string,
			assignmentId: string,
			payload: AssignmentWrite
		): Promise<Assignment> => {
			const parsedPayload = assignmentWriteSchema.parse(payload);
			return fetchValidatedJson(
				`/playspace/auditor-profiles/${encodeURIComponent(auditorProfileId)}/assignments/${encodeURIComponent(assignmentId)}`,
				assignmentSchema,
				{
					method: "PATCH",
					body: JSON.stringify(parsedPayload)
				}
			);
		},
		delete: async (auditorProfileId: string, assignmentId: string): Promise<void> =>
			fetchNoContent(
				`/playspace/auditor-profiles/${encodeURIComponent(auditorProfileId)}/assignments/${encodeURIComponent(assignmentId)}`,
				{
					method: "DELETE"
				}
			),
		bulkCreate: async (payload: BulkAssignmentWrite): Promise<{ created_count: number }> => {
			const parsedPayload = bulkAssignmentWriteSchema.parse(payload);
			return fetchValidatedJson("/playspace/bulk-assignments", z.object({ created_count: z.number() }), {
				method: "POST",
				body: JSON.stringify(parsedPayload)
			});
		}
	},
	auditor: {
		assignedPlaces: async (query: AuditorPlacesQuery = {}): Promise<PaginatedResponse<AuditorPlace>> =>
			fetchValidatedJson(
				`/playspace/auditor/me/places${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					status: query.statuses
				})}`,
				paginatedResponseSchema(auditorPlaceSchema)
			),
		audits: async (query: AuditorAuditsQuery = {}): Promise<PaginatedResponse<AuditorAuditSummary>> =>
			fetchValidatedJson(
				`/playspace/auditor/me/audits${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					status: query.statuses
				})}`,
				paginatedResponseSchema(auditorAuditSummarySchema)
			),
		dashboardSummary: async (): Promise<AuditorDashboardSummary> =>
			fetchValidatedJson("/playspace/auditor/me/dashboard-summary", auditorDashboardSummarySchema),
		myProfile: async (): Promise<MyAuditorProfile> =>
			fetchValidatedJson("/playspace/me/auditor-profile", myAuditorProfileSchema),
		updateMyProfile: async (payload: MyAuditorProfileUpdate): Promise<MyAuditorProfile> => {
			const parsedPayload = myAuditorProfileUpdateSchema.parse(payload);
			return fetchValidatedJson("/playspace/me/auditor-profile", myAuditorProfileSchema, {
				method: "PATCH",
				body: JSON.stringify(parsedPayload)
			});
		},
		changePassword: async (payload: ChangePasswordRequest): Promise<void> => {
			const parsedPayload = changePasswordRequestSchema.parse(payload);
			await fetchNoContent("/playspace/me/change-password", {
				method: "POST",
				body: JSON.stringify(parsedPayload)
			});
		},
		completeOnboarding: async (): Promise<MyAuditorProfile> =>
			fetchValidatedJson("/playspace/me/complete-onboarding", myAuditorProfileSchema, {
				method: "POST"
			}),
		fetchInstrument: async (instrumentKey: string, lang: string = "en"): Promise<PlayspaceInstrument> =>
			fetchValidatedJson(
				`/playspace/instruments/active/${encodeURIComponent(instrumentKey)}${buildQueryString({ lang })}`,
				playspaceInstrumentSchema
			),
		createOrResumeAudit: async (
			placeId: string,
			projectId: string,
			executionMode?: "audit" | "survey" | "both"
		): Promise<AuditSession> =>
			fetchValidatedJson(`/playspace/places/${encodeURIComponent(placeId)}/audits/access`, auditSessionSchema, {
				method: "POST",
				body: JSON.stringify({
					project_id: projectId,
					execution_mode: executionMode ?? null
				})
			}),
		getAudit: async (auditId: string): Promise<AuditSession> =>
			fetchValidatedJson(`/playspace/audits/${encodeURIComponent(auditId)}`, auditSessionSchema),
		patchAuditDraft: async (auditId: string, patch: AuditDraftPatch): Promise<AuditDraftSave> => {
			const parsedPatch = auditDraftPatchSchema.parse(patch);
			return fetchValidatedJson(`/playspace/audits/${encodeURIComponent(auditId)}/draft`, auditDraftSaveSchema, {
				method: "PATCH",
				body: JSON.stringify(parsedPatch)
			});
		},
		submitAudit: async (auditId: string, expectedRevision?: number): Promise<AuditSession> =>
			fetchValidatedJson(`/playspace/audits/${encodeURIComponent(auditId)}/submit`, auditSessionSchema, {
				method: "POST",
				body: JSON.stringify(expectedRevision === undefined ? {} : { expected_revision: expectedRevision })
			})
	},
	manager: {
		myProfile: async (): Promise<MyManagerProfile> =>
			fetchValidatedJson("/playspace/me/manager-profile", myManagerProfileSchema),

		updateMyProfile: async (payload: MyManagerProfileUpdate): Promise<MyManagerProfile> => {
			const parsedPayload = myManagerProfileUpdateSchema.parse(payload);
			return fetchValidatedJson("/playspace/me/manager-profile", myManagerProfileSchema, {
				method: "PATCH",
				body: JSON.stringify(parsedPayload)
			});
		},

		completeOnboarding: async (): Promise<MyManagerProfile> =>
			fetchValidatedJson("/playspace/me/complete-manager-onboarding", myManagerProfileSchema, {
				method: "POST"
			}),

		changePassword: async (payload: ChangePasswordRequest): Promise<void> => {
			const parsedPayload = changePasswordRequestSchema.parse(payload);
			await fetchNoContent("/playspace/me/change-password", {
				method: "POST",
				body: JSON.stringify(parsedPayload)
			});
		}
	},
	managerInvites: {
		list: async (): Promise<ManagerInviteListItem[]> =>
			fetchValidatedJson("/playspace/manager-invites", z.array(managerInviteListItemSchema)),

		create: async (email: string): Promise<ManagerInviteCreatedResponse> =>
			fetchValidatedJson("/playspace/manager-invites", managerInviteCreatedResponseSchema, {
				method: "POST",
				body: JSON.stringify({ email })
			}),

		revoke: async (inviteId: string): Promise<void> =>
			fetchNoContent(`/playspace/manager-invites/${encodeURIComponent(inviteId)}`, {
				method: "DELETE"
			}),

		resend: async (inviteId: string): Promise<ManagerInviteListItem> =>
			fetchValidatedJson(
				`/playspace/manager-invites/${encodeURIComponent(inviteId)}/resend`,
				managerInviteListItemSchema,
				{ method: "POST" }
			)
	},
	management: {
		accounts: {
			update: async (
				accountId: string,
				payload: z.infer<typeof accountUpdateRequestSchema>
			): Promise<AccountManagementResponse> => {
				const parsedPayload = accountUpdateRequestSchema.parse(payload);
				return fetchValidatedJson(
					`/playspace/accounts/${encodeURIComponent(accountId)}`,
					accountManagementResponseSchema,
					{
						method: "PATCH",
						body: JSON.stringify(parsedPayload)
					}
				);
			}
		},
		projects: {
			create: async (payload: z.infer<typeof projectCreateRequestSchema>): Promise<ProjectDetail> => {
				const parsedPayload = projectCreateRequestSchema.parse(payload);
				return fetchValidatedJson("/playspace/projects", projectDetailSchema, {
					method: "POST",
					body: JSON.stringify(parsedPayload)
				});
			},
			update: async (
				projectId: string,
				payload: z.infer<typeof projectUpdateRequestSchema>
			): Promise<ProjectDetail> => {
				const parsedPayload = projectUpdateRequestSchema.parse(payload);
				return fetchValidatedJson(`/playspace/projects/${encodeURIComponent(projectId)}`, projectDetailSchema, {
					method: "PATCH",
					body: JSON.stringify(parsedPayload)
				});
			},
			delete: async (projectId: string): Promise<void> =>
				fetchNoContent(`/playspace/projects/${encodeURIComponent(projectId)}`, {
					method: "DELETE"
				})
		},
		places: {
			create: async (payload: z.infer<typeof placeCreateRequestSchema>): Promise<PlaceDetail> => {
				const parsedPayload = placeCreateRequestSchema.parse(payload);
				return fetchValidatedJson("/playspace/places", placeDetailSchema, {
					method: "POST",
					body: JSON.stringify(parsedPayload)
				});
			},
			update: async (
				placeId: string,
				payload: z.infer<typeof placeUpdateRequestSchema>
			): Promise<PlaceDetail> => {
				const parsedPayload = placeUpdateRequestSchema.parse(payload);
				return fetchValidatedJson(`/playspace/places/${encodeURIComponent(placeId)}`, placeDetailSchema, {
					method: "PATCH",
					body: JSON.stringify(parsedPayload)
				});
			},
			delete: async (placeId: string): Promise<void> =>
				fetchNoContent(`/playspace/places/${encodeURIComponent(placeId)}`, {
					method: "DELETE"
				}),
			savePlaceReport: async (
				placeId: string,
				payload: {
					report_type: "combined" | "full_assessment";
					audit_id?: string | null;
					survey_id?: string | null;
					submission_id?: string | null;
				}
			): Promise<PlaceDetail> =>
				fetchValidatedJson(
					`/playspace/places/${encodeURIComponent(placeId)}/place-reports`,
					placeDetailSchema,
					{
						method: "POST",
						body: JSON.stringify(payload)
					}
				),
			deletePlaceReport: async (placeId: string, reportIndex: number): Promise<PlaceDetail> =>
				fetchValidatedJson(
					`/playspace/places/${encodeURIComponent(placeId)}/place-reports/${reportIndex}`,
					placeDetailSchema,
					{ method: "DELETE" }
				)
		},
		auditors: {
			create: async (payload: z.infer<typeof auditorCreateRequestSchema>): Promise<AuditorProfileDetail> => {
				const parsedPayload = auditorCreateRequestSchema.parse(payload);
				return fetchValidatedJson("/playspace/auditor-profiles", auditorProfileDetailSchema, {
					method: "POST",
					body: JSON.stringify(parsedPayload)
				});
			},
			update: async (
				auditorProfileId: string,
				payload: z.infer<typeof auditorUpdateRequestSchema>
			): Promise<AuditorProfileDetail> => {
				const parsedPayload = auditorUpdateRequestSchema.parse(payload);
				return fetchValidatedJson(
					`/playspace/auditor-profiles/${encodeURIComponent(auditorProfileId)}`,
					auditorProfileDetailSchema,
					{
						method: "PATCH",
						body: JSON.stringify(parsedPayload)
					}
				);
			},
			delete: async (auditorProfileId: string): Promise<void> =>
				fetchNoContent(`/playspace/auditor-profiles/${encodeURIComponent(auditorProfileId)}`, {
					method: "DELETE"
				})
		}
	},
	admin: {
		overview: async (): Promise<AdminOverview> =>
			fetchValidatedJson("/playspace/admin/overview", adminOverviewSchema),
		instruments: {
			list: async (instrumentKey: string = "pvua_v5_2"): Promise<z.infer<typeof instrumentResponseSchema>[]> =>
				fetchValidatedJson(
					`/playspace/admin/instruments${buildQueryString({ instrument_key: instrumentKey })}`,
					z.array(instrumentResponseSchema)
				),
			create: async (
				payload: z.infer<typeof instrumentCreateRequestSchema>,
				activate: boolean = true
			): Promise<z.infer<typeof instrumentResponseSchema>> => {
				const parsedPayload = instrumentCreateRequestSchema.parse(payload);
				return fetchValidatedJson(
					`/playspace/admin/instruments${buildQueryString({ activate: String(activate) })}`,
					instrumentResponseSchema,
					{
						method: "POST",
						body: JSON.stringify(parsedPayload)
					}
				);
			},
			update: async (
				instrumentId: string,
				payload: z.infer<typeof instrumentUpdateRequestSchema>
			): Promise<z.infer<typeof instrumentResponseSchema>> => {
				const parsedPayload = instrumentUpdateRequestSchema.parse(payload);
				return fetchValidatedJson(
					`/playspace/admin/instruments/${encodeURIComponent(instrumentId)}`,
					instrumentResponseSchema,
					{
						method: "PATCH",
						body: JSON.stringify(parsedPayload)
					}
				);
			},
			delete: async (instrumentId: string): Promise<void> =>
				fetchNoContent(`/playspace/admin/instruments/${encodeURIComponent(instrumentId)}`, {
					method: "DELETE"
				})
		},
		accounts: async (query: AdminAccountsQuery = {}): Promise<PaginatedResponse<AdminAccountRow>> =>
			fetchValidatedJson(
				`/playspace/admin/accounts${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					account_type: query.accountTypes
				})}`,
				paginatedResponseSchema(adminAccountRowSchema)
			),
		projects: async (query: AdminProjectsQuery = {}): Promise<PaginatedResponse<AdminProjectRow>> =>
			fetchValidatedJson(
				`/playspace/admin/projects${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					account_id: query.accountIds
				})}`,
				paginatedResponseSchema(adminProjectRowSchema)
			),
		places: async (query: AdminPlacesQuery = {}): Promise<PaginatedResponse<AdminPlaceRow>> =>
			fetchValidatedJson(
				`/playspace/admin/places${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					project_id: query.projectIds,
					account_id: query.accountIds,
					audit_status: query.auditStatuses,
					survey_status: query.surveyStatuses
				})}`,
				paginatedResponseSchema(adminPlaceRowSchema)
			),
		auditors: async (query: AdminAuditorsQuery = {}): Promise<PaginatedResponse<AdminAuditorRow>> =>
			fetchValidatedJson(
				`/playspace/admin/auditors${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					account_id: query.accountIds,
					project_id: query.projectIds,
					place_id: query.placeIds
				})}`,
				paginatedResponseSchema(adminAuditorRowSchema)
			),
		audits: async (query: AdminAuditsQuery = {}): Promise<PaginatedResponse<AdminAuditRow>> =>
			fetchValidatedJson(
				`/playspace/admin/audits${buildQueryString({
					page: query.page,
					page_size: query.pageSize,
					search: query.search,
					sort: query.sort,
					project_id: query.projectIds,
					account_id: query.accountIds,
					auditor_id: query.auditorIds,
					place_id: query.placeIds,
					status: query.statuses
				})}`,
				paginatedResponseSchema(adminAuditRowSchema)
			),
		auditDetail: async (auditId: string): Promise<AuditSession> =>
			fetchValidatedJson(`/playspace/audits/${encodeURIComponent(auditId)}`, auditSessionSchema),
		system: async (): Promise<AdminSystem> => fetchValidatedJson("/playspace/admin/system", adminSystemSchema),
		exportProjects: async (query: AdminExportQuery = {}): Promise<AdminProjectsExportResponse> =>
			fetchValidatedJson(
				`/playspace/admin/export/projects${buildQueryString({
					search: query.search,
					account_id: query.accountIds
				})}`,
				adminProjectsExportResponseSchema
			),
		exportPlaces: async (query: AdminExportQuery = {}): Promise<AdminPlacesExportResponse> =>
			fetchValidatedJson(
				`/playspace/admin/export/places${buildQueryString({
					search: query.search,
					account_id: query.accountIds,
					project_id: query.projectIds,
					audit_status: query.auditStatuses,
					survey_status: query.surveyStatuses
				})}`,
				adminPlacesExportResponseSchema
			),
		exportAudits: async (query: AdminExportQuery = {}): Promise<AdminAuditsExportResponse> =>
			fetchValidatedJson(
				`/playspace/admin/export/audits${buildQueryString({
					search: query.search,
					account_id: query.accountIds,
					project_id: query.projectIds,
					status: query.statuses
				})}`,
				adminAuditsExportResponseSchema
			),
		exportReports: async (query: AdminExportQuery = {}): Promise<AdminAuditsExportResponse> =>
			fetchValidatedJson(
				`/playspace/admin/export/reports${buildQueryString({
					search: query.search,
					account_id: query.accountIds,
					project_id: query.projectIds
				})}`,
				adminAuditsExportResponseSchema
			),
		exportProjectsBundle: async (query: AdminExportQuery = {}): Promise<AdminProjectsExportBundle> =>
			fetchValidatedJson(
				`/playspace/admin/export/projects/bundle${buildQueryString({
					search: query.search,
					account_id: query.accountIds,
					project_id: query.projectIds
				})}`,
				adminProjectsExportBundleSchema
			),
		exportPlacesBundle: async (query: AdminExportQuery = {}): Promise<AdminPlacesExportBundle> =>
			fetchValidatedJson(
				`/playspace/admin/export/places/bundle${buildQueryString({
					search: query.search,
					account_id: query.accountIds,
					project_id: query.projectIds,
					place_id: query.placeIds,
					audit_status: query.auditStatuses,
					survey_status: query.surveyStatuses
				})}`,
				adminPlacesExportBundleSchema
			)
	}
};
