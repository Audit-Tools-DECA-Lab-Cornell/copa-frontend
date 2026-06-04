import Image from "next/image";
import { redirect } from "next/navigation";
import * as React from "react";

import { getServerAuthSession } from "@/lib/auth/server-session";

/**
 * Layout for the dedicated onboarding flow.
 *
 * Guards:
 * - Not authenticated → redirect to /login
 * - Already onboarded (nextStep=DASHBOARD) → redirect to role dashboard
 *
 * Renders a minimal centered layout with no sidebar navigation so the
 * user stays focused on the linear onboarding steps.
 */
export default async function OnboardingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const session = await getServerAuthSession();

	if (!session) {
		redirect("/login");
	}

	if (session.nextStep === "DASHBOARD") {
		if (session.role === "admin") redirect("/admin/dashboard");
		if (session.role === "manager") redirect("/manager/dashboard");
		redirect("/auditor/dashboard");
	}

	return (
		<div className="min-h-dvh bg-background">
			<header className="border-b border-edge/50 bg-background/95 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
					<Image src="/icon.png" alt="COPA Tool" width={28} height={28} className="rounded-md" />
					<span className="text-sm font-semibold text-foreground">COPA Tool</span>
				</div>
			</header>
			<main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
		</div>
	);
}
