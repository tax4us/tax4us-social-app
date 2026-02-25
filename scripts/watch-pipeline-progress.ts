#!/usr/bin/env npx tsx
/**
 * REAL-TIME PIPELINE PROGRESS MONITOR
 *
 * Watches pipeline-logs.json for changes and displays gate progression in real-time.
 * No API calls needed - just monitors the local log file.
 */

import fs from 'fs';
import path from 'path';

interface PipelineLog {
    id: string;
    timestamp: string;
    level: 'info' | 'error' | 'success' | 'warn';
    message: string;
    topicId?: string;
}

interface GateStatus {
    name: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    timestamp?: string;
    topicId?: string;
    details?: string;
}

class PipelineMonitor {
    private logFilePath: string;
    private lastLogCount: number = 0;
    private gates: Map<string, GateStatus> = new Map();

    constructor() {
        this.logFilePath = path.resolve(__dirname, '../pipeline-logs.json');
    }

    /**
     * Read pipeline logs
     */
    private readLogs(): PipelineLog[] {
        try {
            if (!fs.existsSync(this.logFilePath)) {
                console.log("📝 No pipeline logs file found yet. Waiting for pipeline to start...");
                return [];
            }

            const content = fs.readFileSync(this.logFilePath, 'utf-8');
            return JSON.parse(content) as PipelineLog[];
        } catch (error: any) {
            console.error(`Error reading logs: ${error.message}`);
            return [];
        }
    }

    /**
     * Detect gate information from log message
     */
    private detectGate(log: PipelineLog): { gate: string; status: string; details?: string } | null {
        const msg = log.message;

        // Gate 1: Topic Proposal
        if (msg.includes("Topic Proposed:")) {
            const topic = msg.replace("Topic Proposed:", "").trim();
            return { gate: "Gate 1: Topic Proposal", status: "sent", details: topic };
        }
        if (msg.includes("Topic approval pending")) {
            return { gate: "Gate 1: Topic Proposal", status: "pending" };
        }

        // Gate 2: Article Approval
        if (msg.includes("Article generation complete")) {
            return { gate: "Gate 2: Article Approval", status: "sent" };
        }
        if (msg.includes("awaiting_article_approval")) {
            return { gate: "Gate 2: Article Approval", status: "pending" };
        }
        if (msg.includes("Article approved")) {
            return { gate: "Gate 2: Article Approval", status: "approved" };
        }

        // Gate 3: Video Preview
        if (msg.includes("Video generation started")) {
            return { gate: "Gate 3: Video Preview", status: "generating" };
        }
        if (msg.includes("Video ready") || msg.includes("awaiting_video_approval")) {
            return { gate: "Gate 3: Video Preview", status: "pending" };
        }
        if (msg.includes("Video approved")) {
            return { gate: "Gate 3: Video Preview", status: "approved" };
        }
        if (msg.includes("Video skipped")) {
            return { gate: "Gate 3: Video Preview", status: "skipped" };
        }

        // Gate 4: Social Combined
        if (msg.includes("Social content generated")) {
            return { gate: "Gate 4: Social Combined", status: "pending" };
        }
        if (msg.includes("Social posts approved")) {
            return { gate: "Gate 4: Social Combined", status: "approved" };
        }

        // Gate 5: Facebook
        if (msg.includes("Facebook post sent for approval")) {
            return { gate: "Gate 5: Facebook Post", status: "pending" };
        }
        if (msg.includes("Facebook post approved")) {
            return { gate: "Gate 5: Facebook Post", status: "approved" };
        }

        // Gate 6: LinkedIn
        if (msg.includes("LinkedIn post sent for approval")) {
            return { gate: "Gate 6: LinkedIn Post", status: "pending" };
        }
        if (msg.includes("LinkedIn post approved")) {
            return { gate: "Gate 6: LinkedIn Post", status: "approved" };
        }

        // Gate 7: Podcast (Wednesday workflow)
        if (msg.includes("Podcast episode ready")) {
            return { gate: "Gate 7: Podcast Episode", status: "pending" };
        }
        if (msg.includes("Podcast approved")) {
            return { gate: "Gate 7: Podcast Episode", status: "approved" };
        }

        // Pipeline phases
        if (msg.includes("Starting Topic Proposal")) {
            return { gate: "Pipeline", status: "started" };
        }
        if (msg.includes("Article Generation")) {
            return { gate: "Pipeline", status: "article_gen" };
        }
        if (msg.includes("English Translation")) {
            return { gate: "Pipeline", status: "translation" };
        }
        if (msg.includes("Social Publishing")) {
            return { gate: "Pipeline", status: "social_pub" };
        }

        return null;
    }

    /**
     * Get status icon for gate
     */
    private getStatusIcon(status: string): string {
        switch (status) {
            case 'pending': return '⏳';
            case 'approved': return '✅';
            case 'rejected': return '❌';
            case 'completed': return '✓';
            case 'sent': return '📤';
            case 'generating': return '🔄';
            case 'skipped': return '⏭️';
            case 'started': return '🚀';
            default: return '•';
        }
    }

