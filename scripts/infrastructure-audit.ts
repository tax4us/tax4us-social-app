import { SocialPublisher } from "../lib/pipeline/social-publisher";
import { KieClient } from "../lib/clients/kie-client";
import * as dotenv from "dotenv";

dotenv.config();

async function infrastructureAudit() {
    console.log("🕵️ Starting Infrastructure Audit...");
    const publisher = new SocialPublisher();
    const kie = new KieClient();

    // Test 1: Content Generation (Mocked environment)
    console.log("\n[Test 1] Content Generation & Parallelism...");
    try {
        const result = await publisher.prepareSocialPosts(
            "<p>Test Content</p>",
            "Audit Topic",
            "https://tax4us.co.il/he",
            "https://tax4us.co.il/en",
            "audit-123"
        );
        console.log("✅ Success: Post prepared.");
        console.log("Task ID:", result.videoTaskId);
    } catch (e) {
        console.error("❌ Failed Test 1:", e);
    }

    // Test 2: Video Resolution Logic
    console.log("\n[Test 2] Video Resolution (Pending -> Success logic)...");
    const mockApprovalData = {
        topicId: "audit-123",
        videoTaskId: "578f9ded5aca90dbbb6cdde19dc81f0c", // Using the one we know is rendering
        videoUrl: undefined // Force resolution
    };

    try {
        const publishResult = await publisher.publishSocialPosts(mockApprovalData);
        console.log("✅ Success: Publish path verified.");
        console.log("Resolved URL:", publishResult.videoUrl);
    } catch (e) {
        console.error("❌ Failed Test 2:", e);
    }

    console.log("\nAudit Complete.");
}

infrastructureAudit();
