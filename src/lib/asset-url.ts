import { buildCloudinaryUrl, type CloudinaryVariant } from "@/lib/cloudinary-images";

// Converts a /screenshots/Framed/{path} local reference to a Cloudinary delivery URL.
// Paths under /marketing/ are not in the assets repo and are returned unchanged.
export function screenshotUrl(localPath: string, variant: CloudinaryVariant = "full"): string {
	const framedMatch = localPath.match(/^\/screenshots\/Framed\/(.+)\.(?:png|jpg|jpeg|webp)$/i);
	if (framedMatch) {
		return buildCloudinaryUrl(`web/framed/${framedMatch[1]}`, variant);
	}
	return localPath;
}
