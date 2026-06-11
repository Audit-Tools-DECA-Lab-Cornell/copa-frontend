import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

import ts from "typescript";

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const BACKEND_INSTRUMENT_PATH = path.resolve(
	REPO_ROOT,
	"..",
	"audit-tools-backend",
	"app",
	"products",
	"playspace",
	"instruments",
	"pvua_v5_2.instrument.json"
);
const MODULE_CACHE = new Map();

function resolveTsModulePath(fromFilePath, moduleSpecifier) {
	if (moduleSpecifier.startsWith("@/")) {
		return path.resolve(REPO_ROOT, "src", `${moduleSpecifier.slice(2)}.ts`);
	}

	if (moduleSpecifier.startsWith("./") || moduleSpecifier.startsWith("../")) {
		const resolvedPath = path.resolve(path.dirname(fromFilePath), moduleSpecifier);
		return resolvedPath.endsWith(".ts") ? resolvedPath : `${resolvedPath}.ts`;
	}

	return null;
}

function loadTsModule(filePath) {
	const normalizedPath = path.resolve(filePath);
	const cachedModule = MODULE_CACHE.get(normalizedPath);
	if (cachedModule !== undefined) {
		return cachedModule.exports;
	}

	const sourceText = readFileSync(normalizedPath, "utf8");
	const transpiled = ts.transpileModule(sourceText, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2020
		}
	}).outputText;

	const module = { exports: {} };
	MODULE_CACHE.set(normalizedPath, module);
	const script = new vm.Script(transpiled, { filename: normalizedPath });
	script.runInNewContext({
		module,
		exports: module.exports,
		require(moduleSpecifier) {
			const tsModulePath = resolveTsModulePath(normalizedPath, moduleSpecifier);
			if (tsModulePath !== null) {
				return loadTsModule(tsModulePath);
			}
			return require(moduleSpecifier);
		},
		__dirname: path.dirname(normalizedPath),
		__filename: normalizedPath,
		console,
		process,
		Buffer,
		setTimeout,
		clearTimeout
	});

	return module.exports;
}

