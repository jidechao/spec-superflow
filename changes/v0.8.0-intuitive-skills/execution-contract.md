# 执行合同

## Intent Lock

- **变更名称**：v0.8.0 intuitive skill names + Batch Inline execution
- **要解决的问题**：
  1. 当前 skill 名字不够直观，`workflow-orchestrator` 等入口难以记忆。
  2. issue #5 反馈的小型前端需求（light/dark 模式）执行耗时过长，subagent 调度开销大。
- **范围内**：
  - 9 个 skill 目录重命名（入口改为 `workflow-start`）。
  - 所有 `SKILL.md` frontmatter、skill 内部引用同步。
  - `docs/state-machine.md`、`docs/decision-points.md`、`README.md`、`INSTALL.md`、`CLAUDE.md` 同步。
  - 新增 `docs/skill-rename-v0.8.0.md` 迁移文档。
  - 所有 plugin manifest 更新 skill 清单并升级到 `0.8.0`。
  - `build-executor` 增加 `Batch Inline` 模式，相关 spec 与模板更新。
  - `docs/examples/` 中的旧 skill 名同步更新。
- **范围外**：
  - 修改 `src/` 引擎 API。
  - 新增 workflow state。
  - 修改 skill 核心执行逻辑（Batch Inline 选择逻辑除外）。

## Approved Behavior

- **已批准需求摘要**：
  - Skill 重命名：所有 skill 使用“动作+对象”风格，入口为 `workflow-start`。
  - 彻底移除旧名，不提供 alias。
  - Batch Inline：对同模块、低风险、总预估 ≤15 分钟的任务批次，允许在当前会话顺序执行，不 dispatch 单任务 subagent。
- **关键场景**：
  - 用户输入 `/workflow-start` 触发入口。
  - 小型前端类需求自动或手动进入 `Batch Inline` 模式。
- **验收检查**：
  - `ssf doctor` 通过。
  - `ssf validate changes/v0.8.0-intuitive-skills` 通过。
  - `npm run build && npm test` 通过。
  - 所有 manifest 中 skill 路径正确。
  - 旧 skill 目录不存在。

## Design Constraints

- **架构约束**：保持现有 7+1 state machine 不变。
- **接口约束**：skill 名称作为客户端调用标识会改变；旧名不可用。
- **依赖约束**：插件客户端（Claude Code / Cursor / Copilot / Gemini）通过 manifest 发现 skill，manifest 必须正确。
- **数据约束**：现有示例变更集可同步更新旧名引用，但不改动其历史意图。

## Task Batches

### Batch 1

- **目标**：完成 skill 目录重命名与 frontmatter 更新。
- **输入**：当前 `skills/` 目录。
- **输出**：`skills/workflow-start/`、`skills/need-explorer/`、`skills/spec-writer/`、`skills/contract-builder/`、`skills/build-executor/`、`skills/bug-investigator/`、`skills/release-archivist/`、`skills/spec-merger/`、`skills/code-reviewer/`。
- **完成标准**：目录重命名完成，每个 `SKILL.md` 的 `name` frontmatter 已更新。

### Batch 2

- **目标**：更新 skill 内部互相引用的名称。
- **输入**：Batch 1 产出的新目录。
- **输出**：`workflow-start/SKILL.md` 等文件中的路由与引用指向新名。
- **完成标准**：`grep` 旧名在 `skills/` 下无命中（允许历史注释除外）。

### Batch 3

- **目标**：同步文档、manifests、示例。
- **输入**：Batch 2 产出的已更新 skill。
- **输出**：`docs/`、`README.md`、`INSTALL.md`、`CLAUDE.md`、plugin manifests、示例全部使用新名。
- **完成标准**：`ssf doctor` 版本与 skill 检查通过。

### Batch 4

- **目标**：实现 Batch Inline 模式并发布 v0.8.0。
- **输入**：Batch 3 同步后的工程。
- **输出**：`build-executor/SKILL.md` 增加 Batch Inline、`templates/execution-contract.md` 增加模式选项、新增/更新 spec、版本号 0.8.0、CHANGELOG 更新。
- **完成标准**：`npm test` 通过，tag `v0.8.0` 已推送，GitHub Release 与 npm 发布完成。

### Batch 5

- **目标**：收尾归档。
- **输入**：已发布版本。
- **输出**：`decision-point-audit.md`、跨平台 phase-guard 注入。
- **完成标准**：`ssf audit` 与 `ssf inject` 完成并提交。

## Test Obligations

- **必须先从失败测试开始的行为**：
  - Batch Inline 模式必须仍遵循 TDD：先写/改失败测试，再实现，再确认通过。
- **必需的边界情况**：
  - 跨模块任务不得进入 Batch Inline。
  - 用户显式选择 SDD 时不得自动降级为 Batch Inline。
  - 旧 skill 目录重命名后，manifest 中路径错误会导致 doctor 失败。
- **回归敏感区域**：
  - `skills/` 内部引用
  - plugin manifests
  - `docs/decision-points.md` 映射表

## Execution Mode

- **模式**：`SDD`
- **选择理由**：
  - 本次变更涉及大量文件重命名、文档同步、manifest 更新，跨越多个模块（skills、docs、scripts 不直接改但 manifests 涉及）。
  - 需要多批次提交与最终发布流程，适合 SDD 的 subagent/批次审查机制。
  - Batch Inline 模式作为本次新增能力，将在测试验证阶段 itself 被使用，但不改变本次变更整体采用 SDD。

## Verification Dimensions

| 维度 | 状态 | 发现 |
|------|------|------|
| Completeness | Pending | — |
| Correctness | Pending | — |
| Coherence | Pending | — |

**总体结论**：Pending

## Review Gates

- **强制审查点**：
  - Batch 1 完成后：确认目录重命名无遗漏。
  - Batch 2 完成后：确认 skill 内部引用已全局替换。
  - Batch 3 完成后：确认 `ssf doctor` 通过。
  - Batch 4 完成后：确认 `npm test` 与发布流程通过。
- **阻塞类别**：
  - 任何旧 skill 目录残留。
  - manifest 中 skill 路径错误。
  - 测试失败。

## Escalation Rules

- **何时回退到 `specifying`**：
  - 如果决定调整命名映射或新增/移除 skill。
- **何时回退到 `bridging`**：
  - 如果 Batch Inline 的触发条件或范围发生重大变化。
- **何时不得继续实现**：
  - `ssf doctor` 未通过。
  - 旧 skill 目录未完全移除。
  - 版本号未统一。
