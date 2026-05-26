import { expect, test } from "@playwright/test";

import { e2eUsers } from "../fixtures/users";
import { bearerHeaders, expectOk, getApiBaseUrl } from "../helpers/api";

test.describe("@reports final-comments contract", () => {
	test("audit-level final comments round-trip through auditor and admin detail reads", async ({ request }) => {
		const suffix = Date.now().toString();
		const adminLoginResponse = await request.post(`${getApiBaseUrl()}/playspace/auth/login`, {
			data: {
				email: e2eUsers.admin.email,
				password: e2eUsers.admin.password
			}
		});
		await expectOk(adminLoginResponse);
		const adminLoginPayload = (await adminLoginResponse.json()) as {
			access_token: string;
			user: {
				account_id: string | null;
			};
		};
		expect(adminLoginPayload.user.account_id).toBeTruthy();
		const adminHeaders = bearerHeaders(adminLoginPayload.access_token);

		const projectResponse = await request.post(`${getApiBaseUrl()}/playspace/projects`, {
			headers: adminHeaders,
			data: {
				account_id: adminLoginPayload.user.account_id,
				name: `Final Comments Project ${suffix}`,
				overview: "Created by Playwright for final comments coverage."
			}
		});
		await expectOk(projectResponse);
		const project = (await projectResponse.json()) as { id: string };

		const placeResponse = await request.post(`${getApiBaseUrl()}/playspace/places`, {
			headers: adminHeaders,
			data: {
				project_ids: [project.id],
				name: `Final Comments Place ${suffix}`,
				city: "Wellington",
				country: "New Zealand",
				place_type: "Playground"
			}
		});
		await expectOk(placeResponse);
		const place = (await placeResponse.json()) as { id: string };

		const auditorEmail = `final-comments-${suffix}@example.org`;
		const auditorCreateResponse = await request.post(`${getApiBaseUrl()}/playspace/auditor-profiles`, {
			headers: adminHeaders,
			data: {
				account_id: adminLoginPayload.user.account_id,
				email: auditorEmail,
				full_name: `Final Comments Auditor ${suffix}`,
				country: "New Zealand",
				role: "Playwright Auditor"
			}
		});
		await expectOk(auditorCreateResponse);
		const createdAuditor = (await auditorCreateResponse.json()) as {
			id: string;
			temporary_password: string;
		};
		expect(createdAuditor.temporary_password).toBeTruthy();

		const assignmentResponse = await request.post(
			`${getApiBaseUrl()}/playspace/auditor-profiles/${createdAuditor.id}/assignments`,
			{
				headers: adminHeaders,
				data: {
					project_id: project.id,
					place_id: place.id
				}
			}
		);
		await expectOk(assignmentResponse);

		const auditorLoginResponse = await request.post(`${getApiBaseUrl()}/playspace/auth/login`, {
			data: {
				email: auditorEmail,
				password: createdAuditor.temporary_password
			}
		});
		await expectOk(auditorLoginResponse);
		const auditorLoginPayload = (await auditorLoginResponse.json()) as { access_token: string };
		const auditorHeaders = bearerHeaders(auditorLoginPayload.access_token);

		const accessResponse = await request.post(`${getApiBaseUrl()}/playspace/places/${place.id}/audits/access`, {
			headers: auditorHeaders,
			data: {
				project_id: project.id,
				execution_mode: "audit"
			}
		});
		await expectOk(accessResponse);
		const auditSession = (await accessResponse.json()) as {
			audit_id: string;
			revision: number;
		};

		const finalComments = `E2E final comments ${Date.now().toString()}`;
		const patchResponse = await request.patch(
			`${getApiBaseUrl()}/playspace/audits/${auditSession.audit_id}/draft`,
			{
				headers: auditorHeaders,
				data: {
					expected_revision: auditSession.revision,
					meta: {
						final_comments: finalComments
					}
				}
			}
		);
		await expectOk(patchResponse);

		for (const headers of [auditorHeaders, adminHeaders]) {
			const detailResponse = await request.get(`${getApiBaseUrl()}/playspace/audits/${auditSession.audit_id}`, {
				headers
			});
			await expectOk(detailResponse);
			const detail = (await detailResponse.json()) as {
				meta: {
					final_comments: string | null;
				};
				aggregate: {
					meta: {
						final_comments: string | null;
					};
				};
			};
			expect(detail.meta.final_comments).toBe(finalComments);
			expect(detail.aggregate.meta.final_comments).toBe(finalComments);
		}
	});
});
