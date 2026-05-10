import { expect, test } from "@playwright/test";

import { bearerHeaders, expectOk, getApiBaseUrl, loginViaApi } from "../helpers/api";

test.describe("@reports question-note contract", () => {
	test("auditor draft question_note round-trips through admin and manager audit detail reads", async ({
		request
	}) => {
		const auditorToken = await loginViaApi(request, "auditor");
		const adminToken = await loginViaApi(request, "admin");
		const managerToken = await loginViaApi(request, "manager");
		const auditorHeaders = bearerHeaders(auditorToken);

		const placesResponse = await request.get(`${getApiBaseUrl()}/playspace/auditor/me/places?page_size=100`, {
			headers: auditorHeaders
		});
		await expectOk(placesResponse);
		const placesPayload = (await placesResponse.json()) as {
			items: Array<{ place_id: string; project_id: string; place_audit_status: string }>;
		};
		expect(placesPayload.items.length).toBeGreaterThan(0);
		const targetPlace =
			placesPayload.items.find(place => place.place_audit_status !== "submitted") ?? placesPayload.items[0];
		expect(targetPlace).toBeTruthy();

		const accessResponse = await request.post(
			`${getApiBaseUrl()}/playspace/places/${targetPlace?.place_id}/audits/access`,
			{
				headers: auditorHeaders,
				data: {
					project_id: targetPlace?.project_id,
					execution_mode: "audit"
				}
			}
		);
		await expectOk(accessResponse);
		const auditSession = (await accessResponse.json()) as {
			audit_id: string;
			revision: number;
			instrument?: {
				sections?: Array<{
					section_key: string;
					questions?: Array<{
						question_key: string;
						question_type?: string;
						scales?: Array<{
							key: string;
							options?: Array<{ key: string }>;
						}>;
					}>;
				}>;
			};
		};

		const targetSection = auditSession.instrument?.sections?.find(section =>
			(section.questions ?? []).some(question => question.question_type !== "checklist")
		);
		expect(targetSection).toBeTruthy();
		const targetQuestion = targetSection?.questions?.find(question => question.question_type !== "checklist");
		expect(targetQuestion).toBeTruthy();
		const targetScale = targetQuestion?.scales?.[0];
		expect(targetScale?.key).toBeTruthy();
		const targetOption = targetScale?.options?.[0];
		expect(targetOption?.key).toBeTruthy();

		const noteText = `E2E question note ${Date.now().toString()}`;
		const patchResponse = await request.patch(
			`${getApiBaseUrl()}/playspace/audits/${auditSession.audit_id}/draft`,
			{
				headers: auditorHeaders,
				data: {
					expected_revision: auditSession.revision,
					sections: {
						[targetSection?.section_key ?? ""]: {
							responses: {
								[targetQuestion?.question_key ?? ""]: {
									[targetScale?.key ?? "provision"]: targetOption?.key ?? "no",
									question_note: noteText
								}
							}
						}
					}
				}
			}
		);
		await expectOk(patchResponse);

		for (const headers of [bearerHeaders(adminToken), bearerHeaders(managerToken)]) {
			const detailResponse = await request.get(`${getApiBaseUrl()}/playspace/audits/${auditSession.audit_id}`, {
				headers
			});
			await expectOk(detailResponse);
			const detail = (await detailResponse.json()) as {
				sections: Record<string, { responses: Record<string, Record<string, string | null>> }>;
			};
			expect(
				detail.sections[targetSection?.section_key ?? ""]?.responses[targetQuestion?.question_key ?? ""]
					?.question_note
			).toBe(noteText);
		}
	});
});
