/**
 * Answers have to stay tellable apart.
 *
 * The 5.40 instrument shipped 69 answers all keyed `new_option`, so three
 * differently scored answers on one question collapsed into a single answer.
 * These tests cover the editor-side rules that stop that: a key minted once per
 * answer, an override that can only touch answers added in this session, the
 * scan that reports what the server would reject, and the repair that gives a
 * broken copy a set of usable keys.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
	collectOwningLists,
	publishBlockers,
	saveBlockers,
	scanInstrumentIssues
} from "../../src/components/dashboard/instruments/instrument-issues";
import {
	applyOptionKeyRepairs,
	planOptionKeyRepairs
} from "../../src/components/dashboard/instruments/option-key-repair";
import {
	appendChoiceOption,
	appendScaleOption,
	applyOptionKeyOverride,
	checkOptionKeyOverride,
	checkStoredOptionKey,
	mintOptionKey,
	OPTION_KEY_MAX_LENGTH,
	scopeId
} from "../../src/components/dashboard/instruments/option-keys";
import {
	findLocaleMismatches,
	syncTranslationsToBase
} from "../../src/components/dashboard/instruments/translation-sync";
import type { InstrumentContent } from "../../src/components/dashboard/instruments/types";
import type { ChoiceOption, PlayspaceInstrument, ScaleOption } from "../../src/types/audit";

const NO_KEYS: ReadonlySet<string> = new Set();

function scaleOption(key: string, label: string, additionValue = 0): ScaleOption {
	return {
		key,
		label,
		addition_value: additionValue,
		boost_value: 0,
		allows_follow_up_scales: false,
		is_not_applicable: false,
		is_unsure: false
	};
}

function choiceOption(key: string, label: string): ChoiceOption {
	return { key, label, description: null };
}

/** A one-section instrument with one scaled and one checklist question. */
function instrument(overrides: Partial<PlayspaceInstrument> = {}): PlayspaceInstrument {
	return {
		instrument_key: "pvua_v5_2",
		instrument_name: "Test instrument",
		instrument_version: "9.0",
		current_sheet: "test",
		source_files: [],
		preamble: [],
		execution_modes: [choiceOption("both", "Audit & Survey")],
		pre_audit_questions: [],
		scale_guidance: [
			{
				key: "provision",
				title: "Provision",
				prompt: "How many?",
				description: "Guidance",
				selection_mode: "single",
				options: [scaleOption("no", "No"), scaleOption("some", "Some", 1)]
			}
		],
		sections: [
			{
				section_key: "section_1_test",
				title: "Test section",
				description: null,
				instruction: "Answer the questions.",
				notes_prompt: null,
				questions: [
					{
						question_key: "q_1_1",
						mode: "both",
						constructs: ["play_value"],
						domains: [],
						section_key: "section_1_test",
						prompt: "How many?",
						question_type: "scaled",
						scales: [
							{
								key: "provision",
								title: "Provision",
								prompt: "How many?",
								selection_mode: "single",
								options: [scaleOption("no", "No"), scaleOption("some", "Some", 1)]
							}
						],
						options: [],
						required: true,
						display_if: null,
						notes_prompt: null
					},
					{
						question_key: "q_1_2",
						mode: "both",
						constructs: ["usability"],
						domains: [],
						section_key: "section_1_test",
						prompt: "Which are present?",
						question_type: "checklist",
						scales: [],
						options: [choiceOption("none", "None"), choiceOption("bench", "Bench")],
						required: false,
						display_if: null,
						notes_prompt: null
					}
				]
			}
		],
		legal_documents: [],
		...overrides
	} as PlayspaceInstrument;
}

function content(overrides: Partial<PlayspaceInstrument> = {}): InstrumentContent {
	return { en: instrument(overrides) };
}

// ── minting keys ─────────────────────────────────────────────────────────────

test("a freshly added answer gets its own key, never a shared starting value", () => {
	const first = appendScaleOption([], { ...scaleOption("", "New answer") }, NO_KEYS);
	assert.equal(first.ok, true);
	if (!first.ok) return;
	const second = appendScaleOption(first.options, { ...scaleOption("", "New answer") }, NO_KEYS);
	assert.equal(second.ok, true);
	if (!second.ok) return;

	const keys = second.options.map(option => option.key);
	assert.equal(new Set(keys).size, keys.length);
	assert.ok(keys.every(key => key.length > 0 && key !== "new_option"));
});

