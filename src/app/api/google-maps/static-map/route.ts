"use server";

import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { GENERATED_MAP_PLACEHOLDER_COLORS } from "@/lib/design-system.generated";

const STATIC_MAPS_API_URL = "https://maps.googleapis.com/maps/api/staticmap";
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 220;
const DEFAULT_ZOOM = 15;

function getStaticMapsApiKey(): string | null {
	return process.env.GOOGLE_MAPS_STATIC_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_SERVER_API_KEY ?? null;
}

function getStaticMapsSigningSecret(): string | null {
	return process.env.GOOGLE_MAPS_URL_SIGNING_SECRET ?? null;
}

function clampInteger(value: string | null, fallbackValue: number, minValue: number, maxValue: number): number {
	const parsedValue = value === null ? Number.NaN : Number.parseInt(value, 10);
	if (!Number.isFinite(parsedValue)) return fallbackValue;
	return Math.min(Math.max(parsedValue, minValue), maxValue);
}

function decodeWebSafeBase64(value: string): Buffer {
	return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function encodeWebSafeBase64(buffer: Buffer): string {
	return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

function signStaticMapUrl(url: URL, signingSecret: string): URL {
	const resourceToSign = `${url.pathname}${url.search}`;
	const decodedSecret = decodeWebSafeBase64(signingSecret);
	const signature = crypto.createHmac("sha1", decodedSecret).update(resourceToSign).digest();
	url.searchParams.set("signature", encodeWebSafeBase64(signature));
	return url;
}

function buildSvgPlaceholder(message: string): Response {
	const sanitizedMessage = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="440" viewBox="0 0 1200 440">
	<rect width="1200" height="440" fill="${GENERATED_MAP_PLACEHOLDER_COLORS.surface}" />
	<rect x="20" y="20" width="1160" height="400" rx="24" fill="${GENERATED_MAP_PLACEHOLDER_COLORS.panel}" stroke="${GENERATED_MAP_PLACEHOLDER_COLORS.panelBorder}" />
	<text x="600" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="${GENERATED_MAP_PLACEHOLDER_COLORS.title}">
		Map preview unavailable
	</text>
	<text x="600" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${GENERATED_MAP_PLACEHOLDER_COLORS.body}">
		${sanitizedMessage}
	</text>
</svg>`.trim();

	return new Response(svg, {
		headers: {
			"Content-Type": "image/svg+xml; charset=utf-8",
			"Cache-Control": "no-store"
		},
		status: 200
	});
}

export async function GET(request: NextRequest): Promise<Response> {
	const apiKey = getStaticMapsApiKey();
	if (!apiKey) {
		return buildSvgPlaceholder("Server static map key is not configured.");
	}

	const lat = Number(request.nextUrl.searchParams.get("lat"));
	const lng = Number(request.nextUrl.searchParams.get("lng"));
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return buildSvgPlaceholder("Valid coordinates are required.");
	}

	const width = clampInteger(request.nextUrl.searchParams.get("width"), DEFAULT_WIDTH, 200, 640);
	const height = clampInteger(request.nextUrl.searchParams.get("height"), DEFAULT_HEIGHT, 160, 640);
	const zoom = clampInteger(request.nextUrl.searchParams.get("zoom"), DEFAULT_ZOOM, 1, 20);
	const scale = clampInteger(request.nextUrl.searchParams.get("scale"), 2, 1, 2);

	const googleMapsUrl = new URL(STATIC_MAPS_API_URL);
	googleMapsUrl.searchParams.set("center", `${lat},${lng}`);
	googleMapsUrl.searchParams.set("zoom", String(zoom));
	googleMapsUrl.searchParams.set("size", `${width}x${height}`);
	googleMapsUrl.searchParams.set("scale", String(scale));
	googleMapsUrl.searchParams.set("markers", `color:0x6366f1|${lat},${lng}`);
	googleMapsUrl.searchParams.set("key", apiKey);

	const signingSecret = getStaticMapsSigningSecret();
	if (signingSecret) {
		signStaticMapUrl(googleMapsUrl, signingSecret);
	}

	const response = await fetch(googleMapsUrl.toString(), {
		method: "GET",
		cache: "force-cache"
	});

	if (!response.ok) {
		return buildSvgPlaceholder("Google Maps rejected the static map request.");
	}

	const imageBuffer = await response.arrayBuffer();
	return new Response(imageBuffer, {
		headers: {
			"Content-Type": response.headers.get("Content-Type") ?? "image/png",
			"Cache-Control": "public, max-age=3600"
		},
		status: 200
	});
}
