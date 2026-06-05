"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { playspaceApi, type AuditorSummary, type PlaceSummary, type ProjectSummary } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toNullableString } from "./form-utils";
import { getValidationMessage, getZodFieldErrors } from "./tanstack-form-utils";

/* ─────────────────────── Shared types ─────────────────────── */

interface PrefilledContext {
	/** Pre-selected project id (from place detail or project detail). */
	readonly projectId?: string;
	/** Pre-selected place ids (from place detail). */
	readonly placeIds?: readonly string[];
	/** Pre-selected auditor ids (from auditor detail). */
	readonly auditorIds?: readonly string[];
}

export interface AssignAuditorDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	/** Contextual pre-fill data from the page that opened this dialog. */
	readonly prefill?: PrefilledContext;
	/** Called after a successful assignment creation to refresh parent queries. */
	readonly onAssigned?: () => void;
}

const EMPTY_AUDITORS: readonly AuditorSummary[] = [];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─────────────────────── Invite form schema ─────────────────────── */

const inviteFormSchema = z.object({
	email: z
		.string()
		.trim()
		.refine(value => EMAIL_PATTERN.test(value), "Enter a valid email address."),
	fullName: z.string().trim().min(1, "Full name is required."),
	auditorCode: z.string().trim().min(1, "Auditor code is required."),
	role: z.string(),
	ageRange: z.string(),
	gender: z.string(),
	country: z.string()
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

function validateInviteValues(values: InviteFormValues): Partial<Record<keyof InviteFormValues, string>> | undefined {
	const result = inviteFormSchema.safeParse(values);
	if (result.success) {
		return undefined;
	}
	return getZodFieldErrors<keyof InviteFormValues>(result.error.issues);
}

/* ─────────────────────── Auditor picker sub-component ─────────────────────── */

function filterAuditors(auditors: readonly AuditorSummary[], query: string): AuditorSummary[] {
	const normalized = query.trim().toLowerCase();
	if (normalized.length === 0) {
		return [...auditors];
	}
	return auditors.filter(auditor => {
		const searchable = [auditor.auditor_code, auditor.full_name, auditor.email ?? ""].join(" ").toLowerCase();
		return searchable.includes(normalized);
	});
}

interface AuditorPickerProps {
	readonly auditors: readonly AuditorSummary[];
	readonly selectedIds: readonly string[];
	readonly disabled: boolean;
	readonly onToggle: (id: string) => void;
	readonly onToggleAll: (selected: boolean) => void;
}

function AuditorPicker({ auditors, selectedIds, disabled, onToggle, onToggleAll }: AuditorPickerProps) {
	const [searchQuery, setSearchQuery] = React.useState("");
	const filtered = filterAuditors(auditors, searchQuery);
	const allSelected = filtered.length > 0 && filtered.every(a => selectedIds.includes(a.id));
	const someSelected = filtered.some(a => selectedIds.includes(a.id)) && !allSelected;

	return (
		<div className="grid gap-2">
			<Label htmlFor="assign_auditor_search">Search auditors</Label>
			<Input
				id="assign_auditor_search"
				autoComplete="off"
				spellCheck={false}
				placeholder="Name, code, or email..."
				value={searchQuery}
				onChange={e => setSearchQuery(e.target.value)}
			/>
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm text-muted-foreground">
					{`${filtered.length.toString()} auditor${filtered.length === 1 ? "" : "s"}`}
				</p>
				{filtered.length > 0 ? (
					<div className="flex items-center gap-2">
						<Checkbox
							id="assign_select_all_auditors"
							checked={allSelected ? true : someSelected ? "indeterminate" : false}
							onCheckedChange={checked => onToggleAll(checked === true)}
							disabled={disabled}
						/>
						<Label
							htmlFor="assign_select_all_auditors"
							className="cursor-pointer text-xs font-medium leading-none">
							{allSelected ? "Deselect all" : "Select all"}
						</Label>
					</div>
				) : null}
			</div>
			<div className="max-h-48 overflow-y-auto rounded-field border border-edge/40 bg-card">
				{filtered.length === 0 ? (
					<p className="px-4 py-3 text-sm text-muted-foreground">No matching auditors.</p>
				) : (
					<div className="grid divide-y divide-border/60">
						{filtered.map(auditor => {
							const isSelected = selectedIds.includes(auditor.id);
							return (
								<button
									key={auditor.id}
									type="button"
									disabled={disabled}
									className={cn(
										"flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed",
										isSelected ? "bg-primary/5" : "hover:bg-muted/40"
									)}
									onClick={() => onToggle(auditor.id)}>
									<Checkbox checked={isSelected} tabIndex={-1} disabled={disabled} />
									<div className="grid flex-1 gap-0.5">
										<div className="flex flex-wrap items-center gap-1.5">
											<Badge variant="outline" className="font-mono text-primary">
												{auditor.auditor_code}
											</Badge>
											{auditor.role ? (
												<Badge variant="secondary" style={{ textTransform: "capitalize" }}>
													{auditor.role}
												</Badge>
											) : null}
										</div>
										<p className="text-sm font-medium text-foreground">{auditor.full_name}</p>
										<p className="text-xs text-muted-foreground">
											{auditor.email ?? "Email pending"}
										</p>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</div>
			{selectedIds.length > 0 ? (
				<p className="text-xs text-muted-foreground">{`${selectedIds.length.toString()} selected`}</p>
			) : null}
		</div>
	);
}

/* ─────────────────────── Place picker sub-component ─────────────────────── */

interface PlacePickerProps {
	readonly places: readonly PlaceSummary[];
	readonly selectedPlaceIds: readonly string[];
	readonly disabled: boolean;
	readonly projectSelected: boolean;
	readonly onToggle: (id: string) => void;
	readonly onToggleAll: (selected: boolean) => void;
}

function PlacePicker({ places, selectedPlaceIds, disabled, projectSelected, onToggle, onToggleAll }: PlacePickerProps) {
	const allSelected = places.length > 0 && places.every(p => selectedPlaceIds.includes(p.id));
	const someSelected = places.some(p => selectedPlaceIds.includes(p.id)) && !allSelected;

	return (
		<div className="grid gap-2">
			<div className="flex items-center justify-between gap-2">
				<Label>Places</Label>
				{places.length > 0 ? (
					<div className="flex items-center gap-2">
						<Checkbox
							id="assign_select_all_places"
							checked={allSelected ? true : someSelected ? "indeterminate" : false}
							onCheckedChange={checked => onToggleAll(checked === true)}
							disabled={disabled || !projectSelected}
						/>
						<Label
							htmlFor="assign_select_all_places"
							className="cursor-pointer text-xs font-medium leading-none">
							{allSelected ? "Deselect all" : "Select all"}
						</Label>
					</div>
				) : null}
			</div>
			<div
				className={cn(
					"max-h-48 overflow-y-auto rounded-field border border-edge/40 bg-card",
					!projectSelected && "pointer-events-none opacity-50 grayscale"
				)}>
				{!projectSelected ? (
					<p className="px-4 py-3 text-sm text-muted-foreground">Select a project first.</p>
				) : places.length === 0 ? (
					<p className="px-4 py-3 text-sm text-muted-foreground">No places in this project.</p>
				) : (
					<div className="grid divide-y divide-border/60">
						{places.map(place => {
							const isSelected = selectedPlaceIds.includes(place.id);
							return (
								<div
									key={place.id}
									className={cn(
										"flex items-center gap-3 px-4 py-2 text-left transition-colors",
										isSelected ? "bg-primary/5" : "hover:bg-muted/40"
									)}>
									<Checkbox
										id={`assign_place_${place.id}`}
										checked={isSelected}
										onCheckedChange={() => onToggle(place.id)}
										disabled={disabled}
									/>
									<Label htmlFor={`assign_place_${place.id}`} className="flex-1 cursor-pointer py-1">
										<p className="text-sm font-medium text-foreground">{place.name}</p>
										{place.city || place.place_type ? (
											<p className="text-xs text-muted-foreground">
												{[place.city, place.place_type].filter(Boolean).join(" · ")}
											</p>
										) : null}
									</Label>
								</div>
							);
						})}
					</div>
				)}
			</div>
			{selectedPlaceIds.length > 0 ? (
				<p className="text-xs text-muted-foreground">
					{`${selectedPlaceIds.length.toString()} place${selectedPlaceIds.length === 1 ? "" : "s"} selected`}
				</p>
			) : null}
		</div>
	);
}

/* ─────────────────────── Project + Place selector (shared) ─────────────────────── */

interface ScopePickerProps {
	readonly projects: readonly ProjectSummary[];
	readonly places: readonly PlaceSummary[];
	readonly selectedProjectId: string;
	readonly selectedPlaceIds: readonly string[];
	readonly disabled: boolean;
	readonly onProjectChange: (id: string) => void;
	readonly onPlaceToggle: (id: string) => void;
	readonly onPlaceToggleAll: (selected: boolean) => void;
	readonly projectError?: string;
	readonly placeError?: string;
}

function ScopePicker({
	projects,
	places,
	selectedProjectId,
	selectedPlaceIds,
	disabled,
	onProjectChange,
	onPlaceToggle,
	onPlaceToggleAll,
	projectError,
	placeError
}: ScopePickerProps) {
	return (
		<div className="grid gap-4">
			<div className="grid gap-2">
				<Label htmlFor="assign_project_select">Project</Label>
				<Select
					value={selectedProjectId.trim().length > 0 ? selectedProjectId : undefined}
					onValueChange={onProjectChange}>
					<SelectTrigger id="assign_project_select" aria-label="Project" aria-invalid={Boolean(projectError)}>
						<SelectValue placeholder="Select a project..." />
					</SelectTrigger>
					<SelectContent position="popper">
						<SelectGroup>
							<SelectLabel>Projects</SelectLabel>
							{projects.map(project => (
								<SelectItem key={project.id} value={project.id}>
									{project.name}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				{projectError ? (
					<p className="text-sm text-destructive">{projectError}</p>
				) : (
					<p className="text-xs text-muted-foreground">The project under which the assignment is created.</p>
				)}
			</div>
			<PlacePicker
				places={places}
				selectedPlaceIds={selectedPlaceIds}
				disabled={disabled}
				projectSelected={selectedProjectId.trim().length > 0}
				onToggle={onPlaceToggle}
				onToggleAll={onPlaceToggleAll}
			/>
			{placeError ? <p className="text-sm text-destructive">{placeError}</p> : null}
		</div>
	);
}

/* ─────────────────────── Main dialog ─────────────────────── */

/**
 * Unified dialog for assigning existing auditors or inviting (creating) new ones
 * with an assignment in a single flow. Accepts pre-fill context from the calling page.
 */
export function AssignAuditorDialog({ open, onOpenChange, prefill, onAssigned }: Readonly<AssignAuditorDialogProps>) {
	const session = useAuthSession();
	const queryClient = useQueryClient();
	const accountId = session?.role === "manager" ? session.accountId : null;

	/* ── Shared state ── */
	const [activeTab, setActiveTab] = React.useState<string>("assign");
	const [selectedProjectId, setSelectedProjectId] = React.useState("");
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);
	const [selectedAuditorIds, setSelectedAuditorIds] = React.useState<string[]>([]);
	const [formError, setFormError] = React.useState<string | null>(null);
	const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = React.useState<{
		projectId?: string;
		placeId?: string;
		auditorId?: string;
	}>({});

	/* ── Reset on open/close ── */
	const [prevOpen, setPrevOpen] = React.useState(open);
	const [prevPrefillProjectId, setPrevPrefillProjectId] = React.useState(prefill?.projectId);
	const [prevPrefillPlaceIds, setPrevPrefillPlaceIds] = React.useState(prefill?.placeIds);
	const [prevPrefillAuditorIds, setPrevPrefillAuditorIds] = React.useState(prefill?.auditorIds);

	if (
		open !== prevOpen ||
		prefill?.projectId !== prevPrefillProjectId ||
		prefill?.placeIds !== prevPrefillPlaceIds ||
		prefill?.auditorIds !== prevPrefillAuditorIds
	) {
		setPrevOpen(open);
		setPrevPrefillProjectId(prefill?.projectId);
		setPrevPrefillPlaceIds(prefill?.placeIds);
		setPrevPrefillAuditorIds(prefill?.auditorIds);
		if (open) {
			setActiveTab("assign");
			setSelectedProjectId(prefill?.projectId ?? "");
			setSelectedPlaceIds(prefill?.placeIds ? [...prefill.placeIds] : []);
			setSelectedAuditorIds(prefill?.auditorIds ? [...prefill.auditorIds] : []);
			setFormError(null);
			setSuccessMessage(null);
			setFieldErrors({});
		}
	}

	/* ── Data fetching ── */
	const auditorsQuery = useQuery({
		queryKey: ["playspace", "manager", "auditors", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Account context unavailable.");
			}
			return playspaceApi.accounts.auditors(accountId);
		},
		enabled: accountId !== null && open
	});

	const projectsQuery = useQuery({
		queryKey: ["playspace", "account", accountId, "projects"],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Account context unavailable.");
			}
			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null && open
	});

	const projectPlacesQuery = useQuery({
		queryKey: ["playspace", "project", selectedProjectId, "places"],
		queryFn: () => playspaceApi.projects.places(selectedProjectId),
		enabled: selectedProjectId.trim().length > 0 && open
	});

	const auditors = auditorsQuery.data ?? EMPTY_AUDITORS;
	const projects = projectsQuery.data ?? [];
	const places = React.useMemo(() => projectPlacesQuery.data ?? [], [projectPlacesQuery.data]);

	/* ── Handlers ── */
	const handleProjectChange = React.useCallback((nextId: string) => {
		setSelectedProjectId(nextId);
		setSelectedPlaceIds([]);
		setFieldErrors(prev => ({ ...prev, projectId: undefined, placeId: undefined }));
		setFormError(null);
		setSuccessMessage(null);
	}, []);

	const handlePlaceToggle = React.useCallback((id: string) => {
		setSelectedPlaceIds(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
		setFieldErrors(prev => ({ ...prev, placeId: undefined }));
		setFormError(null);
		setSuccessMessage(null);
	}, []);

	const handlePlaceToggleAll = React.useCallback(
		(selected: boolean) => {
			setSelectedPlaceIds(selected ? places.map(p => p.id) : []);
			setFieldErrors(prev => ({ ...prev, placeId: undefined }));
		},
		[places]
	);

	const handleAuditorToggle = React.useCallback((id: string) => {
		setSelectedAuditorIds(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]));
		setFieldErrors(prev => ({ ...prev, auditorId: undefined }));
		setFormError(null);
		setSuccessMessage(null);
	}, []);

	const handleAuditorToggleAll = React.useCallback(
		(selected: boolean) => {
			const filtered = filterAuditors(auditors, "");
			setSelectedAuditorIds(selected ? filtered.map(a => a.id) : []);
		},
		[auditors]
	);

	/* ── Assign existing mutation ── */
	const bulkAssign = useMutation({
		mutationFn: async (input: {
			readonly projectId: string;
			readonly auditorIds: readonly string[];
			readonly placeIds: readonly string[];
		}) => {
			return playspaceApi.assignments.bulkCreate({
				project_id: input.projectId,
				auditor_profile_ids: [...input.auditorIds],
				place_ids: [...input.placeIds]
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["playspace"] });
			setSuccessMessage("Auditors assigned successfully.");
			setFormError(null);
			onAssigned?.();
			onOpenChange(false);
		},
		onError: error => {
			setFormError(error instanceof Error ? error.message : "Unable to create assignment.");
		}
	});

	/* ── Invite + assign mutation ── */
	const inviteAndAssign = useMutation({
		mutationFn: async (input: {
			readonly auditorPayload: {
				email: string;
				full_name: string;
				auditor_code: string;
				role: string | null;
				age_range: string | null;
				gender: string | null;
				country: string | null;
			};
			readonly projectId: string;
			readonly placeIds: readonly string[];
		}) => {
			const created = await playspaceApi.management.auditors.create(input.auditorPayload);
			await playspaceApi.assignments.bulkCreate({
				project_id: input.projectId,
				auditor_profile_ids: [created.id],
				place_ids: [...input.placeIds]
			});
			return created;
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["playspace"] });
			setSuccessMessage("Auditor invited and assigned successfully.");
			setFormError(null);
			onAssigned?.();
			onOpenChange(false);
		},
		onError: error => {
			setFormError(error instanceof Error ? error.message : "Unable to invite and assign auditor.");
		}
	});

	const isPending = bulkAssign.isPending || inviteAndAssign.isPending;

	/* ── Assign existing submit ── */
	function handleAssignSubmit() {
		const nextErrors: typeof fieldErrors = {};

		if (selectedAuditorIds.length === 0) {
			nextErrors.auditorId = "Select at least one auditor.";
		}
		if (selectedProjectId.trim().length === 0) {
			nextErrors.projectId = "Select a project.";
		}
		if (selectedPlaceIds.length === 0) {
			nextErrors.placeId = "Select at least one place.";
		}

		setFieldErrors(nextErrors);
		if (Object.values(nextErrors).some(v => typeof v === "string")) {
			return;
		}

		bulkAssign.mutate({
			projectId: selectedProjectId,
			auditorIds: selectedAuditorIds,
			placeIds: selectedPlaceIds
		});
	}

	/* ── Invite tab form ── */
	const inviteForm = useForm({
		defaultValues: {
			email: "",
			fullName: "",
			auditorCode: "",
			role: "",
			ageRange: "",
			gender: "",
			country: ""
		} satisfies InviteFormValues,
		validators: {
			onSubmit: ({ value }) => validateInviteValues(value)
		},
		onSubmit: async ({ value }) => {
			const scopeErrors: typeof fieldErrors = {};
			if (selectedProjectId.trim().length === 0) {
				scopeErrors.projectId = "Select a project.";
			}
			if (selectedPlaceIds.length === 0) {
				scopeErrors.placeId = "Select at least one place.";
			}
			setFieldErrors(scopeErrors);
			if (Object.values(scopeErrors).some(v => typeof v === "string")) {
				return;
			}

			await inviteAndAssign.mutateAsync({
				auditorPayload: {
					email: value.email.trim(),
					full_name: value.fullName.trim(),
					auditor_code: value.auditorCode.trim(),
					role: toNullableString(value.role),
					age_range: toNullableString(value.ageRange),
					gender: toNullableString(value.gender),
					country: toNullableString(value.country)
				},
				projectId: selectedProjectId,
				placeIds: selectedPlaceIds
			});
		}
	});

	const [prevOpenForInvite, setPrevOpenForInvite] = React.useState(open);
	if (open !== prevOpenForInvite) {
		setPrevOpenForInvite(open);
		if (open) {
			inviteForm.reset();
		}
	}

	const isLoading = auditorsQuery.isLoading || projectsQuery.isLoading;

	/**
	 * When auditor IDs are pre-filled (opened from auditor detail page),
	 * skip the auditor picker and tabs - just show the scope form.
	 */
	const hasPrefilledAuditors = prefill?.auditorIds !== undefined && prefill.auditorIds.length > 0;

	const prefilledAuditorName = React.useMemo(() => {
		if (!hasPrefilledAuditors) {
			return null;
		}
		const match = auditors.find(a => prefill?.auditorIds?.includes(a.id));
		return match ? `${match.full_name} (${match.auditor_code})` : null;
	}, [auditors, hasPrefilledAuditors, prefill?.auditorIds]);

	/* ── Shared error/success feedback block ── */
	const feedbackBlock = (
		<>
			{formError ? (
				<p aria-live="polite" className="text-sm text-destructive">
					{formError}
				</p>
			) : null}
			{successMessage ? (
				<p aria-live="polite" className="text-sm text-muted-foreground">
					{successMessage}
				</p>
			) : null}
		</>
	);

	/* ── Shared scope picker block ── */
	const scopePickerBlock = (
		<ScopePicker
			projects={projects}
			places={places}
			selectedProjectId={selectedProjectId}
			selectedPlaceIds={selectedPlaceIds}
			disabled={isPending}
			onProjectChange={handleProjectChange}
			onPlaceToggle={handlePlaceToggle}
			onPlaceToggleAll={handlePlaceToggleAll}
			projectError={fieldErrors.projectId}
			placeError={fieldErrors.placeId}
		/>
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{hasPrefilledAuditors ? "Assign to Project" : "Assign Auditor"}</DialogTitle>
					<DialogDescription>
						{hasPrefilledAuditors
							? `Choose a project and places to assign${prefilledAuditorName ? ` ${prefilledAuditorName}` : ""} to.`
							: "Assign existing auditors or invite a new one and assign them in a single step."}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-3 py-4">
						<div className="h-10 animate-pulse rounded-field border border-edge/40 bg-card" />
						<div className="h-32 animate-pulse rounded-field border border-edge/40 bg-card" />
					</div>
				) : hasPrefilledAuditors ? (
					/* ─── Auditor-scoped mode: no tabs, just scope picker ─── */
					<div className="space-y-4">
						{scopePickerBlock}
						{feedbackBlock}
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								disabled={isPending}
								onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button type="button" disabled={isPending} onClick={handleAssignSubmit}>
								{isPending ? "Assigning..." : "Assign"}
							</Button>
						</DialogFooter>
					</div>
				) : (
					/* ─── Full mode with tabs ─── */
					<Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
						<TabsList variant="line" className="w-full justify-start">
							<TabsTrigger value="assign">Assign Existing</TabsTrigger>
							<TabsTrigger value="invite">Invite New Auditor</TabsTrigger>
						</TabsList>

						{/* ─── Tab 1: Assign Existing ─── */}
						<TabsContent value="assign" className="space-y-4">
							<AuditorPicker
								auditors={auditors}
								selectedIds={selectedAuditorIds}
								disabled={isPending}
								onToggle={handleAuditorToggle}
								onToggleAll={handleAuditorToggleAll}
							/>
							{fieldErrors.auditorId ? (
								<p className="text-sm text-destructive">{fieldErrors.auditorId}</p>
							) : null}
							{scopePickerBlock}
							{feedbackBlock}
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									disabled={isPending}
									onClick={() => onOpenChange(false)}>
									Cancel
								</Button>
								<Button type="button" disabled={isPending} onClick={handleAssignSubmit}>
									{isPending ? "Assigning..." : "Assign"}
								</Button>
							</DialogFooter>
						</TabsContent>

						{/* ─── Tab 2: Invite New Auditor ─── */}
						<TabsContent value="invite">
							<form
								className="space-y-4"
								onSubmit={async event => {
									event.preventDefault();
									event.stopPropagation();
									await inviteForm.handleSubmit();
								}}>
								<div className="grid gap-4 md:grid-cols-2 items-start">
									<inviteForm.Field name="email">
										{field => {
											const msg = getValidationMessage(field.state.meta.errors);
											return (
												<div className="grid gap-2 items-start">
													<Label htmlFor={field.name}>
														Email{" "}
														<span className="text-destructive" aria-hidden="true">
															*
														</span>
													</Label>
													<Input
														id={field.name}
														type="email"
														autoComplete="email"
														spellCheck={false}
														placeholder="jane@organization.com"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={e => field.handleChange(e.target.value)}
														aria-invalid={Boolean(msg)}
													/>
													{msg ? <p className="text-sm text-destructive">{msg}</p> : null}
												</div>
											);
										}}
									</inviteForm.Field>
									<inviteForm.Field name="auditorCode">
										{field => {
											const msg = getValidationMessage(field.state.meta.errors);
											return (
												<div className="grid gap-2 items-start">
													<Label htmlFor={field.name}>
														Auditor code{" "}
														<span className="text-destructive" aria-hidden="true">
															*
														</span>
													</Label>
													<Input
														id={field.name}
														autoComplete="off"
														spellCheck={false}
														placeholder="e.g. AUD-001"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={e => field.handleChange(e.target.value)}
														aria-invalid={Boolean(msg)}
													/>
													{msg ? <p className="text-sm text-destructive">{msg}</p> : null}
												</div>
											);
										}}
									</inviteForm.Field>
									<inviteForm.Field name="fullName">
										{field => {
											const msg = getValidationMessage(field.state.meta.errors);
											return (
												<div className="grid gap-2 items-start md:col-span-2">
													<Label htmlFor={field.name}>
														Full name{" "}
														<span className="text-destructive" aria-hidden="true">
															*
														</span>
													</Label>
													<Input
														id={field.name}
														autoComplete="name"
														placeholder="Jane Smith"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={e => field.handleChange(e.target.value)}
														aria-invalid={Boolean(msg)}
													/>
													{msg ? <p className="text-sm text-destructive">{msg}</p> : null}
												</div>
											);
										}}
									</inviteForm.Field>
									<inviteForm.Field name="role">
										{field => (
											<div className="grid gap-2 items-start">
												<Label htmlFor={field.name}>
													Role{" "}
													<span className="text-xs font-normal text-muted-foreground">
														(optional)
													</span>
												</Label>
												<Input
													id={field.name}
													placeholder="e.g. Field Researcher"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={e => field.handleChange(e.target.value)}
												/>
											</div>
										)}
									</inviteForm.Field>
									<inviteForm.Field name="country">
										{field => (
											<div className="grid gap-2 items-start">
												<Label htmlFor={field.name}>
													Country{" "}
													<span className="text-xs font-normal text-muted-foreground">
														(optional)
													</span>
												</Label>
												<Input
													id={field.name}
													placeholder="e.g. Canada"
													autoComplete="country-name"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={e => field.handleChange(e.target.value)}
												/>
											</div>
										)}
									</inviteForm.Field>
								</div>
								{scopePickerBlock}
								{feedbackBlock}
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										disabled={isPending}
										onClick={() => onOpenChange(false)}>
										Cancel
									</Button>
									<Button type="submit" disabled={isPending}>
										{isPending ? "Creating..." : "Invite & Assign"}
									</Button>
								</DialogFooter>
							</form>
						</TabsContent>
					</Tabs>
				)}
			</DialogContent>
		</Dialog>
	);
}
