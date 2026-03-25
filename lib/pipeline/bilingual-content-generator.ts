/**
 * Bilingual Content Generator - Generates Hebrew and English content in parallel
 * Ensures cultural adaptation and terminology consistency across languages
 */

import { ClaudeClient } from "../clients/claude-client";
import { logger } from "../utils/logger";

interface BilingualContent {
  hebrew: {
    title: string;
    content: string;
    excerpt: string;
    keywords: string[];
    seoTitle: string;
    metaDescription: string;
  };
  english: {
    title: string;
    content: string;
    excerpt: string;
    keywords: string[];
    seoTitle: string;
    metaDescription: string;
  };
  sharedMetadata: {
    focusKeyword: string;
    targetAudience: string;
    readingTime: number;
    wordCount: { hebrew: number; english: number };
    seoScore: number;
  };
}

interface TopicContext {
  topic: string;
  reasoning: string;
  keyQuestions: string[];
  seasonalRelevance: number;
  targetAudience: string;
}

export class BilingualContentGenerator {
  private claude: ClaudeClient;
  private taxTerminology = new Map<string, { hebrew: string; english: string }>();

  constructor() {
    this.claude = new ClaudeClient();
    this.initializeTaxTerminology();
  }

  /**
   * Initialize consistent tax terminology across languages
   */
  private initializeTaxTerminology() {
    this.taxTerminology = new Map([
      ['FBAR', { hebrew: 'דיווח FBAR', english: 'FBAR (Foreign Bank Account Report)' }],
      ['FATCA', { hebrew: 'חוק FATCA', english: 'FATCA (Foreign Account Tax Compliance Act)' }],
      ['Form 8938', { hebrew: 'טופס 8938', english: 'Form 8938 (FATCA)' }],
      ['Tax Treaty', { hebrew: 'אמנת מס', english: 'US-Israel Tax Treaty' }],
      ['Exit Tax', { hebrew: 'מס יציאה', english: 'Expatriation Tax (Section 877A)' }],
      ['Foreign Tax Credit', { hebrew: 'זיכוי מס זר', english: 'Foreign Tax Credit (Form 1116)' }],
      ['PFIC', { hebrew: 'חברת השקעה זרה פסיבית (PFIC)', english: 'Passive Foreign Investment Company (PFIC)' }],
      ['CFC', { hebrew: 'חברה זרה מבוקרת', english: 'Controlled Foreign Corporation (CFC)' }],
      ['Estimated Taxes', { hebrew: 'מיסים משוערים', english: 'Quarterly Estimated Taxes' }],
      ['Dual Citizen', { hebrew: 'אזרח דו-לאומי', english: 'Dual Citizen' }]
    ]);
  }

