"use server";

import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

// Signs upload parameters for the Cloudinary upload widget. The signature is
// computed server-side with the API secret so the secret never reaches the
// browser, which is what makes the widget's uploads authenticated (signed)
// rather than relying on an unsigned upload preset.
export async function POST(request: NextRequest): Promise<Response> {
	const apiSecret = process.env.CLOUDINARY_API_SECRET;
	if (!apiSecret) {
		return NextResponse.json({ error: "Cloudinary signing is not configured." }, { status: 500 });
	}

	const body = (await request.json()) as { paramsToSign?: Record<string, unknown> };
	const paramsToSign = body.paramsToSign;
	if (!paramsToSign || typeof paramsToSign !== "object") {
		return NextResponse.json({ error: "Missing paramsToSign." }, { status: 400 });
	}

	const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
	return NextResponse.json({ signature });
}
