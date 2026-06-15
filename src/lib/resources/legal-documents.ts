import { z } from "zod";

import { type LegalDocument, legalDocumentSchema } from "@/types/audit";

const publicLegalDocumentsSchema = z.array(legalDocumentSchema);

/**
 * Frontend-local legal documents seeded from the backend canonical instrument at
 * `audit-tools-backend/app/products/playspace/instruments/pvua_v5_2.instrument.json`.
 *
 * This keeps public resource pages deployable without depending on a backend
 * fetch, while still preserving the backend instrument as the authoring source.
 */
const publicLegalDocumentsData = [
	{
		key: "terms",
		short_title: "Terms",
		title: "Terms and Conditions",
		eyebrow: "Service agreement",
		last_updated: "April 30, 2026",
		summary:
			"These terms explain how invited auditors, managers, and administrators may use Playspace to complete place audits, surveys, reports, and related field-workflows.",
		sections: [
			{
				key: "acceptance",
				title: "1. Acceptance of these Terms",
				body: [
					"By creating an account, signing in, accepting an invitation, or using Playspace, you agree to these Terms and Conditions. If you use Playspace on behalf of an organization, you confirm that you are authorized to use the platform for that organization's projects and audit workflows.",
					"If you do not agree with these Terms, do not use the platform or submit audit information through the mobile app."
				],
				bullets: []
			},
			{
				key: "service",
				title: "2. About Playspace",
				body: [
					"Playspace is an audit management platform for evaluating physical places, including play spaces and related public or private environments. The platform supports project setup, auditor assignments, field data collection, place audits, place surveys, scoring, progress tracking, report generation, and exports.",
					"The backend is the source of truth for submitted audit data, scoring, and project records. The mobile app supports offline-first field work and syncs drafts or submissions when connectivity is available."
				],
				bullets: []
			},
			{
				key: "accounts",
				title: "3. Accounts, invitations, and access",
				body: [
					"Access is role-based. Administrators, managers, and auditors may see different screens, projects, places, assignments, and reports. Auditor access is limited to assigned projects or places unless an authorized administrator or manager changes the assignment.",
					"You are responsible for keeping your credentials confidential, using a secure password, and promptly notifying the platform operator or your organization if you believe your account has been misused."
				],
				bullets: []
			},
			{
				key: "auditor-responsibilities",
				title: "4. Auditor responsibilities",
				body: [
					"Auditors are responsible for entering complete, accurate, and good-faith observations based on the assigned instrument and project instructions. You should not fabricate observations, submit work for a place you did not assess, or intentionally alter results to misrepresent field conditions.",
					"You must follow the safety rules, access rules, photography rules, confidentiality requirements, and site-specific instructions provided by the organization managing the project."
				],
				bullets: [
					"Do not enter names, contact details, faces, or direct identifiers of children, visitors, or bystanders into audit notes.",
					"Do not use Playspace to record emergency incidents unless your organization has explicitly instructed you to do so through a separate approved process.",
					"Do not submit offensive, discriminatory, harassing, or unrelated content in notes or reports."
				]
			},
			{
				key: "submissions",
				title: "5. Drafts, submissions, and reports",
				body: [
					"During an active audit session, Playspace may store draft answers, pre-audit selections, section notes, execution mode, and progress information. When you submit an audit or survey, the submission becomes part of the project record and may be visible to authorized managers, administrators, or reporting users.",
					"Reports, scores, and exports may include project details, place details, execution mode, timestamps, auditor codes, pre-audit responses, section responses, notes, and score totals. Submitted information may be difficult to fully remove from generated reports, backups, or records already downloaded by authorized users."
				],
				bullets: []
			},
			{
				key: "scoring",
				title: "6. Scores and professional judgment",
				body: [
					"Playspace may calculate raw score totals, progress values, and report summaries based on the configured instrument. Scores are decision-support outputs, not guarantees that a location is safe, compliant, accessible, inclusive, or suitable for any particular person or group.",
					"Organizations remain responsible for interpreting results, validating field observations, deciding whether professional inspection is required, and taking any operational or safety action."
				],
				bullets: []
			},
			{
				key: "privacy-confidentiality",
				title: "7. Privacy and confidentiality",
				body: [
					"You must use personal information and project information only for authorized Playspace purposes. You may not copy, export, photograph, scrape, or share data outside the platform unless your role and organization permit it.",
					"The Privacy Notice explains what information may be collected, how it is used, and how it may be shared with authorized parties."
				],
				bullets: []
			},
			{
				key: "acceptable-use",
				title: "8. Acceptable use",
				body: [
					"You agree not to misuse the platform, interfere with its operation, attempt to access accounts or projects without authorization, bypass security controls, reverse engineer protected parts of the service, upload malicious content, or use the platform in a way that violates applicable law or your organization's policies."
				],
				bullets: []
			},
			{
				key: "availability",
				title: "9. Availability and changes",
				body: [
					"Playspace may be updated, interrupted, suspended, or changed from time to time. Features may differ between web, mobile, online, and offline states. We may improve workflows, scoring displays, exports, route guards, permissions, or data models to maintain product quality and security."
				],
				bullets: []
			},
			{
				key: "intellectual-property",
				title: "10. Intellectual property",
				body: [
					"The platform, user interface, workflows, software, documentation, and product materials are owned by Playspace or its licensors. Your organization and its authorized users retain responsibility for the project content, place records, audit observations, and other information they submit, subject to the rights needed to operate, secure, support, and improve the service."
				],
				bullets: []
			},
			{
				key: "disclaimers",
				title: "11. Disclaimers and limitation of liability",
				body: [
					"The platform is provided for audit management and reporting support. To the fullest extent permitted by law, Playspace is provided without warranties that it will be uninterrupted, error-free, or suitable for every project, jurisdiction, safety standard, accessibility standard, or regulatory requirement.",
					"To the fullest extent permitted by law, the platform operator will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for decisions made solely from scores or reports without appropriate professional review."
				],
				bullets: []
			},
			{
				key: "termination-contact",
				title: "12. Suspension, termination, and contact",
				body: [
					"Access may be suspended or terminated if an account is inactive, no longer assigned, created in error, compromised, or used in violation of these Terms. Your organization may also remove or change your access based on its own policies.",
					"For questions about these Terms, contact your project administrator or the Playspace support contact provided by your organization."
				],
				bullets: []
			}
		]
	},
	{
		key: "privacy",
		short_title: "Privacy",
		title: "Privacy Notice",
		eyebrow: "Data handling notice",
		last_updated: "April 30, 2026",
		summary:
			"This notice explains what information Playspace may process when users manage projects, complete assigned audits, sync field data, and generate reports.",
		sections: [
			{
				key: "overview",
				title: "1. Overview",
				body: [
					"This Privacy Notice describes how Playspace collects, uses, shares, retains, and protects information when administrators, managers, and auditors use the platform. It applies to the web platform, mobile app, backend services, audit workflows, reporting surfaces, and support interactions.",
					"Playspace is designed for organizational audit work. In many projects, the organization that creates the project decides why the information is collected, which auditors are assigned, and who may access the resulting reports."
				],
				bullets: []
			},
			{
				key: "information-collected",
				title: "2. Information we may collect",
				body: [
					"The information processed by Playspace depends on your role, your organization's configuration, and the audit workflow you use."
				],
				bullets: [
					"Account information: name, email address, password credentials, verification status, approval status, login timestamps, and account role.",
					"Profile information: full name, email, phone number, age range, gender, country, province, city, role, organization, position, and auditor code where applicable.",
					"Project and place information: account, project, place name, place type, city, province, country, dates, estimated auditors, assignment records, and place coordinates when entered by authorized users.",
					"Audit information: execution mode, draft progress, pre-audit answers, section answers, scale selections, notes, scores, submitted timestamps, and report/export data.",
					"Technical information: device, app, browser, session, diagnostics, logs, sync events, IP-derived metadata, and security events needed to operate and protect the platform.",
					"Support information: messages, screenshots, or files you choose to share when requesting help."
				]
			},
			{
				key: "no-bystander-identifiers",
				title: "3. Bystanders, children, and observed visitors",
				body: [
					"Playspace is not intended to collect direct identifiers of visitors, children, families, or bystanders observed at a place. Users should avoid entering names, faces, contact details, health information, school information, or other direct identifiers about observed people into notes or reports.",
					"If a project requires collection of sensitive field information, the organization managing that project is responsible for providing appropriate instructions, permissions, and safeguards before collection begins."
				],
				bullets: []
			},
			{
				key: "use-of-information",
				title: "4. How we use information",
				body: [
					"Playspace uses information to authenticate users, manage accounts, assign auditors, provide assigned place access, support offline drafts, sync audit data, calculate progress and scores, generate reports, export audit records, troubleshoot issues, secure the platform, and improve product reliability.",
					"We may also use aggregated or de-identified information to understand platform usage, improve workflows, test product quality, and develop reporting features, provided the information is not reasonably used to identify a person."
				],
				bullets: []
			},
			{
				key: "sharing",
				title: "5. How information may be shared",
				body: [
					"Information may be visible to authorized users based on role, account, project, assignment, and report permissions. For example, managers may review project and place information, auditors may access assigned places, and administrators may manage users, assignments, and reports.",
					"We may share information with service providers that help operate infrastructure, authentication, storage, analytics, security, support, or communications. These providers may process information only as needed to provide services to Playspace or the organization using it.",
					"We may disclose information if required by law, legal process, security investigation, rights enforcement, or to protect users, the platform, or the public."
				],
				bullets: []
			},
			{
				key: "exports",
				title: "6. Reports and exports",
				body: [
					"Authorized users may generate reports or exports from submitted audits. These may include project details, place details, audit metadata, pre-audit answers, section responses, notes, raw score totals, timestamps, and auditor identifiers such as auditor codes.",
					"Once an authorized user downloads an export, that user and their organization are responsible for storing, sharing, retaining, and deleting the file according to their own policies and legal obligations."
				],
				bullets: []
			},
			{
				key: "retention",
				title: "7. Retention",
				body: [
					"We retain information for as long as needed to provide the service, maintain project records, comply with legal obligations, resolve disputes, enforce agreements, preserve security logs, and support legitimate organizational reporting needs.",
					"Drafts, submitted audits, reports, and related caches may be retained differently depending on whether the information is active, submitted, archived, backed up, exported, or required for compliance or security purposes."
				],
				bullets: []
			},
			{
				key: "security",
				title: "8. Security",
				body: [
					"We use administrative, technical, and organizational safeguards designed to protect information against unauthorized access, loss, misuse, alteration, or disclosure. These safeguards may include authenticated access, role-based permissions, secure credential handling, protected transport, operational monitoring, and controlled database access.",
					"No system is perfectly secure. Users should protect their passwords, keep devices secure, sign out when appropriate, and report suspected unauthorized access promptly."
				],
				bullets: []
			},
			{
				key: "international-processing",
				title: "9. International processing",
				body: [
					"Playspace may process and store information in countries where its service providers, infrastructure, or support personnel operate. Those countries may have privacy or data protection laws that differ from the laws where you live or where the project takes place."
				],
				bullets: []
			},
			{
				key: "choices",
				title: "10. Your choices and access requests",
				body: [
					"Depending on your role, location, organization, and applicable law, you may be able to request access, correction, deletion, restriction, export, or objection related to your personal information. Some requests may need to be handled by the organization that controls the project or account.",
					"You can update certain profile information in the app where available. For other requests, contact your project administrator or the Playspace support contact provided by your organization."
				],
				bullets: []
			},
			{
				key: "cookies-analytics",
				title: "11. Cookies, analytics, and diagnostics",
				body: [
					"The web platform and mobile app may use cookies, local storage, device storage, crash logs, diagnostics, or similar technologies to keep users signed in, remember preferences, support offline drafts, measure reliability, and protect the platform from abuse.",
					"Where required, the organization or platform operator will provide additional choices for non-essential cookies or analytics."
				],
				bullets: []
			},
			{
				key: "changes-contact",
				title: "12. Changes and contact",
				body: [
					"We may update this Privacy Notice as the platform, data model, audit workflows, legal requirements, or service providers change. The updated notice will show a new effective date.",
					"For privacy questions, contact your project administrator or the Playspace support contact provided by your organization."
				],
				bullets: []
			}
		]
	}
] satisfies ReadonlyArray<LegalDocument>;

/** Validates the seeded legal-document data at module load. */
export const PUBLIC_LEGAL_DOCUMENTS = publicLegalDocumentsSchema.parse(publicLegalDocumentsData);

/**
 * Looks up one seeded legal document by its backend-defined key.
 *
 * @param key Backend `legal_documents[*].key` value.
 * @returns The matching legal document when present.
 */
export function getPublicLegalDocumentByKey(key: string): LegalDocument | undefined {
	return PUBLIC_LEGAL_DOCUMENTS.find(document => document.key === key);
}
