import { ClaudeClient } from "../clients/claude-client";
import { GutenbergBuilder } from "./gutenberg-builder";
import { SEOScorer } from "../clients/seo-scorer";
import { Translator } from "./translator";
import { Topic, ArticleContent } from "../types/pipeline";
import { pipelineLogger } from "./logger";

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
    pipelineLogger.agent(`Stage 1: Initializing deep-reasoning loop for "${topic.topic}"`, topic.id);

    const systemPrompt = `You are an expert U.S.–Israel cross-border tax writer for tax4us.co.il.

WRITING STYLE (MATCH EXACTLY):
Your writing must match the authoritative, factual style of tax4us.co.il's cornerstone content.

✅ DO:
- Be DIRECT and FACTUAL - every sentence delivers information
- Use SPECIFIC NUMBERS (exact thresholds: $10,000, $14,600; exact dates: April 15, October 15)
- Reference actual IRS CODE SECTIONS (e.g., "סעיף 911 לחוק ה-IRC", "סעיף 6038D")
- Provide HISTORICAL CONTEXT ("החובה קיימת מאז שנת 1970...", "החל משנת 2008...")
- Explain TECHNICAL TERMS on first use: "FBAR (Foreign Bank Account Report)"
- Use SHORT PARAGRAPHS (3-5 sentences maximum)
- Include TABLES for numerical data (thresholds, brackets, deadlines)
- Link to OFFICIAL SOURCES (IRS.gov, FinCEN.gov, משרד האוצר)
- Use bold section headers (## in markdown) for scanability

❌ BANNED CLICHÉS - NEVER USE THESE PHRASES:
- "כל מה שצריך לדעת" / "המדריך המלא"
- "חשוב מאוד להבין" / "חשוב לציין ש..."
- "בעולם של היום" / "בעידן המודרני"
- "לא מעט אנשים" / "רבים לא יודעים"
- "השורה התחתונה היא ש..."
- "זה לא סוד ש..." / "כידוע לכל"
- "פשוט וקל" / "בקלות רבה"
- "מומלץ בחום" / "ללא ספק"
- "משנה את כללי המשחק" / "פורץ דרך"
- "בסופו של דבר" / "לסיכום"

AUTHORITATIVE SOURCING (MANDATORY):
ALL factual claims must be verifiable against IRS.gov publications.`;

    // 1. Generate core content draft
    pipelineLogger.agent(`Phase 2.1: Drafting expert content (Sonnet)...`, topic.id);
    const draftPrompt = `
      Write a NEW, non-duplicative blog post in professional Hebrew for tax4us.co.il.
      
      TOPIC: ${topic.topic}
      AUDIENCE: ${topic.audience}
      KEYWORDS: ${topic.keywords?.join(", ")}
      CURRENT YEAR: ${new Date().getFullYear()}
      
      CRITICAL INSTRUCTIONS:
      1. TITLE RULES: No numbers (7 tips), no "Guide to". Use PROVOCATIVE QUESTION or INSIGHT.
      2. STRUCTURE: 6-10 H2 sections. Narrative flow, not a manual.
      3. LENGTH: 2000+ words. Deep dive.
      4. FORMAT: Markdown.
      
      Start directly with the content. No preamble.
    `;

    const generatedContent = await this.claude.generate(draftPrompt, "claude-3-haiku-20240307", systemPrompt);
    pipelineLogger.info(`Draft complete. Length: ${generatedContent.split(/\s+/).length} words.`, topic.id);

    // 2. Convert to Gutenberg
    pipelineLogger.agent(`Stage 3: Structural alignment (Gutenberg conversion)...`, topic.id);
    // Note: The N8N workflow creates Gutenberg blocks directly or parses them. 
    // Our builder handles MD -> Blocks.
    const gutenbergHtml = this.builder.buildArticle(generatedContent, topic.title || topic.topic);

    // 3. SEO Metadata Generation
    pipelineLogger.agent(`Stage 5: SEO Hardening...`, topic.id);
    const seoPrompt = `
      Article: ${generatedContent.substring(0, 5000)}...
      
      Provide SEO metadata JSON: { "title": "...", "excerpt": "...", "focus_keyword": "...", "seo_title": "...", "seo_description": "..." }
      Rules:
      - title: 50–70 chars, Hebrew.
      - focus_keyword: 2-3 Hebrew words.
      - seo_title: Start with keyword.
    `;
    const seoMetadataRaw = await this.claude.generate(seoPrompt, "claude-3-haiku-20240307");

    let seoMetadata;
    try {
      seoMetadata = JSON.parse(seoMetadataRaw);
    } catch (e) {
      // Simple fallback regex if JSON fails
      seoMetadata = {
        title: topic.title,
        excerpt: generatedContent.substring(0, 160),
        focus_keyword: topic.keywords?.[0] || "מיסים בארהב",
        seo_title: topic.title,
        seo_description: generatedContent.substring(0, 160)
      };
    }

    const score = this.scorer.calculateScore(generatedContent, seoMetadata.title, seoMetadata.focus_keyword);
    pipelineLogger.info(`Article ready. Score: ${score}/100.`, topic.id);

    return {
      metadata: {
        ...seoMetadata,
        word_count: generatedContent.split(/\s+/).length,
        status: "generated",
      },
      content: gutenbergHtml,
      seo_score: score,
    };
  }

  async enhanceArticle(content: string, title: string, focusKeyword: string, issues: string[], improvements: string[]): Promise<ArticleContent> {
    pipelineLogger.agent(`Initializing SEO enhancement for: "${title}"`);

    const systemPrompt = `You are an expert SEO Content Editor for tax4us.co.il.
    Your goal is to improve the SEO score of an existing article while maintaining its authoritative and factual tone.
    
    CRITICAL RULES:
    1. Do NOT change the core meaning or tax facts.
    2. Maintain internal/external links already present.
    3. Ensure focus keyword is placed naturally.
    4. Improve heading structure if requested.
    5. Expand content if length is an issue.`;

    const enhancementPrompt = `
      Article Title: ${title}
      Current Focus Keyword: ${focusKeyword}
      
      SEO ISSUES IDENTIFIED:
      ${issues.join("\n")}
      
      REQUIRED IMPROVEMENTS:
      ${improvements.join("\n")}
      
      EXISTING CONTENT:
      ${content}
      
      TASK:
      Rewrite/Enhance the article to fix the identified issues. 
      Ensure output is in professional Hebrew.
      Maintain Gutenberg block structure where possible but add new blocks if needed (especially headings/tables).
      
      Return the IMPROVED content only.
    `;

    const enhancedContent = await this.claude.generate(enhancementPrompt, "claude-3-haiku-20240307", systemPrompt);

    // SEO Metadata Refinement
    const seoPrompt = `
      Article: ${enhancedContent.substring(0, 3000)}...
      Provide updated SEO metadata JSON based on improvements: { "title": "...", "excerpt": "...", "focus_keyword": "...", "seo_title": "...", "seo_description": "..." }
    `;
    const seoMetadataRaw = await this.claude.generate(seoPrompt, "claude-3-haiku-20240307");

    let seoMetadata;
    try {
      seoMetadata = JSON.parse(seoMetadataRaw);
    } catch (e) {
      seoMetadata = {
        title,
        excerpt: enhancedContent.substring(0, 160),
        focus_keyword: focusKeyword,
        seo_title: title,
        seo_description: enhancedContent.substring(0, 160)
      };
    }

    const score = this.scorer.calculateScore(enhancedContent, seoMetadata.title, seoMetadata.focus_keyword);

    return {
      metadata: {
        ...seoMetadata,
        word_count: enhancedContent.split(/\s+/).length,
        status: "optimized",
      },
      content: enhancedContent,
      seo_score: score,
    };
  }

  calculateScore(content: string, title: string, focusKeyword: string) {
    return this.scorer.calculateScore(content, title, focusKeyword);
  }
}
