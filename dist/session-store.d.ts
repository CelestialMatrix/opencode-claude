export type ClaudeSessionBinding = {
    conversationKey: string;
    foreignSessionId: string;
    modelId?: string;
    cwd?: string;
    /**
     * Last transcript entry this plugin saw on the conversation's main chain.
     * Another claude process writing to the same session file (a turn
     * orphaned by an OpenCode restart, closed by the TTL reaper an hour later)
     * can append a branch that a plain resume would follow; the resume then
     * goes through a fork cut here (see sessionChainAfterLeaf).
     */
    leafUuid?: string;
    /**
     * Where each OpenCode history this session answered ends in the Claude
     * transcript, oldest first. A revert or edit in OpenCode shortens the
     * history; the matching boundary says where to resume from.
     */
    turns?: TurnBoundary[];
    updatedAt: number;
};
/**
 * One point of a conversation: the OpenCode history held `count` user
 * messages (see userHistoryFingerprints), the last one hashing to `hash`,
 * and the main chain of Claude session `sessionId` ended at `leafUuid`.
 * Boundaries survive forks: an older one still points into the session
 * file it was recorded in. Boundaries stored before sessionId existed
 * belong to the binding's session (see setForeignSessionId).
 */
export type TurnBoundary = {
    count: number;
    hash: string;
    leafUuid?: string;
    sessionId?: string;
};
/** The history part of a boundary, without where it sits in Claude. */
type BoundaryKey = Pick<TurnBoundary, "count" | "hash">;
export declare function getForeignSessionId(conversationKey: string): string | undefined;
export declare function getSessionLeafUuid(conversationKey: string): string | undefined;
export declare function setForeignSessionId(conversationKey: string, foreignSessionId: string, meta?: {
    modelId?: string;
    cwd?: string;
    leafUuid?: string;
}): void;
export declare function getSessionTurns(conversationKey: string): TurnBoundary[];
/**
 * A turn starts for an OpenCode history of `boundary.count` user messages.
 * The history the same turn continues (a retry, a rebuilt tool step) keeps
 * its boundary; a new one is appended and follows the leaf from now on.
 * Without a binding yet, the boundary waits for the one the turn creates.
 *
 * `before` is the history before the turn's prompt. When an existing
 * binding has no boundaries yet, it is recorded first at the current leaf,
 * so a retry of this very request can go back to it.
 */
export declare function recordTurnStart(conversationKey: string, boundary: BoundaryKey, before?: BoundaryKey): void;
/**
 * OpenCode's history went back to boundary `index` (revert, edit): resume
 * from its leaf and forget the turns after it.
 */
export declare function rewindSessionTurns(conversationKey: string, index: number): void;
export type TurnHistoryMatch = {
    kind: "untracked";
} | {
    kind: "latest";
    count: number;
} | {
    kind: "rewind";
    index: number;
    leafUuid?: string;
    sessionId?: string;
} | {
    kind: "diverged";
};
/**
 * Compare the OpenCode history before a new prompt (as fingerprints) with
 * the boundaries a binding recorded.
 * - latest: the history still holds the newest boundary's user messages
 *   (more may follow: turns another model answered, the prompt of a turn
 *   that failed before Claude ran). Resume as usual; `count` is the
 *   boundary's size, so the caller can hand Claude what came after it.
 * - rewind: the history ends exactly at an earlier boundary, so the turns
 *   after it were reverted or edited away.
 * - diverged: nothing lines up; the session holds a history OpenCode no
 *   longer has.
 * - untracked: a binding from before boundaries were recorded.
 */
export declare function matchTurnHistory(turns: TurnBoundary[], prints: string[]): TurnHistoryMatch;
/**
 * Whether a Claude Code transcript still holds the entry with this uuid.
 * The entry is almost always the resume leaf, near the end of a file that
 * can reach tens of megabytes, so the file is read backwards in chunks and
 * the search stops at the first hit.
 */
export declare function sessionFileHasEntry(file: string, uuid: string, chunkBytes?: number): boolean;
export type LeafChainState = "clean" | "branched" | "missing";
/**
 * Whether everything written after `leafUuid` in a Claude Code transcript
 * continues from it. A plain resume follows the file's latest chain; when
 * another claude process appended a side branch after our leaf, that chain
 * may not be ours, and the CLI's resumeSessionAt only searches the chain it
 * picked. So:
 * - clean: every message after the leaf descends from it; a plain resume
 *   sees our history.
 * - branched: some message after the leaf hangs off another parent, or the
 *   CLI's last-prompt pointer after it names an entry outside our chain;
 *   resume must go through a fork cut at the leaf.
 * - missing: the leaf isn't in the file (or the file can't be read).
 *
 * Only the tail after the leaf is parsed; the file is read backwards in
 * chunks until the leaf's line is reached.
 */
export declare function sessionChainAfterLeaf(file: string, leafUuid: string, chunkBytes?: number): LeafChainState;
/**
 * The uuid of the last conversation entry (user, assistant, compact
 * boundary) in a transcript: for a fresh fork, the copy of the entry it was
 * cut at. Read backwards in chunks; undefined when there is none.
 */
export declare function lastChainEntryUuid(file: string, chunkBytes?: number): string | undefined;
export declare function clearForeignSessionId(conversationKey: string): void;
/**
 * Stable key from OpenAI messages so follow-ups resume the same Claude session.
 * Hashes the first user message only — including the message count made the key
 * change on every turn, which defeated resume entirely when the session header
 * is absent.
 */
export declare function conversationKeyFromMessages(messages: Array<{
    role?: string;
    content?: unknown;
}>): string;
/**
 * Locate the Claude Code transcript for a foreign session id. A missing file
 * means resume silently starts (or errors into) a context-free session, so
 * callers must fall back to history injection instead.
 *
 * Every project folder is searched on purpose. The CLI writes a session
 * under ~/.claude/projects/<slug of the realpath cwd>/, but `--resume <id>`
 * finds it from any cwd: checked live on CLI 2.1.224 and 2.1.284, a resume
 * from another directory loaded the full history and appended to the
 * original file. A chat whose directory changed keeps resuming.
 */
export declare function findClaudeSessionFile(foreignSessionId: string, configDir?: string): string | null;
export {};
