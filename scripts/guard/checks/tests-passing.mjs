// scripts/guard/checks/tests-passing.mjs — verify test_result is recorded as pass
import { readState } from '../../lib/state-loader.mjs';

/**
 * Check that .spec-superflow.yaml records test_result: pass.
 * This field is set by closure-archivist after verification.
 * Returns { pass, failures[] }.
 */
export function checkTestsPassing(changeDir) {
  const state = readState(changeDir);
  if (state.test_result === 'pass') {
    return { pass: true, failures: [] };
  }
  return {
    pass: false,
    failures: [`test_result is '${state.test_result || 'null'}' — expected 'pass'. Run closure-archivist verification first.`],
  };
}