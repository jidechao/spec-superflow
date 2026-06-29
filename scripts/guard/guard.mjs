#!/usr/bin/env node
// scripts/guard/guard.mjs — dimension-based phase transition guard
// Usage: node guard.mjs check <change-dir> <from-state> <to-state> [--json]
import { parseArgs } from 'node:util';
import { checkArtifactsExist } from './checks/artifacts-exist.mjs';
import { checkTasksComplete } from './checks/tasks-complete.mjs';
import { checkTestsPassing } from './checks/tests-passing.mjs';
import { checkContractFresh } from './checks/contract-fresh.mjs';

// Transition matrix: <from>:<to> → required check dimensions
const TRANSITION_CHECKS = {
  'exploring:specifying': ['artifacts-exist'],
  'specifying:bridging':  ['artifacts-exist', 'schema-valid'],
  'bridging:approved':    ['artifacts-exist', 'schema-valid', 'contract-fresh'],
  'approved:executing':   ['artifacts-exist', 'contract-fresh'],
  'executing:closing':    ['tasks-complete', 'tests-passing'],
  'executing:debugging':  [],
  'debugging:executing':  ['contract-fresh'],
};

async function main() {
  const { positionals } = parseArgs({
    options: { json: { type: 'boolean', default: false } },
    allowPositionals: true,
  });

  const subcommand = positionals[0];
  if (subcommand !== 'check') {
    console.error('Usage: guard.mjs check <change-dir> <from-state> <to-state> [--json]');
    process.exit(2);
  }

  const changeDir = positionals[1];
  const fromState = positionals[2];
  const toState = positionals[3];
  const useJson = process.argv.includes('--json');

  if (!changeDir || !fromState || !toState) {
    console.error('Usage: guard.mjs check <change-dir> <from-state> <to-state> [--json]');
    process.exit(2);
  }

  const key = `${fromState}:${toState}`;
  const dimensions = TRANSITION_CHECKS[key];

  if (!dimensions) {
    const valid = Object.keys(TRANSITION_CHECKS).join(', ');
    const msg = `Unknown transition: ${fromState} -> ${toState}. Valid transitions: ${valid}`;
    if (useJson) console.log(JSON.stringify({ pass: false, checks: [], error: msg }));
    else console.error(msg);
    process.exit(1);
  }

  if (dimensions.length === 0) {
    const result = { pass: true, checks: [] };
    if (useJson) console.log(JSON.stringify(result));
    else console.log('All checks passed (no checks required for this transition).');
    process.exit(0);
  }

  const checks = [];
  let pass = true;

  for (const dim of dimensions) {
    let result;
    switch (dim) {
      case 'artifacts-exist':
        result = checkArtifactsExist(changeDir);
        break;
      case 'schema-valid':
        result = await (await import('./checks/schema-valid.mjs')).checkSchemaValid(changeDir);
        break;
      case 'contract-fresh':
        result = checkContractFresh(changeDir);
        break;
      case 'tasks-complete':
        result = checkTasksComplete(changeDir);
        break;
      case 'tests-passing':
        result = checkTestsPassing(changeDir);
        break;
      default:
        result = { pass: false, failures: [`Unknown dimension: ${dim}`] };
    }
    checks.push({ dimension: dim, pass: result.pass, failures: result.failures || [] });
    if (!result.pass) pass = false;
  }

  if (useJson) {
    console.log(JSON.stringify({ pass, checks }, null, 2));
  } else {
    if (pass) {
      console.log('All checks passed.');
    } else {
      console.error('Guard checks failed:');
      for (const c of checks) {
        if (!c.pass) {
          for (const f of c.failures) {
            console.error(`  [FAIL] ${c.dimension}: ${f}`);
          }
        }
      }
    }
  }

  process.exit(pass ? 0 : 1);
}

main().catch(err => {
  console.error('Guard error:', err.message);
  process.exit(1);
});