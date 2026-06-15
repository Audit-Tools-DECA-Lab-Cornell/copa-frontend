"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLineIcon, PlusIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { use } from "react";

import { AssignAuditorDialog } from "@/components/dashboard/assign-auditor-dialog";
import { BackButton } from "@/components/dashboard/back-button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PlaceSheet, type PlaceSheetPayload } from "@/components/dashboard/place-sheet";
import { PlacesTable } from "@/components/dashboard/places-table";
import { ProjectDialog, type ProjectDialogPayload } from "@/components/dashboard/project-dialog";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDateLabel, formatProjectDateRange, formatScorePairLabel } from "@/components/dashboard/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { playspaceApi, PlayspaceType } from "@/lib/api/playspace";

interface ManagerProjectDetailPageProps {
	params: Promise<{
		projectId: string;
	}>;
}

const PROJECT_DETAIL_SKELETON_IDS = [
	"project-detail-skeleton-1",
	"project-detail-skeleton-2",
	"project-detail-skeleton-3",
	"project-detail-skeleton-4"
] as const;

function getErrorMessage(error: unknown, fallbackMessage: string): string {
	if (error instanceof Error) {
		return error.message;
	}

	return fallbackMessage;
}

export default function ManagerProjectDetailPage({ params }: Readonly<ManagerProjectDetailPageProps>) {
	const t = useTranslations("manager.projectDetail");
	const formatT = useTranslations("common.format");
	const projectParams = use(params);
	const projectId = projectParams.projectId;
	const queryClient = useQueryClient();
	const [isPlaceSheetOpen, setIsPlaceSheetOpen] = React.useState(false);
	const [isProjectDialogOpen, setIsProjectDialogOpen] = React.useState(false);
	const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
	const [placePendingDelete, setPlacePendingDelete] = React.useState<{
		id: string;
		name: string;
	} | null>(null);

	const projectQuery = useQuery({
		queryKey: ["playspace", "project", projectId],
		queryFn: () => playspaceApi.projects.get(projectId)
	});

	const projectStatsQuery = useQuery({
		queryKey: ["playspace", "project", projectId, "stats"],
		queryFn: () => playspaceApi.projects.stats(projectId)
	});

	const projectPlacesQuery = useQuery({
		queryKey: ["playspace", "project", projectId, "places"],
		queryFn: () => playspaceApi.projects.places(projectId)
	});

	const createPlace = useMutation({
		mutationFn: async (payload: PlaceSheetPayload & { project_ids: string[] }) =>
			playspaceApi.management.places.create({
				...payload,
				place_type: payload.place_type as PlayspaceType | null
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", projectId, "places"]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", projectId, "stats"]
			});
			setIsPlaceSheetOpen(false);
		}
	});

	const updateProject = useMutation({
		mutationFn: async (payload: ProjectDialogPayload) =>
			playspaceApi.management.projects.update(projectId, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", projectId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", projectId, "stats"]
			});
			setIsProjectDialogOpen(false);
		},
		retry: 0
	});

	const deletePlace = useMutation({
		mutationFn: async (placeId: string) => playspaceApi.management.places.delete(placeId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", projectId, "places"]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "project", projectId, "stats"]
			});
			setPlacePendingDelete(null);
		}
	});

	if (projectQuery.isLoading || projectStatsQuery.isLoading || projectPlacesQuery.isLoading) {
		return (
			<div className="space-y-6">
				<div className="h-20 animate-pulse rounded-card border border-edge/40 bg-card" />
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{PROJECT_DETAIL_SKELETON_IDS.map(skeletonId => {
						return (
							<div
								key={skeletonId}
								className="h-36 animate-pulse rounded-card border border-edge/40 bg-card"
							/>
						);
					})}
				</div>
				<div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />
			</div>
		);
	}

	if (projectQuery.isError || projectStatsQuery.isError || projectPlacesQuery.isError) {
		const error = projectQuery.error ?? projectStatsQuery.error ?? projectPlacesQuery.error;

		return (
			<EmptyState
				title={t("error.title")}
				description={getErrorMessage(error, t("error.description"))}
				action={<BackButton href="/manager/projects" label={t("actions.backToProjects")} />}
			/>
		);
	}

	if (!projectQuery.data || !projectStatsQuery.data || !projectPlacesQuery.data) {
		return (
			<div className="space-y-6">
				<div className="h-20 animate-pulse rounded-card border border-edge/40 bg-card" />
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{PROJECT_DETAIL_SKELETON_IDS.map(skeletonId => {
						return (
							<div
								key={skeletonId}
								className="h-36 animate-pulse rounded-card border border-edge/40 bg-card"
							/>
						);
					})}
				</div>
				<div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />
			</div>
		);
	}

	const project = projectQuery.data;
	const stats = projectStatsQuery.data;
	const places = projectPlacesQuery.data;
	const placeTypeLabel = project.place_types?.length > 0 ? project.place_types : [t("overview.placeTypesPending")];

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={project.name}
				description={project.overview ?? t("header.overviewPending")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
					{ label: t("breadcrumbs.projects"), href: "/manager/projects" },
					{ label: project.name }
				]}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={() => setIsProjectDialogOpen(true)}>
							<PencilLineIcon className="size-4" />
							<span>{t("actions.editProject")}</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={() => setIsAssignDialogOpen(true)}>
							<UserPlusIcon className="size-4" />
							<span>Assign Auditor</span>
						</Button>
						<Button type="button" className="gap-2" onClick={() => setIsPlaceSheetOpen(true)}>
							<PlusIcon className="size-4" />
							<span>{t("actions.newPlace")}</span>
						</Button>
					</div>
				}
			/>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("stats.places.title")}
					value={String(stats.places_count)}
					helper={t("stats.places.helper", { count: stats.places_with_audits })}
				/>
				<StatCard
					title={t("stats.auditsCompleted.title")}
					value={String(stats.audits_completed)}
					helper={t("stats.auditsCompleted.helper", { count: stats.in_progress_audits })}
					tone="success"
				/>
				<StatCard
					title={t("stats.auditorsAssigned.title")}
					value={String(stats.auditors_count)}
					helper={t("stats.auditorsAssigned.helper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.overallMeanScore.title")}
					value={formatScorePairLabel(stats.average_scores, formatT)}
					helper={t("stats.overallMeanScore.helper")}
					tone="info"
				/>
			</div>
			<Tabs defaultValue="overview" className="gap-4">
				<TabsList variant="line" className="w-full justify-start">
					<TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
					<TabsTrigger value="places">{t("tabs.places")}</TabsTrigger>
				</TabsList>
				<TabsContent value="overview">
					<div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
						<Card>
							<CardHeader>
								<CardTitle>{t("overview.title")}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-5">
								<div className="flex flex-wrap gap-2">
									{placeTypeLabel?.map(placeType => (
										<Badge
											key={placeType}
											variant="outline"
											style={{ textTransform: "capitalize" }}>
											{placeType}
										</Badge>
									))}
								</div>
								<div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
									<div className="space-y-1">
										<p className="font-medium text-foreground">{t("overview.timeline")}</p>
										<p>{formatProjectDateRange(project, formatT)}</p>
									</div>
									<div className="space-y-1">
										<p className="font-medium text-foreground">{t("overview.estimatedPlaces")}</p>
										<p>{project.est_places ?? formatT("pending")}</p>
									</div>
									<div className="space-y-1">
										<p className="font-medium text-foreground">{t("overview.estimatedAuditors")}</p>
										<p>{project.est_auditors ?? formatT("pending")}</p>
									</div>
									<div className="space-y-1">
										<p className="font-medium text-foreground">{t("overview.created")}</p>
										<p className="tabular-nums">{formatDateLabel(project.created_at, formatT)}</p>
									</div>
								</div>
								<div className="space-y-1">
									<p className="font-medium text-foreground">{t("overview.auditorGuidance")}</p>
									<p className="text-sm text-muted-foreground">
										{project.auditor_description ?? t("overview.auditorGuidancePending")}
									</p>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>{t("deliverySignals.title")}</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="rounded-field border border-edge/40 bg-muted/40 p-4">
									<p className="text-sm font-medium text-foreground">
										{t("deliverySignals.currentSubmittedMeanScore")}
									</p>
									<p className="mt-2 font-mono text-3xl text-foreground">
										{formatScorePairLabel(stats.average_scores, formatT)}
									</p>
								</div>
								<div className="grid gap-3 text-sm text-muted-foreground">
									<p>{t("deliverySignals.placesWithAudits", { count: stats.places_with_audits })}</p>
									<p>{t("deliverySignals.auditsInProgress", { count: stats.in_progress_audits })}</p>
									<p>{t("deliverySignals.auditorsAssigned", { count: stats.auditors_count })}</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
				<TabsContent value="places">
					<PlacesTable
						places={places}
						title={t("placesTable.title")}
						description={t("placesTable.description")}
						getRowActions={place => [
							{
								label: t("placesTable.actions.openPlace"),
								href: `/manager/places/${encodeURIComponent(place.id)}?projectId=${encodeURIComponent(projectId)}`
							},
							{
								label: t("placesTable.actions.deletePlace"),
								onSelect: () => {
									setPlacePendingDelete({
										id: place.id,
										name: place.name
									});
								},
								icon: Trash2Icon,
								variant: "destructive"
							}
						]}
						emptyMessage={t("placesTable.emptyMessage")}
					/>
				</TabsContent>
			</Tabs>
			<ProjectDialog
				open={isProjectDialogOpen}
				onOpenChange={setIsProjectDialogOpen}
				title={t("projectDialog.title")}
				description={t("projectDialog.description")}
				submitLabel={t("projectDialog.submitLabel")}
				initialValues={{
					name: project.name,
					overview: project.overview,
					startDate: project.start_date,
					endDate: project.end_date,
					estimatedPlaces: project.est_places,
					estimatedAuditors: project.est_auditors,
					auditorDescription: project.auditor_description
				}}
				isPending={updateProject.isPending}
				onSubmit={async payload => {
					await updateProject.mutateAsync(payload);
				}}
			/>
			<PlaceSheet
				open={isPlaceSheetOpen}
				onOpenChange={setIsPlaceSheetOpen}
				title={t("placeSheet.title")}
				description={t("placeSheet.description")}
				submitLabel={t("placeSheet.submitLabel")}
				isPending={createPlace.isPending}
				onSubmit={async payload => {
					await createPlace.mutateAsync({
						project_ids: [projectId],
						...payload
					});
				}}
			/>
			<ConfirmDialog
				open={placePendingDelete !== null}
				onOpenChange={open => {
					if (!open) {
						setPlacePendingDelete(null);
					}
				}}
				title={t("confirmDelete.title")}
				description={
					placePendingDelete
						? t("confirmDelete.descriptionWithName", { name: placePendingDelete.name })
						: t("confirmDelete.description")
				}
				confirmLabel={t("confirmDelete.confirmLabel")}
				isPending={deletePlace.isPending}
				onConfirm={() => {
					if (!placePendingDelete) {
						return;
					}

					deletePlace.mutate(placePendingDelete.id);
				}}
			/>
			<AssignAuditorDialog
				open={isAssignDialogOpen}
				onOpenChange={setIsAssignDialogOpen}
				prefill={{ projectId }}
				onAssigned={() => {
					void queryClient.invalidateQueries({
						queryKey: ["playspace", "project", projectId, "stats"]
					});
				}}
			/>
		</div>
	);
}
