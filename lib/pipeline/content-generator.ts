import { ClaudeClient } from "../clients/claude-client";
import { GutenbergBuilder } from "./gutenberg-builder";
import { SEOScorer } from "../clients/seo-scorer";
import { Topic, ArticleContent } from "../types/pipeline";

export class ContentGenerator {
    private claude: ClaudeClient;
    private builder: GutenbergBuilder;
    private scorer: SEOScorer;

    constructor() {
        this.claude = new ClaudeClient();
        this.builder = new GutenbergBuilder();
        this.scorer = new SEOScorer();
    }

    async generateArticle(topic: Topic): Promise<ArticleContent> {
        const systemPrompt = "You are a professional Israeli Tax Content Creator for Tax4Us. Your goal is to write high-quality, engaging blog posts in Hebrew (or English as specified) using proper WordPress Gutenberg blocks.";

        // 1. Generate core content draft in Markdown first
        const draftPrompt = `
      Write a comprehensive blog post about: ${topic.topic}
      Title: ${topic.title}
      Target Audience: ${topic.audience}
      Strategy: ${topic.strategy}
      Outline: ${topic.outline}
      Keywords: ${topic.keywords?.join(", ")}
      Language: ${topic.language}

      Requirements:
      - Use professional yet accessible tone.
      - Focus on practical value for the audience.
      - Include internal/external linking markers like [LINK: label | url].
      - Write in Markdown.
    `;

        const markdownDraft = await this.claude.generate(draftPrompt, "claude-3-5-sonnet-20241022", systemPrompt);

        // 2. Convert Markdown to Gutenberg Blocks
        // Note: In a real scenario, we might want Claude to generate the blocks directly or use a more robust parser.
        // For now, we'll use our GutenbergBuilder logic.
        const gutenbergHtml = this.builder.buildArticle(markdownDraft, ""); // Empty media URL for now

        // 3. Optimize for SEO (Simplified: Claude can optimize his own title/excerpt)
        const seoPrompt = `
      Based on this article:
      ${markdownDraft}

      Provide SEO metadata:
      {
        "title": "SEO Optimized Title",
        "excerpt": "Meta description",
        "slug": "url-slug",
        "focus_keyword": "${topic.keywords?.[0] || topic.topic}",
        "keywords": ${JSON.stringify(topic.keywords || [])}
      }
    `;

        const seoMetadataRaw = await this.claude.generate(seoPrompt, "claude-3-5-haiku-20241022");
        const seoMetadata = JSON.parse(seoMetadataRaw);

        // 4. Score the content
        const score = this.scorer.calculateScore(markdownDraft, seoMetadata.title, seoMetadata.focus_keyword);

        return {
            metadata: {
                ...seoMetadata,
                word_count: markdownDraft.split(/\s+/).length,
                h2_count: (markdownDraft.match(/^## /gm) || []).length,
                h3_count: (markdownDraft.match(/^### /gm) || []).length,
                status: "generated",
            },
            content: gutenbergHtml,
            seo_score: score,
        };
    }
}
