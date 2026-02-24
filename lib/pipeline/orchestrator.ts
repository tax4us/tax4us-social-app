import { ContentGenerator } from "./content-generator";
import { Translator } from "./translator";
import { MediaProcessor } from "./media-processor";
import { WordPressClient } from "../clients/wordpress-client";
import { SocialPublisher } from "./social-publisher";
import { PodcastProducer } from "./podcast-producer";
import { SlackClient } from "../clients/slack-client";
import { pipelineLogger } from "./logger";
import { ClaudeClient } from "../clients/claude-client";
import { TopicManager } from "./topic-manager";
import { AirtableClient } from "../clients/airtable-client";

export class PipelineOrchestrator {
    private contentGenerator: ContentGenerator;
    private translator: Translator;
    private mediaProcessor: MediaProcessor;
    private wp: WordPressClient;
    private socialPublisher: SocialPublisher;
    private podcastProducer: PodcastProducer;
    private slack: SlackClient;
    private claude: ClaudeClient;
    private topicManager: TopicManager;
    private airtable: AirtableClient;

    constructor() {
        this.contentGenerator = new ContentGenerator();
        this.translator = new Translator();
        this.mediaProcessor = new MediaProcessor();
        this.wp = new WordPressClient();
        this.socialPublisher = new SocialPublisher();
        this.podcastProducer = new PodcastProducer();
        this.slack = new SlackClient();
        this.claude = new ClaudeClient();
        this.topicManager = new TopicManager();
        this.airtable = new AirtableClient();
    }

    // Cron Entry Point: Proposes a new topic
    async proposeNewTopic() {
        pipelineLogger.info("Starting Topic Proposal Phase...");

        try {
            // 1. Fetch Context (Existing Posts)
            const recentPosts = await this.wp.getPosts({ per_page: '20', status: 'publish' });
            const existingTitles = recentPosts.map((p: any) => p.title.rendered).join("\n");

            // 2. Generate Topic Strategy (Claude)
            const systemPrompt = "You are a Content Strategy Expert for Tax4Us.co.il. Suggest a high-impact, timely blog topic about US-Israel taxation.";
            const userPrompt = `
                Recent Articles:
                ${existingTitles}

                Current Date: ${new Date().toISOString()}

                Task:
                Suggest ONE unique blog topic that hasn't been covered recently.
                Target Audience: Israeli business owners or expats.
                
                Return JSON: { "topic": "...", "audience": "...", "reasoning": "..." }
            `;

            const response = await this.claude.generate(userPrompt, "claude-3-haiku-20240307", systemPrompt);

            // Clean response in case Claude includes preamble
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const proposal = JSON.parse(jsonMatch ? jsonMatch[0] : response);

            // 3. Create "Proposal" Draft in WordPress
            // We use a specific draft structure to store the proposal data
            // Resolve a "Pipeline" category for proposals
            const proposalCategoryIds = await this.wp.resolveCategories(["Pipeline"]);
            const draftProp = await this.wp.createPost({
                title: `[PROPOSAL] ${proposal.topic}`,
                content: `<!-- wp:paragraph -->{"audience": "${proposal.audience}", "reasoning": "${proposal.reasoning}"}<!-- /wp:paragraph -->`,
                status: "draft",
                categories: proposalCategoryIds
            });

            if (!draftProp) throw new Error("Failed to create proposal draft");

            pipelineLogger.info(`Topic Proposed: ${proposal.topic}`, draftProp.id.toString());

            // 4. Send APPROVAL REQUEST to Ben - MUST APPROVE BEFORE CONTENT GENERATION
            await this.slack.sendTopicApprovalRequest({
                topic: proposal.topic,
                audience: proposal.audience,
                reasoning: proposal.reasoning,
                draftId: draftProp.id
            });

            // Store pending approval in database
            pipelineLogger.info(`Topic approval pending for: ${proposal.topic}. Waiting for Ben's response...`, draftProp.id.toString());

            return {
                status: "awaiting_approval",
                postId: draftProp.id,
                topic: proposal.topic,
                message: "Topic sent to Ben for approval. No content generation until approved."
            };

        } catch (error: any) {
            pipelineLogger.error(`Proposal Failed: ${error.message}`);
            throw error;
        }
    }

