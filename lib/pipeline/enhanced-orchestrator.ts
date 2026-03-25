/**
 * Enhanced Pipeline Orchestrator - Integration of all improved components
 * Coordinates the intelligent topic manager, bilingual content generator, 
 * enhanced media processor, automated publisher, and state manager
 */

import { IntelligentTopicManager } from './intelligent-topic-manager';
import { BilingualContentGenerator } from './bilingual-content-generator';
import { EnhancedMediaProcessor } from './enhanced-media-processor';
import { AutomatedPublisher } from './automated-publisher';
import { PerformanceFeedbackLoop } from './performance-feedback-loop';
import { EnhancedStateManager } from './enhanced-state-manager';
import { SlackClient } from '../clients/slack-client';
import { logger } from '../utils/logger';

interface EnhancedPipelineConfig {
  enableIntelligentTopics: boolean;
  enableParallelGeneration: boolean;
  enableAdvancedMedia: boolean;
  enableAutomatedPublishing: boolean;
  enablePerformanceFeedback: boolean;
  confidenceThreshold: number;
}

export class EnhancedPipelineOrchestrator {
  private topicManager: IntelligentTopicManager;
  private contentGenerator: BilingualContentGenerator;
  private mediaProcessor: EnhancedMediaProcessor;
  private publisher: AutomatedPublisher;
  private feedbackLoop: PerformanceFeedbackLoop;
  private stateManager: EnhancedStateManager;
  private slack: SlackClient;

  private config: EnhancedPipelineConfig = {
    enableIntelligentTopics: true,
    enableParallelGeneration: true,
    enableAdvancedMedia: true,
    enableAutomatedPublishing: true,
    enablePerformanceFeedback: true,
    confidenceThreshold: 85
  };

  constructor(config?: Partial<EnhancedPipelineConfig>) {
    this.config = { ...this.config, ...config };
    
    this.topicManager = new IntelligentTopicManager();
    this.contentGenerator = new BilingualContentGenerator();
    this.mediaProcessor = new EnhancedMediaProcessor();
    this.publisher = new AutomatedPublisher();
    this.feedbackLoop = new PerformanceFeedbackLoop();
    this.stateManager = new EnhancedStateManager();
    this.slack = new SlackClient();

    logger.info('EnhancedPipelineOrchestrator', 'Enhanced pipeline initialized', {
      config: this.config
    });
  }

  /**
   * Enhanced Monday/Thursday content creation workflow
   */
  async runEnhancedContentCreation(): Promise<{
    runId: string;
    status: string;
    estimatedCompletion: string;
  }> {
    logger.info('EnhancedPipelineOrchestrator', 'Starting enhanced content creation workflow');

    try {
      // 1. Intelligent Topic Generation
      const topicResult = await this.generateIntelligentTopic();
      
      const contentId = `enhanced_${Date.now()}`;
      const runId = await this.stateManager.startPipelineRun(
        contentId,
        'cron',
        [
          'topic_generation',
          'content_generation', 
          'content_translation',
          'media_processing',
          'wordpress_publishing',
          'social_preparation',
          'social_publishing'
        ],
        {
          priority: 'high',
          source: 'enhanced_orchestrator',
          contentTitle: topicResult.topic
        }
      );

      // 2. Start content generation stage
      await this.stateManager.startStage(runId, 'topic_generation');
      await this.stateManager.completeStage(runId, 'topic_generation', {
        topic: topicResult.topic,
        reasoning: topicResult.reasoning,
        metadata: topicResult.metadata
      });

      // 3. Continue with bilingual content generation
      this.processBilingualContent(runId, topicResult).catch(error => {
        this.stateManager.failStage(runId, 'content_generation', error.message);
      });

      const estimatedCompletion = new Date(Date.now() + 45 * 60 * 1000).toISOString(); // 45 minutes

      return {
        runId,
        status: 'processing',
        estimatedCompletion
      };

    } catch (error) {
      logger.error('EnhancedPipelineOrchestrator', 'Enhanced content creation failed', { error });
      throw error;
    }
  }

