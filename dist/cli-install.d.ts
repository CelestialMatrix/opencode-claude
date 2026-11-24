/**
 * Claude Code CLI installer bridge.
 *
 * When the CLI is missing, the provider offers an install action. The plugin
 * runs only official installers — npm's `@anthropic-ai/claude-code` package,
 * or Anthropic's own install script as fallback — and reports the outcome.
 * The installer runs with piped stdio so the host process never sees a
 * hijacked terminal; output is captured for error reporting only.
 */
import { spawn, type ChildProcess } from "node:child_process";
export type ClaudeCliInstallResult = {
    ok: true;
} | {
    ok: false;
    message: string;
};
type SpawnInstall = (command: string, args: string[], options: Parameters<typeof spawn>[2]) => ChildProcess;
/**
 * Install the official Claude Code CLI into the user environment. npm is
 * tried first (deterministic, Node is a given — the plugin runs in it); the
 * official install script is the fallback for hosts without npm. When both
 * fail, both reasons are reported.
 */
export declare function installClaudeCli(options?: {
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    cwd?: string;
    spawnInstall?: SpawnInstall;
    timeoutMs?: number;
}): Promise<ClaudeCliInstallResult>;
export declare function isClaudeCliInstallRunning(): boolean;
export {};
