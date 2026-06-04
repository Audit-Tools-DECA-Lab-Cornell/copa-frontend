"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ArrowRight, Check, KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { playspaceApi, type MyAuditorProfile } from "@/lib/api/playspace";
import { getBrowserAuthSession, setBrowserAuthSession } from "@/lib/auth/browser-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const PASSWORD_REQUIREMENTS = [
	{ key: "minLength", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
	{ key: "uppercase", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
	{ key: "lowercase", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
	{ key: "number", label: "One number", test: (value: string) => /\d/.test(value) }
] as const;

const AGE_RANGE_OPTIONS = ["under-18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
const GENDER_OPTIONS = ["male", "female", "non-binary", "prefer-not-to-say", "other"] as const;

type OnboardingStep = "password" | "profile" | "terms" | "code";

type ProfileDraft = {
	fullName: string;
	email: string;
	phone: string;
	gender: string;
	ageRange: string;
	city: string;
	province: string;
	country: string;
	role: string;
};

function getInitialProfileDraft(sessionName: string | null, sessionEmail: string | null): ProfileDraft {
	return {
		fullName: sessionName ?? "",
		email: sessionEmail ?? "",
		phone: "",
		gender: "",
		ageRange: "",
		city: "",
		province: "",
		country: "",
		role: ""
	};
}

function isValidOptionalEmail(value: string): boolean {
	const trimmed = value.trim();
	return trimmed.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function toOptional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function updateStoredAuditorSession(profile: MyAuditorProfile, nextStep: "COMPLETE_PROFILE" | "DASHBOARD") {
	const currentSession = getBrowserAuthSession();
	if (!currentSession) return;

	setBrowserAuthSession({
		...currentSession,
		auditorCode: profile.auditor_code,
		userName: profile.full_name,
		userEmail: profile.email,
		nextStep
	});
}

function RequirementList({ password }: Readonly<{ password: string }>) {
	return (
		<div className="flex flex-col gap-2 rounded-card border border-edge/40 bg-secondary/40 p-4">
			<p className="text-sm font-semibold text-foreground">Password requirements</p>
			<div className="grid gap-2 sm:grid-cols-2">
				{PASSWORD_REQUIREMENTS.map(requirement => {
					const met = requirement.test(password);
					return (
						<div key={requirement.key} className="flex items-center gap-2 text-sm">
							<Check
								className={met ? "size-4 text-primary" : "size-4 text-muted-foreground"}
								aria-hidden="true"
							/>
							<span className={met ? "text-foreground" : "text-muted-foreground"}>
								{requirement.label}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function StepHeader({ step, title, description }: Readonly<{ step: string; title: string; description: string }>) {
	return (
		<div className="flex flex-col gap-2">
			<Badge className="w-fit" variant="secondary">
				{step}
			</Badge>
			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
				<p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

function PasswordStep({ onComplete }: Readonly<{ onComplete: () => void }>) {
	const [currentPassword, setCurrentPassword] = React.useState("");
	const [newPassword, setNewPassword] = React.useState("");
	const [confirmPassword, setConfirmPassword] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const allRequirementsMet = PASSWORD_REQUIREMENTS.every(requirement => requirement.test(newPassword));
	const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
	const canSubmit = currentPassword.length > 0 && allRequirementsMet && passwordsMatch;

	const mutation = useMutation({
		mutationFn: () =>
			playspaceApi.auditor.changePassword({
				current_password: currentPassword,
				new_password: newPassword
			}),
		onSuccess: onComplete,
		onError: error => {
			setErrorMessage(error instanceof Error ? error.message : "We could not update your password.");
		}
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<KeyRound className="size-5 text-primary" aria-hidden="true" />
					Replace your temporary password
				</CardTitle>
				<CardDescription>Choose a personal password before entering the auditor dashboard.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="flex flex-col gap-4"
					onSubmit={event => {
						event.preventDefault();
						setErrorMessage(null);
						if (!canSubmit) return;
						mutation.mutate();
					}}>
					<RequirementList password={newPassword} />
					<div className="grid gap-4 md:grid-cols-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="current_password">Temporary password</Label>
							<Input
								id="current_password"
								type="password"
								autoComplete="current-password"
								value={currentPassword}
								onChange={event => setCurrentPassword(event.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="new_password">New password</Label>
							<Input
								id="new_password"
								type="password"
								autoComplete="new-password"
								value={newPassword}
								onChange={event => setNewPassword(event.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="confirm_password">Confirm password</Label>
							<Input
								id="confirm_password"
								type="password"
								autoComplete="new-password"
								value={confirmPassword}
								onChange={event => setConfirmPassword(event.target.value)}
							/>
						</div>
					</div>
					{confirmPassword.length > 0 && !passwordsMatch ? (
						<p className="text-sm text-destructive">Passwords do not match.</p>
					) : null}
					{errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
					<div className="flex justify-end">
						<Button
							type="submit"
							disabled={!canSubmit || mutation.isPending}
							aria-busy={mutation.isPending}>
							{mutation.isPending ? "Updating..." : "Continue"}
							<ArrowRight className="size-4" aria-hidden="true" />
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function ProfileStep({ initialDraft, onComplete }: Readonly<{ initialDraft: ProfileDraft; onComplete: () => void }>) {
	const [draft, setDraft] = React.useState<ProfileDraft>(initialDraft);
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const emailIsValid = isValidOptionalEmail(draft.email);
	const canSubmit = draft.fullName.trim().length > 0 && emailIsValid;

	const setField = (key: keyof ProfileDraft, value: string) => {
		setDraft(current => ({ ...current, [key]: value }));
		setErrorMessage(null);
	};

	const mutation = useMutation({
		mutationFn: () =>
			playspaceApi.auditor.updateMyProfile({
				full_name: draft.fullName.trim(),
				email: toOptional(draft.email),
				phone: toOptional(draft.phone),
				gender: toOptional(draft.gender),
				age_range: toOptional(draft.ageRange),
				city: toOptional(draft.city),
				province: toOptional(draft.province),
				country: toOptional(draft.country),
				role: toOptional(draft.role)
			}),
		onSuccess: profile => {
			updateStoredAuditorSession(profile, "COMPLETE_PROFILE");
			onComplete();
		},
		onError: error => {
			setErrorMessage(error instanceof Error ? error.message : "We could not save your profile.");
		}
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UserRound className="size-5 text-primary" aria-hidden="true" />
					Complete your auditor profile
				</CardTitle>
				<CardDescription>
					Your code stays anonymous in exports; these details support contact and accessibility needs.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="flex flex-col gap-4"
					onSubmit={event => {
						event.preventDefault();
						if (!canSubmit) return;
						mutation.mutate();
					}}>
					<div className="grid gap-4 md:grid-cols-2">
						<Field label="Full name" id="profile_full_name" required>
							<Input
								id="profile_full_name"
								value={draft.fullName}
								onChange={event => setField("fullName", event.target.value)}
							/>
						</Field>
						<Field label="Email" id="profile_email">
							<Input
								id="profile_email"
								type="email"
								value={draft.email}
								onChange={event => setField("email", event.target.value)}
							/>
						</Field>
						<Field label="Phone" id="profile_phone">
							<Input
								id="profile_phone"
								value={draft.phone}
								onChange={event => setField("phone", event.target.value)}
							/>
						</Field>
						<Field label="Role / profession" id="profile_role">
							<Input
								id="profile_role"
								value={draft.role}
								onChange={event => setField("role", event.target.value)}
							/>
						</Field>
						<Field label="Gender" id="profile_gender">
							<select
								id="profile_gender"
								value={draft.gender}
								onChange={event => setField("gender", event.target.value)}
								className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-field">
								<option value="">Prefer not to say yet</option>
								{GENDER_OPTIONS.map(option => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</Field>
						<Field label="Age range" id="profile_age_range">
							<select
								id="profile_age_range"
								value={draft.ageRange}
								onChange={event => setField("ageRange", event.target.value)}
								className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-field">
								<option value="">Prefer not to say yet</option>
								{AGE_RANGE_OPTIONS.map(option => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</Field>
						<Field label="City" id="profile_city">
							<Input
								id="profile_city"
								value={draft.city}
								onChange={event => setField("city", event.target.value)}
							/>
						</Field>
						<Field label="Province / state" id="profile_province">
							<Input
								id="profile_province"
								value={draft.province}
								onChange={event => setField("province", event.target.value)}
							/>
						</Field>
						<Field label="Country" id="profile_country">
							<Input
								id="profile_country"
								value={draft.country}
								onChange={event => setField("country", event.target.value)}
							/>
						</Field>
					</div>
					{draft.email.trim().length > 0 && !emailIsValid ? (
						<p className="text-sm text-destructive">Enter a valid email address.</p>
					) : null}
					{errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
					<div className="flex justify-end">
						<Button
							type="submit"
							disabled={!canSubmit || mutation.isPending}
							aria-busy={mutation.isPending}>
							{mutation.isPending ? "Saving..." : "Review terms"}
							<ArrowRight className="size-4" aria-hidden="true" />
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function Field({
	id,
	label,
	required,
	children
}: Readonly<{ id: string; label: string; required?: boolean; children: React.ReactNode }>) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={id}>
				{label}
				{required ? <span className="text-destructive"> *</span> : null}
			</Label>
			{children}
		</div>
	);
}

function TermsStep({ onComplete }: Readonly<{ onComplete: (profile: MyAuditorProfile) => void }>) {
	const [reviewedKeys, setReviewedKeys] = React.useState<ReadonlySet<string>>(() => new Set());
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
	const legalQuery = useQuery({
		queryKey: ["playspace", "auditor", "onboarding", "legal-documents"],
		queryFn: () => playspaceApi.auditor.fetchInstrument("pvua_v5_2")
	});

	const legalDocuments = legalQuery.data?.legal_documents ?? [];
	const hasReviewedAll =
		legalDocuments.length > 0 && legalDocuments.every(document => reviewedKeys.has(document.key));
	const mutation = useMutation({
		mutationFn: () => playspaceApi.auditor.completeOnboarding(),
		onSuccess: profile => onComplete(profile),
		onError: error => {
			setErrorMessage(error instanceof Error ? error.message : "We could not complete onboarding.");
		}
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldCheck className="size-5 text-primary" aria-hidden="true" />
					Review legal documents
				</CardTitle>
				<CardDescription>
					Open each active document, then confirm acceptance to unlock your auditor dashboard.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{legalQuery.isLoading ? (
					<p className="text-sm text-muted-foreground">Loading legal documents...</p>
				) : null}
				{legalQuery.isError ? (
					<p className="text-sm text-destructive">Legal documents are unavailable. Please try again.</p>
				) : null}
				{legalDocuments.map(document => {
					const isReviewed = reviewedKeys.has(document.key);
					return (
						<div
							key={document.key}
							className="flex flex-col gap-4 rounded-card border border-edge/40 bg-card p-4">
							<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
								<div className="flex flex-col gap-1">
									<Badge variant="secondary" className="w-fit">
										{document.eyebrow}
									</Badge>
									<h2 className="text-xl font-semibold text-foreground">{document.title}</h2>
									<p className="text-sm text-muted-foreground">Updated {document.last_updated}</p>
								</div>
								<Button
									type="button"
									variant={isReviewed ? "secondary" : "outline"}
									onClick={() => {
										setReviewedKeys(current => new Set(current).add(document.key));
									}}>
									{isReviewed ? "Reviewed" : "Mark reviewed"}
								</Button>
							</div>
							<Textarea
								value={document.summary}
								readOnly
								aria-label={`${document.short_title} summary`}
								className="min-h-20"
							/>
							<div className="max-h-72 overflow-y-auto rounded-card border border-edge/40 bg-secondary/30 p-4">
								<div className="flex flex-col gap-5">
									{document.sections.map(section => (
										<section key={section.key} className="flex flex-col gap-2">
											<h3 className="font-semibold text-foreground">{section.title}</h3>
											{section.body.map(paragraph => (
												<p key={paragraph} className="text-sm leading-6 text-muted-foreground">
													{paragraph}
												</p>
											))}
											{section.bullets.length > 0 ? (
												<ul className="list-disc pl-5 text-sm leading-6 text-muted-foreground">
													{section.bullets.map(bullet => (
														<li key={bullet}>{bullet}</li>
													))}
												</ul>
											) : null}
										</section>
									))}
								</div>
							</div>
						</div>
					);
				})}
				{errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
				<div className="flex justify-end">
					<Button
						type="button"
						disabled={!hasReviewedAll || mutation.isPending}
						aria-busy={mutation.isPending}
						onClick={() => mutation.mutate()}>
						{mutation.isPending ? "Accepting..." : "Accept and continue"}
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function CodeStep({ profile }: Readonly<{ profile: MyAuditorProfile | null }>) {
	const router = useRouter();
	const profileQuery = useQuery({
		queryKey: ["playspace", "auditor", "onboarding", "profile-code"],
		queryFn: () => playspaceApi.auditor.myProfile(),
		initialData: profile ?? undefined
	});
	const auditorCode = profileQuery.data?.auditor_code ?? "—";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Your auditor code is ready</CardTitle>
				<CardDescription>
					This code is used for assignment, reporting, and privacy-safe exports.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<div className="rounded-card border-2 border-primary bg-primary/10 p-8 text-center shadow-field">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Auditor code</p>
					<p className="mt-3 font-mono text-4xl font-semibold tracking-[0.08em] text-foreground">
						{auditorCode}
					</p>
				</div>
				<p className="text-sm leading-6 text-muted-foreground">
					You can find this code again in Settings. Use it when a manager asks for your auditor identifier.
				</p>
				<div className="flex justify-end">
					<Button type="button" onClick={() => router.push("/auditor/dashboard")}>
						Enter dashboard
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export default function AuditorOnboardingPage() {
	const [step, setStep] = React.useState<OnboardingStep>("password");
	const [completedProfile, setCompletedProfile] = React.useState<MyAuditorProfile | null>(null);

	const browserSession = getBrowserAuthSession();
	const initialDraft = React.useMemo(
		() => getInitialProfileDraft(browserSession?.userName ?? null, browserSession?.userEmail ?? null),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	return (
		<div className="flex flex-col gap-6">
			<StepHeader
				step={
					step === "password"
						? "Step 1 of 4"
						: step === "profile"
							? "Step 2 of 4"
							: step === "terms"
								? "Step 3 of 4"
								: "Step 4 of 4"
				}
				title="Auditor onboarding"
				description="Finish your web dashboard setup with the same auditor onboarding flow used in the mobile app."
			/>
			<div className="grid gap-3 md:grid-cols-4">
				{(["password", "profile", "terms", "code"] as const).map((item, index) => (
					<div
						key={item}
						className={
							item === step
								? "rounded-card border border-primary bg-primary/10 p-3 text-sm font-medium text-foreground"
								: "rounded-card border border-edge/40 bg-card p-3 text-sm text-muted-foreground"
						}>
						{index + 1}. {item}
					</div>
				))}
			</div>
			<Separator />
			{step === "password" ? <PasswordStep onComplete={() => setStep("profile")} /> : null}
			{step === "profile" ? (
				<ProfileStep initialDraft={initialDraft} onComplete={() => setStep("terms")} />
			) : null}
			{step === "terms" ? (
				<TermsStep
					onComplete={profile => {
						updateStoredAuditorSession(profile, "DASHBOARD");
						setCompletedProfile(profile);
						setStep("code");
					}}
				/>
			) : null}
			{step === "code" ? <CodeStep profile={completedProfile} /> : null}
		</div>
	);
}
