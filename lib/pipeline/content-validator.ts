/**
 * Content Validator - Quality Assurance System
 * Ported from n8n content validation workflows
 * Implements comprehensive content QA before publication
 */

import { ClaudeClient } from '../clients/claude-client';
import { SEOScorer } from '../clients/seo-scorer';
import { WordPressClient } from '../clients/wordpress-client';
import { pipelineLogger } from './logger';
import { ArticleContent, Topic } from '../types/pipeline';

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
  recommendations: string[];
  seo_analysis?: any;
  content_analysis?: any;
}

export interface ValidationIssue {
  category: 'critical' | 'warning' | 'suggestion';
  type: 'seo' | 'content' | 'style' | 'compliance';
  message: string;
  location?: string;
  fix?: string;
}

export interface ValidationConfig {
  min_seo_score: number;
  min_word_count: number;
  require_links: boolean;
  require_images: boolean;
  check_tone: boolean;
  check_compliance: boolean;
  language: 'he' | 'en';
}

export class ContentValidator {
  private claude: ClaudeClient;
  private seoScorer: SEOScorer;
  private wordpress: WordPressClient;

  constructor() {
    this.claude = new ClaudeClient();
    this.seoScorer = new SEOScorer();
    this.wordpress = new WordPressClient();
  }

  /**
   * Comprehensive content validation based on n8n QA workflows
   */
  async validateContent(
    content: ArticleContent, 
    topic: Topic, 
    config: ValidationConfig
  ): Promise<ValidationResult> {
    pipelineLogger.agent(`Starting content validation for: ${content.metadata.title}`, topic.id);

    const result: ValidationResult = {
      passed: false,
      score: 0,
      issues: [],
      recommendations: []
    };

    try {
      // 1. SEO Validation (Critical)
      const seoValidation = await this.validateSEO(content, config);
      result.seo_analysis = seoValidation;
      result.issues.push(...seoValidation.issues);

      // 2. Content Structure Validation
      const structureValidation = await this.validateStructure(content, config);
      result.issues.push(...structureValidation.issues);

      // 3. Style and Tone Validation
      if (config.check_tone) {
        const styleValidation = await this.validateStyle(content, topic, config);
        result.issues.push(...styleValidation.issues);
        result.content_analysis = styleValidation;
      }

      // 4. Tax Compliance Validation
      if (config.check_compliance) {
        const complianceValidation = await this.validateTaxCompliance(content, config);
        result.issues.push(...complianceValidation.issues);
      }

      // 5. Link and Media Validation
      const mediaValidation = await this.validateLinksAndMedia(content, config);
      result.issues.push(...mediaValidation.issues);

      // 6. Calculate overall score and determine pass/fail
      result.score = this.calculateValidationScore(result.issues, seoValidation.score);
      result.passed = this.determinePassFail(result.issues, result.score, config);

      // 7. Generate recommendations
      result.recommendations = this.generateRecommendations(result.issues);

      pipelineLogger.info(`Validation complete. Score: ${result.score}% | Passed: ${result.passed}`, topic.id);

    } catch (error: any) {
      result.issues.push({
        category: 'critical',
        type: 'content',
        message: `Validation failed: ${error.message}`,
        fix: 'Review content and try again'
      });
    }

    return result;
  }

  /**
   * SEO validation using the comprehensive SEO scorer
   */
  private async validateSEO(content: ArticleContent, config: ValidationConfig) {
    const analysis = this.seoScorer.analyzeContent(
      content.content,
      content.metadata.title,
      content.metadata.focus_keyword || '',
      content.metadata.seo_title,
      content.metadata.seo_description
    );

    const issues: ValidationIssue[] = [];

    // Convert SEO issues to validation issues
    if (analysis.score < config.min_seo_score) {
      issues.push({
        category: 'critical',
        type: 'seo',
        message: `SEO score too low: ${analysis.score}% (min: ${config.min_seo_score}%)`,
        fix: 'Improve focus keyword usage, content length, and metadata'
      });
    }

    // Add specific SEO issues
    analysis.issues.forEach(issue => {
      issues.push({
        category: issue.includes('❌') ? 'critical' : 'warning',
        type: 'seo',
        message: issue,
        fix: 'See improvements list'
      });
    });

    return {
      score: analysis.score,
      issues,
      metrics: analysis.metrics,
      improvements: analysis.improvements
    };
  }

