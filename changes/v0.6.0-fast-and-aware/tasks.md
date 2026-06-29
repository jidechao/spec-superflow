# Implementation Tasks: v0.6.0 Fast & Aware

## File Structure

### Create
- `scripts/lib/cmd-inject.mjs` — `ssf inject` 子命令：读状态 → 生成 phase-guard.md → 安装到 `.claude/always/`
- `docs/decision-points.md` — 7 个标准决策点的集中定义文档

### Modify
- `scripts/guard/guard.mjs` — 新增 `--workflow` 参数 + `applyWorkflowMode()` 过滤 + 2 个新转换条目
- `scripts/lib/state-loader.mjs` — BUILTIN_DEFAULTS 新增 14 个决策点审计字段 + writeState 模板更新
- `scripts/lib/cmd-state.mjs` — 新增 `set` 子命令 + SETTABLE_FIELDS 白名单
- `scripts/spec-superflow.mjs` — 新增 `inject` 路由
- `skills/workflow-orchestrator/SKILL.md` — 新增模式检测 + 快速路径路由 + 决策点引用
- `skills/bridge-contract/SKILL.md` — 新增 hotfix 最小契约模式 + DP-3 引用
- `skills/execution-governor/SKILL.md` — 新增 tweak 直接编辑模式 + DP-4/DP-5 引用
- `skills/closure-archivist/SKILL.md` — 新增 tweak 轻量闭合 + DP-6/DP-7 引用
- `package.json` — 版本号 → 0.6.0
- `CHANGELOG.md` — v0.6.0 条目
- `README.md` — 更新架构图 + CLI 命令表 + 快速路径说明

## Interfaces

### Batch 1 → Batch 2
- **Produces**: `SETTABLE_FIELDS` 白名单 — consumed by guard.mjs to validate workflow values
- **Produces**: `dp_N_result` / `dp_N_timestamp` 字段 — consumed by cmd-inject.mjs for decision point hints

### Batch 2 → Batch 4
- **Produces**: `applyWorkflowMode(checks, workflow)` — consumed by workflow-orchestrator SKILL.md to document mode-aware routing

### Batch 3 → Batch 4
- **Produces**: `PHASE_TEMPLATES` 对象 — consumed by workflow-orchestrator to know when to prompt `ssf inject`

---

## 1. Batch 1: 决策点协议基础设施

Depends on: (none)

- [ ] **1.1 创建 docs/decision-points.md**

**Files**: Create: `docs/decision-points.md`

内容包含 7 个决策点定义，每个包含：编号、名称、触发条件、所需输入、预期输出、关联 skill。

```markdown
# Decision Points Protocol

本文档集中定义 spec-superflow 工作流中的 7 个标准决策点。
所有 skill 在对应决策点触发时 SHALL 引用本文档中的决策点编号。

## DP-1: 需求确认

- **触发条件**: spec-explorer 完成意图澄清，准备进入 spec-forger
- **所需输入**: 用户需求描述、scope 边界、capabilities 列表
- **预期输出**: 用户确认 scope 和 capabilities，或要求进一步探索
- **关联 skill**: spec-explorer
- **选择项**: `confirm` | `revise` | `abandon`

## DP-2: 工件审查
...（DP-2 到 DP-7 同理展开）
```

7 个决策点：
1. DP-1 需求确认（spec-explorer → spec-forger）
2. DP-2 工件审查（spec-forger 完成后）
3. DP-3 契约批准（bridge-contract → execution-governor，**硬门禁**）
4. DP-4 执行模式选择（execution-governor 启动前）
5. DP-5 调试升级（systematic-debugger 3+ 失败后）
6. DP-6 验证失败（closure-archivist 验证未通过时）
7. DP-7 归档确认（closure-archivist 完成前）

**验证**: `wc -l docs/decision-points.md` 应 > 80 行

- [ ] **1.2 修改 state-loader.mjs：新增决策点审计字段**

**Files**: Modify: `scripts/lib/state-loader.mjs`

在 `BUILTIN_DEFAULTS` 对象中新增 14 个字段：

```javascript
// 在 BUILTIN_DEFAULTS 末尾追加
dp_1_result: null,
dp_1_timestamp: null,
dp_2_result: null,
dp_2_timestamp: null,
dp_3_result: null,
dp_3_timestamp: null,
dp_4_result: null,
dp_4_timestamp: null,
dp_5_result: null,
dp_5_timestamp: null,
dp_6_result: null,
dp_6_timestamp: null,
dp_7_result: null,
dp_7_timestamp: null,
```

