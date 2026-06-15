"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type MyManagerProfile, playspaceApi } from "@/lib/api/playspace";
import { getBrowserAuthSession, setBrowserAuthSession } from "@/lib/auth/browser-session";

type OnboardingStep = "profile" | "terms" | "welcome";

const STEP_LABELS: Record<OnboardingStep, string> = {
	profile: "Step 1 of 3",
	terms: "Step 2 of 3",
	welcome: "Step 3 of 3"
};

const STEP_DISPLAY_NAMES: Record<OnboardingStep, string> = {
	profile: "profile",
	terms: "terms",
	welcome: "welcome"
};

/** Update the stored cookie session with the manager's latest profile data. */
function updateStoredManagerSession(profile: MyManagerProfile) {
	const currentSession = getBrowserAuthSession();
	if (!currentSession) return;
	setBrowserAuthSession({
		...currentSession,
		userName: profile.full_name,
		userEmail: profile.email,
		nextStep: "DASHBOARD"
	});
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

function Field({
	id,
	label,
	hint,
	required,
	children
}: Readonly<{ id: string; label: string; hint?: string; required?: boolean; children: React.ReactNode }>) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={id}>
				{label}
				{required ? (
					<span className="text-destructive" aria-hidden="true">
						{" "}
						*
					</span>
				) : null}
			</Label>
			{children}
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

function ProfileStep({ onComplete }: Readonly<{ onComplete: (profile: MyManagerProfile) => void }>) {
	const profileQuery = useQuery({
		queryKey: ["playspace", "manager", "onboarding", "my-profile"],
		queryFn: () => playspaceApi.manager.myProfile()
	});

	const [fullName, setFullName] = React.useState("");
	const [email, setEmail] = React.useState("");
	const [phone, setPhone] = React.useState("");
	const [position, setPosition] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const [prevData, setPrevData] = React.useState(profileQuery.data);
	if (profileQuery.data && profileQuery.data !== prevData) {
		setPrevData(profileQuery.data);
		setFullName(profileQuery.data.full_name);
		setEmail(profileQuery.data.email);
		setPhone(profileQuery.data.phone ?? "");
		setPosition(profileQuery.data.position ?? "");
	}

	const canSubmit = fullName.trim().length > 0;

	const mutation = useMutation({
		mutationFn: () =>
			playspaceApi.manager.updateMyProfile({
				full_name: fullName.trim(),
				email: email.trim() || undefined,
				phone: phone.trim() || undefined,
				position: position.trim() || undefined
			}),
		onSuccess: profile => {
			setErrorMessage(null);
			onComplete(profile);
		},
		onError: error => {
			setErrorMessage(error instanceof Error ? error.message : "We could not save your profile.");
		}
	});

	const isLoading = profileQuery.isLoading && !profileQuery.data;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UserRound className="size-5 text-primary" aria-hidden="true" />
					Confirm your manager profile
				</CardTitle>
				<CardDescription>Review and update your contact details before entering the workspace.</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex flex-col gap-4">
						<div className="grid gap-4 md:grid-cols-2">
							{(["a", "b", "c", "d"] as const).map(id => (
								<div key={id} className="flex flex-col gap-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
							))}
						</div>
					</div>
				) : (
					<form
						className="flex flex-col gap-4"
						onSubmit={event => {
							event.preventDefault();
							setErrorMessage(null);
							if (!canSubmit) return;
							mutation.mutate();
						}}>
						<div className="grid gap-4 md:grid-cols-2">
							<Field label="Full name" id="manager_full_name" required>
								<Input
									id="manager_full_name"
									autoComplete="name"
									value={fullName}
									onChange={event => setFullName(event.target.value)}
									aria-required="true"
								/>
							</Field>
							<Field label="Email" id="manager_email">
								<Input
									id="manager_email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={event => setEmail(event.target.value)}
								/>
							</Field>
							<Field label="Phone" id="manager_phone">
								<Input
									id="manager_phone"
									type="tel"
									autoComplete="tel"
									value={phone}
									onChange={event => setPhone(event.target.value)}
								/>
							</Field>
							<Field
								label="Position / role"
								id="manager_position"
								hint="Your job title or role in the organisation.">
								<Input
									id="manager_position"
									autoComplete="organization-title"
									value={position}
									onChange={event => setPosition(event.target.value)}
								/>
							</Field>
						</div>
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
				)}
			</CardContent>
		</Card>
	);
}

