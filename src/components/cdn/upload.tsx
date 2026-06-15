// components/upload-button.tsx
"use client";

import { CldUploadWidget } from "next-cloudinary";

export function UploadButton() {
	return (
		<CldUploadWidget
			uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!}
			onSuccess={result => {
				console.log("uploaded:", result?.info);
			}}>
			{({ open }) => (
				<button type="button" onClick={() => open()}>
					Upload screenshot
				</button>
			)}
		</CldUploadWidget>
	);
}