在 `writeState()` 的输出模板中新增区块：

```
# === Decision points ===
dp_1_result: ${state.dp_1_result ?? 'null'}
dp_1_timestamp: ${state.dp_1_timestamp ?? 'null'}
...（dp_2 到 dp_7 同理）
```

**验证**: 创建测试状态文件，确认 14 个新字段可读写
```bash
node -e "
  import('./scripts/lib/state-loader.mjs').then(m => {
    const s = m.readState('/tmp/test-dp');
    console.log('dp_3_result:', s.dp_3_result); // null
    m.updateField('/tmp/test-dp', 'dp_3_result', 'approved');
    const s2 = m.readState('/tmp/test-dp');
    console.log('dp_3_result:', s2.dp_3_result); // approved
  })
"
```

- [ ] **1.3 修改 cmd-state.mjs：新增 set 子命令**

**Files**: Modify: `scripts/lib/cmd-state.mjs`

新增 `SETTABLE_FIELDS` 白名单和 `set` 子命令：

```javascript
const SETTABLE_FIELDS = ['workflow', 'execution_mode', 'test_result',
  'dp_1_result', 'dp_1_timestamp', 'dp_2_result', 'dp_2_timestamp',
  'dp_3_result', 'dp_3_timestamp', 'dp_4_result', 'dp_4_timestamp',
  'dp_5_result', 'dp_5_timestamp', 'dp_6_result', 'dp_6_timestamp',
  'dp_7_result', 'dp_7_timestamp'];
```

`set` 子命令逻辑：
1. 解析参数：`<change-dir> <field> <value>`
2. 检查 field 在 SETTABLE_FIELDS 中
3. 调用 `updateField(changeDir, field, value)`
4. 输出确认信息

**验证**:
```bash
node scripts/spec-superflow.mjs state set /tmp/test-dp workflow hotfix
# Expected: ✅ Set workflow = hotfix
node scripts/spec-superflow.mjs state set /tmp/test-dp state executing
# Expected: ⛔ Field 'state' is not settable (use 'transition' instead)
```

- [ ] **1.4 验证 Batch 1 完整性**

**Files**: (none)

```bash
# 1. decision-points.md 存在且包含 7 个决策点
grep -c "^## DP-" docs/decision-points.md
# Expected: 7

# 2. state-loader 新字段可读写
node -e "import('./scripts/lib/state-loader.mjs').then(m => { const s = m.readState('/tmp/test-b1'); console.log(Object.keys(s).filter(k => k.startsWith('dp_')).length) })"
# Expected: 14

# 3. set 子命令白名单工作
node scripts/spec-superflow.mjs state set /tmp/test-b1 dp_3_result approved --json
# Expected: {"ok":true,"field":"dp_3_result","value":"approved"}
```

- [ ] **1.5 Commit Batch 1**

```bash
git add -A
git commit -m "feat: add decision point protocol infrastructure (DP fields + set command)"
```

---

## 2. Batch 2: 快速路径 Guard 基础设施

Depends on: Batch 1

- [ ] **2.1 修改 guard.mjs：新增 --workflow 参数**

**Files**: Modify: `scripts/guard/guard.mjs`

在 `parseArgs` 配置中新增 `workflow` 选项：

```javascript
const { values, positionals } = parseArgs({
  args,
  options: {
    json: { type: 'boolean', default: false },
    workflow: { type: 'string', default: 'full' },  // 新增
  },
  allowPositionals: true,
});
```

在白名单校验中新增 workflow 值验证：

```javascript
const VALID_WORKFLOWS = ['full', 'hotfix', 'tweak'];
if (!VALID_WORKFLOWS.includes(values.workflow)) {
  console.error(`Invalid workflow: ${values.workflow}. Must be one of: ${VALID_WORKFLOWS.join(', ')}`);
  process.exit(2);
}
```

**验证**:
```bash
node scripts/guard/guard.mjs check /tmp/test exploring specifying --workflow hotfix --json
# Expected: exit 0 or 1 (not 2)
node scripts/guard/guard.mjs check /tmp/test exploring specifying --workflow invalid --json
# Expected: exit 2 with error message
```

- [ ] **2.2 实现 applyWorkflowMode() 函数**

**Files**: Modify: `scripts/guard/guard.mjs`

在 guard.mjs 中新增函数：