    /**
     * Display current gate status
     */
    private displayStatus() {
        console.clear();
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║  TAX4US PIPELINE MONITOR - Real-time Gate Tracking        ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");

        const logs = this.readLogs();
        const latestLog = logs[0];

        if (latestLog) {
            const time = new Date(latestLog.timestamp).toLocaleTimeString();
            console.log(`📊 Last Update: ${time}`);
            console.log(`📝 Total Events: ${logs.length}`);
            console.log("");
        }

        // Show gate status
        console.log("🚪 GATE STATUS:");
        console.log("─".repeat(60));

        const gateOrder = [
            "Gate 1: Topic Proposal",
            "Gate 2: Article Approval",
            "Gate 3: Video Preview",
            "Gate 4: Social Combined",
            "Gate 5: Facebook Post",
            "Gate 6: LinkedIn Post",
            "Gate 7: Podcast Episode"
        ];

        for (const gateName of gateOrder) {
            const gate = this.gates.get(gateName);
            if (gate) {
                const icon = this.getStatusIcon(gate.status);
                const time = gate.timestamp ? new Date(gate.timestamp).toLocaleTimeString() : "";
                console.log(`${icon} ${gateName.padEnd(30)} ${gate.status.toUpperCase().padEnd(12)} ${time}`);
                if (gate.details) {
                    console.log(`   └─ ${gate.details.substring(0, 55)}...`);
                }
            } else {
                console.log(`   ${gateName.padEnd(30)} NOT TRIGGERED`);
            }
        }

        console.log("");
        console.log("─".repeat(60));
        console.log("🔄 Watching for changes... (Press Ctrl+C to stop)");
        console.log("");

        // Show recent activity
        if (logs.length > 0) {
            console.log("📋 RECENT ACTIVITY (last 5 events):");
            console.log("─".repeat(60));
            logs.slice(0, 5).reverse().forEach((log, i) => {
                const time = new Date(log.timestamp).toLocaleTimeString();
                const levelIcon = log.level === 'error' ? '❌' : log.level === 'success' ? '✅' : 'ℹ️';
                console.log(`${levelIcon} [${time}] ${log.message.substring(0, 50)}...`);
            });
        }
    }

    /**
     * Update gate status from logs
     */
    private updateGatesFromLogs() {
        const logs = this.readLogs();

        // Process logs in reverse chronological order (most recent first)
        for (const log of logs) {
            const gateInfo = this.detectGate(log);
            if (gateInfo) {
                const existing = this.gates.get(gateInfo.gate);

                // Only update if this is newer info or first time seeing this gate
                if (!existing || new Date(log.timestamp) > new Date(existing.timestamp || 0)) {
                    this.gates.set(gateInfo.gate, {
                        name: gateInfo.gate,
                        status: gateInfo.status as any,
                        timestamp: log.timestamp,
                        topicId: log.topicId,
                        details: gateInfo.details
                    });
                }
            }
        }
    }

    /**
     * Watch for file changes and new log entries
     */
    async startWatching(intervalMs: number = 2000) {
        console.log("🔍 Starting pipeline monitor...\n");

        // Initial display
        this.updateGatesFromLogs();
        this.displayStatus();
        this.lastLogCount = this.readLogs().length;

        // Watch for changes
        const watcher = setInterval(() => {
            const logs = this.readLogs();
            const currentCount = logs.length;

            if (currentCount !== this.lastLogCount) {
                // New logs detected
                this.updateGatesFromLogs();
                this.displayStatus();
                this.lastLogCount = currentCount;

                // Beep on new activity (terminal bell)
                process.stdout.write('\x07');
            }
        }, intervalMs);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log("\n\n⏹️  Stopping monitor...");
            clearInterval(watcher);
            process.exit(0);
        });
    }

    /**
     * Show static summary (no watching)
     */
    showSummary() {
        this.updateGatesFromLogs();
        this.displayStatus();

        const logs = this.readLogs();
        const latestTopic = logs.find(l => l.message.includes("Topic approval pending"));

        if (latestTopic) {
            console.log("\n🎯 NEXT ACTION:");
            console.log("─".repeat(60));
            console.log("Check your Slack DMs for the topic approval message.");
            console.log("Click '✅ Approve & Generate' to trigger Gate 2.");
            console.log("");
        }
    }
}

// Run the monitor
async function main() {
    const mode = process.argv[2] || "watch";
    const monitor = new PipelineMonitor();

    if (mode === "summary") {
        monitor.showSummary();
    } else {
        const interval = parseInt(process.argv[3] || "2000");
        await monitor.startWatching(interval);
    }
}

main().catch(error => {
    console.error("❌ Monitor failed:", error.message);
    process.exit(1);
});
