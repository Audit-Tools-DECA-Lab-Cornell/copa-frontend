"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { AuthResponse } from "@/lib/auth/auth-api";
import { loginWithCredentials } from "@/lib/auth/auth-api";
import { setBrowserAuthSession } from "@/lib/auth/browser-session";
import { mapAccountTypeToRole, type UserRole } from "@/lib/auth/role";

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(8)
});

type LoginValues = z.infer<typeof loginSchema>;

type FormSubmitHandler = NonNullable<React.ComponentProps<"form">["onSubmit"]>;

function isSafeInternalPath(value: string): boolean {
	return value.startsWith("/") && !value.startsWith("//");
}

function getDefaultDashboard(role: UserRole): string {
	if (role === "admin") return "/admin/dashboard";
	return role === "manager" ? "/manager/dashboard" : "/auditor/dashboard";
}

function getOnboardingPath(role: UserRole, nextStep: AuthResponse["user"]["next_step"]): string | null {
	if (nextStep !== "COMPLETE_PROFILE") return null;
	return role === "auditor" ? "/onboarding/auditor" : "/onboarding/manager";
}

function isAllowedNextPath(role: UserRole, nextPath: string): boolean {
	if (!isSafeInternalPath(nextPath)) return false;
	if (nextPath.startsWith("/settings")) return true;
	if (role === "admin") return nextPath.startsWith("/admin");
	if (role === "manager") return nextPath.startsWith("/manager");
	return nextPath.startsWith("/auditor");
}

function getRedirectAfterLogin(role: UserRole, authResponse: AuthResponse, nextParam: string | null): string {
	const onboardingPath = getOnboardingPath(role, authResponse.user.next_step);
	if (onboardingPath) return onboardingPath;

	if (nextParam && isAllowedNextPath(role, nextParam)) return nextParam;
	return getDefaultDashboard(role);
}

function applyAuthResponse(authResponse: AuthResponse): UserRole | null {
	const role = mapAccountTypeToRole(authResponse.user.account_type);
	if (!role) return null;

	setBrowserAuthSession({
		role,
		accessToken: authResponse.access_token,
		accountId: authResponse.user.account_id,
		userName: authResponse.user.name,
		userEmail: authResponse.user.email,
		nextStep: authResponse.user.next_step
	});

	return role;
}

export interface LoginFormProps {
	nextParam: string | null;
}

interface PendingButtonLabelProps {
	label: string;
}

function PendingButtonLabel({ label }: Readonly<PendingButtonLabelProps>) {
	return (
		<>
			<span
				aria-hidden="true"
				className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
			/>
			<span>{label}</span>
		</>
	);
}

interface RoleLoginCardProps {
	roleKey: string;
	title: string;
	description: string;
	emailPlaceholder: string;
	demoHint: React.ReactNode;
	demoEmail: string;
	demoPassword: string;
	nextParam: string | null;
	disabled: boolean;
	onLoginStart: () => void;
	onLoginEnd: () => void;
}

