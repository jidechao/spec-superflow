// tests/lib/cmd-inject.test.mjs
// Tests for scripts/lib/cmd-inject.mjs
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

let generatePhaseGuard, toCursorMdc, toCopilotInstructions;

describe('cmd-inject: generatePhaseGuard()', () => {
  before(async () => {
    const modulePath = join(process.cwd(), 'scripts/lib/cmd-inject.mjs');
    const mod = await import(modulePath);
    generatePhaseGuard = mod.generatePhaseGuard;
    toCursorMdc = mod.toCursorMdc;
    toCopilotInstructions = mod.toCopilotInstructions;
  });

  it('replaces {{change_name}} placeholder', () => {
    const result = generatePhaseGuard({ state: 'exploring', change_name: 'add-csv-export' });
    assert.ok(result.includes('add-csv-export'), `Expected "add-csv-export" in output, got: ${result.substring(0, 100)}`);
  });

  it('replaces {{state}} placeholder', () => {
    const result = generatePhaseGuard({ state: 'executing', change_name: 'test' });
    assert.ok(result.includes('executing'));
  });

  it('replaces {{workflow}} placeholder', () => {
    const result = generatePhaseGuard({ state: 'exploring', workflow: 'hotfix', change_name: 'test' });
    assert.ok(result.includes('hotfix'));
  });

  it('generates exploring phase with allowed operations', () => {
    const result = generatePhaseGuard({ state: 'exploring', change_name: 'test' });
    assert.ok(result.includes('澄清需求'));
    assert.ok(result.includes('禁止操作'));
  });

  it('generates specifying phase with allowed operations', () => {
    const result = generatePhaseGuard({ state: 'specifying', change_name: 'test' });
    assert.ok(result.includes('specs/'));
    assert.ok(result.includes('design.md'));
  });

  it('generates bridging phase with contract operations', () => {
    const result = generatePhaseGuard({ state: 'bridging', change_name: 'test' });
    assert.ok(result.includes('execution-contract.md'));
    assert.ok(result.includes('ssf validate'));
  });

  it('generates approved-for-build phase', () => {
    const result = generatePhaseGuard({ state: 'approved-for-build', change_name: 'test' });
    assert.ok(result.includes('执行模式'));
    assert.ok(result.includes('DP-4'));
  });

  it('generates executing phase with test prohibition', () => {
    const result = generatePhaseGuard({ state: 'executing', change_name: 'test' });
    assert.ok(result.includes('跳过测试'));
  });

  it('generates debugging phase with root cause analysis', () => {
    const result = generatePhaseGuard({ state: 'debugging', change_name: 'test' });
    assert.ok(result.includes('根因分析'));
    assert.ok(result.includes('TDD 修复循环'));
  });

  it('generates closing phase with verification', () => {
    const result = generatePhaseGuard({ state: 'closing', change_name: 'test' });
    assert.ok(result.includes('三维验证'));
    assert.ok(result.includes('DP-7'));
  });

  it('generates abandoned terminal state', () => {
    const result = generatePhaseGuard({ state: 'abandoned', change_name: 'test' });
    assert.ok(result.includes('终止状态'));
    assert.ok(result.includes('不得合并'));
  });

  it('falls back to exploring for unknown state', () => {
    const result = generatePhaseGuard({ state: 'unknown-state', change_name: 'test' });
    assert.ok(result.includes('澄清需求'), `Expected exploring fallback, got: ${result.substring(0, 200)}`);
  });

  it('uses defaults when optional fields missing', () => {
    const result = generatePhaseGuard({ state: 'exploring' });
    // change_name defaults to 'unknown'
    assert.ok(result.includes('unknown'));
    // workflow defaults to 'full'
    assert.ok(result.includes('full'));
  });
});

describe('cmd-inject: toCursorMdc()', () => {
  it('wraps base content with Cursor MDC frontmatter', () => {
    const base = '# Phase Guard: test-change\n\n## Allowed\n- Do stuff';
    const result = toCursorMdc(base);

    assert.ok(result.includes('---'), 'Should have frontmatter delimiter');
    assert.ok(result.includes('description: spec-superflow phase guard'));
    assert.ok(result.includes('alwaysApply: true'));
    assert.ok(result.includes('test-change'));
  });
});

describe('cmd-inject: toCopilotInstructions()', () => {
  it('simplifies heading for Copilot format', () => {
    const base = '# Phase Guard: test-change\n\n## Allowed\n- Do stuff';
    const result = toCopilotInstructions(base);

    assert.ok(result.includes('# Phase Guard'));
    assert.ok(result.includes('## Allowed'));
    // Should NOT contain the change name in heading
    assert.ok(!result.includes('# Phase Guard: test-change'));
  });
});
