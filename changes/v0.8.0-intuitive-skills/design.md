# 设计文档

## 目标

1. 让 9 个 skill 的名字“见名知意”，降低新用户认知成本。
2. 解决 issue #5 中反映的小型前端类需求执行耗时过长的问题，通过“批量内联执行”减少 subagent 调度。
3. 修复 workflow 设计缺陷：在 `specifying` 阶段前增加用户确认门禁（DP-0），避免未沟通就写方案。
4. 同步更新各 AI 平台的插件安装说明，确保与 v0.8.0 skill 名称和安装方式一致。

## Skill 重命名映射

| 旧名称 | 新名称 | 含义 |
|--------|--------|------|
| `workflow-orchestrator` | `workflow-start` | 工作流入口，决定下一步走哪个 skill |
| `spec-explorer` | `need-explorer` | 需求探索，澄清需求、比较方案 |
| `spec-forger` | `spec-writer` | 规格撰写，产出 proposal/specs/design/tasks |
| `bridge-contract` | `contract-builder` | 契约构建，把规划工件压缩成 execution-contract |
| `execution-governor` | `build-executor` | 构建执行，按契约实现代码 |
| `systematic-debugger` | `bug-investigator` | 缺陷调查，4 阶段根因调试 |
| `code-reviewer` | `code-reviewer` | 代码审查，保持不变 |
| `closure-archivist` | `release-archivist` | 发布归档，收尾验证与归档 |
| `spec-syncer` | `spec-merger` | 规格合并，把 delta spec 合并进主规格 |

## 命名原则

- 动作 + 对象：如 `spec-writer`、`contract-builder`、`bug-investigator`。
- 保留唯一入口：`workflow-start` 直接说明它是工作流的启动入口。
- 不出现生僻词：去掉 `orchestrator`、`forger`、`archivist` 等需要额外解释的词汇。
- 不引入空格：所有目录名保持 kebab-case，与 Claude Code skill 加载规则兼容。

## 影响面

### 必须同步的文件

1. `skills/` 目录重命名。
2. 每个 skill 的 `SKILL.md` frontmatter `name`。
3. Skill 内部互相引用的名称，例如 `workflow-start/SKILL.md` 中的路由目标、`release-archivist/SKILL.md` 中对 `spec-merger` 的引用。
4. `docs/state-machine.md` 各状态关联的 skill 名称。
5. `docs/decision-points.md` 决策点映射表。
6. `README.md`、`INSTALL.md`、`CLAUDE.md` 中所有示例和说明。
7. `docs/examples/` 中引用旧 skill 名的 README 或说明。
8. 新增 `docs/skill-rename-v0.8.0.md` 迁移对照表。
9. 所有 plugin manifest：
   - `.claude-plugin/plugin.json`
   - `.claude-plugin/marketplace.json`
   - `.cursor-plugin/plugin.json`
   - `.codex-plugin/plugin.json`
   - `gemini-extension.json`
   - root `plugin.json`

### 不修改的内容

- `src/` 引擎的 API 与类型。
- `scripts/` 中不依赖 skill 名称的逻辑（如 `guard.mjs`、`cmd-*.mjs`）。

## 用户确认门禁（DP-0）设计

### 问题

当前 `workflow-start` 在检测到需求不清时才会提问，一旦需求明确就直接路由到 `spec-writer` 生成工件。这导致 agent 可能在用户还没确认命名风格、范围取舍、兼容性策略等关键决策时，就把完整方案写好了。

### 方案

在 `workflow-start` 中增加一个**设计前确认门禁（DP-0）**：

- 当规划工件不存在或不完整时，先向用户确认：
  1. 变更名称与范围。
  2. 是否有已知约束（如命名风格、兼容性策略、受影响平台）。
  3. 是否包含相关优化（如本次 issue #5 的 Batch Inline）。
  4. 用户偏好：是先问清楚再写方案，还是先给草案再迭代。
