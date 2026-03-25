/**
 * Automated Publisher - Intelligent publishing system with confidence scoring
 * Determines when content is ready for automatic vs manual publication
 */

import { ClaudeClient } from "../clients/claude-client";
import { WordPressClient } from "../clients/wordpress-client";
import { SlackClient } from "../clients/slack-client";
import { socialMediaPublisher } from "../services/social-media-publisher";
import { logger } from "../utils/logger";
import { ContentPiece } from "../services/database";

interface PublishingConfidence {
  overallScore: number;
  factors: {
    contentQuality: number;
    seoOptimization: number;
    brandCompliance: number;
    technicalCorrectness: number;
    audienceAlignment: number;
    seasonalRelevance: number;
  };
  recommendations: string[];
  autoPublishSafe: boolean;
}

interface PublishingDecision {
  action: 'auto_publish' | 'request_approval' | 'require_review';
  confidence: PublishingConfidence;
  scheduledTime?: string;
  platforms: string[];
  reasoning: string;
}

interface PublishingResult {
  wordpress: {
    success: boolean;
    postId?: number;
    url?: string;
    error?: string;
  };
  socialMedia: {
    facebook: { success: boolean; postId?: string; error?: string };
    linkedin: { success: boolean; postId?: string; error?: string };
    twitter?: { success: boolean; postId?: string; error?: string };
  };
  overallSuccess: boolean;
  publishedAt: string;
}

export class AutomatedPublisher {
  private claude: ClaudeClient;
  private wordpress: WordPressClient;
  private slack: SlackClient;
  private socialPublisher = socialMediaPublisher;
  private confidenceThresholds = {
    autoPublish: 85,
    requestApproval: 70,
    requireReview: 50
  };

  constructor() {
    this.claude = new ClaudeClient();
    this.wordpress = new WordPressClient();
    this.slack = new SlackClient();
  }

  /**
   * Analyze content quality and calculate publishing confidence
   */
  async calculatePublishingConfidence(contentPiece: ContentPiece): Promise<PublishingConfidence> {
    logger.info('AutomatedPublisher', 'Calculating publishing confidence', {
      contentId: contentPiece.id,
      title: contentPiece.title_english
    });

    const factors = {
      contentQuality: await this.assessContentQuality(contentPiece),
      seoOptimization: await this.assessSEOOptimization(contentPiece),
      brandCompliance: await this.assessBrandCompliance(contentPiece),
      technicalCorrectness: await this.assessTechnicalCorrectness(contentPiece),
      audienceAlignment: await this.assessAudienceAlignment(contentPiece),
      seasonalRelevance: this.assessSeasonalRelevance(contentPiece)
    };

    // Weighted scoring: content quality and SEO are most important
    const weights = {
      contentQuality: 0.25,
      seoOptimization: 0.25,
      brandCompliance: 0.15,
      technicalCorrectness: 0.15,
      audienceAlignment: 0.15,
      seasonalRelevance: 0.05
    };

    const overallScore = Object.entries(factors).reduce(
      (sum, [key, score]) => sum + score * weights[key as keyof typeof weights],
      0
    );

    const recommendations = this.generateRecommendations(factors);
    const autoPublishSafe = overallScore >= this.confidenceThresholds.autoPublish &&
                          factors.contentQuality >= 80 &&
                          factors.technicalCorrectness >= 85;

    return {
      overallScore: Math.round(overallScore),
      factors,
      recommendations,
      autoPublishSafe
    };
  }

