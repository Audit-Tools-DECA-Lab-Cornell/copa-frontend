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
import { Skeleton } from "@/components/ui/skeleton";
import {
	acceptManagerInvite,
	type AuthResponse,
	getManagerInvitePreview,
	type ManagerInvitePreview
} from "@/lib/auth/auth-api";
import { setBrowserAuthSession } from "@/lib/auth/browser-session";
import { mapAccountTypeToRole } from "@/lib/auth/role";

export interface AcceptInviteFormProps {
	token: string;
}

type FormFieldKey = "name" | "position" | "password" | "confirmPassword";

/**
 * Apply a successful auth response to the browser cookie session and return
 * the redirect path. Returns null if the role cannot be resolved.
 */
function applyAuthResponse(authResponse: AuthResponse): string | null {
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

	return "/onboarding/manager";
}

/**
 * Invite acceptance page for secondary managers.
 *
 * Renders a focused single-card form with name + password (confirmed).
 * On success it stores the session and redirects to the manager dashboard.
 * On a backend rejection (expired, already accepted) it shows a clear
 * dead-end state with a link to the login page.
 */
/**
 * Compact workspace context panel shown above the form once the invite preview loads.
 */
function WorkspaceContextPanel({
	preview,
	t
}: Readonly<{
	preview: ManagerInvitePreview | null;
	t: (key: string) => string;
}>) {
	if (!preview) return null;

	const hasOrg = preview.organization !== null && preview.organization.trim().length > 0;
	const hasInviter = preview.invited_by_name !== null && preview.invited_by_name.trim().length > 0;
	if (!hasOrg && !hasInviter) return null;

	return (
		<div className="mb-5 rounded-md border border-edge/40 bg-secondary/50 px-4 py-3">
			<p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{t("workspaceContext.label")}
			</p>
			<dl className="space-y-1">
				{hasOrg ? (
					<div className="flex items-baseline gap-2">
						<dt className="w-24 shrink-0 text-xs text-muted-foreground">
							{t("workspaceContext.organisation")}
						</dt>
						<dd className="text-sm font-medium text-foreground">{preview.organization}</dd>
					</div>
				) : null}
				{hasInviter ? (
					<div className="flex items-baseline gap-2">
						<dt className="w-24 shrink-0 text-xs text-muted-foreground">
							{t("workspaceContext.invitedBy")}
						</dt>
						<dd className="text-sm font-medium text-foreground">{preview.invited_by_name}</dd>
					</div>
				) : null}
			</dl>
		</div>
	);
}

