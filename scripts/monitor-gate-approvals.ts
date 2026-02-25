#!/usr/bin/env tsx
/**
 * REAL-TIME GATE APPROVAL MONITOR
 *
 * Monitors Slack for approval gate messages and tracks their status in real-time.
 * Uses Slack Web API to poll for messages and approval button interactions.
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

interface SlackMessage {
    type: string;
    text: string;
    ts: string;
    user?: string;
    blocks?: any[];
}

interface ConversationHistory {
    ok: boolean;
    messages: SlackMessage[];
    has_more: boolean;
    error?: string;
}

class SlackGateMonitor {
    private token: string;
    private benUserId: string = "U09NNMEDNEQ"; // Ben's Slack User ID
    private dmChannelId: string | null = null;
    private lastCheckedTs: string | null = null;

    constructor() {
        this.token = process.env.SLACK_BOT_TOKEN || "";
        if (!this.token) {
            throw new Error("SLACK_BOT_TOKEN not found in environment");
        }
    }

    /**
     * Open DM conversation to get channel ID
     */
    async openDMChannel(): Promise<string> {
        if (this.dmChannelId) {
            return this.dmChannelId;
        }

        try {
            const response = await fetch("https://slack.com/api/conversations.open", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    users: this.benUserId,
                }),
            });

            const data: any = await response.json();

            if (!data.ok) {
                throw new Error(`Slack API error: ${data.error}`);
            }

            this.dmChannelId = data.channel.id;
            console.log(`📱 DM Channel ID: ${this.dmChannelId}`);
            return this.dmChannelId;
        } catch (error: any) {
            throw new Error(`Failed to open DM: ${error.message}`);
        }
    }

    /**
     * Fetch conversation history from DM with Ben
     */
    async fetchRecentMessages(limit: number = 10): Promise<SlackMessage[]> {
        try {
            // Ensure we have the DM channel ID
            const channelId = await this.openDMChannel();

            const url = new URL("https://slack.com/api/conversations.history");
            url.searchParams.append("channel", channelId);
            url.searchParams.append("limit", limit.toString());

            if (this.lastCheckedTs) {
                url.searchParams.append("oldest", this.lastCheckedTs);
            }

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            const data: ConversationHistory = await response.json();

            if (!data.ok) {
                throw new Error(`Slack API error: ${data.error}`);
            }

            return data.messages || [];
        } catch (error: any) {
            console.error("Failed to fetch messages:", error.message);
            return [];
        }
    }

    /**
     * Parse message to detect gate type and status
     */
    detectGateType(message: SlackMessage): { gate: string; status: string } | null {
        const text = message.text || "";
        const blocks = message.blocks || [];

        // Check for gate keywords in text or blocks
        const blockText = JSON.stringify(blocks);
        const fullText = text + " " + blockText;

        if (fullText.includes("Topic Proposal") || fullText.includes("🎯 New Content Topic")) {
            return { gate: "Gate 1: Topic Proposal", status: "pending" };
        }

        if (fullText.includes("Article Ready") || fullText.includes("📝 Article Approval")) {
            return { gate: "Gate 2: Article Approval", status: "pending" };
        }

        if (fullText.includes("Video Preview") || fullText.includes("🎥 Video Ready")) {
            return { gate: "Gate 3: Video Preview", status: "pending" };
        }

        if (fullText.includes("Social Content") || fullText.includes("📢 Social Media Posts")) {
            return { gate: "Gate 4: Social Combined", status: "pending" };
        }

        if (fullText.includes("Facebook Post") || fullText.includes("📘 Facebook")) {
            return { gate: "Gate 5: Facebook Post", status: "pending" };
        }

        if (fullText.includes("LinkedIn Post") || fullText.includes("💼 LinkedIn")) {
            return { gate: "Gate 6: LinkedIn Post", status: "pending" };
        }

        return null;
    }

    /**
     * Check if message indicates approval
     */
    isApprovalMessage(message: SlackMessage): boolean {
        const text = message.text || "";
        return text.includes("approved") ||
               text.includes("✅") ||
               text.includes("Approve");
    }

    /**
     * Monitor Slack in real-time with polling
     */
    async startMonitoring(intervalSeconds: number = 10) {
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║  SLACK GATE MONITOR - REAL-TIME APPROVAL TRACKING         ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");

        console.log(`📡 Monitoring DM channel with Ben (${this.benUserId})`);
        console.log(`🔄 Polling every ${intervalSeconds} seconds`);
        console.log(`🔑 Using bot token: ${this.token.substring(0, 20)}...`);
        console.log("");

        // Initial fetch
        await this.checkForUpdates();

        // Set up polling interval
        const interval = setInterval(async () => {
            await this.checkForUpdates();
        }, intervalSeconds * 1000);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log("\n\n⏹️  Stopping monitor...");
            clearInterval(interval);
            process.exit(0);
        });
    }

    /**
     * Check for new messages and updates
     */
    private async checkForUpdates() {
        const messages = await this.fetchRecentMessages(20);

        if (messages.length === 0) {
            console.log(`[${new Date().toISOString()}] No new messages`);
            return;
        }

        // Update last checked timestamp
        if (messages[0]?.ts) {
            this.lastCheckedTs = messages[0].ts;
        }

        // Process messages in chronological order (oldest first)
        const sortedMessages = messages.reverse();

        for (const message of sortedMessages) {
            const gateInfo = this.detectGateType(message);

            if (gateInfo) {
                const timestamp = new Date(parseFloat(message.ts) * 1000).toLocaleTimeString();
                console.log(`\n[${timestamp}] 🚪 ${gateInfo.gate} DETECTED`);
                console.log(`   Status: ${gateInfo.status}`);

                // Extract key details from blocks
                if (message.blocks) {
                    this.extractGateDetails(message.blocks);
                }
            }

            // Check for approval actions
            if (this.isApprovalMessage(message)) {
                const timestamp = new Date(parseFloat(message.ts) * 1000).toLocaleTimeString();
                console.log(`\n[${timestamp}] ✅ APPROVAL DETECTED`);
                console.log(`   Message: ${message.text}`);
            }
        }
    }

    /**
     * Extract details from Slack block kit message
     */
    private extractGateDetails(blocks: any[]) {
        for (const block of blocks) {
            if (block.type === "section" && block.text?.text) {
                const text = block.text.text;

                // Extract topic, post ID, URLs, etc.
                const topicMatch = text.match(/\*Topic:\*\s*(.+?)(?:\n|$)/);
                const idMatch = text.match(/\*(?:Draft ID|Post ID):\*\s*(\d+)/);
                const urlMatch = text.match(/\*(?:Draft URL|Post URL):\*\s*<([^|]+)/);

                if (topicMatch) console.log(`   Topic: "${topicMatch[1]}"`);
                if (idMatch) console.log(`   ID: ${idMatch[1]}`);
                if (urlMatch) console.log(`   URL: ${urlMatch[1]}`);
            }
        }
    }

    /**
     * Get summary of current gate status
     */
    async getGateSummary(): Promise<void> {
        console.log("\n📊 GATE STATUS SUMMARY");
        console.log("─".repeat(60));

        const messages = await this.fetchRecentMessages(100);
        const gates = new Map<string, { detected: number; approved: number }>();

        for (const message of messages) {
            const gateInfo = this.detectGateType(message);
            if (gateInfo) {
                const current = gates.get(gateInfo.gate) || { detected: 0, approved: 0 };
                current.detected++;

                if (this.isApprovalMessage(message)) {
                    current.approved++;
                }

                gates.set(gateInfo.gate, current);
            }
        }

        if (gates.size === 0) {
            console.log("No gate messages found in recent history.");
        } else {
            gates.forEach((stats, gateName) => {
                const status = stats.approved > 0 ? "✅ APPROVED" : "⏳ PENDING";
                console.log(`${status} | ${gateName} (${stats.detected} messages)`);
            });
        }

        console.log("─".repeat(60));
    }
}

// Run the monitor
async function main() {
    const mode = process.argv[2] || "monitor";
    const monitor = new SlackGateMonitor();

    if (mode === "summary") {
        // Just show summary and exit
        await monitor.getGateSummary();
    } else {
        // Start real-time monitoring
        const intervalSeconds = parseInt(process.argv[3] || "10");
        await monitor.startMonitoring(intervalSeconds);
    }
}

main().catch(error => {
    console.error("❌ Monitor failed:", error.message);
    process.exit(1);
});
