import { EFFORT_HEADER, isClaudeEffort } from "./constants.js";
export { EFFORT_HEADER };
export function encodeClaudeModelSelection(selection) {
    return Buffer.from(JSON.stringify(selection), "utf8").toString("base64url");
}
export function decodeClaudeModelSelection(value) {
    if (!value)
        return null;
    try {
        const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        if (!parsed || typeof parsed.modelId !== "string")
            return null;
        if (parsed.effort !== undefined && !isClaudeEffort(parsed.effort)) {
            delete parsed.effort;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
export function resolveClaudeModelSelection(modelId, variant) {
    const effort = isClaudeEffort(variant) ? variant : undefined;
    return { modelId, ...(effort ? { effort } : {}) };
}
