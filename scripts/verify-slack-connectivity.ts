import { SlackClient } from "../lib/clients/slack-client";
import * as dotenv from "dotenv";

dotenv.config();

async function verifySlack() {
    const slack = new SlackClient();
    const targetChannel = "D09N3M1BHF1";

    console.log(`🔍 Verifying Slack token and access to channel: ${targetChannel}...`);

    try {
        // Test basic connectivity
        const authTest = await fetch("https://slack.com/api/auth.test", {
            headers: { "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}` }
        }).then(r => r.json());

        console.log("Auth Test:", authTest.ok ? "✅ OK - Bot: " + authTest.user : "❌ Failed: " + authTest.error);

        if (!authTest.ok) return;

        // Try to post a simple ping to see if channel is found
        const response = await slack.sendMessage("Infrastructure Hardening: Connectivity Ping 🛠️");
        if (response && response.ok) {
            console.log("✅ Success: Channel is accessible and message sent.");
        } else {
            console.log("❌ Failed: could not send message to channel.");

            // Try to join if it's a channel (starts with C)
            if (targetChannel.startsWith("C")) {
                console.log("Attempting to join channel...");
                await fetch("https://slack.com/api/conversations.join", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ channel: targetChannel })
                });
            } else if (targetChannel.startsWith("D")) {
                console.log("Target is a DM. Ensure the bot has been invited to a multi-person DM or the user has messaged the bot.");
            }
        }
    } catch (e) {
        console.error("Connectivity Audit Error:", e);
    }
}

verifySlack();
