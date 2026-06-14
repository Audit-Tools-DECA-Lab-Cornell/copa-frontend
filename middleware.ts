import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAMES, parseUserRole } from "./src/lib/auth/role";

function redirectToLogin(request: NextRequest) {
	const loginUrl = request.nextUrl.clone();
	loginUrl.pathname = "/login";

	const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
	loginUrl.searchParams.set("next", nextPath);

	return NextResponse.redirect(loginUrl);
}

function parseNextStep(value: string | undefined): string {
	if (
		value === "VERIFY_EMAIL" ||
		value === "WAITING_APPROVAL" ||
		value === "COMPLETE_PROFILE" ||
		value === "DASHBOARD"
	) {
		return value;
	}

	return "DASHBOARD";
}

function getAuthState(request: NextRequest) {
	const role = parseUserRole(request.cookies.get(AUTH_COOKIE_NAMES.role)?.value);
	const accessToken = request.cookies.get(AUTH_COOKIE_NAMES.accessToken)?.value ?? null;
	const nextStep = parseNextStep(request.cookies.get(AUTH_COOKIE_NAMES.nextStep)?.value);

	return {
		role,
		isAuthenticated: Boolean(role && accessToken),
		nextStep
	};
}

function dashboardPathFor(auth: ReturnType<typeof getAuthState>): string {
	if (auth.role === "admin") return "/admin/dashboard";
	if (auth.role === "manager") return "/manager/dashboard";
	return auth.nextStep === "DASHBOARD" ? "/auditor/dashboard" : "/auditor/onboarding";
}

export function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const auth = getAuthState(request);

	// The homepage is a statically rendered, rotating landing page. Authenticated
	// users are redirected to their dashboard here, so the page itself never reads
	// the session and can stay static.
	if (pathname === "/") {
		if (auth.isAuthenticated && auth.role) {
			return NextResponse.redirect(new URL(dashboardPathFor(auth), request.url));
		}
		return NextResponse.next();
	}

	if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
		if (!auth.isAuthenticated || !auth.role) return NextResponse.next();
		const dashboardPath =
			auth.role === "admin"
				? "/admin/dashboard"
				: auth.role === "manager"
					? "/manager/dashboard"
					: auth.nextStep === "DASHBOARD"
						? "/auditor/dashboard"
						: "/auditor/onboarding";
		return NextResponse.redirect(new URL(dashboardPath, request.url));
	}

	if (pathname.startsWith("/admin")) {
		if (!auth.isAuthenticated) return redirectToLogin(request);
		if (auth.role !== "admin") {
			const fallbackPath = auth.role === "manager" ? "/manager/dashboard" : "/auditor/dashboard";
			return NextResponse.redirect(new URL(fallbackPath, request.url));
		}
		return NextResponse.next();
	}

	if (pathname.startsWith("/manager")) {
		if (!auth.isAuthenticated) return redirectToLogin(request);
		if (auth.role !== "manager") {
			const fallbackPath = auth.role === "admin" ? "/admin/dashboard" : "/auditor/dashboard";
			return NextResponse.redirect(new URL(fallbackPath, request.url));
		}
		return NextResponse.next();
	}

	if (pathname.startsWith("/auditor")) {
		if (!auth.isAuthenticated) return redirectToLogin(request);
		if (auth.role !== "auditor") {
			const fallbackPath = auth.role === "admin" ? "/admin/dashboard" : "/manager/dashboard";
			return NextResponse.redirect(new URL(fallbackPath, request.url));
		}

		const isOnboardingPath = pathname.startsWith("/auditor/onboarding");
		if (auth.nextStep !== "DASHBOARD" && !isOnboardingPath) {
			return NextResponse.redirect(new URL("/auditor/onboarding", request.url));
		}
		if (auth.nextStep === "DASHBOARD" && isOnboardingPath) {
			return NextResponse.redirect(new URL("/auditor/dashboard", request.url));
		}

		return NextResponse.next();
	}

	if (pathname.startsWith("/settings")) {
		if (!auth.isAuthenticated) return redirectToLogin(request);
		if (auth.role === "auditor" && auth.nextStep !== "DASHBOARD") {
			return NextResponse.redirect(new URL("/auditor/onboarding", request.url));
		}
		return NextResponse.next();
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/login", "/signup", "/admin/:path*", "/manager/:path*", "/auditor/:path*", "/settings/:path*"]
};
