"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MapPin, PencilLineIcon, UserPlusIcon } from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { AssignAuditorDialog } from "@/components/dashboard/assign-auditor-dialog";
import { AuditsTable } from "@/components/dashboard/audits-table";
import { BackButton } from "@/components/dashboard/back-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PlaceReportsCard } from "@/components/dashboard/place-reports-card";
import { PlaceSheet, type PlaceSheetPayload } from "@/components/dashboard/place-sheet";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatDateTimeLabel, formatScorePairLabel } from "@/components/dashboard/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { playspaceApi, PlayspaceType } from "@/lib/api/playspace";

/**
 * Build an internal static-map proxy URL centered on the given coordinates.
 */
function buildStaticMapUrl(lat: number, lng: number): string | null {
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const params = new URLSearchParams({
		height: "300",
		lat: String(lat),
		lng: String(lng),
		scale: "2",
		width: "640",
		zoom: "15"
	});
	return `/api/google-maps/static-map?${params.toString()}`;
}

/**
 * Build a Google Maps search URL for the given coordinates.
 * Used to open the location in a new tab.
 */
function buildMapsSearchUrl(lat: number, lng: number, placeName: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeName} ${lat},${lng}`)}`;
}

export default function ManagerPlaceDetailPage() {
	const t = useTranslations("manager.placeDetail");
	const formatT = useTranslations("common.format");
	const params = useParams<{ placeId: string }>();
	const searchParams = useSearchParams();
	const placeId = params.placeId;
	const projectId = searchParams.get("projectId");

	const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
	const [isPlaceSheetOpen, setIsPlaceSheetOpen] = React.useState(false);
	const queryClient = useQueryClient();

	const placeQuery = useQuery({
		queryKey: ["playspace", "manager", "placeDetail", placeId],
		queryFn: () => playspaceApi.management.places.get(placeId),
		enabled: typeof placeId === "string" && placeId.length > 0
	});

	const updatePlaceMutation = useMutation({
		mutationFn: async (payload: PlaceSheetPayload) =>
			playspaceApi.management.places.update(placeId, {
				...payload,
				place_type: payload.place_type as PlayspaceType | null
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "placeDetail", placeId]
			});
			await queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "placeHistory", projectId, placeId]
			});
			setIsPlaceSheetOpen(false);
		}
	});

	const historyQuery = useQuery({
		queryKey: ["playspace", "manager", "placeHistory", projectId, placeId],
		queryFn: () => {
			if (!projectId) {
				throw new Error("Project context is required.");
			}
			return playspaceApi.places.history(placeId, projectId);
		},
		enabled:
			typeof placeId === "string" && placeId.length > 0 && typeof projectId === "string" && projectId.length > 0
	});
	const history = historyQuery.data;

	if (historyQuery.isLoading) {
		return <div className="h-64 animate-pulse rounded-card border border-edge/40 bg-card" />;
	}

	if (historyQuery.isError || !history) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("error.title")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">{t("error.description")}</p>
					<BackButton href="/manager/places" label={t("actions.backToPlaces")} />
				</CardContent>
			</Card>
		);
	}

	const auditRows = history.audits.map(audit => ({
		id: audit.audit_id,
		auditCode: audit.audit_code,
		status: audit.status,
		auditorCode: audit.auditor_code,
		placeName: history.place_name,
		startedAt: audit.started_at,
		submittedAt: audit.submitted_at,
		score: audit.summary_score,
		scorePair: audit.score_pair
	}));

	const hasCoordinates =
		history.lat !== null && history.lat !== undefined && history.lng !== null && history.lng !== undefined;

	const locationParts = [history.city, history.province, history.country].filter(
		(part): part is string => typeof part === "string" && part.trim().length > 0
	);
	const locationLabel = locationParts.join(", ");
	const mapUrl = hasCoordinates ? buildStaticMapUrl(history.lat as number, history.lng as number) : null;
	const mapsSearchUrl = hasCoordinates
		? buildMapsSearchUrl(history.lat as number, history.lng as number, history.place_name)
		: null;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={history.place_name}
				description={t("header.description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/manager/dashboard" },
					{ label: t("breadcrumbs.places"), href: "/manager/places" },
					{ label: history.place_name }
				]}
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<BackButton href="/manager/places" label={t("actions.backToPlaces")} />
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={() => setIsPlaceSheetOpen(true)}>
							<PencilLineIcon className="size-4" />
							<span>{t("actions.editPlace")}</span>
						</Button>
						<Button type="button" className="gap-2" onClick={() => setIsAssignDialogOpen(true)}>
							<UserPlusIcon className="size-4" />
							<span>Assign Auditor</span>
						</Button>
					</div>
				}
			/>

			{/* ── Place identity card ── */}
			<Card>
				<CardContent className="space-y-2 py-4">
					<p className="font-medium text-foreground">
						<span className="text-muted-foreground">Project: </span>
						{history.project_name}
					</p>
					{history.address ? (
						<div className="flex items-start gap-1.5">
							<MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">{history.address}</p>
						</div>
					) : null}
					{locationLabel ? <p className="text-sm text-muted-foreground">{locationLabel}</p> : null}
					{history.postal_code ? (
						<p className="text-xs text-muted-foreground/70">{history.postal_code}</p>
					) : null}
				</CardContent>
			</Card>

			{/* ── Map card ── */}
			{hasCoordinates ? (
				<Card className="overflow-hidden">
					<CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
						<div className="space-y-0.5">
							<CardTitle className="text-base">Location</CardTitle>
							<p className="text-xs text-muted-foreground">
								{(history.lat as number).toFixed(6)}, {(history.lng as number).toFixed(6)}
							</p>
						</div>
						{mapsSearchUrl ? (
							<Button asChild variant="outline" size="sm" className="gap-1.5">
								<a href={mapsSearchUrl} target="_blank" rel="noopener noreferrer">
									<ExternalLink className="size-3.5" />
									Open in Google Maps
								</a>
							</Button>
						) : null}
					</CardHeader>
					<CardContent className="p-0">
						{mapUrl ? (
							<Image
								src={mapUrl}
								alt={`Map showing the location of ${history.place_name}`}
								width={640}
								height={240}
								className="h-[240px] w-full object-cover"
								unoptimized
							/>
						) : null}
					</CardContent>
				</Card>
			) : null}

			{/* ── KPI stats ── */}
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
				<StatCard
					title={t("stats.totalAudits.title")}
					value={String(history.total_audits)}
					helper={t("stats.totalAudits.helper")}
				/>
				<StatCard
					title={t("stats.submitted.title")}
					value={String(history.submitted_audits)}
					helper={t("stats.submitted.helper")}
					tone="success"
				/>
				<StatCard
					title={t("stats.inProgress.title")}
					value={String(history.in_progress_audits)}
					helper={t("stats.inProgress.helper")}
					tone="warning"
				/>
				<StatCard
					title={t("stats.latestSubmitted.title")}
					value={
						history.latest_submitted_at
							? formatDateTimeLabel(history.latest_submitted_at, formatT)
							: formatT("pending")
					}
					valueClassName="font-sans text-lg leading-snug md:text-xl"
					helper={t("stats.latestSubmitted.helper")}
					tone="success"
				/>
			</div>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<StatCard
					title="Overall PV"
					value={history.overall_scores ? `${history.overall_scores.pv}` : formatT("pending")}
					helper="Combined place rollup"
				/>
				<StatCard
					title="Overall U"
					value={history.overall_scores ? `${history.overall_scores.u}` : formatT("pending")}
					helper="Combined place rollup"
				/>
				<StatCard
					title="Audit Mean PV"
					value={history.audit_mean_scores ? `${history.audit_mean_scores.pv}` : formatT("pending")}
					helper="Audit-side coverage"
				/>
				<StatCard
					title="Audit Mean U"
					value={history.audit_mean_scores ? `${history.audit_mean_scores.u}` : formatT("pending")}
					helper="Audit-side coverage"
				/>
				<StatCard
					title="Survey Mean PV"
					value={history.survey_mean_scores ? `${history.survey_mean_scores.pv}` : formatT("pending")}
					helper="Survey-side coverage"
				/>
				<StatCard
					title="Survey Mean U"
					value={history.survey_mean_scores ? `${history.survey_mean_scores.u}` : formatT("pending")}
					helper="Survey-side coverage"
				/>
			</div>

			<AuditsTable
				rows={auditRows}
				basePath="/manager/audits"
				title={t("table.title")}
				description={t("table.description")}
				pageSize={8}
				emptyMessage={t("table.emptyMessage")}
			/>

			{/* Place Reports */}
			<PlaceReportsCard
				placeId={placeId}
				projectId={projectId ?? ""}
				savedReports={history.saved_place_reports ?? []}
				rolePrefix="manager"
			/>

			<AssignAuditorDialog
				open={isAssignDialogOpen}
				onOpenChange={setIsAssignDialogOpen}
				prefill={{
					projectId: projectId ?? undefined,
					placeIds: [placeId]
				}}
			/>

			<PlaceSheet
				open={isPlaceSheetOpen}
				onOpenChange={setIsPlaceSheetOpen}
				title={t("actions.editPlace")}
				description="Update location details and settings."
				submitLabel="Save changes"
				initialValues={
					placeQuery.data
						? {
							name: placeQuery.data.name,
							address: placeQuery.data.address,
							city: placeQuery.data.city,
							province: placeQuery.data.province,
							country: placeQuery.data.country,
							postalCode: placeQuery.data.postal_code,
							placeType: placeQuery.data.place_type,
							latitude: placeQuery.data.lat,
							longitude: placeQuery.data.lng,
							startDate: placeQuery.data.start_date,
							endDate: placeQuery.data.end_date,
							estimatedAuditors: placeQuery.data.est_auditors,
							auditorDescription: placeQuery.data.auditor_description
						}
						: undefined
				}
				isPending={updatePlaceMutation.isPending}
				onSubmit={async payload => {
					await updatePlaceMutation.mutateAsync(payload);
				}}
			/>
		</div>
	);
}
