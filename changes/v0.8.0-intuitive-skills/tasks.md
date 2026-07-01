# 实现任务

## 文件结构

- `Modify: skills/workflow-start/SKILL.md` — 更新 frontmatter name、内部引用，并增加 DP-0 用户确认门禁
- `Modify: skills/spec-writer/SKILL.md` — 读取 `dp_0_*` 约束
- `Create: specs/user-confirmation-gate/spec.md` — DP-0 规范
- `Modify: scripts/lib/state-loader.mjs` — 加入 `dp_0_*` 可设置字段
- `Modify: docs/state-machine.md` — 同步 skill 名称
- `Modify: docs/decision-points.md` — 同步决策点映射表
- `Create: docs/skill-rename-v0.8.0.md` — 迁移对照表
- `Modify: README.md`、`INSTALL.md`、`CLAUDE.md` — 同步引用、示例与各 AI 平台安装说明
- `Modify: .claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.cursor-plugin/plugin.json`、`.codex-plugin/plugin.json`、`gemini-extension.json`、root `plugin.json` — 更新 skill 清单与版本号
- `Modify: skills/build-executor/SKILL.md` — 增加 Batch Inline 模式
- `Modify: templates/execution-contract.md` — 增加 Batch Inline 选项
- `Modify: specs/inline-execution/spec.md` — 扩展模式说明
- `Create: specs/execution-lean/spec.md` — Batch Inline 规范
- `Modify: docs/examples/*/README.md`（如含旧 skill 名） — 同步更新

## 接口

### Batch 1 → Batch 2
- **Produces**: 已重命名的 skill 目录与 frontmatter — 被 Batch 2 用于更新内部引用。

### Batch 2 → Batch 3
- **Produces**: 所有 skill 内部引用已更新 — 被 Batch 3 用于更新文档与 manifests。

### Batch 3 → Batch 4
- **Produces**: 文档与 manifests 已同步 — 被 Batch 4 用于实现 Batch Inline 与版本发布。

## 1. Batch 1: 重命名 skill 目录并更新 frontmatter

- [ ] **1.1 重命名目录**

```bash
mv skills/workflow-orchestrator skills/workflow-start
mv skills/spec-explorer skills/need-explorer
mv skills/spec-forger skills/spec-writer
mv skills/bridge-contract skills/contract-builder
mv skills/execution-governor skills/build-executor
mv skills/systematic-debugger skills/bug-investigator
# code-reviewer 保持不变
mv skills/closure-archivist skills/release-archivist
mv skills/spec-syncer skills/spec-merger
```

**Files**: `Rename: skills/*`

- [ ] **1.2 更新每个 SKILL.md 的 name frontmatter**

将每个 `skills/<new>/SKILL.md` 首行的 `name: <old>` 改为 `name: <new>`。

**Files**: `Modify: skills/*/SKILL.md`

- [ ] **1.3 提交 Batch 1**

```bash
git add skills/
git commit -m "refactor(skills): rename 8 skills to intuitive action-object names"
```

## 2. Batch 2: 更新 skill 内部相互引用

- [ ] **2.1 更新 workflow-start 中的路由引用**

在 `skills/workflow-start/SKILL.md` 中：
- 将路由目标中的 `spec-explorer` → `need-explorer`
- `spec-forger` → `spec-writer`
- `bridge-contract` → `contract-builder`
- `execution-governor` → `build-executor`
- `systematic-debugger` → `bug-investigator`
- `closure-archivist` → `release-archivist`
- `spec-syncer` → `spec-merger`

**Files**: `Modify: skills/workflow-start/SKILL.md`

- [ ] **2.2 更新 release-archivist 中对 spec-merger 的引用**

在 `skills/release-archivist/SKILL.md` 中：
- `spec-syncer` → `spec-merger`

**Files**: `Modify: skills/release-archivist/SKILL.md`

- [ ] **2.3 在 workflow-start 中增加 DP-0 用户确认门禁**

在 `skills/workflow-start/SKILL.md` 中：
- 在路由到 `spec-writer` 之前检查 `dp_0_confirmed`。
- 若未确认，向用户提问：变更范围、约束、是否包含相关优化、沟通偏好。
- 确认后写入 `.spec-superflow.yaml` 的 `dp_0_decisions`、`dp_0_confirmed`、`dp_0_timestamp`。

**Files**: `Modify: skills/workflow-start/SKILL.md`

- [ ] **2.4 在 spec-writer 中读取 dp_0_* 约束**

在 `skills/spec-writer/SKILL.md` 中：
- 生成或修订工件前读取 `dp_0_*`。
- 尊重已确认决策；遇到未覆盖决策时暂停并提问。

**Files**: `Modify: skills/spec-writer/SKILL.md`

- [ ] **2.5 全局搜索并替换剩余旧名引用**

```bash
grep -R "workflow-orchestrator\|spec-explorer\|spec-forger\|bridge-contract\|execution-governor\|systematic-debugger\|closure-archivist\|spec-syncer" skills/ --include="*.md"
```

修复任何遗漏。

**Files**: `Modify: skills/*/*.md`

- [ ] **2.6 提交 Batch 2**