- 确认结果写入 `.spec-superflow.yaml` 的 `dp_0_decisions`、`dp_0_confirmed`、`dp_0_timestamp`。
- `spec-writer` 在生成工件前读取 `dp_0_*`，尊重已确认决策；遇到未覆盖决策时暂停并提问。

### 需要修改的工件

- `skills/workflow-start/SKILL.md`：增加 DP-0 检查与提问流程。
- `skills/spec-writer/SKILL.md`：增加读取 `dp_0_*` 的约束。
- `specs/user-confirmation-gate/spec.md`：规范 DP-0 行为。
- `scripts/lib/state-loader.mjs`：确保 `dp_0_decisions`、`dp_0_confirmed`、`dp_0_timestamp` 在 `SETTABLE_FIELDS` 中。

## 各 AI 平台安装说明同步

### 需要更新的文件

- `README.md`：skill 列表、入口命令、版本号、平台表格。
- `INSTALL.md`：Claude Code、Cursor、Copilot CLI、Gemini CLI 的安装步骤，需使用新的 skill 名称和 v0.8.0 安装脚本。
- `docs/skill-rename-v0.8.0.md`：迁移文档中包含各平台重新安装或刷新插件的说明。

### 注意事项

- `.cursor/` 目录是 `scripts/install-cursor.mjs` 在用户本地生成的运行时配置，已加入 `.gitignore`，不应提交到仓库。
- 各平台 manifest 中的 `skills` 字段必须指向新的目录名，否则客户端无法加载。

## 批量内联执行（Batch Inline）设计

### 问题

Issue #5 中，light/dark 模式这类单模块、低风险的前端需求被拆成过多细小任务，每个任务都走“dispatch implementer → review → fix”的 SDD 流程，subagent 往返开销占比过高。

### 方案

在 `build-executor` 中增加 `Batch Inline` 模式：

- 当任务数量超过 `Inline` 阈值（3 个），但所有任务都在同一模块、风险低、总预估 ≤ 15 分钟时，直接在当前会话按批次执行。
- 不 dispatch 单个 task subagent，由当前 agent 顺序完成一批任务。
- 仍然遵守 TDD：先写/改失败测试，再实现，再跑绿。
- 批次结束后做一次轻量 checkpoint：文件存在、无占位符、测试通过、无越界修改。

### 触发条件

自动选择优先级：

1. 用户显式选择 `Inline` / `Batch Inline` / `SDD` → 尊重用户。
2. 任务 ≤ 3 且无跨模块依赖 → `Inline`。
3. 任务 > 3、全部同模块、无 schema/API/配置变更、总预估 ≤ 15 分钟 → `Batch Inline`。
4. 其他 → `SDD`。

### 与现有 Inline 模式的区别

| 维度 | Inline | Batch Inline | SDD |
|------|--------|--------------|-----|
| 任务数 | ≤ 3 | > 3 但同模块 | 任意 |
| 执行会话 | 当前会话 | 当前会话 | subagent |
| subagent 数 | 0 | 0 | 每任务/每批次 |
| TDD | 每任务 | 批次内保持 | 每任务 |
| 适用场景 | 极小改动 | 单模块小功能 | 多模块/高风险 |

### 需要修改的工件

- `skills/build-executor/SKILL.md`：增加 Batch Inline 选择逻辑与 checkpoint。
- `templates/execution-contract.md`：Execution Mode 增加 `Batch Inline`。
- `specs/inline-execution/spec.md`：扩展模式说明。
- 新增 `specs/execution-lean/spec.md`：独立描述 Batch Inline 行为。

## 迁移兼容性

v0.8.0 是 breaking change：旧 skill 名称不再可用。通过新增 `docs/skill-rename-v0.8.0.md` 帮助已升级用户迁移。

## 测试策略

1. `ssf doctor` 通过：skill 目录与 manifest 一致、版本一致。
2. `ssf validate changes/v0.8.0-intuitive-skills` 通过。
3. `npm run build && npm test` 通过。
4. 手动检查 `workflow-start/SKILL.md` 中所有路由引用指向新名称。
5. 手动检查 plugin manifests 中 skill 路径正确。
