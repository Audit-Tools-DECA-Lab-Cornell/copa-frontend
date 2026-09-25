import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerAudit, getServerInstrument } from "@/lib/api/playspace-server";
import { type AuditSession } from "@/lib/api/playspace-types";
import { activeReportInstrumentQueryKey } from "@/lib/audit/report-instrument-key";
import { getQueryClient } from "@/lib/query/server-query-client";

import { AdminReportDetailClient } from "./report-detail-client";

interface AdminReportDetailPageProps {
	params: Promise<{ auditId: string }>;
}

export default async function AdminReportDetailPage({ params }: Readonly<AdminReportDetailPageProps>) {
	const { auditId } = await params;
	const queryClient = getQueryClient();

	const auditKey = ["playspace", "audit", auditId] as const;
	await queryClient
		.prefetchQuery({
			queryKey: auditKey,
			queryFn: () => getServerAudit(auditId)
		})
		.catch(() => undefined);

	const audit = queryClient.getQueryData<AuditSession>(auditKey);
	if (audit && (audit.instrument === null || audit.instrument === undefined)) {
		await queryClient
			.prefetchQuery({
				queryKey: activeReportInstrumentQueryKey(audit.instrument_key),
				queryFn: () => getServerInstrument(audit.instrument_key)
			})
			.catch(() => undefined);
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<AdminReportDetailClient auditId={auditId} />
		</HydrationBoundary>
	);
}
