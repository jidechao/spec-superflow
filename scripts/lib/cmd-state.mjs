// scripts/lib/cmd-state.mjs — ssf state subcommand handler
import { parseArgs } from 'node:util';
import { readState, writeState, updateField, rebuildState } from './state-loader.mjs';
import { computeArtifactsHash, computeContractHash } from './hash.mjs';

const SETTABLE_FIELDS = [
  'workflow', 'execution_mode', 'test_result',
  'dp_1_result', 'dp_1_timestamp', 'dp_2_result', 'dp_2_timestamp',
  'dp_3_result', 'dp_3_timestamp', 'dp_4_result', 'dp_4_timestamp',
  'dp_5_result', 'dp_5_timestamp', 'dp_6_result', 'dp_6_timestamp',
  'dp_7_result', 'dp_7_timestamp',
];

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    options: {
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const sub = positionals[0];  // init | check | transition | get | rebuild | set
  const changeDir = positionals[1];
  const arg = positionals[2];  // <to-state> for transition, <field> for get

  if (!changeDir) {
    console.error('Usage: ssf state <subcommand> <change-dir> [arg]');
    console.error('Subcommands: init, check, transition, get, rebuild, set');
    process.exit(2);
  }

  switch (sub) {
    case 'init': {
      const hash = computeArtifactsHash(changeDir);
      const ch = computeContractHash(changeDir);
      const state = readState(changeDir);
      state.artifacts_hash = hash;
      state.contract_hash = ch;
      state.last_transition = new Date().toISOString();
      writeState(changeDir, state);
      if (values.json) {
        console.log(JSON.stringify({ ok: true, artifacts_hash: hash, contract_hash: ch }));
      } else {
        console.log(`State initialized. artifacts_hash: ${hash}`);
      }
      break;
    }
    case 'check': {
      const state = readState(changeDir);
      const currentHash = computeArtifactsHash(changeDir);
      const consistent = state.artifacts_hash === currentHash;
      if (values.json) {
        console.log(JSON.stringify({
          consistent,
          stored_hash: state.artifacts_hash,
          current_hash: currentHash,
          state: state.state,
        }));
      } else {
        if (consistent) {
          console.log('State consistent with artifacts.');
        } else {
          console.log('State INCONSISTENT — artifacts have changed since last transition.');
        }
        console.log(`  State: ${state.state}, stored hash: ${state.artifacts_hash}`);
        console.log(`  Current hash: ${currentHash}`);
      }
      process.exit(consistent ? 0 : 1);
      break;
    }
    case 'transition': {
      const toState = arg;
      if (!toState) {
        console.error('Usage: ssf state transition <change-dir> <to-state>');
        process.exit(2);
      }
      const state = readState(changeDir);
      const fromState = state.state;
      state.state = toState;
      state.last_transition_from = fromState;
      state.last_transition_to = toState;
      state.last_transition = new Date().toISOString();
      writeState(changeDir, state);
      if (values.json) {
        console.log(JSON.stringify({ ok: true, from: fromState, to: toState }));
      } else {
        console.log(`State transitioned: ${fromState} -> ${toState}`);
      }
      break;
    }
    case 'get': {
      const field = arg;
      if (!field) {
        console.error('Usage: ssf state get <change-dir> <field>');
        process.exit(2);
      }
      const state = readState(changeDir);
      const value = state[field];
      if (values.json) {
        console.log(JSON.stringify({ field, value }));
      } else {
        console.log(value ?? 'null');
      }
      break;
    }
    case 'rebuild': {
      const state = rebuildState(changeDir, { computeArtifactsHash, computeContractHash });
      if (values.json) {
        console.log(JSON.stringify({ ok: true, state: state.state }));
      } else {
        console.log(`State rebuilt from artifacts. state: ${state.state}`);
      }
      break;
    }
    case 'set': {
      // ssf state set <change-dir> <field> <value>
      const field = arg;
      const value = positionals[3];
      if (!field || value === undefined) {
        console.error('Usage: ssf state set <change-dir> <field> <value>');
        process.exit(2);
      }
      if (!SETTABLE_FIELDS.includes(field)) {
        console.error(`⛔ Field '${field}' is not settable (use 'transition' for state, or check SETTABLE_FIELDS)`);
        process.exit(1);
      }
      updateField(changeDir, field, value);
      if (values.json) {
        console.log(JSON.stringify({ ok: true, field, value }));
      } else {
        console.log(`✅ Set ${field} = ${value}`);
      }
      break;
    }
    default:
      console.error(`Unknown subcommand: ${sub}. Valid: init, check, transition, get, rebuild, set`);
      process.exit(2);
  }
}