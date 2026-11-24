type MessageLike = {
    role?: string;
    content?: unknown;
};
/**
 * OpenCode's instruction files that Claude Code doesn't load itself (the
 * global ~/.config/opencode/AGENTS.md, configured `instructions`) as
 * "Instructions from: <path>" blocks, the way OpenCode renders them.
 * A file is read from disk and forwarded only when its text is in OpenCode's
 * prompt, so it is exactly what OpenCode loaded. Files Claude Code already
 * reads as CLAUDE.md (the same file through a symlink or an `@path` import,
 * or the same text) are skipped so the rules don't arrive twice.
 */
export declare function openCodeInstructionFiles(messages: MessageLike[], cwd: string, configDir?: string): string;
/** OpenCode's `<mcp_instructions>` block: what MCP servers say about their tools. */
export declare function mcpInstructions(messages: MessageLike[]): string;
/**
 * Session context entries a host attached through OpenCode's session
 * instructions API (OpenChamber's guidance, pinned notes, memory, checkout),
 * as OpenCode renders them into its system prompt: `<context key="…">`
 * blocks. Only their values as of the session start (or its last compaction)
 * sit there. Later changes reach the proxy as `<system-update>` user text,
 * which Claude already gets with the next prompt.
 */
export declare function sessionContextBlocks(messages: MessageLike[]): string;
export {};
