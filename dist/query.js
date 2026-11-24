/**
 * Thin wrapper around @anthropic-ai/claude-agent-sdk query()/interrupt.
 * Import failure is surfaced as unavailable — detect must not report ready.
 */
import { spawnSync } from "node:child_process";
import { buildClaudeCodeChildEnv } from "./auth-env.js";
import { isClaudeEffort } from "./constants.js";
import { assertClaudeWorkingDirectory, isJsEntrypoint, resolveClaudeCodeExecutable, } from "./executable-path.js";
import { log } from "./log.js";
let sdkModulePromise = null;
let sdkLoadError = null;
let sdkModule = null;
const ALLOWED_PERMISSION_MODES = new Set([
    "default",
    "acceptEdits",
    "plan",
    "bypassPermissions",
    "dontAsk",
]);
const trimmedString = (value) => typeof value === "string" ? value.trim() : "";
function nonEmptyRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    return Object.keys(value).length > 0 ? value : null;
}
export async function loadClaudeAgentSdk() {
    if (sdkModule)
        return sdkModule;
    if (sdkLoadError)
        throw sdkLoadError;
    if (!sdkModulePromise) {
        sdkModulePromise = import("@anthropic-ai/claude-agent-sdk")
            .then((mod) => {
            sdkModule = mod;
            return mod;
        })
            .catch((error) => {
            sdkLoadError =
                error instanceof Error
                    ? error
                    : new Error(String(error?.message ||
                        error ||
                        "Failed to load Claude Agent SDK"));
            sdkModulePromise = null;
            throw sdkLoadError;
        });
    }
    return sdkModulePromise;
}
/**
 * Copy a Claude session's chain up to `upToMessageId` into a new session
 * (fresh uuids, no side branches) and return the new id. A plain resume of
 * the copy sees exactly that history, wherever other branches went.
 */
export async function forkClaudeSession(sessionId, upToMessageId) {
    const sdk = await loadClaudeAgentSdk();
    const result = await sdk.forkSession(sessionId, { upToMessageId });
    if (!result?.sessionId)
        throw new Error("forkSession returned no session id");
    return result.sessionId;
}
export function resetClaudeAgentSdkCache() {
    sdkModule = null;
    sdkModulePromise = null;
    sdkLoadError = null;
}
export async function probeClaudeAgentSdk() {
    try {
        await loadClaudeAgentSdk();
        return { available: true };
    }
    catch (error) {
        return {
            available: false,
            error: error instanceof Error ? error.message : "Claude Agent SDK unavailable",
        };
    }
}
export function killProcessTree(pid, options = {}) {
    if (!Number.isInteger(pid) || !pid || pid <= 0)
        return;
    const signal = options.signal || "SIGTERM";
    if (process.platform === "win32") {
        try {
            spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
                stdio: "ignore",
                timeout: 5000,
                windowsHide: true,
            });
        }
        catch {
            // best-effort
        }
        return;
    }
    const kill = (target, killSignal) => {
        try {
            process.kill(target, killSignal);
        }
        catch {
            // ignore
        }
    };
    kill(-pid, signal);
    kill(pid, signal);
    if (options.force) {
        kill(-pid, "SIGKILL");
        kill(pid, "SIGKILL");
    }
}
/** How long a stopped turn gets to settle after interrupt() before close. */
export function stopGraceMs() {
    const raw = Number(process.env.OPENCODE_CLAUDE_STOP_GRACE_MS);
    return Number.isFinite(raw) && raw >= 0 ? raw : 2_000;
}
/**
 * Give a query handle a graceful stop().
 *
 * close() kills the CLI at once: a turn parked on a tool call dies with its
 * tool_use unanswered, and a turn killed before its first write leaves a
 * session id the CLI never saved. stop() first sends the SDK interrupt, so
 * the CLI aborts the turn itself and records it ("[Request interrupted by
 * user for tool use]"), reads the stream until the turn's result (nobody
 * else reads a parked turn), and closes after that or after the grace.
 *
 * The stream is wrapped once; its iterator is shared, so events read by
 * stop() and by the proxy's consumer all pass the onEvent listeners.
 */
