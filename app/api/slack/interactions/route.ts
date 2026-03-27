import { NextRequest, NextResponse } from "next/server";
import { PodcastProducer } from "@/lib/pipeline/podcast-producer";
import { logger } from '@/lib/utils/logger';

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

        logger.info('SlackInteractions', `[SLACK] Action Received: ${action.action_id}`, { value });

        if (action.action_id === "approve_publish" && value.action === "publish") {
            logger.info('SlackInteractions', "🚀 Slack Approval Received: Publishing Episode...", { value });
            const producer = new PodcastProducer();
            producer.publishEpisode({
                episodeId: value.episodeId,
                title: value.title,
                episodeNumber: value.episodeNumber,
            }).catch(e => logger.error('SlackInteractions', "Async Publish Failed", e));

            return NextResponse.json({
                text: "✅ Approved! Publishing process started. You will receive a confirmation shortly.",
                replace_original: false
            });
        }

        if (action.action_id === "approve_social" && value.action === "publish_social") {
            const { SocialPublisher } = require("../../../../lib/pipeline/social-publisher");
            const publisher = new SocialPublisher();
            publisher.publishSocialPosts(value).catch((e: any) => logger.error('SlackInteractions', "Async Social Publish Failed", e));

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

        if (action.action_id === "approve_topic") {
            logger.info('SlackInteractions', "🚀 Topic Approval Matched! Starting generation...");
            const { PipelineOrchestrator } = require("../../../../lib/pipeline/orchestrator");
            const orchestrator = new PipelineOrchestrator();

            // Trigger content generation - we await the initial feedback step (WP title change)
            // to ensure Vercel has time to start the process before suspending.
            await orchestrator.generatePost(value.draftId, value.topic);

            return NextResponse.json({
                text: `✅ *Topic Approved!* I've started generating the content for: "${value.topic}". Check WordPress in a few minutes.`,
                replace_original: false
            });
        }

        if (action.action_id === "reject_topic") {
            return NextResponse.json({
                text: `❌ Topic proposal rejected.`,
                replace_original: true
            });
        }

        if (action.action_id === "feedback_topic") {
            const { PipelineOrchestrator } = require("../../../../lib/pipeline/orchestrator");
            const orchestrator = new PipelineOrchestrator();

            // Re-propose a new topic signalling the user wants something different
            orchestrator.proposeNewTopicWithFeedback(
                `User rejected topic "${value.topic || 'current topic'}" and requested a different proposal. Please suggest a fresh, alternative tax topic that hasn't been covered recently.`
            ).catch((e: any) => logger.error('SlackInteractions', "Topic re-proposal failed", e));

            return NextResponse.json({
                text: `✍️ Got it! Generating a fresh topic proposal now. Check Slack in a moment for a new suggestion.`,
                replace_original: true
            });
        }

        if (action.action_id === "cancel_social") {
            return NextResponse.json({
                text: "❌ Social publication cancelled.",
                replace_original: true
            });
        }

        if (action.action_id === "approve_article") {
            logger.info('SlackInteractions', "📝 Article Approval Received: Publishing...", value);

            const { PipelineOrchestrator } = require("../../../../lib/pipeline/orchestrator");
            const orchestrator = new PipelineOrchestrator();

            // Trigger publish workflow (async to avoid timeout)
            orchestrator.publishApprovedArticle(value.draftId).catch((e: any) =>
                logger.error('SlackInteractions', "Article publish failed", e)
            );

            return NextResponse.json({
                text: `✅ Article approved! Publishing to WordPress with SEO score: ${value.seoScore}%`,
                replace_original: false
            });
        }

        if (action.action_id === "reject_article") {
            logger.info('SlackInteractions', "❌ Article Rejected: Marking for regeneration...", value);

            const { PipelineOrchestrator } = require("../../../../lib/pipeline/orchestrator");
            const orchestrator = new PipelineOrchestrator();

            // Mark for regeneration
            orchestrator.regenerateArticle(value.draftId).catch((e: any) =>
                console.error("Article regeneration failed:", e)
            );

            return NextResponse.json({
                text: "❌ Article rejected. Generating new version...",
                replace_original: true
            });
        }

        if (action.action_id === "approve_video") {
            console.log("🎥 Video Approved: Attaching to social posts...", value);

            const { SocialPublisher } = require("../../../../lib/pipeline/social-publisher");
            const publisher = new SocialPublisher();

            // Attach video to social posts
            publisher.attachVideoToSocialPosts(value.postId, value.videoUrl).catch((e: any) =>
                console.error("Video attachment failed:", e)
            );

            return NextResponse.json({
                text: `✅ Video approved! Attaching to social posts for post #${value.postId}`,
                replace_original: false
            });
        }

        if (action.action_id === "regenerate_video") {
            console.log("🔄 Video Regeneration Requested...", value);

            const { MediaProcessor } = require("../../../../lib/pipeline/media-processor");
            const { WordPressClient } = require("../../../../lib/clients/wordpress-client");

            const wp = new WordPressClient();
            const mediaProcessor = new MediaProcessor();

            // Get post title for new video generation
            wp.getPost(value.postId).then(async (post: any) => {
                const newTask = await mediaProcessor.generateVideo({
                    title: post.title.rendered,
                    excerpt: post.excerpt.rendered,
                    style: "documentary"
                });
                console.log(`New video generation started: ${newTask.taskId}`);
            }).catch((e: any) => console.error("Video regeneration failed:", e));

            return NextResponse.json({
                text: "🔄 Regenerating video with new prompt. You'll receive a new preview shortly.",
                replace_original: true
            });
        }

        if (action.action_id === "skip_video") {
            console.log("⏭️ Video Skipped: Publishing without video...", value);

            const { SocialPublisher } = require("../../../../lib/pipeline/social-publisher");
            const publisher = new SocialPublisher();

            // Continue social posts without video
            publisher.publishSocialWithoutVideo(value.postId).catch((e: any) =>
                console.error("Social publish failed:", e)
            );

            return NextResponse.json({
                text: "⏭️ Video skipped. Social posts will publish without video.",
                replace_original: true
            });
        }

        // Facebook handlers
        if (action.action_id === "approve_facebook") {
            console.log("📘 Facebook Post Approved: Publishing...", value);

            // Fetch content from WP post (content removed from button value for Slack size limits)
            const { WordPressClient } = require("../../../../lib/clients/wordpress-client");
            const wpClient = new WordPressClient();
            const wpPost = await wpClient.getPost(value.postId);
            const fbContent = wpPost.content.rendered.replace(/<[^>]+>/g, ' ').substring(0, 2000).trim();

            // Publish to Facebook via native Graph API
            const { socialMediaPublisher } = require("../../../../lib/services/social-media-publisher");

            socialMediaPublisher.publishToFacebook({
                platform: 'facebook',
                content: fbContent,
                mediaUrl: value.mediaUrl,
                hashtags: []
            }).catch((e: any) => console.error("Facebook publish failed:", e));

            return NextResponse.json({
                text: `✅ Facebook post approved! Publishing via native Graph API.`,
                replace_original: false
            });
        }

        if (action.action_id === "edit_facebook") {
            return NextResponse.json({
                text: "✏️ Edit requested. Please provide your changes in a reply.",
                replace_original: false
            });
        }

        if (action.action_id === "cancel_facebook") {
            return NextResponse.json({
                text: "❌ Facebook post cancelled.",
                replace_original: true
            });
        }

        // LinkedIn handlers
        if (action.action_id === "approve_linkedin") {
            console.log("💼 LinkedIn Post Approved: Publishing...", value);

            // Fetch content from WP post (content removed from button value for Slack size limits)
            const { WordPressClient: WPClient } = require("../../../../lib/clients/wordpress-client");
            const wpLI = new WPClient();
            const liPost = await wpLI.getPost(value.postId);
            const liContent = liPost.content.rendered.replace(/<[^>]+>/g, ' ').substring(0, 2000).trim();

            // Publish to LinkedIn via native API
            const { socialMediaPublisher } = require("../../../../lib/services/social-media-publisher");

            socialMediaPublisher.publishToLinkedIn({
                platform: 'linkedin',
                content: liContent,
                mediaUrl: value.mediaUrl,
                hashtags: []
            }).catch((e: any) => console.error("LinkedIn publish failed:", e));

            return NextResponse.json({
                text: `✅ LinkedIn post approved! Publishing via native LinkedIn API.`,
                replace_original: false
            });
        }

        if (action.action_id === "edit_linkedin") {
            return NextResponse.json({
                text: "✏️ Edit requested. Please provide your changes in a reply.",
                replace_original: false
            });
        }

        if (action.action_id === "cancel_linkedin") {
            return NextResponse.json({
                text: "❌ LinkedIn post cancelled.",
                replace_original: true
            });
        }

        return NextResponse.json({ message: "Action received" });

    } catch (error: any) {
        console.error("Slack Interaction Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