  /**
   * Content structure validation
   */
  private async validateStructure(content: ArticleContent, config: ValidationConfig) {
    const issues: ValidationIssue[] = [];
    const htmlContent = content.content;
    const wordCount = content.metadata.word_count || 0;

    // Word count validation
    if (wordCount < config.min_word_count) {
      issues.push({
        category: 'critical',
        type: 'content',
        message: `Content too short: ${wordCount} words (min: ${config.min_word_count})`,
        fix: 'Expand content with more detailed information'
      });
    }

    // Heading structure validation
    const h2Count = (htmlContent.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (htmlContent.match(/<h3[^>]*>/gi) || []).length;

    if (h2Count < 3) {
      issues.push({
        category: 'warning',
        type: 'content',
        message: `Insufficient H2 headings: ${h2Count} (recommended: 4+)`,
        fix: 'Add more section headings to improve readability'
      });
    }

    // Paragraph length validation
    const paragraphs = htmlContent.split(/<\/p>/i)
      .map(p => p.replace(/<[^>]*>/g, '').trim())
      .filter(p => p.length > 0);
    
    const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150);
    if (longParagraphs.length > 2) {
      issues.push({
        category: 'warning',
        type: 'content',
        message: `${longParagraphs.length} paragraphs are too long (>150 words)`,
        fix: 'Break long paragraphs into shorter, more digestible sections'
      });
    }

    // List usage validation
    const listCount = (htmlContent.match(/<ul[^>]*>|<ol[^>]*>/gi) || []).length;
    if (wordCount > 1500 && listCount === 0) {
      issues.push({
        category: 'suggestion',
        type: 'content',
        message: 'Long content should include lists for better readability',
        fix: 'Add bullet points or numbered lists where appropriate'
      });
    }

    return { issues };
  }

