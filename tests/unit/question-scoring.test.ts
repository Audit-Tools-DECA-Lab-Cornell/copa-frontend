import assert from "node:assert/strict";
import test from "node:test";

import { calculateQuestionScores } from "@/lib/audit/question-scoring";
import type { InstrumentQuestion, QuestionResponsePayload } from "@/types/audit";

function buildQuestion(): InstrumentQuestion {
	return {
		question_key: "q_unsure",
		mode: "audit",
		constructs: ["play_value", "usability"],
		domains: ["Unsure Demo"],
		section_key: "section_unsure",
		prompt: "Question",
		question_type: "scaled",
		required: true,
		display_if: null,
		notes_prompt: null,
		options: [],
		scales: [
			{
				key: "provision",
				title: "Provision",
				prompt: "Provision",
				options: [
					{
						key: "some",
						label: "Some",
						addition_value: 1,
						boost_value: 1,
						allows_follow_up_scales: true,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "a_lot",
						label: "A lot",
						addition_value: 2,
						boost_value: 2,
						allows_follow_up_scales: true,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "not_applicable",
						label: "Not applicable",
						addition_value: 0,
						boost_value: 1,
						allows_follow_up_scales: false,
						is_not_applicable: true,
						is_unsure: false
					},
					{
						key: "unsure",
						label: "Unsure / I don't know",
						addition_value: 0,
						boost_value: 1,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: true
					}
				]
			},
			{
				key: "variety",
				title: "Variety",
				prompt: "Variety",
				options: [
					{
						key: "not_applicable",
						label: "Not applicable",
						addition_value: 0,
						boost_value: 1,
						allows_follow_up_scales: false,
						is_not_applicable: true,
						is_unsure: false
					},
					{
						key: "some_variety",
						label: "Some variety",
						addition_value: 2,
						boost_value: 2,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "a_lot_of_variety",
						label: "A lot of variety",
						addition_value: 3,
						boost_value: 3,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "unsure",
						label: "Unsure / I don't know",
						addition_value: 0,
						boost_value: 1,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: true
					}
				]
			},
			{
				key: "challenge",
				title: "Challenge",
				prompt: "Challenge",
				options: [
					{
						key: "some_challenge",
						label: "Some challenge",
						addition_value: 2,
						boost_value: 2,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "a_lot_of_challenge",
						label: "A lot of challenge",
						addition_value: 3,
						boost_value: 3,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "unsure",
						label: "Unsure / I don't know",
						addition_value: 0,
						boost_value: 1,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: true
					}
				]
			},
			{
				key: "sociability",
				title: "Sociability",
				prompt: "Sociability",
				options: [
					{
						key: "pairs",
						label: "Pairs",
						addition_value: 2,
						boost_value: 2,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "groups",
						label: "Groups",
						addition_value: 3,
						boost_value: 3,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: false
					},
					{
						key: "unsure",
						label: "Unsure / I don't know",
						addition_value: 0,
						boost_value: 1,
						allows_follow_up_scales: false,
						is_not_applicable: false,
						is_unsure: true
					}
				]
			}
		]
	};
}

function score(
	answers: QuestionResponsePayload,
	policy: "unsure_as_excluded" | "unsure_as_zero" | "unsure_as_max" = "unsure_as_excluded"
) {
	return calculateQuestionScores(buildQuestion(), answers, policy);
}

test("provision not applicable removes the full question denominator", () => {
	const totals = score({
		provision: "not_applicable",
		variety: "unsure",
		challenge: "some_challenge",
		sociability: "unsure"
	});
	assert.equal(totals.play_value_total, 0);
	assert.equal(totals.play_value_total_max, 0);
	assert.equal(totals.provision_total_max, 0);
});

test("follow-up not applicable removes only that scale denominator", () => {
	const totals = score({
		provision: "some",
		variety: "not_applicable",
		challenge: "some_challenge",
		sociability: "pairs"
	});
	assert.equal(totals.variety_total_max, 0);
	assert.equal(totals.challenge_total_max, 2);
	assert.equal(totals.play_value_total, 2);
	assert.equal(totals.play_value_total_max, 6);
});

test("follow-up unsure supports excluded zero and max interpretations", () => {
	const answers = { provision: "some", variety: "unsure", challenge: "some_challenge", sociability: "unsure" };
	assert.equal(score(answers).play_value_total_max, 6);
	assert.equal(score(answers, "unsure_as_zero").play_value_total_max, 18);
	assert.equal(score(answers, "unsure_as_max").play_value_total, 6);
	assert.equal(score(answers, "unsure_as_max").sociability_total, 2);
});

test("provision unsure hides stale follow-ups for count-equivalent scoring", () => {
	const answers = { provision: "unsure", variety: "unsure", challenge: "unsure", sociability: "unsure" };
	assert.equal(score(answers).play_value_total_max, 0);
	assert.equal(score(answers, "unsure_as_zero").play_value_total, 0);
	assert.equal(score(answers, "unsure_as_zero").play_value_total_max, 18);
	assert.equal(score(answers, "unsure_as_max").play_value_total, 18);
});
