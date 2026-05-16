import { z } from "zod";

import { type LegalDocument, legalDocumentSchema } from "@/types/audit";

import { getPublicLegalDocumentByKey } from "./legal-documents";

const publicResourceKindSchema = z.enum(["legal", "manual", "reference"]);

const publicResourceSchema = z.object({
	slug: z.string().min(1),
	kind: publicResourceKindSchema,
	title: z.string().min(1),
	description: z.string().min(1),
	document: legalDocumentSchema
});

const publicResourcesSchema = z.array(publicResourceSchema);

export type PublicResourceKind = z.infer<typeof publicResourceKindSchema>;
export type PublicResource = z.infer<typeof publicResourceSchema>;

export function getPublicResourceKindLabel(kind: PublicResourceKind): string {
	switch (kind) {
		case "legal":
			return "Legal document";
		case "manual":
			return "Manual";
		case "reference":
			return "Reference";
	}
}

function requirePublicLegalDocument(key: string): LegalDocument {
	const document = getPublicLegalDocumentByKey(key);
	if (document) {
		return document;
	}

	throw new Error(`Missing public legal document for key "${key}".`);
}

const privacyDocument = requirePublicLegalDocument("privacy");
const termsDocument = requirePublicLegalDocument("terms");

const publicResourcesData = [
	{
		slug: "privacy-policy",
		kind: "legal",
		title: privacyDocument.title,
		description: privacyDocument.summary,
		document: privacyDocument
	},
	{
		slug: "terms-and-conditions",
		kind: "legal",
		title: termsDocument.title,
		description: termsDocument.summary,
		document: termsDocument
	}
] satisfies ReadonlyArray<PublicResource>;

export const PUBLIC_RESOURCES = publicResourcesSchema.parse(publicResourcesData);

export function getPublicResources(): readonly PublicResource[] {
	return PUBLIC_RESOURCES;
}

export function getPublicResourceBySlug(slug: string): PublicResource | undefined {
	return PUBLIC_RESOURCES.find(resource => resource.slug === slug);
}
