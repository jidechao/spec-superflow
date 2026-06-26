import { MIN_PURPOSE_LENGTH, MIN_WHY_SECTION_LENGTH, MAX_WHY_SECTION_LENGTH, MAX_REQUIREMENT_TEXT_LENGTH, MAX_DELTAS_PER_CHANGE, VALIDATION_MESSAGES, } from './constants.js';
import { parseDeltaSpec, normalizeRequirementName, extractRequirementsSection, } from '../parsing/requirement-blocks.js';
const REQUIREMENT_HEADER_REGEX = /^###\s*Requirement:\s*(.+)\s*$/i;
const SCENARIO_HEADER_REGEX = /^####\s+Scenario:/i;
function normalizeLineEndings(content) {
    return content.replace(/\r\n?/g, '\n');
}
function extractSection(content, heading) {
    const normalized = normalizeLineEndings(content);
    const lines = normalized.split('\n');
    const headingRegex = new RegExp(`^##\\s+${heading.replace(/\s+/g, '\\s+')}\\s*$`, 'i');
    const idx = lines.findIndex((l) => headingRegex.test(l));
    if (idx === -1)
        return undefined;
    let endIdx = lines.length;
    for (let i = idx + 1; i < lines.length; i++) {
        if (/^##\s+/.test(lines[i])) {
            endIdx = i;
            break;
        }
    }
    return lines.slice(idx + 1, endIdx).join('\n').trim();
}
function containsShallOrMust(text) {
    return /\b(SHALL|MUST)\b/.test(text);
}
function countScenarios(blockRaw) {
    const matches = blockRaw.match(/^####\s+/gm);
    return matches ? matches.length : 0;
}
function extractRequirementText(blockRaw) {
    const lines = blockRaw.split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^####\s+/.test(line))
            break;
        const trimmed = line.trim();
        if (trimmed.length === 0)
            continue;
        if (/^\*\*[^*]+\*\*:/.test(trimmed))
            continue;
        return trimmed;
    }
    return undefined;
}
function buildMissingShallOrMustMessage(action, blockName) {
    const base = `${action} "${blockName}" must contain SHALL or MUST`;
    if (containsShallOrMust(blockName)) {
        return `${base} in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the "### Requirement: ..." header.`;
    }
    return base;
}
function formatSectionList(sections) {
    if (sections.length === 0)
        return '';
    if (sections.length === 1)
        return sections[0];
    const head = sections.slice(0, -1);
    const last = sections[sections.length - 1];
    return `${head.join(', ')} and ${last}`;
}
function enrichTopLevelError(itemId, baseMessage) {
    const msg = baseMessage.trim();
    if (msg === VALIDATION_MESSAGES.CHANGE_NO_DELTAS) {
        return `${msg}. ${VALIDATION_MESSAGES.GUIDE_NO_DELTAS}`;
    }
    if (msg.includes('Spec must have a Purpose section') ||
        msg.includes('Spec must have a Requirements section')) {
        return `${msg}. ${VALIDATION_MESSAGES.GUIDE_MISSING_SPEC_SECTIONS}`;
    }
    if (msg.includes('Change must have a Why section') ||
        msg.includes('Change must have a What Changes section')) {
        return `${msg}. ${VALIDATION_MESSAGES.GUIDE_MISSING_CHANGE_SECTIONS}`;
    }
    return msg;
}
function createReport(issues, strictMode = false) {
    const errors = issues.filter((i) => i.level === 'ERROR').length;
    const warnings = issues.filter((i) => i.level === 'WARNING').length;
    const info = issues.filter((i) => i.level === 'INFO').length;
    const valid = strictMode ? errors === 0 && warnings === 0 : errors === 0;
    return {
        valid,
        issues,
        summary: { errors, warnings, info },
    };
}
export class Validator {
    strictMode;
    constructor(strictMode = false) {
        this.strictMode = strictMode;
    }
    validateSpecContent(specName, content) {
        const issues = [];
        if (!specName || specName.trim().length === 0) {
            issues.push({ level: 'ERROR', path: 'name', message: VALIDATION_MESSAGES.SPEC_NAME_EMPTY });
        }
        const purposeSection = extractSection(content, 'Purpose');
        if (!purposeSection || purposeSection.trim().length === 0) {
            issues.push({
                level: 'ERROR',
                path: 'overview',
                message: VALIDATION_MESSAGES.SPEC_PURPOSE_EMPTY,
            });
        }
        else if (purposeSection.length < MIN_PURPOSE_LENGTH) {
            issues.push({
                level: 'WARNING',
                path: 'overview',
                message: VALIDATION_MESSAGES.PURPOSE_TOO_BRIEF,
            });
        }
        const reqSectionParts = extractRequirementsSection(content);
        if (reqSectionParts.bodyBlocks.length === 0) {
            issues.push({
                level: 'ERROR',
                path: 'requirements',
                message: VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS,
            });
        }
        for (const block of reqSectionParts.bodyBlocks) {
            const reqText = extractRequirementText(block.raw);
            if (!reqText || reqText.trim().length === 0) {
                issues.push({
                    level: 'ERROR',
                    path: `requirements.${block.name}`,
                    message: VALIDATION_MESSAGES.REQUIREMENT_EMPTY,
                });
            }
            else {
                if (!containsShallOrMust(reqText)) {
                    issues.push({
                        level: 'ERROR',
                        path: `requirements.${block.name}`,
                        message: buildMissingShallOrMustMessage('ADDED', block.name),
                    });
                }
                if (reqText.length > MAX_REQUIREMENT_TEXT_LENGTH) {
                    issues.push({
                        level: 'INFO',
                        path: `requirements.${block.name}`,
                        message: VALIDATION_MESSAGES.REQUIREMENT_TOO_LONG,
                    });
                }
            }
            const scenarioCount = countScenarios(block.raw);
            if (scenarioCount < 1) {
                issues.push({
                    level: 'WARNING',
                    path: `requirements.${block.name}.scenarios`,
                    message: `${VALIDATION_MESSAGES.REQUIREMENT_NO_SCENARIOS}. ${VALIDATION_MESSAGES.GUIDE_SCENARIO_FORMAT}`,
                });
            }
        }
        return createReport(issues, this.strictMode);
    }
    validateChangeContent(changeName, content) {
        const issues = [];
        if (!changeName || changeName.trim().length === 0) {
            issues.push({ level: 'ERROR', path: 'name', message: VALIDATION_MESSAGES.CHANGE_NAME_EMPTY });
        }
        const whySection = extractSection(content, 'Why');
        if (!whySection || whySection.trim().length === 0) {
            issues.push({
                level: 'ERROR',
                path: 'why',
                message: VALIDATION_MESSAGES.CHANGE_WHY_TOO_SHORT,
            });
        }
        else {
            if (whySection.length < MIN_WHY_SECTION_LENGTH) {
                issues.push({
                    level: 'ERROR',
                    path: 'why',
                    message: VALIDATION_MESSAGES.CHANGE_WHY_TOO_SHORT,
                });
            }
            if (whySection.length > MAX_WHY_SECTION_LENGTH) {
                issues.push({
                    level: 'WARNING',
                    path: 'why',
                    message: VALIDATION_MESSAGES.CHANGE_WHY_TOO_LONG,
                });
            }
        }
        const whatChanges = extractSection(content, 'What Changes');
        if (!whatChanges || whatChanges.trim().length === 0) {
            issues.push({
                level: 'ERROR',
                path: 'whatChanges',
                message: VALIDATION_MESSAGES.CHANGE_WHAT_EMPTY,
            });
        }
        return createReport(issues, this.strictMode);
    }
    validateDeltaSpec(content) {
        const issues = [];
        const plan = parseDeltaSpec(content);
        const totalDeltas = plan.added.length + plan.modified.length + plan.removed.length + plan.renamed.length;
        if (totalDeltas === 0) {
            issues.push({
                level: 'ERROR',
                path: 'file',
                message: enrichTopLevelError('change', VALIDATION_MESSAGES.CHANGE_NO_DELTAS),
            });
            return createReport(issues, this.strictMode);
        }
        if (totalDeltas > MAX_DELTAS_PER_CHANGE) {
            issues.push({
                level: 'WARNING',
                path: 'file',
                message: VALIDATION_MESSAGES.CHANGE_TOO_MANY_DELTAS,
            });
        }
        const addedNames = new Set();
        const modifiedNames = new Set();
        const removedNames = new Set();
        const renamedFrom = new Set();
        const renamedTo = new Set();
        for (const block of plan.added) {
            const key = normalizeRequirementName(block.name);
            if (addedNames.has(key)) {
                issues.push({
                    level: 'ERROR',
                    path: 'added',
                    message: `Duplicate requirement in ADDED: "${block.name}"`,
                });
            }
            else {
                addedNames.add(key);
            }
            const reqText = extractRequirementText(block.raw);
            if (!reqText) {
                issues.push({
                    level: 'ERROR',
                    path: `added.${block.name}`,
                    message: `ADDED "${block.name}" is missing requirement text`,
                });
            }
            else if (!containsShallOrMust(reqText)) {
                issues.push({
                    level: 'ERROR',
                    path: `added.${block.name}`,
                    message: buildMissingShallOrMustMessage('ADDED', block.name),
                });
            }
            if (countScenarios(block.raw) < 1) {
                issues.push({
                    level: 'ERROR',
                    path: `added.${block.name}`,
                    message: `ADDED "${block.name}" must include at least one scenario`,
                });
            }
        }
        for (const block of plan.modified) {
            const key = normalizeRequirementName(block.name);
            if (modifiedNames.has(key)) {
                issues.push({
                    level: 'ERROR',
                    path: 'modified',
                    message: `Duplicate requirement in MODIFIED: "${block.name}"`,
                });
            }
            else {
                modifiedNames.add(key);
            }
            const reqText = extractRequirementText(block.raw);
            if (!reqText) {
                issues.push({
                    level: 'ERROR',
                    path: `modified.${block.name}`,
                    message: `MODIFIED "${block.name}" is missing requirement text`,
                });
            }
            else if (!containsShallOrMust(reqText)) {
                issues.push({
                    level: 'ERROR',
                    path: `modified.${block.name}`,
                    message: buildMissingShallOrMustMessage('MODIFIED', block.name),
                });
            }
            if (countScenarios(block.raw) < 1) {
                issues.push({
                    level: 'ERROR',
                    path: `modified.${block.name}`,
                    message: `MODIFIED "${block.name}" must include at least one scenario`,
                });
            }
        }
        for (const name of plan.removed) {
            const key = normalizeRequirementName(name);
            if (removedNames.has(key)) {
                issues.push({
                    level: 'ERROR',
                    path: 'removed',
                    message: `Duplicate requirement in REMOVED: "${name}"`,
                });
            }
            else {
                removedNames.add(key);
            }
        }
        for (const { from, to } of plan.renamed) {
            const fromKey = normalizeRequirementName(from);
            const toKey = normalizeRequirementName(to);
            if (renamedFrom.has(fromKey)) {
                issues.push({
                    level: 'ERROR',
                    path: 'renamed',
                    message: `Duplicate FROM in RENAMED: "${from}"`,
                });
            }
            else {
                renamedFrom.add(fromKey);
            }
            if (renamedTo.has(toKey)) {
                issues.push({
                    level: 'ERROR',
                    path: 'renamed',
                    message: `Duplicate TO in RENAMED: "${to}"`,
                });
            }
            else {
                renamedTo.add(toKey);
            }
        }
        for (const n of modifiedNames) {
            if (removedNames.has(n)) {
                issues.push({
                    level: 'ERROR',
                    path: 'cross-section',
                    message: `Requirement present in both MODIFIED and REMOVED: "${n}"`,
                });
            }
            if (addedNames.has(n)) {
                issues.push({
                    level: 'ERROR',
                    path: 'cross-section',
                    message: `Requirement present in both MODIFIED and ADDED: "${n}"`,
                });
            }
        }
        for (const n of addedNames) {
            if (removedNames.has(n)) {
                issues.push({
                    level: 'ERROR',
                    path: 'cross-section',
                    message: `Requirement present in both ADDED and REMOVED: "${n}"`,
                });
            }
        }
        for (const { from, to } of plan.renamed) {
            const fromKey = normalizeRequirementName(from);
            const toKey = normalizeRequirementName(to);
            if (modifiedNames.has(fromKey)) {
                issues.push({
                    level: 'ERROR',
                    path: 'cross-section',
                    message: `MODIFIED references old name from RENAMED. Use new header for "${to}"`,
                });
            }
            if (addedNames.has(toKey)) {
                issues.push({
                    level: 'ERROR',
                    path: 'cross-section',
                    message: `RENAMED TO collides with ADDED for "${to}"`,
                });
            }
        }
        return createReport(issues, this.strictMode);
    }
    isValid(report) {
        return report.valid;
    }
}
