#!/usr/bin/env python3
"""Translate locale files with LiteLLM for this web repo.

This script is designed for the web app's current i18n setup:
- Flat JSON locale files under ``messages/<locale>.json``
- Instrument JSON files like ``de.json`` or ``*.instrument.json``

It translates only missing target strings by default:
- absent keys
- empty-string values
- ``TODO: ...`` placeholders produced by ``i18next-cli extract``

Use ``--overwrite`` when you want to regenerate an entire locale from the
English source of truth.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Final, Literal, TypeAlias, cast
import litellm

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(), override=True)

FileKind: TypeAlias = Literal["json", "instrument-json"]
PathToken: TypeAlias = str | int
TranslationPath: TypeAlias = tuple[PathToken, ...]
JsonScalar: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]


class MissingValue:
    """Sentinel used to differentiate absent values from explicit null values."""


MaybeJsonValue: TypeAlias = JsonValue | MissingValue

DEFAULT_SOURCE_LOCALE: Final[str] = "en"
# Primary model: Claude 3.5 Sonnet, Fallback: Gemini 1.5 Pro
PRIMARY_MODEL: Final[str] = "anthropic/claude-3-5-sonnet-20240620"
FALLBACK_MODEL: Final[str] = "gemini/gemini-1.5-pro-latest"

DEFAULT_TIMEOUT_SECONDS: Final[float] = 120.0
DEFAULT_RETRIES: Final[int] = 3
DEFAULT_BATCH_ITEM_LIMIT: Final[int] = 40
DEFAULT_BATCH_CHARACTER_LIMIT: Final[int] = 5000

PLACEHOLDER_PATTERN: Final[re.Pattern[str]] = re.compile(r"\{\{[^{}]+\}\}")
HTML_TAG_PATTERN: Final[re.Pattern[str]] = re.compile(r"</?[A-Za-z][^>]*>")
CODE_SPAN_PATTERN: Final[re.Pattern[str]] = re.compile(r"`[^`]+`")

LOCALE_STYLE_HINTS: Final[dict[str, str]] = {
    "de": (
        "Use natural, professional German for a field-audit mobile app. Prefer the formal "
        "address form ('Sie') when the source addresses the user directly."
    ),
    "fr": (
        "Use natural, professional French for a field-audit mobile app. Prefer the formal "
        "address form ('Vous') when the source addresses the user directly."
    ),
}

# Keys that should never have their values translated in instrument-like files.
NON_TRANSLATABLE_KEYS: Final[set[str]] = {
    "instrument_key",
    "instrument_version",
    "current_sheet",
    "source_files",
    "key",
    "input_type",
    "page_key",
    "visible_modes",
    "group_key",
    "section_key",
    "required",
}

MISSING: Final[MissingValue] = MissingValue()


class TranslationScriptError(Exception):
    """Base error type for translation-script failures."""


@dataclass(frozen=True)
class ScriptConfig:
    """Runtime configuration for the translation script."""

    repo_root: Path
    locales_dir: Path
    source_locale: str
    target_locales: tuple[str, ...]
    model: str
    fallback_model: str
    overwrite: bool
    dry_run: bool
    file_filters: tuple[str, ...]
    format_filter: Literal["all", "json", "instrument-json"]
    retries: int
    timeout_seconds: float
    batch_item_limit: int
    batch_character_limit: int
    verbose: bool


@dataclass(frozen=True)
class TranslatableFile:
    """Description of one locale file that may need translations."""

    kind: FileKind
    locale: str
    source_path: Path
    target_path: Path


@dataclass(frozen=True)
class TranslationEntry:
    """One source string that should be translated into the target locale."""

    identifier: str
    path: TranslationPath
    source_text: str


@dataclass(frozen=True)
class TranslationBatch:
    """A bounded set of translation entries for one API request."""

    entries: tuple[TranslationEntry, ...]


@dataclass(frozen=True)
class FileTranslationResult:
    """Summary for one translated file."""

    file: TranslatableFile
    translated_count: int
    updated: bool


def main() -> int:
    """Parse CLI arguments, translate requested files, and return an exit code."""
    try:
        config = build_config()
        translator = LiteLLMTranslator(config)
        results = translate_requested_files(config, translator)
        print_summary(results, dry_run=config.dry_run)
        return 0
    except KeyboardInterrupt:
        print("Cancelled by user.", file=sys.stderr)
        return 130
    except TranslationScriptError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception as error:
        print(f"Unexpected error: {error}", file=sys.stderr)
        return 1


def build_config() -> ScriptConfig:
    """Build a validated runtime config from CLI arguments and repo defaults."""
    repo_root = Path(__file__).resolve().parents[2]
    locales_dir = repo_root / "messages"
    parser = build_argument_parser(locales_dir=locales_dir)
    args = parser.parse_args()

    if not locales_dir.is_dir():
        raise TranslationScriptError(f"Messages directory was not found: {locales_dir}")

    source_locale = args.source_locale.strip()
    if source_locale == "":
        raise TranslationScriptError("The source locale cannot be empty.")

    source_locale_path = locales_dir / f"{source_locale}.json"
    if not source_locale_path.is_file():
        raise TranslationScriptError(
            f"Source locale file was not found: {source_locale_path}"
        )

    target_locales = resolve_target_locales(
        locales_dir=locales_dir,
        source_locale=source_locale,
        requested_locales=tuple(args.target_locale or []),
    )

    return ScriptConfig(
        repo_root=repo_root,
        locales_dir=locales_dir,
        source_locale=source_locale,
        target_locales=target_locales,
        model=args.model,
        fallback_model=args.fallback_model,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
        file_filters=tuple(args.file or []),
        format_filter=args.format,
        retries=args.retries,
        timeout_seconds=args.timeout_seconds,
        batch_item_limit=args.batch_item_limit,
        batch_character_limit=args.batch_character_limit,
        verbose=args.verbose,
    )


def build_argument_parser(locales_dir: Path) -> argparse.ArgumentParser:
    """Create the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description="Translate missing i18n strings with LiteLLM (Claude/Gemini).",
    )
    parser.add_argument(
        "--source-locale",
        default=DEFAULT_SOURCE_LOCALE,
        help=f"Primary source locale. Defaults to {DEFAULT_SOURCE_LOCALE}.",
    )
    parser.add_argument(
        "--target-locale",
        action="append",
        help="Target locale to translate. Repeat for multiple locales.",
    )
    parser.add_argument(
        "--format",
        choices=("all", "json", "instrument-json"),
        default="all",
        help="Limit translation to JSON namespaces or instrument JSON files.",
    )
    parser.add_argument(
        "--file",
        action="append",
        help="Optional file suffix filter.",
    )
    parser.add_argument(
        "--model",
        default=PRIMARY_MODEL,
        help=f"Primary model to use. Defaults to {PRIMARY_MODEL}.",
    )
    parser.add_argument(
        "--fallback-model",
        default=FALLBACK_MODEL,
        help=f"Fallback model to use. Defaults to {FALLBACK_MODEL}.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Retranslate every source string.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned work without writing files.",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=float,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"Per-request timeout. Defaults to {DEFAULT_TIMEOUT_SECONDS}.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=DEFAULT_RETRIES,
        help=f"Retry count. Defaults to {DEFAULT_RETRIES}.",
    )
    parser.add_argument(
        "--batch-item-limit",
        type=int,
        default=DEFAULT_BATCH_ITEM_LIMIT,
        help=f"Max strings per request. Defaults to {DEFAULT_BATCH_ITEM_LIMIT}.",
    )
    parser.add_argument(
        "--batch-character-limit",
        type=int,
        default=DEFAULT_BATCH_CHARACTER_LIMIT,
        help=f"Max characters per request. Defaults to {DEFAULT_BATCH_CHARACTER_LIMIT}.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print additional progress information.",
    )
    return parser


