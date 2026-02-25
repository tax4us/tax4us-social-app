import fetch from "node-fetch";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkDraft(id: number) {
    const user = "Shai ai";
    const pass = "0nm7^1l&PEN5HAWE7LSamBRu";
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const url = `https://www.tax4us.co.il/wp-json/wp/v2/posts/${id}?status=draft`;

    console.log(`Checking Draft ID: ${id}...`);
    try {
        const response = await fetch(url, {
            headers: { "Authorization": `Basic ${auth}` }
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`✅ Draft Found: ${data.title.rendered}`);
            return true;
        } else {
            console.log(`❌ Draft Not Found or Error: ${JSON.stringify(data)}`);
            return false;
        }
    } catch (e) {
        console.error("💥 Error checking draft:", e);
        return false;
    }
}

async function checkSlackToken() {
    const token = process.env.SLACK_BOT_TOKEN;
    console.log("\nTesting Slack Token...");
    if (!token) {
        console.error("❌ SLACK_BOT_TOKEN not found in environment.");
        return false;
    }
    try {
        const response = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        console.log(`Slack Auth Test: ${JSON.stringify(data)}`);
        return data.ok;
    } catch (e) {
        console.error("💥 Slack check failed:", e);
        return false;
    }
}

async function testSlackMessage() {
    const token = process.env.SLACK_BOT_TOKEN;
    const channelId = "U09NNMEDNEQ"; // Ben's User ID
    console.log(`\nTesting Slack Message to ${channelId}...`);
    try {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                channel: channelId,
                text: "🤖 TAX4US Bot: Testing connection with new token. Please ignore this message."
            })
        });
        const data = await response.json();
        console.log(`Slack Message Response: ${JSON.stringify(data)}`);
    } catch (e) {
        console.error("💥 Slack message failed:", e);
    }
}

async function main() {
    await checkDraft(2686);
    const authOk = await checkSlackToken();
    if (authOk) {
        await testSlackMessage();
    }
}

main();
