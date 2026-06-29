# 技术设计：v0.6.0 Fast & Aware

**Date:** 2026-06-29
**Version:** 0.5.0 → 0.6.0
**Goal:** 在 v0.5.0 可靠性层地基上增加三个扩展——快速路径让简单变更走捷径，阶段防漂移让 Agent 始终知道自己在哪，决策点协议让所有"需要用户确认"的时刻有统一标准。

---

## 1. 背景

### 1.1 当前状态

v0.5.0 交付了：
- `guard.mjs`：7 个状态转换的硬门禁，5 个检查维度（artifacts-exist, schema-valid, contract-fresh, tasks-complete, tests-passing）
- `.spec-superflow.yaml`：12 字段轻量状态机（含 `workflow: full` 字段，v0.5.0 预留但未使用）
- `hash.mjs`：SHA256 工件哈希 + 契约哈希，加速过期检测
- `cmd-state.mjs`：5 个子命令（init/check/transition/get/rebuild）

### 1.2 约束

- 零外部 npm 依赖（仅 TypeScript 作为 devDependency）
- 不改动 `src/validation/validator.ts`
- 不破坏现有 9 个 skill 的核心逻辑
- 复用 v0.5.0 基础设施（guard.mjs, state-loader.mjs, hash.mjs, cmd-state.mjs）

### 1.3 利益相关者

- 日常使用者：需要快速修复 bug 或调整配置的开发者
- Agent（Claude Code）：需要在长会话中保持阶段感知
- 插件维护者：需要统一的决策点文档来迭代 skill

---

## 2. 目标与非目标

### 2.1 目标

- hotfix 模式：≤2 文件的小修复，跳过 spec-explorer 和完整 spec-forger，走最小契约
- tweak 模式：纯配置/文档修改，跳过 spec-explorer、spec-forger 和完整 bridge-contract
- 阶段防漂移：`ssf inject` 命令生成 `.claude/always/phase-guard.md`，每轮注入当前阶段信息
- 决策点协议：`docs/decision-points.md` 集中定义 7 个决策点，所有 skill 统一引用
- 自动升级：hotfix/tweak 超出阈值时自动升级为 full，防止走捷径做大事

### 2.2 非目标

- 不实现自动模式检测（v0.6.0 由用户显式声明 hotfix/tweak，workflow-orchestrator 验证阈值）
- 不实现 `.claude/always/` 以外的注入机制（如 Cursor rules、Copilot instructions）
- 不实现决策点的自动审计（仅记录到状态文件，不生成审计报告）
- 不新增 skill（保持 9 个 skill 不变）

---

## 3. 架构决策

### 决策 1: 模式检测由 workflow-orchestrator 执行，不新增检测脚本

- **选择**: workflow-orchestrator 在路由前检查 `.spec-superflow.yaml` 的 `workflow` 字段，根据用户意图关键词（"hotfix"/"tweak"）和文件数量启发式验证
- **理由**: 模式检测是路由逻辑的一部分，放在 orchestrator 内最自然。新增独立脚本会增加 CLI 命令数量，且 orchestrator 已经在做内容级检测
- **替代方案**: 
  - A) 新增 `guard.mjs detect-mode` 子命令 — 增加命令复杂度，且模式检测需要理解用户意图（LLM 推理），不适合 shell 脚本
  - B) 在 `state-loader.mjs` 中加入自动检测 — 违反 state-loader 的单一职责（读写状态文件）

### 决策 2: guard.mjs 模式感知通过 workflow 参数传入，不读状态文件

- **选择**: guard.mjs 接受 `--workflow <mode>` 可选参数。workflow-orchestrator 在调用 guard 前从状态文件读取 workflow 字段并传入
- **理由**: guard.mjs 保持无状态（不读 .spec-superflow.yaml），调用方负责提供上下文。这与 guard.mjs 现有的设计一致——它只接受显式参数
- **替代方案**:
  - A) guard.mjs 自动读取 .spec-superflow.yaml — 增加 guard.mjs 的职责，使其从"纯检查器"变成"状态感知检查器"，耦合度增加
  - B) 在转换矩阵中硬编码所有模式变体 — 矩阵膨胀（7 transitions × 3 modes = 21 entries），维护成本高

