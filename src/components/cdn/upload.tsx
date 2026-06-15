"use client";

import { Upload } from "lucide-react";
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";

import { Button } from "@/components/ui/button";

export interface UploadButtonProps {
	label: string;
	/** Called with the Cloudinary result after each successful upload. */
	onUploaded?: (result: CloudinaryUploadWidgetResults) => void;
}

/**
 * Opens the Cloudinary upload widget in signed mode. Each upload's parameters
 * are signed by /api/sign-cloudinary-params using the server-side API secret,
 * so the widget never needs an unsigned upload preset or a client-exposed secret.
 */
export function UploadButton({ label, onUploaded }: Readonly<UploadButtonProps>) {
	return (
		<CldUploadWidget signatureEndpoint="/api/sign-cloudinary-params" onSuccess={result => onUploaded?.(result)}>
			{({ open }) => (
				<Button type="button" variant="secondary" size="sm" onClick={() => open()}>
					<Upload className="size-4" aria-hidden="true" />
					{label}
				</Button>
			)}
		</CldUploadWidget>
	);
}
