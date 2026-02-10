import { WordPressClient } from "../lib/clients/wordpress-client";
import { PodcastProducer } from "../lib/pipeline/podcast-producer";
import { pipelineLogger } from "../lib/pipeline/logger";
import * as dotenv from "dotenv";

dotenv.config();

async function testPodcastProduction() {
    console.log("🎙️ Starting Podcast Producer Simulation...");
    const wp = new WordPressClient();
    const producer = new PodcastProducer();

    try {
        console.log("Step 1: Fetching sample published post...");
        const posts = await wp.getPosts({ status: 'publish', per_page: '1' });

        if (posts.length === 0) {
            console.log("❌ No published posts found to test with.");
            return;
        }

        const post = posts[0];
        console.log(`Testing with: "${post.title.rendered}" (ID: ${post.id})`);

        console.log("Step 2: Triggering prepareEpisode flow (Draft Mode)...");
        // We use prepareEpisode which creates a Draft and asks for approval
        const result = await producer.prepareEpisode(post.content.rendered, post.title.rendered, post.id);

        console.log("✅ Simulation Complete. Episode prepared (Draft).");
        console.log("Result:", JSON.stringify(result, null, 2));
        console.log("Check Slack for approval request!");

    } catch (error) {
        console.error("❌ Simulation Failed:", error);
    }
}

testPodcastProduction();
