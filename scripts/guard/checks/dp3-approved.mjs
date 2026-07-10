import { readState } from '../../lib/state-loader.mjs';

export function checkDp3Approved(changeDir) {
  const state = readState(changeDir);
  if (!state.dp_3_result) {
    return {
      pass: false,
      failures: ['DP-3 (dp_3_result) is not recorded — minimal contract approval is required before hotfix build'],
    };
  }
  return { pass: true, failures: [] };
}
