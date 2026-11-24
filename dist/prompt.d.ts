export type AnthropicContentBlock = {
    type: "text";
    text: string;
} | {
    type: "image";
    source: {
        type: "base64";
        media_type: string;
        data: string;
    } | {
        type: "url";
        url: string;
    };
} | {
    type: "document";
    source: {
        type: "base64";
        media_type: string;
        data: string;
    } | {
        type: "url";
        url: string;
    };
};
export type SdkUserPrompt = {
    type: "user";
    message: {
        role: "user";
        content: string | AnthropicContentBlock[];
    };
    parent_tool_use_id: null;
};
/**
 * Marker text of the synthetic user message OpenCode emits when it promotes
 * tool-result media for providers that cannot carry media in tool results
 * (every openai-compatible provider, including this one).
 */
export declare const SYNTHETIC_TOOL_MEDIA_PROMPT = "Attached media from tool result:";
/**
 * OpenCode 1.x labels promoted tool media with SYNTHETIC_TOOL_MEDIA_PROMPT.
 * OpenCode 2.x sends the media alone: a user message with no text right
 * after the tool results (openai-chat `flushAttachments`). Pass the previous
 * message so that shape is recognised too; a real user message always
 * carries text or follows something other than a tool result.
 */
export declare function isSyntheticToolMediaMessage(msg: {
    role?: string;
    content?: unknown;
}, previous?: {
    role?: string;
    content?: unknown;
}): boolean;
export declare function extractTextContent(content: unknown): string;
/**
 * One short hash per user message of a conversation, in order: the
 * conversation's shape as far as revert/edit detection needs it.
 *
 * Only user messages count. OpenCode may re-serialize assistant output
 * (steps split per tool call, reasoning dropped), but a user message is
 * sent the same way every time. Two kinds are skipped, because they are
 * not stable across requests: OpenCode's promoted tool media, and
 * <system-reminder> messages. Plan mode splices its reminder in before the
 * user's prompt when sending, but stores it after, so its position moves
 * between requests. Reminder blocks inside other messages are dropped too.
 * Attachments count by presence only; their encoding may change.
 */
export declare function userHistoryFingerprints(messages: Array<{
    role?: string;
    content?: unknown;
}>): string[];
/**
 * The part of a history after its first `count` fingerprinted user
 * messages, starting at the next one: what came after a turn boundary of
 * `count` user messages. Empty when the history holds no more than that.
 */
export declare function historyAfterUserCount<T extends {
    role?: string;
    content?: unknown;
}>(messages: T[], count: number): T[];
export declare function contentHasAttachments(content: unknown): boolean;
export declare function openaiContentToAnthropicBlocks(content: unknown): AnthropicContentBlock[];
export type McpToolResultContent = {
    type: "text";
    text: string;
} | {
    type: "image";
    data: string;
    mimeType: string;
} | {
    type: "resource";
    resource: {
        uri: string;
        mimeType: string;
        blob: string;
    };
};
/**
 * Convert OpenAI-compatible tool result content into MCP result blocks.
 * OpenCode's read tool returns images and PDFs as file attachments on the
 * tool result; those must stay attached when the parked Claude SDK tool call
 * resumes. Base64 documents travel as MCP embedded `resource` blobs (Claude
 * Code saves them to disk and hands the model the path); URL-sourced media
 * cannot ride in an MCP result, so the model gets the URL as text instead of
 * a silent drop.
 */
export declare function openaiToolResultToMcpContent(content: unknown): McpToolResultContent[];
/**
 * OpenCode 2.x returns tool output as content parts, and the openai-compatible
 * request carries a tool message's content as a string, so the parts arrive
 * JSON-encoded: `[{"type":"text",...},{"type":"file","uri":"data:image/png;base64,...",
 * "mime":"image/png"}]`. Relayed as text, an image becomes kilobytes of base64
 * the model cannot see. Decode exactly that shape; any other string stays
 * the string it was.
 */
export declare function decodeToolMessageContent(content: unknown): unknown;
/**
 * Latest user turn (see `latestUserTurn`) as a Claude Agent SDK prompt,
 * string when text-only. Queued messages are combined in order: texts are
 * separated by a blank line, attachments keep their position.
 */
export declare function latestUserPrompt(messages: Array<{
    role?: string;
    content?: unknown;
}>): string | SdkUserPrompt;
/**
 * Steering: user messages OpenCode queued while a bridged tool was running
 * arrive after the tool results in the resume request. A parked bridge only
 * consumes tool results, so without this they were silently dropped (and
 * OpenCode then treats them as answered). Returns the content of the real
 * user messages after the last tool result; empty when there are none.
 */
