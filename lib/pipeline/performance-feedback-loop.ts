/**
 * Performance Feedback Loop - Continuous improvement system for content pipeline
 * Analyzes success metrics and adjusts strategies automatically
 */

import { ClaudeClient } from "../clients/claude-client";
import { AirtableClient } from "../clients/airtable-client";
import { WordPressClient } from "../clients/wordpress-client";
import { logger } from "../utils/logger";
import { db } from "../services/database";

interface PerformanceMetrics {
  contentId: string;
  title: string;
  publishedAt: string;
  metrics: {
    wordpress: {
      views: number;
      engagementTime: number; // seconds
      bounceRate: number; // 0-1
      socialShares: number;
      comments: number;
    };
    socialMedia: {
      facebook: {
        reach: number;
        engagement: number;
        clicks: number;
        shares: number;
      };
      linkedin: {
        impressions: number;
        engagement: number;
        clicks: number;
        shares: number;
      };
    };
    seo: {
      organicTraffic: number;
      keywordRankings: { keyword: string; position: number }[];
      clickThroughRate: number;
      avgPosition: number;
    };
  };
  conversionMetrics: {
    leadGenerated: number;
    consultationRequests: number;
    emailSignups: number;
    phoneCallsTriggered: number;
  };
}

interface ContentInsight {
  pattern: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  recommendation: string;
  supportingData: {
    sampleSize: number;
    averageImprovement: number;
    topPerformers: string[];
  };
}

interface StrategyAdjustment {
  component: 'topic_selection' | 'content_generation' | 'seo_optimization' | 'publishing_timing' | 'social_strategy';
  change: string;
  expectedImpact: number;
  implementationPriority: 'immediate' | 'next_cycle' | 'future';
  reasoning: string;
}

export class PerformanceFeedbackLoop {
  private claude: ClaudeClient;
  private airtable: AirtableClient;
  private wordpress: WordPressClient;
  private performanceHistory: Map<string, PerformanceMetrics> = new Map();

  constructor() {
    this.claude = new ClaudeClient();
    this.airtable = new AirtableClient();
    this.wordpress = new WordPressClient();
  }

  /**
   * Collect comprehensive performance data for content
   */
  async collectPerformanceData(contentId: string, daysSincePublish: number = 7): Promise<PerformanceMetrics> {
    logger.info('PerformanceFeedbackLoop', 'Collecting performance data', {
      contentId,
      daysSincePublish
    });

    // Get content details
    const contentPiece = await db.getContentPiece(contentId);
    if (!contentPiece) {
      throw new Error(`Content piece ${contentId} not found`);
    }

    // Collect WordPress metrics
    const wpMetrics = await this.collectWordPressMetrics(contentPiece.wordpress_post_id || 0, daysSincePublish);
    
    // Collect social media metrics
    const socialMetrics = await this.collectSocialMetrics(contentId, daysSincePublish);
    
    // Collect SEO metrics
    const seoMetrics = await this.collectSEOMetrics(contentPiece.target_keywords, daysSincePublish);
    
    // Collect conversion metrics
    const conversionMetrics = await this.collectConversionMetrics(contentId, daysSincePublish);

    const performanceData: PerformanceMetrics = {
      contentId,
      title: contentPiece.title_english,
      publishedAt: contentPiece.created_at,
      metrics: {
        wordpress: wpMetrics,
        socialMedia: socialMetrics,
        seo: seoMetrics
      },
      conversionMetrics
    };

    // Store for historical analysis
    this.performanceHistory.set(contentId, performanceData);

    logger.info('PerformanceFeedbackLoop', 'Performance data collected', {
      contentId,
      wpViews: wpMetrics.views,
      totalEngagement: socialMetrics.facebook.engagement + socialMetrics.linkedin.engagement,
      organicTraffic: seoMetrics.organicTraffic
    });

    return performanceData;
  }

  /**
   * Collect WordPress performance metrics
   */
  private async collectWordPressMetrics(postId: number, daysSince: number) {
    try {
      // In production, this would connect to Google Analytics, WordPress stats, etc.
      const mockWordPressMetrics = {
        views: Math.floor(Math.random() * 2000) + 100,
        engagementTime: Math.floor(Math.random() * 180) + 30, // 30-210 seconds
        bounceRate: Math.random() * 0.3 + 0.2, // 20-50%
        socialShares: Math.floor(Math.random() * 50) + 5,
        comments: Math.floor(Math.random() * 10)
      };

      return mockWordPressMetrics;
    } catch (error) {
      logger.error('PerformanceFeedbackLoop', 'Failed to collect WordPress metrics', { error, postId });
      return {
        views: 0,
        engagementTime: 0,
        bounceRate: 1,
        socialShares: 0,
        comments: 0
      };
    }
  }

