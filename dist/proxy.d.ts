import { type ParkedToolCall } from "./bridge-pool.js";
import { forkClaudeSession, startClaudeQuery } from "./query.js";
import { detectMetaRequestKind, type MetaRequestKind } from "./request-kind.js";
/**
 * How many calls the CLI starts together for a message whose tool_use
 * blocks are `names`: the leading run of readOnlyHint tools, or the first
 * call alone when it is not one of them.
 */
export declare function expectedParallelGroup(names: string[]): number;
/**
 * Bun.serve defaults to 10s and RSTs idle sockets. OpenCode maps that to a
 * retryable "Connection reset by server". This proxy holds the HTTP response
 * until the Claude turn proves alive, and SSE can pause during thinking —
 * both exceed 10s easily. 0 disables the timer (same as OpenCode's adapter).
 */
export declare const PROXY_IDLE_TIMEOUT_SECONDS = 0;
export declare const SSE_HEARTBEAT_MS = 5000;
type OpenAITool = {
    type?: string;
    function?: {
        name?: string;
        description?: string;
        parameters?: Record<string, unknown>;
    };
};
export declare function setClaudeQueryStarter(starter: typeof startClaudeQuery | null): void;
export declare function setClaudeSessionForker(forker: typeof forkClaudeSession | null): void;
export declare function getClaudeProxyBaseUrl(): string;
export declare function getProxyPort(): number | null;
export declare function startProxy(): Promise<number>;
export declare function acquireProxy(): Promise<number>;
export declare function releaseProxy(): Promise<void>;
export declare function proxyHolderCount(): number;
export declare function stopProxy(): Promise<void>;
/**
 * Binding to 127.0.0.1 keeps other machines out, but a web page open in the
 * user's browser can still reach loopback: a no-preflight POST (CSRF) or a
 * DNS-rebound hostname would spend the user's Claude subscription. OpenCode
 * calls the proxy server-side, so it never sends Origin and always uses a
 * loopback Host; anything else is refused.
 */
export declare function isTrustedLocalRequest(req: Request): boolean;
/**
 * Claude Code retried a refused request on another model and, for scope
 * "session", keeps using it. The plugin entry moves the OpenCode session to
 * that model so what OpenCode shows matches what Claude Code runs.
 */
type ModelFallbackHandler = (sessionId: string, modelId: string, variant?: string) => void;
export declare function setModelFallbackHandler(handler: ModelFallbackHandler | null): void;
/** Catalog id for the CLI's fallback model, keeping the 1M variant if picked. */
export declare function catalogIdForFallback(fallback: string, original: string): string;
export declare function modelFallbackNote(event: {
    original_model?: string;
    fallback_model?: string;
    api_refusal_category?: string | null;
}): string;
/**
 * OpenCode v2 names the request kind through the plugin's model.request hook.
 * Stateless generation (/api/experimental/generate) bypasses session hooks,
 * so a request with neither the kind nor the session header is one of those.
 * Text detection stays as the fallback for hooked requests.
 */
export declare function metaKindFromHeaders(kind: string | null, session: string | null): MetaRequestKind | undefined;
export declare function resolveMetaKind(kind: string | null, session: string | null, messages: Parameters<typeof detectMetaRequestKind>[0]): MetaRequestKind;
/**
 * Claude Code truncates MCP tool descriptions at this many characters: the
 * limit the child env sets, or the user's own override.
 */
export declare const CLAUDE_TOOL_DESCRIPTION_LIMIT: number;
/**
 * With enough guidance or subagents the appended list falls past Claude
 * Code's description cut, so Claude never learns which agents exist. Move
 * the list to the front: the cut then lands on the tail of the generic
 * guidance instead. Nothing is dropped here.
 */
export declare function fitToolDescription(description: string): string;
/** OpenCode tool parameters as an MCP-valid object schema. */
export declare function normalizeToolParameters(parameters: unknown): Record<string, unknown>;
/**
 * Claude sometimes sends a scalar or JSON argument as its string encoding
 * ("true", "300000", a JSON array). Claude Code's own tools accept that, so
 * decode a string for a parameter that cannot take one; anything that does
 * not decode to an accepted type is left for validation to reject.
 */
export declare function coerceStringArgument(value: unknown, schema: unknown): unknown;
export declare function buildOpenCodeMcpServer(tools: OpenAITool[], pendingTools: Map<string, ParkedToolCall>, onPark: () => void): Promise<Record<string, unknown> | undefined>;
/**
 * The CLI hit a retryable API error and retries on its own (up to
 * max_retries). error_status is null for connection errors.
 */
export declare function apiRetryNote(event: Record<string, unknown>): string;
/**
 * Claude refused and no fallback model retried the request. The CLI's
 * api_refusal_explanation is the API's own reason; `content` is its notice.
 */
export declare function refusalText(event: {
    api_refusal_explanation?: string | null;
    api_refusal_category?: string | null;
    content?: string;
}): string;
/**
 * OpenAI finish_reason for a response that ended without tool calls.
 * OpenCode treats "length" as a truncated answer and "content_filter" as a
 * blocked one; everything else is a normal stop.
 */
export declare function finishReasonFor(stopReason: string | null | undefined): string;
export {};
