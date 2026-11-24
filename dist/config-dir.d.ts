/** The config directory mapped to this project, or undefined for the default. */
export declare function configDirForDirectory(configDirs: unknown, directory: string): string | undefined;
/** Where Claude Code keeps its sessions and CLAUDE.md for this account. */
export declare function claudeConfigDir(configDir?: string): string;