  /**
   * Generate intelligent topic with seasonal awareness
   */
  private async generateIntelligentTopic() {
    if (!this.config.enableIntelligentTopics) {
      // Fallback to basic topic generation
      return {
        topic: "US Tax Planning for Israeli-Americans",
        reasoning: "Basic topic generation",
        metadata: {
          seasonalRelevance: 5,
          estimatedTraffic: 1000,
          keyQuestions: ["What are the requirements?", "How to comply?"],
          contentStrategy: "Standard approach"
        }
      };
    }

    return await this.topicManager.generateIntelligentTopic();
  }

  /**
   * Process bilingual content generation
   */
  private async processBilingualContent(runId: string, topicResult: any): Promise<void> {
    try {
      await this.stateManager.startStage(runId, 'content_generation');

      let bilingualContent;
      
      if (this.config.enableParallelGeneration) {
        // Enhanced parallel generation
        bilingualContent = await this.contentGenerator.generateBilingualContent({
          topic: topicResult.topic,
          reasoning: topicResult.reasoning,
          keyQuestions: topicResult.metadata.keyQuestions,
          seasonalRelevance: topicResult.metadata.seasonalRelevance,
          targetAudience: "Israeli-Americans and dual citizens"
        });
      } else {
        // Fallback to sequential generation
        bilingualContent = await this.generateSequentialContent(topicResult);
      }

      await this.stateManager.completeStage(runId, 'content_generation', {
        hebrewContent: bilingualContent.hebrew,
        englishContent: bilingualContent.english,
        sharedMetadata: bilingualContent.sharedMetadata
      });

      // Continue to media processing
      await this.processEnhancedMedia(runId, bilingualContent);

    } catch (error) {
      logger.error('EnhancedPipelineOrchestrator', 'Bilingual content generation failed', { error });
      throw error;
    }
  }