### 决策 3: phase-guard.md 通过 ssf inject 生成，不通过 hook 自动生成

- **选择**: `ssf inject <change-dir>` 是一个显式 CLI 命令，用户或 workflow-orchestrator 在状态转换后手动调用。生成的文件安装到 `.claude/always/phase-guard.md`
- **理由**: 
  - Hook 方式（每次 session-start 自动生成）会导致每轮都读取状态文件，增加延迟
  - 显式命令让用户控制注入时机，避免在错误时机生成过时规则
  - `.claude/always/` 是 Claude Code 的标准每轮注入机制，与 plugin 系统兼容
- **替代方案**:
  - A) session-start hook 自动生成 — 每轮增加 ~100ms I/O，且 hook 无法感知当前 change 目录
  - B) 写入 CLAUDE.md — CLAUDE.md 是项目级文档，不适合存放动态生成的阶段规则

### 决策 4: 决策点审计记录在状态文件中，不新增独立日志文件

- **选择**: 决策点结果记录在 `.spec-superflow.yaml` 中，字段格式 `dp_<N>_result` + `dp_<N>_timestamp`
- **理由**: 状态文件已经是变更的派生数据汇总，决策点是状态的一部分。新增独立日志文件（如 `.spec-superflow-audit.jsonl`）增加复杂度，且与"状态文件可从工件重建"的原则冲突
- **替代方案**:
  - A) 新增 `.spec-superflow-audit.jsonl` — 追加式日志，信息更完整，但增加文件管理负担
  - B) 记录在 execution-contract.md 中 — contract 是静态文档，不适合存放动态决策记录

### 决策 5: phase-guard.md 内容按阶段模板生成，不用通用模板引擎

- **选择**: `cmd-inject.mjs` 内部维护一个 `PHASE_TEMPLATES` 对象，每个阶段对应一个模板字符串。模板中用 `{{change_name}}`、`{{state}}`、`{{workflow}}` 占位符，简单的 `String.replace()` 替换
- **理由**: 零依赖约束排除了 Handlebars/Nunjucks 等模板引擎。7 个阶段 × 3 种 workflow 模式 = 最多 21 个模板，但 hotfix/tweak 模式共享 full 的模板（只是允许/禁止操作不同），实际只需 8 个基础模板
- **替代方案**:
  - A) 通用模板引擎 — 违反零依赖约束
  - B) 纯字符串拼接 — 可读性差，模板修改困难

---

## 4. 详细设计

### 4.1 guard.mjs 模式感知扩展

现有转换矩阵 `TRANSITION_CHECKS` 不变。新增 `applyWorkflowMode(checks, workflow)` 函数：

```
输入: checks = [{dimension: 'schema-valid', ...}], workflow = 'hotfix'
逻辑: 
  if workflow === 'hotfix':
    移除 'schema-valid' 维度（specifying→bridging 转换）
  if workflow === 'tweak':
    移除 'schema-valid' 和 'contract-fresh' 维度
输出: 过滤后的 checks 数组
```

guard.mjs 新增 `--workflow <mode>` 可选参数（默认 `full`）。参数解析后调用 `applyWorkflowMode()`。

新增转换 `exploring → bridging`（hotfix 跳过 specifying）和 `exploring → approved`（tweak 跳过 specifying + bridging）到 `TRANSITION_CHECKS` 矩阵。

### 4.2 cmd-inject.mjs 结构

```
export async function run(args)
  ├── parseArgs: <change-dir> [--json]
  ├── readState(changeDir)  ← 复用 state-loader.mjs
  ├── 选择模板: PHASE_TEMPLATES[state]
  ├── 替换占位符: {{change_name}}, {{state}}, {{workflow}}
  ├── 写入 rules/phase-guard.md
  ├── 复制到 .claude/always/phase-guard.md（创建目录如不存在）
  └── 输出成功摘要
```