test("repeated adds in one burst cannot collide, even against a stubborn generator", () => {
	// The generator repeats itself once before producing something new; the second
	// add has to notice and re-roll rather than overwrite the first answer.
	const sequence = ["opt_aaaa", "opt_aaaa", "opt_bbbb"];
	let index = 0;
	const generate = () => sequence[Math.min(index++, sequence.length - 1)];

	const first = appendScaleOption([], { ...scaleOption("", "One") }, NO_KEYS, generate);
	assert.equal(first.ok, true);
	if (!first.ok) return;
	const second = appendScaleOption(first.options, { ...scaleOption("", "Two") }, NO_KEYS, generate);
	assert.equal(second.ok, true);
	if (!second.ok) return;

	assert.deepEqual(
		second.options.map(option => option.key),
		["opt_aaaa", "opt_bbbb"]
	);
});

test("an answer is not added at all when no free key can be minted", () => {
	const generate = () => "opt_taken";
	const result = appendChoiceOption(
		[choiceOption("opt_taken", "Existing")],
		{ label: "New", description: null },
		NO_KEYS,
		generate
	);
	assert.equal(result.ok, false);
	if (result.ok) return;
	assert.equal(result.code, "generatorUnavailable");
});

test("a key deleted earlier in the session is not handed to a new answer", () => {
	const retired = new Set(["opt_retired"]);
	const generate = () => "opt_retired";
	const result = appendScaleOption([], { ...scaleOption("", "New") }, retired, generate);
	assert.equal(result.ok, false);
	assert.equal(mintOptionKey(retired, generate), null);
});

// ── typed overrides ──────────────────────────────────────────────────────────

test("a typed key is accepted only in the shape stored answers can use", () => {
	const taken = new Set(["taken"]);
	const check = (candidate: string) => checkOptionKeyOverride(candidate, taken, { scaleOption: true });

	assert.deepEqual(check("no_bench"), { ok: true });
	assert.deepEqual(check(""), { ok: false, code: "blank" });
	assert.deepEqual(check(" spaced"), { ok: false, code: "padded" });
	assert.deepEqual(check("x".repeat(OPTION_KEY_MAX_LENGTH + 1)), { ok: false, code: "tooLong" });
	assert.deepEqual(check("new_option"), { ok: false, code: "placeholder" });
	assert.deepEqual(check("No Bench"), { ok: false, code: "syntax" });
	assert.deepEqual(check("9lives"), { ok: false, code: "syntax" });
	assert.deepEqual(check("no_diversity"), { ok: false, code: "reserved" });
	assert.deepEqual(check("unsure"), { ok: false, code: "semantic" });
	assert.deepEqual(check("taken"), { ok: false, code: "duplicate" });
});

test("the reserved ingest keys only apply where answers are rewritten on arrival", () => {
	// A checklist answer is read straight through, so the same string is fine there.
	assert.deepEqual(checkOptionKeyOverride("no_diversity", NO_KEYS, { scaleOption: false }), { ok: true });
});

test("applying a key rewrites the row it was opened for and leaves the rest alone", () => {
	const options = [scaleOption("opt_a", "No"), scaleOption("opt_b", "Some", 1)];
	const result = applyOptionKeyOverride(options, "opt_b", "some", NO_KEYS, { scaleOption: true });
	assert.equal(result.ok, true);
	if (!result.ok) return;
	assert.deepEqual(
		result.options.map(option => option.key),
		["opt_a", "some"]
	);
	assert.equal(result.options[1].label, "Some");
	assert.equal(result.options[1].addition_value, 1);
});

test("a refused key changes nothing, and a vanished row is reported rather than guessed at", () => {
	const options = [scaleOption("opt_a", "No"), scaleOption("opt_b", "Some", 1)];

	const duplicate = applyOptionKeyOverride(options, "opt_b", "opt_a", NO_KEYS, { scaleOption: true });
	assert.deepEqual(duplicate, { ok: false, code: "duplicate" });

	const gone = applyOptionKeyOverride(options, "opt_missing", "some", NO_KEYS, { scaleOption: true });
	assert.deepEqual(gone, { ok: false, code: "missingRow" });
});

// ── reading stored content ───────────────────────────────────────────────────

test("existing punctuation, non-Latin text and an 80-character key stay valid", () => {
	const seen = new Set<string>();
	assert.deepEqual(checkStoredOptionKey("tools (hammers_and_nails,_saws,_brushes)", seen, { scaleOption: false }), {
		ok: true
	});
	assert.deepEqual(checkStoredOptionKey("grünfläche", seen, { scaleOption: true }), { ok: true });
	assert.deepEqual(checkStoredOptionKey("a".repeat(80), seen, { scaleOption: true }), { ok: true });
	assert.deepEqual(checkStoredOptionKey("a".repeat(81), seen, { scaleOption: true }), {
		ok: false,
		code: "tooLong"
	});
});