def resolve_target_locales(
    locales_dir: Path, source_locale: str, requested_locales: tuple[str, ...]
) -> tuple[str, ...]:
    """Resolve which target locale folders should be processed."""
    if len(requested_locales) > 0:
        cleaned_locales = tuple(
            locale.strip() for locale in requested_locales if locale.strip() != ""
        )
        if len(cleaned_locales) == 0:
            raise TranslationScriptError(
                "At least one non-empty --target-locale value is required."
            )
        return cleaned_locales

    discovered_locales = tuple(
        sorted(
            locale_file.stem
            for locale_file in locales_dir.glob("*.json")
            if locale_file.is_file() and locale_file.stem != source_locale
        )
    )
    if len(discovered_locales) == 0:
        raise TranslationScriptError("No target locale files were found.")
    return discovered_locales


def translate_requested_files(
    config: ScriptConfig, translator: LiteLLMTranslator
) -> list[FileTranslationResult]:
    """Translate all files selected by the current CLI configuration."""
    results: list[FileTranslationResult] = []

    for locale in config.target_locales:
        locale_files = discover_translatable_files(config=config, locale=locale)
        if len(locale_files) == 0:
            print(f"No files matched for locale {locale}.")
            continue

        for file in locale_files:
            if file.kind == "json":
                result = translate_json_file(
                    config=config, translator=translator, file=file
                )
            else:
                result = translate_instrument_json_file(
                    config=config, translator=translator, file=file
                )
            results.append(result)
    return results