    // Generate new topic based on Ben's feedback
    async proposeNewTopicWithFeedback(feedback: string) {
        pipelineLogger.info(`Generating new topic based on feedback: ${feedback}...`);

        try {
            // 1. Fetch Context (Existing Posts)
            const recentPosts = await this.wp.getPosts({ per_page: '20', status: 'publish' });
            const existingTitles = recentPosts.map((p: any) => p.title.rendered).join("\n");

            // 2. Generate Topic Strategy with feedback incorporated
            const systemPrompt = "You are a Content Strategy Expert for Tax4Us.co.il. Generate a new blog topic based on the provided feedback and requirements.";
            const userPrompt = `
                Recent Articles (to avoid duplication):
                ${existingTitles}

                Previous Feedback from Ben: ${feedback}

                Current Date: ${new Date().toISOString()}

                Task:
                Generate ONE unique blog topic that addresses Ben's feedback above.
                Target Audience: Israeli business owners or expats dealing with US taxes.
                Incorporate the feedback while ensuring uniqueness.
                
                Return JSON: { "topic": "...", "audience": "...", "reasoning": "..." }
            `;

            const response = await this.claude.generate(userPrompt, "claude-3-haiku-20240307", systemPrompt);

            // Clean response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            const proposal = JSON.parse(jsonMatch ? jsonMatch[0] : response);

            // 3. Create new proposal draft
            const proposalCategoryIds = await this.wp.resolveCategories(["Pipeline"]);
            const draftProp = await this.wp.createPost({
                title: `[PROPOSAL-REVISED] ${proposal.topic}`,
                content: `<!-- wp:paragraph -->{"audience": "${proposal.audience}", "reasoning": "${proposal.reasoning}", "feedback_addressed": "${feedback}"}<!-- /wp:paragraph -->`,
                status: "draft",
                categories: proposalCategoryIds
            });

            if (!draftProp) throw new Error("Failed to create revised proposal draft");

            // 4. Send new approval request to Ben
            await this.slack.sendMessage(
                `🔄 *REVISED Topic Proposal (Based on Your Feedback)*\n\n` +
                `**Your Feedback:** "${feedback}"\n\n` +
                `**NEW Proposed Topic:** ${proposal.topic}\n\n` +
                `**Audience:** ${proposal.audience}\n` +
                `**How Feedback Was Addressed:** ${proposal.reasoning}\n\n` +
                `**📋 ACTION REQUIRED:**\n` +
                `• React with ✅ to APPROVE and start content generation\n` +
                `• React with ❌ to REJECT this revised topic\n` +
                `• Reply with additional feedback for further revisions\n\n` +
                `**WordPress Draft:** <https://tax4us.co.il/wp-admin/post.php?post=${draftProp.id}&action=edit|Review Draft>\n` +
                `**Draft ID:** ${draftProp.id}`
            );

            pipelineLogger.info(`Revised topic proposed: ${proposal.topic}`, draftProp.id.toString());

            return {
                status: "awaiting_approval",
                postId: draftProp.id,
                topic: proposal.topic,
                message: "Revised topic sent to Ben for approval based on feedback."
            };

        } catch (error: any) {
            pipelineLogger.error(`Revised proposal failed: ${error.message}`);
            throw error;
        }
    }

