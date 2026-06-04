"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileTextIcon, PlusCircleIcon, Trash2Icon, ExternalLinkIcon, LayersIcon } from "lucide-react";

import type { SavedPlaceReportEntry } from "@/lib/api/playspace";
import { playspaceApi } from "@/lib/api/playspace";
import { getPlaceReportCopy, getPlaceReportSourceCountLabel } from "@/components/dashboard/place-report-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PlaceReportsCardProps {
	placeId: string;
	projectId: string;
	savedReports: SavedPlaceReportEntry[];
	rolePrefix: "admin" | "manager";
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? iso
		: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Keep long UUID-based source identifiers scan-friendly inside saved report cards.
 */
function formatShortSourceId(value: string): string {
	return `${value.slice(0, 8)}…`;
}

export function PlaceReportsCard({ placeId, projectId, savedReports, rolePrefix }: PlaceReportsCardProps) {
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		mutationFn: (index: number) => playspaceApi.management.places.deletePlaceReport(placeId, index),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["playspace", rolePrefix, "placeHistory"] });
			void queryClient.invalidateQueries({
				queryKey: ["playspace", "manager", "placeHistory", projectId, placeId]
			});
		}
	});

	function buildReportHref(report: SavedPlaceReportEntry): string {
		const base = `/${rolePrefix}/reports/place-report`;
		if (report.report_type === "combined" && report.audit_id && report.survey_id) {
			return `${base}?audit=${report.audit_id}&survey=${report.survey_id}&placeId=${placeId}`;
		}
		if (report.submission_id) {
			return `${base}?submission=${report.submission_id}&placeId=${placeId}`;
		}
		return base;
	}

	function buildNewReportHref(): string {
		return `/${rolePrefix}/reports?placeId=${placeId}`;
	}

	return (
		<Card className="overflow-hidden">
			<CardHeader className="border-b-2 border-edge/50 bg-muted/25">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<FileTextIcon className="size-4" />
							Place Reports
						</CardTitle>
						<CardDescription>
							Saved report combinations for this place. Go to{" "}
							<Link
								href={buildNewReportHref()}
								className="underline underline-offset-2 hover:text-foreground">
								Reports
							</Link>{" "}
							to build a new one.
						</CardDescription>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href={buildNewReportHref()}>
							<PlusCircleIcon data-icon="inline-start" />
							Build Report
						</Link>
					</Button>
				</div>
			</CardHeader>

			{savedReports.length > 0 && (
				<>
					<Separator />
					<CardContent className="pt-4">
						<div className="grid gap-3 lg:grid-cols-2">
							{savedReports.map((report, index) => {
								const reportCopy = getPlaceReportCopy(report.report_type);
								const sourceCountLabel = getPlaceReportSourceCountLabel(report.report_type);

								return (
									<div
										key={`${report.report_type}-${report.created_at}-${index}`}
										className="flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/35 hover:bg-accent/20">
										<div className="flex items-start gap-3">
											<div className="rounded-lg bg-primary/10 p-2 text-primary">
												<LayersIcon className="size-4" />
											</div>
											<div className="min-w-0 flex-1 space-y-3">
												<div className="flex flex-wrap items-center gap-2">
													<Badge
														variant={
															report.report_type === "combined" ? "default" : "secondary"
														}>
														{reportCopy.title}
													</Badge>
													<Badge variant="outline">{sourceCountLabel}</Badge>
													<span className="text-xs text-muted-foreground">
														Saved {formatDate(report.created_at)}
													</span>
												</div>
												<p className="text-sm text-muted-foreground">
													{reportCopy.savedCardDescription}
												</p>
												{report.report_type === "combined" &&
													report.audit_id &&
													report.survey_id && (
														<p className="font-mono text-xs text-muted-foreground">
															Audit {formatShortSourceId(report.audit_id)} · Survey{" "}
															{formatShortSourceId(report.survey_id)}
														</p>
													)}
												{report.report_type === "full_assessment" && report.submission_id && (
													<p className="font-mono text-xs text-muted-foreground">
														Submission {formatShortSourceId(report.submission_id)}
													</p>
												)}
											</div>
										</div>
										<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
											<Button asChild variant="outline" size="sm">
												<Link href={buildReportHref(report)}>
													<ExternalLinkIcon data-icon="inline-start" />
													Open report
												</Link>
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={deleteMutation.isPending}
												onClick={() => deleteMutation.mutate(index)}
												className="text-destructive hover:text-destructive">
												<Trash2Icon data-icon="inline-start" />
												Remove
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</>
			)}

			{savedReports.length === 0 && (
				<CardContent className="py-10 text-center">
					<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
						<FileTextIcon className="size-5" />
					</div>
					<p className="mt-3 text-sm font-medium">No place reports saved yet</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Build one from the Reports page and save the selected combination here.
					</p>
				</CardContent>
			)}
		</Card>
	);
}
