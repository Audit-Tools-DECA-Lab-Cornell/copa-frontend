import type { CaptureTarget } from "./types";

/**
 * Public, unauthenticated entry pages. Captured without a seeded session.
 */
export const authTargets: readonly CaptureTarget[] = [
	{
		role: "manager",
		unauthenticated: true,
		route: () => "/login",
		segments: ["auth", "login"],
		states: [{ name: "overview", label: "Login" }]
	},
	{
		role: "manager",
		unauthenticated: true,
		route: () => "/signup",
		segments: ["auth", "signup"],
		states: [{ name: "overview", label: "Sign up" }]
	}
];
