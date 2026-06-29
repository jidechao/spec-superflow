# Changelog

All notable changes to `spec-superflow` will be documented in this file.

The format loosely follows Keep a Changelog.

## [0.4.0] - 2026-06-29

### Added

- **CLI toolchain** — `ssf` command with 6 subcommands: `list` (scan changes and report status), `validate` (artifact validation via Validator), `doctor` (health check: version sync, hooks, skills, dist, node, docs, config), `version` (one-command version sync to all manifests), `sync` (delta spec merge with conflict detection), `config` (display/modify configuration). Zero dependencies via `node:util.parseArgs`.
- **Configuration system** — Optional `spec-superflow.config.json` for customizing artifact order, skip list, execution thresholds, and verification language. Absence = v0.3.0 defaults. Deep-merge with built-in defaults. Skills query config at runtime via `scripts/get-config` bash helper.
- **Multi-language tokenizer** — `src/validation/tokenizer.ts` with English stemmer (extracted from validator) + Chinese CJK tokenizer (Unicode ranges + 2-5 char sliding window + stop words). Auto-detection based on CJK character ratio. Mixed mode runs both tokenizers and unions results.
- **Conflict detection** — `Validator.detectSyncConflicts()` detects when multiple changes modify the same requirement across unsynced delta specs. Integrated into `ssf sync` command and `spec-syncer` skill pre-flight check.
- **git worktree isolation** — execution-governor now recommends worktree creation when executing on main/master branch. Pure SKILL.md guidance, no code changes.

### Changed

- **package.json** — Added `bin` field exposing `ssf` and `spec-superflow` commands.
- **validateImplementation()** — Refactored to use `tokenize()` instead of inline `stem()`. Added optional `config` parameter for language override (`'auto' | 'en' | 'zh'`). Backward compatible — existing callers work unchanged.
- **Tokenizer refinements** — CJK sliding window extended to 2-5 chars (covers compound words like "令牌桶算法"). English min token length lowered to 3 (preserves short tokens like "jwt"). Added "based"/"using"/"used" to English stop words.
- **Version manifests** — `.cursor-plugin/plugin.json` and `gemini-extension.json` now tracked in version sync (previously lagging at 0.2.0 and 0.1.0).

### Fixed

- **Version consistency** — `ssf version` command ensures all 5 manifest files stay in sync. `ssf doctor` reports inconsistencies as warnings.

## [0.3.0] - 2026-06-27

### Added

- **Inline execution mode** — Lightweight single-session execution for small changes (≤ 3 tasks, no cross-module dependencies). Parallel to SDD subagent mode. Preserves TDD Iron Law with checkpoint review per task. Automatic mode selection with user override.
- **Abandoned terminal state** — 8th workflow state allowing graceful change abandonment from any non-terminal state. Generates `abandonment-summary.md` with reason, lessons learned, and recommendations. Blocks delta spec merge for abandoned changes. Partial code preservation supported.
- **Three-dimensional verification** — closure-archivist now verifies Completeness (all tasks/requirements implemented), Correctness (tests pass, no placeholders), and Coherence (design decisions reflected in code). New `Validator.validateImplementation()` API with word-stemming and keyword matching.
- **abandonment-summary.md template** — Structured template for documenting abandoned changes.
- **Verification types** — New exports: `VerificationDimension`, `VerificationStatus`, `VerificationFinding`, `VerificationReport`.

### Changed

- **spec-forger task planning** — Rewritten with writing-plans methodology: File Structure section, Interfaces block (Consumes/Produces), per-task TDD expansion (5 phases), exact file paths with line ranges, zero placeholder enforcement, 2-5 minute granularity per step.
- **execution-contract.md template** — Added Execution Mode (SDD | Inline) selection field and Verification Dimensions table.
- **tasks.md template** — Added File Structure and Interfaces sections for cross-batch dependency tracking.
- **State machine** — Extended from 7 to 8 states (+abandoned terminal state). Universal abandoned transition from any non-terminal state.
- **Validator engine** — New `validateImplementation(diffSummary, specContent, designContent)` method with three-dimensional `VerificationReport` return type. Word-stemming for Completeness matching, keyword-based Coherence checking.
- **closure-archivist** — Verification steps expanded from 3 to 5 (Correctness, Completeness, Coherence, Unintended Scope Detection, Verification Report). Structured output with PASS/CONDITIONAL/FAIL verdict.
- **spec-syncer** — Pre-flight guard blocks sync for abandoned changes.