  /**
   * Fallback sequential content generation
   */
  private async generateSequentialContent(topicResult: any) {
    // Simple sequential generation for fallback
    const mockContentPiece = {
      id: `temp_${Date.now()}`,
      title_english: topicResult.topic,
      title_hebrew: `מדריך: ${topicResult.topic}`,
      content_english: `Comprehensive guide about ${topicResult.topic}...`,
      content_hebrew: '',
      target_keywords: ['tax', 'israel', 'usa'],
      status: 'draft' as const,
      media_urls: {},
      seo_score: 85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return {
      hebrew: {
        title: mockContentPiece.title_hebrew,
        content: mockContentPiece.content_english,
        excerpt: "סקירה מקיפה של נושאי מס עבור ישראלים-אמריקאים",
        keywords: mockContentPiece.target_keywords,
        seoTitle: mockContentPiece.title_hebrew,
        metaDescription: "מידע חיוני על מיסוי עבור ישראלים החיים בארה\"ב"
      },
      english: {
        title: mockContentPiece.title_english,
        content: mockContentPiece.content_english,
        excerpt: "Comprehensive overview of tax topics for Israeli-Americans",
        keywords: mockContentPiece.target_keywords,
        seoTitle: mockContentPiece.title_english,
        metaDescription: "Essential tax information for Israelis living in the US"
      },
      sharedMetadata: {
        focusKeyword: topicResult.topic.split(' ').slice(0, 2).join(' '),
        targetAudience: "Israeli-Americans",
        readingTime: 8,
        wordCount: { hebrew: 1500, english: 1800 },
        seoScore: 85
      }
    };
  }

  /**
   * Process enhanced media generation
   */
  private async processEnhancedMedia(runId: string, bilingualContent: any): Promise<void> {
    try {
      await this.stateManager.startStage(runId, 'media_processing');

      if (this.config.enableAdvancedMedia) {
        // Create mock content piece for media processing
        const contentPiece = {
          id: runId,
          topic_id: runId,
          title_english: bilingualContent.english.title,
          title_hebrew: bilingualContent.hebrew.title,
          content_english: bilingualContent.english.content,
          content_hebrew: bilingualContent.hebrew.content,
          target_keywords: bilingualContent.english.keywords,
          status: 'draft' as const,
          media_urls: {},
          seo_score: bilingualContent.sharedMetadata.seoScore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const mediaResult = await this.mediaProcessor.processContentMedia(contentPiece);
        
        await this.stateManager.completeStage(runId, 'media_processing', {
          mediaResult,
          videoAssets: mediaResult.videos
        });

        if (mediaResult.status === 'pending_approval') {
          // Pause pipeline for video approval
          logger.info('EnhancedPipelineOrchestrator', 'Pipeline paused for video approval', { runId });
          return;
        }
      } else {
        // Skip media processing
        await this.stateManager.completeStage(runId, 'media_processing', {
          skipped: true,
          reason: 'Advanced media disabled'
        });
      }

      // Continue to publishing
      await this.processAutomatedPublishing(runId, bilingualContent);

    } catch (error) {
      logger.error('EnhancedPipelineOrchestrator', 'Enhanced media processing failed', { error });
      throw error;
    }
  }

  /**
   * Process automated publishing with confidence scoring
   */
  private async processAutomatedPublishing(runId: string, bilingualContent: any): Promise<void> {
    try {
      await this.stateManager.startStage(runId, 'wordpress_publishing');

      if (this.config.enableAutomatedPublishing) {
        // Create mock content piece for publishing
        const contentPiece = {
          id: runId,
          topic_id: runId,
          title_english: bilingualContent.english.title,
          title_hebrew: bilingualContent.hebrew.title,
          content_english: bilingualContent.english.content,
          content_hebrew: bilingualContent.hebrew.content,
          target_keywords: bilingualContent.english.keywords,
          status: 'draft' as const,
          media_urls: {},
          seo_score: bilingualContent.sharedMetadata.seoScore,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const publishingResult = await this.publisher.publishContent(contentPiece);
        
        await this.stateManager.completeStage(runId, 'wordpress_publishing', {
          publishingResult,
          wordPressUrl: publishingResult.wordpress.url
        });

        if (publishingResult.overallSuccess) {
          // Continue to social media
          await this.processSocialPublishing(runId, publishingResult);
        } else {
          await this.stateManager.failStage(runId, 'wordpress_publishing', 'Publishing failed');
        }
      } else {
        // Manual publishing mode
        await this.stateManager.completeStage(runId, 'wordpress_publishing', {
          manualReview: true,
          reason: 'Automated publishing disabled'
        });
      }

    } catch (error) {
      logger.error('EnhancedPipelineOrchestrator', 'Automated publishing failed', { error });
      throw error;
    }
  }

  /**
   * Process social media publishing
   */
  private async processSocialPublishing(runId: string, publishingResult: any): Promise<void> {
    try {
      await this.stateManager.startStage(runId, 'social_publishing');

      // Social publishing logic would go here
      // For now, mark as completed
      await this.stateManager.completeStage(runId, 'social_publishing', {
        facebookSuccess: publishingResult.socialMedia.facebook.success,
        linkedinSuccess: publishingResult.socialMedia.linkedin.success
      });

    } catch (error) {
      await this.stateManager.failStage(runId, 'social_publishing', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Run performance feedback loop (weekly)
   */
  async runPerformanceFeedback(): Promise<void> {
    if (!this.config.enablePerformanceFeedback) {
      logger.info('EnhancedPipelineOrchestrator', 'Performance feedback disabled');
      return;
    }

    try {
      logger.info('EnhancedPipelineOrchestrator', 'Starting performance feedback cycle');
      
      const feedbackResult = await this.feedbackLoop.runFeedbackCycle();
      
      await this.slack.sendMessage(
        `📊 *Performance Feedback Cycle Complete*\n\n` +
        `**Insights Generated:** ${feedbackResult.insights.length}\n` +
        `**Strategy Adjustments:** ${feedbackResult.adjustments.length}\n` +
        `**Immediate Changes Applied:** ${feedbackResult.implementedChanges}\n\n` +
        `The pipeline has been optimized based on recent performance data.`
      );

      logger.info('EnhancedPipelineOrchestrator', 'Performance feedback cycle completed', {
        insights: feedbackResult.insights.length,
        adjustments: feedbackResult.adjustments.length,
        implementedChanges: feedbackResult.implementedChanges
      });

    } catch (error) {
      logger.error('EnhancedPipelineOrchestrator', 'Performance feedback failed', { error });
      await this.slack.sendErrorNotification('Performance Feedback Loop', error);
    }
  }

  /**
   * Handle video approval callback
   */
  async handleVideoApproval(taskId: string, approved: boolean, feedback?: string): Promise<void> {
    await this.mediaProcessor.handleVideoApproval(taskId, approved, feedback);
    
    // Find associated pipeline run and continue
    const activeRuns = this.stateManager.getActivePipelines();
    const associatedRun = activeRuns.find(run => 
      run.checkpoints.has('media_processing') &&
      run.checkpoints.get('media_processing')?.mediaResult?.taskId === taskId
    );

    if (associatedRun && approved) {
      // Continue pipeline after video approval
      await this.processAutomatedPublishing(
        associatedRun.id, 
        associatedRun.checkpoints.get('content_generation')
      );
    }
  }

  /**
   * Get enhanced pipeline status
   */
  getEnhancedStatus(runId: string) {
    const pipelineStatus = this.stateManager.getPipelineStatus(runId);
    
    if (!pipelineStatus) {
      return { error: 'Pipeline run not found' };
    }

    const stageStatuses = Array.from(pipelineStatus.stages.entries()).map(([id, stage]) => ({
      id,
      name: stage.name,
      status: stage.status,
      progress: this.calculateStageProgress(stage),
      error: stage.error,
      retryCount: stage.retryCount
    }));

    return {
      runId: pipelineStatus.id,
      status: pipelineStatus.status,
      progress: this.calculateOverallProgress(pipelineStatus),
      stages: stageStatuses,
      errorCount: pipelineStatus.errorHistory.length,
      recoveredErrors: pipelineStatus.errorHistory.filter(e => e.recovered).length,
      estimatedTimeRemaining: this.estimateTimeRemaining(pipelineStatus)
    };
  }

  /**
   * Calculate stage progress percentage
   */
  private calculateStageProgress(stage: any): number {
    switch (stage.status) {
      case 'completed': return 100;
      case 'running': return 50; // Rough estimate
      case 'failed': return stage.retryCount > 0 ? 25 : 0;
      case 'skipped': return 100;
      default: return 0;
    }
  }

  /**
   * Calculate overall pipeline progress
   */
  private calculateOverallProgress(run: any): number {
    const stages = Array.from(run.stages.values());
    const totalProgress = stages.reduce((sum: number, stage) => sum + this.calculateStageProgress(stage), 0);
    return Math.round(totalProgress / stages.length);
  }

  /**
   * Estimate time remaining for pipeline
   */
  private estimateTimeRemaining(run: any): number {
    const stages = Array.from(run.stages.values());
    const remainingStages = stages.filter((s: any) => s.status === 'pending' || s.status === 'running');
    
    return remainingStages.reduce((total: number, stage: any) => {
      const estimatedMinutes = stage.status === 'running' ? stage.estimatedDuration / 2 : stage.estimatedDuration;
      return total + estimatedMinutes;
    }, 0);
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.stateManager.destroy();
    logger.info('EnhancedPipelineOrchestrator', 'Enhanced pipeline orchestrator destroyed');
  }
}