def discover_translatable_files(
    config: ScriptConfig, locale: str
) -> list[TranslatableFile]:
    """List locale files that match the requested format and optional file filters."""
    source_locale_path = config.locales_dir / f"{config.source_locale}.json"
    target_locale_path = config.locales_dir / f"{locale}.json"
    files: list[TranslatableFile] = []

    if config.format_filter in ("all", "json"):
        files.append(
            TranslatableFile(
                kind="json",
                locale=locale,
                source_path=source_locale_path,
                target_path=target_locale_path,
            )
        )

    if config.format_filter in ("all", "instrument-json"):
        possible_roots = [config.repo_root, config.repo_root.parent]
        for root in possible_roots:
            root_json = root / f"{locale}.json"
            if root_json.is_file():
                files.append(
                    TranslatableFile(
                        kind="instrument-json",
                        locale=locale,
                        source_path=root_json,
                        target_path=root_json,
                    )
                )
            for path in root.rglob("*.instrument.json"):
                if "node_modules" in path.parts:
                    continue
                files.append(
                    TranslatableFile(
                        kind="instrument-json",
                        locale=locale,
                        source_path=path,
                        target_path=path,
                    )
                )

    if len(config.file_filters) == 0:
        return files
    return [
        file
        for file in files
        if file_matches_filters(file=file, filters=config.file_filters)
    ]


def file_matches_filters(file: TranslatableFile, filters: tuple[str, ...]) -> bool:
    """Return True when a file path matches any of the user-provided suffix filters."""
    source_suffix = file.source_path.as_posix()
    target_suffix = file.target_path.as_posix()
    for value in filters:
        normalized_filter = value.strip().replace("\\", "/")
        if normalized_filter == "":
            continue
        if source_suffix.endswith(normalized_filter) or target_suffix.endswith(
            normalized_filter
        ):
            return True
    return False