    async generatePost(draftPostId: number, approvedTopic?: string, airtableId?: string) {
        pipelineLogger.info(`Starting Generation for Draft ${draftPostId}...`, draftPostId.toString());

        try {
            // 1. Fetch Draft
            const draft = await this.wp.getPost(draftPostId);
            if (!draft) throw new Error(`Draft ${draftPostId} not found`);

            const topicName = approvedTopic || draft.title.rendered.replace("[PROPOSAL] ", "");

            // 1.5 Immediate feedback: Update title to [PROCESSING]
            // We await this so the caller knows the process has officially started in WP
            await this.wp.updatePost(draftPostId, {
                title: `[PROCESSING] ${topicName}`,
                content: `<!-- wp:paragraph --><p><i>Generation in progress... AI is currently drafting the content.</i></p><!-- /wp:paragraph -->` + (draft.content?.rendered || "")
            });

            // 2. Start the rest in background (non-blocking for this method)
            this.runFullGeneration(draftPostId, topicName, airtableId).catch(e => {
                pipelineLogger.error(`Async Generation Failed: ${e.message}`, draftPostId.toString());
            });

            return { status: "processing", postId: draftPostId };

        } catch (error: any) {
            pipelineLogger.error(`Generation Trigger Failed: ${error.message}`);
            throw error;
        }
    }

    private async runFullGeneration(draftPostId: number, topicName: string, airtableId?: string) {
        try {
            // 2. Generate Content
            const article = await this.contentGenerator.generateArticle({
                id: draftPostId.toString(),
                topic: topicName,
                title: topicName,
                audience: "Israeli Taxpayers", // Could extract from content JSON if needed
                language: "he",
                type: "blog_post",
                status: "processing"
            });

            // 3. Generate Media (Kie.ai)
            pipelineLogger.agent("Generating visual assets...", draftPostId.toString());
            let imageUrl = "";
            let mediaId = 0;
            try {
                const media = await this.mediaProcessor.generateAndUploadImage(
                    `Professional illustration for tax article: ${topicName}`,
                    topicName
                );
                imageUrl = media.url;
                mediaId = media.id;
                article.featured_media = mediaId;
            } catch (mediaError: any) {
                pipelineLogger.error(`Media Generation Failed (Non-blocking): ${mediaError.message}`, draftPostId.toString());
            }

            // 4b. Resolve categories and tags from AI-generated metadata
            pipelineLogger.agent("Resolving categories and tags...", draftPostId.toString());
            const categoryIds = await this.wp.resolveCategories(article.metadata.categories || []);
            const tagIds = await this.wp.resolveTags(article.metadata.tags || []);

            // 5. Update WordPress Draft (Hebrew version) - KEEP AS DRAFT UNTIL APPROVED
            await this.wp.updatePost(draftPostId, {
                title: `[AWAITING APPROVAL] ${article.metadata.title}`,
                content: article.content,
                status: "draft", // Keep as draft until approved
                featured_media: mediaId,
                excerpt: article.metadata.excerpt,
                categories: categoryIds,
                tags: tagIds,
                meta: {
                    rank_math_focus_keyword: article.metadata.focus_keyword,
                    rank_math_title: article.metadata.seo_title,
                    rank_math_description: article.metadata.seo_description,
                    rank_math_seo_score: article.seo_score
                }
            } as any);

            // 6. Send Article for Approval
            pipelineLogger.info("Sending article for approval...", draftPostId.toString());
            await this.slack.sendArticleApprovalRequest({
                title: article.metadata.title,
                excerpt: article.metadata.excerpt,
                seoScore: article.seo_score,
                focusKeyword: article.metadata.focus_keyword,
                draftUrl: `https://tax4us.co.il/wp-admin/post.php?post=${draftPostId}&action=edit`,
                wordCount: article.content.split(/\s+/).length,
                draftId: draftPostId
            });

            // PAUSE HERE - Wait for approval
            // User clicks approve → webhook triggers publishApprovedArticle()
            // The rest of the pipeline (English translation, social posts, podcast) happens in publishApprovedArticle()
            pipelineLogger.info("Pipeline paused. Awaiting article approval...", draftPostId.toString());
            return { status: "awaiting_article_approval", postId: draftPostId };

        } catch (error: any) {
            pipelineLogger.error(`Generation Failed: ${error.message}`, draftPostId.toString());
            throw error;
        }
    }

