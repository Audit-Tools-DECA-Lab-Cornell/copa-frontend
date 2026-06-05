import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { AuthSessionProvider } from "@/components/app/auth-session-provider";
import { ExportJobsProvider } from "@/components/dashboard/export-jobs-provider";
import { getServerAuthSession } from "@/lib/auth/server-session";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const session = await getServerAuthSession();
	if (!session) redirect("/login");

	if (session.nextStep === "COMPLETE_PROFILE") {
		const onboardingPath = session.role === "auditor" ? "/onboarding/auditor" : "/onboarding/manager";
		redirect(onboardingPath);
	}

	return (
		<AuthSessionProvider initialSession={session}>
			<AppShell
				role={session.role}
				auditorCode={session.auditorCode}
				userName={session.userName}
				userEmail={session.userEmail}>
				<ExportJobsProvider>{children}</ExportJobsProvider>
			</AppShell>
		</AuthSessionProvider>
	);
}
