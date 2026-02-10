import { TopicManager } from "./topic-manager";
import { ContentGenerator } from "./content-generator";
import { Translator } from "./translator";
import { MediaProcessor } from "./media-processor";
import { WordPressClient } from "../clients/wordpress-client";
import { AirtableClient } from "../clients/airtable-client";
import { SocialPublisher } from "./social-publisher";
import { PodcastProducer } from "./podcast-producer";

export class PipelineOrchestrator {
    private topicManager: TopicManager;
    private contentGenerator: ContentGenerator;
    private translator: Translator;
    private mediaProcessor: MediaProcessor;
    private wp: WordPressClient;
    private airtable: AirtableClient;
    private socialPublisher: SocialPublisher;
    private podcastProducer: PodcastProducer;

    constructor() {
        this.topicManager = new TopicManager();
        this.contentGenerator = new ContentGenerator();
        this.translator = new Translator();
        this.mediaProcessor = new MediaProcessor();
        this.wp = new WordPressClient();
        this.airtable = new AirtableClient();
        this.socialPublisher = new SocialPublisher();
        this.podcastProducer = new PodcastProducer();
    }

    async runPipelineForTopic(topicId: string) {
        console.log(`Starting pipeline for topic ID: ${topicId}`);

        // 1. Fetch topic details
        const readyTopics = await this.topicManager.fetchReadyTopics();
        const topic = readyTopics.find((t) => t.id === topicId);
        if (!topic) throw new Error(`Topic ${topicId} not found or not ready.`);

        // 2. Research and Plan
        console.log(`Researching and planning for: ${topic.topic}`);
        const plan = await this.topicManager.researchAndPlan(topic);
        const updatedTopic = { ...topic, ...plan };

        // 3. Generate Content
        console.log(`Generating content for: ${updatedTopic.title}`);
        const article = await this.contentGenerator.generateArticle(updatedTopic);

        // 4. Generate Media
        console.log(`Generating and uploading image...`);
        const imageUrl = await this.mediaProcessor.generateAndUploadImage(
            `Professional illustration for a blog post about ${updatedTopic.topic}, clean tax/finance aesthetic`,
            updatedTopic.title || ""
        );

        // 5. Update content with media URL
        let finalContent = article.content.replace("%%FEATURED_IMAGE%%", imageUrl);

        // 6. Update Airtable status to Review for human approval
        console.log(`Updating Airtable record with generated content and status: Review...`);
        await this.airtable.updateRecord("tblq7MDqeogrsdInc", topicId, {
            Status: "Review",
            "Title EN": updatedTopic.title,
            Outline: updatedTopic.outline,
            Keywords: updatedTopic.keywords?.join(", "),
            "Generated Content": finalContent,
            "SEO Score": article.seo_score,
            "Featured Image URL": imageUrl,
            "Slug": article.metadata.slug,
            "Excerpt": article.metadata.excerpt
        });

        console.log(`Pipeline completed: Topic ${topicId} is now in Review.`);
        return { status: "review", topicId };
    }

    async publishApproved(topicId: string) {
        console.log(`Publishing approved topic: ${topicId}`);
        // 1. Fetch record from Airtable
        const records = await this.airtable.getRecords("tblq7MDqeogrsdInc", {
            filterByFormula: `RECORD_ID()='${topicId}'`
        });
        const rec = records[0];
        if (!rec) throw new Error("Record not found.");

        const fields = rec.fields;

        // 2. Publish to WordPress
        const wpPost = await this.wp.createPost({
            title: fields["Title EN"] || fields.Title,
            content: fields["Generated Content"],
            status: "publish",
            slug: fields.Slug,
            excerpt: fields.Excerpt,
        });

        const articleUrl = `https://tax4us.co.il/?p=${wpPost.id}`;

        // 3. Update Airtable status to Published
        await this.airtable.updateRecord("tblq7MDqeogrsdInc", topicId, {
            Status: "Published",
            URL: articleUrl,
        });
        console.log(`Successfully published topic ${topicId} to WordPress.`);

        // --- NEW: Trigger Repurposing Flows ---

        // 4. Generate & Queue Social Media Posts
        console.log(`Generating social media content...`);
        // We pass the raw HTML, the SocialPublisher handles stripping.
        const socialContent = await this.socialPublisher.generateSocialContent(fields["Generated Content"], fields["Title EN"]);

        await this.socialPublisher.publishToAll({
            title: fields["Title EN"],
            text: socialContent.linkedin, // Defaulting to LI, logic can be split
            imageUrl: fields["Featured Image URL"],
            link: articleUrl
        });

        // 5. Produce Podcast Episode
        console.log(`Producing podcast episode...`);
        // We pass the raw HTML, the PodcastProducer handles stripping and scripting.
        await this.podcastProducer.produceFromArticle(fields["Generated Content"], fields["Title EN"]);

        return wpPost;
    }

    async runAutoPilot() {
        console.log("Running autopilot: fetching all ready topics...");
        const topics = await this.topicManager.fetchReadyTopics();
        for (const topic of topics) {
            try {
                await this.runPipelineForTopic(topic.id);
            } catch (error) {
                console.error(`Failed to process topic ${topic.id}:`, error);
            }
        }
    }
}