function RoleLoginCard({
	roleKey,
	title,
	description,
	emailPlaceholder,
	demoHint,
	demoEmail,
	demoPassword,
	nextParam,
	disabled,
	onLoginStart,
	onLoginEnd
}: Readonly<RoleLoginCardProps>) {
	const router = useRouter();
	const t = useTranslations("login");
	const [values, setValues] = React.useState<LoginValues>({ email: "", password: "" });
	const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof LoginValues, string>>>({});
	const [serverError, setServerError] = React.useState<string | null>(null);
	const [showPasswordHint, setShowPasswordHint] = React.useState(false);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const handleSubmit: FormSubmitHandler = async event => {
		event.preventDefault();
		setServerError(null);

		const parsed = loginSchema.safeParse(values);
		if (!parsed.success) {
			const nextErrors: Partial<Record<keyof LoginValues, string>> = {};
			const emailIssue = parsed.error.issues.find(issue => issue.path[0] === "email");
			const passwordIssue = parsed.error.issues.find(issue => issue.path[0] === "password");
			if (emailIssue?.message) nextErrors.email = emailIssue.message;
			if (passwordIssue?.message) nextErrors.password = passwordIssue.message;
			setFieldErrors(nextErrors);
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);
		onLoginStart();

		try {
			const authResponse = await loginWithCredentials(parsed.data.email, parsed.data.password);
			const role = applyAuthResponse(authResponse);

			if (!role) {
				setServerError(t("errors.unknownRole"));
				setIsSubmitting(false);
				onLoginEnd();
				return;
			}

			const redirectPath = getRedirectAfterLogin(role, authResponse, nextParam ?? null);
			router.push(redirectPath);
		} catch (error) {
			setServerError(error instanceof Error ? error.message : t("errors.unexpected"));
			setShowPasswordHint(true);
			setIsSubmitting(false);
			onLoginEnd();
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="grid gap-4" onSubmit={handleSubmit}>
					{serverError ? (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{serverError}
							<br />
							<span className="text-xs text-muted-foreground">
								<span className="text-primary">Use Email:</span>{" "}
								<span className="font-mono">{demoEmail}</span> and{" "}
								<span className="text-primary">Password:</span>{" "}
								<span className="font-mono">{demoPassword}</span> to login.
							</span>
						</div>
					) : null}

					<div className="grid gap-2">
						<Label htmlFor={`${roleKey}_email`}>{t("fields.email")}</Label>
						<Input
							id={`${roleKey}_email`}
							data-testid={`${roleKey}-email-input`}
							type="email"
							autoComplete="email"
							placeholder={emailPlaceholder}
							value={values.email}
							onChange={event => {
								const nextEmail = event.target.value;
								setValues(current => ({ ...current, email: nextEmail }));
								setFieldErrors(current => ({ ...current, email: undefined }));
								setServerError(null);
							}}
						/>
						{fieldErrors.email ? <p className="text-sm text-destructive">{fieldErrors.email}</p> : null}
					</div>

					<div className="grid gap-2">
						<Label htmlFor={`${roleKey}_password`}>{t("fields.password")}</Label>
						<Input
							id={`${roleKey}_password`}
							data-testid={`${roleKey}-password-input`}
							type="password"
							autoComplete="current-password"
							value={values.password}
							onChange={event => {
								const nextPassword = event.target.value;
								setValues(current => ({ ...current, password: nextPassword }));
								setFieldErrors(current => ({ ...current, password: undefined }));
								setServerError(null);
							}}
						/>
						{fieldErrors.password ? (
							<p className="text-sm text-destructive">{fieldErrors.password}</p>
						) : null}
					</div>

					<Button
						type="submit"
						disabled={disabled || isSubmitting}
						aria-busy={isSubmitting}
						data-testid={`${roleKey}-submit-button`}>
						{isSubmitting ? <PendingButtonLabel label={t("actions.signingIn")} /> : t("actions.signIn")}
					</Button>
				</form>

				<Separator className="my-6" />

				<div className="space-y-1">
					{demoHint}
					{showPasswordHint ? (
						<p className="text-xs font-medium text-amber-600 dark:text-amber-400">
							{t("demoPasswordHint")} <span className="font-mono">{demoPassword}</span>
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}

export function LoginForm({ nextParam }: Readonly<LoginFormProps>) {
	const t = useTranslations("login");
	const [activeCard, setActiveCard] = React.useState<string | null>(null);

	return (
		<div className="min-h-dvh bg-background">
			<div className="mx-auto flex min-h-dvh w-full max-w-5xl items-center px-4 py-10">
				<div className="w-full space-y-6">
					<div className="grid w-full gap-6 lg:grid-cols-3">
						<RoleLoginCard
							roleKey="admin"
							title={t("admin.title")}
							description={t("admin.description")}
							emailPlaceholder={t("admin.emailPlaceholder")}
							demoEmail="playspace.admin@example.org"
							demoPassword="DemoPass123!"
							demoHint={
								<p className="text-xs text-muted-foreground">
									<span className="font-medium text-amber-600 dark:text-amber-400">
										{t("admin.demoLabel")}
									</span>{" "}
									<span className="font-mono">playspace.admin@example.org</span>
								</p>
							}
							nextParam={nextParam}
							disabled={activeCard !== null && activeCard !== "admin"}
							onLoginStart={() => setActiveCard("admin")}
							onLoginEnd={() => setActiveCard(null)}
						/>

						<RoleLoginCard
							roleKey="manager"
							title={t("manager.title")}
							description={t("manager.description")}
							emailPlaceholder={t("manager.emailPlaceholder")}
							demoEmail="manager@example.org"
							demoPassword="DemoPass123!"
							demoHint={
								<p className="text-xs text-muted-foreground">
									<span className="font-medium text-amber-600 dark:text-amber-400">
										{t("manager.demoLabel")}
									</span>{" "}
									<span className="font-mono">manager@example.org</span> {t("manager.demoOr")}{" "}
									<span className="font-mono">canterbury.manager@example.org</span>
								</p>
							}
							nextParam={nextParam}
							disabled={activeCard !== null && activeCard !== "manager"}
							onLoginStart={() => setActiveCard("manager")}
							onLoginEnd={() => setActiveCard(null)}
						/>

						<RoleLoginCard
							roleKey="auditor"
							title={t("auditor.title")}
							description={t("auditor.description")}
							emailPlaceholder={t("auditor.emailPlaceholder")}
							demoEmail="talia.cooper@example.org"
							demoPassword="DemoPass123!"
							demoHint={
								<p className="text-xs text-muted-foreground">
									<span className="font-medium text-amber-600 dark:text-amber-400">
										{t("auditor.demoLabel")}
									</span>{" "}
									<span className="font-mono">talia.cooper@example.org</span>
								</p>
							}
							nextParam={nextParam}
							disabled={activeCard !== null && activeCard !== "auditor"}
							onLoginStart={() => setActiveCard("auditor")}
							onLoginEnd={() => setActiveCard(null)}
						/>
					</div>

					<div className="text-center text-sm text-muted-foreground">
						{t("noAccount")}{" "}
						<Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
							{t("signUpLink")}
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
