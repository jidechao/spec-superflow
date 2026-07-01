# 能力规格

## ADDED Requirements

### Requirement: Intuitive Skill Names

All 9 skills SHALL have directory names and `SKILL.md` frontmatter `name` values that describe their role at a glance.

#### Scenario: Skill name mapping

- **WHEN** a user or script looks at `skills/`
- **THEN** each directory name SHALL clearly indicate its workflow role
- **AND** the mapping from old names to new names SHALL be documented in `docs/skill-rename-v0.8.0.md`

#### Scenario: Old names removed

- **WHEN** a user invokes a skill by its old name
- **THEN** the invocation SHALL fail (no alias retained)
- **AND** the error or documentation SHALL point to the new name

### Requirement: Manifest Skill List Synchronization

Every plugin manifest that lists skills SHALL use the new names and paths.

#### Scenario: Claude plugin manifest

- **WHEN** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are loaded
- **THEN** they SHALL reference the new skill directory names under `skills/`
- **AND** no reference to the old names SHALL remain

#### Scenario: Cursor / Copilot / Gemini manifests

- **WHEN** `.cursor-plugin/plugin.json`, `.codex-plugin/plugin.json`, `gemini-extension.json`, and root `plugin.json` are loaded
- **THEN** they SHALL reference the new skill directory names
- **AND** the `version` field SHALL be bumped to `0.8.0`

## MODIFIED Requirements

### Requirement: Internal Skill Cross-References

Skill `SKILL.md` files that route to other skills SHALL use the new names.

#### Scenario: workflow-start routing references

- **WHEN** `workflow-start` (formerly `workflow-orchestrator`) routes to the next skill
- **THEN** it SHALL reference the new names such as `spec-superflow:need-explorer`, `spec-superflow:spec-writer`, `spec-superflow:contract-builder`, etc.

#### Scenario: closure-archivist spec-syncer reference

- **WHEN** `release-archivist` (formerly `closure-archivist`) invokes the spec merge step
- **THEN** it SHALL reference `spec-superflow:spec-merger`

### Requirement: Documentation Name Consistency

All documentation that names a skill SHALL use the new names.

#### Scenario: state-machine.md

- **WHEN** `docs/state-machine.md` describes which skill is active in each state
- **THEN** it SHALL use the new names

#### Scenario: decision-points.md

- **WHEN** `docs/decision-points.md` lists associated skills in the mapping table
- **THEN** it SHALL use the new names

#### Scenario: README and INSTALL

- **WHEN** `README.md` and `INSTALL.md` mention skill names or usage examples
- **THEN** they SHALL use the new names

## REMOVED Requirements

### Requirement: Legacy skill directory names

The old skill directory names SHALL no longer exist.

**Reason**: They are replaced by intuitive names that reduce cognitive load.

**Migration**: See `docs/skill-rename-v0.8.0.md` for the full old→new mapping.
