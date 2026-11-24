/**
 * Which app runs this OpenCode server, as far as the plugin can tell.
 *
 * OpenChamber starts its managed OpenCode with OPENCHAMBER_RUNTIME set (web,
 * desktop, ssh-remote). An OpenCode the user started themselves carries no
 * such marker, even when OpenChamber connects to it, so it counts as plain
 * OpenCode. The name is what Claude is told it runs in and what its tools
 * are called: stated plainly, never dressed up as Claude Code.
 */
export type Host = {
    name: "OpenChamber" | "OpenCode";
    mcpServer: "openchamber" | "opencode";
};
export declare function currentHost(env?: NodeJS.ProcessEnv): Host;
/** Claude Code's name for a bridged tool. */
export declare function mcpToolName(tool: string, host?: Host): string;
/** OpenCode's name for a tool Claude called through either bridge name. */
export declare function openCodeToolName(mcpName: string): string;
