import { getServerManagerDashboardData } from "@/lib/api/server-playspace-dashboard";
import { getServerAuthSession } from "@/lib/auth/server-session";

import { ManagerDashboardClient } from "./dashboard-client";

export default async function ManagerDashboardPage() {
	const session = await getServerAuthSession();
	if (session?.role !== "manager" || !session?.accountId) {
		return <ManagerDashboardClient errorMessage="Manager account context is unavailable." />;
	}

	let dashboardData: Awaited<ReturnType<typeof getServerManagerDashboardData>> | null = null;
	let errorMessage: string | null = null;
	try {
		dashboardData = await getServerManagerDashboardData(session.accountId);
	} catch (error) {
		errorMessage = error instanceof Error ? error.message : "Unable to load manager dashboard.";
	}

	return <ManagerDashboardClient {...(dashboardData ?? {})} errorMessage={errorMessage} />;
}
