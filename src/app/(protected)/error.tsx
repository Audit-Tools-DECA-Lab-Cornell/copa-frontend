"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";

interface ProtectedErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/**
 * Boundary for any unhandled error inside a protected route.
 * Receives a `reset` from React; calling it re-renders the segment.
 */
export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
	const t = useTranslations("common.errorBoundary");
	const router = useRouter();

	useEffect(() => {
		console.error("[protected:boundary]", error);
	}, [error]);

	return (
		<EmptyState
			title={t("title")}
			description={t("description")}
			action={
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" onClick={reset}>
						{t("actions.retry")}
					</Button>
					<Button type="button" variant="outline" onClick={() => router.push("/")}>
						{t("actions.reload")}
					</Button>
				</div>
			}
		/>
	);
}
