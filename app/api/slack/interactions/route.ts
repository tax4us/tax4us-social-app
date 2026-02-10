import { NextRequest, NextResponse } from "next/server";
import { PodcastProducer } from "@/lib/pipeline/podcast-producer";

export async function POST(req: NextRequest) {
    try {
        // Slack sends data as 'application/x-www-form-urlencoded'
        const formData = await req.formData();
        const payloadStr = formData.get("payload");

        if (!payloadStr || typeof payloadStr !== "string") {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const payload = JSON.parse(payloadStr);

        // Verify request type
        if (payload.type !== "block_actions") {
            return NextResponse.json({ message: "Ignored" });
        }

        const action = payload.actions?.[0]; // Get the clicked button
        if (!action) return NextResponse.json({ message: "No action found" });

        const value = JSON.parse(action.value || "{}");

        if (action.action_id === "approve_publish" && value.action === "publish") {
            // Trigger Publish
            console.log("🚀 Slack Approval Received: Publishing Episode...", value);

            const producer = new PodcastProducer();

            // Fire and forget (or await if fast enough)
            // Ideally we should respond immediately and process in background
            // For now, we'll try to await but race with response

            // We'll effectively fire-and-forget by not awaiting the promise fully
            // BUT Vercel might kill it. 
            // Better: Respond with a message "Processing..." and do the work?
            // Next.js App Router API routes might wait for background tasks if using `waitUntil` (Vercel specific)
            // or just simple promise.

            // Let's try to await it. If it times out, Slack retries. Ideally needs background job.
            // Converting to "background" via unawaited promise + console logging
            producer.publishEpisode({
                episodeId: value.episodeId,
                title: value.title,
                episodeNumber: value.episodeNumber,
                // wpPostId is not passed in button value currently, would need to be added if critical
            }).catch(e => console.error("Async Publish Failed:", e));

            // Respond to Slack immediately
            return NextResponse.json({
                text: "✅ Approved! Publishing process started. You will receive a confirmation shortly.",
                replace_original: false // Keep the approval message or replace?
                // Replacing triggers UI update
            });
        }

        if (action.action_id === "approve_social" && value.action === "publish_social") {
            const { SocialPublisher } = require("@/lib/pipeline/social-publisher");
            const publisher = new SocialPublisher();

            // Fire and forget
            publisher.publishSocialPosts(value).catch((e: any) => console.error("Async Social Publish Failed:", e));

            return NextResponse.json({
                text: "✅ Social posts approved! Publishing to linked accounts.",
                replace_original: false
            });
        }

        if (action.action_id === "cancel_publish") {
            return NextResponse.json({
                text: "❌ Publication cancelled.",
                replace_original: true
            });
        }

        if (action.action_id === "cancel_social") {
            return NextResponse.json({
                text: "❌ Social publication cancelled.",
                replace_original: true
            });
        }

        return NextResponse.json({ message: "Action received" });

    } catch (error: any) {
        console.error("Slack Interaction Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