def translate_json_file(
    config: ScriptConfig, translator: LiteLLMTranslator, file: TranslatableFile
) -> FileTranslationResult:
    """Translate one JSON namespace file."""
    source_data = cast(JsonValue, read_json_file(file.source_path))
    current_target_data: JsonValue = (
        cast(JsonValue, read_json_file(file.target_path))
        if file.target_path.is_file()
        else cast(JsonValue, {})
    )
    translation_entries = collect_translation_entries(
        source_value=source_data,
        current_value=current_target_data,
        overwrite=config.overwrite,
    )

    if len(translation_entries) == 0:
        print(
            f"Skipping {file.target_path.relative_to(config.repo_root)} (no missing strings)."
        )
        return FileTranslationResult(file=file, translated_count=0, updated=False)

    print(
        f"Translating {len(translation_entries)} strings in {file.target_path.relative_to(config.repo_root)} ..."
    )
    translated_mapping = translator.translate_entries(
        target_locale=file.locale, entries=translation_entries
    )
    next_target_data = merge_translations_into_value(
        source_value=source_data,
        current_value=current_target_data,
        translated_mapping=translated_mapping,
    )
    ordered_output = reorder_like_source(
        source_value=source_data, target_value=next_target_data
    )

    if not config.dry_run:
        write_json_file(path=file.target_path, value=ordered_output)
    return FileTranslationResult(
        file=file, translated_count=len(translation_entries), updated=not config.dry_run
    )


def translate_instrument_json_file(
    config: ScriptConfig, translator: LiteLLMTranslator, file: TranslatableFile
) -> FileTranslationResult:
    """Translate one instrument JSON file."""
    all_data = read_json_file(file.target_path)
    if not isinstance(all_data, dict):
        raise TranslationScriptError(f"Expected a dict in {file.target_path}")

    is_multi_locale = config.source_locale in all_data and isinstance(
        all_data[config.source_locale], dict
    )
    if is_multi_locale:
        source_data = all_data[config.source_locale]
        current_target_data = all_data.get(file.locale, {})
    else:
        if file.source_path != file.target_path:
            source_data = read_json_file(file.source_path)
            current_target_data = all_data
        else:
            source_data = all_data
            current_target_data = {}

    translation_entries = collect_translation_entries(
        source_value=source_data,
        current_value=current_target_data,
        overwrite=config.overwrite,
        skip_keys=NON_TRANSLATABLE_KEYS,
    )

    if len(translation_entries) == 0:
        print(
            f"Skipping {file.target_path.name} locale {file.locale} (no missing strings)."
        )
        return FileTranslationResult(file=file, translated_count=0, updated=False)

    print(
        f"Translating {len(translation_entries)} strings in {file.target_path.name} locale {file.locale} ..."
    )
    translated_mapping = translator.translate_entries(
        target_locale=file.locale, entries=translation_entries
    )
    next_target_data = merge_translations_into_value(
        source_value=source_data,
        current_value=current_target_data,
        translated_mapping=translated_mapping,
    )
    ordered_output = reorder_like_source(
        source_value=source_data, target_value=next_target_data
    )

    if not config.dry_run:
        if is_multi_locale:
            all_data[file.locale] = ordered_output
            write_json_file(path=file.target_path, value=all_data)
        else:
            write_json_file(path=file.target_path, value=ordered_output)

    return FileTranslationResult(
        file=file, translated_count=len(translation_entries), updated=not config.dry_run
    )


def read_json_file(path: Path) -> JsonValue:
    with path.open("r", encoding="utf-8") as f:
        return cast(JsonValue, json.load(f))


def write_json_file(path: Path, value: JsonValue) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(value, f, ensure_ascii=False, indent=4)
        f.write("\n")


def collect_translation_entries(
    source_value: JsonValue,
    current_value: MaybeJsonValue,
    overwrite: bool,
    path: TranslationPath = (),
    skip_keys: set[str] | None = None,
) -> list[TranslationEntry]:
    entries: list[TranslationEntry] = []
    if isinstance(source_value, str):
        if should_translate_string(source_value, current_value, overwrite):
            entries.append(
                TranslationEntry(
                    identifier=translation_path_to_identifier(path),
                    path=path,
                    source_text=source_value,
                )
            )
        return entries
    if isinstance(source_value, list):
        curr_list = current_value if isinstance(current_value, list) else None
        for i, item in enumerate(source_value):
            next_curr = curr_list[i] if curr_list and i < len(curr_list) else MISSING
            entries.extend(
                collect_translation_entries(
                    item, next_curr, overwrite, (*path, i), skip_keys
                )
            )
        return entries
    if isinstance(source_value, dict):
        curr_dict = current_value if isinstance(current_value, dict) else None
        for k, v in source_value.items():
            if skip_keys and k in skip_keys:
                continue
            next_curr = curr_dict[k] if curr_dict and k in curr_dict else MISSING
            entries.extend(
                collect_translation_entries(
                    v, next_curr, overwrite, (*path, k), skip_keys
                )
            )
        return entries
    return entries


