# 能力规格

## ADDED Requirements

### Requirement: User Confirmation Gate Before Design

`workflow-start` SHALL require user confirmation of key decisions before routing to `spec-writer` for artifact generation.

#### Scenario: First contact with a new change

- **WHEN** `workflow-start` detects that planning artifacts do not exist or are incomplete
- **AND** the user has not yet confirmed scope and key decisions
- **THEN** `workflow-start` SHALL pause routing
- **AND** SHALL ask the user at least the following:
  1. What is the change name / scope?
  2. Are there any known constraints (e.g., naming style, compatibility policy, platforms affected)?
  3. Should this change include related optimizations (e.g., issue #5 Batch Inline) or stay focused?
  4. Does the user prefer to be asked before each design decision, or receive a draft for review?
- **AND** SHALL record confirmed decisions in `.spec-superflow.yaml` under `dp_0_*` fields or equivalent notes
- **AND** SHALL NOT route to `spec-writer` until the user explicitly confirms

#### Scenario: Resuming an existing change

- **WHEN** `workflow-start` detects that `dp_0_confirmed` is `true` in `.spec-superflow.yaml`
- **THEN** it SHALL skip the confirmation gate
- **AND** proceed with normal state detection and routing

### Requirement: Spec-Writer Honors Confirmed Decisions

`spec-writer` SHALL read confirmed decisions from the state file before generating or revising artifacts.

#### Scenario: Generating proposal.md

- **WHEN** `spec-writer` begins writing `proposal.md`
- **THEN** it SHALL first read `.spec-superflow.yaml` for `dp_0_*` notes
- **AND** SHALL respect confirmed constraints (e.g., naming style, scope inclusions)
- **AND** SHALL NOT silently expand scope beyond what was confirmed

#### Scenario: Detecting unconfirmed decisions

- **WHEN** `spec-writer` encounters a decision that was not covered by the confirmation gate
- **THEN** it SHALL pause artifact generation
- **AND** SHALL ask the user the specific question before continuing

### Requirement: State Fields for DP-0

`.spec-superflow.yaml` SHALL support a `dp_0` section to record the design-confirmation gate.

#### Scenario: State initialization

- **WHEN** `ssf state init <change-dir>` runs
- **THEN** it SHALL create empty `dp_0_decisions` and `dp_0_confirmed` fields

#### Scenario: Confirming the gate

- **WHEN** the user confirms the design-preparation questions
- **THEN** `workflow-start` SHALL run `ssf state set <dir> dp_0_confirmed true`
- **AND** SHALL run `ssf state set <dir> dp_0_decisions "<summary>"`
- **AND** SHALL run `ssf state set <dir> dp_0_timestamp <iso8601>`

## MODIFIED Requirements

### Requirement: Workflow Routing Updated

`workflow-start/SKILL.md` SHALL include the confirmation gate in its routing rules.

#### Scenario: Routing to spec-writer

- **WHEN** `workflow-start` would normally route to `spec-writer`
- **THEN** it SHALL first check `dp_0_confirmed`
- **AND** if not confirmed, ask the user the required questions

## REMOVED Requirements

None.