  /**
   * Assess content quality using Claude analysis
   */
  private async assessContentQuality(contentPiece: ContentPiece): Promise<number> {
    const systemPrompt = `You are a content quality assessor for Tax4US. Analyze tax-related content for Israeli-Americans and rate quality on a 0-100 scale.

QUALITY CRITERIA:
- Accuracy of tax information
- Clarity and readability
- Practical actionability
- Professional tone
- Logical structure
- Value proposition
- Engagement potential

Return only a JSON object with score and brief reasoning.`;

    const userPrompt = `Analyze this content:

Title (English): ${contentPiece.title_english}
Title (Hebrew): ${contentPiece.title_hebrew || 'Not provided'}
Content: ${((contentPiece.content_english || '') || '').substring(0, 2000)}
Target Keywords: ${contentPiece.target_keywords.join(', ')}

Rate quality 0-100 and provide reasoning:
{
  "score": 85,
  "reasoning": "Brief explanation of score"
}`;

    try {
      const response = await this.claude.generate(userPrompt, "claude-3-5-sonnet-20241022", systemPrompt);
      const analysis = JSON.parse(response);
      return analysis.score;
    } catch (error) {
      logger.error('AutomatedPublisher', 'Content quality assessment failed', { error });
      return 60; // Conservative fallback
    }
  }

