/**
 * `generate` is a stateless one-shot generation (OpenCode's
 * /api/experimental/generate): no session, no tools, no user context.
 */
export type MetaRequestKind = "title" | "summary" | "generate" | null;
type MessageLike = {
    role?: string;
    content?: unknown;
};
export declare function metaSystemPrompt(messages: MessageLike[]): string;
export declare function isTitleGenerationRequest(messages: MessageLike[]): boolean;
export declare function isSummaryGenerationRequest(messages: MessageLike[]): boolean;
export declare function detectMetaRequestKind(messages: MessageLike[]): MetaRequestKind;
/** Namespace so meta requests never collide with live agent session state. */
export declare function requestKeyNamespace(kind: MetaRequestKind): string;
/**
 * OpenCode 2.x reaches some tools (MCP servers, OpenChamber's own tools) only
 * through its `execute` tool, and lists them in a "# Code Mode" section of its
 * system prompt. That prompt is not forwarded, so this one section is: it is
 * the tool catalog, not host identity. Later catalog changes arrive as
 * ordinary messages and pass through already.
 */
export declare function codeModeCatalog(messages: MessageLike[]): string;
/**
 * OpenCode lists its skills only in the system prompt, which the plugin
 * otherwise doesn't forward. Without the list Claude has the skill tool but
 * no ids to pass it. Returns the skills block as OpenCode rendered it
 * (skill/instructions.ts): its intro through `</available_skills>`, or
 * through the "no skills" line.
 */
export declare function skillsCatalog(messages: MessageLike[]): string;
/**
 * The prompt of a custom OpenCode agent (writer, a reviewer persona, ...).
 * OpenCode puts the agent's own prompt first, in place of its stock one,
 * and its identity plugin follows with "# Your Model". Everything before
 * that heading is the agent's prompt, unless it is one of OpenCode's stock
 * prompts (build, plan), which Claude doesn't need: Claude Code brings its
 * own. Without the heading the layout is unknown, so nothing is returned.
 */
export declare function customAgentPrompt(messages: MessageLike[]): string;
export {};