export declare function collectSteering(messages: Array<{
    role?: string;
    content?: unknown;
}>): McpToolResultContent[];
/**
 * Steering messages one by one, each with a `key` that identifies it across
 * resume requests: its content plus how many earlier user messages carry the
 * same content. A raw index would not do, because tool results of a split
 * park get inserted before the queued message in later requests.
 */
export declare function collectSteeringMessages(messages: Array<{
    role?: string;
    content?: unknown;
}>): Array<{
    key: string;
    blocks: McpToolResultContent[];
    prompt: string | AnthropicContentBlock[];
}>;
/** Append steering to a tool result so Claude reads it on resume. */
export declare function withSteering(result: McpToolResultContent[], steering: McpToolResultContent[]): McpToolResultContent[];
type ToolStepMessage = {
    role?: string;
    content?: unknown;
    tool_calls?: Array<{
        id?: string;
        function?: {
            name?: string;
            arguments?: string;
        };
    }>;
    tool_call_id?: string;
    name?: string;
};
/**
 * Index of the last assistant message when it called tools and at least one
 * of those calls has its result after it: a tool step OpenCode answered.
 * Null when the last assistant message is a plain reply (a normal new turn).
 */
export declare function answeredToolStepIndex(messages: ToolStepMessage[]): number | null;
/**
 * Prompt for tool results no parked turn waits for (proxy restart, cancelled
 * or reaped park, superseded turn). The Claude process that made the calls
 * is gone, so the turn is rebuilt: the history before the step is transferred
 * as usual, and this prompt carries the step itself: the calls, their full
 * results with media, and any user messages sent after them.
 */
export declare function answeredToolStepPrompt(messages: ToolStepMessage[], assistantIndex: number, options?: {
    otherModel?: boolean;
}): SdkUserPrompt;
export declare function promptAsStream(prompt: string | SdkUserPrompt): AsyncGenerator<SdkUserPrompt, void, unknown>;
/**
 * Conversation-history transfer.
 *
 * The Agent SDK turn only receives the latest user turn; earlier context
 * comes from resuming the sticky Claude session. When no session can be
 * resumed (first claude-code turn after a model switch, lost store, deleted
 * session file), the proxy injects the serialized prior conversation instead
 * so Claude still sees the whole chat.
 */
export type ConversationHistoryMessage = {
    role?: string;
    content?: unknown;
    tool_calls?: Array<{
        id?: string;
        type?: string;
        function?: {
            name?: string;
            arguments?: string;
        };
    }>;
    tool_call_id?: string;
    name?: string;
};
export declare function historyMaxChars(): number;
/**
 * Messages before the latest user turn — the context Claude is missing. Ends
 * before the FIRST message of that turn: queued messages travel in the
 * prompt and must not repeat in the transcript.
 *
 * When the turn is a stand-in (the newest user message, with assistant or
 * tool output after it), that output is context too and would otherwise land
 * in neither transcript nor prompt. The prompt only repeats the user message,
 * so the transcript keeps everything in order, that message included.
 */
export declare function priorMessagesOf(messages: ConversationHistoryMessage[]): ConversationHistoryMessage[];
/**
 * Serialize prior conversation into a compact transcript, keeping the NEWEST
 * messages within the char budget (older turns are dropped first).
 */
export declare function buildConversationTranscript(messages: ConversationHistoryMessage[], maxChars?: number): string;
/**
 * Prepend a transferred-history block to a prompt. Text prompts get a plain
 * prefix; multimodal prompts get an extra leading text block so attachments
 * still reach Claude.
 *
 * `missed` marks a transcript of only the turns a resumed session never saw
 * (another model answered them, or they failed before Claude ran).
 */
export declare function withConversationContext(prompt: string | SdkUserPrompt, transcript: string, missed?: boolean): string | SdkUserPrompt;
/** Put a text block ahead of the prompt, keeping any image/PDF blocks. */
export declare function withLeadingText(prompt: string | SdkUserPrompt, text: string): string | SdkUserPrompt;
/**
 * What Claude is told about its host: stated plainly, once, in the appended
 * runtime note. The Claude Code system prompt itself is never replaced or
 * rewritten, and it already names the model.
 */
export declare function buildRuntimeInstructions(): string;
/**
 * Input of a chat turn that stays open while the turn runs, so a message the
 * user sends mid-turn reaches Claude as a user message (`priority: "next"`:
 * the CLI adds it after the running tool's result, as Claude Code does with a
 * message typed while a tool runs). Ends with the turn.
 */
export type TurnInput = {
    stream: AsyncGenerator<SdkUserPrompt, void, unknown>;
    /** Resolves once the SDK has taken the message for the CLI. */
    push(content: string | AnthropicContentBlock[]): Promise<void>;
    end(): void;
    ended(): boolean;
};
export declare function createTurnInput(first: string | SdkUserPrompt): TurnInput;
export {};
