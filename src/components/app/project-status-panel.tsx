"use client";

import Link from "next/link";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";

interface ProjectProgress {
	name: string;
	completedPlaces: number;
	inProgressPlaces: number;
	totalPlaces: number;
}

interface ProjectStatusPanelProps {
	projects: ProjectProgress[];
	onViewAll?: () => void;
}

export function ProjectStatusPanel({ projects, onViewAll }: Readonly<ProjectStatusPanelProps>) {
	return (
		<SpotlightCard>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<h3 className="font-heading text-[15px] font-semibold text-text-primary">Projects</h3>
					<Link
						href="/manager/projects"
						className="font-sans text-[11px] text-accent-violet hover:underline"
						onClick={onViewAll}>
						View all →
					</Link>
				</div>

				<div className="space-y-4">
					{projects.map(project => {
						const total = project.totalPlaces;
						const completed = project.completedPlaces;
						const inProgress = project.inProgressPlaces;
						const remaining = Math.max(0, total - completed - inProgress);

						const completedPercent = total > 0 ? (completed / total) * 100 : 0;
						const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
						const remainingPercent = total > 0 ? (remaining / total) * 100 : 0;

						const overallPercent = total > 0 ? (completed / total) * 100 : 0;
						const percentColor = overallPercent >= 75 ? "text-accent-moss" : "text-status-warning";

						return (
							<div
								key={project.name}
								className="space-y-2 border-b border-edge pb-4 last:border-b-0 last:pb-0">
								<div className="flex items-center justify-between">
									<p className="font-sans text-[13px] font-medium text-text-primary">
										{project.name}
									</p>
									<p className={cn("font-sans text-[11px] font-semibold tabular-nums", percentColor)}>
										{Math.round(overallPercent)}%
									</p>
								</div>

								<div className="h-1 overflow-hidden rounded-sm bg-edge flex">
									{completedPercent > 0 && (
										<div
											className="bg-accent-moss transition-all duration-300"
											style={{ width: `${completedPercent}%` }}
										/>
									)}
									{inProgressPercent > 0 && (
										<div
											className="bg-accent-terracotta transition-all duration-300"
											style={{ width: `${inProgressPercent}%` }}
										/>
									)}
									{remainingPercent > 0 && (
										<div className="bg-edge" style={{ width: `${remainingPercent}%` }} />
									)}
								</div>

								<p className="font-sans text-[11px] text-text-muted">
									{completed} of {total} places audited
								</p>
							</div>
						);
					})}
				</div>
			</div>
		</SpotlightCard>
	);
}
