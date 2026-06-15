import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { revalidateInstrument } from "@/lib/api/playspace-server";

const REQUEST_SECRET_HEADER = "x-revalidate-secret";

const requestBodySchema = z.object({
	instrumentKey: z.string().min(1),
	lang: z.string().min(1).default("en")
});

/**
 * POST /api/internal/revalidate-instrument
 *
 * Body:
 *   { "instrumentKey": "pvua_v5_2", "lang": "en" }
 *
 * Header:
 *   x-revalidate-secret: <shared secret matching INSTRUMENT_REVALIDATE_SECRET>
 *
 * Response:
 *   200 { "ok": true, "revalidated": ["instrument:pvua_v5_2:en"] }
 *   401 if the secret is missing or mismatched
 *   400 if the body fails validation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const secret = process.env.INSTRUMENT_REVALIDATE_SECRET;
	if (!secret || secret.trim().length === 0) {
		return NextResponse.json({ ok: false, error: "Server is not configured." }, { status: 500 });
	}

	const provided = request.headers.get(REQUEST_SECRET_HEADER);
	if (provided !== secret) {
		return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
	}

	const rawBody: unknown = await request.json().catch(() => null);
	const parsed = requestBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return NextResponse.json(
			{ ok: false, error: "Body must be { instrumentKey: string, lang?: string }." },
			{ status: 400 }
		);
	}

	const tag = revalidateInstrument(parsed.data.instrumentKey, parsed.data.lang);
	return NextResponse.json({ ok: true, revalidated: [tag] });
}
