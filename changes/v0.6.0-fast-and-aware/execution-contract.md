# Execution Contract: v0.6.0 Fast & Aware

## Intent Lock

- **Change name**: v0.6.0-fast-and-aware
- **Problem being solved**: v0.5.0 的完整 8 状态流程对小型变更（hotfix/tweak）开销过大；Agent 在长会话中丢失阶段上下文；决策点散落各处无统一清单
- **In scope**:
  - 三种 workflow 模式（full / hotfix / tweak）的检测条件和跳过规则
  - guard.mjs 模式感知转换矩阵（`--workflow` 参数）
  - `ssf inject` CLI 子命令 + phase-guard.md 生成 + `.claude/always/` 安装
  - `docs/decision-points.md`（7 个标准决策点）
  - `ssf state set` 子命令 + 14 个决策点审计字段
  - 4 个 skill 文件更新（workflow-orchestrator, bridge-contract, execution-governor, closure-archivist）
  - 版本号 → 0.6.0 + CHANGELOG + README
- **Out of scope**: 日文 tokenizer, 多平台适配器, skill-creator 工具包, 新增 skill, 修改 validator.ts, CI/CD 变更

## Approved Behavior

### Fast-Path (6 requirements)

| Requirement | Summary | Test Obligation |
|-------------|---------|-----------------|
| Hotfix mode detection | guard.mjs 跳过 schema-valid；允许 exploring→bridging | 验证 hotfix 模式下 schema-valid 被标记 skipped |
| Tweak mode detection | guard.mjs 跳过 schema-valid + contract-fresh | 验证 tweak 模式下 contract-fresh 被标记 skipped |
| Hotfix upgrade | ≥3 文件 / 新模块 / schema 变更 → 升级为 full | 验证 orchestrator 输出升级原因 + 设置 workflow=full |
| Tweak upgrade | ≥5 文件 / 跨模块 → 升级为 full | 验证 orchestrator 输出升级原因 + 设置 workflow=full |
| Hotfix minimal contract | bridge-contract 仅生成 Intent Lock + Task List + Approval Gate | 验证最小契约不含 Scope Fence / Build Rules |
| Tweak lightweight closure | 仅验证文件存在 + 语法检查，跳过三维验证 | 验证 closure 跳过完整验证但仍检查文件完整性 |

### Phase-Drift Prevention (4 requirements)

| Requirement | Summary | Test Obligation |
|-------------|---------|-----------------|
| ssf inject command | 读状态 → 生成 phase-guard.md → 安装到 .claude/always/ | 验证端到端：命令执行 + 文件生成 + 安装成功 |
| Content structure | 变更名 + 阶段 + 模式 + 允许/禁止操作 + 决策点提示 | 验证 specifying 和 executing 阶段的模板内容正确 |
| Regeneration | 覆盖已有文件；orchestrator 状态转换后提示 inject | 验证二次 inject 覆盖旧内容 |
| Graceful fallback | 状态文件缺失时使用默认值（exploring + full） | 验证无状态文件时仍能生成 + 输出警告 |

### Decision-Point Protocol (5 requirements)

| Requirement | Summary | Test Obligation |
|-------------|---------|-----------------|
| 7 standard decision points | docs/decision-points.md 定义 DP-1 到 DP-7 | 验证文件存在 + 包含 7 个决策点 + 每个有 6 个字段 |
| Orchestrator references | 路由输出包含 DP-N 编号 | 验证路由到 bridge-contract 时包含 DP-3 |
| Skill references | 4 个 skill 引用对应 DP 编号 | 验证 bridge-contract 包含 DP-3，debugger 包含 DP-5 |
| Escalation | 决策点未确认时暂停，不得自动跳过 | 验证 skill 在未收到 approve/reject/revise 时重新提示 |
| Audit trail | dp_N_result + dp_N_timestamp 记录到状态文件 | 验证 DP-3 approve 后状态文件含 dp_3_result: approved |

### Coverage Check

- 15 requirements total → 15 mapped to test obligations ✅
- 15 requirements → all represented in execution batches ✅
- 0 unmapped requirements