export function withGracefulStop(handle) {
    if (typeof handle.stop === "function" && typeof handle.onEvent === "function") {
        return handle;
    }
    const inner = handle.stream[Symbol.asyncIterator]();
    const listeners = [];
    let ended = false;
    let sawResult = false;
    const observe = (event) => {
        if (event && typeof event === "object" && event.type === "result") {
            sawResult = true;
        }
        for (const listener of listeners) {
            try {
                listener(event);
            }
            catch {
                // a listener must never break the stream
            }
        }
    };
    const tap = {
        async next() {
            try {
                const next = await inner.next();
                if (next.done)
                    ended = true;
                else
                    observe(next.value);
                return next;
            }
            catch (error) {
                ended = true;
                throw error;
            }
        },
        async return(value) {
            ended = true;
            if (typeof inner.return === "function")
                return inner.return(value);
            return { done: true, value: undefined };
        },
        [Symbol.asyncIterator]() {
            return tap;
        },
    };
    let closed = false;
    const close = () => {
        if (closed)
            return;
        closed = true;
        handle.close();
    };
    let stopping = null;
    const stop = (graceMs = stopGraceMs()) => {
        if (stopping)
            return stopping;
        stopping = (async () => {
            if (!closed && !ended && graceMs > 0) {
                const settle = (async () => {
                    try {
                        await handle.interrupt();
                    }
                    catch {
                        // process already gone; nothing to settle
                        return;
                    }
                    while (!ended && !sawResult && !closed) {
                        try {
                            if ((await tap.next()).done)
                                break;
                        }
                        catch {
                            break;
                        }
                    }
                })();
                let timer;
                await Promise.race([
                    settle,
                    new Promise((resolve) => {
                        timer = setTimeout(resolve, graceMs);
                        timer.unref?.();
                    }),
                ]);
                if (timer)
                    clearTimeout(timer);
            }
            close();
        })();
        return stopping;
    };
    return {
        stream: tap,
        interrupt: handle.interrupt,
        close,
        getPid: handle.getPid,
        stop,
        onEvent: (listener) => {
            listeners.push(listener);
        },
    };
}
export async function startClaudeQuery(params) {
    const sdk = await loadClaudeAgentSdk();
    const queryFn = typeof params.queryImpl === "function"
        ? params.queryImpl(sdk)
        : sdk.query;
    if (typeof queryFn !== "function") {
        const error = new Error("Claude Agent SDK query() is unavailable");
        error.code = "CLAUDE_SDK_UNAVAILABLE";
        error.statusCode = 503;
        throw error;
    }
    const env = buildClaudeCodeChildEnv(params.env || process.env);
    const cwd = assertClaudeWorkingDirectory(params.cwd);
    const pathToClaudeCodeExecutable = trimmedString(params.pathToClaudeCodeExecutable) ||
        (await resolveClaudeCodeExecutable({ env })) ||
        undefined;
    const options = {
        cwd,
        env,
        includePartialMessages: params.includePartialMessages !== false,
        settingSources: Array.isArray(params.settingSources)
            ? params.settingSources
            : ["user", "project", "local"],
    };
    if (pathToClaudeCodeExecutable) {
        options.pathToClaudeCodeExecutable = pathToClaudeCodeExecutable;
        if (isJsEntrypoint(pathToClaudeCodeExecutable))
            options.executable = "node";
    }
    const model = trimmedString(params.model);
    if (model)
        options.model = model;
    const resume = trimmedString(params.resume);
    if (resume) {
        options.resume = resume;
        const resumeAt = trimmedString(params.resumeSessionAt);
        if (resumeAt)
            options.resumeSessionAt = resumeAt;
        if (params.forkSession === true)
            options.forkSession = true;
    }
    const permissionMode = trimmedString(params.permissionMode);
    if (ALLOWED_PERMISSION_MODES.has(permissionMode)) {
        options.permissionMode = permissionMode;
    }
    if (params.allowDangerouslySkipPermissions === true &&
        permissionMode === "bypassPermissions") {
        options.allowDangerouslySkipPermissions = true;
    }
    const effort = trimmedString(params.effort);
    if (isClaudeEffort(effort))
        options.effort = effort;
    if (params.thinking) {
        options.thinking = params.thinking;
    }
    else if (isClaudeEffort(effort)) {
        // Effort guides adaptive thinking depth on models that support it.
        options.thinking = { type: "adaptive" };
    }
    if (params.autoCompactEnabled !== false) {
        options.autoCompactEnabled = true;
    }
    if (params.persistSession === false)
        options.persistSession = false;
    const settings = {};
    if (params.isolateMcp === true) {
        options.strictMcpConfig = true;
        settings.disableClaudeAiConnectors = true;
    }
    // Without these the CLI streams thinking blocks empty: the UI shows nothing
    // for as long as Claude thinks (tens of seconds), then the answer lands at
    // once. Summaries stream the reasoning as it happens (same as t3code).
    if (options.thinking?.type !== "disabled") {
        settings.showThinkingSummaries = true;
        options.extraArgs = { "thinking-display": "summarized" };
    }
    // The SDK's opt-in: without it the CLI reports fast mode off with
    // `sdk_opt_in_required`, whatever the user picked in Claude Code.
    if (params.fastMode === true)
        settings.fastMode = true;
    if (Object.keys(settings).length > 0)
        options.settings = settings;
    if (Number.isInteger(params.maxTurns) && Number(params.maxTurns) > 0) {
        options.maxTurns = params.maxTurns;
    }
    if (typeof params.canUseTool === "function") {
        options.canUseTool = params.canUseTool;
    }
    const customSystemPrompt = trimmedString(params.systemPrompt);
    const presetSystemPrompt = typeof params.systemPrompt === "string"
        ? null
        : nonEmptyRecord(params.systemPrompt);
    if (customSystemPrompt) {
        options.systemPrompt = customSystemPrompt;
    }
    else if (presetSystemPrompt?.type === "preset" &&
        presetSystemPrompt.preset === "claude_code") {
        const systemPrompt = { type: "preset", preset: "claude_code" };
        const append = trimmedString(presetSystemPrompt.append);
        if (append)
            systemPrompt.append = append;
        if (presetSystemPrompt.excludeDynamicSections === true) {
            systemPrompt.excludeDynamicSections = true;
        }
        options.systemPrompt = systemPrompt;
    }
    else {
        options.systemPrompt = { type: "preset", preset: "claude_code" };
    }
    if (nonEmptyRecord(params.mcpServers))
        options.mcpServers = params.mcpServers;
    if (nonEmptyRecord(params.agents))
        options.agents = params.agents;
    const mainAgent = trimmedString(params.agent);
    if (mainAgent)
        options.agent = mainAgent;
    if (Array.isArray(params.allowedTools) && params.allowedTools.length > 0) {
        options.allowedTools = params.allowedTools.filter((tool) => typeof tool === "string" && tool.trim());
    }
    if (Array.isArray(params.disallowedTools) && params.disallowedTools.length > 0) {
        options.disallowedTools = params.disallowedTools.filter((tool) => typeof tool === "string" && tool.trim());
    }
    if (params.tools !== undefined) {
        options.tools = params.tools;
    }
    if (nonEmptyRecord(params.toolAliases)) {
        options.toolAliases = params.toolAliases;
    }
    if (params.skills === "all" || Array.isArray(params.skills)) {
        options.skills = params.skills;
    }
    else if (params.skills === undefined) {
        options.skills = "all";
    }
    log.info("[opencode-claude] starting Claude Agent SDK query", {
        model: options.model,
        effort: options.effort,
        resume: Boolean(resume),
        cwd,
    });
    let result;
    try {
        result = queryFn({
            prompt: params.prompt,
            options,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/spawn.*ENOTDIR/i.test(message)) {
            const wrapped = new Error("Claude Code executable path is not spawnable (ENOTDIR).");
            wrapped.code = "CLAUDE_SPAWN_ENOTDIR";
            wrapped.statusCode = 503;
            wrapped.cause = error;
            throw wrapped;
        }
        throw error;
    }
    let closed = false;
    const getPid = () => result && typeof result === "object" && "pid" in result
        ? result.pid
        : null;
    // Query.interrupt() is a control request: it rejects once the process is
    // gone, which callers treat as "nothing left to interrupt".
    const interrupt = async () => {
        if (result && typeof result.interrupt === "function") {
            await result.interrupt();
        }
    };
    const close = () => {
        if (closed)
            return;
        closed = true;
        killProcessTree(getPid(), { signal: "SIGTERM", force: true });
        // The SDK Query exposes no pid, so the tree-kill above is a no-op for it;
        // Query.close() is what actually ends the CLI subprocess. A parked turn
        // is not being iterated, and return() alone leaves its child running.
        if (result && typeof result.close === "function") {
            try {
                result.close();
            }
            catch {
                // already torn down
            }
        }
        if (result && typeof result.return === "function") {
            try {
                Promise.resolve(result.return()).catch(() => { });
            }
            catch {
                // ignore
            }
        }
    };
    return withGracefulStop({
        stream: result,
        interrupt,
        close,
        getPid,
    });
}
/**
 * Ask the local CLI which models this account can use. Starts a Claude Code
 * process with no prompt: no model call is made and nothing is persisted.
 */
export async function listClaudeSupportedModels(timeoutMs = 20_000) {
    const sdk = await loadClaudeAgentSdk();
    const queryFn = sdk.query;
    if (typeof queryFn !== "function")
        return null;
    let release = () => { };
    const idle = (async function* () {
        await new Promise((resolve) => {
            release = resolve;
        });
    })();
    const env = buildClaudeCodeChildEnv(process.env);
    const pathToClaudeCodeExecutable = await resolveClaudeCodeExecutable({ env });
    const q = queryFn({
        prompt: idle,
        options: {
            env,
            persistSession: false,
            settingSources: [],
            strictMcpConfig: true,
            settings: { disableClaudeAiConnectors: true },
            ...(pathToClaudeCodeExecutable ? { pathToClaudeCodeExecutable } : {}),
            ...(pathToClaudeCodeExecutable && isJsEntrypoint(pathToClaudeCodeExecutable)
                ? { executable: "node" }
                : {}),
        },
    });
    let timer;
    try {
        if (typeof q.supportedModels !== "function")
            return null;
        return await Promise.race([
            q.supportedModels(),
            new Promise((resolve) => {
                timer = setTimeout(() => resolve(null), timeoutMs);
            }),
        ]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
        release();
        q.close?.();
    }
}