```bash
git add skills/
git commit -m "docs(skills): update internal cross-references and add DP-0 confirmation gate"
```

## 3. Batch 3: 同步文档、manifests、示例

- [ ] **3.1 更新 docs/state-machine.md 和 docs/decision-points.md**

将所有旧 skill 名替换为新名。

**Files**: `Modify: docs/state-machine.md`, `docs/decision-points.md`

- [ ] **3.2 创建迁移文档 docs/skill-rename-v0.8.0.md**

包含旧→新映射表、为什么重命名、用户迁移步骤。

**Files**: `Create: docs/skill-rename-v0.8.0.md`

- [ ] **3.3 更新 README.md、INSTALL.md、CLAUDE.md**

替换所有旧 skill 名，更新 skill 列表表格，必要时调整示例命令。

**重点更新 `INSTALL.md` 中各 AI 平台的安装说明**：
- Claude Code：通过 plugin / skill 系统加载，入口改为 `/workflow-start`。
- Cursor：使用 `scripts/install-cursor.mjs` 生成本地 `.cursor/skills/` 与 `.cursor/rules/`，并说明 `.cursor/` 不提交仓库。
- Copilot CLI：通过 root `plugin.json` 安装，注意 `author` 必须为对象。
- Gemini CLI：通过 `gemini-extension.json` 与 `GEMINI.md` 加载。

**Files**: `Modify: README.md`, `INSTALL.md`, `CLAUDE.md`

- [ ] **3.4 更新 plugin manifests 中的 skill 清单与版本号**

涉及文件：
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `.cursor-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `gemini-extension.json`
- root `plugin.json`

将 `skills/` 下的旧目录名改为新目录名，并将 `version` 改为 `0.8.0`。

**Files**: `Modify: *.json`

- [ ] **3.5 同步 docs/examples/ 中的旧名称引用**

如果示例 README 或 artifact 中引用了旧 skill 名，一并替换。

**Files**: `Modify: docs/examples/**/README.md` 等

- [ ] **3.6 提交 Batch 3**

```bash
git add docs/ README.md INSTALL.md CLAUDE.md *.json .claude-plugin/ .cursor-plugin/ .codex-plugin/
git commit -m "docs(manifests): sync docs and manifests for v0.8.0 skill rename"
```

## 4. Batch 4: 实现 Batch Inline 模式并发布

- [ ] **4.1 修改 build-executor SKILL.md**

在 `skills/build-executor/SKILL.md` 中：
- 增加 `Batch Inline` 作为可选执行模式
- 明确自动选择规则：Inline ≤3 tasks → Batch Inline（同模块、低风险、≤15min）→ SDD
- 增加 Batch Inline 的 TDD 与 checkpoint 要求

**Files**: `Modify: skills/build-executor/SKILL.md`

- [ ] **4.2 修改 templates/execution-contract.md**

在 Execution Mode 字段中增加 `Batch Inline` 选项。

**Files**: `Modify: templates/execution-contract.md`

- [ ] **4.3 更新 specs/inline-execution/spec.md 并创建 specs/execution-lean/spec.md**

扩展 inline-execution 规范，新增 execution-lean 规范文件。

**Files**: `Modify: specs/inline-execution/spec.md`, `Create: specs/execution-lean/spec.md`

- [ ] **4.4 版本号统一升级到 0.8.0**

```bash
node scripts/spec-superflow.mjs version 0.8.0
```

**Files**: `Modify: package.json`, `plugin.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`

- [ ] **4.5 更新 CHANGELOG.md**

新增 v0.8.0 条目：skill 重命名 + Batch Inline 优化。

**Files**: `Modify: CHANGELOG.md`

- [ ] **4.6 运行验证与测试**

```bash
node scripts/spec-superflow.mjs doctor
node scripts/spec-superflow.mjs validate changes/v0.8.0-intuitive-skills
npm run build
npm test
```

**Files**: `Modify: dist/`（由 build 生成）

- [ ] **4.7 提交 Batch 4**

```bash
git add -A
git commit -m "feat(execution): add Batch Inline mode and bump to v0.8.0"
```

- [ ] **4.8 合并到 main 并打 tag**

```bash
git checkout main
git merge --no-ff release-v0.8.0 -m "Merge branch 'release-v0.8.0' into main"
git tag v0.8.0
git push origin main v0.8.0
```

## 5. Batch 5: 收尾归档

- [ ] **5.1 运行 ssf audit 生成决策点审计报告**

```bash
node scripts/spec-superflow.mjs audit changes/v0.8.0-intuitive-skills
```

**Files**: `Create: changes/v0.8.0-intuitive-skills/decision-point-audit.md`

- [ ] **5.2 运行 ssf inject 更新跨平台 phase-guard**

```bash
node scripts/spec-superflow.mjs inject changes/v0.8.0-intuitive-skills
```

**Files**: `Modify: .claude/always/phase-guard.md`, `.cursor/rules/phase-guard.mdc`, `.github/copilot-instructions.md`, `GEMINI.md`

- [ ] **5.3 最终检查并提交**

```bash
node scripts/spec-superflow.mjs doctor
npm test
git add -A
git commit -m "chore(closure): audit and phase-guard for v0.8.0"
```