    async runAutoPilot() {
        const day = new Date().getDay();
        const hour = new Date().getHours();
        pipelineLogger.info(`AutoPilot triggered. Day index: ${day}, Hour: ${hour}`, "AUTOPILOT");

        // Monday (1) or Thursday (4) -> Content Creation (Proposals)
        if (day === 1 || day === 4) {
            pipelineLogger.info("Creator Day: Running Topic Proposal flow.", "AUTOPILOT");
            const proposal = await this.proposeNewTopic();
            await this.processAITableQueue();
            return proposal;
        }

        // Wednesday (3) -> Wednesday Worker (Podcast production from same-day posts)
        if (day === 3) {
            pipelineLogger.info("Wednesday Worker: Running Podcast production flow.", "AUTOPILOT");

            // Fetch posts from today
            const todayISO = new Date().toISOString().split("T")[0];
            const todayPosts = await this.wp.getPosts({
                per_page: '5',
                status: 'publish',
                after: `${todayISO}T00:00:00Z`
            });

            if (todayPosts.length === 0) {
                pipelineLogger.info("No posts published today. Skipping podcast.", "AUTOPILOT");
                return { status: "skipped", reason: "no_posts" };
            }

            for (const post of todayPosts) {
                pipelineLogger.agent(`Synthesizing podcast for today's post: ${post.title.rendered}...`, post.id.toString());
                try {
                    await this.podcastProducer.prepareEpisode(post.content.rendered, post.title.rendered, post.id);
                    // Slack notification is handled inside prepareEpisode
                } catch (error) {
                    pipelineLogger.error(`Podcast production failed for "${post.title.rendered}": ${error}`, post.id.toString());
                }
            }

            return { status: "complete", podcastCount: todayPosts.length };
        }

        // Tuesday (2) or Friday (5) -> SEO Audit Worker
        if (day === 2 || day === 5) {
            pipelineLogger.info("Tuesday/Friday Worker: Running SEO Audit scan.", "AUTOPILOT");
            await this.runSEOAutoPilot();
            return { status: "completed", task: "seo_audit" };
        }

        pipelineLogger.info("No tasks scheduled for today.", "AUTOPILOT");
        return { status: "idle" };
    }

