import { EFFORT_HEADER, type ClaudeEffort } from "./constants.js";
export { EFFORT_HEADER };
export type ClaudeModelSelection = {
    modelId: string;
    effort?: ClaudeEffort;
};
export declare function encodeClaudeModelSelection(selection: ClaudeModelSelection): string;
export declare function decodeClaudeModelSelection(value: string | null | undefined): ClaudeModelSelection | null;
export declare function resolveClaudeModelSelection(modelId: string, variant?: string): ClaudeModelSelection;
