"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { AuditsTable } from "@/components/dashboard/audits-table";
import { BackButton } from "@/components/dashboard/back-button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PlaceReportsCard } from "@/components/dashboard/place-reports-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatScorePairLabel } from "@/components/dashboard/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { playspaceApi } from "@/lib/api/playspace";

function buildStaticMapUrl(lat: number, lng: number): string | null {
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const p = new URLSearchParams({
		height: "300",
		lat: String(lat),
		lng: String(lng),
		scale: "2",
		width: "640",
		zoom: "15"
	});
	return `/api/google-maps/static-map?${p.toString()}`;
}

export default function AdminPlaceDetailPage() {
	const params = useParams<{ placeId: string }>();
	const searchParams = useSearchParams();
	const formatT = useTranslations("common.format");
	const placeId = params.placeId;
	const projectId = searchParams.get("projectId");

	const historyQuery = useQuery({
		queryKey: ["playspace", "admin", "placeHistory", projectId, placeId],
		queryFn: () => {
			if (!projectId) throw new Error("Project context is required.");
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
					<CardTitle>Place not found</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">Unable to load place details.</p>
					<BackButton href="/admin/places" label="Back to Places" />
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

	const hasCoords =
		history.lat !== null && history.lat !== undefined && history.lng !== null && history.lng !== undefined;
	const mapUrl = hasCoords ? buildStaticMapUrl(history.lat as number, history.lng as number) : null;
	const locationParts = [history.city, history.province, history.country].filter(
		(p): p is string => typeof p === "string" && p.trim().length > 0
	);

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow="Administrator Workspace"
				title={history.place_name}
				description={history.project_name}
				breadcrumbs={[
					{ label: "Dashboard", href: "/admin/dashboard" },
					{ label: "Places", href: "/admin/places" },
					{ label: history.place_name }
				]}
				actions={<BackButton href="/admin/places" label="Back to Places" />}
			/>

			<Card>
				<CardContent className="space-y-2 py-4">
					<p className="font-medium">
						<span className="text-muted-foreground">Project: </span>
						{history.project_name}
					</p>
					{history.address && (
						<div className="flex items-start gap-1.5">
							<MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">{history.address}</p>
						</div>
					)}
					{locationParts.length > 0 && (
						<p className="text-sm text-muted-foreground">{locationParts.join(", ")}</p>
					)}
				</CardContent>
			</Card>

			{hasCoords && mapUrl && (
				<Card className="overflow-hidden">
					<CardContent className="p-0">
						<Image
							src={mapUrl}
							alt={`Map of ${history.place_name}`}
							width={640}
							height={240}
							className="h-[240px] w-full object-cover"
							unoptimized
						/>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title="Total Audits"
					value={String(history.total_audits)}
					helper="All submissions for this place"
				/>
				<StatCard
					title="Submitted"
					value={String(history.submitted_audits)}
					helper="Completed submissions"
					tone="success"
				/>
				<StatCard
					title="In Progress"
					value={String(history.in_progress_audits)}
					helper="Active draft sessions"
					tone="warning"
				/>
				<StatCard
					title="Overall PV/U"
					value={formatScorePairLabel(history.overall_scores, formatT)}
					helper="Combined place rollup"
					tone="violet"
				/>
			</div>

			<AuditsTable
				rows={auditRows}
				basePath="/admin/audits"
				title="Submission History"
				description="All submissions for this place."
				pageSize={8}
				emptyMessage="No submissions yet."
			/>

			<PlaceReportsCard
				placeId={placeId}
				projectId={projectId ?? ""}
				savedReports={history.saved_place_reports ?? []}
				rolePrefix="admin"
			/>
		</div>
	);
}
