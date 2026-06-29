# v0.6.0 启动提示语

复制以下内容到新会话：

---

用 workflow-orchestrator 开始，我要实现 spec-superflow v0.6.0。

## 背景

v0.5.0 刚发布，增加了可靠性层（守护脚本 + 状态文件 + SHA256 哈希）。v0.6.0 在可靠地基上增加三个扩展功能。

仓库路径：`/Users/magebte/Documents/magebyte/open-source-plugins/spec-superflow`

## v0.6.0 三个功能

### 1. 快速路径 hotfix / tweak

workflow-orchestrator 新增两种轻量模式，跳过完整规划流程。

**hotfix 模式：**
- 触发：用户明确说"hotfix"或"quick fix"，且 ≤3 文件、无新模块、无 schema 变更
- 跳过：spec-explorer、spec-forger
- 走：最小 bridge-contract（只提取 intent + task list）→ inline execution → 轻量 closure
- 依赖 v0.5.0 的 `.spec-superflow.yaml` 中 `workflow` 字段区分模式

**tweak 模式：**
- 触发：用户明确说"tweak"或"small change"，且纯配置/文档/提示词修改
- 跳过：spec-explorer、spec-forger、完整 bridge-contract
- 走：直接编辑 → 轻量验证

**升级条件：** hotfix 涉及 3+ 文件或架构变更 → 升级为 full；tweak 涉及 5+ 文件或跨模块 → 升级为 full

### 2. 阶段防漂移 Rule

新增 `rules/phase-guard.md`，每轮注入提醒 Agent 当前阶段。

- 新增 `scripts/lib/cmd-inject.mjs`：`ssf inject <change-dir>` 命令，读 `.spec-superflow.yaml` 生成 `phase-guard.md`
- 内容：当前变更名、当前阶段、允许操作、禁止操作
- 安装到 Claude Code 的 `.claude/always/` 目录实现每轮注入
- 配合 v0.5.0 的 `guard.mjs` 形成软硬双重防线

### 3. 决策点协议

新增 `docs/decision-points.md`，集中定义 7 个标准决策点，workflow-orchestrator 和各 skill 统一引用。

7 个决策点：需求确认 → 工件审查 → 契约批准（硬门禁）→ 执行模式选择 → 调试升级 → 验证失败 → 归档确认

## 设计文档

先读 `changes/v0.5.0-guard-and-state/design.md` 第 10 章了解 v0.6.0 概要。然后写 v0.6.0 设计文档到 `changes/v0.6.0-fast-and-aware/`。

## 关键约束

- 零外部依赖
- 复用 v0.5.0 的 guard.mjs、state-loader.mjs、hash.mjs
- 不改动 `src/validation/validator.ts`
- 不破坏现有 9 个 skill 的核心逻辑