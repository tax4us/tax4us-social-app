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

    const isHebrew = topic.language === "he";
    const contentLanguage = isHebrew ? "Hebrew" : "English";
    const keywordLanguage = isHebrew ? "Hebrew" : "English";

    const systemPrompt = `You are an expert U.S.–Israel cross-border tax writer for tax4us.co.il.

WRITING STYLE (MATCH EXACTLY):
Your writing must match the authoritative, factual style of tax4us.co.il's cornerstone content.

✅ DO:
- Be DIRECT and FACTUAL - every sentence delivers information
- Use SPECIFIC NUMBERS (exact thresholds: $10,000, $14,600; exact dates: April 15, October 15)
- Reference actual IRS CODE SECTIONS (e.g., "Section 911 of the IRC", "Section 6038D")
- Provide HISTORICAL CONTEXT ("The requirement has existed since 1970...", "Starting in 2008...")
- Explain TECHNICAL TERMS on first use: "FBAR (Foreign Bank Account Report)"
- Use SHORT PARAGRAPHS (3-5 sentences maximum)
- Include TABLES for numerical data (thresholds, brackets, deadlines) using markdown table syntax
- Use bold section headers (## in markdown) for scanability

MANDATORY LINKING REQUIREMENTS:
You MUST include links in your content. This is critical for SEO.
- Include AT LEAST 3 internal links to tax4us.co.il articles using markdown format: [link text](https://tax4us.co.il/relevant-page/)
  Known internal pages you can link to:
  - https://tax4us.co.il/ (homepage)
  - https://tax4us.co.il/fbar-guide/
  - https://tax4us.co.il/fatca-reporting/
  - https://tax4us.co.il/us-israel-tax-treaty/
  - https://tax4us.co.il/foreign-tax-credit/
  - https://tax4us.co.il/contact/
  - https://tax4us.co.il/about/
  - https://tax4us.co.il/services/
- Include AT LEAST 2 external links to authoritative sources:
  - https://www.irs.gov/ (IRS official site)
  - https://www.fincen.gov/ (FinCEN for FBAR)
  - https://www.ssa.gov/ (Social Security)
  - https://www.treasury.gov/ (US Treasury)

❌ BANNED CLICHÉS - NEVER USE THESE PHRASES:
${isHebrew ? `- "כל מה שצריך לדעת" / "המדריך המלא"
- "חשוב מאוד להבין" / "חשוב לציין ש..."
- "בעולם של היום" / "בעידן המודרני"
- "לא מעט אנשים" / "רבים לא יודעים"
- "השורה התחתונה היא ש..."
- "זה לא סוד ש..." / "כידוע לכל"
- "פשוט וקל" / "בקלות רבה"
- "מומלץ בחום" / "ללא ספק"
- "משנה את כללי המשחק" / "פורץ דרך"
- "בסופו של דבר" / "לסיכום"` : `- "Everything you need to know" / "The complete guide"
- "It's important to understand" / "It's worth noting that..."
- "In today's world" / "In the modern era"  
- "Many people don't know" / "Few people realize"
- "The bottom line is..." / "At the end of the day"
- "It's no secret that..." / "As everyone knows"
- "Simple and easy" / "With great ease"
- "Highly recommended" / "Without a doubt"
- "Game-changing" / "Groundbreaking"
- "In conclusion" / "To sum up"`}

AUTHORITATIVE SOURCING (MANDATORY):
ALL factual claims must be verifiable against IRS.gov publications.`;

    // 1. Generate core content draft
    pipelineLogger.agent(`Phase 2.1: Drafting expert content in ${contentLanguage} (Sonnet)...`, topic.id);
    const draftPrompt = `
      Write a NEW, non-duplicative blog post in professional ${contentLanguage} for tax4us.co.il.
      
      TOPIC: ${topic.topic}
      AUDIENCE: ${topic.audience}
      KEYWORDS: ${topic.keywords?.join(", ")}
      CURRENT YEAR: ${new Date().getFullYear()}
      
      CRITICAL INSTRUCTIONS:
      1. TITLE RULES: Use a PROVOCATIVE QUESTION or INSIGHT that includes the main keyword naturally.
      2. STRUCTURE: 6-10 H2 sections. Narrative flow, not a manual.
      3. LENGTH: 2000+ words. Deep dive.
      4. FORMAT: Markdown with proper links, bold, tables.
      5. LINKS: You MUST include at least 3 internal links to tax4us.co.il pages and 2 external links to IRS.gov/FinCEN.gov/etc.
      6. TABLES: Include at least 1 comparison or data table using markdown syntax.
      
      Start directly with the content. No preamble.
    `;

    const generatedContent = await this.claude.generate(draftPrompt, "claude-3-haiku-20240307", systemPrompt);
    pipelineLogger.info(`Draft complete. Length: ${generatedContent.split(/\s+/).length} words.`, topic.id);

    // 2. Convert to Gutenberg
    pipelineLogger.agent(`Stage 3: Structural alignment (Gutenberg conversion)...`, topic.id);
    const gutenbergHtml = this.builder.buildArticle(generatedContent, topic.title || topic.topic);

    // 3. SEO Metadata Generation (LANGUAGE-AWARE)
    pipelineLogger.agent(`Stage 5: SEO Hardening (${contentLanguage})...`, topic.id);
    const seoPrompt = `
      Article Language: ${contentLanguage}
      Article: ${generatedContent.substring(0, 5000)}...
      
      Provide SEO metadata as JSON. ALL fields must be in ${keywordLanguage}:
      {
        "title": "...",
        "excerpt": "...",
        "focus_keyword": "...",
        "seo_title": "...",
        "seo_description": "...",
        "categories": ["...", "..."],
        "tags": ["...", "..."]
      }
      
      Rules:
      - title: 50–70 chars, in ${keywordLanguage}.
      - focus_keyword: 2-4 words in ${keywordLanguage}. Must appear in the title and article content.
      - seo_title: Start with focus keyword. 50-60 chars.
      - seo_description: Include focus keyword. 150-160 chars.
      - categories: 2-5 relevant categories from this list: ${isHebrew
        ? '["מס הכנסה", "מס נדל\\"ן", "מס עסקים", "FBAR", "FATCA", "ביטוח לאומי", "תכנון מס", "דיווח", "כללי"]'
        : '["Business Tax", "Estate Tax", "Real Estate Tax", "FBAR", "FATCA", "IRS", "Investment Tax", "Penalties", "Reporting", "Retirement", "Tax Planning", "Form 1040", "Form 1116", "Form 8938"]'}
      - tags: 3-8 specific topic tags in ${keywordLanguage}.
      
      Return ONLY the JSON object, no explanation.
    `;
    const seoMetadataRaw = await this.claude.generate(seoPrompt, "claude-3-haiku-20240307");

    let seoMetadata;
    try {
      // Extract JSON from response (Claude sometimes adds preamble)
      const jsonMatch = seoMetadataRaw.match(/\{[\s\S]*\}/);
      seoMetadata = JSON.parse(jsonMatch ? jsonMatch[0] : seoMetadataRaw);
    } catch (e) {
      // Fallback with sensible defaults
      seoMetadata = {
        title: topic.title,
        excerpt: generatedContent.substring(0, 160),
        focus_keyword: isHebrew ? (topic.keywords?.[0] || "מיסים בארהב") : (topic.keywords?.[0] || "US Israel Tax"),
        seo_title: topic.title,
        seo_description: generatedContent.substring(0, 160),
        categories: isHebrew ? ["מס הכנסה", "דיווח"] : ["Business Tax", "Reporting"],
        tags: topic.keywords || []
      };
    }

    // Ensure categories and tags exist even if Claude omits them
    if (!seoMetadata.categories || !Array.isArray(seoMetadata.categories)) {
      seoMetadata.categories = isHebrew ? ["מס הכנסה"] : ["Business Tax"];
    }
    if (!seoMetadata.tags || !Array.isArray(seoMetadata.tags)) {
      seoMetadata.tags = topic.keywords || [];
    }

    const score = this.scorer.calculateScore(gutenbergHtml, seoMetadata.seo_title || seoMetadata.title, seoMetadata.focus_keyword);
    pipelineLogger.info(`Article ready. Score: ${score}/100. Keyword: "${seoMetadata.focus_keyword}" (${keywordLanguage})`, topic.id);

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

    // Detect language from content
    const hebrewChars = (content.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = content.replace(/<[^>]*>/g, '').length;
    const isHebrew = hebrewChars / Math.max(totalChars, 1) > 0.3;
    const contentLanguage = isHebrew ? "Hebrew" : "English";

    const systemPrompt = `You are an expert SEO Content Editor for tax4us.co.il.
    Your goal is to improve the SEO score of an existing article while maintaining its authoritative and factual tone.
    
    CRITICAL RULES:
    1. Do NOT change the core meaning or tax facts.
    2. ADD internal links to tax4us.co.il pages if missing (at least 3).
    3. ADD external links to authoritative sources like IRS.gov, FinCEN.gov (at least 2).
    4. Ensure focus keyword appears in: title, first paragraph, at least one H2 heading, and naturally throughout.
    5. Improve heading structure if requested.
    6. Expand content if length is an issue.
    7. Include at least one data TABLE (markdown format) if not present.
    8. Ensure keyword density between 0.5% and 2.5%.
    
    INTERNAL LINKS TO USE:
    - https://tax4us.co.il/fbar-guide/
    - https://tax4us.co.il/fatca-reporting/
    - https://tax4us.co.il/us-israel-tax-treaty/
    - https://tax4us.co.il/foreign-tax-credit/
    - https://tax4us.co.il/contact/
    - https://tax4us.co.il/services/
    
    EXTERNAL LINKS TO USE:
    - https://www.irs.gov/
    - https://www.fincen.gov/
    - https://www.ssa.gov/`;

    const enhancementPrompt = `
      Article Title: ${title}
      Article Language: ${contentLanguage}
      Current Focus Keyword: ${focusKeyword}
      
      SEO ISSUES IDENTIFIED:
      ${issues.join("\n")}
      
      REQUIRED IMPROVEMENTS:
      ${improvements.join("\n")}
      
      EXISTING CONTENT:
      ${content}
      
      TASK:
      Rewrite/Enhance the article to fix the identified issues. 
      Ensure output is in professional ${contentLanguage}.
      Use markdown format with proper links, bold text, and tables.
      MUST include internal links to tax4us.co.il and external links to IRS.gov etc.
      
      Return the IMPROVED content only.
    `;

    const enhancedContent = await this.claude.generate(enhancementPrompt, "claude-3-haiku-20240307", systemPrompt);

    // SEO Metadata Refinement
    const seoPrompt = `
      Article Language: ${contentLanguage}
      Article: ${enhancedContent.substring(0, 3000)}...
      
      Provide updated SEO metadata JSON. Focus keyword MUST be in ${contentLanguage}:
      {
        "title": "...",
        "excerpt": "...",
        "focus_keyword": "2-4 word keyword in ${contentLanguage}",
        "seo_title": "start with keyword, 50-60 chars",
        "seo_description": "include keyword, 150-160 chars",
        "categories": ["..."],
        "tags": ["..."]
      }
      
      Return ONLY the JSON object.
    `;
    const seoMetadataRaw = await this.claude.generate(seoPrompt, "claude-3-haiku-20240307");

    let seoMetadata;
    try {
      const jsonMatch = seoMetadataRaw.match(/\{[\s\S]*\}/);
      seoMetadata = JSON.parse(jsonMatch ? jsonMatch[0] : seoMetadataRaw);
    } catch (e) {
      seoMetadata = {
        title,
        excerpt: enhancedContent.substring(0, 160),
        focus_keyword: focusKeyword,
        seo_title: title,
        seo_description: enhancedContent.substring(0, 160),
        categories: isHebrew ? ["מס הכנסה"] : ["Business Tax"],
        tags: []
      };
    }

    // Convert enhanced markdown to Gutenberg before scoring
    const gutenbergHtml = this.builder.buildArticle(enhancedContent, seoMetadata.title || title);
    const score = this.scorer.calculateScore(gutenbergHtml, seoMetadata.seo_title || seoMetadata.title, seoMetadata.focus_keyword);

    return {
      metadata: {
        ...seoMetadata,
        word_count: enhancedContent.split(/\s+/).length,
        status: "optimized",
      },
      content: gutenbergHtml,
      seo_score: score,
    };
  }

  calculateScore(content: string, title: string, focusKeyword: string) {
    return this.scorer.calculateScore(content, title, focusKeyword);
  }
}