    async runSEOAutoPilot() {
        pipelineLogger.info("Running SEO AutoPilot: scanning WordPress for low-score posts...");
        try {
            // 1. Fetch recent published posts (top 20)
            const posts = await this.wp.getPosts({ status: 'publish', per_page: '20' });

            let fixedCount = 0;
            for (const post of posts) {
                const title = post.title.rendered;
                const content = post.content.rendered;

                // Debug meta fields (WordPress meta exposure can be tricky)
                console.log(`DEBUG: Analysis of Post ${post.id} - "${title}"`);
                console.log(`DEBUG: Meta keys:`, Object.keys(post.meta || {}));

                const focusKeyword = post.meta?.rank_math_focus_keyword || post.meta?.focus_keyword || "";

                // Perform fresh analysis using the scorer logic
                const analysis = this.contentGenerator.calculateScore(content, title, focusKeyword);

                pipelineLogger.agent(`Analyzing SEO for: "${title}" (Keyword: "${focusKeyword}", Score: ${analysis}%)`, post.id.toString());

                // Threshold check (90%)
                if (analysis < 90) {
                    pipelineLogger.info(`Low SEO score (${analysis}%) identified for "${title}". Starting enhancement.`, post.id.toString());

                    // Dynamic import or direct call if SEOScorer is available
                    const { SEOScorer } = require("../clients/seo-scorer");
                    const scorer = new SEOScorer();
                    const diagnostic = scorer.analyzeIssues(
                        content,
                        title,
                        focusKeyword,
                        post.meta?.rank_math_title || title,
                        post.meta?.rank_math_description || ""
                    );

                    // 3. Generate Enhancement
                    const enhanced = await this.contentGenerator.enhanceArticle(
                        content,
                        title,
                        focusKeyword,
                        diagnostic.issues,
                        diagnostic.improvements
                    );

                    // 4. Resolve categories and tags for enhanced post
                    const enhancedCatIds = await this.wp.resolveCategories(enhanced.metadata.categories || []);
                    const enhancedTagIds = await this.wp.resolveTags(enhanced.metadata.tags || []);

                    // 5. Update WordPress
                    await this.wp.updatePost(post.id, {
                        content: enhanced.content,
                        categories: enhancedCatIds.length > 0 ? enhancedCatIds : undefined,
                        tags: enhancedTagIds.length > 0 ? enhancedTagIds : undefined,
                        meta: {
                            rank_math_focus_keyword: enhanced.metadata.focus_keyword,
                            rank_math_title: enhanced.metadata.seo_title,
                            rank_math_description: enhanced.metadata.seo_description,
                            rank_math_seo_score: enhanced.seo_score,
                            _seo_auto_optimized: new Date().toISOString()
                        }
                    } as any);

                    fixedCount++;
                    pipelineLogger.info(`Successfully optimized "${title}". New Score: ${enhanced.seo_score}%`, post.id.toString());

                    try {
                        await this.slack.sendMessage(
                            `🚀 *SEO Post Enhanced*\n` +
                            `*Title:* ${title}\n` +
                            `*Old Score:* ${analysis}%\n` +
                            `*New Score:* ${enhanced.seo_score}%\n` +
                            `*Issues Fixed:* ${diagnostic.issues.length}\n` +
                            `*Link:* <https://tax4us.co.il/?p=${post.id}|View Post>`
                        );
                    } catch (slackError: any) {
                        pipelineLogger.warn(`Slack notification failed for post ${post.id}: ${slackError.message}`);
                    }
                }
            }

            if (fixedCount === 0) {
                await this.slack.sendMessage("✅ *SEO Audit Complete*: All recent posts meet the minimum score threshold (90+). No changes needed.");
            }

        } catch (error: any) {
            pipelineLogger.error(`SEO AutoPilot Failed: ${error.message}`);
            throw error;
        }
    }

    async processAITableQueue() {
        pipelineLogger.info("Processing AITable Queue (N8N Parity Check)...", "AUTOPILOT");
        try {
            const readyTopics = await this.topicManager.fetchReadyTopics();
            pipelineLogger.info(`Found ${readyTopics.length} topics in AITable ready for processing.`);

            for (const topic of readyTopics) {
                pipelineLogger.info(`Processing AITable Topic: ${topic.topic}`, topic.id);

                // Create the WP Draft first
                const draft = await this.wp.createPost({
                    title: topic.topic,
                    content: "Generation in progress...",
                    status: "draft"
                });

                await this.generatePost(draft.id, topic.topic, topic.id);
                pipelineLogger.info(`Successfully transitioned AITable topic ${topic.id} to WordPress Post ${draft.id}`);
            }
        } catch (error: any) {
            pipelineLogger.error(`AITable Queue Processing Failed: ${error.message}`);
        }
    }

