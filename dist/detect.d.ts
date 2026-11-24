export type ClaudeDetectStatus = "ready" | "needs-login" | "missing-cli" | "missing-sdk" | "error";
export type ClaudeDetectResult = {
    status: ClaudeDetectStatus;
    statusDetail?: string;
    binaryPath?: string | null;
    version?: string | null;
    sdkAvailable: boolean;
    loggedIn: boolean;
};
export declare function interpretClaudeAuthStatus(payload: unknown): {
    loggedIn: boolean;
    detail: string;
    authMethod?: string;
};
/**
 * `claude auth status --json`, spawned asynchronously: it runs before every
 * turn (through checkSubscriptionAuth) inside the OpenCode server, where a
 * synchronous spawn would freeze every stream and health check meanwhile.
 */
export declare function probeClaudeAuthStatusCli(options: {
    binaryPath: string;
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<{
    loggedIn: boolean;
    detail: string;
    authMethod?: string;
} | null>;
/**
 * The plugin serves Claude plans only: API-key access already has a native
 * OpenCode provider. Returns a user-facing refusal when the CLI is signed in
 * some other way, or null when the turn may run. Unknown probe results fail
 * open so a slow CLI never blocks subscription users; a signed-out CLI fails
 * on its own with an auth error. Cached briefly to keep turns fast.
 */
type AuthStatus = {
    loggedIn: boolean;
    detail: string;
} | null;
type AuthStatusProbe = (configDir?: string) => AuthStatus | Promise<AuthStatus>;
/** Test seam: replace the CLI probe (null restores the real one). */
export declare function setAuthStatusProbe(probe: AuthStatusProbe | null): void;
export declare function checkSubscriptionAuth(configDir?: string, now?: number): Promise<string | null>;
export declare function detectClaudeCode(options?: {
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    homeDir?: string;
    binaryPath?: string | null;
}): Promise<ClaudeDetectResult>;
export { resolveClaudeCodeExecutable } from "./executable-path.js";