`PHASE_TEMPLATES` 对象：7 个阶段各一个模板。模板包含：
- 变更名 + 当前阶段 + 工作流模式
- 允许操作列表（✅ 前缀）
- 禁止操作列表（⛔ 前缀）
- 决策点提示（🔔 前缀，引用 DP-N 编号）

### 4.3 cmd-state.mjs 新增 set 子命令

```
ssf state set <change-dir> <field> <value>
```

支持的 field: `workflow`, `execution_mode`, `test_result`。其他字段通过 `transition` 或 `init` 设置，不允许直接 set。

白名单机制：只有 `SETTABLE_FIELDS = ['workflow', 'execution_mode', 'test_result']` 中的字段允许 set。

### 4.4 决策点审计字段

state-loader.mjs 的 `BUILTIN_DEFAULTS` 新增 14 个字段（7 个 dp_N_result + 7 个 dp_N_timestamp），初始值均为 `null`。

`writeState()` 的输出模板新增 `# === Decision points ===` 区块。

### 4.5 模式检测流程（workflow-orchestrator）

```
1. 读取 .spec-superflow.yaml 的 workflow 字段
2. 如果 workflow 未设置或为 full:
   → 正常路由
3. 如果 workflow 为 hotfix:
   → 验证: 文件数 ≤ 2? 无新模块? 无 schema 变更?
   → 全部通过: 保持 hotfix，路由使用热修复快速路径
   → 任一失败: 升级为 full，输出升级原因
4. 如果 workflow 为 tweak:
   → 验证: 文件数 ≤ 4? 单模块? 纯配置/文档?
   → 全部通过: 保持 tweak，路由使用调整快速路径
   → 任一失败: 升级为 full，输出升级原因
```

---

## 5. 数据流

### 5.1 Full 模式（现有流程，无变化）

```
用户请求 → workflow-orchestrator
  → guard.mjs check <dir> exploring specifying --workflow full
  → spec-explorer → spec-forger
  → guard.mjs check <dir> specifying bridging --workflow full
  → bridge-contract → [DP-3 契约批准]
  → guard.mjs check <dir> approved executing --workflow full
  → execution-governor → [DP-4 执行模式选择]
  → code-reviewer → closure-archivist → [DP-7 归档确认]
  → spec-syncer
```

### 5.2 Hotfix 模式

```
用户请求 "hotfix: fix X" → workflow-orchestrator
  → 设置 workflow=hotfix
  → guard.mjs check <dir> exploring bridging --workflow hotfix
  → bridge-contract（最小契约）
  → [DP-3 契约批准]
  → guard.mjs check <dir> approved executing --workflow hotfix
  → execution-governor（inline 模式）
  → closure-archivist（轻量闭合）
```

### 5.3 Tweak 模式

```
用户请求 "tweak: update config X" → workflow-orchestrator
  → 设置 workflow=tweak
  → guard.mjs check <dir> exploring approved --workflow tweak
  → execution-governor（直接编辑模式）
  → closure-archivist（轻量闭合：文件存在 + 语法检查）
```

---

## 6. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 模式检测误判：用户说"hotfix"但实际需要完整规划 | 升级条件（≥3 文件 / 新模块 / schema 变更）兜底；orchestrator 在升级时输出明确原因 |
| phase-guard.md 过期：状态转换后忘记运行 `ssf inject` | orchestrator 在每次 `ssf state transition` 后自动提示运行；phase-guard.md 内嵌时间戳 |
| `.claude/always/` 目录不存在或权限不足 | `ssf inject` 自动创建目录（`mkdir -p`）；失败时输出明确错误信息 |
| 决策点审计字段膨胀：14 个新字段使状态文件变长 | 字段按 `dp_N_*` 分组在独立区块，与核心状态分离；状态文件仍是纯文本，不影响可读性 |
| hotfix/tweak 模式下跳过 schema-valid 导致工件质量下降 | hotfix 仍需 artifacts-exist（proposal.md 必须存在）；tweak 仍需文件完整性检查 |
| guard.mjs `--workflow` 参数被错误传入 | 白名单校验：仅接受 `full`/`hotfix`/`tweak`，其他值报错退出 |

