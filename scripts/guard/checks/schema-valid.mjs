// scripts/guard/checks/schema-valid.mjs — validate artifacts using the existing Validator engine
import fs from 'node:fs';
import path from 'node:path';

// Cached Validator instance, lazily loaded from dist/
let _Validator = null;

async function getValidator() {
  if (_Validator) return _Validator;
  const distPath = new URL('../../../dist/index.js', import.meta.url).pathname;
  const mod = await import(distPath);
  _Validator = mod.Validator;
  return _Validator;
}

/**
 * Validate all artifacts in a change directory using the Validator engine.
 * Returns { pass, failures[] } — pass is true only if all artifacts are valid.
 */
export async function checkSchemaValid(changeDir) {
  const failures = [];
  const Validator = await getValidator();
  const validator = new Validator();

  // Validate proposal.md
  const proposalPath = path.join(changeDir, 'proposal.md');
  if (fs.existsSync(proposalPath)) {
    const content = fs.readFileSync(proposalPath, 'utf-8');
    const changeName = path.basename(changeDir);
    const report = validator.validateChangeContent(changeName, content);
    if (!report.valid) {
      for (const issue of report.issues) {
        if (issue.level === 'ERROR') {
          failures.push(`proposal.md: ${issue.message}`);
        }
      }
    }
  }

  // Validate each specs/*/spec.md as delta specs
  const specsDir = path.join(changeDir, 'specs');
  if (fs.existsSync(specsDir)) {
    for (const entry of fs.readdirSync(specsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const specFile = path.join(specsDir, entry.name, 'spec.md');
        if (fs.existsSync(specFile)) {
          const content = fs.readFileSync(specFile, 'utf-8');
          const report = validator.validateDeltaSpec(content);
          if (!report.valid) {
            for (const issue of report.issues) {
              if (issue.level === 'ERROR') {
                failures.push(`specs/${entry.name}/spec.md: ${issue.message}`);
              }
            }
          }
        }
      }
    }
  }

  return { pass: failures.length === 0, failures };
}