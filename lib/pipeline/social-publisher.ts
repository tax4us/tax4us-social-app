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

        // 1. Generate Video via Kie.ai Kling 3.0 (only if not provided)
        if (!existingVideoUrl) {
            const videoPromise = this.kie.generateVideo({
                title: title,
                excerpt: articleHtml.substring(0, 200).replace(/<[^>]*>/g, ''),
                style: "documentary"
            }).catch(err => {
                pipelineLogger.error(`Video generation failed: ${err.message}`);
                return undefined;
            });

            // 2. Generate Bilingual Text (parallel with video)
            const textPromise = this.generateBilingualContent(articleHtml, title, hebrewUrl, englishUrl);

            // Wait for both
            const [generatedTaskId, content] = await Promise.all([videoPromise, textPromise]);
            taskId = generatedTaskId;

            if (taskId) {
                try {
                    const status = await this.kie.getTask(taskId);
                    if (status.status === 'success') videoUrl = status.videoUrl;
                } catch (e) {
                    pipelineLogger.warn("Could not retrieve video status immediately.");
                }
            }

            if (videoUrl) {
                // Video ready — send video approval request
                await this.slack.sendVideoApprovalRequest({
                    videoUrl: videoUrl,
                    duration: 8,
                    taskId: taskId || "kie-video",
                    relatedPostId: postId,
                    postTitle: title
                });

                pipelineLogger.info("Video approval request sent. Waiting for user decision...");
                return { status: "awaiting_video_approval", taskId: taskId, postId: postId };
            }

            // Video not ready yet or failed — continue with social approval
            await this.slack.sendSocialApprovalRequest({
                hebrewHeadline: content.hebrew_headline,
                englishHeadline: content.english_headline,
                hebrewTeaser: content.hebrew_teaser,
                hebrewUrl: hebrewUrl,
                englishUrl: englishUrl,
                facebookPost: content.facebook_post,
                videoUrl: videoUrl,
                videoTaskId: taskId,
                topicId: topicId
            });

            pipelineLogger.info("Social approval request sent.");
            return { status: "waiting_social_approval", videoUrl: videoUrl };
        }

        // Existing video provided — continue with social approval
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

        // Get featured image URL as fallback if no video
        let mediaUrl = finalVideoUrl;
        if (!mediaUrl && post.featured_media) {
            try {
                const mediaRes = await fetch(
                    `https://tax4us.co.il/wp-json/wp/v2/media/${post.featured_media}`,
                    { headers: { 'Authorization': `Basic ${Buffer.from(`${process.env.WP_USERNAME || 'Shai ai'}:${process.env.WP_APPLICATION_PASSWORD || '0nm7^1l&PEN5HAWE7LSamBRu'}`).toString('base64')}` } }
                );
                if (mediaRes.ok) {
                    const mediaData = await mediaRes.json();
                    mediaUrl = mediaData.source_url;
                    pipelineLogger.info(`Using featured image for social: ${mediaUrl}`);
                }
            } catch (e: any) {
                pipelineLogger.warn(`Could not fetch featured image for social: ${e.message}`);
            }
        }

        // Extract hashtags from content (look for #tags)
        const hashtagMatches = data.content.match(/#\w+/g) || [];
        const hashtags = hashtagMatches.length > 0 ? hashtagMatches : ["#Tax4US", "#USIsraeliTax"];

        // Send Facebook approval request
        pipelineLogger.info("Sending Facebook post for approval...");
        await this.slack.sendFacebookApprovalRequest({
            content: data.content,
            hashtags: hashtags,
            mediaUrl: mediaUrl,
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
