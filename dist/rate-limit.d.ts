export type ClaudeRateLimitState = {
    /** Hard limit confirmed by an error result — gates new turns. */
    limited: boolean;
    /** Do not start new turns until this epoch ms (resetsAt or fallback). */
    limitedUntil?: number;
    /** Last SDK rate_limit_event status (allowed | allowed_warning | rejected…). */
    status?: string;
    /** e.g. "five_hour". */
    rateLimitType?: string;
    /** 0..1 when the SDK reports it. */
    utilization?: number;
    /** Epoch ms when the limited window resets (from SDK or parsed text). */
    resetsAt?: number;
    /** Last human-readable limit message. */
    message?: string;
    /** Overage pool disabled at org level (from SDK event). */
    overageDisabled?: boolean;
    updatedAt: number;
};
/**
 * Record a structured SDK `rate_limit_event` payload. Never sets `limited`
 * on its own — the SDK reports "rejected" for turns that still complete
 * (overage pool rejection); only a hard error result confirms the limit.
 */
export declare function recordRateLimitInfo(info: unknown, configDir?: string): ClaudeRateLimitState | null;
/**
 * Match hard-limit error text from the Agent SDK / API. Claude Code words
 * subscription limits as "You've hit your session limit", "You've hit your
 * weekly limit", "You've reached your … limit"; raw API throttling surfaces as
 * `API Error: 429 {"error":{"type":"rate_limit_error",…}}`. A bare "429"
 * elsewhere (a line number, a byte count) is not enough, so the status only
 * counts when it follows the "API Error:" prefix.
 */
export declare function isClaudeRateLimitText(text: string): boolean;
/**
 * Parse a reset hint into epoch ms. Returns undefined when no reset hint is
 * present. Claude Code formats reset times (`resets ${time} (${zone})`) as:
 * - within 24h: "1:10am (Europe/Kyiv)", "5pm (UTC)";
 * - further out: "Oct 6, 1pm (UTC)", "Oct 6, 1:30pm (America/New_York)";
 * - in another year: "Jan 2, 2027, 1pm (UTC)";
 * plus ISO "reset at 2026-08-09T01:10:00" / "resets 2026-10-06 13:00 UTC".
 */
export declare function parseResetTimeFromText(text: string, now?: number): number | undefined;
/**
 * Record a hard-limit error message. Returns the updated state, or null when
 * the text is not a limit error.
 *
 * Block deadline, in order: the reset parsed from the text; the resetsAt of a
 * recent `rejected` rate_limit_event (the SDK emits it right before the
 * failing result); an already-active confirmed block; else a short fallback.
 * The stored resetsAt of any other event (e.g. an `allowed` seven_day window
 * days away) describes an unrelated window and never becomes the deadline.
 */
export declare function recordRateLimitErrorText(text: string, configDir?: string): ClaudeRateLimitState | null;
/** Strip wrapper prefixes so duplicate error emissions compare equal. */
export declare function normalizeClaudeErrorText(text: string): string;
export declare function formatResetCountdown(ms: number): string;
export type RateLimitSnapshot = {
    limited: boolean;
    limitedUntil?: number;
    resetsAt?: number;
    resetsAtISO?: string;
    resetInSeconds?: number;
    status?: string;
    rateLimitType?: string;
    utilization?: number;
    overageDisabled?: boolean;
    message?: string;
    updatedAt?: number;
};
/** Current snapshot; auto-clears an expired hard block (self-healing). */
export declare function getRateLimitSnapshot(now?: number, configDir?: string): RateLimitSnapshot;
export type RateLimitGate = {
    blocked: false;
} | {
    blocked: true;
    retryAfterSeconds: number;
    resetsAt?: number;
    message: string;
};
/**
 * Gate for new Agent SDK turns. Only a confirmed hard limit blocks, and only
 * until the known/estimated reset. OPENCODE_CLAUDE_RATE_LIMIT_FAST_FAIL=0
 * disables the gate entirely.
 */
export declare function rateLimitGate(now?: number, configDir?: string): RateLimitGate;
/**
 * Build a short user-facing note for a structured event, but only when the
 * situation meaningfully changed (status change, or utilization crossing
 * 0.9 / 0.95 / 0.99). Returns null when nothing new is worth surfacing.
 *
 * `fresh` is the raw `rate_limit_info` payload of the event that triggered
 * the call. When provided it is authoritative: the note decision and text
 * use ONLY the event's own status/utilization, never merged store history —
 * a stale utilization from an earlier event or an earlier limit window must
 * not resurrect a "99% of window used" warning on a healthy "allowed" event.
 */
export declare function maybeRateLimitNote(state: ClaudeRateLimitState | null, fresh?: Record<string, unknown>): string | null;
/** Test helper: reset process-local note dedupe. */
export declare function __resetRateLimitNoteDedupe(): void;