```javascript
function applyWorkflowMode(checks, workflow) {
  if (workflow === 'full') return checks;
  
  const SKIP_DIMENSIONS = {
    hotfix: ['schema-valid'],
    tweak: ['schema-valid', 'contract-fresh'],
  };
  
  const skip = SKIP_DIMENSIONS[workflow] || [];
  return checks.map(check => {
    if (skip.includes(check.dimension)) {
      return { ...check, pass: true, skipped: true, failures: [] };
    }
    return check;
  });
}
```

在主流程中，执行检查后调用 `applyWorkflowMode()`：

```javascript
let results = [];
for (const dim of dimensions) {
  const checkFn = CHECK_DISPATCH[dim];
  const result = await checkFn(changeDir);
  results.push({ dimension: dim, ...result });
}
results = applyWorkflowMode(results, values.workflow);
```

**验证**: 在 JSON 输出中确认 hotfix 模式下 schema-valid 被标记为 `skipped: true`

- [ ] **2.3 新增快速路径转换到 TRANSITION_CHECKS**

**Files**: Modify: `scripts/guard/guard.mjs`

在 `TRANSITION_CHECKS` 中新增 2 个转换条目：

```javascript
const TRANSITION_CHECKS = {
  // 现有转换不变...
  'exploring:bridging': ['artifacts-exist'],      // hotfix 跳过 specifying
  'exploring:approved': ['artifacts-exist'],       // tweak 跳过 specifying + bridging
};
```

**验证**:
```bash
node scripts/guard/guard.mjs check /tmp/test exploring bridging --workflow hotfix --json
# Expected: {"pass":<bool>,"checks":[{"dimension":"artifacts-exist",...}]}
node scripts/guard/guard.mjs check /tmp/test exploring approved --workflow tweak --json
# Expected: {"pass":<bool>,"checks":[{"dimension":"artifacts-exist",...}]}
```

- [ ] **2.4 端到端验证 guard.mjs 模式感知**

**Files**: (none)

```bash
# 1. hotfix 模式跳过 schema-valid
node scripts/guard/guard.mjs check /tmp/test specifying bridging --workflow hotfix --json
# Expected: schema-valid 在输出中标记为 skipped

# 2. tweak 模式跳过 schema-valid + contract-fresh
node scripts/guard/guard.mjs check /tmp/test specifying bridging --workflow tweak --json
# Expected: schema-valid 和 contract-fresh 标记为 skipped

# 3. full 模式不变
node scripts/guard/guard.mjs check /tmp/test specifying bridging --workflow full --json
# Expected: schema-valid 正常执行

# 4. 无效 workflow 报错
node scripts/guard/guard.mjs check /tmp/test exploring specifying --workflow chaos
# Expected: exit 2
```

- [ ] **2.5 Commit Batch 2**

```bash
git add -A
git commit -m "feat: add workflow mode awareness to guard.mjs (hotfix/tweak fast paths)"
```

---

## 3. Batch 3: 阶段防漂移注入

Depends on: Batch 1

- [ ] **3.1 创建 cmd-inject.mjs：核心逻辑**

**Files**: Create: `scripts/lib/cmd-inject.mjs`

核心结构：
1. 导入 `readState` from `./state-loader.mjs`
2. 定义 `PHASE_TEMPLATES` 对象（7 个阶段各一个模板）
3. `generatePhaseGuard(state)` 函数：选择模板 + 替换占位符
4. `installRule(content)` 函数：写入 `rules/phase-guard.md` + 复制到 `.claude/always/`
5. `run(args)` 导出函数：解析参数 → 读状态 → 生成 → 安装 → 输出

`PHASE_TEMPLATES` 中每个模板包含：
- `# Phase Guard: {{change_name}}`
- `当前阶段: {{state}} | 工作流: {{workflow}}`
- `## ✅ 允许操作` 列表
- `## ⛔ 禁止操作` 列表
- `## 🔔 决策点` 提示（如适用）

**验证**:
```bash
mkdir -p /tmp/test-inject
echo "state: specifying" > /tmp/test-inject/.spec-superflow.yaml
echo "workflow: full" >> /tmp/test-inject/.spec-superflow.yaml
echo "change_name: test-inject" >> /tmp/test-inject/.spec-superflow.yaml
node scripts/spec-superflow.mjs inject /tmp/test-inject
# Expected: 生成 rules/phase-guard.md + 安装到 .claude/always/
cat rules/phase-guard.md
# Expected: 包含 "Phase Guard: test-inject" + "specifying" + 允许/禁止操作列表
```