export function AcceptInviteForm({ token }: Readonly<AcceptInviteFormProps>) {
	const router = useRouter();
	const t = useTranslations("managerInvite");

	const [preview, setPreview] = React.useState<ManagerInvitePreview | null>(null);
	const [previewLoading, setPreviewLoading] = React.useState(true);

	const [name, setName] = React.useState("");
	const [position, setPosition] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [confirmPassword, setConfirmPassword] = React.useState("");
	const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<FormFieldKey, string>>>({});
	const [serverError, setServerError] = React.useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [isExpired, setIsExpired] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;

		async function fetchPreview() {
			try {
				const data = await getManagerInvitePreview(token);
				if (!cancelled) {
					setPreview(data);
					setPreviewLoading(false);
				}
			} catch (error) {
				if (cancelled) return;
				const message = error instanceof Error ? error.message.toLowerCase() : "";
				if (
					message.includes("expired") ||
					message.includes("already been accepted") ||
					message.includes("not found") ||
					message.includes("no longer valid")
				) {
					setIsExpired(true);
				}
				setPreviewLoading(false);
			}
		}

		void fetchPreview();
		return () => {
			cancelled = true;
		};
	}, [token]);

	const acceptSchema = React.useMemo(
		() =>
			z
				.object({
					name: z.string().min(1, t("errors.nameRequired")).max(200),
					position: z.string().max(200).optional(),
					password: z.string().min(8, t("errors.passwordMin")),
					confirmPassword: z.string()
				})
				.refine(data => data.password === data.confirmPassword, {
					message: t("errors.passwordMismatch"),
					path: ["confirmPassword"]
				}),
		[t]
	);

	function clearFieldError(key: FormFieldKey) {
		setFieldErrors(current => ({ ...current, [key]: undefined }));
		setServerError(null);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setServerError(null);

		const parsed = acceptSchema.safeParse({
			name,
			position: position.trim() || undefined,
			password,
			confirmPassword
		});
		if (!parsed.success) {
			const nextErrors: Partial<Record<FormFieldKey, string>> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as FormFieldKey | undefined;
				if (key && !nextErrors[key]) {
					nextErrors[key] = issue.message;
				}
			}
			setFieldErrors(nextErrors);
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			const authResponse = await acceptManagerInvite(token, {
				name: parsed.data.name,
				password: parsed.data.password,
				position: parsed.data.position
			});

			const redirectPath = applyAuthResponse(authResponse);
			if (!redirectPath) {
				setServerError(t("errors.unknownRole"));
				setIsSubmitting(false);
				return;
			}

			router.push(redirectPath);
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			const lowerMessage = message.toLowerCase();
			if (
				lowerMessage.includes("expired") ||
				lowerMessage.includes("already been accepted") ||
				lowerMessage.includes("not found")
			) {
				setIsExpired(true);
			} else {
				setServerError(message.trim().length > 0 ? message : t("errors.unexpected"));
			}
			setIsSubmitting(false);
		}
	}

	if (isExpired) {
		return (
			<div className="min-h-dvh bg-background">
				<div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
					<Card className="w-full">
						<CardHeader className="text-center">
							<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="size-6 text-destructive"
									aria-hidden="true">
									<circle cx="12" cy="12" r="10" />
									<path d="m15 9-6 6" />
									<path d="m9 9 6 6" />
								</svg>
							</div>
							<CardTitle>{t("expired.title")}</CardTitle>
							<CardDescription className="text-balance">{t("expired.description")}</CardDescription>
						</CardHeader>
						<CardContent className="flex justify-center">
							<Button asChild variant="outline">
								<Link href="/login">{t("expired.loginLink")}</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-dvh bg-background">
			<div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
				<Card className="w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="size-6 text-primary"
								aria-hidden="true">
								<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<line x1="19" x2="19" y1="8" y2="14" />
								<line x1="22" x2="16" y1="11" y2="11" />
							</svg>
						</div>
						<CardTitle className="text-xl">{t("title")}</CardTitle>
						<CardDescription className="text-balance">{t("subtitle")}</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="mb-5 text-center text-sm text-muted-foreground">{t("description")}</p>

						{previewLoading ? (
							<div className="mb-5 space-y-2 rounded-md border border-edge/40 bg-secondary/50 px-4 py-3">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-4 w-32" />
							</div>
						) : (
							<WorkspaceContextPanel preview={preview} t={t} />
						)}

						<form className="grid gap-4" onSubmit={handleSubmit} noValidate>
							{serverError ? (
								<div
									role="alert"
									className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{serverError}
								</div>
							) : null}

							<div className="grid gap-2">
								<Label htmlFor="accept_name">
									{t("fields.name")}{" "}
									<span className="text-destructive" aria-hidden="true">
										*
									</span>
								</Label>
								<Input
									id="accept_name"
									autoComplete="name"
									placeholder={t("namePlaceholder")}
									value={name}
									onChange={e => {
										setName(e.target.value);
										clearFieldError("name");
									}}
									aria-required="true"
									aria-invalid={fieldErrors.name !== undefined}
									disabled={isSubmitting}
									autoFocus
								/>
								{fieldErrors.name ? (
									<p className="text-sm text-destructive" role="alert">
										{fieldErrors.name}
									</p>
								) : null}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="accept_position">{t("fields.position")}</Label>
								<Input
									id="accept_position"
									autoComplete="organization-title"
									placeholder={t("positionPlaceholder")}
									value={position}
									onChange={e => {
										setPosition(e.target.value);
										clearFieldError("position");
									}}
									aria-invalid={fieldErrors.position !== undefined}
									disabled={isSubmitting}
								/>
								<p className="text-xs text-muted-foreground">{t("positionHelp")}</p>
								{fieldErrors.position ? (
									<p className="text-sm text-destructive" role="alert">
										{fieldErrors.position}
									</p>
								) : null}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="accept_password">
									{t("fields.password")}{" "}
									<span className="text-destructive" aria-hidden="true">
										*
									</span>
								</Label>
								<Input
									id="accept_password"
									type="password"
									autoComplete="new-password"
									value={password}
									onChange={e => {
										setPassword(e.target.value);
										clearFieldError("password");
									}}
									aria-required="true"
									aria-invalid={fieldErrors.password !== undefined}
									disabled={isSubmitting}
								/>
								<p className="text-xs text-muted-foreground">{t("passwordHelp")}</p>
								{fieldErrors.password ? (
									<p className="text-sm text-destructive" role="alert">
										{fieldErrors.password}
									</p>
								) : null}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="accept_confirm_password">
									{t("fields.confirmPassword")}{" "}
									<span className="text-destructive" aria-hidden="true">
										*
									</span>
								</Label>
								<Input
									id="accept_confirm_password"
									type="password"
									autoComplete="new-password"
									value={confirmPassword}
									onChange={e => {
										setConfirmPassword(e.target.value);
										clearFieldError("confirmPassword");
									}}
									aria-required="true"
									aria-invalid={fieldErrors.confirmPassword !== undefined}
									disabled={isSubmitting}
								/>
								{fieldErrors.confirmPassword ? (
									<p className="text-sm text-destructive" role="alert">
										{fieldErrors.confirmPassword}
									</p>
								) : null}
							</div>

							<Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="mt-1">
								{isSubmitting ? (
									<>
										<span
											aria-hidden="true"
											className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
										/>
										<span>{t("actions.accepting")}</span>
									</>
								) : (
									t("actions.accept")
								)}
							</Button>
						</form>

						<div className="mt-5 text-center text-sm text-muted-foreground">
							{t("alreadySignedIn")}{" "}
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
