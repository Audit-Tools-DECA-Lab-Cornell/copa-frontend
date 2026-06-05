import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth/server-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "COPA | Comprehensive Outdoor Playspace Audit Tool",
	description:
		"COPA is a research-informed assessment framework for evaluating play value and usability in outdoor playspaces.",
	openGraph: {
		title: "COPA | Beyond accessible. Truly playable.",
		description: "Evaluate outdoor playspaces by what children can actually do, feel, and experience there.",
		type: "website"
	},
	twitter: {
		card: "summary_large_image",
		title: "COPA | Beyond accessible. Truly playable.",
		description: "A research-informed way to evaluate play value and usability in outdoor playspaces."
	}
};

export default async function HomePage() {
	const session = await getServerAuthSession();

	if (!session) {
		redirect("/login");
	}
	if (session.role === "admin") {
		redirect("/admin/dashboard");
	}
	if (session.role === "manager") {
		redirect("/manager/dashboard");
	}
	redirect(session.nextStep === "DASHBOARD" ? "/auditor/dashboard" : "/auditor/onboarding");
}
