import { redirect } from "next/navigation";

import { LandingPage } from "@/components/marketing/landing-page";
import { getServerAuthSession } from "@/lib/auth/server-session";

export default async function HomePage() {
	const session = await getServerAuthSession();

	if (session) {
		if (session.role === "admin") {
			redirect("/admin/dashboard");
		}
		if (session.role === "manager") {
			redirect("/manager/dashboard");
		}
		redirect(session.nextStep === "DASHBOARD" ? "/auditor/dashboard" : "/auditor/onboarding");
	}

	return <LandingPage />;
}
