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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuthResponse } from "@/lib/auth/auth-api";
import { signupWithCredentials } from "@/lib/auth/auth-api";
import { setBrowserAuthSession } from "@/lib/auth/browser-session";
import { mapAccountTypeToRole } from "@/lib/auth/role";

const signupSchema = z.object({
	name: z.string().min(1, "Name is required.").max(200),
	email: z.email(),
	password: z.string().min(8, "Password must be at least 8 characters."),
	accountType: z.enum(["MANAGER", "AUDITOR"])
});

type SignupValues = z.infer<typeof signupSchema>;
type SignupFieldKey = keyof SignupValues;

function applyAuthResponse(authResponse: AuthResponse) {
	const role = mapAccountTypeToRole(authResponse.user.account_type);
	if (!role) return null;

	setBrowserAuthSession({
		role,
		accessToken: authResponse.access_token,
		accountId: authResponse.user.account_id,
		userName: authResponse.user.name,
		userEmail: authResponse.user.email
	});

	return { role, dashboardPath: authResponse.user.dashboard_path };
}

export function SignupForm() {
	const router = useRouter();
	const t = useTranslations("signup");
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [values, setValues] = React.useState<SignupValues>({
		name: "",
		email: "",
		password: "",
		accountType: "MANAGER"
	});
	const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<SignupFieldKey, string>>>({});
	const [serverError, setServerError] = React.useState<string | null>(null);

	const handleSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]> = async event => {
		event.preventDefault();
		setServerError(null);

		const parsed = signupSchema.safeParse(values);
		if (!parsed.success) {
			const nextErrors: Partial<Record<SignupFieldKey, string>> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as SignupFieldKey | undefined;
				if (key && !nextErrors[key]) nextErrors[key] = issue.message;
			}
			setFieldErrors(nextErrors);
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			const authResponse = await signupWithCredentials({
				name: parsed.data.name,
				email: parsed.data.email,
				password: parsed.data.password,
				account_type: parsed.data.accountType
			});

			const result = applyAuthResponse(authResponse);
			if (!result) {
				setServerError(t("errors.unknownRole"));
				setIsSubmitting(false);
				return;
			}

			const redirect = result.dashboardPath.startsWith("/") ? result.dashboardPath : `/${result.role}/dashboard`;
			router.push(redirect);
		} catch (error) {
			setServerError(error instanceof Error ? error.message : t("errors.unexpected"));
			setIsSubmitting(false);
		}
	};

	function clearFieldError(key: SignupFieldKey) {
		setFieldErrors(current => ({ ...current, [key]: undefined }));
		setServerError(null);
	}

	return (
		<div className="min-h-dvh bg-background">
			<div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
				<Card className="w-full">
					<CardHeader className="text-center">
						<CardTitle>{t("title")}</CardTitle>
						<CardDescription>{t("description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="grid gap-4" onSubmit={handleSubmit}>
							{serverError ? (
								<div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{serverError}
								</div>
							) : null}

							<div className="grid gap-2">
								<Label htmlFor="signup_name">{t("fields.name")}</Label>
								<Input
									id="signup_name"
									autoComplete="name"
									placeholder={t("namePlaceholder")}
									value={values.name}
									onChange={e => {
										setValues(c => ({ ...c, name: e.target.value }));
										clearFieldError("name");
									}}
								/>
								{fieldErrors.name ? (
									<p className="text-sm text-destructive">{fieldErrors.name}</p>
								) : null}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="signup_email">{t("fields.email")}</Label>
								<Input
									id="signup_email"
									type="email"
									autoComplete="email"
									placeholder={t("emailPlaceholder")}
									value={values.email}
									onChange={e => {
										setValues(c => ({ ...c, email: e.target.value }));
										clearFieldError("email");
									}}
								/>
								{fieldErrors.email ? (
									<p className="text-sm text-destructive">{fieldErrors.email}</p>
								) : null}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="signup_password">{t("fields.password")}</Label>
								<Input
									id="signup_password"
									type="password"
									autoComplete="new-password"
									value={values.password}
									onChange={e => {
										setValues(c => ({ ...c, password: e.target.value }));
										clearFieldError("password");
									}}
								/>
								{fieldErrors.password ? (
									<p className="text-sm text-destructive">{fieldErrors.password}</p>
								) : null}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="signup_account_type">{t("fields.accountType")}</Label>
								<Select
									value={values.accountType}
									onValueChange={(value: "MANAGER" | "AUDITOR") => {
										setValues(c => ({ ...c, accountType: value }));
										clearFieldError("accountType");
									}}>
									<SelectTrigger id="signup_account_type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="MANAGER">{t("accountTypes.manager")}</SelectItem>
										<SelectItem value="AUDITOR">{t("accountTypes.auditor")}</SelectItem>
									</SelectContent>
								</Select>
								{fieldErrors.accountType ? (
									<p className="text-sm text-destructive">{fieldErrors.accountType}</p>
								) : null}
							</div>

							<Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
								{isSubmitting ? (
									<>
										<span
											aria-hidden="true"
											className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
										/>
										<span>{t("actions.creatingAccount")}</span>
									</>
								) : (
									t("actions.createAccount")
								)}
							</Button>
						</form>

						<div className="mt-4 text-center text-sm text-muted-foreground">
							{t("hasAccount")}{" "}
							<Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
								{t("signInLink")}
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
