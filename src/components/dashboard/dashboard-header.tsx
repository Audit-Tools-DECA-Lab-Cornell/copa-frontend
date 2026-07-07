import Link from "next/link";
import type { ReactNode } from "react";
import * as React from "react";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

export interface DashboardHeaderProps {
	title: string;
	description: string;
	eyebrow?: string;
	actions?: ReactNode;
	breadcrumbs?: Array<{
		label: string;
		href?: string;
	}>;
}

/**
 * Shared page header for dashboard screens.
 */
export function DashboardHeader({
	title,
	description,
	eyebrow,
	actions,
	breadcrumbs = []
}: Readonly<DashboardHeaderProps>) {
	return (
		<div className="space-y-4">
			{breadcrumbs.length > 0 ? (
				<div className="px-1">
					<Breadcrumb>
						<BreadcrumbList className="text-sm font-medium leading-5">
							{breadcrumbs.map((item, index) => {
								const isLastItem = index === breadcrumbs.length - 1;

								return (
									<React.Fragment key={`${item.label}_${index}`}>
										<BreadcrumbItem>
											{item.href && !isLastItem ? (
												<BreadcrumbLink asChild>
													<Link href={item.href}>{item.label}</Link>
												</BreadcrumbLink>
											) : (
												<BreadcrumbPage>{item.label}</BreadcrumbPage>
											)}
										</BreadcrumbItem>
										{!isLastItem && <BreadcrumbSeparator />}
									</React.Fragment>
								);
							})}
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			) : (
				<div className="h-5" />
			)}
			<div className="flex flex-col gap-4 rounded-card border-0 bg-foreground p-6 text-foreground shadow-header-block md:p-7">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="space-y-2">
						{eyebrow ? (
							<p className="text-(length:--eyebrow-size) font-semibold tracking-(--eyebrow-tracking) text-background/70 uppercase">
								{eyebrow}
							</p>
						) : null}
						<div className="space-y-1.5">
							<h1 className="text-(length:--page-title-size) leading-(--page-title-line-height) font-(--page-title-weight) tracking-(--page-title-tracking) text-balance text-background md:text-(length:--page-title-size-lg)">
								{title}
							</h1>
							<p className="max-w-4xl text-sm leading-6 text-background/70 md:text-base">{description}</p>
						</div>
					</div>
					{actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
				</div>
			</div>
		</div>
	);
}
