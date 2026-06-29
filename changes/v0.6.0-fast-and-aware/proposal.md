# Change Proposal: v0.6.0 Fast & Aware

## Why

v0.5.0 建立了可靠性层（guard.mjs 守护脚本 + .spec-superflow.yaml 状态文件 + SHA256 哈希），所有变更都必须走完整的 8 状态流程（exploring → specifying → bridging → approved → executing → closing）。

这在大型变更中保证了纪律性，但对小型变更造成了不必要的开销：

1. **修改 1 个配置文件的 tweak** 仍需走完整规划流程（spec-explorer → spec-forger → bridge-contract），Agent 生成 5 份工件 + 执行契约，耗时远超修改本身
2. **修复 1 个 bug 的 hotfix** 需要完整的 specs/ 目录和 design.md，对紧急修复来说是不必要的仪式
3. **Agent 在长会话中丢失阶段上下文**——虽然有 guard.mjs 硬门禁，但 Agent 可能在压缩后忘记当前处于哪个阶段，导致"在 executing 阶段去做 specifying 的事"
4. **决策点散落各处**——契约批准在 bridge-contract、调试升级在 systematic-debugger、验证确认在 closure-archivist——没有统一的决策点清单，新 Agent 难以快速理解"何时需要停下来问用户"

v0.6.0 在 v0.5.0 的可靠地基上增加三个扩展：快速路径让简单变更走捷径，阶段防漂移让 Agent 始终知道自己在哪，决策点协议让所有"需要用户确认"的时刻有统一标准。

## What Changes

- workflow-orchestrator 新增 hotfix / tweak 两种轻量模式
- `.spec-superflow.yaml` 的 `workflow` 字段驱动模式切换（full | hotfix | tweak）
- guard.mjs 转换矩阵根据 workflow 模式条件跳过特定检查维度
- 新增 `ssf inject <change-dir>` 子命令，生成 phase-guard.md 规则文件
- 新增 `rules/phase-guard.md`，安装到 `.claude/always/` 实现每轮注入
- 新增 `docs/decision-points.md`，定义 7 个标准决策点及其协议
- 4 个 skill 文件更新（workflow-orchestrator、bridge-contract、execution-governor、closure-archivist）
- cmd-state.mjs 新增 `set` 子命令，支持设置 workflow 字段
- 版本号 → 0.6.0 + CHANGELOG + README 更新

## Capabilities

### New Capabilities

- `fast-path` — hotfix 和 tweak 轻量工作流模式，跳过完整规划
- `phase-drift-prevention` — 阶段防漂移规则注入，软硬双重防线
- `decision-point-protocol` — 7 个标准决策点的集中定义和引用协议

### Modified Capabilities

- workflow-orchestrator — 新增模式检测和快速路径路由逻辑
- bridge-contract — 新增最小契约模式（hotfix 仅提取 intent + task list）
- execution-governor — tweak 模式下支持直接编辑模式
- closure-archivist — 新增轻量闭合验证路径

## Scope

### In Scope

- 三种 workflow 模式（full / hotfix / tweak）的检测条件和跳过规则
- hotfix 升级条件：≥3 文件或架构变更 → 升级为 full
- tweak 升级条件：≥5 文件或跨模块 → 升级为 full
- `ssf inject` CLI 子命令 + phase-guard.md 生成逻辑
- 7 个决策点定义文档（需求确认、工件审查、契约批准、执行模式选择、调试升级、验证失败、归档确认）
- guard.mjs 模式感知转换矩阵
- cmd-state.mjs `set` 子命令
- 4 个 skill 文件更新
- 版本号同步到 0.6.0

### Out of Scope

- 日文 tokenizer（v0.7.0）
- 多平台适配器扩展（v0.7.0）
- skill-creator 工具包（v0.7.0）
- 新增 skill（保持 9 个 skill 不变）
- 修改 src/validation/validator.ts
- CI/CD 流程变更

## Impact

- **Affected code areas**: `scripts/guard/guard.mjs`（模式感知转换矩阵）, `scripts/lib/state-loader.mjs`（workflow 字段支持）, `scripts/lib/cmd-state.mjs`（新增 set 子命令）, `scripts/spec-superflow.mjs`（新增 inject 路由）
- **Affected APIs or interfaces**: 新增 `ssf inject <change-dir>` CLI 子命令, `ssf state set <change-dir> workflow <value>` 子命令, guard.mjs 接受 workflow 参数
- **Dependencies or systems touched**: Claude Code `.claude/always/` 目录（规则注入目标）, 4 个 skill 文件（workflow-orchestrator, bridge-contract, execution-governor, closure-archivist）
