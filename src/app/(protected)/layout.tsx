import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/app/app-shell";
import { AuthSessionProvider } from "@/components/app/auth-session-provider";
import { ExportJobsProvider } from "@/components/dashboard/export-jobs-provider";
import { ProtectedShellSkeleton } from "@/components/dashboard/page-skeletons";
import { getServerAuthSession } from "@/lib/auth/server-session";

/**
 * Resolves the auth session from request cookies, sends unauthenticated or
 * onboarding-incomplete users to the right destination, and mounts the
 * authenticated app shell around the routed page.
 *
 * Reading cookies makes this dynamic. A layout renders outside its segment's
 * `loading.tsx` boundary, so the session read is isolated here and wrapped in
 * `<Suspense>` by the layout below; the shell skeleton paints while it resolves.
 */
async function AuthGate({ children }: Readonly<{ children: React.ReactNode }>) {
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

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<Suspense fallback={<ProtectedShellSkeleton />}>
			<AuthGate>{children}</AuthGate>
		</Suspense>
	);
}