def should_translate_string(
    source_text: str, current_value: MaybeJsonValue, overwrite: bool
) -> bool:
    if not source_text.strip():
        return False
    if overwrite or isinstance(current_value, MissingValue):
        return True
    if isinstance(current_value, str):
        stripped = current_value.strip()
        return not stripped or stripped.startswith("TODO:")
    return False


def merge_translations_into_value(
    source_value: JsonValue,
    current_value: JsonValue,
    translated_mapping: dict[str, str],
) -> JsonValue:
    next_val = copy.deepcopy(current_value)
    if not isinstance(next_val, (dict, list)):
        next_val = {} if isinstance(source_value, dict) else []
    for ident, text in translated_mapping.items():
        set_nested_value(
            cast(JsonValue, next_val), identifier_to_translation_path(ident), text
        )
    return cast(JsonValue, next_val)


def set_nested_value(root: JsonValue, path: TranslationPath, value: str) -> None:
    if not path:
        raise TranslationScriptError("Empty path.")
    curr = root
    for i, token in enumerate(path):
        last = i == len(path) - 1
        if isinstance(token, str):
            if not isinstance(curr, dict):
                raise TranslationScriptError("Expected dict.")
            if last:
                curr[token] = value
            else:
                if token not in curr or not isinstance(curr[token], (dict, list)):
                    curr[token] = [] if isinstance(path[i + 1], int) else {}
                curr = curr[token]
        else:
            if not isinstance(curr, list):
                raise TranslationScriptError("Expected list.")
            while len(curr) <= token:
                curr.append(None)
            if last:
                curr[token] = value
            else:
                if curr[token] is None or not isinstance(curr[token], (dict, list)):
                    curr[token] = [] if isinstance(path[i + 1], int) else {}
                curr = curr[token]


def reorder_like_source(source_value: JsonValue, target_value: JsonValue) -> JsonValue:
    if isinstance(source_value, dict) and isinstance(target_value, dict):
        ordered = {
            k: reorder_like_source(source_value[k], target_value[k])
            for k in source_value
            if k in target_value
        }
        ordered.update({k: v for k, v in target_value.items() if k not in ordered})
        return ordered
    if isinstance(source_value, list) and isinstance(target_value, list):
        return [
            reorder_like_source(source_value[i] if i < len(source_value) else v, v)
            for i, v in enumerate(target_value)
        ]
    return target_value


def translation_path_to_identifier(path: TranslationPath) -> str:
    if not path:
        return "$"
    parts = []
    for t in path:
        if isinstance(t, int):
            parts.append(f"[{t}]")
        elif not parts:
            parts.append(t)
        else:
            parts.append(f".{t}")
    return "".join(parts)


def identifier_to_translation_path(identifier: str) -> TranslationPath:
    if identifier == "$":
        return ()
    path = []
    buffer = ""
    i = 0
    while i < len(identifier):
        c = identifier[i]
        if c == ".":
            if buffer:
                path.append(buffer)
                buffer = ""
            i += 1
            continue
        if c == "[":
            if buffer:
                path.append(buffer)
                buffer = ""
            end = identifier.find("]", i)
            path.append(int(identifier[i + 1 : end]))
            i = end + 1
            continue
        buffer += c
        i += 1
    if buffer:
        path.append(buffer)
    return tuple(path)