## [0.2.1] - 2026-06-27

### Fixed

- **hooks.json format** — Changed from incorrect array format to Claude Code plugin record format. Event name corrected from `Startup|Clear|Compact` to standard `SessionStart`. Command path now uses `${CLAUDE_PLUGIN_ROOT}` environment variable for cross-platform compatibility.

## [0.2.0] - 2026-06-26

### Added

- **Engine layer (`src/`)** — embedded OpenSpec schema/validation/parsing engine in TypeScript
  - `src/schema/` — Requirement, Delta (ADDED/MODIFIED/REMOVED/RENAMED), Spec, Change type definitions
  - `src/validation/` — Validator class with validateSpecContent, validateChangeContent, validateDeltaSpec
  - `src/parsing/` — Requirement block parser + Delta spec parser (self-contained, no external deps)
- **3 new skills** (6 → 9 total):
  - `systematic-debugger` — 4-phase root cause debugging (Root Cause → Pattern → Hypothesis → Implementation)
  - `code-reviewer` — Unified code review (request + receive), 3 severity levels (Critical/Important/Minor)
  - `spec-syncer` — Delta Spec → Main Spec intelligent merge with conflict detection
- **SDD (Subagent-Driven Development)** — Full implementation discipline embedded in `execution-governor`:
  - `implementer-prompt.md` — Subagent implementation template with TDD evidence + self-review
  - `task-reviewer-prompt.md` — Dual-verdict review (spec compliance + code quality)
  - `code-reviewer-prompt.md` — Structured code review template
- **Helper scripts (`scripts/`)** — `task-brief`, `review-package`, `validate-artifacts`
- **Session-start hooks (`hooks/`)** — Multi-platform bootstrap (Claude Code / Cursor / Copilot CLI)
- **Content-level stale detection** — `workflow-orchestrator` now compares proposal scope vs contract intent lock

### Changed

- State machine extended from 6 to 7 states (+`debugging`)
- All 6 existing skills enhanced with embedded engine capabilities:
  - `spec-explorer` — embedded brainstorming's "one question at a time + 2-3 approach comparison"
  - `spec-forger` — Schema engine validation on every artifact + writing-plans task granularity
  - `bridge-contract` — parsing engine auto-extraction of contract fields
  - `execution-governor` — Full TDD Iron Law + SDD workflow + Review Gates
  - `closure-archivist` — verification-before-completion Iron Law
  - `workflow-orchestrator` — content-level inspection + 3 new routing targets
- Plugin metadata updated to v0.2.0 with expanded keywords across all manifest files

### Release Quality

- **TypeScript compilation** — Added `tsconfig.json` (ES2022, NodeNext, strict mode), `npm run build` produces `dist/` with declarations
- **Integration tests** — 8 test cases using real example artifacts (`docs/examples/`), `npm test` passes
- **package.json** — `main` points to `dist/index.js`, `types` to `dist/index.d.ts`
- **Documentation** — Updated English README Current Status to v0.2.0

## [0.1.0] - 2026-06-25

### Added

- Initial self-contained `spec-superflow` plugin structure
- Plugin metadata in `.claude-plugin/plugin.json`
- Six workflow skills:
  - `workflow-orchestrator`
  - `spec-explorer`
  - `spec-forger`
  - `bridge-contract`
  - `execution-governor`
  - `closure-archivist`
- Planning templates:
  - `proposal.md`
  - `spec.md`
  - `design.md`
  - `tasks.md`
  - `execution-contract.md`
- Workflow docs:
  - `docs/artifact-contract.md`
  - `docs/state-machine.md`
- Example change sets:
  - `docs/examples/add-dark-mode/` (net-new UI capability)
  - `docs/examples/refactor-auth-boundary/` (brownfield backend refactor)
- Installation guide in `INSTALL.md`
- Chinese publishing README in `README.zh-CN.md`
- Repository governance files: `.gitignore`, `CONTRIBUTING.md`, `docs/release-checklist.md`

### Notes

- First release targets Claude Code and Trae style local skill loading
- Runtime ownership remains inside `spec-superflow`
- OpenSpec and Superpowers are reference influences, not runtime dependencies