// ── scanning a whole instrument ──────────────────────────────────────────────

test("a sound instrument reports nothing to fix", () => {
	assert.deepEqual(scanInstrumentIssues(content(), "en"), []);
});

test("the original failure is reported as something that cannot be saved", () => {
	const broken = content();
	broken.en.sections[0].questions[0].scales[0].options = [
		scaleOption("new_option", "No"),
		scaleOption("new_option", "Some", 1),
		scaleOption("new_option", "A lot", 2)
	];

	const blockers = saveBlockers(scanInstrumentIssues(broken, "en"));
	assert.equal(blockers.length, 3);
	assert.ok(blockers.every(issue => issue.target.field === "optionKey"));
	assert.deepEqual(
		blockers.map(issue => issue.code),
		["optionKeyPlaceholder", "optionKeyPlaceholder", "optionKeyPlaceholder"]
	);
	// Every issue points at a row by position, because the key itself is ambiguous.
	assert.deepEqual(
		blockers.map(issue => issue.target.optionIndex),
		[0, 1, 2]
	);
});

test("owners are reported before the answers underneath them", () => {
	const broken = content();
	broken.en.sections[0].questions[1].question_key = "q_1_1";
	const codes = saveBlockers(scanInstrumentIssues(broken, "en")).map(issue => issue.code);
	assert.ok(codes.includes("ownerKeyDuplicate"));
});

test("a missing label waits for publication but does not block saving a draft", () => {
	const draft = content();
	draft.en.sections[0].questions[0].scales[0].options[1].label = "  ";
	const issues = scanInstrumentIssues(draft, "en");
	assert.equal(saveBlockers(issues).length, 0);
	assert.deepEqual(
		publishBlockers(issues).map(issue => issue.code),
		["optionLabelBlank"]
	);
});

test("a follow-up question must point at an answer that exists in its own section", () => {
	const draft = content();
	draft.en.sections[0].questions[1].display_if = {
		question_key: "q_1_1",
		response_key: "provision",
		any_of_option_keys: ["some"]
	};
	assert.deepEqual(publishBlockers(scanInstrumentIssues(draft, "en")), []);

	draft.en.sections[0].questions[1].display_if = {
		question_key: "q_1_1",
		response_key: "provision",
		any_of_option_keys: ["plenty"]
	};
	const issues = scanInstrumentIssues(draft, "en");
	assert.equal(saveBlockers(issues).length, 0, "identities are sound, so the draft still saves");
	assert.deepEqual(
		publishBlockers(issues).map(issue => issue.code),
		["conditionUnknownAnswer"]
	);
});

test("a follow-up cannot be shown in a workflow its source question is missing from", () => {
	const draft = content();
	draft.en.sections[0].questions[0].mode = "audit";
	draft.en.sections[0].questions[1].display_if = {
		question_key: "q_1_1",
		response_key: "provision",
		any_of_option_keys: ["some"]
	};
	assert.deepEqual(
		publishBlockers(scanInstrumentIssues(draft, "en")).map(issue => issue.code),
		["conditionModeMismatch"]
	);
});

test("questions that reveal each other in a loop are caught", () => {
	const draft = content();
	draft.en.sections[0].questions[0].display_if = {
		question_key: "q_1_2",
		response_key: "selected_option_keys",
		any_of_option_keys: ["bench"]
	};
	draft.en.sections[0].questions[1].display_if = {
		question_key: "q_1_1",
		response_key: "provision",
		any_of_option_keys: ["some"]
	};
	assert.ok(publishBlockers(scanInstrumentIssues(draft, "en")).some(issue => issue.code === "conditionLoop"));
});

test("every answer list in the instrument is scanned, not just the section questions", () => {
	const lists = collectOwningLists(instrument());
	assert.deepEqual(
		lists.map(list => scopeId(list.scope)),
		["scaleGuidance:provision", "questionScale:section_1_test/q_1_1/provision", "checklist:section_1_test/q_1_2"]
	);
});

// ── translations ─────────────────────────────────────────────────────────────

