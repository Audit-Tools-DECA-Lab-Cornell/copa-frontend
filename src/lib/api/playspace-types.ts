import { z } from "zod";

import { playspaceInstrumentSchema, type PlayspaceInstrument } from "@/types/audit";

export { playspaceInstrumentSchema };
export type { PlayspaceInstrument };

export const accountTypeSchema = z.enum(["ADMIN", "MANAGER", "AUDITOR"]);
export const projectStatusSchema = z.enum(["planned", "active", "completed"]);
export const placeStatusSchema = z.enum(["not_started", "in_progress", "submitted"]);
export const auditStatusSchema = z.enum(["IN_PROGRESS", "PAUSED", "SUBMITTED"]);
export const executionModeSchema = z.enum(["audit", "survey", "both"]);
export const placeAxisStatusSchema = z.enum(["not_started", "in_progress", "submitted"]);
export const playspaceTypeSchema = z.enum([
	"Public Playspace",
	"Pre-School Playspace",
	"Destination Playspace",
	"Nature Playspace",
	"Neighborhood Playspace",
	"Waterfront Playspace",
	"School Playspace"
]);

export const managerProfileSchema = z.object({
	id: z.string().uuid(),
	account_id: z.string().uuid(),
	full_name: z.string(),
	email: z.string().email(),
	phone: z.string().nullable(),
	position: z.string().nullable(),
	organization: z.string().nullable(),
	is_primary: z.boolean(),
	created_at: z.string().datetime()
});

export const managerInviteStatusSchema = z.enum(["PENDING", "EXPIRED", "ACCEPTED"]);

export const managerInviteListItemSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	status: managerInviteStatusSchema,
	created_at: z.string().datetime(),
	expires_at: z.string().datetime(),
	accepted_at: z.string().datetime().nullable()
});

export const managerInviteCreatedResponseSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	expires_at: z.string().datetime(),
	invite_url: z.string(),
	status: z.string()
});

export const scorePairSchema = z.object({
	pv: z.number(),
	u: z.number()
});

export const accountStatsSchema = z.object({
	total_projects: z.number().int().nonnegative(),
	total_places: z.number().int().nonnegative(),
	total_auditors: z.number().int().nonnegative(),
	total_audits_completed: z.number().int().nonnegative()
});

export const recentActivitySchema = z.object({
	audit_id: z.string().uuid(),
	audit_code: z.string(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	place_id: z.string().uuid(),
	place_name: z.string(),
	completed_at: z.string().datetime(),
	score: z.number().nullable(),
	score_pair: scorePairSchema.nullable().optional().default(null)
});

export const accountDetailSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email(),
	account_type: accountTypeSchema,
	created_at: z.string().datetime(),
	primary_manager: managerProfileSchema.nullable(),
	stats: accountStatsSchema,
	recent_activity: z.array(recentActivitySchema)
});

export const projectSummarySchema = z.object({
	id: z.string().uuid(),
	account_id: z.string().uuid(),
	name: z.string(),
	overview: z.string().nullable(),
	place_types: z.array(playspaceTypeSchema).optional().default([]),
	start_date: z.string().date().nullable(),
	end_date: z.string().date().nullable(),
	status: projectStatusSchema,
	places_count: z.number().int().nonnegative(),
	auditors_count: z.number().int().nonnegative(),
	audits_completed: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	average_scores: scorePairSchema.nullable().optional().default(null)
});

export const projectDetailSchema = z.object({
	id: z.string().uuid(),
	account_id: z.string().uuid(),
	name: z.string(),
	overview: z.string().nullable(),
	place_types: z.array(playspaceTypeSchema).optional().default([]),
	start_date: z.string().date().nullable(),
	end_date: z.string().date().nullable(),
	est_places: z.number().int().nonnegative().nullable(),
	est_auditors: z.number().int().nonnegative().nullable(),
	auditor_description: z.string().nullable(),
	created_at: z.string().datetime()
});

export const projectStatsSchema = z.object({
	project_id: z.string().uuid(),
	places_count: z.number().int().nonnegative(),
	places_with_audits: z.number().int().nonnegative(),
	audits_completed: z.number().int().nonnegative(),
	auditors_count: z.number().int().nonnegative(),
	in_progress_audits: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	average_scores: scorePairSchema.nullable().optional().default(null)
});

export const auditorSummarySchema = z.object({
	id: z.string().uuid(),
	account_id: z.string().uuid(),
	auditor_code: z.string(),
	full_name: z.string(),
	email: z.string().email().nullable(),
	age_range: z.string().nullable(),
	gender: z.string().nullable(),
	country: z.string().nullable(),
	role: z.string().nullable(),
	assignments_count: z.number().int().nonnegative(),
	completed_audits: z.number().int().nonnegative(),
	last_active_at: z.string().datetime().nullable()
});

export const placeSummarySchema = z.object({
	id: z.string().uuid(),
	project_id: z.string().uuid(),
	name: z.string(),
	address: z.string().nullable(),
	postal_code: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	place_type: playspaceTypeSchema.nullable(),
	audits_completed: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	last_audited_at: z.string().datetime().nullable(),
	place_audit_status: placeAxisStatusSchema.optional().default("not_started"),
	place_survey_status: placeAxisStatusSchema.optional().default("not_started"),
	place_audit_count: z.number().int().nonnegative().optional().default(0),
	place_survey_count: z.number().int().nonnegative().optional().default(0),
	audit_mean_scores: scorePairSchema.nullable().optional().default(null),
	survey_mean_scores: scorePairSchema.nullable().optional().default(null),
	overall_scores: scorePairSchema.nullable().optional().default(null)
});