  /**
   * Style and tone validation using Claude
   */
  private async validateStyle(content: ArticleContent, topic: Topic, config: ValidationConfig) {
    const isHebrew = config.language === 'he';
    const language = isHebrew ? 'Hebrew' : 'English';

    const stylePrompt = `
      You are a content quality auditor for tax4us.co.il. 
      Analyze this ${language} tax content for style and tone compliance.

      REQUIRED STYLE (tax4us.co.il):
      - Authoritative and factual
      - Professional but accessible
      - Specific numbers and dates
      - No marketing clichés
      - Clear, direct language

      CONTENT TO ANALYZE:
      Title: ${content.metadata.title}
      Content: ${content.content.substring(0, 3000)}...

      EVALUATION CRITERIA:
      1. Professional tone (1-10)
      2. Factual accuracy language (1-10)  
      3. Clarity and readability (1-10)
      4. Absence of clichés (1-10)
      5. Tax expertise demonstration (1-10)

      Return JSON:
      {
        "overall_score": number,
        "tone_score": number,
        "clarity_score": number,
        "expertise_score": number,
        "issues": ["issue1", "issue2"],
        "strengths": ["strength1", "strength2"],
        "recommendations": ["rec1", "rec2"]
      }
    `;

    try {
      const analysisRaw = await this.claude.generate(stylePrompt, "claude-3-haiku-20240307");
      const jsonMatch = analysisRaw.match(/\{[\s\S]*\}/);
      const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisRaw);

      const issues: ValidationIssue[] = [];

      if (analysis.overall_score < 7) {
        issues.push({
          category: 'warning',
          type: 'style',
          message: `Style quality below standard: ${analysis.overall_score}/10`,
          fix: 'Review tone and clarity recommendations'
        });
      }

      // Convert Claude analysis to validation issues
      analysis.issues?.forEach((issue: string) => {
        issues.push({
          category: 'suggestion',
          type: 'style',
          message: issue,
          fix: 'Review content style guidelines'
        });
      });

      return {
        issues,
        analysis: analysis
      };

    } catch (error) {
      return {
        issues: [{
          category: 'warning',
          type: 'style',
          message: 'Style validation failed',
          fix: 'Manual style review recommended'
        }]
      };
    }
  }

  /**
   * Tax compliance validation
   */
  private async validateTaxCompliance(content: ArticleContent, config: ValidationConfig) {
    const issues: ValidationIssue[] = [];
    const htmlContent = content.content;

    // Check for tax law references
    const irsReferences = (htmlContent.match(/IRS|Internal Revenue Service|Section \d+/gi) || []).length;
    const codeReferences = (htmlContent.match(/IRC|Tax Code|Section \d+/gi) || []).length;

    if (irsReferences === 0 && codeReferences === 0) {
      issues.push({
        category: 'warning',
        type: 'compliance',
        message: 'No IRS or tax code references found',
        fix: 'Add references to relevant IRS publications or tax code sections'
      });
    }

    // Check for disclaimer or professional advice language
    const hasDisclaimer = htmlContent.toLowerCase().includes('consult') || 
                         htmlContent.toLowerCase().includes('professional') ||
                         htmlContent.toLowerCase().includes('advisor');

    if (!hasDisclaimer) {
      issues.push({
        category: 'suggestion',
        type: 'compliance',
        message: 'Consider adding professional consultation disclaimer',
        fix: 'Add note about consulting tax professionals for specific situations'
      });
    }

    // Check for current year relevance
    const currentYear = new Date().getFullYear();
    const hasCurrentYear = htmlContent.includes(currentYear.toString());
    const hasPreviousYear = htmlContent.includes((currentYear - 1).toString());

    if (!hasCurrentYear && !hasPreviousYear) {
      issues.push({
        category: 'warning',
        type: 'compliance',
        message: 'Content may need current year information',
        fix: 'Verify tax year relevance and update dates/thresholds'
      });
    }

    return { issues };
  }

  /**
   * Links and media validation
   */
  private async validateLinksAndMedia(content: ArticleContent, config: ValidationConfig) {
    const issues: ValidationIssue[] = [];
    const htmlContent = content.content;

    // Internal links validation
    const internalLinks = (htmlContent.match(/href=[\"']https?:\/\/(www\.)?tax4us\.co\.il[^\"']*/gi) || []).length;
    if (config.require_links && internalLinks < 2) {
      issues.push({
        category: 'warning',
        type: 'seo',
        message: `Insufficient internal links: ${internalLinks} (recommended: 3+)`,
        fix: 'Add more links to relevant tax4us.co.il articles'
      });
    }

    // External authority links validation
    const irsLinks = (htmlContent.match(/href=[\"']https?:\/\/[^\"']*irs\.gov[^\"']*/gi) || []).length;
    const govLinks = (htmlContent.match(/href=[\"']https?:\/\/[^\"']*\.gov[^\"']*/gi) || []).length;

    if (govLinks === 0) {
      issues.push({
        category: 'suggestion',
        type: 'seo',
        message: 'No authoritative government links found',
        fix: 'Add links to IRS.gov or other government sources'
      });
    }

    // Image validation
    const images = (htmlContent.match(/<img[^>]*>/gi) || []).length;
    if (config.require_images && images === 0) {
      issues.push({
        category: 'warning',
        type: 'content',
        message: 'No images found in content',
        fix: 'Add relevant images or featured image'
      });
    }

    // Table validation for numerical content
    const tables = (htmlContent.match(/<table[^>]*>/gi) || []).length;
    const hasNumbers = /\$[\d,]+|\d{4}|\d+%/.test(htmlContent);
    if (hasNumbers && tables === 0) {
      issues.push({
        category: 'suggestion',
        type: 'content',
        message: 'Numerical data could benefit from table format',
        fix: 'Consider presenting tax rates, thresholds, or deadlines in tables'
      });
    }

    return { issues };
  }

  /**
   * Calculate overall validation score
   */
  private calculateValidationScore(issues: ValidationIssue[], seoScore: number): number {
    let score = seoScore; // Base score from SEO

    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.category) {
        case 'critical':
          score -= 15;
          break;
        case 'warning':
          score -= 5;
          break;
        case 'suggestion':
          score -= 2;
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine if content passes validation
   */
  private determinePassFail(issues: ValidationIssue[], score: number, config: ValidationConfig): boolean {
    const criticalIssues = issues.filter(i => i.category === 'critical').length;
    
    // Fail if any critical issues or score too low
    if (criticalIssues > 0 || score < config.min_seo_score) {
      return false;
    }

    // Pass if score is good enough and no critical issues
    return score >= config.min_seo_score;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(issues: ValidationIssue[]): string[] {
    const recommendations: string[] = [];
    
    // Group issues by type
    const criticalIssues = issues.filter(i => i.category === 'critical');
    const warningIssues = issues.filter(i => i.category === 'warning');

    if (criticalIssues.length > 0) {
      recommendations.push(`🚨 Fix ${criticalIssues.length} critical issues before publishing`);
    }

    if (warningIssues.length > 0) {
      recommendations.push(`⚠️ Address ${warningIssues.length} warnings to improve quality`);
    }

    // Add specific recommendations based on issue types
    const seoIssues = issues.filter(i => i.type === 'seo').length;
    if (seoIssues > 3) {
      recommendations.push('🎯 Focus on SEO optimization - keyword density and structure');
    }

    const contentIssues = issues.filter(i => i.type === 'content').length;
    if (contentIssues > 2) {
      recommendations.push('📝 Improve content structure and readability');
    }

    const styleIssues = issues.filter(i => i.type === 'style').length;
    if (styleIssues > 0) {
      recommendations.push('✨ Review style guidelines for tax4us.co.il tone');
    }

    return recommendations;
  }

  /**
   * Quick validation for existing WordPress posts
   */
  async validateExistingPost(postId: number, config: ValidationConfig): Promise<ValidationResult> {
    try {
      const post = await this.wordpress.getPost(postId);
      
      const content: ArticleContent = {
        metadata: {
          title: post.title.rendered,
          focus_keyword: post.meta?.rank_math_focus_keyword || '',
          seo_title: post.meta?.rank_math_title || '',
          seo_description: post.meta?.rank_math_description || '',
          word_count: post.content.rendered.replace(/<[^>]*>/g, ' ').split(/\s+/).length,
          status: 'published'
        },
        content: post.content.rendered,
        seo_score: post.meta?.rank_math_seo_score || 0
      };

      const topic: Topic = {
        id: postId.toString(),
        topic: post.title.rendered,
        language: config.language
      };

      return await this.validateContent(content, topic, config);

    } catch (error: any) {
      return {
        passed: false,
        score: 0,
        issues: [{
          category: 'critical',
          type: 'content',
          message: `Failed to validate post ${postId}: ${error.message}`,
          fix: 'Check post exists and is accessible'
        }],
        recommendations: ['Unable to validate - check post status']
      };
    }
  }
}