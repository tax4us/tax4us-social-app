import { SocialPublisher } from "../lib/pipeline/social-publisher";
import * as dotenv from "dotenv";

dotenv.config();

async function testSocialFlow() {
    console.log("📱 Starting Social Publisher Simulation...");
    const publisher = new SocialPublisher();

    // Mock Article Content
    const mockArticleHtml = `
        <h1>Understanding US-Israel Tax Treaties</h1>
        <p>For US expats living in Israel, navigating the complex world of cross-border taxation can be daunting. The US-Israel tax treaty is designed to prevent double taxation, but many fail to utilize its provisions correctly.</p>
        <h2>Key Takeaway 1: Foreign Tax Credits</h2>
        <p>The most common method for avoiding double taxation is the Foreign Tax Credit (FTC). Form 1116 is your best friend here.</p>
        <h2>Key Takeaway 2: Social Security</h2>
        <p>Did you know you don't have to pay into both Bituach Leumi and US Social Security in many cases?</p>
        <p>Read more to save thousands on your next tax bill.</p>
    `;

    const mockTitle = "US-Israel Tax Treaty Guide 2024";
    const mockHebrewUrl = "https://tax4us.co.il/he/test-article";
    const mockEnglishUrl = "https://tax4us.co.il/en/test-article";
    const mockTopicId = "test-topic-123";

    try {
        console.log("Step 1: Preparing Social Posts (Video + Text + Approval)...");
        const result = await publisher.prepareSocialPosts(
            mockArticleHtml,
            mockTitle,
            mockHebrewUrl,
            mockEnglishUrl,
            mockTopicId
        );

        console.log("✅ Simulation Complete.");
        console.log("Result:", result);
        console.log("👉 Check Slack for the approval request!");

    } catch (error) {
        console.error("❌ Test Failed:", error);
    }
}

testSocialFlow();
