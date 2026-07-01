# 变更提案

## Why

当前 9 个 skill 的名字（`workflow-orchestrator`、`spec-forger`、`bridge-contract` 等）对用户不够直观，尤其是入口 skill `workflow-orchestrator`，用户很难从名字判断它是工作流的触发入口。名字晦涩增加了学习成本，也削弱了“看到名字就知道作用”的目标。

另外，GitHub issue #5 反馈：给一个 demo 前端项目增加 light/dark 模式，整个工作流跑了约 4 小时，主要原因是执行阶段频繁调用自定义 subagent 完成 plan 中的任务。对于类似的小型、单模块、前端类需求，subagent 调度开销过大，需要一种更轻量的执行方式来减少往返耗时。

v0.8.0 把这几个问题放在一起解决：
1. 重命名全部 skill，使名字“见名知意”。
2. 引入“批量内联执行”优化，降低小型变更的 subagent 调用次数。
3. 修复 workflow 设计缺陷：在 `specifying` 阶段前增加用户确认门禁，避免未沟通就写方案。
4. 同步更新各 AI 平台（Claude Code / Cursor / Copilot CLI / Gemini CLI 等）的插件安装说明，确保与 v0.8.0 skill 名称和安装方式一致。

## What Changes

- 重命名 `skills/` 下所有 skill 目录；入口 skill 由 `workflow-orchestrator` 改为 `workflow-start`。
- 更新所有 skill 的 `SKILL.md` frontmatter 中的 `name` 字段。
- 更新 `workflow-start` 等 skill 内部相互引用的 skill 名称。
- 更新 `docs/state-machine.md`、`docs/decision-points.md`、`README.md`、`INSTALL.md`、`CLAUDE.md` 中对这些 skill 的引用。
- 更新 `.claude-plugin/plugin.json`、`.cursor-plugin/plugin.json`、`.codex-plugin/plugin.json`、root `plugin.json`、`gemini-extension.json` 中的 skill 清单。
- 在 `workflow-start` 和 `spec-writer` 中增加“用户确认门禁”：进入设计前必须确认关键决策（命名、范围、兼容性、沟通方式等）。
- 新增 `specs/user-confirmation-gate/spec.md`，规范 DP-0 / 设计前确认步骤。
- 更新 `INSTALL.md` 与 `README.md` 中 Claude Code、Cursor、Copilot CLI、Gemini CLI 等平台的安装说明，确保与 v0.8.0 的 skill 名称和实际安装脚本一致。
- 在 `build-executor` 中新增“批量内联执行（Batch Inline）”模式：当任务属于同一模块、风险低、且用户未强制要求 SDD 时，可把一批任务合并为一次当前会话执行，避免每个任务都 dispatch subagent。
- 更新 `specs/inline-execution/spec.md`，加入 Batch Inline 的触发条件与约束。
- 新增 `specs/execution-lean/spec.md`，规范批量执行行为。
- 更新 `templates/execution-contract.md`，增加 Execution Mode 选项：`Inline`、`Batch Inline`、`SDD`。

## 能力（Capabilities）

### 新增能力

- batch-inline-execution — 对同模块、低风险的多个任务进行批量当前会话执行，减少 subagent 调度。
- user-confirmation-gate — 进入设计前强制确认关键决策，避免未沟通就写方案。

### 修改能力

- skill-discovery — skill 目录与 frontmatter 名称全部改为直观名称，降低认知负担。

## 范围（Scope）

### 范围内（In Scope）

- 9 个 skill 的目录重命名与内部引用同步。
- 文档、manifest、模板中的 skill 名称同步。
- `build-executor` 增加 Batch Inline 模式及相关 spec 更新。
- workflow 用户确认门禁（DP-0）纳入 `workflow-start` 与 `spec-writer`。
- 各 AI 平台安装说明（`README.md` / `INSTALL.md`）同步到 v0.8.0。
- 版本号统一升级到 `0.8.0`。

### 范围外（Out of Scope）

- 修改 skill 的核心执行逻辑（除 Batch Inline 外）。
- 新增新的 workflow state。
- 修改 OpenSpec 引擎（`src/`）的 API。

## 影响（Impact）

- 影响的代码区域：`skills/`、plugin manifests、`docs/`、`templates/`、`README.md`、`INSTALL.md`、`CLAUDE.md`。
- 影响的 API 或接口：skill 名称作为 Claude Code / Cursor / Copilot 等客户端的调用标识会改变；旧名称不再可用。
- 依赖或涉及的外部系统：Claude Code plugin market、Cursor plugin、npm 包（通过 manifest 引用 skill 路径）。
