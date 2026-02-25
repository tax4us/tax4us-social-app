import { NextResponse } from "next/server";
import { podcastProducer } from "@/lib/services/podcast-producer";

export const maxDuration = 60; // 1 minute for testing
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        console.log("🎙️ Testing Podcast Cron Automation...");

        // Test 1: Check if podcast producer is working
        const connections = await podcastProducer.testConnections();
        console.log("✅ Podcast producer connections:", connections);

        // Test 2: Create a simple mock episode (no real WordPress posts needed)
        const mockContent = {
            id: "999",
            topic_id: "test-999",
            title_hebrew: "Tax4Us Wednesday Test Episode", 
            title_english: "Tax4Us Wednesday Test Episode",
            target_keywords: ["Test", "Automation", "Wednesday"],
            status: "published" as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            media_urls: {
                featured_image: "",
                social_video: "",
                social_image: ""
            }
        };

        console.log("🎵 Creating test episode...");
        const episode = await podcastProducer.createPodcastEpisode(mockContent);
        console.log("✅ Test episode created:", episode);

        return NextResponse.json({ 
            success: true, 
            message: "Podcast cron test completed successfully",
            connections,
            testEpisode: episode 
        });

    } catch (error: any) {
        console.error("❌ Podcast cron test failed:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}