## Design Constraints

### Architecture Constraints

1. **模式检测由 orchestrator 执行** — 不新增检测脚本；orchestrator 读取 workflow 字段 + 验证阈值
2. **guard.mjs 通过 --workflow 参数感知模式** — guard.mjs 保持无状态，不读 .spec-superflow.yaml
3. **phase-guard.md 通过显式 ssf inject 生成** — 不通过 hook 自动生成；用户控制注入时机
4. **决策点审计在状态文件中** — 不新增独立日志文件；dp_N_* 字段在独立区块
5. **PHASE_TEMPLATES 对象** — 不用通用模板引擎；7 个阶段各一个模板字符串

### Interface Constraints

- `guard.mjs` 新增 `--workflow <mode>` 可选参数（默认 `full`），白名单校验 `full|hotfix|tweak`
- `ssf state set` 白名单：仅 `workflow`, `execution_mode`, `test_result`, `dp_N_result`, `dp_N_timestamp` 可 set
- `ssf inject` 接受 `<change-dir>` 必需参数 + `--json` 可选参数

### Dependency Constraints

- 零外部 npm 依赖（仅 TypeScript devDependency）
- 不改动 `src/validation/validator.ts`
- 复用 v0.5.0 基础设施（guard.mjs, state-loader.mjs, hash.mjs, cmd-state.mjs）
- 不破坏现有 9 个 skill 的核心逻辑（仅增加模式分支和决策点引用）

### Data Constraints

- `.spec-superflow.yaml` 新增 14 个字段（dp_1_result ~ dp_7_timestamp），初始值 `null`
- `TRANSITION_CHECKS` 新增 2 个转换：`exploring:bridging`（hotfix）、`exploring:approved`（tweak）
- `PHASE_TEMPLATES` 包含 7 个阶段模板，使用 `{{change_name}}`/`{{state}}`/`{{workflow}}` 占位符

## Task Batches

### Batch 1: 决策点协议基础设施

- **Objective**: 创建决策点文档 + 状态文件审计字段 + set 子命令
- **Inputs**: (none)
- **Outputs**: `docs/decision-points.md`, state-loader.mjs 14 个新字段, `ssf state set` 命令
- **Done when**: `grep -c "^## DP-" docs/decision-points.md` = 7; `ssf state set` 白名单工作; 状态文件可读写 dp_N_* 字段
- **Tasks**: 1.1–1.5

### Batch 2: 快速路径 Guard 基础设施

- **Objective**: guard.mjs 支持模式感知 + 新转换条目
- **Inputs**: Batch 1 的 SETTABLE_FIELDS 白名单
- **Outputs**: `applyWorkflowMode()` 函数, `--workflow` 参数, 2 个新转换
- **Done when**: hotfix 模式跳过 schema-valid; tweak 模式跳过 schema-valid + contract-fresh; 无效 workflow 报错退出
- **Tasks**: 2.1–2.5
- **Depends on**: Batch 1

### Batch 3: 阶段防漂移注入

- **Objective**: `ssf inject` 命令端到端可用
- **Inputs**: Batch 1 的 state-loader.mjs（readState）
- **Outputs**: `cmd-inject.mjs`, `PHASE_TEMPLATES`, `.claude/always/` 安装逻辑
- **Done when**: `ssf inject` 生成 phase-guard.md + 安装到 .claude/always/; 7 个阶段模板内容正确; 状态文件缺失时优雅降级
- **Tasks**: 3.1–3.6
- **Depends on**: Batch 1

### Batch 4: Skill 文件更新

- **Objective**: 4 个 skill 支持快速路径 + 决策点引用
- **Inputs**: Batch 2 的 guard.mjs 模式感知, Batch 3 的 inject 命令
- **Outputs**: 更新的 workflow-orchestrator, bridge-contract, execution-governor, closure-archivist SKILL.md
- **Done when**: orchestrator 包含模式检测 + 快速路径路由 + DP 引用; bridge-contract 包含 hotfix 最小契约; execution-governor 包含 tweak 直接编辑; closure-archivist 包含轻量闭合
- **Tasks**: 4.1–4.7
- **Depends on**: Batch 2, Batch 3

