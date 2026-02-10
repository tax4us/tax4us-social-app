import { ClaudeClient } from "../clients/claude-client";
import { GutenbergBuilder } from "./gutenberg-builder";
import { SEOScorer } from "../clients/seo-scorer";
import { Translator } from "./translator";
import { Topic, ArticleContent } from "../types/pipeline";

export class ContentGenerator {
  private claude: ClaudeClient;
  private builder: GutenbergBuilder;
  private scorer: SEOScorer;
  private translator: Translator;

  constructor() {
    this.claude = new ClaudeClient();
    this.builder = new GutenbergBuilder();
    this.scorer = new SEOScorer();
    this.translator = new Translator();
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
      Language: English (Always draft in English first)

      Requirements:
      - Use professional yet accessible tone.
      - Focus on practical value for the audience.
      - Include internal/external linking markers like [LINK: label | url].
      - Write in Markdown.
    `;

    const markdownDraft = await this.claude.generate(draftPrompt, "claude-3-5-sonnet-20241022", systemPrompt);

    // 2. Convert Markdown to Gutenberg Blocks (English)
    const englishGutenbergHtml = this.builder.buildArticle(markdownDraft, "");

    // 3. Translate if necessary
    let finalContentHtml = englishGutenbergHtml;
    if (topic.language === "he") {
      finalContentHtml = await this.translator.translateEnToHe(englishGutenbergHtml);
    }

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
      content: finalContentHtml,
      seo_score: score,
    };
  }
}