  /**
   * Generate Hebrew content with cultural adaptation for Israeli audience
   */
  private async generateHebrewContent(context: TopicContext): Promise<any> {
    const systemPrompt = `אתה כותב מומחה במיסוי חוצה גבולות ישראל-ארה"ב עבור Tax4US.

סגנון כתיבה נדרש:
- טון מקצועי אך נגיש לקהל הישראלי
- שימוש במונחים מקצועיים בעברית עם הסבר
- דוגמאות ממקרים ממשיים של ישראלים בארה"ב
- התייחסות למערכת המס הישראלית כנקודת השוואה
- שילוב מידע על חוקי המס האמריקניים והישראליים

מבנה נדרש:
1. כותרת מושכת בעברית
2. פתיחה עם סטטיסטיקה או עובדה מעניינת
3. 8+ כותרות משנה עם תוכן מקיף
4. טבלאות עם דדליינים ודרישות
5. דוגמאות מעשיות ממקרי לקוחות (אנונימיים)
6. שאלות נפוצות (FAQ)
7. קריאה לפעולה עם פרטי יצירת קשר

דרישות SEO:
- לפחות 2,500 מילים
- שימוש במילות מפתח טבעיות
- כותרות משנה אופטימליות לחיפוש
- מטא תיאור מושך לקליקים`;

    const userPrompt = `נושא: ${context.topic}

הקשר: ${context.reasoning}

שאלות מרכזיות לטיפול:
${context.keyQuestions.map(q => `• ${q}`).join('\n')}

קהל יעד: ${context.targetAudience}

רלוונטיות עונתית: ${context.seasonalRelevance}/10

משימה: כתוב מאמר מקיף בעברית שמתאים לישראלים החיים בארה"ב או שוקלים מעבר. המאמר צריך להיות המשאב הטוב ביותר באינטרנט בנושא זה.

החזר תשובה בפורמט JSON:
{
  "title": "כותרת המאמר בעברית",
  "content": "תוכן המאמר המלא בעברית במארקדאון",
  "excerpt": "תקציר של 2-3 משפטים",
  "keywords": ["מילת מפתח 1", "מילת מפתח 2", "מילת מפתח 3"],
  "seoTitle": "כותרת SEO אופטימלית (60 תווים מקסימום)",
  "metaDescription": "תיאור מטא (155 תווים מקסימום)"
}`;

    try {
      const response = await this.claude.generate(userPrompt, "claude-3-5-sonnet-20241022", systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('BilingualContentGenerator', 'Hebrew content generation failed', { error });
      throw error;
    }
  }

  /**
   * Generate English content adapted for English-speaking Israeli audience
   */
  private async generateEnglishContent(context: TopicContext): Promise<any> {
    const systemPrompt = `You are an expert US-Israel cross-border tax writer for Tax4US, serving Israeli-Americans and expats.

Writing Style Required:
- Professional yet accessible tone for English-speaking Israelis
- Authoritative expertise with practical guidance
- Real-world examples from Israeli-American tax situations
- Clear explanation of complex US tax concepts
- Cultural sensitivity to Israeli business practices

Content Structure Required:
1. Compelling title that drives clicks
2. Hook opening with relevant statistic or case study
3. 8+ detailed subsections with actionable content
4. Tables with deadlines, thresholds, and requirements
5. Practical examples from client scenarios (anonymized)
6. Comprehensive FAQ section
7. Strong call-to-action with contact information

SEO Requirements:
- Minimum 2,500 words of substantial content
- Natural keyword integration throughout
- Optimized subheadings for featured snippets
- Meta description optimized for click-through rates
- Internal linking to relevant Tax4US resources`;

    const userPrompt = `Topic: ${context.topic}

Context: ${context.reasoning}

Key Questions to Address:
${context.keyQuestions.map(q => `• ${q}`).join('\n')}

Target Audience: ${context.targetAudience}

Seasonal Relevance: ${context.seasonalRelevance}/10

Task: Write a comprehensive English article that serves as the definitive resource for English-speaking Israelis on this topic. The content should be the best available resource on the internet for this specific audience.

Return response in JSON format:
{
  "title": "Article title in English",
  "content": "Full article content in English markdown",
  "excerpt": "Brief 2-3 sentence summary",
  "keywords": ["keyword 1", "keyword 2", "keyword 3"],
  "seoTitle": "SEO optimized title (60 chars max)",
  "metaDescription": "Meta description (155 chars max)"
}`;

    try {
      const response = await this.claude.generate(userPrompt, "claude-3-5-sonnet-20241022", systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('BilingualContentGenerator', 'English content generation failed', { error });
      throw error;
    }
  }

  /**
   * Harmonize terminology across Hebrew and English versions
   */
  private harmonizeTerminology(hebrewContent: any, englishContent: any): { hebrew: any; english: any } {
    // Ensure consistent tax terminology usage
    let harmonizedHebrew = { ...hebrewContent };
    let harmonizedEnglish = { ...englishContent };

    // Apply terminology consistency
    this.taxTerminology.forEach((terms, key) => {
      // Hebrew content should use Hebrew terms consistently
      harmonizedHebrew.content = harmonizedHebrew.content.replace(
        new RegExp(key, 'gi'), 
        terms.hebrew
      );
      
      // English content should use English terms consistently
      harmonizedEnglish.content = harmonizedEnglish.content.replace(
        new RegExp(key, 'gi'), 
        terms.english
      );
    });

    return {
      hebrew: harmonizedHebrew,
      english: harmonizedEnglish
    };
  }

  /**
   * Calculate shared metadata for both versions
   */
  private calculateSharedMetadata(hebrew: any, english: any, context: TopicContext): any {
    const hebrewWordCount = hebrew.content.split(/\s+/).length;
    const englishWordCount = english.content.split(/\s+/).length;
    const avgReadingSpeed = 200; // words per minute
    
    // Calculate SEO score based on content quality indicators
    const seoScore = this.calculateSEOScore(hebrew, english, context);

    return {
      focusKeyword: context.topic.split(' ').slice(0, 2).join(' '),
      targetAudience: context.targetAudience,
      readingTime: Math.ceil((hebrewWordCount + englishWordCount) / 2 / avgReadingSpeed),
      wordCount: {
        hebrew: hebrewWordCount,
        english: englishWordCount
      },
      seoScore
    };
  }

  /**
   * Calculate SEO score based on content quality factors
   */
  private calculateSEOScore(hebrew: any, english: any, context: TopicContext): number {
    let score = 0;

    // Word count scoring (0-25 points)
    const avgWordCount = (hebrew.content.split(/\s+/).length + english.content.split(/\s+/).length) / 2;
    score += Math.min(avgWordCount / 100, 25);

    // Keyword optimization (0-20 points)
    const keywordDensity = this.calculateKeywordDensity(hebrew.content + english.content, context.topic);
    score += Math.min(keywordDensity * 100, 20);

    // Content structure (0-20 points)
    const hasHeaders = (hebrew.content.match(/##/g) || []).length >= 6;
    const hasTables = hebrew.content.includes('|') || english.content.includes('|');
    const hasFAQ = hebrew.content.toLowerCase().includes('שאלות') || english.content.toLowerCase().includes('faq');
    
    if (hasHeaders) score += 8;
    if (hasTables) score += 6;
    if (hasFAQ) score += 6;

    // Seasonal relevance bonus (0-15 points)
    score += context.seasonalRelevance * 1.5;

    // Quality indicators (0-20 points)
    const hasExamples = hebrew.content.includes('דוגמה') || english.content.includes('example');
    const hasStatistics = /\d+%|\$[\d,]+/.test(hebrew.content + english.content);
    const hasActionables = hebrew.content.includes('צעד') || english.content.includes('step');
    
    if (hasExamples) score += 7;
    if (hasStatistics) score += 7;
    if (hasActionables) score += 6;

    return Math.min(Math.round(score), 100);
  }

  private calculateKeywordDensity(content: string, keyword: string): number {
    const words = content.toLowerCase().split(/\s+/);
    const keywordWords = keyword.toLowerCase().split(/\s+/);
    let matches = 0;
    
    for (let i = 0; i <= words.length - keywordWords.length; i++) {
      if (keywordWords.every((kw, idx) => words[i + idx] === kw)) {
        matches++;
      }
    }
    
    return matches / words.length;
  }

  /**
   * Main method: Generate bilingual content in parallel
   */
  async generateBilingualContent(context: TopicContext): Promise<BilingualContent> {
    logger.info('BilingualContentGenerator', 'Starting parallel bilingual generation', { topic: context.topic });

    try {
      // Generate Hebrew and English content in parallel
      const [hebrewRaw, englishRaw] = await Promise.all([
        this.generateHebrewContent(context),
        this.generateEnglishContent(context)
      ]);

      // Harmonize terminology for consistency
      const { hebrew, english } = this.harmonizeTerminology(hebrewRaw, englishRaw);

      // Calculate shared metadata
      const sharedMetadata = this.calculateSharedMetadata(hebrew, english, context);

      logger.info('BilingualContentGenerator', 'Bilingual content generated successfully', {
        hebrewWordCount: sharedMetadata.wordCount.hebrew,
        englishWordCount: sharedMetadata.wordCount.english,
        seoScore: sharedMetadata.seoScore
      });

      return {
        hebrew,
        english,
        sharedMetadata
      };

    } catch (error) {
      logger.error('BilingualContentGenerator', 'Bilingual content generation failed', { error });
      throw error;
    }
  }
}