test("a translation that answers with different keys is reported and blocks publication", () => {
	const bundle = content();
	bundle.de = structuredClone(bundle.en);
	assert.deepEqual(findLocaleMismatches(bundle, "en"), []);

	bundle.de.sections[0].questions[0].scales[0].options.reverse();
	const mismatches = findLocaleMismatches(bundle, "en");
	assert.equal(mismatches.length, 1);
	assert.equal(mismatches[0].reason, "different");
	assert.ok(publishBlockers(scanInstrumentIssues(bundle, "en")).some(issue => issue.code === "localeMismatch"));
});

test("a structural change carries into translations while their wording survives", () => {
	const bundle = content();
	bundle.de = structuredClone(bundle.en);
	bundle.de.sections[0].questions[0].scales[0].options[0].label = "Nein";
	bundle.de.sections[0].questions[0].prompt = "Wie viele?";

	bundle.en.sections[0].questions[0].scales[0].options.push(scaleOption("a_lot", "A lot", 2));
	const synced = syncTranslationsToBase(bundle, "en");

	const german = synced.de.sections[0].questions[0].scales[0].options;
	assert.deepEqual(
		german.map(option => option.key),
		["no", "some", "a_lot"]
	);
	assert.equal(german[0].label, "Nein", "translated wording is kept");
	assert.equal(german[2].label, "A lot", "a brand-new answer falls back to the base wording");
	assert.equal(german[2].addition_value, 2, "scoring comes from the base language");
	assert.equal(synced.de.sections[0].questions[0].prompt, "Wie viele?");
	assert.deepEqual(findLocaleMismatches(synced, "en"), []);
});

// ── repairing a copy ─────────────────────────────────────────────────────────

function brokenCopy(): InstrumentContent {
	const broken = content();
	broken.en.sections[0].questions[0].scales[0].options = [
		scaleOption("new_option", "No"),
		scaleOption("new_option", "Some", 1),
		scaleOption("a_lot", "A lot", 2)
	];
	return broken;
}

test("only the rows that cannot be told apart are given new keys", () => {
	const plan = planOptionKeyRepairs(brokenCopy(), "en");
	assert.equal(plan.repairable, true);
	assert.deepEqual(
		plan.repairs.map(repair => repair.optionIndex),
		[0, 1]
	);
	assert.deepEqual(
		plan.repairs.map(repair => repair.label),
		["No", "Some"]
	);
	assert.ok(plan.repairs.every(repair => repair.newKey !== repair.oldKey));

	const repaired = applyOptionKeyRepairs(brokenCopy(), plan, {});
	const options = repaired.en.sections[0].questions[0].scales[0].options;
	assert.equal(new Set(options.map(option => option.key)).size, 3);
	assert.equal(options[2].key, "a_lot", "a sound key is left exactly as it was");
	assert.deepEqual(
		options.map(option => [option.label, option.addition_value]),
		[
			["No", 0],
			["Some", 1],
			["A lot", 2]
		]
	);
	assert.deepEqual(scanInstrumentIssues(repaired, "en"), []);
});

test("a follow-up pointing at a shared key has to be decided by the admin", () => {
	const broken = brokenCopy();
	broken.en.sections[0].questions[1].display_if = {
		question_key: "q_1_1",
		response_key: "provision",
		any_of_option_keys: ["new_option"]
	};

	const plan = planOptionKeyRepairs(broken, "en");
	assert.equal(plan.conditionChoices.length, 1);
	const choice = plan.conditionChoices[0];
	assert.deepEqual(
		choice.candidates.map(candidate => candidate.label),
		["No", "Some"]
	);

	const chosen = choice.candidates[1].newKey;
	const repaired = applyOptionKeyRepairs(broken, plan, { [choice.id]: chosen });
	assert.deepEqual(repaired.en.sections[0].questions[1].display_if?.any_of_option_keys, [chosen]);
});

test("a reference to a single broken key is rewritten without asking", () => {
	const broken = content();
	broken.en.sections[0].questions[0].scales[0].options[1].key = "new_option";
	broken.en.sections[0].questions[1].display_if = {
		question_key: "q_1_1",
		response_key: "provision",
		any_of_option_keys: ["new_option"]
	};

	const plan = planOptionKeyRepairs(broken, "en");
	assert.equal(plan.conditionChoices.length, 0);
	const repaired = applyOptionKeyRepairs(broken, plan, {});
	const newKey = repaired.en.sections[0].questions[0].scales[0].options[1].key;
	assert.deepEqual(repaired.en.sections[0].questions[1].display_if?.any_of_option_keys, [newKey]);
});

