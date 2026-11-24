export function currentHost(env = process.env) {
    return env.OPENCHAMBER_RUNTIME?.trim()
        ? { name: "OpenChamber", mcpServer: "openchamber" }
        : { name: "OpenCode", mcpServer: "opencode" };
}
/** Claude Code's name for a bridged tool. */
export function mcpToolName(tool, host = currentHost()) {
    return `mcp__${host.mcpServer}__${tool}`;
}
/** OpenCode's name for a tool Claude called through either bridge name. */
export function openCodeToolName(mcpName) {
    return mcpName.replace(/^mcp__(?:openchamber|opencode)__/, "");
}