### Batch 5: 集成 + 发布

- **Objective**: 版本号 + CHANGELOG + README + doctor 验证
- **Inputs**: Batch 1–4 全部完成
- **Outputs**: 0.6.0 版本，5 个 manifest 同步，CHANGELOG + README 更新
- **Done when**: `ssf doctor` 全部通过; `ssf version 0.6.0 --dry-run` 显示 5/5 manifest 同步
- **Tasks**: 5.1–5.5
- **Depends on**: Batch 1, 2, 3, 4

### Parallelism

```
Batch 1 (决策点协议)
  ├→ Batch 2 (Guard 模式感知)  ← 可与 Batch 3 并行
  └→ Batch 3 (Inject 命令)     ← 可与 Batch 2 并行
       └→ Batch 4 (Skill 更新) ← 依赖 Batch 2 + 3
            └→ Batch 5 (集成)  ← 依赖全部
```

## Test Obligations

### Must Start With Failing Tests

- `applyWorkflowMode()` 的维度过滤逻辑（hotfix 跳过 schema-valid, tweak 跳过 schema-valid + contract-fresh）
- `cmd-state.mjs` 的 `set` 子命令白名单（允许 workflow，拒绝 state）
- `cmd-inject.mjs` 的 PHASE_TEMPLATES 模板生成（7 个阶段内容正确）
- `cmd-inject.mjs` 的 `.claude/always/` 安装 + 目录自动创建
- `cmd-inject.mjs` 的状态文件缺失优雅降级

### Required Edge Cases

- guard.mjs `--workflow` 传入无效值（非 full/hotfix/tweak）→ exit 2
- `ssf inject` 目标 `.claude/always/` 目录不存在 → 自动创建
- `ssf inject` 二次执行 → 覆盖已有 phase-guard.md
- hotfix 模式但变更涉及 3+ 文件 → 升级为 full + 输出原因
- tweak 模式但变更跨模块 → 升级为 full + 输出原因
- 状态文件缺失时 `ssf inject` → 默认值 + 警告

### Regression-Sensitive Areas

- guard.mjs 现有转换矩阵（full 模式行为不变）
- state-loader.mjs 现有字段（新增字段不影响已有字段的读写）
- cmd-state.mjs 现有子命令（init/check/transition/get/rebuild 不变）
- spec-superflow.mjs 现有路由（list/validate/doctor/version/sync/config/state 不变）

## Execution Mode

- **Mode**: `SDD` (Subagent-Driven Development)
- **Selection rationale**: 5 个 batch 中 Batch 2 和 Batch 3 可并行执行（都仅依赖 Batch 1），SDD 可分派独立子代理加速。Batch 1 以文档/配置为主，Batch 4 纯 SKILL.md 编辑，Batch 5 版本同步——均适合子代理独立执行。

## Review Gates

- **Mandatory review points**:
  - Batch 1 → Batch 2/3 分叉前：确认决策点文档 + set 子命令正确
  - Batch 2 + 3 → Batch 4 前：确认 guard.mjs 模式感知 + inject 命令端到端可用
  - Batch 4 → Batch 5 前：确认 4 个 skill 文件内容一致性
- **Blocker categories**:
  - guard.mjs full 模式回归（现有转换行为变化）
  - state-loader.mjs 字段冲突（新字段覆盖已有字段）
  - phase-guard.md 模板内容错误（允许/禁止操作与实际阶段不匹配）

## Escalation Rules

- **Return to `specifying` when**: 新增 workflow 模式（如 v0.7.0 的 auto-detect）；phase-guard.md 注入机制变更（如支持 Cursor rules）
- **Return to `bridging` when**: guard.mjs 转换矩阵需要新增维度；决策点数量变化（新增或删除 DP）
- **Do not continue implementation if**: guard.mjs full 模式回归测试失败；state-loader.mjs 无法正确读写新增的 14 个字段；`ssf inject` 在任一阶段生成错误内容
