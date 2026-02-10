export type LogLevel = "info" | "warn" | "error" | "agent" | "success";

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    metadata?: Record<string, unknown>;
    topicId?: string;
}

import * as fs from "fs";
import * as path from "path";

class LogStore {
    private static instance: LogStore;
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 1000;
    private readonly LOG_FILE = path.join(process.cwd(), "pipeline-logs.json");

    private constructor() {
        this.loadLogs();
    }

    private loadLogs() {
        try {
            if (fs.existsSync(this.LOG_FILE)) {
                this.logs = JSON.parse(fs.readFileSync(this.LOG_FILE, "utf-8"));
            }
        } catch (e) {
            console.error("Failed to load persistence logs", e);
        }
    }

    private saveLogs() {
        try {
            fs.writeFileSync(this.LOG_FILE, JSON.stringify(this.logs.slice(0, 500), null, 2));
        } catch (e) {
            console.error("Failed to save persistence logs", e);
        }
    }

    static getInstance(): LogStore {
        if (!LogStore.instance) {
            LogStore.instance = new LogStore();
        }
        return LogStore.instance;
    }

    addLog(entry: Omit<LogEntry, "id" | "timestamp">) {
        const log: LogEntry = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            ...entry,
        };
        this.logs.unshift(log); // Newest first
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.pop();
        }
        this.saveLogs();
        console.log(`[${log.level.toUpperCase()}] ${log.message}`);
    }

    getLogs(topicId?: string, limit: number = 50): LogEntry[] {
        this.loadLogs(); // Re-read from disk to pick up changes from other processes
        if (topicId) {
            return this.logs.filter(l => l.topicId === topicId).slice(0, limit);
        }
        return this.logs.slice(0, limit);
    }

    clear() {
        this.logs = [];
    }
}

export const pipelineLogger = {
    info: (message: string, topicId?: string, metadata?: Record<string, unknown>) =>
        LogStore.getInstance().addLog({ level: "info", message, topicId, metadata }),

    warn: (message: string, topicId?: string, metadata?: Record<string, unknown>) =>
        LogStore.getInstance().addLog({ level: "warn", message, topicId, metadata }),

    error: (message: string, topicId?: string, metadata?: Record<string, unknown>) =>
        LogStore.getInstance().addLog({ level: "error", message, topicId, metadata }),

    agent: (message: string, topicId?: string, metadata?: Record<string, unknown>) =>
        LogStore.getInstance().addLog({ level: "agent", message, topicId, metadata }),

    success: (message: string, topicId?: string, metadata?: Record<string, unknown>) =>
        LogStore.getInstance().addLog({ level: "success", message, topicId, metadata }),

    getLogs: (topicId?: string, limit?: number) =>
        LogStore.getInstance().getLogs(topicId, limit),

    clear: () => LogStore.getInstance().clear()
};