- [ ] **3.2 实现 PHASE_TEMPLATES 模板**

**Files**: Modify: `scripts/lib/cmd-inject.mjs`

7 个阶段模板的核心内容：

| 阶段 | ✅ 允许操作 | ⛔ 禁止操作 | 🔔 决策点 |
|------|-----------|-----------|----------|
| exploring | 澄清需求、比较方案 | 创建工件、执行代码 | DP-1 |
| specifying | 创建/修改 proposal、specs、design、tasks | 修改 contract、执行代码 | DP-2 |
| bridging | 生成/修改 execution-contract | 执行代码、修改 specs | DP-3 |
| approved-for-build | 选择执行模式 | 修改 contract、specs | DP-4 |
| executing | 按 contract 执行任务、运行测试 | 修改 proposal、specs、design | DP-5 |
| debugging | 分析根因、修复 bug | 修改 proposal、specs、design | — |
| closing | 验证、归档、合并 delta specs | 修改 contract、执行新任务 | DP-6, DP-7 |

每个模板用 `{{change_name}}`、`{{state}}`、`{{workflow}}` 占位符。

**验证**: 检查每个阶段模板生成正确
```bash
for state in exploring specifying bridging approved-for-build executing debugging closing; do
  echo "state: $state" > /tmp/test-inject/.spec-superflow.yaml
  node scripts/spec-superflow.mjs inject /tmp/test-inject 2>/dev/null
  echo "=== $state ==="
  head -5 rules/phase-guard.md
  echo ""
done
```

- [ ] **3.3 实现 .claude/always/ 安装逻辑**

**Files**: Modify: `scripts/lib/cmd-inject.mjs`

`installRule(content)` 函数：
1. 写入 `rules/phase-guard.md`
2. 确保 `.claude/always/` 目录存在（`mkdirSync` + `recursive: true`）
3. 复制到 `.claude/always/phase-guard.md`
4. 返回安装路径

错误处理：
- 目录创建失败 → 输出 `⛔ Cannot create .claude/always/: <error>`
- 文件写入失败 → 输出 `⛔ Cannot write phase-guard.md: <error>`

**验证**:
```bash
rm -rf /tmp/test-inject/.claude
node scripts/spec-superflow.mjs inject /tmp/test-inject
ls /tmp/test-inject/.claude/always/phase-guard.md
# Expected: file exists
diff rules/phase-guard.md /tmp/test-inject/.claude/always/phase-guard.md
# Expected: no diff
```

- [ ] **3.4 修改 spec-superflow.mjs：新增 inject 路由**

**Files**: Modify: `scripts/spec-superflow.mjs`

在 help 文本中新增 `inject` 命令描述：

```
  inject <dir>    Generate phase-guard.md rule and install to .claude/always/
```

在路由逻辑中新增 case：

```javascript
case 'inject':
  const { run: runInject } = await import('./lib/cmd-inject.mjs');
  await runInject(rest);
  break;
```

**验证**:
```bash
node scripts/spec-superflow.mjs --help
# Expected: inject 命令出现在帮助文本中
node scripts/spec-superflow.mjs inject --help
# Expected: inject 子命令用法说明
```

- [ ] **3.5 处理状态文件缺失的优雅降级**

**Files**: Modify: `scripts/lib/cmd-inject.mjs`

当 `.spec-superflow.yaml` 不存在时：
1. 输出警告：`⚠️ No .spec-superflow.yaml found in <change-dir>, using defaults`
2. 使用默认值：`state=exploring`, `workflow=full`
3. 仍然生成 phase-guard.md

`readState()` 已经有默认值合并逻辑（`BUILTIN_DEFAULTS`），所以只需确认 `change_name` 从目录名推导即可。

**验证**:
```bash
rm -f /tmp/test-inject/.spec-superflow.yaml
node scripts/spec-superflow.mjs inject /tmp/test-inject
# Expected: ⚠️ warning + 使用默认值生成 phase-guard.md
cat rules/phase-guard.md
# Expected: state=exploring, workflow=full
```

- [ ] **3.6 Commit Batch 3**

```bash
git add -A
git commit -m "feat: add ssf inject command for phase-drift prevention rules"
```

---

## 4. Batch 4: Skill 文件更新

Depends on: Batch 2, Batch 3

- [ ] **4.1 更新 workflow-orchestrator SKILL.md：模式检测**

