/**
 * OpenCode Claude Auth Plugin
 *
 * Enables Claude Code (subscription) inside OpenCode via:
 * 1. Local OpenAI-compatible proxy backed by the Claude Agent SDK
 * 2. Authentication owned entirely by the local Claude Code CLI
 * 3. Native effort variants, session resume, tools, skills, and MCP
 *
 * Register in opencode.json:
 *   { "plugins": ["@openchamber/opencode-claude"] }
 */
import type { Model, Plugin, Provider } from "@opencode/plugin";
import { type ClaudeModel } from "./models.js";
export declare function applyClaudeRequestContextHeaders(headers: Record<string, string>, directory: string, sessionID?: string, configDir?: string): void;
type ProviderInfo = Provider.Info;
type ModelInfo = Model.Info;
type IntegrationEditor = Parameters<Parameters<Plugin.Context["integration"]["transform"]>[0]>[0];
type AuthRegistration = Parameters<IntegrationEditor["method"]["update"]>[0];
/**
 * The `compactAt` option: compact a chat at about this many tokens instead
 * of near a 1M window. OpenCode compacts when the prompt reaches its input
 * limit minus a reserve, so the input limit is set to put that point here.
 * The context window stays the model's own; only smaller models are left
 * alone.
 */
export declare function compactionInputLimit(model: ClaudeModel, compactAt: unknown): number | undefined;
export declare function buildProviderModel(model: ClaudeModel, id: string, compactAt?: unknown): ModelInfo;
export declare function buildClaudeProviderModels(models: ClaudeModel[], compactAt?: unknown): ModelInfo[];
export declare function buildProviderInfo(baseURL: string): ProviderInfo;
/**
 * OpenCode v2 plugin that provides Claude Code authentication and model access.
 *
 * The auth methods are chosen once at load from the CLI's presence: a host
 * with `claude` gets the sign-in relay, a host without it gets the install
 * action. `authorize` re-detects at run time, so the install action still
 * relays the sign-in right after a successful install.
 */
export declare const ClaudeCodePlugin: Plugin.Plugin;
/**
 * The method list mirrors what the host actually needs: only the sign-in relay
 * when the CLI is there, only the install action when it is not. Each
 * `authorize` re-detects, so the install action rolls straight into the relay
 * after a successful install without a restart.
 */
export declare function buildAuthMethods(cliPresent: boolean, directory: string): AuthRegistration[];
/**
 * No page to open: the user installs and signs in from a terminal (or via the
 * install action), and the callback watches `claude auth status` until the
 * grant lands. The message always names both the install and the auth command.
 */
export declare function manualInstallResponse(launchMessage: string, methodID: string): {
    url: string;
    instructions: string;
    mode: "auto";
    readonly callback: Promise<any>;
};
export default ClaudeCodePlugin;
export { detectClaudeCode } from "./detect.js";
export { getClaudeModels } from "./models.js";
export { startProxy, stopProxy, getClaudeProxyBaseUrl } from "./proxy.js";
