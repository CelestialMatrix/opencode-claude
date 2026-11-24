import { type ClaudeEffort } from "./constants.js";
type SdkModule = typeof import("@anthropic-ai/claude-agent-sdk");
export declare function loadClaudeAgentSdk(): Promise<SdkModule>;
/**
 * Copy a Claude session's chain up to `upToMessageId` into a new session
 * (fresh uuids, no side branches) and return the new id. A plain resume of
 * the copy sees exactly that history, wherever other branches went.
 */
export declare function forkClaudeSession(sessionId: string, upToMessageId: string): Promise<string>;
export declare function resetClaudeAgentSdkCache(): void;
export declare function probeClaudeAgentSdk(): Promise<{
    available: boolean;
    error?: string;
}>;
export declare function killProcessTree(pid: number | null | undefined, options?: {
    signal?: NodeJS.Signals;
    force?: boolean;
}): void;
export type ClaudeQueryHandle = {
    stream: AsyncIterable<unknown>;
    interrupt: () => Promise<void>;
    close: () => void;
    getPid: () => number | null | undefined;
    /**
     * Stop the turn the way Claude Code's own Esc does: interrupt, let the CLI
     * write the interruption to the transcript, then close. Resolves once the
     * process is closed. Added by withGracefulStop when missing.
     */
    stop?: (graceMs?: number) => Promise<void>;
    /** Observe every event the stream yields, including ones read by stop(). */
    onEvent?: (listener: (event: unknown) => void) => void;
};
export type StoppableClaudeQueryHandle = ClaudeQueryHandle & {
    stop: (graceMs?: number) => Promise<void>;
    onEvent: (listener: (event: unknown) => void) => void;
};
/** How long a stopped turn gets to settle after interrupt() before close. */
export declare function stopGraceMs(): number;
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
export declare function withGracefulStop(handle: ClaudeQueryHandle): StoppableClaudeQueryHandle;
export type StartClaudeQueryParams = {
    prompt: string | AsyncIterable<unknown>;
    cwd: string;
    model?: string;
    resume?: string;
    /** With `resume`: resume only up to and including this entry. */
    resumeSessionAt?: string;
    /** With `resume`: continue in a new session id instead of appending. */
    forkSession?: boolean;
    permissionMode?: string;
    effort?: ClaudeEffort | string;
    /** Claude Code's fast mode (draws plan limits faster). */
    fastMode?: boolean;
    systemPrompt?: string | {
        type: "preset";
        preset: "claude_code";
        append?: string;
        /** Move cwd, memory path and git status out of the system prompt. */
        excludeDynamicSections?: boolean;
    };
    canUseTool?: (toolName: string, input: Record<string, unknown>, options: object) => Promise<object | null>;
    env?: Record<string, string | undefined>;
    includePartialMessages?: boolean;
    mcpServers?: Record<string, unknown>;
    agents?: Record<string, object>;
    agent?: string;
    allowedTools?: string[];
    /** Disable Claude built-in tools so OpenCode owns tool execution. */
    tools?: string[] | {
        type: string;
        [key: string]: unknown;
    };
    /** Redirect built-in tool names to OpenCode MCP tools. */
    toolAliases?: Record<string, string>;
    disallowedTools?: string[];
    skills?: string[] | "all";
    settingSources?: Array<"user" | "project" | "local">;
    pathToClaudeCodeExecutable?: string;
    /** Required when permissionMode is bypassPermissions. */
    allowDangerouslySkipPermissions?: boolean;
    /** Auto-compact long conversations (Claude Code default). */
    autoCompactEnabled?: boolean;
    /** Stop utility queries such as title generation after one model turn. */
    maxTurns?: number;
    /** false keeps one-shot utility turns out of ~/.claude/projects history. */
    persistSession?: boolean;
    /**
     * Isolate a one-shot turn from every MCP server the user configured,
     * including claude.ai cloud connectors, so none of their tool definitions
     * ride along.
     */
    isolateMcp?: boolean;
    /** Thinking config; defaults to adaptive when effort is set. */
    thinking?: {
        type: "adaptive";
    } | {
        type: "enabled";
        budgetTokens: number;
    } | {
        type: "disabled";
    };
    queryImpl?: (mod: SdkModule) => unknown;
};
export declare function startClaudeQuery(params: StartClaudeQueryParams): Promise<ClaudeQueryHandle>;
/**
 * Ask the local CLI which models this account can use. Starts a Claude Code
 * process with no prompt: no model call is made and nothing is persisted.
 */
export declare function listClaudeSupportedModels(timeoutMs?: number): Promise<unknown[] | null>;
export {};
