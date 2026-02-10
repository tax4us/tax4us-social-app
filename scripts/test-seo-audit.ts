import { PipelineOrchestrator } from "../lib/pipeline/orchestrator";
import { pipelineLogger } from "../lib/pipeline/logger";
import * as dotenv from "dotenv";

dotenv.config();

async function testSEOAudit() {
    console.log("🚀 Starting SEO Audit Worker Simulation...");
    const orchestrator = new PipelineOrchestrator();

    try {
        // We simulate the Tuesday run
        console.log("Step 1: Triggering runSEOAutoPilot scan...");
        await orchestrator.runSEOAutoPilot();
        console.log("✅ Simulation Complete.");
    } catch (error) {
        console.error("❌ Simulation Failed:", error);
    }
}

testSEOAudit();
