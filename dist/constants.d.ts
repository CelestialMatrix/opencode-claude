export declare const PROVIDER_ID = "claude-code";
export declare const DEFAULT_MODEL_ID = "sonnet";
export declare const OPENAI_COMPATIBLE_PACKAGE = "@opencode/ai/providers/openai-compatible";
export declare const EFFORT_HEADER = "x-opencode-claude-effort";
export declare const SESSION_HEADER = "x-opencode-claude-session";
/** OpenCode request kind: primary, compaction, title or generate. */
export declare const KIND_HEADER = "x-opencode-claude-kind";
/** Active OpenCode project directory forwarded to the local Agent SDK proxy, URI-encoded. */
export declare const DIRECTORY_HEADER = "x-opencode-claude-directory";
/** Claude Code config directory mapped to that project (`configDirs` option), URI-encoded. */
export declare const CONFIG_DIR_HEADER = "x-opencode-claude-config-dir";
export declare const EFFORT_LEVELS: readonly ["low", "medium", "high", "xhigh", "max"];
export type ClaudeEffort = (typeof EFFORT_LEVELS)[number];
export declare function isClaudeEffort(value: unknown): value is ClaudeEffort;
