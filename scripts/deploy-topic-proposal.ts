import { PipelineOrchestrator } from "../lib/pipeline/orchestrator";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
    console.log("🚀 Triggering Topic Manager (Proposal Phase)...");
    const orchestrator = new PipelineOrchestrator();

    try {
        const result = await orchestrator.proposeNewTopic();
        console.log("\n✅ Proposal Phase Result:");
        console.log("----------------------------");
        console.log(`Status: ${result.status}`);
        console.log(`Draft ID: ${result.postId}`);
        console.log(`Topic: ${result.topic}`);
        console.log(`Message: ${result.message}`);
        console.log("----------------------------");
        console.log("\n📢 PLEASE CHECK SLACK FOR THE APPROVAL REQUEST.");
    } catch (error) {
        console.error("❌ Worker Failed:", error);
        process.exit(1);
    }
}

main();