test("a bundle whose translations do not line up is refused rather than guessed at", () => {
	const broken = brokenCopy();
	broken.de = structuredClone(broken.en);
	broken.de.sections[0].questions[0].scales[0].options.pop();

	const plan = planOptionKeyRepairs(broken, "en");
	assert.equal(plan.repairable, false);
	assert.ok(plan.blockedMismatches.length > 0);
});

test("a translation keeps its own paragraphs and legal wording when the base grows", () => {
	const bundle = content();
	bundle.en.preamble = ["First paragraph"];
	bundle.en.legal_documents = [
		{
			key: "terms",
			short_title: "Terms",
			title: "Terms of use",
			eyebrow: "Legal",
			last_updated: "1 January 2026",
			summary: "",
			sections: []
		}
	];
	bundle.de = structuredClone(bundle.en);
	bundle.de.preamble = ["Erster Absatz"];
	bundle.de.legal_documents[0].title = "Nutzungsbedingungen";

	bundle.en.preamble.push("Second paragraph");
	const synced = syncTranslationsToBase(bundle, "en");

	assert.deepEqual(synced.de.preamble, ["Erster Absatz", "Second paragraph"]);
	assert.equal(synced.de.legal_documents[0].title, "Nutzungsbedingungen");
});

test("an answer that repeats a key names both rows, not the same one twice", () => {
	const broken = content();
	broken.en.sections[0].questions[0].scales[0].options.push(scaleOption("no", "Also no"));
	const [issue] = saveBlockers(scanInstrumentIssues(broken, "en"));

	assert.equal(issue.code, "optionKeyDuplicate");
	assert.equal(issue.values.position, 3);
	assert.equal(issue.values.firstPosition, 1);
});

test("every row of a duplicate group is renamed, with no row declared the winner", () => {
	// Two answers share a key that is valid on its own, so neither the placeholder
	// check nor the padding check fires first - only the duplicate rule does.
	const broken = content();
	broken.en.sections[0].questions[0].scales[0].options = [
		scaleOption("no", "First no"),
		scaleOption("no", "Second no"),
		scaleOption("some", "Some", 1)
	];
	broken.en.sections[0].questions[1].display_if = {
		question_key: "q_1_1",
		response_key: "provision",
		any_of_option_keys: ["no"]
	};

	const plan = planOptionKeyRepairs(broken, "en");
	assert.deepEqual(
		plan.repairs.map(repair => repair.optionIndex),
		[0, 1],
		"the row that held the key is no more identifiable than the one that repeated it"
	);
	// With two candidates the admin has to say which answer the follow-up meant.
	assert.equal(plan.conditionChoices.length, 1);
	assert.deepEqual(
		plan.conditionChoices[0].candidates.map(candidate => candidate.label),
		["First no", "Second no"]
	);

	const chosen = plan.conditionChoices[0].candidates[0].newKey;
	const repaired = applyOptionKeyRepairs(broken, plan, { [plan.conditionChoices[0].id]: chosen });
	const keys = repaired.en.sections[0].questions[0].scales[0].options.map(option => option.key);
	assert.equal(new Set(keys).size, 3);
	assert.equal(keys[2], "some", "a sound key is left alone");
	assert.deepEqual(repaired.en.sections[0].questions[1].display_if?.any_of_option_keys, [chosen]);
	assert.deepEqual(scanInstrumentIssues(repaired, "en"), []);
});

test("a repair that cannot mint keys is reported as such, not as nothing to do", () => {
	const plan = planOptionKeyRepairs(brokenCopy(), "en", () => "");
	assert.equal(plan.generatorUnavailable, true);
	assert.equal(plan.repairable, false);
	assert.deepEqual(plan.repairs, []);
});

test("a translation that disagrees is named in the admin's terms and can be opened", () => {
	const bundle = content();
	bundle.de = structuredClone(bundle.en);
	bundle.de.sections[0].questions[0].scales[0].options.reverse();

	const [issue] = scanInstrumentIssues(bundle, "en").filter(candidate => candidate.code === "localeMismatch");

	// The message and the list row read like the rest of the editor, not like a
	// storage path such as "section_1_test/q_1_1/provision".
	assert.equal(issue.values.owner, "Q 1.1 · provision");
	assert.equal(issue.location, "DE · Q 1.1 · provision");
	assert.ok(!String(issue.values.owner).includes("/"));

	// Review has somewhere to go: the translation, its Sections tab, and the question.
	assert.equal(issue.target.locale, "de");
	assert.equal(issue.target.tab, "sections");
	assert.equal(issue.target.sectionKey, "section_1_test");
	assert.equal(issue.target.questionKey, "q_1_1");
	assert.equal(issue.target.scaleKey, "provision");
});