  /**
   * Assess SEO optimization
   */
  private async assessSEOOptimization(contentPiece: ContentPiece): Promise<number> {
    let score = 0;

    // Title optimization (0-20 points)
    const titleLength = contentPiece.title_english.length;
    if (titleLength >= 30 && titleLength <= 60) score += 20;
    else if (titleLength >= 20 && titleLength <= 70) score += 15;
    else score += 5;

    // Keyword presence (0-25 points)
    const content = ((contentPiece.content_english || '') || '').toLowerCase();
    const keywordCount = contentPiece.target_keywords.reduce((count, keyword) => {
      return count + (content.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    score += Math.min(keywordCount * 5, 25);

    // Content length (0-20 points)
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 1500) score += 20;
    else if (wordCount >= 1000) score += 15;
    else if (wordCount >= 500) score += 10;
    else score += 5;

    // Structure elements (0-20 points)
    const hasHeaders = content.includes('#') || content.includes('<h');
    const hasLists = content.includes('- ') || content.includes('<ul>') || content.includes('<ol>');
    const hasLinks = content.includes('http') || content.includes('<a ');
    
    if (hasHeaders) score += 7;
    if (hasLists) score += 7;
    if (hasLinks) score += 6;

    // Bilingual content bonus (0-15 points)
    const hasBilingualElements = contentPiece.title_hebrew && (contentPiece.content_hebrew || '');
    if (hasBilingualElements) score += 15;

    return Math.min(score, 100);
  }

  /**
   * Assess brand compliance
   */
  private async assessBrandCompliance(contentPiece: ContentPiece): Promise<number> {
    let score = 0;

    const content = ((contentPiece.content_english || '') || '').toLowerCase();
    const title = contentPiece.title_english.toLowerCase();

    // Brand mentions (0-25 points)
    if (content.includes('tax4us') || title.includes('tax4us')) score += 25;
    else if (content.includes('tax4') || title.includes('tax4')) score += 15;

    // Tax expertise signals (0-25 points)
    const expertiseTerms = ['cpa', 'tax professional', 'expert', 'consultant', 'advisor'];
    const expertiseCount = expertiseTerms.reduce((count, term) => 
      content.includes(term) ? count + 1 : count, 0);
    score += Math.min(expertiseCount * 5, 25);

    // Israeli-American focus (0-25 points)
    const targetTerms = ['israeli', 'israel', 'dual citizen', 'expat', 'foreign'];
    const targetCount = targetTerms.reduce((count, term) => 
      content.includes(term) ? count + 1 : count, 0);
    score += Math.min(targetCount * 5, 25);

    // Professional tone (0-25 points)
    const unprofessionalTerms = ['omg', 'lol', 'wtf', 'awesome', 'amazing', 'incredible'];
    const hasUnprofessional = unprofessionalTerms.some(term => content.includes(term));
    
    if (!hasUnprofessional) {
      const professionalTerms = ['pursuant', 'compliance', 'regulations', 'requirements'];
      const professionalCount = professionalTerms.reduce((count, term) => 
        content.includes(term) ? count + 1 : count, 0);
      score += Math.min(15 + professionalCount * 2, 25);
    } else {
      score += 10; // Penalty for unprofessional language
    }

    return Math.min(score, 100);
  }

  /**
   * Assess technical correctness
   */
  private async assessTechnicalCorrectness(contentPiece: ContentPiece): Promise<number> {
    let score = 90; // Start high, deduct for issues

    const content = (contentPiece.content_english || '') || '';

    // Check for broken links or malformed HTML (deduct 10 points)
    if (content.includes('href=""') || content.includes('<img src="">')) {
      score -= 10;
    }

    // Check for incomplete sentences (deduct 5 points)
    const incompleteSentences = content.match(/\.\s*[a-z]/g) || [];
    if (incompleteSentences.length > 3) {
      score -= 5;
    }

    // Check for missing alt text (deduct 10 points)
    const imagesWithoutAlt = content.match(/<img(?![^>]*alt=)/g) || [];
    if (imagesWithoutAlt.length > 0) {
      score -= 10;
    }

    // Check for basic grammar issues (deduct 15 points)
    const grammarIssues = [
      /\b(there|their|they're)\b/gi,
      /\b(your|you're)\b/gi,
      /\b(its|it's)\b/gi
    ];
    
    let grammarErrors = 0;
    grammarIssues.forEach(pattern => {
      const matches = content.match(pattern) || [];
      grammarErrors += matches.length;
    });
    
    if (grammarErrors > 5) score -= 15;
    else if (grammarErrors > 2) score -= 8;

    // Check for required legal disclaimers (deduct 20 points)
    const hasDisclaimer = content.toLowerCase().includes('consult') && 
                         content.toLowerCase().includes('professional');
    if (!hasDisclaimer) {
      score -= 20;
    }

    return Math.max(score, 0);
  }

  /**
   * Assess audience alignment
   */
  private async assessAudienceAlignment(contentPiece: ContentPiece): Promise<number> {
    let score = 0;

    const content = ((contentPiece.content_english || '') || '').toLowerCase();
    const title = contentPiece.title_english.toLowerCase();

    // Target audience indicators (0-40 points)
    const audienceTerms = {
      'israeli-american': 10,
      'dual citizen': 8,
      'expat': 6,
      'small business': 8,
      'entrepreneur': 6,
      'investor': 6
    };

    Object.entries(audienceTerms).forEach(([term, points]) => {
      if (content.includes(term) || title.includes(term)) {
        score += points;
      }
    });

    // Pain point addressing (0-30 points)
    const painPoints = ['complicated', 'confusing', 'penalty', 'deadline', 'requirement'];
    const painPointCount = painPoints.reduce((count, term) => 
      content.includes(term) ? count + 1 : count, 0);
    score += Math.min(painPointCount * 6, 30);

    // Solution-oriented language (0-30 points)
    const solutionTerms = ['how to', 'step-by-step', 'guide', 'solution', 'help'];
    const solutionCount = solutionTerms.reduce((count, term) => 
      content.includes(term) ? count + 1 : count, 0);
    score += Math.min(solutionCount * 6, 30);

    return Math.min(score, 100);
  }

  /**
   * Assess seasonal relevance
   */
  private assessSeasonalRelevance(contentPiece: ContentPiece): number {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const content = ((contentPiece.content_english || '') || '').toLowerCase();
    const title = contentPiece.title_english.toLowerCase();

    // Tax season relevance (Jan-Apr)
    if (month >= 0 && month <= 3) {
      if (content.includes('fbar') || content.includes('filing') || title.includes('deadline')) {
        return 100;
      }
      if (content.includes('tax return') || content.includes('form')) {
        return 85;
      }
    }

    // Year-end planning (Oct-Dec)
    if (month >= 9 && month <= 11) {
      if (content.includes('year-end') || content.includes('planning') || content.includes('december')) {
        return 95;
      }
    }

    // Mid-year strategies (Jun-Sep)
    if (month >= 5 && month <= 8) {
      if (content.includes('estimated') || content.includes('quarterly')) {
        return 90;
      }
    }

    // General tax content always has baseline relevance
    return 60;
  }

  /**
   * Generate recommendations based on assessment factors
   */
  private generateRecommendations(factors: PublishingConfidence['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.contentQuality < 80) {
      recommendations.push("Content quality below threshold - consider professional review");
    }

    if (factors.seoOptimization < 75) {
      recommendations.push("SEO optimization needed - check title length, keyword density, and structure");
    }

    if (factors.brandCompliance < 70) {
      recommendations.push("Brand compliance issues - ensure Tax4US positioning and professional tone");
    }

    if (factors.technicalCorrectness < 85) {
      recommendations.push("Technical issues detected - verify links, HTML, and legal disclaimers");
    }

    if (factors.audienceAlignment < 70) {
      recommendations.push("Audience alignment concerns - strengthen Israeli-American focus and pain points");
    }

    if (factors.seasonalRelevance < 70) {
      recommendations.push("Consider seasonal relevance - align with current tax calendar");
    }

    return recommendations;
  }

  /**
   * Make publishing decision based on confidence analysis
   */
  async makePublishingDecision(contentPiece: ContentPiece): Promise<PublishingDecision> {
    const confidence = await this.calculatePublishingConfidence(contentPiece);
    const score = confidence.overallScore;

    let action: PublishingDecision['action'];
    let reasoning: string;
    let platforms: string[] = [];

    if (score >= this.confidenceThresholds.autoPublish && confidence.autoPublishSafe) {
      action = 'auto_publish';
      platforms = ['wordpress', 'facebook', 'linkedin'];
      reasoning = `High confidence score (${score}/100) with all quality thresholds met. Safe for automatic publication.`;
    } else if (score >= this.confidenceThresholds.requestApproval) {
      action = 'request_approval';
      platforms = ['wordpress']; // Start with WordPress, await approval for social
      reasoning = `Moderate confidence score (${score}/100). Content ready for WordPress, requesting approval for social media.`;
    } else {
      action = 'require_review';
      platforms = [];
      reasoning = `Low confidence score (${score}/100). Content requires manual review before publication.`;
    }

    // Schedule optimal posting time based on content type and audience
    let scheduledTime: string | undefined;
    if (action === 'auto_publish') {
      const now = new Date();
      const nextTuesday = new Date(now);
      nextTuesday.setDate(now.getDate() + ((2 - now.getDay() + 7) % 7)); // Next Tuesday
      nextTuesday.setHours(10, 0, 0, 0); // 10 AM Israel time
      scheduledTime = nextTuesday.toISOString();
    }

    return {
      action,
      confidence,
      scheduledTime,
      platforms,
      reasoning
    };
  }

  /**
   * Execute publishing decision
   */
  async executePublishing(contentPiece: ContentPiece, decision: PublishingDecision): Promise<PublishingResult> {
    logger.info('AutomatedPublisher', 'Executing publishing decision', {
      contentId: contentPiece.id,
      action: decision.action,
      platforms: decision.platforms,
      confidence: decision.confidence.overallScore
    });

    const result: PublishingResult = {
      wordpress: { success: false },
      socialMedia: {
        facebook: { success: false },
        linkedin: { success: false }
      },
      overallSuccess: false,
      publishedAt: new Date().toISOString()
    };

    try {
      // WordPress publishing
      if (decision.platforms.includes('wordpress')) {
        try {
          // Resolve categories and tags to IDs
          const categoryIds = await this.wordpress.resolveCategories(['Tax Guidance']);
          const tagIds = await this.wordpress.resolveTags(contentPiece.target_keywords);

          const post = await this.wordpress.createPost({
            title: contentPiece.title_english,
            content: (contentPiece.content_english || ''),
            status: decision.action === 'auto_publish' ? 'publish' : 'draft',
            categories: categoryIds,
            tags: tagIds
          });

          result.wordpress = {
            success: true,
            postId: post.id,
            url: post.link
          };

          logger.info('AutomatedPublisher', 'WordPress publication successful', {
            postId: post.id,
            url: post.link
          });
        } catch (error) {
          result.wordpress = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          logger.error('AutomatedPublisher', 'WordPress publication failed', { error });
        }
      }

      // Social media publishing
      if (decision.action === 'auto_publish' && result.wordpress.success) {
        if (decision.platforms.includes('facebook') || decision.platforms.includes('linkedin')) {
          try {
            const mockContentPiece = {
              id: contentPiece.id,
              topic_id: contentPiece.topic_id,
              title_english: contentPiece.title_english,
              title_hebrew: contentPiece.title_hebrew || '',
              content_english: (contentPiece.content_english || ''),
              content_hebrew: (contentPiece.content_hebrew || ''),
              target_keywords: contentPiece.target_keywords,
              status: 'published' as const,
              media_urls: {},
              seo_score: 85,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const socialResults = await this.socialPublisher.publishContentToSocial(mockContentPiece);
            
            const fbResult = socialResults.find(r => r.platform === 'facebook');
            const linkedinResult = socialResults.find(r => r.platform === 'linkedin');

            result.socialMedia.facebook = {
              success: fbResult?.success || false,
              postId: fbResult?.postId,
              error: fbResult?.error
            };

            result.socialMedia.linkedin = {
              success: linkedinResult?.success || false,
              postId: linkedinResult?.postId,
              error: linkedinResult?.error
            };
          } catch (error) {
            result.socialMedia.facebook = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
            result.socialMedia.linkedin = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        }
      }

      // Determine overall success
      result.overallSuccess = result.wordpress.success && 
        (decision.action !== 'auto_publish' || 
         (result.socialMedia.facebook.success && result.socialMedia.linkedin.success));

      // Send notification based on result
      if (decision.action === 'request_approval') {
        await this.slack.sendMessage(
          `📝 *Content Approval Request*\n\n` +
          `**Title:** ${contentPiece.title_english}\n` +
          `**Confidence Score:** ${decision.confidence.overallScore}/100\n` +
          `**WordPress URL:** ${result.wordpress.url}\n` +
          `**Recommendations:** ${decision.confidence.recommendations.join(', ')}\n\n` +
          `Please review and approve for social media publishing.`
        );
      } else if (decision.action === 'require_review') {
        await this.slack.sendMessage(
          `⚠️ *Content Review Required*\n\n` +
          `**Title:** ${contentPiece.title_english}\n` +
          `**Confidence Score:** ${decision.confidence.overallScore}/100\n` +
          `**Issues:** ${decision.confidence.recommendations.join(', ')}\n\n` +
          `Content requires manual review before publication.`
        );
      }

      logger.info('AutomatedPublisher', 'Publishing execution completed', {
        contentId: contentPiece.id,
        overallSuccess: result.overallSuccess,
        wordPressSuccess: result.wordpress.success,
        socialSuccess: result.socialMedia.facebook.success && result.socialMedia.linkedin.success
      });

    } catch (error) {
      logger.error('AutomatedPublisher', 'Publishing execution failed', { 
        error,
        contentId: contentPiece.id 
      });
    }

    return result;
  }

  /**
   * Comprehensive publishing workflow
   */
  async publishContent(contentPiece: ContentPiece): Promise<PublishingResult> {
    logger.info('AutomatedPublisher', 'Starting comprehensive publishing workflow', {
      contentId: contentPiece.id,
      title: contentPiece.title_english
    });

    try {
      // 1. Calculate confidence and make decision
      const decision = await this.makePublishingDecision(contentPiece);

      // 2. Execute publishing based on decision
      const result = await this.executePublishing(contentPiece, decision);

      logger.info('AutomatedPublisher', 'Publishing workflow completed', {
        contentId: contentPiece.id,
        action: decision.action,
        confidence: decision.confidence.overallScore,
        success: result.overallSuccess
      });

      return result;

    } catch (error) {
      logger.error('AutomatedPublisher', 'Publishing workflow failed', {
        error,
        contentId: contentPiece.id
      });

      return {
        wordpress: { success: false, error: 'Workflow failed' },
        socialMedia: {
          facebook: { success: false, error: 'Workflow failed' },
          linkedin: { success: false, error: 'Workflow failed' }
        },
        overallSuccess: false,
        publishedAt: new Date().toISOString()
      };
    }
  }
}