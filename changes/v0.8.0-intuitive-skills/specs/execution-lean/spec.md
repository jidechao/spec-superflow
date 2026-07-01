# 能力规格

## ADDED Requirements

### Requirement: Batch Inline Execution Mode

`execution-governor` SHALL support a `Batch Inline` execution mode for low-risk, same-module tasks so that multiple small tasks can be completed in the current session without dispatching one subagent per task.

#### Scenario: Activation conditions

- **WHEN** the execution contract specifies `Execution Mode: Batch Inline` or the governor auto-selects it
- **AND** all tasks in the batch modify files within the same module or directory
- **AND** no task introduces a new public API, schema, or cross-module interface
- **AND** the total estimated effort of the batch is ≤ 15 minutes
- **THEN** `execution-governor` SHALL execute the entire batch in the current session
- **AND** SHALL NOT dispatch an implementer subagent for each individual task

#### Scenario: User override

- **WHEN** the user explicitly says "use SDD" or "use Inline"
- **THEN** `execution-governor` SHALL respect the override and SHALL NOT select Batch Inline

### Requirement: Batch Inline Preserves TDD Iron Law

Even in Batch Inline mode, every code-producing task SHALL follow the TDD cycle.

#### Scenario: Batch-level TDD

- **WHEN** executing a batch of tasks in Batch Inline mode
- **THEN** the governor SHALL write or update failing tests for the first code change in the batch
- **AND** run tests to confirm failure
- **AND** implement the minimal changes across the batch to make tests pass
- **AND** run the full relevant test suite to confirm green
- **AND** SHALL NOT treat the absence of per-task subagent as an excuse to skip RED/GREEN/REFACTOR

### Requirement: Batch Inline Checkpoint

After a Batch Inline batch completes, the governor SHALL perform a lightweight checkpoint review before moving to the next batch or closure.

#### Scenario: Checkpoint content

- **WHEN** a Batch Inline batch finishes
- **THEN** the governor SHALL verify:
  1. All files declared in the batch exist and are non-empty.
  2. No placeholder markers remain in modified files.
  3. At least one relevant test was run and passed.
  4. No unintended files were modified.
- **AND** SHALL report the checkpoint result to the user

### Requirement: Batch Inline Boundaries

Batch Inline SHALL NOT be used when risk indicators are present.

#### Scenario: Risk escalation

- **WHEN** any task in the planned batch touches more than one module
- **OR** any task involves schema, API, or configuration changes
- **OR** any task has open questions or dependencies on unimplemented behavior
- **THEN** `execution-governor` SHALL downgrade to `Inline` or `SDD` mode
- **AND** SHALL report the reason for not using Batch Inline

## MODIFIED Requirements

### Requirement: Execution Mode Selection Criteria

The automatic mode selection in `execution-governor` SHALL consider Batch Inline as an intermediate option between Inline and SDD.

#### Scenario: Auto-selection with batch inline

- **WHEN** `execution-governor` receives an approved contract
- **THEN** it SHALL analyze task count, module boundaries, and risk indicators
- **AND** select modes as follows:
  - Tasks ≤ 3 and no cross-module dependencies → **Inline**
  - Tasks > 3 but all within same module, low risk, total estimated ≤ 15 min → **Batch Inline**
  - Cross-module dependencies or high-risk changes → **SDD**
- **AND** SHALL report selected mode and reasoning before execution

### Requirement: execution-contract.md Mode Field

The `Execution Mode` field in `execution-contract.md` SHALL accept `Batch Inline` in addition to `Inline` and `SDD`.

#### Scenario: Contract validation

- **WHEN** `bridge-contract` generates or updates `execution-contract.md`
- **THEN** it SHALL allow `Execution Mode: Batch Inline`
- **AND** it SHALL include a note explaining why Batch Inline is or is not selected

## REMOVED Requirements

None.
