"use client";

import { useQuery } from "@tanstack/react-query";

import { playspaceApi } from "@/lib/api/playspace";
import type { AuditSession, PlayspaceInstrument } from "@/lib/api/playspace-types";
import { activeReportInstrumentQueryKey } from "@/lib/audit/report-instrument-key";

export interface ReportInstrumentState {
	readonly instrument: PlayspaceInstrument | undefined;
	readonly isLoading: boolean;
}

/**
 * The instrument a submission's report is read with: the exact version it was answered under.
 *
 * Answers only make sense against their own version — Sociability is single-choice up to
 * 5.31 and multi-choice from 5.32, so reading an older submission with a newer instrument
 * misreads or rejects its answers. The backend embeds the submission's version in every
 * audit session, so that embedded instrument is used as-is. The active instrument is fetched
 * only when a session arrives without one.
 */
export function useReportInstrument(session: AuditSession | undefined): ReportInstrumentState {
	const embeddedInstrument = session?.instrument;
	const instrumentKey = session?.instrument_key;
	const activeInstrumentQuery = useQuery({
		queryKey: activeReportInstrumentQueryKey(instrumentKey),
		queryFn: () => {
			if (typeof instrumentKey !== "string") {
				throw new Error("No instrument key available");
			}
			return playspaceApi.auditor.fetchInstrument(instrumentKey);
		},
		enabled: session !== undefined && embeddedInstrument === undefined
	});

	return {
		instrument: embeddedInstrument ?? activeInstrumentQuery.data,
		isLoading: embeddedInstrument === undefined && activeInstrumentQuery.isLoading
	};
}