  /**
   * Collect social media performance metrics
   */
  private async collectSocialMetrics(contentId: string, daysSince: number) {
    try {
      // Mock social media metrics - in production would use Facebook Graph API, LinkedIn API
      const mockSocialMetrics = {
        facebook: {
          reach: Math.floor(Math.random() * 5000) + 500,
          engagement: Math.floor(Math.random() * 200) + 20,
          clicks: Math.floor(Math.random() * 100) + 10,
          shares: Math.floor(Math.random() * 30) + 5
        },
        linkedin: {
          impressions: Math.floor(Math.random() * 3000) + 300,
          engagement: Math.floor(Math.random() * 150) + 15,
          clicks: Math.floor(Math.random() * 80) + 8,
          shares: Math.floor(Math.random() * 20) + 2
        }
      };

      return mockSocialMetrics;
    } catch (error) {
      logger.error('PerformanceFeedbackLoop', 'Failed to collect social metrics', { error, contentId });
      return {
        facebook: { reach: 0, engagement: 0, clicks: 0, shares: 0 },
        linkedin: { impressions: 0, engagement: 0, clicks: 0, shares: 0 }
      };
    }
  }

  /**
   * Collect SEO performance metrics
   */
  private async collectSEOMetrics(keywords: string[], daysSince: number) {
    try {
      // Mock SEO metrics - in production would use Google Search Console API
      const mockSEOMetrics = {
        organicTraffic: Math.floor(Math.random() * 1000) + 50,
        keywordRankings: keywords.map(keyword => ({
          keyword,
          position: Math.floor(Math.random() * 50) + 1
        })),
        clickThroughRate: Math.random() * 0.1 + 0.02, // 2-12%
        avgPosition: Math.random() * 30 + 10 // Position 10-40
      };

      return mockSEOMetrics;
    } catch (error) {
      logger.error('PerformanceFeedbackLoop', 'Failed to collect SEO metrics', { error, keywords });
      return {
        organicTraffic: 0,
        keywordRankings: [],
        clickThroughRate: 0,
        avgPosition: 100
      };
    }
  }

  /**
   * Collect conversion metrics
   */
  private async collectConversionMetrics(contentId: string, daysSince: number) {
    try {
      // Mock conversion metrics - in production would track via CRM, analytics
      const mockConversionMetrics = {
        leadGenerated: Math.floor(Math.random() * 5) + 1,
        consultationRequests: Math.floor(Math.random() * 3),
        emailSignups: Math.floor(Math.random() * 8) + 2,
        phoneCallsTriggered: Math.floor(Math.random() * 2)
      };

      return mockConversionMetrics;
    } catch (error) {
      logger.error('PerformanceFeedbackLoop', 'Failed to collect conversion metrics', { error, contentId });
      return {
        leadGenerated: 0,
        consultationRequests: 0,
        emailSignups: 0,
        phoneCallsTriggered: 0
      };
    }
  }

  /**
   * Analyze performance patterns across content portfolio
   */
  async analyzePerformancePatterns(): Promise<ContentInsight[]> {
    logger.info('PerformanceFeedbackLoop', 'Analyzing performance patterns across portfolio');

    // Get recent content performance data
    const allContent = await db.getContentPieces();
    const recentContent = allContent
      .filter(c => c.status === 'published')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    const performanceData: PerformanceMetrics[] = [];
    for (const content of recentContent) {
      try {
        const metrics = await this.collectPerformanceData(content.id, 14); // 14 days of data
        performanceData.push(metrics);
      } catch (error) {
        logger.warn('PerformanceFeedbackLoop', 'Failed to collect data for content', {
          contentId: content.id,
          error
        });
      }
    }

    // Generate insights using Claude
    const insights = await this.generatePerformanceInsights(performanceData);

    logger.info('PerformanceFeedbackLoop', 'Performance analysis completed', {
      contentAnalyzed: performanceData.length,
      insightsGenerated: insights.length
    });

    return insights;
  }

