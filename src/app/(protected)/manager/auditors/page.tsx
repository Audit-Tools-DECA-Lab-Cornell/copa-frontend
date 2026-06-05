"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, FolderOpenIcon, PencilLineIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { playspaceApi, type AuditorSummary, type ManagerPlaceRow } from "@/lib/api/playspace";
import { useAuthSession } from "@/components/app/auth-session-provider";
import {
	AuditorDialog,
	type AuditorCreatedSummary,
	type AuditorDialogPayload
} from "@/components/dashboard/auditor-dialog";
import { AuditorsTable } from "@/components/dashboard/auditors-table";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterPopover } from "@/components/dashboard/filter-popover";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ManagerAuditorsPage() {
	const t = useTranslations("manager.auditors");
	const workspaceT = useTranslations("common.workspace");
	const navT = useTranslations("shell.navigation");
	const session = useAuthSession();
	const queryClient = useQueryClient();
	const accountId = session?.role === "manager" ? session.accountId : null;
	const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
	const [editingAuditorId, setEditingAuditorId] = React.useState<string | null>(null);
	const [auditorPendingDelete, setAuditorPendingDelete] = React.useState<{
		id: string;
		label: string;
	} | null>(null);
	const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
	const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>([]);

	const auditorsQuery = useQuery({
		queryKey: ["playspace", "manager", "auditors", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.auditors(accountId);
		},
		enabled: accountId !== null
	});

	const projectsQuery = useQuery({
		queryKey: ["playspace", "manager", "auditors", "projects", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null
	});

	const placesQuery = useQuery({
		queryKey: ["playspace", "manager", "auditors", "places", accountId],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.places(accountId, { page: 1, pageSize: 100 });
		},
		enabled: accountId !== null
	});

	/**
	 * When project or place filters are active, fetch audits for those scopes and
	 * derive the set of auditor codes that have activity there.  Used to
	 * client-side filter the roster below.
	 */
	const hasActiveFilter = selectedProjectIds.length > 0 || selectedPlaceIds.length > 0;

	const filteredAuditorsQuery = useQuery({
		queryKey: [
			"playspace",
			"manager",
			"auditors",
			"filter-by-scope",
			accountId,
			selectedProjectIds,
			selectedPlaceIds
		],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			const result = await playspaceApi.accounts.audits(accountId, {
				projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
				placeIds: selectedPlaceIds.length > 0 ? selectedPlaceIds : undefined,
				page: 1,
				pageSize: 100
			});
			return new Set(result.items.map(a => a.auditor_code));
		},
		enabled: accountId !== null && hasActiveFilter
	});

	const createAuditor = useMutation({
		mutationFn: async (payload: AuditorDialogPayload) => playspaceApi.management.auditors.create(payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "auditors", accountId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "account", accountId, "auditors"]
			});
		}
	});

	const updateAuditor = useMutation({
		mutationFn: async (input: { auditorId: string; payload: AuditorDialogPayload }) =>
			playspaceApi.management.auditors.update(input.auditorId, input.payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "auditors", accountId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "account", accountId, "auditors"]
			});
			setEditingAuditorId(null);
		},
		retry: 0
	});

	const deleteAuditor = useMutation({
		mutationFn: async (auditorProfileId: string) => playspaceApi.management.auditors.delete(auditorProfileId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "auditors", accountId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "account", accountId, "auditors"]
			});
			setAuditorPendingDelete(null);
		}
	});

	const allAuditors = React.useMemo(() => auditorsQuery.data ?? [], [auditorsQuery.data]);
	const editingAuditor = allAuditors.find(auditor => auditor.id === editingAuditorId) ?? null;

	/** Apply project / place filter client-side using the scoped auditor-code set. */
	const auditors = React.useMemo((): AuditorSummary[] => {
		if (!hasActiveFilter) {
			return allAuditors;
		}
		const allowedCodes = filteredAuditorsQuery.data;
		if (!allowedCodes) {
			return allAuditors;
		}
		return allAuditors.filter(a => allowedCodes.has(a.auditor_code));
	}, [allAuditors, hasActiveFilter, filteredAuditorsQuery.data]);

	const activeAuditors = auditors.filter(auditor => auditor.last_active_at !== null).length;
	const totalAssignments = auditors.reduce((runningTotal, auditor) => runningTotal + auditor.assignments_count, 0);
	const completedAudits = auditors.reduce((runningTotal, auditor) => runningTotal + auditor.completed_audits, 0);

	const projectOptions = React.useMemo(() => {
		return (projectsQuery.data ?? []).map(p => ({ label: p.name, value: p.id }));
	}, [projectsQuery.data]);

	const placeOptions = React.useMemo(() => {
		return (placesQuery.data?.items ?? []).map((p: ManagerPlaceRow) => ({ label: p.name, value: p.id }));
	}, [placesQuery.data]);

	function clearAllFilters(): void {
		setSelectedProjectIds([]);
		setSelectedPlaceIds([]);
	}

	if (!accountId) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={workspaceT("manager")}
					title={t("header.title")}
					description={t("header.descriptionSecondary")}
					breadcrumbs={[
						{ label: navT("dashboard"), href: "/manager/dashboard" },
						{ label: navT("auditors") }
					]}
				/>
				<Card>
					<CardContent className="py-8">
						<p className="text-sm text-muted-foreground">{t("missingAccount.body")}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (auditorsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow={workspaceT("manager")}
					title={t("header.title")}
					description={t("header.descriptionSecondary")}
					breadcrumbs={[
						{ label: navT("dashboard"), href: "/manager/dashboard" },
						{ label: navT("auditors") }
					]}
				/>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={`auditor-stat-skeleton-${index}`}
							className="h-32 animate-pulse rounded-card border border-edge/40 bg-card"
						/>
					))}
				</div>
				<div className="h-[420px] animate-pulse rounded-card border border-edge/40 bg-card" />
			</div>
		);
	}

	if (auditorsQuery.isError) {
		return (
			<EmptyState
				title={t("error.title")}
				description={t("error.description")}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						{t("error.retry")}
					</Button>
				}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={workspaceT("manager")}
				title={t("header.title")}
				description={t("header.description")}
				breadcrumbs={[{ label: navT("dashboard"), href: "/manager/dashboard" }, { label: navT("auditors") }]}
				actions={
					<div className="flex gap-2">
						<Button type="button" variant="outline" className="gap-2" asChild>
							<Link href="/manager/reports">
								<FileTextIcon className="size-4" />
								<span>{t("actions.viewReports")}</span>
							</Link>
						</Button>
						<Button type="button" className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
							<PlusIcon className="size-4" />
							<span>{t("actions.inviteNewAuditor")}</span>
						</Button>
					</div>
				}
			/>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.total.title")}
					value={String(auditors.length)}
					helper={t("stats.total.helper")}
					tone="info"
				/>
				<StatCard
					title={t("stats.activeRecently.title")}
					value={String(activeAuditors)}
					helper={t("stats.activeRecently.helper")}
					tone="success"
				/>
				<StatCard
					title={t("stats.assignments.title")}
					value={String(totalAssignments)}
					helper={t("stats.assignments.helper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.completedAudits.title")}
					value={String(completedAudits)}
					helper={t("stats.completedAudits.helper")}
					tone="violet"
				/>
			</div>
			<AuditorsTable
				auditors={auditors}
				title={t("table.title")}
				description={t("table.description")}
				toolbarExtra={
					<>
						<FilterPopover
							title={t("filters.projects")}
							options={projectOptions}
							selectedValues={selectedProjectIds}
							onChange={setSelectedProjectIds}
						/>
						<FilterPopover
							title={t("filters.places")}
							options={placeOptions}
							selectedValues={selectedPlaceIds}
							onChange={setSelectedPlaceIds}
						/>
						{hasActiveFilter && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-1.5"
								onClick={clearAllFilters}>
								<XIcon className="size-3.5" />
								{t("filters.clear")}
							</Button>
						)}
					</>
				}
				getRowActions={auditor => [
					{
						label: t("rowActions.view"),
						href: `/manager/auditors/${encodeURIComponent(auditor.id)}`,
						icon: FolderOpenIcon
					},
					{
						label: t("rowActions.edit"),
						onSelect: () => setEditingAuditorId(auditor.id),
						icon: PencilLineIcon
					},
					{
						label: t("rowActions.delete"),
						onSelect: () =>
							setAuditorPendingDelete({
								id: auditor.id,
								label: `${auditor.auditor_code} · ${auditor.full_name}`
							}),
						icon: Trash2Icon,
						variant: "destructive"
					}
				]}
				emptyMessage={t("table.emptyMessage")}
			/>
			<AuditorDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				title={t("dialogs.create.title")}
				description={t("dialogs.create.description")}
				submitLabel={t("dialogs.create.submitLabel")}
				isPending={createAuditor.isPending}
				onSubmit={async (payload): Promise<AuditorCreatedSummary | undefined> => {
					const created = await createAuditor.mutateAsync(payload);
					return { auditorCode: created.auditor_code, email: payload.email };
				}}
			/>
			<AuditorDialog
				open={editingAuditorId !== null}
				onOpenChange={open => {
					if (!open) {
						setEditingAuditorId(null);
					}
				}}
				mode="edit"
				title={t("dialogs.edit.title")}
				description={t("dialogs.edit.description")}
				submitLabel={t("dialogs.edit.submitLabel")}
				initialValues={
					editingAuditor
						? {
								email: editingAuditor.email,
								fullName: editingAuditor.full_name,
								auditorCode: editingAuditor.auditor_code,
								role: editingAuditor.role,
								ageRange: editingAuditor.age_range,
								gender: editingAuditor.gender,
								country: editingAuditor.country
							}
						: undefined
				}
				isPending={updateAuditor.isPending}
				onSubmit={async (payload): Promise<AuditorCreatedSummary | undefined> => {
					if (!editingAuditorId) {
						throw new Error("Auditor context is unavailable.");
					}

					await updateAuditor.mutateAsync({
						auditorId: editingAuditorId,
						payload
					});
					return undefined;
				}}
			/>
			<ConfirmDialog
				open={auditorPendingDelete !== null}
				onOpenChange={open => {
					if (!open) {
						setAuditorPendingDelete(null);
					}
				}}
				title={t("deleteConfirm.title")}
				description={
					auditorPendingDelete
						? t("deleteConfirm.descriptionWithLabel", { label: auditorPendingDelete.label })
						: t("deleteConfirm.descriptionGeneric")
				}
				confirmLabel={t("deleteConfirm.confirmLabel")}
				isPending={deleteAuditor.isPending}
				onConfirm={() => {
					if (!auditorPendingDelete) {
						return;
					}

					deleteAuditor.mutate(auditorPendingDelete.id);
				}}
			/>
		</div>
	);
}
