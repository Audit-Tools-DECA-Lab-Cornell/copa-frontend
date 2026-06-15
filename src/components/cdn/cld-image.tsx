// components/cld-image.tsx
"use client";

import { CldImage as CldImageDefault, CldImageProps } from "next-cloudinary";

export function CldImage(props: CldImageProps) {
	return <CldImageDefault {...props} />;
}
