import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('workflow-start path recommendation protocol', () => {
  it('requires recommendation and user selection before persisting an automatic workflow', () => {
    const skill = read('skills/workflow-start/SKILL.md');

    assert.match(skill, /ssf workflow show/);
    assert.match(skill, /ssf workflow recommend/);
    assert.match(skill, /ssf workflow select/);
    assert.match(skill, /needs-input/);
    assert.match(skill, /acknowledge-recommendation/);
    assert.doesNotMatch(skill, /No artifacts.*safe default to full/i);
  });

  it('documents intake selection separately from DP-4 execution mode', () => {
    const decisions = read('docs/decision-points.md');

    assert.match(decisions, /full.*hotfix.*tweak/s);
    assert.match(decisions, /Inline.*Batch Inline.*SDD/s);
  });
});
