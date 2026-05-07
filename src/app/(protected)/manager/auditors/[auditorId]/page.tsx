"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLineIcon, PlusIcon, Trash2Icon, UserCircle2Icon, UserMinusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { use } from "react";

import { playspaceApi, type Assignment } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import { AssignAuditorDialog } from "@/components/dashboard/assign-auditor-dialog";
import {
	AuditorDialog,
	type AuditorCreatedSummary,
	type AuditorDialogPayload
} from "@/components/dashboard/auditor-dialog";
import { BackButton } from "@/components/dashboard/back-button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDateTimeLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ManagerAuditorDetailPageProps {
	params: Promise<{ auditorId: string }>;
}

interface PendingAssignmentDelete {
	readonly id: string;
	readonly scopeName: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

export default function ManagerAuditorDetailPage({ params }: Readonly<ManagerAuditorDetailPageProps>) {
	const formatT = useTranslations("common.format");
	const t = useTranslations("manager.auditorDetail");
	const workspaceT = useTranslations("common.workspace");
	const navT = useTranslations("shell.navigation");
	const resolvedParams = use(params);
	const auditorId = resolvedParams.auditorId;
	const session = useAuthSession();
	const queryClient = useQueryClient();
	const accountId = session?.role === "manager" ? session.accountId : null;

	const router = useRouter();

	const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
	const [assignmentPendingDelete, setAssignmentPendingDelete] = React.useState<PendingAssignmentDelete | null>(null);
	const [isRemoveAuditorDialogOpen, setIsRemoveAuditorDialogOpen] = React.useState(false);

	/* ── Fetch auditor roster (to get the specific auditor's summary) ── */
	const auditorsQuery = useQuery({
		queryKey: ["playspace", "manager", "auditors", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Account context unavailable.");
			}
			return playspaceApi.accounts.auditors(accountId);
		},
		enabled: accountId !== null
	});

	/* ── Fetch auditor's assignments ── */
	const assignmentsQuery = useQuery({
		queryKey: ["playspace", "manager", "assignments", "rows", auditorId],
		queryFn: () => playspaceApi.assignments.list(auditorId),
		enabled: auditorId.length > 0
	});

