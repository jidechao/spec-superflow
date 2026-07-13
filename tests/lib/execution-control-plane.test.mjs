import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = path => readFileSync(join(root, path), 'utf8');

describe('execution control plane instructions', () => {
  it('keeps execution mode and review gates machine-backed in every entry point', () => {
    const workflowStart = read('skills/workflow-start/SKILL.md');
    const buildExecutor = read('skills/build-executor/SKILL.md');
    const codeReviewer = read('skills/code-reviewer/SKILL.md');
    const inject = read('scripts/lib/cmd-inject.mjs');

    assert.match(workflowStart, /execution show <change-dir> --json/);
    assert.match(workflowStart, /execution plan <change-dir>/);
    assert.match(buildExecutor, /full\/hotfix.*SDD.*default/is);
    assert.match(buildExecutor, /explicit user override/i);
    assert.match(buildExecutor, /parallel.*wave/is);
    assert.match(buildExecutor, /concurren(?:cy|t).*unavailable/i);
    assert.match(buildExecutor, /retryable.*replacement.*pass/is);
    assert.doesNotMatch(buildExecutor, />3 tasks, same module/);
    assert.match(codeReviewer, /execution review <change-dir>.*--verdict <pass\|fail>/s);
    assert.match(codeReviewer, /Critical\/Important.*fail.*receipt/is);
    assert.match(inject, /execution plan/);
    assert.match(inject, /pass.*review receipts.*closing/is);
    assert.match(buildExecutor, /<wave-id>:<parallel\|serial>:<task,.+>\[:<depends-on/i);
  });

  it('gives every packaged installer the same planned-execution gate', () => {
    for (const path of [
      'scripts/lib/install.mjs',
      'scripts/lib/cmd-install-workbuddy.mjs',
      'scripts/install-cursor.mjs',
      'scripts/install-zcode.mjs',
    ]) {
      const content = read(path);
      assert.match(content, /execution plan/);
      assert.match(content, /all.*pass.*review receipt.*closing/is);
      assert.match(content, /full\/hotfix.*tweak.*exempt/is);
    }
  });

  it('keeps task implementer and reviewer prompts aligned with planned waves and receipts', () => {
    const implementer = read('skills/build-executor/implementer-prompt.md');
    const taskReviewer = read('skills/build-executor/task-reviewer-prompt.md');
    const reviewerPrompt = read('skills/code-reviewer/code-reviewer-prompt.md');

    assert.match(implementer, /planned wave/i);
    assert.match(implementer, /implementer report path/i);
    assert.match(taskReviewer, /execution review <change-dir>/);
    assert.match(taskReviewer, /--verdict <pass\|fail>/);
    assert.match(taskReviewer, /review report\s+path/i);
    assert.match(taskReviewer, /persisted.*review report/i);
    assert.match(reviewerPrompt, /execution review <change-dir>/);
    assert.match(reviewerPrompt, /wave ID/i);
    assert.match(reviewerPrompt, /review report\s+path/i);
    assert.match(reviewerPrompt, /persisted.*review report/i);
  });
});
