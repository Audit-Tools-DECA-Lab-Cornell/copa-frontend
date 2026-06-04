import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_LINE_KEYS = ["a", "b", "c", "d"] as const;

/**
 * Compact stat-card grid skeleton matching the production stat cards.
 * Used by dashboard `loading.tsx` files.
 */
export function StatCardsSkeleton({ count = 4 }: Readonly<{ count?: number }>) {
	const items = Array.from({ length: count }, (_value, index) => index);
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{items.map(index => (
				<Skeleton key={`stat-card-${index}`} className="h-32 rounded-card border border-edge/40 bg-card" />
			))}
		</div>
	);
}

/**
 * Generic table skeleton used by list pages while the data loads server-side.
 */
export function TableSkeleton() {
	return <Skeleton className="h-[420px] rounded-card border border-edge/40 bg-card" />;
}

/**
 * Skeleton for the audit-detail page: header, four-up score grid, response table.
 */
export function AuditDetailSkeleton() {
	const items = Array.from({ length: 4 }, (_value, index) => index);
	return (
		<div className="space-y-6">
			<Skeleton className="h-10 w-48 rounded-md" />
			<Skeleton className="h-40 rounded-card border border-edge/40 bg-card" />
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{items.map(index => (
					<Skeleton
						key={`detail-stat-${index}`}
						className="h-32 rounded-card border border-edge/40 bg-card"
					/>
				))}
			</div>
			<Skeleton className="h-64 rounded-card border border-edge/40 bg-card" />
		</div>
	);
}

/**
 * Skeleton for the audit-report page: header card, score bar block, domain table.
 */
export function AuditReportSkeleton() {
	return (
		<div className="space-y-6">
			<Skeleton className="h-10 w-48 rounded-md" />
			<Skeleton className="h-40 rounded-card border border-edge/40 bg-card" />
			<Skeleton className="h-[280px] rounded-card border border-edge/40 bg-card" />
			<Skeleton className="h-[420px] rounded-card border border-edge/40 bg-card" />
		</div>
	);
}

/**
 * Generic protected-shell skeleton: header strip + body block. Used as the
 * (protected) layout-level fallback when a deeper segment hasn't yet streamed.
 */
export function ProtectedShellSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<Skeleton className="h-4 w-32 rounded-md" />
				<Skeleton className="h-9 w-72 rounded-md" />
				<Skeleton className="h-4 w-96 rounded-md" />
			</div>
			<div className="space-y-3">
				{SKELETON_LINE_KEYS.map(key => (
					<Skeleton key={`shell-line-${key}`} className="h-20 rounded-card border border-edge/40 bg-card" />
				))}
			</div>
		</div>
	);
}
