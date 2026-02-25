import { WordPressClient } from "../lib/clients/wordpress-client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testUpdate() {
    const wp = new WordPressClient();
    const postId = 2694;
    console.log(`🧪 Testing update for Post ${postId}...`);

    try {
        const result = await wp.updatePost(postId, {
            title: "[TEST-UPDATE] Navigating the Impact of the GILTI Tax...",
        });
        console.log("✅ Update successful!");
        console.log("New Title:", result.title.rendered);
    } catch (e: any) {
        console.error("❌ Update failed:", e.message);
    }
}

testUpdate();
