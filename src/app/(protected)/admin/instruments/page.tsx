import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { getServerAdminInstruments } from "@/lib/api/playspace-server";
import { getQueryClient } from "@/lib/query/server-query-client";

import { InstrumentsAdminClient } from "@/components/dashboard/instruments/instruments-admin-client";
import { INSTRUMENTS_LIST_QUERY_KEY } from "@/components/dashboard/instruments/constants";

export default async function AdminInstrumentsPage() {
	const queryClient = getQueryClient();

	await queryClient
		.prefetchQuery({
			queryKey: INSTRUMENTS_LIST_QUERY_KEY,
			queryFn: () => getServerAdminInstruments()
		})
		.catch(() => undefined);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<InstrumentsAdminClient />
		</HydrationBoundary>
	);
}
