import { ClaudeClient } from "../clients/claude-client";
import { KieClient } from "../clients/kie-client";
import { SlackClient } from "../clients/slack-client";
import { pipelineLogger } from "./logger";

export class SocialPublisher {
    private claude: ClaudeClient;
    private kie: KieClient;
    private slack: SlackClient;

    constructor() {
        this.claude = new ClaudeClient();
        this.kie = new KieClient();
        this.slack = new SlackClient();
    }

    async prepareSocialPosts(articleHtml: string, title: string, hebrewUrl: string, englishUrl: string, topicId: string, postId: number, existingVideoUrl?: string) {
        pipelineLogger.info(`Preparing social posts for: ${title}`);

        let taskId: string | undefined = undefined;
        let videoUrl: string | undefined = existingVideoUrl;

        // 1. Generate Video (only if not provided)
        if (!existingVideoUrl) {
            pipelineLogger.info("Generating video for social posts...");
            taskId = await this.kie.generateVideo({
                title: title,
                excerpt: articleHtml.substring(0, 200),
                style: "documentary"
            }).catch(err => {
                pipelineLogger.error(`Video generation failed: ${err.message}`);
                return undefined;
            });

            if (taskId) {
                pipelineLogger.info(`Video generation started. Task ID: ${taskId}. Waiting for completion...`);

                // Wait for video to complete (with 5 minute timeout)
                try {
                    videoUrl = await this.kie.waitForVideo(taskId, 300000);
                    pipelineLogger.success(`Video ready: ${videoUrl}`);

                    // Calculate video duration (estimate based on Sora defaults)
                    const duration = 10; // Sora generates ~10 second videos

                    // PAUSE HERE - Send video approval request
                    await this.slack.sendVideoApprovalRequest({
                        videoUrl: videoUrl,
                        duration: duration,
                        taskId: taskId,
                        relatedPostId: postId,
                        postTitle: title
                    });

                    pipelineLogger.info("Video approval request sent. Waiting for user decision...");
                    return { status: "awaiting_video_approval", taskId: taskId, postId: postId };

                } catch (error: any) {
                    pipelineLogger.error(`Video generation timed out or failed: ${error.message}`);
                    pipelineLogger.warn("Proceeding without video...");
                    // Fall through to generate social posts without video
                }
            }
        }

        // 2. Continue with social approval (with or without video)
        return this.continueWithSocialApproval(articleHtml, title, hebrewUrl, englishUrl, topicId, videoUrl);
    }

    async continueWithSocialApproval(articleHtml: string, title: string, hebrewUrl: string, englishUrl: string, topicId: string, videoUrl?: string) {
        pipelineLogger.info("Generating bilingual social content...");

        const content = await this.generateBilingualContent(articleHtml, title, hebrewUrl, englishUrl);

        // Send Social Approval Request
        await this.slack.sendSocialApprovalRequest({
            hebrewHeadline: content.hebrew_headline,
            englishHeadline: content.english_headline,
            hebrewTeaser: content.hebrew_teaser,
            hebrewUrl: hebrewUrl,
            englishUrl: englishUrl,
            facebookPost: content.facebook_post,
            videoUrl: videoUrl,
            videoTaskId: undefined, // Video already resolved
            topicId: topicId
        });

        pipelineLogger.info("Social approval request sent.");
        return { status: "waiting_social_approval", videoUrl: videoUrl };
    }

