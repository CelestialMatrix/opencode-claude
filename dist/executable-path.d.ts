type ProbeEnv = NodeJS.ProcessEnv | Record<string, string | undefined>;
export type CliProbeResult = {
    /** Exit code; null when the process could not start, timed out, or was signalled. */
    status: number | null;
    stdout: string;
    /** Spawn error or timeout — the probe produced no trustworthy answer. */
    failed: boolean;
};
/**
 * npm's older Claude Code installs on Windows ship only `cli.js`. A JS entry
 * point is not executable on its own there, and the Agent SDK would pick the
 * host's runtime for it (bun inside OpenCode, rarely on PATH), so it always
 * runs through node, which an npm install implies.
 */
export declare function isJsEntrypoint(path: string): boolean;
/** The command and arguments that run the CLI at `binaryPath`. */
export declare function cliInvocation(binaryPath: string, args: string[]): [string, string[]];
/**
 * Run a short-lived CLI probe without blocking the event loop. The child is
 * killed and the probe reported as failed once `timeoutMs` elapses.
 */
export declare function runCliProbe(command: string, args: string[], options: {
    env?: ProbeEnv;
    timeoutMs: number;
}): Promise<CliProbeResult>;
/**
 * Windows: the Agent SDK spawns the executable without a shell, and Node/Bun
 * refuse to run a `.cmd`/`.bat` that way when an argument holds cmd.exe
 * special characters (the SDK's `--settings` JSON always does), or at all on
 * newer runtimes. A batch shim is unwrapped to the native `claude.exe` (or
 * `cli.js`) npm installs beside it. Checked on disk only: a `.cmd` probe can
 * be rejected outright, and a cold start of the ~250 MB exe can outlast the
 * probe timeout.
 */
export declare function resolveWindowsClaudePath(candidate: string): Promise<string | null>;
export declare function findBinaryOnPath(name: string, env?: ProbeEnv): Promise<string | null>;
export declare function resolveClaudeCli(env?: ProbeEnv): Promise<string | null>;
/** Drop the memoized resolution (after an install; also a test hook). */
export declare function resetClaudeCliResolutionCache(): void;
export declare function resolveClaudeCodeExecutable(options?: {
    env?: ProbeEnv;
}): Promise<string | null>;
export declare function assertClaudeWorkingDirectory(cwd: unknown): string;
export {};
