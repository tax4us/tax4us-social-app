import { WordPressClient } from "../lib/clients/wordpress-client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function poll(postId: number) {
    const wp = new WordPressClient();
    console.log(`🔍 Polling status for Post ${postId}...`);

    try {
        const post = await wp.getPost(postId);
        if (!post) {
            console.log("❌ Post not found.");
            return;
        }

        console.log(`Status: ${post.status}`);
        console.log(`Title: ${post.title.rendered}`);

        if (post.status === 'publish') {
            console.log("\n✅ SUCCESS: Post has been published!");
            console.log(`Link: ${post.link}`);
            process.exit(0);
        } else if (post.content.rendered.includes("Generation in progress")) {
            console.log("✍️ Content generation is in progress...");
        } else {
            console.log("⏳ Still awaiting approval/start...");
        }
    } catch (e: any) {
        console.error("Error polling WP:", e.message);
    }
}

const postId = parseInt(process.argv[2]) || 2691;
poll(postId);