    async publishSocialPosts(data: any) {
        pipelineLogger.info(`Publishing social posts for topic: ${data.topicId}`);

        let finalVideoUrl = data.videoUrl;

        // If video wasn't ready during approval, try to get it now
        if (!finalVideoUrl && data.videoTaskId) {
            pipelineLogger.info(`Video was pending. Checking status for Task: ${data.videoTaskId}`);
            try {
                const status = await this.kie.getTask(data.videoTaskId);
                if (status.status === 'success') {
                    finalVideoUrl = status.videoUrl;
                    pipelineLogger.success(`Resolved pending video: ${finalVideoUrl}`);
                } else {
                    pipelineLogger.warn(`Video still not ready (Status: ${status.status}). Publishing without video.`);
                }
            } catch (e) {
                pipelineLogger.error(`Error resolving pending video: ${e}`);
            }
        }

        // Get post details from WordPress
        const { WordPressClient } = require("../clients/wordpress-client");
        const wp = new WordPressClient();
        const postId = parseInt(data.topicId);
        const post = await wp.getPost(postId);
        const postTitle = post.title.rendered;

        // Extract hashtags from content (look for #tags)
        const hashtagMatches = data.content.match(/#\w+/g) || [];
        const hashtags = hashtagMatches.length > 0 ? hashtagMatches : ["#Tax4US", "#USIsraeliTax"];

        // Send Facebook approval request
        pipelineLogger.info("Sending Facebook post for approval...");
        await this.slack.sendFacebookApprovalRequest({
            content: data.content,
            hashtags: hashtags,
            mediaUrl: finalVideoUrl,
            postTitle: postTitle,
            postId: postId
        });

        // Send LinkedIn approval request
        pipelineLogger.info("Sending LinkedIn post for approval...");
        await this.slack.sendLinkedInApprovalRequest({
            content: data.content,
            hashtags: hashtags,
            mediaUrl: finalVideoUrl,
            postTitle: postTitle,
            postId: postId
        });

        pipelineLogger.success(`Facebook and LinkedIn approval requests sent for topic ${data.topicId}`);

        return { status: "awaiting_platform_approvals", videoUrl: finalVideoUrl };
    }

    private async generateBilingualContent(articleHtml: string, title: string, hebrewUrl: string, englishUrl: string) {
        const prompt = `
            You are a social media expert for Tax4Us.
            Create a bilingual Facebook post based on this article content:
            "${articleHtml.substring(0, 3000).replace(/<[^>]+>/g, " ")}"

            **Requirements:**
            1. Hebrew Headline: Strategic, emotional hook ("Listen to this...", "Look what they did"), creating subtle urgency.
            2. English Headline: Cross-cultural bridge style, mirroring the Hebrew.
            3. Hebrew Teaser: Authentic, signaling reliability.
            4. Formatting: Use emojis (💰 🇮🇱 🇺🇸).
            5. Final Polish: Include a clear CTA ("Wake up!", "Share this!").
            
            **Tone:** Mixed-language delivery vibes (English/Hebrew) to signal authenticity.
            
            **Output JSON only:**
            {
                "hebrew_headline": "...",
                "english_headline": "...",
                "hebrew_teaser": "...",
                "facebook_post": "Full post text..."
            }
        `;

        const response = await this.claude.generate(prompt, "claude-3-haiku-20240307"); // Using Haiku as per n8n
        try {
            return JSON.parse(response);
        } catch (e) {
            // Fallback if JSON parsing fails
            return {
                hebrew_headline: title,
                english_headline: "New Article",
                hebrew_teaser: "Read our latest update.",
                facebook_post: `${title}\n\nRead here: ${englishUrl}`
            };
        }
    }

    async attachVideoToSocialPosts(postId: number, videoUrl: string) {
        pipelineLogger.info(`Attaching video to social posts for post ${postId}`);

        // Fetch the post to get its content
        const { WordPressClient } = require("../clients/wordpress-client");
        const wp = new WordPressClient();
        const post = await wp.getPost(postId);

        // Re-trigger social approval with the approved video URL
        const englishId = post.translations?.en;
        const englishPost = englishId ? await wp.getPost(parseInt(englishId)) : null;

        await this.prepareSocialPosts(
            post.content.rendered,
            post.title.rendered,
            post.link,
            englishPost?.link || "",
            postId.toString(),
            postId,
            videoUrl  // Pass the approved video URL
        );

        pipelineLogger.success("Video attached to social posts");
    }

    async publishSocialWithoutVideo(postId: number) {
        pipelineLogger.info(`Publishing social posts without video for post ${postId}`);

        const { WordPressClient } = require("../clients/wordpress-client");
        const wp = new WordPressClient();
        const post = await wp.getPost(postId);
        const englishId = post.translations?.en;
        const englishPost = englishId ? await wp.getPost(parseInt(englishId)) : null;

        // Generate social posts without video
        await this.prepareSocialPosts(
            post.content.rendered,
            post.title.rendered,
            post.link,
            englishPost?.link || "",
            postId.toString(),
            postId
        );

        pipelineLogger.success("Social posts prepared without video");
    }
}
