"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpenIcon, PencilLineIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";

import { useAuthSession } from "@/components/app/auth-session-provider";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProjectDialog, type ProjectDialogPayload } from "@/components/dashboard/project-dialog";
import { ProjectsTable } from "@/components/dashboard/projects-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { playspaceApi } from "@/lib/api/playspace";

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return "Could not load projects.";
}

export default function ManagerProjectsPage() {
	const session = useAuthSession();
	const queryClient = useQueryClient();
	const accountId = session?.role === "manager" ? session.accountId : null;
	const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
	const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
	const [projectPendingDelete, setProjectPendingDelete] = React.useState<{
		id: string;
		name: string;
	} | null>(null);

	const projectsQuery = useQuery({
		queryKey: ["playspace", "account", accountId, "projects"],
		queryFn: async () => {
			if (!accountId) {
				throw new Error("Manager account context is unavailable.");
			}
			return playspaceApi.accounts.projects(accountId);
		},
		enabled: accountId !== null
	});

	const editingProjectQuery = useQuery({
		queryKey: ["playspace", "project", editingProjectId, "edit"],
		queryFn: async () => {
			if (!editingProjectId) {
				throw new Error("Project context is missing.");
			}

			return playspaceApi.projects.get(editingProjectId);
		},
		enabled: editingProjectId !== null
	});

	const createProject = useMutation({
		mutationFn: async (payload: ProjectDialogPayload & { account_id: string }) =>
			playspaceApi.management.projects.create(payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "account", accountId, "projects"]
			});
			setIsCreateDialogOpen(false);
		},
		retry: 0
	});

	const updateProject = useMutation({
		mutationFn: async (input: { projectId: string; payload: ProjectDialogPayload }) =>
			playspaceApi.management.projects.update(input.projectId, input.payload),
		onSuccess: async (_, variables) => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "account", accountId, "projects"]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", variables.projectId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", variables.projectId, "edit"]
			});
			setEditingProjectId(null);
		},
		retry: 0
	});

	const deleteProject = useMutation({
		mutationFn: async (projectId: string) => playspaceApi.management.projects.delete(projectId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "account", accountId, "projects"]
			});
			setProjectPendingDelete(null);
		}
	});

	const projects = projectsQuery.data ?? [];
	const activeProjectsCount = projects.filter(project => project.status === "active").length;
	const completedProjectsCount = projects.filter(project => project.status === "completed").length;
	const meanScoreAcrossProjects = (() => {
		const scoredProjects = projects.filter(
			(project): project is typeof project & { average_scores: { pv: number; u: number } } =>
				project.average_scores !== null
		);
		if (scoredProjects.length === 0) {
			return "Pending";
		}

		const totalPv = scoredProjects.reduce((runningTotal, project) => runningTotal + project.average_scores.pv, 0);
		const totalU = scoredProjects.reduce((runningTotal, project) => runningTotal + project.average_scores.u, 0);
		return `PV ${(Math.round((totalPv / scoredProjects.length) * 10) / 10).toString()} | U ${(
			Math.round((totalU / scoredProjects.length) * 10) / 10
		).toString()}`;
	})();

	if (!accountId) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow="Manager Workspace"
					title="Projects"
					description="Project-level tracking, stats, and place coverage across the account."
					breadcrumbs={[{ label: "Dashboard", href: "/manager/dashboard" }, { label: "Projects" }]}
				/>
				<Card>
					<CardContent className="py-8">
						<p className="text-sm text-muted-foreground">
							Manager account context is missing from the current session.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (projectsQuery.isLoading) {
		return (
			<div className="space-y-6">
				<DashboardHeader
					eyebrow="Manager Workspace"
					title="Projects"
					description="Project-level tracking, stats, and place coverage across the account."
					breadcrumbs={[{ label: "Dashboard", href: "/manager/dashboard" }, { label: "Projects" }]}
				/>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div
							key={`project-stat-skeleton-${index}`}
							className="h-32 animate-pulse rounded-card border border-edge/40 bg-card"
						/>
					))}
				</div>
				<div className="h-[420px] animate-pulse rounded-card border border-edge/40 bg-card" />
			</div>
		);
	}

	if (projectsQuery.isError) {
		return (
			<EmptyState
				title="Projects unavailable"
				description={getErrorMessage(projectsQuery.error)}
				action={
					<Button type="button" onClick={() => globalThis.location.reload()}>
						Try again
					</Button>
				}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow="Manager Workspace"
				title="Projects"
				description="Plan project scopes, monitor delivery health, and drill directly into operational place coverage."
				breadcrumbs={[{ label: "Dashboard", href: "/manager/dashboard" }, { label: "Projects" }]}
				actions={
					<Button type="button" className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
						<PlusIcon className="size-4" />
						<span>New project</span>
					</Button>
				}
			/>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Total Projects"
					value={String(projects.length)}
					helper="Planned and active project workstreams in this account."
					tone="info"
				/>
				<StatCard
					title="Active"
					value={String(activeProjectsCount)}
					helper="Projects currently underway."
					tone="warning"
				/>
				<StatCard
					title="Completed"
					value={String(completedProjectsCount)}
					helper="Projects with completed lifecycle status."
					tone="success"
				/>
				<StatCard
					title="Portfolio Mean"
					value={meanScoreAcrossProjects}
					helper="Average across projects with submitted scoring."
					tone="violet"
				/>
			</div>
			<ProjectsTable
				projects={projects}
				title="Project Portfolio"
				description="Sort, filter, and manage your audit programs without leaving the dashboard workspace."
				getRowActions={project => [
					{
						label: "Open project",
						href: `/manager/projects/${encodeURIComponent(project.id)}`,
						icon: FolderOpenIcon
					},
					{
						label: "Edit project",
						onSelect: () => setEditingProjectId(project.id),
						icon: PencilLineIcon
					},
					{
						label: "Delete project",
						onSelect: () =>
							setProjectPendingDelete({
								id: project.id,
								name: project.name
							}),
						icon: Trash2Icon,
						variant: "destructive"
					}
				]}
				emptyMessage={
					projects.length === 0
						? "No projects yet. Create your first audit workstream to start building the portfolio."
						: "No projects match the current filters."
				}
			/>
			<ProjectDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				title="Create project"
				description="Capture the core structure and planning metadata for a new audit program."
				submitLabel="Create project"
				isPending={createProject.isPending}
				onSubmit={async payload => {
					if (!accountId) {
						throw new Error("Manager account context is unavailable.");
					}

					await createProject.mutateAsync({
						account_id: accountId,
						...payload
					});
				}}
			/>
			<ProjectDialog
				open={editingProjectId !== null}
				onOpenChange={open => {
					if (!open) {
						setEditingProjectId(null);
					}
				}}
				title="Edit project"
				description={
					editingProjectQuery.isLoading
						? "Loading current project details..."
						: "Update project planning metadata and delivery context."
				}
				submitLabel="Save changes"
				initialValues={
					editingProjectQuery.data
						? {
								name: editingProjectQuery.data.name,
								overview: editingProjectQuery.data.overview,
								startDate: editingProjectQuery.data.start_date,
								endDate: editingProjectQuery.data.end_date,
								estimatedPlaces: editingProjectQuery.data.est_places,
								estimatedAuditors: editingProjectQuery.data.est_auditors,
								auditorDescription: editingProjectQuery.data.auditor_description
							}
						: undefined
				}
				isPending={editingProjectQuery.isLoading || updateProject.isPending}
				onSubmit={async payload => {
					if (!editingProjectId) {
						throw new Error("Project context is unavailable.");
					}

					await updateProject.mutateAsync({
						projectId: editingProjectId,
						payload
					});
				}}
			/>
			<ConfirmDialog
				open={projectPendingDelete !== null}
				onOpenChange={open => {
					if (!open) {
						setProjectPendingDelete(null);
					}
				}}
				title="Delete project"
				description={
					projectPendingDelete
						? `Delete "${projectPendingDelete.name}"? This action cannot be undone.`
						: "Delete this project? This action cannot be undone."
				}
				confirmLabel="Delete project"
				isPending={deleteProject.isPending}
				onConfirm={() => {
					if (!projectPendingDelete) {
						return;
					}

					deleteProject.mutate(projectPendingDelete.id);
				}}
			/>
		</div>
	);
}
