"use client";

import * as React from "react";
import { CheckCircle2Icon, DownloadIcon, Loader2Icon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { playspaceApi } from "@/lib/api/playspace";
import { triggerBlobDownload } from "@/components/dashboard/raw-data-export";
import type { AuditExportDataFormat } from "@/lib/export/audit";
import { estimateRawDataExport } from "@/lib/export/export-estimator";
import type { ExportProgress, ExportZipResult } from "@/lib/export/raw-data-zip";

/** What a page's export closure resolves to. */
export interface ExportRunResult {
	readonly result: ExportZipResult;
	readonly fileName: string;
}

/** A unit of export work handed to the provider. */
export interface ExportJobDescriptor {
	readonly label: string;
	readonly entity: "audits" | "reports" | "places" | "projects";
	readonly format: AuditExportDataFormat;
	/**
	 * Runs the fetch + ZIP generation. Provided by the page but executed here, in
	 * the provider, which is mounted above the router - so generation continues
	 * across client-side navigation. A full page reload still cancels it.
	 */
	readonly run: (onProgress: (progress: ExportProgress) => void) => Promise<ExportRunResult>;
}

export interface ExportJob {
	readonly id: string;
	readonly label: string;
	readonly entity: string;
	readonly status: "running" | "done" | "error" | "interrupted";
	readonly progress: ExportProgress | null;
	readonly startedAt: number;
	readonly finishedAt: number | null;
	readonly error: string | null;
}

interface ExportJobsContextValue {
	readonly jobs: readonly ExportJob[];
	readonly activeCount: number;
	startExport: (descriptor: ExportJobDescriptor) => Promise<void>;
	dismiss: (id: string) => void;
}

const ExportJobsContext = React.createContext<ExportJobsContextValue | null>(null);

const STORAGE_KEY = "playspace.exportJobs.v1";
const MAX_HISTORY = 20;
const AUTO_DISMISS_FINISHED_MS = 7000;

/** Access the export-jobs controller. Throws if used outside the provider. */
export function useExportJobs(): ExportJobsContextValue {
	const ctx = React.useContext(ExportJobsContext);
	if (ctx === null) {
		throw new Error("useExportJobs must be used within an ExportJobsProvider.");
	}
	return ctx;
}

function newJobId(): string {
	const uuid = globalThis.crypto?.randomUUID?.();
	return uuid ?? `job-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function ExportJobsProvider({ children }: { children: React.ReactNode }) {
	const [jobs, setJobs] = React.useState<ExportJob[]>([]);

	// Hydrate history once, after mount. localStorage is unavailable during SSR and
	// a lazy initial state would cause a hydration mismatch, so the one-time
	// post-mount setState is the correct pattern here. Jobs persisted as "running"
	// cannot have survived a full reload (their in-memory promise is gone), so they
	// are marked interrupted.
	React.useEffect(() => {
		try {
			const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
			if (raw === null || raw === undefined) return;
			const parsed = JSON.parse(raw) as ExportJob[];
			// eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from persisted storage
			setJobs(parsed.map(job => (job.status === "running" ? { ...job, status: "interrupted" } : job)));
		} catch {
			// Ignore malformed storage.
		}
	}, []);

	React.useEffect(() => {
		try {
			globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, MAX_HISTORY)));
		} catch {
			// Storage is best-effort.
		}
	}, [jobs]);

	const patchJob = React.useCallback((id: string, patch: Partial<ExportJob>) => {
		setJobs(prev => prev.map(job => (job.id === id ? { ...job, ...patch } : job)));
	}, []);

	const startExport = React.useCallback(
		async (descriptor: ExportJobDescriptor) => {
			const id = newJobId();
			const job: ExportJob = {
				id,
				label: descriptor.label,
				entity: descriptor.entity,
				status: "running",
				progress: { phase: "preparing", current: 0, total: 0, percent: 0 },
				startedAt: Date.now(),
				finishedAt: null,
				error: null
			};
			setJobs(prev => [job, ...prev].slice(0, MAX_HISTORY));

			try {
				const { result, fileName } = await descriptor.run(progress => patchJob(id, { progress }));
				triggerBlobDownload(result.blob, fileName);
				patchJob(id, {
					status: "done",
					finishedAt: Date.now(),
					progress: { phase: "done", current: 0, total: 0, percent: 100 }
				});

				// Email a completion notice only for large exports - the ones the user
				// is likely to have stepped away from. The threshold matches the
				// immediate-vs-background estimate.
				const richCount = result.auditCount + result.combinedReportCount;
				if (estimateRawDataExport(richCount).requiresBackground) {
					try {
						await playspaceApi.exports.notifyReady({
							entity: descriptor.entity,
							format: descriptor.format,
							audit_count: result.auditCount,
							combined_report_count: result.combinedReportCount,
							had_failures: result.failureCount > 0
						});
					} catch {
						// Email is best-effort; never surface as an export failure.
					}
				}
			} catch (error) {
				patchJob(id, {
					status: "error",
					finishedAt: Date.now(),
					error: error instanceof Error ? error.message : "Export failed."
				});
			}
		},
		[patchJob]
	);

	const dismiss = React.useCallback((id: string) => {
		setJobs(prev => prev.filter(job => job.id !== id));
	}, []);

	React.useEffect(() => {
		const finishedIds = jobs
			.filter(job => job.status !== "running" && job.finishedAt !== null)
			.map(job => ({ id: job.id, remainingMs: AUTO_DISMISS_FINISHED_MS - (Date.now() - job.finishedAt!) }));

		if (finishedIds.length === 0) return;

		const timers = finishedIds.map(({ id, remainingMs }) =>
			globalThis.setTimeout(() => dismiss(id), Math.max(0, remainingMs))
		);
		return () => {
			for (const timer of timers) {
				globalThis.clearTimeout(timer);
			}
		};
	}, [jobs, dismiss]);

	const activeCount = jobs.filter(job => job.status === "running").length;

	const value = React.useMemo<ExportJobsContextValue>(
		() => ({ jobs, activeCount, startExport, dismiss }),
		[jobs, activeCount, startExport, dismiss]
	);

	return (
		<ExportJobsContext.Provider value={value}>
			{children}
			<ExportJobsIndicator />
		</ExportJobsContext.Provider>
	);
}

// ── Floating status indicator ─────────────────────────────────────────────────

function ExportJobsIndicator() {
	const t = useTranslations("common.exportJobs");
	const { jobs, dismiss } = useExportJobs();

	if (jobs.length === 0) return null;

	return (
		<div className="fixed bottom-4 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2.5">
			{jobs.slice(0, 4).map(job => {
				// A status-coloured left accent bar plus a chunky raised shadow make the
				// card read clearly against the warm page background.
				const accent = job.status === "running" ? "#00a85a" : job.status === "done" ? "#00a85a" : "#b45309";
				return (
					<div
						key={job.id}
						style={{ borderLeftColor: accent }}
						className="animate-in slide-in-from-bottom-4 fade-in overflow-hidden rounded-xl border-2 border-foreground/25 border-l-[7px] bg-popover p-3.5 text-popover-foreground shadow-[0_6px_0_rgba(0,0,0,0.22),0_18px_38px_rgba(0,0,0,0.24)] ring-2 ring-background duration-300">
						<div className="flex items-start justify-between gap-2">
							<div className="flex items-center gap-2.5">
								<span
									className="flex size-7 shrink-0 items-center justify-center rounded-full"
									style={{
										background:
											job.status === "error" || job.status === "interrupted"
												? "rgba(180, 83, 9, 0.12)"
												: "rgba(0, 168, 90, 0.12)"
									}}>
									{job.status === "running" && (
										<Loader2Icon
											className="size-4 animate-spin text-[#00a85a]"
											aria-hidden="true"
										/>
									)}
									{job.status === "done" && (
										<CheckCircle2Icon className="size-4 text-[#00a85a]" aria-hidden="true" />
									)}
									{(job.status === "error" || job.status === "interrupted") && (
										<TriangleAlertIcon className="size-4 text-amber-700" aria-hidden="true" />
									)}
								</span>
								<div className="min-w-0">
									<p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
										{t("eyebrow")}
									</p>
									<p className="truncate text-sm font-semibold leading-tight">{job.label}</p>
								</div>
							</div>
							{job.status !== "running" && (
								<button
									type="button"
									onClick={() => dismiss(job.id)}
									className="-mr-1 -mt-1 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									aria-label={t("dismiss")}>
									<XIcon className="size-3.5" aria-hidden="true" />
								</button>
							)}
						</div>

						<p className="mt-2 text-xs text-muted-foreground">
							{job.status === "running" && <ExportJobProgressText progress={job.progress} t={t} />}
							{job.status === "done" && (
								<span className="inline-flex items-center gap-1 font-medium text-[#007a40]">
									<DownloadIcon className="size-3" aria-hidden="true" />
									{t("downloaded")}
								</span>
							)}
							{job.status === "error" && (job.error ?? t("failed"))}
							{job.status === "interrupted" && t("interrupted")}
						</p>

						{job.status === "running" && (
							<div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full transition-all"
									style={{ width: `${runningPercent(job.progress)}%`, background: "#00a85a" }}
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

function runningPercent(progress: ExportProgress | null): number {
	if (progress === null) return 2;
	const raw =
		progress.phase === "compressing"
			? progress.percent
			: progress.total > 0
				? (progress.current / progress.total) * 100
				: 0;
	return Math.max(2, Math.min(100, raw));
}

function ExportJobProgressText({
	progress,
	t
}: {
	progress: ExportProgress | null;
	t: ReturnType<typeof useTranslations>;
}) {
	if (progress === null || progress.phase === "preparing") return <>{t("preparing")}</>;
	if (progress.phase === "compressing") return <>{t("compressing")}</>;
	if (progress.phase === "generating") {
		return (
			<>
				{t("generating")} {progress.current}/{progress.total}
			</>
		);
	}
	return <>{t("preparing")}</>;
}