def print_summary(results: list[FileTranslationResult], dry_run: bool) -> None:
    translated = [r for r in results if r.translated_count > 0]
    total = sum(r.translated_count for r in translated)
    if not results:
        print("No files processed.")
    elif not total:
        print("All up to date.")
    else:
        print(
            f"{'Planned' if dry_run else 'Translated'} {total} strings across {len(translated)} file(s)."
        )


class LiteLLMTranslator:
    """Translator using LiteLLM with Claude as primary and Gemini as fallback."""

    def __init__(self, config: ScriptConfig) -> None:
        self._config = config

    def translate_entries(
        self, target_locale: str, entries: list[TranslationEntry]
    ) -> dict[str, str]:
        batches = build_translation_batches(
            entries, self._config.batch_item_limit, self._config.batch_character_limit
        )
        mapping = {}
        for i, batch in enumerate(batches, 1):
            if self._config.verbose:
                print(f"  Batch {i}/{len(batches)} ({len(batch.entries)} strings)")
            mapping.update(self._translate_one_batch(target_locale, batch))
        return mapping

    def _translate_one_batch(
        self, target_locale: str, batch: TranslationBatch
    ) -> dict[str, str]:
        instructions = build_translation_instructions(target_locale)
        input_data = {
            "entries": [
                {"id": e.identifier, "source_text": e.source_text}
                for e in batch.entries
            ]
        }

        prompt = f"{instructions}\n\nInput JSON:\n{json.dumps(input_data, indent=2)}"

        for attempt in range(self._config.retries):
            model = self._config.model if attempt == 0 else self._config.fallback_model
            try:
                response = litellm.completion(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    timeout=self._config.timeout_seconds,
                )
                content = response.choices[0].message.content
                parsed = json.loads(content)
                return validate_translation_payload(parsed, batch.entries)
            except Exception as e:
                if attempt == self._config.retries - 1:
                    raise TranslationScriptError(
                        f"Batch failed after {self._config.retries} attempts: {e}"
                    )
                print(
                    f"    Attempt {attempt + 1} failed with {model}, retrying with {self._config.fallback_model if attempt == 0 else model}..."
                )
                time.sleep(2**attempt)
        return {}


def build_translation_batches(
    entries: list[TranslationEntry], item_limit: int, char_limit: int
) -> list[TranslationBatch]:
    batches, curr_entries, curr_chars = [], [], 0
    for e in entries:
        if len(curr_entries) >= item_limit or (
            curr_entries and curr_chars + len(e.source_text) > char_limit
        ):
            batches.append(TranslationBatch(tuple(curr_entries)))
            curr_entries, curr_chars = [], 0
        curr_entries.append(e)
        curr_chars += len(e.source_text)
    if curr_entries:
        batches.append(TranslationBatch(tuple(curr_entries)))
    return batches


def build_translation_instructions(target_locale: str) -> str:
    hint = LOCALE_STYLE_HINTS.get(target_locale, "Use natural, professional language.")
    return (
        "You are a professional software localization translator.\n"
        f"{hint}\n"
        "Translate each `source_text` into the target locale.\n"
        'Return JSON only: { "translations": [{ "id": "...", "text": "..." }] }\n'
        "Preserve placeholders ({{value}}, <strong>, **bold**, `code`) exactly.\n"
        "Do not translate IDs or technical names."
    )


def validate_translation_payload(
    payload: dict, entries: tuple[TranslationEntry, ...]
) -> dict[str, str]:
    translations = payload.get("translations", [])
    if len(translations) != len(entries):
        raise TranslationScriptError(
            f"Expected {len(entries)} translations, got {len(translations)}"
        )
    mapping = {t["id"]: t["text"] for t in translations if "id" in t and "text" in t}
    if len(mapping) != len(entries):
        raise TranslationScriptError("Missing IDs in response.")
    return mapping


if __name__ == "__main__":
    sys.exit(main())
