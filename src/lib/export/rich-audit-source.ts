/**
 * Rich-audit data source for bulk ZIP exports.
 *
 * Bulk exports reuse the exact single-audit export functions, which need the
 * full `ExportableAudit` (session + context + auditor profile) and the resolved
 * instrument. This module is the single place that turns an audit id into that
 * rich payload, so the rest of the export pipeline never talks to the API
 * directly.
 *
 * Today it fetches each audit through `auditor.getAudit` (already scope-enforced
 * server-side) and resolves the instrument from the embedded definition or the
 * instrument endpoint, caching by instrument key. A future Phase 3 background
 * path can swap this for a batched bundle endpoint by providing a different
 * `RichAuditSource` implementation - nothing else in the pipeline changes.
 */

import { playspaceApi, type AuditSession } from "@/lib/api/playspace";
import type { PlayspaceInstrument } from "@/types/audit";
import type { ExportableAudit } from "./audit";

/** A fully-resolved audit ready to be handed to the export generators. */
export interface RichAudit {
	readonly exportable: ExportableAudit;
	readonly instrument: PlayspaceInstrument;
}

/** Resolves an audit id (and optionally a second session id) into rich payloads. */
export interface RichAuditSource {
	/** Fetch one audit's rich export payload. */
	fetchAudit(auditId: string): Promise<RichAudit>;
	/** Resolve the instrument for an already-fetched session. */
	resolveInstrument(session: AuditSession): Promise<PlayspaceInstrument>;
	/** Fetch a raw session (used when merging combined reports). */
	fetchSession(auditId: string): Promise<AuditSession>;
}

/** Wraps an audit session in the `ExportableAudit` shape the generators expect. */
export function toExportableAudit(session: AuditSession): ExportableAudit {
	return {
		auditSession: session,
		context: {
			projectName: session.project_name,
			city: null,
			province: null,
			country: null
		},
		auditorProfile: {
			auditorCode: session.auditor_code,
			ageRange: null,
			gender: null,
			country: null,
			role: null
		}
	};
}

/** Creates the default source backed by the existing scope-enforced endpoints. */
export function createRichAuditSource(): RichAuditSource {
	const instrumentCache = new Map<string, Promise<PlayspaceInstrument>>();
	const sessionCache = new Map<string, Promise<AuditSession>>();

	function fetchSession(auditId: string): Promise<AuditSession> {
		let pending = sessionCache.get(auditId);
		if (pending === undefined) {
			pending = playspaceApi.auditor.getAudit(auditId);
			sessionCache.set(auditId, pending);
		}
		return pending;
	}

	function resolveInstrument(session: AuditSession): Promise<PlayspaceInstrument> {
		if (session.instrument !== undefined && session.instrument !== null) {
			return Promise.resolve(session.instrument);
		}
		const key = session.instrument_key;
		let pending = instrumentCache.get(key);
		if (pending === undefined) {
			pending = playspaceApi.auditor.fetchInstrument(key);
			instrumentCache.set(key, pending);
		}
		return pending;
	}

	return {
		fetchSession,
		resolveInstrument,
		async fetchAudit(auditId: string): Promise<RichAudit> {
			const session = await fetchSession(auditId);
			const instrument = await resolveInstrument(session);
			return { exportable: toExportableAudit(session), instrument };
		}
	};
}
