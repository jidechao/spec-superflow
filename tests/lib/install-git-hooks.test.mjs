import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'scripts', 'install-git-hooks.mjs'), 'utf8');

describe('install-git-hooks', () => {
  it('resolves the hook directory and checked repository from Git at runtime', () => {
    assert.match(source, /git rev-parse --git-path hooks/);
    assert.match(source, /git rev-parse --show-toplevel/);
    assert.doesNotMatch(source, /REPO_ROOT="\$\(cd "\$\(dirname "\$0"\)\/\.\.\/\.\." && pwd\)"/);
  });
});