**Files**: Modify: `skills/workflow-orchestrator/SKILL.md`

在 "Required Inspection" 部分后新增 "Mode Detection" 部分：

```markdown
## Mode Detection

Before routing, check the workflow mode:
1. Run: `ssf state get <change-dir> workflow`
2. If workflow is `full` or unset → standard routing (no changes)
3. If workflow is `hotfix`:
   - Validate: ≤2 files? No new modules? No schema changes?
   - All pass → use hotfix fast-path routing
   - Any fail → upgrade to `full`, run `ssf state set <dir> workflow full`, output upgrade reason
4. If workflow is `tweak`:
   - Validate: ≤4 files? Single module? Config/doc/prompt only?
   - All pass → use tweak fast-path routing
   - Any fail → upgrade to `full`, run `ssf state set <dir> workflow full`, output upgrade reason
```

**验证**: SKILL.md 语法正确，markdown 渲染无错误

- [ ] **4.2 更新 workflow-orchestrator SKILL.md：快速路径路由规则**

**Files**: Modify: `skills/workflow-orchestrator/SKILL.md`

在 "Routing Rules" 部分新增快速路径路由：

```markdown
### Hotfix Fast-Path Routing

When workflow is `hotfix`:
- Route to `bridge-contract` with minimal contract mode (intent + task list only)
- Skip `spec-explorer` and full `spec-forger`
- Guard check: `node scripts/guard/guard.mjs check <dir> exploring bridging --workflow hotfix --json`
- After bridge: DP-3 契约批准
- After approval: route to `execution-governor` (inline mode)
- After execution: route to `closure-archivist` (lightweight closure)

### Tweak Fast-Path Routing

When workflow is `tweak`:
- Route directly to `execution-governor` (direct edit mode)
- Skip `spec-explorer`, `spec-forger`, and `bridge-contract`
- Guard check: `node scripts/guard/guard.mjs check <dir> exploring approved --workflow tweak --json`
- After execution: route to `closure-archivist` (lightweight closure: file exists + syntax check)
```

新增状态转换后的 inject 提示：

```markdown
### Post-Transition Injection Prompt

After every successful `ssf state transition`, output:
> 💡 Run `ssf inject <change-dir>` to update phase-guard.md with the new state.
```

**验证**: 快速路径路由规则清晰，包含 guard 命令、DP 引用和 inject 提示

- [ ] **4.3 更新 workflow-orchestrator SKILL.md：决策点引用**

**Files**: Modify: `skills/workflow-orchestrator/SKILL.md`

在 "Output Standard" 部分新增决策点引用要求：

```markdown
### Decision Point References

When routing to a skill that has an associated decision point, include the decision point number in the output:
- Route to bridge-contract → include `DP-3: 契约批准`
- Route to execution-governor → include `DP-4: 执行模式选择`
- Route to systematic-debugger (escalation) → include `DP-5: 调试升级`
- Route to closure-archivist → include `DP-7: 归档确认`

Reference: `docs/decision-points.md`
```

**验证**: 决策点引用与 docs/decision-points.md 中的编号一致

- [ ] **4.4 更新 bridge-contract SKILL.md：hotfix 最小契约**

**Files**: Modify: `skills/bridge-contract/SKILL.md`

新增 hotfix 模式部分：

```markdown
## Hotfix Mode: Minimal Contract

When workflow is `hotfix`, generate a minimal execution-contract.md containing only:
1. **Intent Lock** — one-sentence description of the change intent
2. **Task List** — numbered list of tasks to complete
3. **Approval Gate** — DP-3 prompt for user confirmation

Skip: Scope Fence, Build Rules, Review Gates, Test Evidence requirements.

The minimal contract still requires explicit user approval (DP-3) before execution begins.
```

**验证**: bridge-contract SKILL.md 中 hotfix 模式部分清晰

- [ ] **4.5 更新 execution-governor SKILL.md：tweak 直接编辑模式**

**Files**: Modify: `skills/execution-governor/SKILL.md`

新增 tweak 模式部分：

```markdown
## Tweak Mode: Direct Edit

When workflow is `tweak`, execution-governor operates in direct edit mode:
1. Skip TDD Iron Law (no test-first requirement for config/doc changes)
2. Apply changes directly to target files
3. Verify file integrity after each change (file exists, non-empty, valid syntax)
4. No batch-based execution — apply all changes in sequence
5. Reference DP-4 for execution mode confirmation
```

