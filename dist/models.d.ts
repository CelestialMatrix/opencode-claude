import { type ClaudeEffort } from "./constants.js";
export type ClaudeModel = {
    id: string;
    name: string;
    reasoning: boolean;
    contextWindow: number;
    maxTokens: number;
    resolvedId?: string;
    /** Effort levels the model accepts; defaults to all when reasoning. */
    efforts?: ClaudeEffort[];
    /** Runs in Claude Code's fast mode; `resolvedId` is the plain model. */
    fast?: boolean;
};
/**
 * Suffix of a fast-mode entry's id. OpenCode has no speed setting, so fast
 * mode is a model of its own in the picker ("Opus 5.5 Fast").
 */
export declare const FAST_MODEL_SUFFIX = ":fast";
/** A row of the Agent SDK's `supportedModels()` answer. */
export type SdkModelRow = {
    value: string;
    displayName?: string;
    resolvedModel?: string;
    supportedEffortLevels?: string[];
    supportsFastMode?: boolean;
};
/**
 * Display name from the concrete model id ("claude-opus-5-5[1m]" →
 * "Opus 5.5"). CLI display names depend on the CLI version ("Opus (1M
 * context)" can mean Opus 5 or 5.5), so the id is the source of truth.
 */
export declare function modelNameFromId(id: string | undefined): string | undefined;
/**
 * Map the CLI's own model list (supportedModels) into the catalog. The
 * CLI's "default" row only repeats another model, so it is skipped.
 */
export declare function modelsFromSdk(rows: SdkModelRow[]): ClaudeModel[];
export declare function getClaudeModels(): ClaudeModel[];
/** Replace the discovered list and remember it for the next start. */
export declare function setDiscoveredModels(models: ClaudeModel[]): boolean;
/** Whether the picked catalog entry runs in fast mode. */
export declare function isFastModelId(modelId: string): boolean;
export declare function resolveClaudeModelId(modelId: string): string;
/**
 * Effort levels offered as OpenCode model variants. The variant id is the
 * effort; the model.request hook turns it into the proxy's effort header.
 */
export declare function buildEffortVariants(model: ClaudeModel): ClaudeEffort[];
