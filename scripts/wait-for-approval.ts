import { WordPressClient } from "../lib/clients/wordpress-client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function watch(postId: number) {
    const wp = new WordPressClient();
    console.log(`📡 [WATCHER] Starting live monitor for Post ${postId}...`);

    // Poll every 10 seconds for up to 10 minutes (60 iterations)
    for (let i = 0; i < 60; i++) {
        try {
            const post = await wp.getPost(postId);
            if (!post) {
                console.log("❌ Post not found. Exiting watcher.");
                return;
            }

            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] Status: ${post.status.toUpperCase()} | Title: ${post.title.rendered.substring(0, 50)}...`);

            if (post.status === 'publish') {
                console.log("\n🚀 BOOM! Post is PUBLISHED! Generation Complete.");
                console.log(`URL: ${post.link}`);
                return;
            }

            if (post.content.rendered.includes("Generation in progress") || !post.title.rendered.includes("[PROPOSAL]")) {
                console.log("✍️ CONTENT GENERATION DETECTED! AI is currently writing the article...");
                // Don't exit yet, keep watching until published
            } else {
                console.log("⏳ Waiting for you to click 'Approve' in Slack...");
            }

        } catch (e: any) {
            console.error(`⚠️ Polling error: ${e.message}`);
        }

        // Wait 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    console.log("⏰ Watcher timeout (10 mins). Please run again if needed.");
}

const postId = parseInt(process.argv[2]) || 2693;
watch(postId);
