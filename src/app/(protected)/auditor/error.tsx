"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";

interface AuditorErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function AuditorError({ error, reset }: AuditorErrorProps) {
	const t = useTranslations("common.errorBoundary");
	const router = useRouter();

	useEffect(() => {
		console.error("[auditor:boundary]", error);
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
					<Button type="button" variant="outline" onClick={() => router.push("/auditor/dashboard")}>
						{t("actions.reload")}
					</Button>
				</div>
			}
		/>
	);
}
