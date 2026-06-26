import { ValidationReport } from './types.js';
export declare class Validator {
    private strictMode;
    constructor(strictMode?: boolean);
    validateSpecContent(specName: string, content: string): ValidationReport;
    validateChangeContent(changeName: string, content: string): ValidationReport;
    validateDeltaSpec(content: string): ValidationReport;
    isValid(report: ValidationReport): boolean;
}
