/**
 * Sign-in bridge to the official Claude Code CLI.
 *
 * The plugin implements no OAuth of its own: `claude auth login --claudeai`
 * runs the entire flow and stores its own credentials. This module only
 * relays the CLI's terminal I/O into the host UI so the user does not have to
 * leave OpenCode/OpenChamber for a separate terminal:
 *
 *   stdout: "Opening browser to sign in…"
 *   stdout: "If the browser didn't open, visit: https://claude.com/…/authorize?…"
 *   stdout: "Paste code here if prompted > "
 *   stderr: "Invalid code. Please make sure the full code was copied."
 *
 * We forward the authorize URL to the host (which opens it) and pipe the code
 * the user pastes back into the CLI's stdin. No token ever passes through the
 * plugin — success is read from the CLI's exit code alone.
 *
 * The CLI rejects a malformed code locally and keeps prompting on the same
 * challenge, but exits when a well-formed code fails the token exchange, so
 * both a live process and a dead one are normal after a failed attempt.
 */
import { spawn, type ChildProcess } from "node:child_process";
export type ClaudeCliLoginStatus = {
    state: "idle";
} | {
    state: "awaiting-code";
    url: string;
} | {
    state: "verifying";
} | {
    state: "succeeded";
} | {
    state: "failed";
    message: string;
};
export type ClaudeCliLoginStart = {
    state: "awaiting-code";
    url: string;
} | {
    state: "failed";
    message: string;
};
export type ClaudeCliLoginSubmit = {
    ok: true;
} | {
    ok: false;
    message: string;
};
type SpawnLogin = (executable: string, args: string[], options: Parameters<typeof spawn>[2]) => ChildProcess;
export declare function getClaudeCliLoginStatus(): ClaudeCliLoginStatus;
/**
 * Launch (or reuse) the official CLI sign-in and return the URL it wants the
 * user to open. A live process is reused so retrying a rejected code keeps the
 * verifier the CLI holds in memory; a dead one is replaced with a fresh flow.
 */
export declare function startClaudeCliLogin(options?: {
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    cwd?: string;
    binaryPath?: string | null;
    spawnLogin?: SpawnLogin;
    urlTimeoutMs?: number;
}): Promise<ClaudeCliLoginStart>;
/**
 * Hand the code the user pasted in the host UI to the waiting CLI.
 * Success is the CLI's own exit status — the plugin never sees the credential.
 */
export declare function submitClaudeCliLoginCode(code: string, options?: {
    verifyTimeoutMs?: number;
}): Promise<ClaudeCliLoginSubmit>;
export declare function cancelClaudeCliLogin(): void;
export declare function resetClaudeCliLoginForTests(): void;
export {};