	/* ── Delete assignment ── */
	const deleteAssignment = useMutation({
		mutationFn: async (assignmentId: string) => {
			return playspaceApi.assignments.delete(auditorId, assignmentId);
		},
		onSuccess: async () => {
			setAssignmentPendingDelete(null);
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "assignments", "rows", auditorId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "auditors", accountId]
			});
		}
	});

	/* ── Update auditor ── */
	const updateAuditor = useMutation({
		mutationFn: async (payload: AuditorDialogPayload) =>
			playspaceApi.management.auditors.update(auditorId, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "auditors", accountId]
			});
			setIsEditDialogOpen(false);
		},
		retry: 0
	});

	/* ── Remove auditor from account ── */
	const removeAuditor = useMutation({
		mutationFn: async () => playspaceApi.management.auditors.delete(auditorId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "auditors", accountId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "account", accountId, "auditors"]
			});
			router.push("/manager/auditors");
		}
	});

	const auditors = auditorsQuery.data ?? [];
	const auditor = auditors.find(a => a.id === auditorId) ?? null;
	const assignments: Assignment[] = assignmentsQuery.data ?? [];

	/* ── Loading ── */
	if (auditorsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<div className="h-20 animate-pulse rounded-card border border-border bg-card" />
				<div className="grid gap-4 md:grid-cols-3">
					{[1, 2, 3].map(i => (
						<div
							key={`skel-${i.toString()}`}
							className="h-32 animate-pulse rounded-card border border-border bg-card"
						/>
					))}
				</div>
				<div className="h-64 animate-pulse rounded-card border border-border bg-card" />
			</div>
		);
	}

	/* ── Error / not found ── */
	if (auditorsQuery.isError || !auditor) {
		return (
			<EmptyState
				title={t("empty.notFoundTitle")}
				description={
					auditorsQuery.isError
						? getErrorMessage(auditorsQuery.error, t("empty.loadErrorFallback"))
						: t("empty.notFoundDescription")
				}
				action={<BackButton href="/manager/auditors" label={t("empty.backToAuditors")} />}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={workspaceT("manager")}
				title={auditor.full_name}
				description={t("header.description", { code: auditor.auditor_code })}
				breadcrumbs={[
					{ label: navT("dashboard"), href: "/manager/dashboard" },
					{ label: navT("auditors"), href: "/manager/auditors" },
					{ label: auditor.full_name }
				]}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<BackButton href="/manager/auditors" label={t("actions.backToAuditors")} />
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={() => setIsEditDialogOpen(true)}>
							<PencilLineIcon className="size-4" />
							<span>{t("actions.editProfile")}</span>
						</Button>
						<Button type="button" className="gap-2" onClick={() => setIsAssignDialogOpen(true)}>
							<PlusIcon className="size-4" />
							<span>{t("actions.assignToProject")}</span>
						</Button>
						<Button
							type="button"
							variant="destructive"
							className="gap-2"
							onClick={() => setIsRemoveAuditorDialogOpen(true)}>
							<UserMinusIcon className="size-4" />
							<span>{t("actions.removeFromAccount")}</span>
						</Button>
					</div>
				}
			/>

			{/* ── Profile card ── */}
			<Card>
				<CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
					<div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
						<UserCircle2Icon className="size-7" />
					</div>
					<div className="flex-1 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="font-mono text-primary">
								{auditor.auditor_code}
							</Badge>
							{auditor.role ? (
								<Badge variant="secondary" style={{ textTransform: "capitalize" }}>
									{auditor.role}
								</Badge>
							) : null}
						</div>
						<p className="text-sm text-muted-foreground">{auditor.email ?? t("profile.emailPending")}</p>
						<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
							{auditor.country ? <span>{auditor.country}</span> : null}
							{auditor.age_range ? <span>{auditor.age_range}</span> : null}
							{auditor.gender ? <span>{auditor.gender}</span> : null}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Stats ── */}
			<div className="grid gap-4 md:grid-cols-3">
				<StatCard
					title={t("stats.assignments.title")}
					value={String(auditor.assignments_count)}
					helper={t("stats.assignments.helper")}
				/>
				<StatCard
					title={t("stats.completedAudits.title")}
					value={String(auditor.completed_audits)}
					helper={t("stats.completedAudits.helper")}
				/>
				<StatCard
					title={t("stats.lastActive.title")}
					value={formatDateTimeLabel(auditor.last_active_at, formatT)}
					valueClassName="font-sans text-lg leading-snug md:text-xl"
					helper={t("stats.lastActive.helper")}
				/>
			</div>

			{/* ── Assignments list ── */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-2">
					<CardTitle>{t("assignmentsCard.title")}</CardTitle>
					<Button type="button" size="sm" className="gap-1.5" onClick={() => setIsAssignDialogOpen(true)}>
						<PlusIcon className="size-3.5" />
						<span>{t("assignmentsCard.addAssignment")}</span>
					</Button>
				</CardHeader>
				<CardContent className="space-y-3">
					{assignmentsQuery.isLoading ? (
						<p className="text-sm text-muted-foreground">{t("assignmentsCard.loading")}</p>
					) : assignmentsQuery.isError ? (
						<p className="text-sm text-destructive">
							{getErrorMessage(assignmentsQuery.error, t("assignmentsCard.loadErrorFallback"))}
						</p>
					) : assignments.length === 0 ? (
						<div className="rounded-field border border-dashed border-border p-6 text-center">
							<p className="font-medium text-foreground">{t("assignmentsCard.emptyTitle")}</p>
							<p className="mt-1 text-sm text-muted-foreground">
								{t("assignmentsCard.emptyDescription")}
							</p>
						</div>
					) : (
						assignments.map(assignment => (
							<div
								key={assignment.id}
								className="flex flex-col gap-3 rounded-card border border-border/70 bg-card/60 p-4 lg:flex-row lg:items-center lg:justify-between">
								<div className="space-y-1">
									<p className="font-medium text-foreground">{assignment.scope_name}</p>
									<p className="text-xs text-muted-foreground">
										{t("assignmentsCard.placeMeta", { projectName: assignment.project_name })}
									</p>
									<p className="text-xs text-muted-foreground">
										{t("assignmentsCard.assignedAt", {
											value: formatDateTimeLabel(assignment.assigned_at, formatT)
										})}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline" className="font-medium">
										{t("assignmentsCard.placeBadge")}
									</Badge>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={deleteAssignment.isPending}
										onClick={() => {
											setAssignmentPendingDelete({
												id: assignment.id,
												scopeName: assignment.scope_name
											});
										}}>
										<Trash2Icon className="mr-1.5 size-3.5" />
										{t("assignmentsCard.remove")}
									</Button>
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>

			{/* ── Dialogs ── */}
			<AssignAuditorDialog
				open={isAssignDialogOpen}
				onOpenChange={setIsAssignDialogOpen}
				prefill={{ auditorIds: [auditorId] }}
				onAssigned={() => {
					void queryClient.invalidateQueries({
						queryKey: ["playspace", "manager", "assignments", "rows", auditorId]
					});
					void queryClient.invalidateQueries({
						queryKey: ["playspace", "manager", "auditors", accountId]
					});
				}}
			/>
			<AuditorDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				mode="edit"
				title={t("dialogs.edit.title")}
				description={t("dialogs.edit.description")}
				submitLabel={t("dialogs.edit.submitLabel")}
				initialValues={{
					email: auditor.email,
					fullName: auditor.full_name,
					auditorCode: auditor.auditor_code,
					role: auditor.role,
					ageRange: auditor.age_range,
					gender: auditor.gender,
					country: auditor.country
				}}
				isPending={updateAuditor.isPending}
				onSubmit={async (payload): Promise<AuditorCreatedSummary | undefined> => {
					await updateAuditor.mutateAsync(payload);
					return undefined;
				}}
			/>
			<ConfirmDialog
				open={assignmentPendingDelete !== null}
				onOpenChange={open => {
					if (!open) {
						setAssignmentPendingDelete(null);
					}
				}}
				title={t("removeAssignmentConfirm.title")}
				description={
					assignmentPendingDelete
						? t("removeAssignmentConfirm.descriptionWithScope", {
								scopeName: assignmentPendingDelete.scopeName
							})
						: t("removeAssignmentConfirm.descriptionGeneric")
				}
				confirmLabel={t("removeAssignmentConfirm.confirmLabel")}
				isPending={deleteAssignment.isPending}
				onConfirm={() => {
					if (!assignmentPendingDelete) {
						return;
					}
					deleteAssignment.mutate(assignmentPendingDelete.id);
				}}
			/>
			<ConfirmDialog
				open={isRemoveAuditorDialogOpen}
				onOpenChange={open => {
					if (!open) {
						setIsRemoveAuditorDialogOpen(false);
					}
				}}
				title={t("removeAuditorConfirm.title")}
				description={
					auditor
						? t("removeAuditorConfirm.descriptionWithLabel", {
								label: `${auditor.auditor_code} · ${auditor.full_name}`
							})
						: t("removeAuditorConfirm.descriptionGeneric")
				}
				confirmLabel={t("removeAuditorConfirm.confirmLabel")}
				isPending={removeAuditor.isPending}
				onConfirm={() => {
					removeAuditor.mutate();
				}}
			/>
		</div>
	);
}
