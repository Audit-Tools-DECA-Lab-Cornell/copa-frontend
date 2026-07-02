"use client";

import dynamic from "next/dynamic";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";

import { Skeleton } from "@/components/ui/skeleton";

export interface UploadButtonProps {
	label: string;
	/** Called with the Cloudinary result after each successful upload. */
	onUploaded?: (result: CloudinaryUploadWidgetResults) => void;
	onWidgetOpenChange?: (open: boolean) => void;
}

/**
 * Loads the `next-cloudinary` upload widget only on the client, and only where
 * this button is actually rendered (the admin assets page). The widget bundle
 * (~30-40 KB) never ships with pages that just display images via `CldImage`.
 */
const UploadButtonImpl = dynamic(() => import("./upload-widget").then(mod => mod.UploadButtonImpl), {
	ssr: false,
	loading: () => <Skeleton className="h-9 w-28 rounded-md" />
});

export function UploadButton(props: Readonly<UploadButtonProps>) {
	return <UploadButtonImpl {...props} />;
}
