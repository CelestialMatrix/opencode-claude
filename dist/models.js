/**
 * Claude Code model catalog (from OpenChamber harness registry).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { EFFORT_LEVELS, isClaudeEffort, } from "./constants.js";
/**
 * Suffix of a fast-mode entry's id. OpenCode has no speed setting, so fast
 * mode is a model of its own in the picker ("Opus 5.5 Fast").
 */
export const FAST_MODEL_SUFFIX = ":fast";
const LIMIT_1M = { context: 1_000_000, output: 128_000 };
const LIMIT_200K = { context: 200_000, output: 64_000 };
function model(id, name, limit, resolvedId, efforts = [...EFFORT_LEVELS]) {
    return {
        id,
        name,
        reasoning: efforts.length > 0,
        contextWindow: limit.context,
        maxTokens: limit.output,
        efforts,
        ...(resolvedId ? { resolvedId } : {}),
    };
}
/**
 * Fallback catalog for before the CLI has reported its own list (first
 * start, CLI missing or signed out). Same concrete ids as discovery.
 * OpenCode only runs listed models, so a session that picked a 1.0 alias
 * (`opus[1m]`, `sonnet`) asks the user to pick a model once.
 */
const FALLBACK_MODELS = [
    model("claude-opus-5-5", "Opus 5.5", LIMIT_1M),
    model("claude-fable-5-1", "Fable 5.1", LIMIT_1M),
    model("claude-sonnet-5-5", "Sonnet 5.5", LIMIT_1M),
    model("claude-sonnet-5", "Sonnet 5", LIMIT_1M),
    model("claude-haiku-5-5", "Haiku 5.5", LIMIT_1M),
    model("claude-haiku-4-5", "Haiku 4.5", LIMIT_200K, undefined, []),
    model("claude-opus-4-8", "Opus 4.8", LIMIT_1M),
];
/**
 * 1M context rules per model family, from the window the CLI reports for
 * each plain id (Claude Code 2.1.312, a subscription plan). Claude Code
 * selects 1M through a `[1m]` suffix where the plain id runs at 200K.
 * - default: offered only as the 1M variant
 * - optional: offered as both the plain model and a 1M variant
 * - fixed: the plain id already runs at 1M
 * Anything else is 200K. Sonnet 4.6's 1M needs usage credits, so it isn't
 * offered.
 */
const ONE_M_FAMILIES = [
    { match: /^claude-fable-5/, mode: "fixed" },
    { match: /^claude-opus-5/, mode: "fixed" },
    { match: /^claude-opus-4-[78]/, mode: "fixed" },
    { match: /^claude-opus-4-6/, mode: "optional" },
    { match: /^claude-sonnet-5/, mode: "fixed" },
    { match: /^claude-haiku-5/, mode: "fixed" },
];
/**
 * Display name from the concrete model id ("claude-opus-5-5[1m]" →
 * "Opus 5.5"). CLI display names depend on the CLI version ("Opus (1M
 * context)" can mean Opus 5 or 5.5), so the id is the source of truth.
 */
export function modelNameFromId(id) {
    const match = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(?:\[1m\])?$/i.exec(id?.trim() ?? "");
    if (!match)
        return undefined;
    const family = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    return `${family} ${match[2]}${match[3] ? `.${match[3]}` : ""}`;
}
/**
 * Map the CLI's own model list (supportedModels) into the catalog. The
 * CLI's "default" row only repeats another model, so it is skipped.
 */
export function modelsFromSdk(rows) {
    const out = [];
    for (const row of rows) {
        const value = typeof row?.value === "string" ? row.value.trim() : "";
        if (!value || value === "default")
            continue;
        const efforts = (row.supportedEffortLevels ?? []).filter(isClaudeEffort);
        const name = modelNameFromId(row.resolvedModel) ??
            modelNameFromId(value) ??
            (row.displayName?.trim() || value);
        // The concrete id, like t3code: a session stays on the model it picked
        // instead of moving when the CLI's `opus` alias points somewhere new.
        const family = (row.resolvedModel || value).replace(/\[1m\]$/i, "");
        const base = family;
        const rule = /\[1m\]$/i.test(value)
            ? { mode: "default" }
            : ONE_M_FAMILIES.find((f) => f.match.test(family));
        if (rule?.mode === "default") {
            out.push(model(`${base}[1m]`, name, LIMIT_1M, undefined, efforts));
        }
        else if (rule?.mode === "fixed") {
            out.push(model(base, name, LIMIT_1M, undefined, efforts));
        }
        else if (rule?.mode === "optional") {
            out.push(model(base, name, LIMIT_200K, undefined, efforts));
            out.push(model(`${base}[1m]`, `${name} (1M)`, LIMIT_1M, undefined, efforts));
        }
        else {
            out.push(model(base, name, LIMIT_200K, undefined, efforts));
        }
    }
    // An alias row and its concrete row resolve to the same model.
    const seen = new Set();
    const unique = out.filter((m) => !seen.has(m.id) && seen.add(m.id));
    // Fast mode where the CLI says the model supports it, next to its model.
    const fastFamilies = new Set(rows
        .filter((row) => row?.supportsFastMode === true)
        .map((row) => (row.resolvedModel || row.value || "").trim().replace(/\[1m\]$/i, ""))
        .filter((id) => id && id !== "default"));
    return unique.flatMap((m) => fastFamilies.has(m.id.replace(/\[1m\]$/i, ""))
        ? [m, { ...m, id: `${m.id}${FAST_MODEL_SUFFIX}`, name: `${m.name} Fast`, resolvedId: m.id, fast: true }]
        : [m]);
}
let discovered = readCachedModels();
function buildCatalog() {
    return discovered?.length ? discovered : FALLBACK_MODELS;
}
export function getClaudeModels() {
    return buildCatalog();
}
/** Replace the discovered list and remember it for the next start. */
export function setDiscoveredModels(models) {
    if (!models.length)
        return false;
    const changed = JSON.stringify(models) !== JSON.stringify(discovered);
    discovered = models;
    if (changed)
        writeCachedModels(models);
    return changed;
}
function modelCachePath() {
    const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
    return join(base, "opencode-claude", "models.json");
}
function readCachedModels() {
    try {
        const parsed = JSON.parse(readFileSync(modelCachePath(), "utf8"));
        return Array.isArray(parsed) && parsed.length ? parsed : null;
    }
    catch {
        return null;
    }
}
function writeCachedModels(models) {
    try {
        const file = modelCachePath();
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(models, null, 2));
    }
    catch {
        // The cache only speeds up the next start.
    }
}
/** Whether the picked catalog entry runs in fast mode. */
export function isFastModelId(modelId) {
    return getClaudeModels().find((m) => m.id === modelId)?.fast === true;
}
export function resolveClaudeModelId(modelId) {
    const match = getClaudeModels().find((m) => m.id === modelId);
    if (!match)
        return modelId;
    return match.resolvedId || match.id;
}
/**
 * Effort levels offered as OpenCode model variants. The variant id is the
 * effort; the model.request hook turns it into the proxy's effort header.
 */
export function buildEffortVariants(model) {
    if (!model.reasoning)
        return [];
    return model.efforts ? [...model.efforts] : [...EFFORT_LEVELS];
}
