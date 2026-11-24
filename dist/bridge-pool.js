/**
 * Parked Claude Agent SDK turns waiting for OpenCode tool results
 * (Cursor bridge-pool pattern).
 */
import { withGracefulStop } from "./query.js";
const RUNTIME_KEY = Symbol.for("@openchamber/opencode-claude/bridge-runtime/v1");
export const bridgeRuntime = (globalThis[RUNTIME_KEY] ??= { bridges: new Map(), stopping: new Map(), holders: 0 });
const bridges = bridgeRuntime.bridges;
export function putBridge(bridge) {
    // One active bridge per conversation. Callers stop the previous turn
    // before starting a new one (stopConversationBridges); this only catches
    // a turn that slipped past that, and does not wait for it.
    for (const existing of [...bridges.values()]) {
        if (existing.conversationKey === bridge.conversationKey && existing.id !== bridge.id) {
            void stopBridge(existing.id, "Superseded by a newer turn");
        }
    }
    bridges.set(bridge.id, bridge);
}
export function getBridge(id) {
    return bridges.get(id);
}
export function findBridgeByConversation(conversationKey) {
    for (const bridge of bridges.values()) {
        if (bridge.conversationKey === conversationKey)
            return bridge;
    }
    return undefined;
}
export function findBridgeByPendingTool(toolCallId) {
    for (const bridge of bridges.values()) {
        if (bridge.pendingTools.has(toolCallId))
            return bridge;
    }
    return undefined;
}
function rejectPending(bridge, reason) {
    for (const tool of bridge.pendingTools.values()) {
        tool.reject(new Error(reason));
    }
    bridge.pendingTools.clear();
}
/**
 * Close a bridge whose turn is already over (its stream ended or failed):
 * nothing is left to settle, so the process is closed at once.
 */
export function deleteBridge(id) {
    const bridge = bridges.get(id);
    if (!bridge)
        return;
    bridges.delete(id);
    rejectPending(bridge, "Bridge closed");
    bridge.handle.close();
    bridge.input?.end();
}
/**
 * Stop a turn that may still be running or parked: interrupt it, give the
 * CLI a moment to record the interruption, then close it. The bridge leaves
 * the pool at once, so no request resumes it meanwhile. Pending tool calls
 * are rejected only after the interrupt: rejecting first would hand the CLI
 * an error result it answers with another model call.
 */
export function stopBridge(id, reason = "Bridge closed") {
    const bridge = bridges.get(id);
    if (!bridge)
        return Promise.resolve();
    bridges.delete(id);
    const key = bridge.conversationKey;
    const stop = (async () => {
        try {
            await withGracefulStop(bridge.handle).stop();
        }
        finally {
            rejectPending(bridge, reason);
            bridge.input?.end();
        }
    })();
    // Out of the pool but not closed yet: a new turn must still wait for it.
    let pending = stopping.get(key);
    if (!pending)
        stopping.set(key, (pending = new Set()));
    pending.add(stop);
    void stop.finally(() => {
        pending.delete(stop);
        if (pending.size === 0 && stopping.get(key) === pending)
            stopping.delete(key);
    });
    return stop;
}
/** Stops started for a conversation that have not closed their process yet. */
const stopping = bridgeRuntime.stopping;
/**
 * Stop every turn of a conversation, including stops already running in the
 * background, and wait until their processes close. Returns how many turns
 * were still in the pool.
 */
export async function stopConversationBridges(conversationKey, reason) {
    const ids = [...bridges.values()]
        .filter((bridge) => bridge.conversationKey === conversationKey)
        .map((bridge) => bridge.id);
    const started = ids.map((id) => stopBridge(id, reason));
    await Promise.all([...started, ...(stopping.get(conversationKey) ?? [])]);
    return ids.length;
}
/**
 * The OpenCode session stopped (user abort, shutdown, supersede) while its
 * turn was parked on tool calls: nothing will resume it, so stop the turn
 * and its claude process now instead of waiting for the TTL reaper. Returns
 * how many turns are being stopped; the stop itself runs in the background.
 */
export function closeSessionBridges(sessionId) {
    let closed = 0;
    for (const bridge of [...bridges.values()]) {
        if (bridge.conversationKey === sessionId) {
            void stopBridge(bridge.id);
            closed += 1;
        }
    }
    return closed;
}
/** Stop every turn (proxy shutdown); resolves once all processes closed. */
export async function clearAllBridges() {
    await Promise.all([...bridges.keys()].map((id) => stopBridge(id)));
}