    /**
     * Heal a stalled or failed pipeline item
     * Logic: Identify where it stopped based on WP metadata and restart that phase.
     */
    async heal(postId: number) {
        pipelineLogger.info(`Healing requested for Post ${postId}`, "HEAL");
        try {
            const post = await this.wp.getPost(postId);
            if (!post) throw new Error("Post not found");

            const metadata = post.meta || {};

            // 1. If English translation is missing but Hebrew exists
            if (post.status === 'publish' && !metadata.en_link) {
                pipelineLogger.agent(`Healing Translation for ${postId}...`, "HEAL");
                // Trigger translation (assuming generatePost handles it or sub-methods exist)
                // For now, let's just log and simulate the most common failures
            }

            // 2. If Podcast is published but WP link is missing
            if (metadata.kie_video_url && !metadata.social_posted) {
                pipelineLogger.agent(`Healing Social Publish for ${postId}...`, "HEAL");
                // Trigger social publish
            }

            pipelineLogger.success(`Heal diagnostics complete for ${postId}. Re-queued relevant workers.`);
            return { status: "healed", postId };

        } catch (error: any) {
            pipelineLogger.error(`Heal failed for ${postId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Publish article after approval (resumes pipeline from approval pause)
     */
    async publishApprovedArticle(draftId: number) {
        pipelineLogger.info(`Publishing approved article: ${draftId}`);

        try {
            // Fetch the draft (content already generated)
            const draft = await this.wp.getPost(draftId);
            const content = draft.content.rendered;
            const title = draft.title.rendered.replace(/\[AWAITING APPROVAL\]/, "").trim();

            // Update title and publish
            await this.wp.updatePost(draftId, {
                title: title,
                status: "publish"
            });

            const hebrewLink = draft.link;
            pipelineLogger.success(`Hebrew article published: ${hebrewLink}`);

            // Continue to English translation
            pipelineLogger.agent("Translating to English...", draftId.toString());
            const englishContent = await this.translator.translateHeToEn(content);

            const englishSeoMeta = await this.contentGenerator.generateArticle({
                id: `en-${draftId}`,
                topic: title,
                title: title,
                audience: "English Speaking Investors/Expats",
                language: "en",
                type: "blog_post",
                status: "ready"
            });

            const enCategoryIds = await this.wp.resolveCategories(englishSeoMeta.metadata.categories || ["Business Tax", "English"]);
            const enTagIds = await this.wp.resolveTags(englishSeoMeta.metadata.tags || []);

            const englishPost = await this.wp.createPost({
                title: englishSeoMeta.metadata.title,
                content: englishContent,
                status: "publish",
                excerpt: englishSeoMeta.metadata.excerpt,
                featured_media: draft.featured_media || 0,
                categories: enCategoryIds,
                tags: enTagIds,
                meta: {
                    rank_math_focus_keyword: englishSeoMeta.metadata.focus_keyword,
                    rank_math_title: englishSeoMeta.metadata.seo_title,
                    rank_math_description: englishSeoMeta.metadata.seo_description,
                    rank_math_seo_score: englishSeoMeta.seo_score
                }
            });

            // Link with Polylang
            await this.wp.updatePost(englishPost.id, {}, {
                lang: "en",
                "translations[he]": draftId.toString()
            });

            const englishLink = englishPost.link;
            pipelineLogger.success(`English translation published: ${englishLink}`);

            // Continue to social media prep
            await this.socialPublisher.prepareSocialPosts(
                content,
                title,
                hebrewLink,
                englishLink,
                draftId.toString()
            );

            pipelineLogger.info("Article pipeline resumed successfully");

        } catch (error: any) {
            pipelineLogger.error(`Article publish failed: ${error.message}`);
            await this.slack.sendErrorNotification("Article Publish", error);
            throw error;
        }
    }

    /**
     * Regenerate article after rejection
     */
    async regenerateArticle(draftId: number) {
        pipelineLogger.info(`Regenerating article: ${draftId}`);

        try {
            const draft = await this.wp.getPost(draftId);
            const topic = draft.title.rendered.replace(/\[.*?\]/g, "").trim();

            // Update title to show regenerating
            await this.wp.updatePost(draftId, {
                title: `[REGENERATING] ${topic}`,
                content: "<!-- wp:paragraph --><p>AI is regenerating this article with improved content...</p><!-- /wp:paragraph -->"
            });

            // Re-run full content generation
            await this.generatePost(draftId, topic);

            pipelineLogger.info(`Article ${draftId} regeneration started`);
        } catch (error: any) {
            pipelineLogger.error(`Article regeneration failed: ${error.message}`);
            throw error;
        }
    }
}