export const scoreTotalsSchema = z.object({
	provision_total: z.number(),
	provision_total_max: z.number(),
	variety_total: z.number(),
	variety_total_max: z.number(),
	challenge_total: z.number(),
	challenge_total_max: z.number(),
	sociability_total: z.number(),
	sociability_total_max: z.number(),
	play_value_total: z.number(),
	play_value_total_max: z.number(),
	usability_total: z.number(),
	usability_total_max: z.number()
});

export const placeAuditHistoryItemSchema = z.object({
	audit_id: z.string().uuid(),
	audit_code: z.string(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	auditor_code: z.string(),
	status: auditStatusSchema,
	started_at: z.string().datetime(),
	submitted_at: z.string().datetime().nullable(),
	summary_score: z.number().nullable(),
	execution_mode: executionModeSchema.nullable().optional().default(null),
	score_pair: scorePairSchema.nullable().optional().default(null)
});

export const savedPlaceReportEntrySchema = z.object({
	report_type: z.enum(["combined", "full_assessment"]),
	audit_id: z.string().uuid().nullable().optional().default(null),
	survey_id: z.string().uuid().nullable().optional().default(null),
	submission_id: z.string().uuid().nullable().optional().default(null),
	created_at: z.string().datetime()
});

export const placeHistorySchema = z.object({
	place_id: z.string().uuid(),
	place_name: z.string(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	address: z.string().nullable(),
	postal_code: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	lat: z.number().nullable(),
	lng: z.number().nullable(),
	total_audits: z.number().int().nonnegative(),
	submitted_audits: z.number().int().nonnegative(),
	in_progress_audits: z.number().int().nonnegative(),
	average_submitted_score: z.number().nullable(),
	latest_submitted_at: z.string().datetime().nullable(),
	audits: z.array(placeAuditHistoryItemSchema),
	saved_place_reports: z.array(savedPlaceReportEntrySchema).optional().default([]),
	place_audit_status: placeAxisStatusSchema.optional().default("not_started"),
	place_survey_status: placeAxisStatusSchema.optional().default("not_started"),
	place_audit_count: z.number().int().nonnegative().optional().default(0),
	place_survey_count: z.number().int().nonnegative().optional().default(0),
	audit_mean_scores: scorePairSchema.nullable().optional().default(null),
	survey_mean_scores: scorePairSchema.nullable().optional().default(null),
	overall_scores: scorePairSchema.nullable().optional().default(null)
});

export const managerPlacesSummarySchema = z.object({
	total_places: z.number().int().nonnegative(),
	submitted_places: z.number().int().nonnegative(),
	in_progress_places: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	completed_place_audits: z.number().int().nonnegative().optional().default(0),
	completed_place_surveys: z.number().int().nonnegative().optional().default(0),
	audit_mean_scores: scorePairSchema.nullable().optional().default(null),
	survey_mean_scores: scorePairSchema.nullable().optional().default(null),
	overall_scores: scorePairSchema.nullable().optional().default(null)
});

export const managerPlaceRowSchema = z.object({
	id: z.string().uuid(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	name: z.string(),
	address: z.string().nullable(),
	postal_code: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	place_type: playspaceTypeSchema.nullable(),
	audits_completed: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	last_audited_at: z.string().datetime().nullable(),
	place_audit_status: placeAxisStatusSchema.optional().default("not_started"),
	place_survey_status: placeAxisStatusSchema.optional().default("not_started"),
	place_audit_count: z.number().int().nonnegative().optional().default(0),
	place_survey_count: z.number().int().nonnegative().optional().default(0),
	audit_mean_scores: scorePairSchema.nullable().optional().default(null),
	survey_mean_scores: scorePairSchema.nullable().optional().default(null),
	overall_scores: scorePairSchema.nullable().optional().default(null)
});

export const managerPlacesListSchema = z.object({
	items: z.array(managerPlaceRowSchema),
	total_count: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	page_size: z.number().int().positive(),
	total_pages: z.number().int().positive(),
	summary: managerPlacesSummarySchema
});

export const managerAuditsSummarySchema = z.object({
	total_audits: z.number().int().nonnegative(),
	submitted_audits: z.number().int().nonnegative(),
	in_progress_audits: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	average_scores: scorePairSchema.nullable().optional().default(null)
});

export const managerAuditRowSchema = z.object({
	audit_id: z.string().uuid(),
	audit_code: z.string(),
	status: auditStatusSchema,
	auditor_code: z.string(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	place_id: z.string().uuid(),
	place_name: z.string(),
	started_at: z.string().datetime(),
	submitted_at: z.string().datetime().nullable(),
	summary_score: z.number().nullable(),
	execution_mode: executionModeSchema.nullable().optional().default(null),
	score_pair: scorePairSchema.nullable().optional().default(null)
});

export const managerAuditsListSchema = z.object({
	items: z.array(managerAuditRowSchema),
	total_count: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	page_size: z.number().int().positive(),
	total_pages: z.number().int().positive(),
	summary: managerAuditsSummarySchema
});

export const assignmentSchema = z.object({
	id: z.string().uuid(),
	auditor_profile_id: z.string().uuid(),
	project_id: z.string().uuid(),
	place_id: z.string().uuid(),
	scope_type: z.literal("place"),
	scope_id: z.string().uuid(),
	scope_name: z.string(),
	project_name: z.string(),
	place_name: z.string(),
	assigned_at: z.string().datetime()
});

export const assignmentWriteSchema = z.object({
	project_id: z.string().uuid(),
	place_id: z.string().uuid()
});

export const bulkAssignmentWriteSchema = z.object({
	project_id: z.string().uuid(),
	auditor_profile_ids: z.array(z.string().uuid()),
	place_ids: z.array(z.string().uuid())
});

export const placeDetailSchema = z.object({
	id: z.string().uuid(),
	project_ids: z.array(z.string().uuid()),
	project_names: z.array(z.string()),
	name: z.string(),
	address: z.string().nullable(),
	postal_code: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	place_type: playspaceTypeSchema.nullable(),
	lat: z.number().nullable(),
	lng: z.number().nullable(),
	start_date: z.string().date().nullable(),
	end_date: z.string().date().nullable(),
	est_auditors: z.number().int().nullable(),
	auditor_description: z.string().nullable(),
	saved_place_reports: z.array(savedPlaceReportEntrySchema).optional().default([]),
	created_at: z.string().datetime()
});

export const accountManagementResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email_masked: z.string().nullable(),
	account_type: accountTypeSchema,
	created_at: z.string().datetime()
});

export const accountUpdateRequestSchema = z.object({
	name: z.string().min(1).optional(),
	email: z.string().email().optional()
});

export const myAuditorProfileSchema = z.object({
	profile_id: z.string().uuid(),
	auditor_code: z.string(),
	full_name: z.string(),
	email: z.string().nullable(),
	phone: z.string().nullable(),
	age_range: z.string().nullable(),
	gender: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	role: z.string().nullable()
});

export const myAuditorProfileUpdateSchema = z.object({
	full_name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	gender: z.string().optional(),
	age_range: z.string().optional(),
	city: z.string().optional(),
	province: z.string().optional(),
	country: z.string().optional(),
	role: z.string().optional()
});

export const myManagerProfileSchema = z.object({
	profile_id: z.string().uuid(),
	full_name: z.string(),
	email: z.string(),
	phone: z.string().nullable(),
	position: z.string().nullable(),
	organization: z.string().nullable(),
	is_primary: z.boolean()
});

export const myManagerProfileUpdateSchema = z.object({
	full_name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
	position: z.string().optional()
});

export const changePasswordRequestSchema = z.object({
	current_password: z.string().min(1),
	new_password: z.string().min(8)
});

export const auditorProfileDetailSchema = z.object({
	id: z.string().uuid(),
	account_id: z.string().uuid(),
	auditor_code: z.string(),
	email_masked: z.string().nullable(),
	age_range: z.string().nullable(),
	gender: z.string().nullable(),
	country: z.string().nullable(),
	role: z.string().nullable(),
	created_at: z.string().datetime()
});

export const projectCreateRequestSchema = z.object({
	account_id: z.string().uuid().nullable().optional(),
	name: z.string().min(1),
	overview: z.string().nullable().optional(),
	start_date: z.string().date().nullable().optional(),
	end_date: z.string().date().nullable().optional(),
	est_places: z.number().int().nullable().optional(),
	est_auditors: z.number().int().nullable().optional(),
	auditor_description: z.string().nullable().optional()
});

export const projectUpdateRequestSchema = z.object({
	name: z.string().min(1).optional(),
	overview: z.string().nullable().optional(),
	start_date: z.string().date().nullable().optional(),
	end_date: z.string().date().nullable().optional(),
	est_places: z.number().int().nullable().optional(),
	est_auditors: z.number().int().nullable().optional(),
	auditor_description: z.string().nullable().optional()
});

export const placeCreateRequestSchema = z.object({
	project_ids: z.array(z.string().uuid()).min(1),
	name: z.string().min(1),
	address: z.string().nullable().optional(),
	postal_code: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	province: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	place_type: playspaceTypeSchema.nullable().optional(),
	lat: z.number().nullable().optional(),
	lng: z.number().nullable().optional(),
	start_date: z.string().date().nullable().optional(),
	end_date: z.string().date().nullable().optional(),
	est_auditors: z.number().int().nullable().optional(),
	auditor_description: z.string().nullable().optional()
});

export const placeUpdateRequestSchema = z.object({
	project_ids: z.array(z.string().uuid()).optional(),
	name: z.string().min(1).optional(),
	address: z.string().nullable().optional(),
	postal_code: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	province: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	place_type: playspaceTypeSchema.nullable().optional(),
	lat: z.number().nullable().optional(),
	lng: z.number().nullable().optional(),
	start_date: z.string().date().nullable().optional(),
	end_date: z.string().date().nullable().optional(),
	est_auditors: z.number().int().nullable().optional(),
	auditor_description: z.string().nullable().optional()
});

export const auditorCreateRequestSchema = z.object({
	email: z.string().email(),
	full_name: z.string().min(1),
	age_range: z.string().nullable().optional(),
	gender: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	role: z.string().nullable().optional()
});

export const auditorUpdateRequestSchema = z.object({
	email: z.string().email().nullable().optional(),
	full_name: z.string().nullable().optional(),
	auditor_code: z.string().nullable().optional(),
	age_range: z.string().nullable().optional(),
	gender: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	role: z.string().nullable().optional()
});

export const auditorPlaceSchema = z.object({
	place_id: z.string().uuid(),
	place_name: z.string(),
	place_type: playspaceTypeSchema.nullable(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	address: z.string().nullable(),
	postal_code: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	audit_id: z.string().uuid().nullable(),
	started_at: z.string().datetime().nullable(),
	submitted_at: z.string().datetime().nullable(),
	summary_score: z.number().nullable(),
	score_totals: scoreTotalsSchema.nullable(),
	progress_percent: z.number().nullable(),
	selected_execution_mode: executionModeSchema.nullable().optional().default(null),
	place_audit_status: placeAxisStatusSchema.optional().default("not_started"),
	place_survey_status: placeAxisStatusSchema.optional().default("not_started"),
	audit_scores: scorePairSchema.nullable().optional().default(null),
	survey_scores: scorePairSchema.nullable().optional().default(null),
	overall_scores: scorePairSchema.nullable().optional().default(null)
});

export const auditorAuditSummarySchema = z.object({
	audit_id: z.string().uuid(),
	audit_code: z.string(),
	auditor_code: z.string().optional().default(""),
	place_id: z.string().uuid(),
	place_name: z.string(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	status: auditStatusSchema,
	execution_mode: executionModeSchema.nullable().optional().default(null),
	started_at: z.string().datetime(),
	submitted_at: z.string().datetime().nullable(),
	summary_score: z.number().nullable(),
	score_totals: scoreTotalsSchema.nullable(),
	score_pair: scorePairSchema.nullable().optional().default(null),
	progress_percent: z.number().nullable()
});

export const auditorDashboardSummarySchema = z.object({
	total_assigned_places: z.number().int().nonnegative(),
	in_progress_audits: z.number().int().nonnegative(),
	submitted_audits: z.number().int().nonnegative(),
	pending_places: z.number().int().nonnegative(),
	average_submitted_score: z.number().nullable()
});

export const auditMetaSchema = z.object({
	execution_mode: executionModeSchema.nullable(),
	final_comments: z.string().nullable().optional().default(null)
});

export const auditPreAuditSchema = z.object({
	place_size: z.string().nullable(),
	current_users_0_5: z.string().nullable(),
	current_users_6_12: z.string().nullable(),
	current_users_13_17: z.string().nullable(),
	current_users_18_plus: z.string().nullable(),
	playspace_busyness: z.string().nullable(),
	season: z.string().nullable(),
	weather_conditions: z.array(z.string()),
	wind_conditions: z.string().nullable()
});

export const questionResponseValueSchema = z.union([
	z.string(),
	z.array(z.string()),
	z.record(z.string(), z.string()),
	z.null()
]);

export const questionResponsePayloadSchema = z.record(z.string(), questionResponseValueSchema);

export const auditSectionStateSchema = z.object({
	section_key: z.string(),
	responses: z.record(z.string(), questionResponsePayloadSchema),
	note: z.string().nullable()
});

export const auditSectionProgressSchema = z.object({
	section_key: z.string(),
	title: z.string(),
	visible_question_count: z.number().int().nonnegative(),
	answered_question_count: z.number().int().nonnegative(),
	is_complete: z.boolean()
});

export const auditProgressSchema = z.object({
	required_pre_audit_complete: z.boolean(),
	visible_section_count: z.number().int().nonnegative(),
	completed_section_count: z.number().int().nonnegative(),
	total_visible_questions: z.number().int().nonnegative(),
	answered_visible_questions: z.number().int().nonnegative(),
	ready_to_submit: z.boolean(),
	sections: z.array(auditSectionProgressSchema)
});

export const auditScoresSchema = z.object({
	draft_progress_percent: z.number().nullable(),
	execution_mode: executionModeSchema.nullable(),
	audit: scoreTotalsSchema.nullable().optional().default(null),
	survey: scoreTotalsSchema.nullable().optional().default(null),
	overall: scoreTotalsSchema.nullable(),
	by_section: z.record(z.string(), scoreTotalsSchema),
	by_domain: z.record(z.string(), scoreTotalsSchema)
});

export const auditAggregateSchema = z.object({
	schema_version: z.number().int().positive(),
	revision: z.number().int().nonnegative(),
	meta: auditMetaSchema,
	pre_audit: auditPreAuditSchema,
	sections: z.record(z.string(), auditSectionStateSchema)
});

export const auditSessionSchema = z
	.object({
		audit_id: z.string().uuid(),
		audit_code: z.string(),
		auditor_code: z.string(),
		project_id: z.string().uuid(),
		project_name: z.string(),
		place_id: z.string().uuid(),
		place_name: z.string(),
		place_type: playspaceTypeSchema.nullable(),
		allowed_execution_modes: z.array(executionModeSchema),
		selected_execution_mode: executionModeSchema.nullable(),
		status: auditStatusSchema,
		instrument_key: z.string(),
		instrument_version: z.string(),
		instrument: playspaceInstrumentSchema.optional(),
		schema_version: z.number().int().positive().optional().default(1),
		revision: z.number().int().nonnegative().optional().default(0),
		aggregate: auditAggregateSchema.optional(),
		started_at: z.string().datetime(),
		submitted_at: z.string().datetime().nullable(),
		total_minutes: z.number().int().nullable(),
		meta: auditMetaSchema,
		pre_audit: auditPreAuditSchema,
		sections: z.record(z.string(), auditSectionStateSchema),
		scores: auditScoresSchema,
		progress: auditProgressSchema
	})
	.transform(value => {
		const aggregate = value.aggregate ?? {
			schema_version: value.schema_version,
			revision: value.revision,
			meta: value.meta,
			pre_audit: value.pre_audit,
			sections: value.sections
		};

		return {
			...value,
			schema_version: aggregate.schema_version,
			revision: aggregate.revision,
			aggregate
		};
	});

export const auditAggregateWriteSchema = z.object({
	schema_version: z.number().int().positive().optional(),
	meta: z
		.object({
			execution_mode: executionModeSchema.nullable().optional(),
			final_comments: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	pre_audit: z
		.object({
			place_size: z.string().nullable().optional(),
			current_users_0_5: z.string().nullable().optional(),
			current_users_6_12: z.string().nullable().optional(),
			current_users_13_17: z.string().nullable().optional(),
			current_users_18_plus: z.string().nullable().optional(),
			playspace_busyness: z.string().nullable().optional(),
			season: z.string().nullable().optional(),
			weather_conditions: z.array(z.string()).optional(),
			wind_conditions: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	sections: z
		.record(
			z.string(),
			z.object({
				responses: z.record(z.string(), questionResponsePayloadSchema).default({}),
				note: z.string().nullable().optional()
			})
		)
		.default({})
});

export const auditDraftPatchSchema = z.object({
	expected_revision: z.number().int().nonnegative().optional(),
	aggregate: auditAggregateWriteSchema.nullable().optional(),
	meta: z
		.object({
			execution_mode: executionModeSchema.nullable().optional(),
			final_comments: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	pre_audit: z
		.object({
			place_size: z.string().nullable().optional(),
			current_users_0_5: z.string().nullable().optional(),
			current_users_6_12: z.string().nullable().optional(),
			current_users_13_17: z.string().nullable().optional(),
			current_users_18_plus: z.string().nullable().optional(),
			playspace_busyness: z.string().nullable().optional(),
			season: z.string().nullable().optional(),
			weather_conditions: z.array(z.string()).optional(),
			wind_conditions: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	sections: z
		.record(
			z.string(),
			z.object({
				responses: z.record(z.string(), questionResponsePayloadSchema).default({}),
				note: z.string().nullable().optional()
			})
		)
		.default({})
});

export const auditDraftSaveSchema = z.object({
	audit_id: z.string().uuid(),
	status: auditStatusSchema,
	schema_version: z.number().int().positive(),
	revision: z.number().int().nonnegative(),
	draft_progress_percent: z.number().nullable(),
	saved_at: z.string().datetime()
});

export const adminOverviewSchema = z.object({
	total_accounts: z.number().int().nonnegative(),
	total_projects: z.number().int().nonnegative(),
	total_places: z.number().int().nonnegative(),
	total_auditors: z.number().int().nonnegative(),
	total_audits: z.number().int().nonnegative(),
	submitted_audits: z.number().int().nonnegative(),
	in_progress_audits: z.number().int().nonnegative()
});

export const adminAccountRowSchema = z.object({
	account_id: z.string().uuid(),
	name: z.string(),
	account_type: accountTypeSchema,
	email_masked: z.string().nullable(),
	created_at: z.string().datetime(),
	projects_count: z.number().int().nonnegative(),
	places_count: z.number().int().nonnegative(),
	auditors_count: z.number().int().nonnegative()
});

export const adminProjectRowSchema = z.object({
	project_id: z.string().uuid(),
	account_id: z.string().uuid(),
	account_name: z.string(),
	name: z.string(),
	start_date: z.string().date().nullable(),
	end_date: z.string().date().nullable(),
	places_count: z.number().int().nonnegative(),
	auditors_count: z.number().int().nonnegative(),
	audits_completed: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	average_scores: scorePairSchema.nullable().optional().default(null)
});

export const adminPlaceRowSchema = z.object({
	place_id: z.string().uuid(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	account_id: z.string().uuid(),
	account_name: z.string(),
	name: z.string(),
	place_type: z.string().nullable(),
	address: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	audits_completed: z.number().int().nonnegative(),
	average_score: z.number().nullable(),
	last_audited_at: z.string().datetime().nullable(),
	place_audit_status: placeAxisStatusSchema.optional().default("not_started"),
	place_survey_status: placeAxisStatusSchema.optional().default("not_started"),
	place_audit_count: z.number().int().nonnegative().optional().default(0),
	place_survey_count: z.number().int().nonnegative().optional().default(0),
	audit_mean_scores: scorePairSchema.nullable().optional().default(null),
	survey_mean_scores: scorePairSchema.nullable().optional().default(null),
	overall_scores: scorePairSchema.nullable().optional().default(null)
});

export const adminAuditorRowSchema = z.object({
	auditor_profile_id: z.string().uuid(),
	account_id: z.string().uuid().nullable(),
	auditor_code: z.string(),
	email_masked: z.string().nullable(),
	assignments_count: z.number().int().nonnegative(),
	completed_audits: z.number().int().nonnegative(),
	last_active_at: z.string().datetime().nullable()
});

export const adminAuditRowSchema = z.object({
	audit_id: z.string().uuid(),
	audit_code: z.string(),
	status: auditStatusSchema,
	account_id: z.string().uuid(),
	account_name: z.string(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	place_id: z.string().uuid(),
	place_name: z.string(),
	auditor_code: z.string(),
	started_at: z.string().datetime(),
	submitted_at: z.string().datetime().nullable(),
	summary_score: z.number().nullable(),
	execution_mode: executionModeSchema.nullable().optional().default(null),
	score_pair: scorePairSchema.nullable().optional().default(null)
});

export const instrumentContentSchema = z.object({
	en: playspaceInstrumentSchema,
	de: playspaceInstrumentSchema.nullable().optional(),
	hi: playspaceInstrumentSchema.nullable().optional()
});

export const adminSystemSchema = z.object({
	instrument_key: z.string(),
	instrument_name: z.string(),
	instrument_version: z.string(),
	generated_at: z.string().datetime(),
	instrument: instrumentContentSchema
});

export const adminProjectExportRecordSchema = z.object({
	project_id: z.string().uuid(),
	account_id: z.string().uuid(),
	account_name: z.string(),
	name: z.string(),
	overview: z.string().nullable(),
	start_date: z.string().date().nullable(),
	end_date: z.string().date().nullable(),
	place_types: z.array(z.string()),
	places_count: z.number().int().nonnegative(),
	auditors_count: z.number().int().nonnegative(),
	audits_completed: z.number().int().nonnegative(),
	average_pv_score: z.number().nullable(),
	average_u_score: z.number().nullable(),
	audit_mean_pv: z.number().nullable().optional(),
	audit_mean_u: z.number().nullable().optional(),
	survey_mean_pv: z.number().nullable().optional(),
	survey_mean_u: z.number().nullable().optional()
});

export const adminProjectsExportResponseSchema = z.object({
	entity: z.literal("projects"),
	generated_at: z.string().datetime(),
	record_count: z.number().int().nonnegative(),
	records: z.array(adminProjectExportRecordSchema)
});

export const adminPlaceExportRecordSchema = z.object({
	place_id: z.string().uuid(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	project_overview: z.string().nullable().optional(),
	project_start_date: z.string().date().nullable().optional(),
	project_end_date: z.string().date().nullable().optional(),
	account_id: z.string().uuid(),
	account_name: z.string(),
	name: z.string(),
	address: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	postal_code: z.string().nullable(),
	place_type: z.string().nullable(),
	lat: z.number().nullable(),
	lng: z.number().nullable(),
	place_audit_status: z.string(),
	place_survey_status: z.string(),
	place_audit_count: z.number().int().nonnegative(),
	place_survey_count: z.number().int().nonnegative(),
	audits_completed: z.number().int().nonnegative(),
	audit_mean_pv: z.number().nullable(),
	audit_mean_u: z.number().nullable(),
	survey_mean_pv: z.number().nullable(),
	survey_mean_u: z.number().nullable(),
	last_audited_at: z.string().datetime().nullable()
});

export const adminPlacesExportResponseSchema = z.object({
	entity: z.literal("places"),
	generated_at: z.string().datetime(),
	record_count: z.number().int().nonnegative(),
	records: z.array(adminPlaceExportRecordSchema)
});

export const adminAuditExportRecordSchema = z.object({
	audit_id: z.string().uuid(),
	audit_code: z.string(),
	status: auditStatusSchema,
	execution_mode: executionModeSchema.nullable().optional(),
	account_id: z.string().uuid(),
	account_name: z.string(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	place_id: z.string().uuid(),
	place_name: z.string(),
	auditor_code: z.string(),
	started_at: z.string().datetime(),
	submitted_at: z.string().datetime().nullable(),
	summary_score: z.number().nullable(),
	audit_pv_score: z.number().nullable(),
	audit_u_score: z.number().nullable(),
	survey_pv_score: z.number().nullable(),
	survey_u_score: z.number().nullable()
});

export const adminAuditsExportResponseSchema = z.object({
	entity: z.string(),
	generated_at: z.string().datetime(),
	record_count: z.number().int().nonnegative(),
	records: z.array(adminAuditExportRecordSchema)
});

// ── Admin relational export bundles (parent level + all descendants) ────────────

export const adminAuditorExportRecordSchema = z.object({
	auditor_profile_id: z.string().uuid(),
	account_id: z.string().uuid().nullable(),
	account_name: z.string().nullable(),
	auditor_code: z.string(),
	assignments_count: z.number().int().nonnegative(),
	completed_audits: z.number().int().nonnegative(),
	last_active_at: z.string().datetime().nullable()
});

export const adminProjectsExportBundleSchema = z.object({
	generated_at: z.string().datetime(),
	scope: z.string(),
	projects: z.array(adminProjectExportRecordSchema),
	places: z.array(adminPlaceExportRecordSchema),
	auditors: z.array(adminAuditorExportRecordSchema),
	audits: z.array(adminAuditExportRecordSchema)
});

export const adminPlacesExportBundleSchema = z.object({
	generated_at: z.string().datetime(),
	scope: z.string(),
	places: z.array(adminPlaceExportRecordSchema),
	auditors: z.array(adminAuditorExportRecordSchema),
	audits: z.array(adminAuditExportRecordSchema)
});

// ── Manager relational export records & bundles (full auditor identity) ─────────

export const managerProjectExportRecordSchema = z.object({
	project_id: z.string().uuid(),
	name: z.string(),
	overview: z.string().nullable(),
	start_date: z.string().date().nullable(),
	end_date: z.string().date().nullable(),
	place_types: z.array(z.string()),
	places_count: z.number().int().nonnegative(),
	auditors_count: z.number().int().nonnegative(),
	audits_completed: z.number().int().nonnegative(),
	average_pv_score: z.number().nullable(),
	average_u_score: z.number().nullable(),
	audit_mean_pv: z.number().nullable().optional(),
	audit_mean_u: z.number().nullable().optional(),
	survey_mean_pv: z.number().nullable().optional(),
	survey_mean_u: z.number().nullable().optional()
});

export const managerPlaceExportRecordSchema = z.object({
	place_id: z.string().uuid(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	project_overview: z.string().nullable(),
	project_start_date: z.string().date().nullable(),
	project_end_date: z.string().date().nullable(),
	name: z.string(),
	address: z.string().nullable(),
	city: z.string().nullable(),
	province: z.string().nullable(),
	country: z.string().nullable(),
	postal_code: z.string().nullable(),
	place_type: z.string().nullable(),
	lat: z.number().nullable(),
	lng: z.number().nullable(),
	place_audit_status: z.string(),
	place_survey_status: z.string(),
	place_audit_count: z.number().int().nonnegative(),
	place_survey_count: z.number().int().nonnegative(),
	audits_completed: z.number().int().nonnegative(),
	audit_mean_pv: z.number().nullable(),
	audit_mean_u: z.number().nullable(),
	survey_mean_pv: z.number().nullable(),
	survey_mean_u: z.number().nullable(),
	last_audited_at: z.string().datetime().nullable()
});

export const managerAuditorExportRecordSchema = z.object({
	auditor_profile_id: z.string().uuid(),
	auditor_code: z.string(),
	full_name: z.string(),
	email: z.string().nullable(),
	age_range: z.string().nullable(),
	gender: z.string().nullable(),
	country: z.string().nullable(),
	role: z.string().nullable(),
	assignments_count: z.number().int().nonnegative(),
	completed_audits: z.number().int().nonnegative(),
	last_active_at: z.string().datetime().nullable()
});

export const managerAuditExportRecordSchema = z.object({
	audit_id: z.string().uuid(),
	audit_code: z.string(),
	status: z.string(),
	execution_mode: executionModeSchema.nullable().optional(),
	project_id: z.string().uuid(),
	project_name: z.string(),
	place_id: z.string().uuid(),
	place_name: z.string(),
	auditor_code: z.string(),
	auditor_full_name: z.string(),
	auditor_email: z.string().nullable(),
	auditor_age_range: z.string().nullable(),
	auditor_gender: z.string().nullable(),
	auditor_country: z.string().nullable(),
	auditor_role: z.string().nullable(),
	started_at: z.string().datetime(),
	submitted_at: z.string().datetime().nullable(),
	summary_score: z.number().nullable(),
	audit_pv_score: z.number().nullable(),
	audit_u_score: z.number().nullable(),
	survey_pv_score: z.number().nullable(),
	survey_u_score: z.number().nullable()
});

export const managerProjectsExportBundleSchema = z.object({
	generated_at: z.string().datetime(),
	scope: z.string(),
	projects: z.array(managerProjectExportRecordSchema),
	places: z.array(managerPlaceExportRecordSchema),
	auditors: z.array(managerAuditorExportRecordSchema),
	audits: z.array(managerAuditExportRecordSchema)
});

export const managerPlacesExportBundleSchema = z.object({
	generated_at: z.string().datetime(),
	scope: z.string(),
	places: z.array(managerPlaceExportRecordSchema),
	auditors: z.array(managerAuditorExportRecordSchema),
	audits: z.array(managerAuditExportRecordSchema)
});

export const managerAuditsExportResponseSchema = z.object({
	entity: z.string(),
	generated_at: z.string().datetime(),
	record_count: z.number().int().nonnegative(),
	records: z.array(managerAuditExportRecordSchema)
});

export const instrumentResponseSchema = z.object({
	id: z.string().uuid(),
	instrument_key: z.string(),
	instrument_version: z.string(),
	parent_instrument_id: z
		.string()
		.uuid()
		.nullish()
		.transform(value => value ?? null),
	is_active: z.boolean(),
	content: instrumentContentSchema,
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	submission_count: z.number().int().nonnegative().default(0),
	can_delete: z.boolean().default(true)
});

export type InstrumentResponse = z.infer<typeof instrumentResponseSchema>;

export const instrumentCreateRequestSchema = z.object({
	instrument_key: z.string().min(1),
	instrument_version: z.string().min(1),
	parent_instrument_id: z.string().uuid().nullable().optional(),
	content: instrumentContentSchema
});

export const instrumentUpdateRequestSchema = z.object({
	is_active: z.boolean().optional()
});

export function paginatedResponseSchema<TItem extends z.ZodTypeAny>(itemSchema: TItem) {
	return z.object({
		items: z.array(itemSchema),
		total_count: z.number().int().nonnegative(),
		page: z.number().int().positive(),
		page_size: z.number().int().positive(),
		total_pages: z.number().int().positive()
	});
}

export type ManagerInviteStatus = z.infer<typeof managerInviteStatusSchema>;
export type ManagerInviteListItem = z.infer<typeof managerInviteListItemSchema>;
export type ManagerInviteCreatedResponse = z.infer<typeof managerInviteCreatedResponseSchema>;
export type MyAuditorProfile = z.infer<typeof myAuditorProfileSchema>;
export type MyAuditorProfileUpdate = z.infer<typeof myAuditorProfileUpdateSchema>;
export type MyManagerProfile = z.infer<typeof myManagerProfileSchema>;
export type MyManagerProfileUpdate = z.infer<typeof myManagerProfileUpdateSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export type ManagerProfile = z.infer<typeof managerProfileSchema>;
export type AccountDetail = z.infer<typeof accountDetailSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type ProjectStats = z.infer<typeof projectStatsSchema>;
export type AuditorSummary = z.infer<typeof auditorSummarySchema>;
export type PlaceSummary = z.infer<typeof placeSummarySchema>;
export type PlayspaceType = z.infer<typeof playspaceTypeSchema>;
export type PlaceAuditHistoryItem = z.infer<typeof placeAuditHistoryItemSchema>;
export type SavedPlaceReportEntry = z.infer<typeof savedPlaceReportEntrySchema>;
export type PlaceHistory = z.infer<typeof placeHistorySchema>;
export type ManagerPlacesSummary = z.infer<typeof managerPlacesSummarySchema>;
export type ManagerPlaceRow = z.infer<typeof managerPlaceRowSchema>;
export type ManagerPlacesList = z.infer<typeof managerPlacesListSchema>;
export type ManagerAuditsSummary = z.infer<typeof managerAuditsSummarySchema>;
export type ManagerAuditRow = z.infer<typeof managerAuditRowSchema>;
export type ManagerAuditsList = z.infer<typeof managerAuditsListSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type AssignmentWrite = z.infer<typeof assignmentWriteSchema>;
export type BulkAssignmentWrite = z.infer<typeof bulkAssignmentWriteSchema>;
export type PlaceDetail = z.infer<typeof placeDetailSchema>;
export type AccountManagementResponse = z.infer<typeof accountManagementResponseSchema>;
export type AuditorProfileDetail = z.infer<typeof auditorProfileDetailSchema>;
export type AuditorPlace = z.infer<typeof auditorPlaceSchema>;
export type AuditorAuditSummary = z.infer<typeof auditorAuditSummarySchema>;
export type AuditorDashboardSummary = z.infer<typeof auditorDashboardSummarySchema>;
export type ScoreTotals = z.infer<typeof scoreTotalsSchema>;
export type ScorePair = z.infer<typeof scorePairSchema>;
export type ExecutionMode = z.infer<typeof executionModeSchema>;
export type AuditScores = z.infer<typeof auditScoresSchema>;
export type AuditSession = z.infer<typeof auditSessionSchema>;
export type AuditDraftPatch = z.infer<typeof auditDraftPatchSchema>;
export type AuditDraftSave = z.infer<typeof auditDraftSaveSchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminAccountRow = z.infer<typeof adminAccountRowSchema>;
export type AdminProjectRow = z.infer<typeof adminProjectRowSchema>;
export type AdminPlaceRow = z.infer<typeof adminPlaceRowSchema>;
export type AdminAuditorRow = z.infer<typeof adminAuditorRowSchema>;
export type AdminAuditRow = z.infer<typeof adminAuditRowSchema>;
export type AdminSystem = z.infer<typeof adminSystemSchema>;
export type AdminProjectExportRecord = z.infer<typeof adminProjectExportRecordSchema>;
export type AdminProjectsExportResponse = z.infer<typeof adminProjectsExportResponseSchema>;
export type AdminPlaceExportRecord = z.infer<typeof adminPlaceExportRecordSchema>;
export type AdminPlacesExportResponse = z.infer<typeof adminPlacesExportResponseSchema>;
export type AdminAuditExportRecord = z.infer<typeof adminAuditExportRecordSchema>;
export type AdminAuditsExportResponse = z.infer<typeof adminAuditsExportResponseSchema>;
export type AdminAuditorExportRecord = z.infer<typeof adminAuditorExportRecordSchema>;
export type AdminProjectsExportBundle = z.infer<typeof adminProjectsExportBundleSchema>;
export type AdminPlacesExportBundle = z.infer<typeof adminPlacesExportBundleSchema>;
export type ManagerProjectExportRecord = z.infer<typeof managerProjectExportRecordSchema>;
export type ManagerPlaceExportRecord = z.infer<typeof managerPlaceExportRecordSchema>;
export type ManagerAuditorExportRecord = z.infer<typeof managerAuditorExportRecordSchema>;
export type ManagerAuditExportRecord = z.infer<typeof managerAuditExportRecordSchema>;
export type ManagerProjectsExportBundle = z.infer<typeof managerProjectsExportBundleSchema>;
export type ManagerPlacesExportBundle = z.infer<typeof managerPlacesExportBundleSchema>;
export type ManagerAuditsExportResponse = z.infer<typeof managerAuditsExportResponseSchema>;
export type PaginatedResponse<TItem> = {
	items: TItem[];
	total_count: number;
	page: number;
	page_size: number;
	total_pages: number;
};

export interface ManagerPlacesQuery {
	page?: number;
	pageSize?: number;
	search?: string;
	sort?: string;
	projectIds?: readonly string[];
	auditorIds?: readonly string[];
	auditStatuses?: readonly string[];
	surveyStatuses?: readonly string[];
}

export interface ManagerAuditsQuery {
	page?: number;
	pageSize?: number;
	search?: string;
	sort?: string;
	projectIds?: readonly string[];
	auditorIds?: readonly string[];
	placeIds?: readonly string[];
	statuses?: Array<"IN_PROGRESS" | "PAUSED" | "SUBMITTED">;
}

export interface PaginatedListQuery {
	page?: number;
	pageSize?: number;
	search?: string;
	sort?: string;
}

export interface AuditorPlacesQuery extends PaginatedListQuery {
	statuses?: Array<"IN_PROGRESS" | "PAUSED" | "SUBMITTED" | "not_started">;
}

export interface AuditorAuditsQuery extends PaginatedListQuery {
	statuses?: Array<"submitted" | "in_progress" | "paused">;
}

export interface AdminAccountsQuery extends PaginatedListQuery {
	accountTypes?: Array<"ADMIN" | "MANAGER" | "AUDITOR">;
}

export interface AdminPlacesQuery extends PaginatedListQuery {
	projectIds?: readonly string[];
	accountIds?: readonly string[];
	auditStatuses?: readonly string[];
	surveyStatuses?: readonly string[];
}

export interface AdminAuditorsQuery extends PaginatedListQuery {
	accountIds?: readonly string[];
	projectIds?: readonly string[];
	placeIds?: readonly string[];
}

export interface AdminProjectsQuery extends PaginatedListQuery {
	accountIds?: readonly string[];
}

export interface AdminAuditsQuery extends PaginatedListQuery {
	projectIds?: readonly string[];
	accountIds?: readonly string[];
	auditorIds?: readonly string[];
	placeIds?: readonly string[];
	statuses?: Array<"IN_PROGRESS" | "PAUSED" | "SUBMITTED">;
}

export interface AdminExportQuery {
	search?: string;
	accountIds?: readonly string[];
	projectIds?: readonly string[];
	placeIds?: readonly string[];
	auditorIds?: readonly string[];
	auditStatuses?: readonly string[];
	surveyStatuses?: readonly string[];
	statuses?: Array<"IN_PROGRESS" | "PAUSED" | "SUBMITTED">;
}

/**
 * Summary of a completed raw-data export, sent to the backend so it can email
 * the requester a completion notice. The ZIP is generated in the browser, so
 * this carries counts only - never the file itself.
 */
export interface ExportReadyNotifyPayload {
	entity: "audits" | "reports" | "places" | "projects";
	format: "xlsx" | "json";
	audit_count: number;
	combined_report_count?: number;
	had_failures?: boolean;
}

/**
 * Manager export query - identical to AdminExportQuery minus accountIds
 * (manager exports are always scoped to the manager's own account).
 */
export interface ManagerExportQuery {
	search?: string;
	projectIds?: readonly string[];
	placeIds?: readonly string[];
	auditorIds?: readonly string[];
	auditStatuses?: readonly string[];
	surveyStatuses?: readonly string[];
	statuses?: Array<"IN_PROGRESS" | "PAUSED" | "SUBMITTED">;
}

/**
 * Structured error for API failures and validation issues.
 */
export class PlayspaceApiError extends Error {
	public readonly status: number;

	public constructor(message: string, status: number) {
		super(message);
		this.name = "PlayspaceApiError";
		this.status = status;
	}
}
