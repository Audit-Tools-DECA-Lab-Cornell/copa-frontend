import { buildCloudinaryUrl, type CloudinaryVariant } from "@/lib/cloudinary-images";

// Converts a local public/ reference to a Cloudinary delivery URL.
//   /screenshots/Framed/{path}.png → web/framed/{path}
//   /marketing/{path}.png          → web/marketing/{path}
// Both paths are indexed in assets/web/ and uploaded via assets/scripts/upload-to-cloudinary.mjs,
// so the landing pages deliver every product render from the CDN rather than from
// the local public/ folder. Anything that does not match is returned unchanged.
export function screenshotUrl(localPath: string, variant: CloudinaryVariant = "full"): string {
	const framedMatch = localPath.match(/^\/screenshots\/Framed\/(.+)\.(?:png|jpg|jpeg|webp)$/i);
	if (framedMatch) {
		return buildCloudinaryUrl(`web/framed/${framedMatch[1]}`, variant);
	}
	const marketingMatch = localPath.match(/^\/marketing\/(.+)\.(?:png|jpg|jpeg|webp)$/i);
	if (marketingMatch) {
		return buildCloudinaryUrl(`web/marketing/${marketingMatch[1]}`, variant);
	}
	return localPath;
}
