"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/**
 * Absolute-fallback error boundary.
 * Replaces the root layout when an error escapes every nested boundary,
 * so it renders its own html/body. Cannot rely on next-intl or other
 * providers - text is hardcoded English.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
	useEffect(() => {
		console.error("[global:boundary]", error);
	}, [error]);

	return (
		<html lang="en">
			<body
				style={{
					alignItems: "center",
					backgroundColor: "#0a0a0a",
					color: "#fafafa",
					display: "flex",
					fontFamily: "system-ui, -apple-system, sans-serif",
					justifyContent: "center",
					margin: 0,
					minHeight: "100vh",
					padding: "24px"
				}}>
				<main style={{ maxWidth: "480px", textAlign: "center" }}>
					<h1 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>Something went wrong</h1>
					<p style={{ color: "#a3a3a3", lineHeight: 1.5, marginBottom: "24px" }}>
						We hit an unexpected error and could not finish loading the app. Reloading the page usually
						fixes this.
					</p>
					<button
						type="button"
						onClick={reset}
						style={{
							backgroundColor: "#fafafa",
							border: "none",
							borderRadius: "8px",
							color: "#0a0a0a",
							cursor: "pointer",
							fontSize: "0.95rem",
							fontWeight: 500,
							padding: "10px 18px"
						}}>
						Reload the page
					</button>
				</main>
			</body>
		</html>
	);
}
