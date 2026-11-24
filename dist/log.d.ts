export declare const log: {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    /** Absolute path of the durable debug log file. */
    filePath(): string;
};
