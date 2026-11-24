export type ClaudeFailureKind = "auth" | "rate_limit" | "context_overflow" | "image" | "refusal" | "overloaded" | "billing" | "unknown";
export declare function classifyClaudeFailure(text: string): ClaudeFailureKind;
export declare function failureStatusFor(kind: ClaudeFailureKind): number;
export declare function failureTypeFor(kind: ClaudeFailureKind): string;
export declare function failureCodeFor(kind: ClaudeFailureKind): string;
/** Error text without the CLI's internal diagnostic entries. */
export declare function withoutDiagnostics(text: string): string;
/**
 * Failure text of an SDK result event. Error results carry `errors` and
 * `terminal_reason`, not `result`; a success-typed result flagged is_error
 * carries its text in `result`.
 */
export declare function resultErrorText(event: Record<string, unknown>): string;
/**
 * Text of an error the SDK iterator threw. After an error result it throws
 * "Claude Code returned an error result: <errors joined>"; when those were
 * only diagnostics, null says there is nothing to add to what the result
 * event already reported.
 */
export declare function thrownErrorText(error: unknown): string | null;
/**
 * The CLI can end a turn as subtype "success" after its own API retries ran
 * out: no content, is_error false, and the last HTTP status only in
 * api_error_status (529 overloaded, or another 5xx). Returns the failure
 * text for such a result, null for a real success.
 */
export declare function overloadedResultText(event: Record<string, unknown>): string | null;
/**
 * Meta requests (title, compaction summary, generate) run with maxTurns 1.
 * Claude trying a second step there is not a limit the user can act on.
 */
export declare function metaFailureText(text: string, metaKind: string | null | undefined): string;
/** User-facing guidance appended to hard failures. */
export declare function failureHintFor(kind: ClaudeFailureKind): string;
