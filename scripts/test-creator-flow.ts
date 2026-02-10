import { PipelineOrchestrator } from "../lib/pipeline/orchestrator";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testCreatorFlow() {
    console.log("🚀 Starting E2E Creator Flow Test...");
    const orchestrator = new PipelineOrchestrator();

    try {
        console.log("\n--- STEP 1: Topic Proposal ---");
        const proposal = await orchestrator.proposeNewTopic();
        console.log("✅ Proposal Created:", proposal);

        if (proposal.postId) {
            console.log(`\n--- STEP 2: Simulating Manual Approval for Draft ${proposal.postId} ---`);
            const generation = await orchestrator.generatePost(proposal.postId, proposal.topic);
            console.log("✅ Full Generation Complete:", generation);
        }

    } catch (error) {
        console.error("❌ E2E Test Failed:", error);
        process.exit(1);
    }
}

testCreatorFlow();
