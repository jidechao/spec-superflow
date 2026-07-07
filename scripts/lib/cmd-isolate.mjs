// scripts/lib/cmd-isolate.mjs — `ssf isolate` CLI wrapper around ensure-branch.mjs
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENSURE = join(__dirname, '..', 'ensure-branch.mjs');

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: { force: { type: 'boolean', default: false } },
  });
  const changeDir = positionals[0];
  const changeName = positionals[1];
  if (!changeDir) {
    console.error('Usage: ssf isolate <change-dir> [change-name] [--force]');
    process.exit(2);
  }
  const extra = values.force ? ['--force'] : [];
  const r = spawnSync('node', [ENSURE, changeDir, changeName, ...extra], { stdio: 'inherit', timeout: 15000 });
  process.exit(r.status ?? 1);
}
