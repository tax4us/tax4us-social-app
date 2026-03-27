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
                // Poll for video completion (Kling 3.0 takes 2-5 minutes)
                pipelineLogger.info(`Polling video task ${taskId} (max 3 min)...`);
                for (let attempt = 1; attempt <= 18; attempt++) {
                    await new Promise(r => setTimeout(r, 10000)); // 10s intervals
                    try {
                        const status = await this.kie.getTask(taskId);
                        pipelineLogger.info(`Video poll ${attempt}/18: ${status.status}`);
                        if (status.status === 'success' && status.videoUrl) {
                            videoUrl = status.videoUrl;
                            pipelineLogger.success(`Video ready: ${videoUrl}`);
                            break;
                        }
                        if (status.status === 'failed') {
                            pipelineLogger.warn(`Video generation failed: ${status.error}`);
                            break;
                        }
                    } catch (e) {
                        pipelineLogger.warn(`Video poll error: ${e}`);
                    }
                }
                if (!videoUrl) pipelineLogger.warn("Video not ready after 3 min — continuing with image fallback");
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

        // Use the crafted social post from the approval flow (80-150 words, SOP-compliant)
        // Falls back to generating from WP content only if crafted post is missing
        const socialContent = data.facebookPost || data.content || post.content.rendered.replace(/<[^>]+>/g, ' ').substring(0, 2000).trim();

        // Extract hashtags from content (look for #tags)
        const hashtagMatches = socialContent.match(/#\w+/g) || [];
        const hashtags = hashtagMatches.length > 0 ? hashtagMatches : ["#Tax4US", "#USIsraeliTax"];

        // Send Facebook approval request
        pipelineLogger.info("Sending Facebook post for approval...");
        await this.slack.sendFacebookApprovalRequest({
            content: socialContent,
            hashtags: hashtags,
            mediaUrl: mediaUrl,
            postTitle: postTitle,
            postId: postId
        });

        // Send LinkedIn approval request
        pipelineLogger.info("Sending LinkedIn post for approval...");
        await this.slack.sendLinkedInApprovalRequest({
            content: socialContent,
            hashtags: hashtags,
            mediaUrl: finalVideoUrl,
            postTitle: postTitle,
            postId: postId
        });

        pipelineLogger.success(`Facebook and LinkedIn approval requests sent for topic ${data.topicId}`);

        return { status: "awaiting_platform_approvals", videoUrl: finalVideoUrl };
    }

    private async generateBilingualContent(articleHtml: string, title: string, hebrewUrl: string, englishUrl: string) {
        const plainText = articleHtml.substring(0, 3000).replace(/<[^>]+>/g, " ").trim();
        const prompt = `You write Facebook posts for Tax4Us, a US tax firm for Israeli-Americans.

Article title: "${title}"
Article content summary: "${plainText.substring(0, 1500)}"

Write a Facebook post in this EXACT format (Ben's approved format):

Line 1: Hebrew headline (the article title or a professional variation — NO numbers like "7 tips", NO clickbait, NO "מדריך ל...", NO "כל מה שצריך לדעת")
Line 2: (empty line)
Line 3-5: Hebrew teaser — 2-3 sentences summarizing what the article covers. Professional, warm, helpful. Based on IRS facts, not slogans.
Line 6: (empty line)
Line 7: קראו בעברית: ${hebrewUrl}
Line 8: Read in English: ${englishUrl}

RULES:
- NO emotional hooks ("Listen to this", "Wake up!")
- NO emojis in the headline
- Professional tone matching a US tax accounting firm
- Teaser should explain the VALUE of reading the article
- Keep it under 100 words total

Output JSON only:
{
    "hebrew_headline": "the headline",
    "english_headline": "English version of headline for LinkedIn",
    "hebrew_teaser": "2-3 sentence teaser in Hebrew",
    "facebook_post": "The COMPLETE Facebook post text exactly as it should appear"
}`;

        const response = await this.claude.generate(prompt, "claude-sonnet-4-20250514", undefined, 2000);
        try {
            const parsed = JSON.parse(response);
            // Ensure facebook_post has the correct structure with links
            if (!parsed.facebook_post.includes(hebrewUrl)) {
                parsed.facebook_post = `${parsed.hebrew_headline}\n\n${parsed.hebrew_teaser}\n\nקראו בעברית: ${hebrewUrl}\nRead in English: ${englishUrl}`;
            }
            return parsed;
        } catch (e) {
            // Fallback with Ben's exact format
            return {
                hebrew_headline: title,
                english_headline: title,
                hebrew_teaser: plainText.substring(0, 200).trim(),
                facebook_post: `${title}\n\n${plainText.substring(0, 200).trim()}\n\nקראו בעברית: ${hebrewUrl}\nRead in English: ${englishUrl}`
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