**验证**: execution-governor SKILL.md 中 tweak 模式部分清晰

- [ ] **4.6 更新 closure-archivist SKILL.md：轻量闭合**

**Files**: Modify: `skills/closure-archivist/SKILL.md`

新增 tweak/hotfix 闭合部分：

```markdown
## Lightweight Closure (hotfix/tweak mode)

When workflow is `hotfix` or `tweak`, closure-archivist performs lightweight verification:
1. Verify all changed files exist and are non-empty
2. Run syntax check on code files (`node --check` for .mjs/.js)
3. Skip the full 5-step three-dimensional verification
4. Still record DP-6 (验证失败) and DP-7 (归档确认) decision points
5. Delta specs are NOT generated in lightweight closure (no specs to sync)
```

**验证**: closure-archivist SKILL.md 中轻量闭合部分清晰，明确说明跳过哪些步骤

- [ ] **4.7 Commit Batch 4**

```bash
git add -A
git commit -m "feat: update 4 skill files for fast-path routing and decision point references"
```

---

## 5. Batch 5: 集成 + 文档 + 发布准备

Depends on: Batch 1, Batch 2, Batch 3, Batch 4

- [ ] **5.1 版本号 → 0.6.0**

**Files**: Modify: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`

```bash
node scripts/spec-superflow.mjs version 0.6.0
# Expected: ✅ Updated version to 0.6.0 in 5 manifests
```

- [ ] **5.2 更新 CHANGELOG.md**

**Files**: Modify: `CHANGELOG.md`

新增 v0.6.0 条目：

```markdown
## [0.6.0] - 2026-06-29

### Added
- **Fast-path workflow modes**: hotfix and tweak modes skip full planning for small changes
- **Phase-drift prevention**: `ssf inject` command generates `.claude/always/phase-guard.md`
- **Decision point protocol**: `docs/decision-points.md` defines 7 standard decision points
- **Guard mode awareness**: `guard.mjs` accepts `--workflow` parameter for mode-specific checks
- **State set command**: `ssf state set` for updating workflow mode and decision point results
- **Auto-upgrade conditions**: hotfix/tweak automatically upgrade to full when thresholds exceeded

### Changed
- 4 skill files updated with fast-path routing and decision point references
```

- [ ] **5.3 更新 README.md**

**Files**: Modify: `README.md`

更新内容：
1. 架构图：新增 phase-guard.md 和 decision-points.md
2. CLI 命令表：新增 `ssf inject` 命令
3. 新增 "Fast-Path Workflow" 部分：说明 hotfix/tweak 模式
4. 状态机图：新增快速路径箭头

- [ ] **5.4 运行 ssf doctor 验证**

**Files**: (none)

```bash
node scripts/spec-superflow.mjs doctor
# Expected: 所有检查通过
# - Version: 0.6.0 (consistent)
# - Hooks: valid
# - Skills: 9/9
# - dist/: compiled
# - Node.js: >= 22
# - Docs: consistent
```

- [ ] **5.5 Commit Batch 5**

```bash
git add -A
git commit -m "chore: bump version to 0.6.0, update CHANGELOG and README"
```

---

## 6. Closeout

- [ ] **6.1 验证设计决策落地**

| 设计决策 | 对应任务 | 状态 |
|---------|---------|------|
| 决策 1: 模式检测由 orchestrator 执行 | 4.1, 4.2 | — |
| 决策 2: guard.mjs 通过 --workflow 参数 | 2.1, 2.2, 2.3 | — |
| 决策 3: ssf inject 显式命令 | 3.1, 3.2, 3.3, 3.4 | — |
| 决策 4: 决策点审计在状态文件中 | 1.2, 1.3 | — |
| 决策 5: 阶段模板用 PHASE_TEMPLATES | 3.2 | — |

- [ ] **6.2 风险确认**

| 风险 | 缓解措施 | 已实现 |
|------|---------|--------|
| 模式检测误判 | 升级条件兜底 | — |
| phase-guard.md 过期 | inject 提示 | — |
| .claude/always/ 不存在 | mkdir -p | — |
| 决策点字段膨胀 | 独立区块 | — |
| 跳过 schema-valid 质量下降 | artifacts-exist 兜底 | — |
| 无效 workflow 值 | 白名单校验 | — |

- [ ] **6.3 发布 v0.6.0**

```bash
npm run build && npm test
git tag v0.6.0 && git push --tags
# CI/CD: build + test → GitHub Release + npm publish
```
