/**
 * Convert Claude Agent SDK result usage into OpenAI-compatible usage objects.
 *
 * Prefer `modelUsage` for totals (includes compact / auxiliary pipeline calls).
 * Fall back to per-turn `usage` (main agent loop only).
 */
export type OpenAIUsage = {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
        cached_tokens?: number;
        cache_write_tokens?: number;
    };
    completion_tokens_details?: {
        reasoning_tokens?: number;
    };
    /** Estimated USD from the Agent SDK (not a billing statement). */
    cost_usd?: number;
    /** Per-model breakdown when the SDK provides modelUsage. */
    model_usage?: Record<string, {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens: number;
        cache_creation_input_tokens: number;
        cost_usd: number;
        context_window?: number;
    }>;
};
/**
 * Extract OpenAI-compatible usage from an Agent SDK `result` event.
 */
export declare function usageFromSdkResult(event: unknown): OpenAIUsage | null;
/**
 * Extract per-API-call usage from an Agent SDK `assistant` event
 * (`message.usage`). Each assistant event carries the usage of exactly one
 * Anthropic API call — including parked (tool-call) turns, where no `result`
 * event exists yet because the query is still alive.
 */
export declare function usageFromAssistantEvent(event: unknown): OpenAIUsage | null;
/**
 * Accumulate per-call usage deltas into a per-response total.
 */
export declare function addOpenAIUsage(acc: OpenAIUsage | null, delta: OpenAIUsage): OpenAIUsage;
/** Stream-event usage (message_start / message_delta) as OpenAI usage. */
export declare function usageFromAnthropic(usage: unknown): OpenAIUsage | null;
/**
 * Per-HTTP-response usage, one entry per Anthropic API call. The SDK reports
 * a call's usage several times: the assistant events carry the message_start
 * snapshot (output_tokens ≈ 1-4) and only message_delta has the final
 * output. Keeping the max per message id makes the final numbers win.
 *
 * `reported` spans continuations of one bridge and holds what each call has
 * already been reported as. A park can hand off before a call's
 * message_delta arrives; the resumed response then sees that delta and
 * reports only the growth over the earlier snapshot, so nothing is counted
 * twice and the final output tokens are not lost.
 *
 * Output tokens add up over the calls of a response. Prompt tokens don't:
 * OpenCode reads them as the size of the context, and compacts when they
 * reach the model's input limit, so they are the last call's prompt (the
 * context as it stands), not the sum of every call's prompt.
 */
export declare class TurnUsageTracker {
    private readonly reported;
    private readonly byId;
    private anonymous;
    constructor(reported: Map<string, OpenAIUsage>);
    add(usage: OpenAIUsage, messageId: string | null): void;
    total(): OpenAIUsage | null;
}
/** Count a replayed SDK assistant message only once across tool continuations. */
export declare function addUniqueAssistantUsage(acc: OpenAIUsage | null, delta: OpenAIUsage, messageId: string | null, seen: Set<string>): OpenAIUsage | null;
/**
 * Combine the per-response accumulated usage (one entry per Anthropic API
 * call seen during this HTTP response) with the SDK `result` snapshot.
 *
 * The accumulated value is the correct per-response accounting; the result
 * snapshot is cumulative for the whole Claude query (all prior turns of a
 * resumed/continued session included) and would double-count. It is only a
 * fallback for turns where no assistant events were observed, plus a donor
 * for cost/model breakdown metadata.
 */
export declare function resolveTurnUsage(accumulated: OpenAIUsage | null, result: OpenAIUsage | null): OpenAIUsage | null;
export declare function formatCompactNote(meta: unknown): string;
