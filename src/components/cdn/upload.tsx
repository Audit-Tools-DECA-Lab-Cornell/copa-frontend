"use client";

import { Upload } from "lucide-react";
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { type ComponentProps, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DESIGN_SYSTEM } from "@/lib/design-system";

import { usePreferences } from "../app/preferences-provider";

type CloudinaryUploadOptions = NonNullable<ComponentProps<typeof CldUploadWidget>["options"]>;

function useCloudinaryUploadOptions(): CloudinaryUploadOptions {
	const { highContrast } = usePreferences();
	return useMemo(() => {
		const palette = DESIGN_SYSTEM.palettes["light"][highContrast ? "high" : "standard"];
		return {
			sources: ["local", "camera", "url", "dropbox", "google_drive", "unsplash"],
			multiple: true,
			maxFiles: 20,
			uploadPreset: "ml_default",
			resourceType: "image",
			clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif", "svg", "ico"],
			showAdvancedOptions: true,
			showCompletedButton: true,
			singleUploadAutoClose: false,
			showUploadMoreButton: true,
			showInsecurePreview: true,
			showPoweredBy: false,
			styles: {
				frame: { background: `rgba(30,30,30, 0.4)` },
				palette: {
					window: palette.surfaceRaised,
					windowBorder: palette.edge,
					sourceBg: palette.surface,
					bgColor: palette.canvas,
					tabIcon: palette.solidPrimary,
					inactiveTabIcon: palette.textMuted,
					menuIcons: palette.textSecondary,
					textDark: palette.textPrimary,
					textLight: palette.solidPrimaryText,
					link: palette.solidPrimary,
					action: palette.solidPrimary,
					inProgress: palette.statusInProgress,
					complete: palette.statusSuccess,
					error: palette.statusDanger
				}
			}
		};
	}, [highContrast]);
}

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
	const options = useCloudinaryUploadOptions();

	return (
		<CldUploadWidget
			signatureEndpoint="/api/sign-cloudinary-params"
			options={options}
			onSuccess={result => onUploaded?.(result)}>
			{({ open }) => (
				<Button type="button" variant="secondary" size="sm" onClick={() => open()}>
					<Upload className="size-4" aria-hidden="true" />
					{label}
				</Button>
			)}
		</CldUploadWidget>
	);
}
