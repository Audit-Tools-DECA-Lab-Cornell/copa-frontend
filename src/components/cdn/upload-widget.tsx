"use client";

import { Upload } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { type ComponentProps, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DESIGN_SYSTEM } from "@/lib/design-system";

import { usePreferences } from "../app/preferences-provider";
import type { UploadButtonProps } from "./upload";

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

/**
 * The Cloudinary-backed upload button. Lives in its own module so the heavy
 * `next-cloudinary` upload widget can be code-split and loaded on demand via the
 * dynamic wrapper in `./upload`.
 */
export function UploadButtonImpl({ label, onUploaded, onWidgetOpenChange }: Readonly<UploadButtonProps>) {
	const options = useCloudinaryUploadOptions();

	return (
		<CldUploadWidget
			signatureEndpoint="/api/sign-cloudinary-params"
			options={options}
			onSuccess={result => onUploaded?.(result)}
			onOpen={() => onWidgetOpenChange?.(true)}
			onClose={() => onWidgetOpenChange?.(false)}>
			{({ open }) => (
				<Button type="button" variant="secondary" size="sm" onClick={() => open()}>
					<Upload className="size-4" aria-hidden="true" />
					{label}
				</Button>
			)}
		</CldUploadWidget>
	);
}