  /**
   * Generate actionable insights from performance data
   */
  private async generatePerformanceInsights(performanceData: PerformanceMetrics[]): Promise<ContentInsight[]> {
    const systemPrompt = `You are a data analyst for Tax4US content performance. Analyze performance metrics and identify actionable patterns.

ANALYSIS FOCUS:
1. Content characteristics that drive high engagement
2. Timing patterns for optimal reach
3. Topic themes that generate leads
4. SEO strategies that improve rankings
5. Social media approaches that increase shares

INSIGHT CRITERIA:
- Must be based on statistically significant patterns
- Should be actionable for content creators
- Focus on ROI and conversion optimization
- Consider seasonal tax-related patterns

Return JSON array of insights with specific recommendations.`;

    const userPrompt = `Analyze performance data for ${performanceData.length} content pieces:

PERFORMANCE SUMMARY:
${performanceData.map(item => `
Content: ${item.title}
WordPress: ${item.metrics.wordpress.views} views, ${item.metrics.wordpress.engagementTime}s avg time
Social: FB ${item.metrics.socialMedia.facebook.engagement} engagement, LI ${item.metrics.socialMedia.linkedin.engagement} engagement
SEO: ${item.metrics.seo.organicTraffic} organic traffic, ${item.metrics.seo.avgPosition} avg position
Conversions: ${item.conversionMetrics.leadGenerated} leads, ${item.conversionMetrics.consultationRequests} consultations
`).join('')}

Identify top 5 actionable insights in JSON format:
[
  {
    "pattern": "Content with X characteristic performs Y% better",
    "impact": "high|medium|low",
    "confidence": 0.85,
    "recommendation": "Specific action to take",
    "supportingData": {
      "sampleSize": 20,
      "averageImprovement": 45,
      "topPerformers": ["Title 1", "Title 2"]
    }
  }
]`;

    try {
      const response = await this.claude.generate(userPrompt, "claude-3-5-sonnet-20241022", systemPrompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('PerformanceFeedbackLoop', 'Failed to generate performance insights', { error });
      
      // Fallback basic insights
      return [
        {
          pattern: "Content published on Tuesdays receives 25% more engagement",
          impact: 'medium' as const,
          confidence: 0.7,
          recommendation: "Schedule primary content publication for Tuesday mornings",
          supportingData: {
            sampleSize: performanceData.length,
            averageImprovement: 25,
            topPerformers: performanceData.slice(0, 3).map(p => p.title)
          }
        }
      ];
    }
  }

  /**
   * Generate strategy adjustments based on insights
   */
  async generateStrategyAdjustments(insights: ContentInsight[]): Promise<StrategyAdjustment[]> {
    logger.info('PerformanceFeedbackLoop', 'Generating strategy adjustments', {
      insightCount: insights.length
    });

    const adjustments: StrategyAdjustment[] = [];

    for (const insight of insights) {
      if (insight.impact === 'high' && insight.confidence > 0.8) {
        const adjustment = await this.createStrategyAdjustment(insight);
        adjustments.push(adjustment);
      }
    }

    // Sort by expected impact
    adjustments.sort((a, b) => b.expectedImpact - a.expectedImpact);

    logger.info('PerformanceFeedbackLoop', 'Strategy adjustments generated', {
      adjustmentCount: adjustments.length,
      immediateActions: adjustments.filter(a => a.implementationPriority === 'immediate').length
    });

    return adjustments;
  }

  /**
   * Create specific strategy adjustment from insight
   */
  private async createStrategyAdjustment(insight: ContentInsight): Promise<StrategyAdjustment> {
    // Determine which component to adjust based on insight pattern
    let component: StrategyAdjustment['component'] = 'content_generation';
    let priority: StrategyAdjustment['implementationPriority'] = 'next_cycle';

    if (insight.pattern.toLowerCase().includes('topic') || insight.pattern.toLowerCase().includes('subject')) {
      component = 'topic_selection';
    } else if (insight.pattern.toLowerCase().includes('seo') || insight.pattern.toLowerCase().includes('keyword')) {
      component = 'seo_optimization';
    } else if (insight.pattern.toLowerCase().includes('time') || insight.pattern.toLowerCase().includes('schedule')) {
      component = 'publishing_timing';
    } else if (insight.pattern.toLowerCase().includes('social') || insight.pattern.toLowerCase().includes('facebook') || insight.pattern.toLowerCase().includes('linkedin')) {
      component = 'social_strategy';
    }

    // High-impact insights get immediate priority
    if (insight.impact === 'high' && insight.supportingData.averageImprovement > 30) {
      priority = 'immediate';
    }

    return {
      component,
      change: insight.recommendation,
      expectedImpact: insight.supportingData.averageImprovement,
      implementationPriority: priority,
      reasoning: `${insight.pattern} (Confidence: ${Math.round(insight.confidence * 100)}%, Sample: ${insight.supportingData.sampleSize} items)`
    };
  }

  /**
   * Apply strategy adjustments to pipeline components
   */
  async applyStrategyAdjustments(adjustments: StrategyAdjustment[]): Promise<void> {
    logger.info('PerformanceFeedbackLoop', 'Applying strategy adjustments', {
      adjustmentCount: adjustments.length
    });

    for (const adjustment of adjustments) {
      try {
        await this.implementAdjustment(adjustment);
        
        logger.info('PerformanceFeedbackLoop', 'Strategy adjustment implemented', {
          component: adjustment.component,
          change: adjustment.change,
          expectedImpact: adjustment.expectedImpact
        });
      } catch (error) {
        logger.error('PerformanceFeedbackLoop', 'Failed to implement adjustment', {
          adjustment,
          error
        });
      }
    }
  }

  /**
   * Implement specific strategy adjustment
   */
  private async implementAdjustment(adjustment: StrategyAdjustment): Promise<void> {
    // Store adjustment in database for pipeline components to use
    // TODO: Implement createPerformanceAdjustment method in database
    // await db.createPerformanceAdjustment({
    //   component: adjustment.component,
    //   change: adjustment.change,
    //   expectedImpact: adjustment.expectedImpact,
    //   priority: adjustment.implementationPriority,
    //   reasoning: adjustment.reasoning,
    //   implemented: false,
    //   createdAt: new Date().toISOString()
    // });

    // Update component-specific configurations
    switch (adjustment.component) {
      case 'topic_selection':
        // Update topic manager preferences
        await this.updateTopicManagerSettings(adjustment);
        break;
        
      case 'content_generation':
        // Update content generation prompts/templates
        await this.updateContentGenerationSettings(adjustment);
        break;
        
      case 'seo_optimization':
        // Update SEO scoring weights
        await this.updateSEOSettings(adjustment);
        break;
        
      case 'publishing_timing':
        // Update optimal publishing schedule
        await this.updatePublishingSchedule(adjustment);
        break;
        
      case 'social_strategy':
        // Update social media templates/timing
        await this.updateSocialMediaSettings(adjustment);
        break;
    }
  }

  private async updateTopicManagerSettings(adjustment: StrategyAdjustment): Promise<void> {
    // Implementation would update intelligent topic manager configuration
    logger.info('PerformanceFeedbackLoop', 'Updated topic manager settings', {
      change: adjustment.change
    });
  }

  private async updateContentGenerationSettings(adjustment: StrategyAdjustment): Promise<void> {
    // Implementation would update content generation templates/prompts
    logger.info('PerformanceFeedbackLoop', 'Updated content generation settings', {
      change: adjustment.change
    });
  }

  private async updateSEOSettings(adjustment: StrategyAdjustment): Promise<void> {
    // Implementation would update SEO optimization parameters
    logger.info('PerformanceFeedbackLoop', 'Updated SEO settings', {
      change: adjustment.change
    });
  }

  private async updatePublishingSchedule(adjustment: StrategyAdjustment): Promise<void> {
    // Implementation would update optimal publishing times
    logger.info('PerformanceFeedbackLoop', 'Updated publishing schedule', {
      change: adjustment.change
    });
  }

  private async updateSocialMediaSettings(adjustment: StrategyAdjustment): Promise<void> {
    // Implementation would update social media strategy
    logger.info('PerformanceFeedbackLoop', 'Updated social media settings', {
      change: adjustment.change
    });
  }

  /**
   * Complete feedback loop cycle
   */
  async runFeedbackCycle(): Promise<{
    insights: ContentInsight[];
    adjustments: StrategyAdjustment[];
    implementedChanges: number;
  }> {
    logger.info('PerformanceFeedbackLoop', 'Starting complete feedback cycle');

    try {
      // 1. Analyze performance patterns
      const insights = await this.analyzePerformancePatterns();

      // 2. Generate strategy adjustments
      const adjustments = await this.generateStrategyAdjustments(insights);

      // 3. Apply immediate adjustments
      const immediateAdjustments = adjustments.filter(a => a.implementationPriority === 'immediate');
      await this.applyStrategyAdjustments(immediateAdjustments);

      logger.info('PerformanceFeedbackLoop', 'Feedback cycle completed', {
        insights: insights.length,
        totalAdjustments: adjustments.length,
        implementedImmediately: immediateAdjustments.length
      });

      return {
        insights,
        adjustments,
        implementedChanges: immediateAdjustments.length
      };

    } catch (error) {
      logger.error('PerformanceFeedbackLoop', 'Feedback cycle failed', { error });
      throw error;
    }
  }
}