function loadJsonFile(filePath) {
	return JSON.parse(readFileSync(path.resolve(filePath), "utf8"));
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

const rawBackendInstrument = loadJsonFile(BACKEND_INSTRUMENT_PATH);
const BASE_PLAYSPACE_INSTRUMENT =
	rawBackendInstrument.sections !== undefined ? rawBackendInstrument : rawBackendInstrument.en;
assert(BASE_PLAYSPACE_INSTRUMENT?.sections !== undefined, "Expected backend instrument fixture to expose sections.");
const { auditDraftPatchSchema, auditDraftSaveSchema, auditSessionSchema } = loadTsModule(
	path.resolve(REPO_ROOT, "src/types/audit.ts")
);
const { buildNextQuestionAnswers, getVisibleSections, getInstrumentSectionLocalProgress } = loadTsModule(
	path.resolve(REPO_ROOT, "src/lib/audit/selectors.ts")
);

const targetSection = BASE_PLAYSPACE_INSTRUMENT.sections[0];
const targetQuestion = targetSection.questions.find(question => question.scales.length > 1);
assert(targetQuestion !== undefined, "Expected an instrument question with follow-up scales.");

const sessionFixture = {
	audit_id: "11111111-1111-4111-8111-111111111111",
	audit_code: "PVUA-WEB-001",
	project_id: "22222222-2222-4222-8222-222222222222",
	project_name: "Demo Project",
	place_id: "33333333-3333-4333-8333-333333333333",
	place_name: "Demo Place",
	place_type: "playground",
	allowed_execution_modes: ["survey", "audit", "both"],
	selected_execution_mode: "survey",
	status: "IN_PROGRESS",
	instrument_key: BASE_PLAYSPACE_INSTRUMENT.instrument_key,
	instrument_version: BASE_PLAYSPACE_INSTRUMENT.instrument_version,
	instrument: BASE_PLAYSPACE_INSTRUMENT,
	schema_version: 1,
	revision: 5,
	aggregate: {
		schema_version: 1,
		revision: 5,
		meta: { execution_mode: "survey" },
		pre_audit: {
			place_size: "medium",
			current_users_0_5: "none",
			current_users_6_12: "some",
			current_users_13_17: "none",
			current_users_18_plus: "none",
			playspace_busyness: "some",
			season: "spring",
			weather_conditions: ["windy"],
			wind_conditions: "calm"
		},
		sections: {
			[targetSection.section_key]: {
				section_key: targetSection.section_key,
				note: "Web draft note",
				responses: {
					[targetSection.questions[0].question_key]: {
						provision: "a_little_bit"
					},
					[targetQuestion.question_key]: {
						provision: "a_lot",
						[targetQuestion.scales[1].key]: targetQuestion.scales[1].options[1].key
					}
				}
			}
		}
	},
	started_at: "2026-03-24T10:00:00Z",
	submitted_at: null,
	total_minutes: null,
	meta: { execution_mode: "survey" },
	pre_audit: {
		place_size: "medium",
		current_users_0_5: "none",
		current_users_6_12: "some",
		current_users_13_17: "none",
		current_users_18_plus: "none",
		playspace_busyness: "some",
		season: "spring",
		weather_conditions: ["windy"],
		wind_conditions: "calm"
	},
	sections: {
		[targetSection.section_key]: {
			section_key: targetSection.section_key,
			note: "Web draft note",
			responses: {
				[targetSection.questions[0].question_key]: {
					provision: "a_little_bit"
				},
				[targetQuestion.question_key]: {
					provision: "a_lot",
					[targetQuestion.scales[1].key]: targetQuestion.scales[1].options[1].key
				}
			}
		}
	},
	scores: {
		draft_progress_percent: 18.75,
		execution_mode: "survey",
		audit: null,
		survey: null,
		overall: null,
		by_section: {},
		by_domain: {},
		unsure_answer_count: 1,
		unsure_variants: {
			unsure_as_zero: {
				execution_mode: "survey",
				audit: null,
				survey: null,
				overall: null,
				by_section: {},
				by_domain: {}
			},
			unsure_as_max: {
				execution_mode: "survey",
				audit: null,
				survey: null,
				overall: null,
				by_section: {},
				by_domain: {}
			}
		}
	},
	progress: {
		required_pre_audit_complete: true,
		visible_section_count: 1,
		completed_section_count: 0,
		total_visible_questions: 1,
		answered_visible_questions: 1,
		ready_to_submit: false,
		sections: [
			{
				section_key: targetSection.section_key,
				title: targetSection.title,
				visible_question_count: targetSection.questions.length,
				answered_question_count: 1,
				is_complete: false
			}
		]
	}
};

const parsedSession = auditSessionSchema.parse(sessionFixture);
assert(parsedSession.aggregate.revision === 5, "Expected audit session revision to parse.");
assert(parsedSession.scores.unsure_answer_count === 1, "Expected unsure score metadata to parse.");
assert(parsedSession.scores.unsure_variants?.unsure_as_zero !== null, "Expected unsure score variants to parse.");

const visibleSections = getVisibleSections(
	parsedSession.instrument,
	parsedSession.selected_execution_mode,
	Object.fromEntries(
		Object.entries(parsedSession.sections).map(([sectionKey, sectionState]) => [sectionKey, sectionState.responses])
	)
);
assert(visibleSections.length > 0, "Expected visible sections for the parsed session.");

const sectionProgress = getInstrumentSectionLocalProgress(
	visibleSections[0],
	parsedSession.sections[targetSection.section_key]?.responses ?? {}
);
assert(sectionProgress.answeredQuestionCount > 0, "Expected non-zero local progress.");

const collapsedAnswers = buildNextQuestionAnswers(
	{
		provision: "a_lot",
		[targetQuestion.scales[1].key]: targetQuestion.scales[1].options[1].key
	},
	targetQuestion,
	"provision",
	"no"
);
assert(
	Object.keys(collapsedAnswers).length === 1 && collapsedAnswers.provision === "no",
	"Expected provision=no to clear follow-up selections."
);

const parsedDraftPatch = auditDraftPatchSchema.parse({
	expected_revision: parsedSession.revision,
	aggregate: {
		schema_version: parsedSession.schema_version,
		meta: { execution_mode: "survey" },
		pre_audit: parsedSession.pre_audit,
		sections: {
			[targetSection.section_key]: {
				responses: parsedSession.sections[targetSection.section_key]?.responses ?? {},
				note: parsedSession.sections[targetSection.section_key]?.note ?? null
			}
		}
	},
	sections: {}
});
assert(parsedDraftPatch.expected_revision === 5, "Expected revision-aware draft patch to parse.");

const parsedSaveAck = auditDraftSaveSchema.parse({
	audit_id: sessionFixture.audit_id,
	status: "IN_PROGRESS",
	schema_version: 1,
	revision: 6,
	draft_progress_percent: 22.5,
	saved_at: "2026-03-24T10:05:00Z"
});
assert(parsedSaveAck.revision === 6, "Expected draft save ack revision to parse.");

console.log("Frontend audit contract verification passed.");