---

## 7. 文件清单

### 7.1 新增文件

| 文件 | 用途 | 估计行数 |
|------|------|---------|
| `scripts/lib/cmd-inject.mjs` | `ssf inject` 子命令：读状态 → 生成 phase-guard.md → 安装 | ~100 |
| `docs/decision-points.md` | 7 个标准决策点的集中定义 | ~120 |

### 7.2 修改文件

| 文件 | 改动 | 影响行数 |
|------|------|---------|
| `scripts/guard/guard.mjs` | 新增 `--workflow` 参数 + `applyWorkflowMode()` + 2 个新转换 | ~30 |
| `scripts/lib/state-loader.mjs` | BUILTIN_DEFAULTS 新增 14 个决策点字段 + writeState 模板更新 | ~20 |
| `scripts/lib/cmd-state.mjs` | 新增 `set` 子命令 + SETTABLE_FIELDS 白名单 | ~40 |
| `scripts/spec-superflow.mjs` | 新增 `inject` 路由 | +5 |
| `skills/workflow-orchestrator/SKILL.md` | 新增模式检测逻辑 + 快速路径路由规则 + 决策点引用 | ~50 |
| `skills/bridge-contract/SKILL.md` | 新增 hotfix 最小契约模式 + DP-3 引用 | ~15 |
| `skills/execution-governor/SKILL.md` | 新增 tweak 直接编辑模式 + DP-4/DP-5 引用 | ~15 |
| `skills/closure-archivist/SKILL.md` | 新增 tweak 轻量闭合 + DP-6/DP-7 引用 | ~15 |
| `package.json` | 版本号 → 0.6.0 | 1 |
| `CHANGELOG.md` | v0.6.0 条目 | — |
| `README.md` | 更新架构图 + CLI 命令表 + 快速路径说明 | — |

### 7.3 不变的东西

- 9 个 skill 的核心逻辑不变（仅增加模式分支和决策点引用）
- `src/validation/validator.ts` 不变
- 现有 `ssf list/validate/doctor/version/sync/config/state` 命令不变
- 零外部依赖约束不变
- full 模式的完整流程不变

---

## 8. 实现顺序

### Batch 1: 决策点协议（预计 0.5 天）

```
docs/decision-points.md → state-loader.mjs 决策点字段 → cmd-state.mjs set 子命令
```
产物：决策点文档可用，状态文件支持审计字段，`ssf state set` 可用

### Batch 2: 快速路径基础设施（预计 1 天）

```
guard.mjs --workflow 参数 → applyWorkflowMode() → 新转换矩阵条目 → 测试
```
产物：guard.mjs 支持模式感知，hotfix/tweak 转换可用

### Batch 3: 阶段防漂移注入（预计 0.5 天）

```
cmd-inject.mjs → PHASE_TEMPLATES → .claude/always/ 安装 → ssf 入口路由
```
产物：`ssf inject` 命令端到端可用

### Batch 4: Skill 文件更新（预计 0.5 天）

```
workflow-orchestrator → bridge-contract → execution-governor → closure-archivist
```
产物：4 个 skill 支持快速路径 + 决策点引用

### Batch 5: 集成 + 发布（预计 0.5 天）

```
版本号 → CHANGELOG → README → doctor 检查 → 发布
```
产物：v0.6.0 可发布

---

## 9. 展望 v0.7.0

| v0.7.0 特性 | 依赖 v0.6.0 的什么 |
|------------|-------------------|
| 自动模式检测 | 模式检测逻辑 + 升级条件（从显式声明改为自动推断） |
| 多平台 phase-guard 注入 | `cmd-inject.mjs` 扩展：Cursor rules / Copilot instructions / Gemini GEMINI.md |
| 决策点审计报告 | 状态文件中的 dp_N_* 字段 → 生成审计摘要 |
