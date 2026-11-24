/**
 * Parked Claude Agent SDK turns waiting for OpenCode tool results
 * (Cursor bridge-pool pattern).
 */
import { type StoppableClaudeQueryHandle } from "./query.js";
import type { McpToolResultContent, TurnInput } from "./prompt.js";
import type { OpenAIUsage } from "./usage.js";
export type ParkedToolCall = {
    id: string;
    name: string;
    arguments: string;
    resolve: (result: McpToolResultContent[]) => void;
    reject: (error: Error) => void;
};
export type ParkedBridge = {
    id: string;
    conversationKey: string;
    /** Request kind of the turn (title, summary, generate), null for chat. */
    metaKind?: string | null;
    handle: StoppableClaudeQueryHandle;
    pendingTools: Map<string, ParkedToolCall>;
    /**
     * Usage already reported to OpenCode per SDK assistant message, so a
     * continuation reports only what a call grew by since the last response.
     */
    reportedUsage: Map<string, OpenAIUsage>;
    /** Keys of mid-turn user messages already attached to a tool result. */
    forwardedSteering: Set<string>;
    createdAt: number;
    /** Open input of a chat turn: mid-turn user messages go in here. */
    input?: TurnInput;
    /** Continues consuming the SDK stream after tools resolve. */
    continueStream?: () => AsyncGenerator<unknown, void, unknown>;
    /** Claude Code config directory of a project mapped to another account. */
    configDir?: string;
};
/**
 * Turns live in the process, not in a copy of this module. OpenCode reloads
 * a plugin by importing a fresh copy and unloading the old one, and loads
 * one copy per location; a parked turn must survive that and be resumed by
 * whichever copy receives its tool results.
 */
type BridgeRuntime = {
    bridges: Map<string, ParkedBridge>;
    stopping: Map<string, Set<Promise<void>>>;
    /** Plugin instances holding the proxy, across every copy of the module. */
    holders: number;
    /** Stop of every turn scheduled after the last instance released. */
    shutdownTimer?: ReturnType<typeof setTimeout>;
};
export declare const bridgeRuntime: BridgeRuntime;
export declare function putBridge(bridge: ParkedBridge): void;
export declare function getBridge(id: string): ParkedBridge | undefined;
export declare function findBridgeByConversation(conversationKey: string): ParkedBridge | undefined;
export declare function findBridgeByPendingTool(toolCallId: string): ParkedBridge | undefined;
/**
 * Close a bridge whose turn is already over (its stream ended or failed):
 * nothing is left to settle, so the process is closed at once.
 */
export declare function deleteBridge(id: string): void;
/**
 * Stop a turn that may still be running or parked: interrupt it, give the
 * CLI a moment to record the interruption, then close it. The bridge leaves
 * the pool at once, so no request resumes it meanwhile. Pending tool calls
 * are rejected only after the interrupt: rejecting first would hand the CLI
 * an error result it answers with another model call.
 */
export declare function stopBridge(id: string, reason?: string): Promise<void>;
/**
 * Stop every turn of a conversation, including stops already running in the
 * background, and wait until their processes close. Returns how many turns
 * were still in the pool.
 */
export declare function stopConversationBridges(conversationKey: string, reason?: string): Promise<number>;
/**
 * The OpenCode session stopped (user abort, shutdown, supersede) while its
 * turn was parked on tool calls: nothing will resume it, so stop the turn
 * and its claude process now instead of waiting for the TTL reaper. Returns
 * how many turns are being stopped; the stop itself runs in the background.
 */
export declare function closeSessionBridges(sessionId: string): number;
/** Stop every turn (proxy shutdown); resolves once all processes closed. */
export declare function clearAllBridges(): Promise<void>;
export {};