function TermsStep({ onComplete }: Readonly<{ onComplete: () => void }>) {
	const [reviewedKeys, setReviewedKeys] = React.useState<ReadonlySet<string>>(() => new Set());
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const legalQuery = useQuery({
		queryKey: ["playspace", "manager", "onboarding", "legal-documents"],
		queryFn: () => playspaceApi.auditor.fetchInstrument("pvua_v5_2")
	});

	const legalDocuments = legalQuery.data?.legal_documents ?? [];
	const hasReviewedAll =
		legalDocuments.length > 0 && legalDocuments.every(document => reviewedKeys.has(document.key));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldCheck className="size-5 text-primary" aria-hidden="true" />
					Review legal documents
				</CardTitle>
				<CardDescription>
					Open each active document and confirm acceptance before accessing your workspace.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{legalQuery.isLoading ? (
					<div className="space-y-3">
						<Skeleton className="h-32 w-full rounded-card" />
						<Skeleton className="h-32 w-full rounded-card" />
					</div>
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
						disabled={!hasReviewedAll}
						onClick={() => {
							setErrorMessage(null);
							onComplete();
						}}>
						Accept and continue
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function WelcomeStep({ profileSnapshot }: Readonly<{ profileSnapshot: MyManagerProfile | null }>) {
	const router = useRouter();

	const completeMutation = useMutation({
		mutationFn: () => playspaceApi.manager.completeOnboarding(),
		onSuccess: profile => {
			updateStoredManagerSession(profile);
			router.push("/manager/dashboard");
		}
	});

	const displayName = profileSnapshot?.full_name ?? getBrowserAuthSession()?.userName ?? "Manager";
	const organisation = profileSnapshot?.organization ?? null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
					You&apos;re all set, {displayName.split(" ")[0]}
				</CardTitle>
				<CardDescription>
					Your manager profile is ready. Enter your workspace to start managing audits, places, and auditors.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				{organisation ? (
					<div className="flex items-start gap-3 rounded-card border border-edge/40 bg-secondary/40 p-4">
						<Building2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
						<div className="space-y-1">
							<p className="text-sm font-semibold text-foreground">{organisation}</p>
							<p className="text-xs text-muted-foreground">Your workspace organisation</p>
						</div>
					</div>
				) : null}

				<div className="grid gap-3 sm:grid-cols-3">
					{(
						[
							{ icon: "📋", label: "Manage projects", description: "Create and oversee audit projects" },
							{ icon: "📍", label: "Assign places", description: "Link places to projects for auditing" },
							{ icon: "👤", label: "Invite auditors", description: "Grow your team and assign work" }
						] as const
					).map(item => (
						<div key={item.label} className="rounded-card border border-edge/40 bg-card p-4 text-center">
							<p className="mb-2 text-2xl" aria-hidden="true">
								{item.icon}
							</p>
							<p className="text-sm font-medium text-foreground">{item.label}</p>
							<p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
						</div>
					))}
				</div>

				{completeMutation.isError ? (
					<p className="text-sm text-destructive" role="alert">
						{completeMutation.error instanceof Error
							? completeMutation.error.message
							: "Something went wrong. Please try again."}
					</p>
				) : null}

				<div className="flex justify-end">
					<Button
						type="button"
						onClick={() => completeMutation.mutate()}
						disabled={completeMutation.isPending}
						aria-busy={completeMutation.isPending}>
						{completeMutation.isPending ? "Setting up..." : "Enter your workspace"}
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export default function ManagerOnboardingPage() {
	const [step, setStep] = React.useState<OnboardingStep>("profile");
	const [profileSnapshot, setProfileSnapshot] = React.useState<MyManagerProfile | null>(null);

	const steps = ["profile", "terms", "welcome"] as const;

	return (
		<div className="flex flex-col gap-6">
			<StepHeader
				step={STEP_LABELS[step]}
				title="Manager onboarding"
				description="Confirm your profile and review platform terms before accessing your workspace."
			/>

			<div className="grid gap-3 md:grid-cols-3">
				{steps.map((item, index) => (
					<div
						key={item}
						className={
							item === step
								? "rounded-card border border-primary bg-primary/10 p-3 text-sm font-medium text-foreground"
								: "rounded-card border border-edge/40 bg-card p-3 text-sm text-muted-foreground"
						}>
						{index + 1}. {STEP_DISPLAY_NAMES[item]}
					</div>
				))}
			</div>

			<Separator />

			{step === "profile" ? (
				<ProfileStep
					onComplete={profile => {
						setProfileSnapshot(profile);
						setStep("terms");
					}}
				/>
			) : null}

			{step === "terms" ? <TermsStep onComplete={() => setStep("welcome")} /> : null}

			{step === "welcome" ? <WelcomeStep profileSnapshot={profileSnapshot} /> : null}
		</div>
	);
}
