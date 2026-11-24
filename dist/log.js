/**
 * Debug-gated logger with always-on errors.
 *
 * OpenCode surfaces plugin stderr in the TUI / `--print-logs`, but does NOT
 * write those lines into `~/.local/share/opencode/log/opencode.log`. We therefore:
 * 1. Emit to stderr (so `--print-logs` / TUI can show them)
 * 2. Mirror to `~/.local/share/opencode-claude/debug.log` when debugging
 *
 * Levels:
 * - info: only when OPENCODE_CLAUDE_DEBUG is on
 * - warn / error: always (errors must never be silent)
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
function debugEnabled() {
    const value = (process.env.OPENCODE_CLAUDE_DEBUG ?? "").toLowerCase();
    return value === "1" || value === "true" || value === "yes" || value === "on";
}
function logFilePath() {
    const base = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
    return join(base, "opencode-claude", "debug.log");
}
function formatArg(arg) {
    if (typeof arg === "string")
        return arg;
    if (arg instanceof Error) {
        return arg.stack || `${arg.name}: ${arg.message}`;
    }
    try {
        return JSON.stringify(arg);
    }
    catch {
        return String(arg);
    }
}
function formatLine(level, args) {
    const ts = new Date().toISOString();
    return `${ts} level=${level} ${args.map(formatArg).join(" ")}`;
}
function writeFile(line) {
    try {
        const path = logFilePath();
        mkdirSync(dirname(path), { recursive: true });
        appendFileSync(path, `${line}\n`, "utf8");
    }
    catch {
        // never let logging break the plugin
    }
}
function emit(level, args) {
    const line = formatLine(level, args);
    // stderr for OpenCode TUI / --print-logs
    console.error(line);
    // durable mirror so logs can be pulled even without --print-logs
    if (level !== "info" || debugEnabled()) {
        writeFile(line);
    }
}
export const log = {
    info(...args) {
        if (!debugEnabled())
            return;
        emit("info", args);
    },
    warn(...args) {
        emit("warn", args);
    },
    error(...args) {
        emit("error", args);
    },
    /** Absolute path of the durable debug log file. */
    filePath() {
        return logFilePath();
    },
};
