import { WordPressClient } from "../lib/clients/wordpress-client";
import { podcastProducer } from "../lib/services/podcast-producer";
import { pipelineLogger } from "../lib/pipeline/logger";
import * as dotenv from "dotenv";

dotenv.config();

async function testPodcastProduction() {
    console.log("🎙️ Starting Podcast Producer Simulation...");
    const producer = podcastProducer;

    try {
        console.log("Step 1: Testing connections...");
        const connections = await producer.testConnections();
        console.log("Connections:", JSON.stringify(connections, null, 2));

        console.log("Step 2: Testing podcast production...");
        // Create mock content piece for testing
        const mockContentPiece = {
            id: 123,
            title_hebrew: "How Does the Redefinition of Remote Work Impact Your US-Israel Tax Obligations?",
            title_english: "How Does the Redefinition of Remote Work Impact Your US-Israel Tax Obligations?",
            target_keywords: ["FBAR", "US-Israel Tax", "Remote Work"],
            media_urls: {
                featured_image: "",
                social_video: "",
                social_image: ""
            }
        };

        const result = await producer.createPodcastEpisode(mockContentPiece);

        console.log("✅ Simulation Complete. Episode prepared (Draft).");
        console.log("Result:", JSON.stringify(result, null, 2));
        console.log("Check Slack for approval request!");

    } catch (error) {
        console.error("❌ Simulation Failed:", error);
    }
}

testPodcastProduction();
