/**
 * Enhanced State Manager - Robust pipeline state management with error recovery
 * Handles pipeline checkpoints, failure recovery, and state persistence
 */

import { logger } from "../utils/logger";
import { db } from "../services/database";
import { SlackClient } from "../clients/slack-client";

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  dependencies: string[];
  checkpointData?: any;
  estimatedDuration: number; // minutes
}

interface PipelineRun {
  id: string;
  contentId: string;
  triggerType: 'manual' | 'cron' | 'approval' | 'retry';
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  totalDuration?: number;
  stages: Map<string, PipelineStage>;
  checkpoints: Map<string, any>;
  errorHistory: Array<{
    stageId: string;
    error: string;
    timestamp: string;
    recovered: boolean;
  }>;
  metadata: {
    priority: 'low' | 'medium' | 'high';
    source: string;
    contentTitle: string;
  };
}

interface RecoveryStrategy {
  stageId: string;
  strategy: 'retry' | 'skip' | 'manual_intervention' | 'restart_from_checkpoint' | 'graceful_degradation';
  conditions: {
    maxRetries?: number;
    timeoutThreshold?: number;
    errorPattern?: string;
  };
  fallbackAction: 'notify_admin' | 'graceful_degradation' | 'emergency_stop';
}

export class EnhancedStateManager {
  private activeRuns: Map<string, PipelineRun> = new Map();
  private slack: SlackClient;
  private persistenceInterval: NodeJS.Timeout;
  
  // Define standard pipeline stages with dependencies
  private readonly STAGE_DEFINITIONS = {
    'topic_generation': {
      name: 'Topic Generation',
      dependencies: [],
      maxRetries: 3,
      estimatedDuration: 2
    },
    'content_generation': {
      name: 'Content Generation',
      dependencies: ['topic_generation'],
      maxRetries: 2,
      estimatedDuration: 15
    },
    'content_translation': {
      name: 'Bilingual Translation',
      dependencies: ['content_generation'],
      maxRetries: 2,
      estimatedDuration: 8
    },
    'media_processing': {
      name: 'Media Generation',
      dependencies: ['content_generation'],
      maxRetries: 3,
      estimatedDuration: 10
    },
    'wordpress_publishing': {
      name: 'WordPress Publishing',
      dependencies: ['content_generation', 'content_translation'],
      maxRetries: 5,
      estimatedDuration: 3
    },
    'social_preparation': {
      name: 'Social Media Preparation',
      dependencies: ['wordpress_publishing', 'media_processing'],
      maxRetries: 2,
      estimatedDuration: 5
    },
    'social_publishing': {
      name: 'Social Media Publishing',
      dependencies: ['social_preparation'],
      maxRetries: 4,
      estimatedDuration: 7
    },
    'podcast_generation': {
      name: 'Podcast Generation',
      dependencies: ['wordpress_publishing'],
      maxRetries: 3,
      estimatedDuration: 12
    },
    'seo_optimization': {
      name: 'SEO Optimization',
      dependencies: ['wordpress_publishing'],
      maxRetries: 2,
      estimatedDuration: 5
    }
  };

  private readonly RECOVERY_STRATEGIES: RecoveryStrategy[] = [
    {
      stageId: 'content_generation',
      strategy: 'retry',
      conditions: { maxRetries: 2, timeoutThreshold: 20 },
      fallbackAction: 'notify_admin'
    },
    {
      stageId: 'wordpress_publishing',
      strategy: 'retry',
      conditions: { maxRetries: 5, errorPattern: 'network|timeout|connection' },
      fallbackAction: 'notify_admin'
    },
    {
      stageId: 'social_publishing',
      strategy: 'graceful_degradation',
      conditions: { maxRetries: 3 },
      fallbackAction: 'notify_admin'
    },
    {
      stageId: 'media_processing',
      strategy: 'skip',
      conditions: { maxRetries: 3, timeoutThreshold: 15 },
      fallbackAction: 'graceful_degradation'
    }
  ];

  constructor() {
    this.slack = new SlackClient();
    
    // Persist state every 30 seconds
    this.persistenceInterval = setInterval(() => {
      this.persistActiveRuns();
    }, 30000);

    // Load existing runs on startup
    this.loadPersistedRuns();
  }

  /**
   * Start a new pipeline run
   */
  async startPipelineRun(
    contentId: string,
    triggerType: PipelineRun['triggerType'],
    stageIds: string[],
    metadata: PipelineRun['metadata']
  ): Promise<string> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info('EnhancedStateManager', 'Starting new pipeline run', {
      runId,
      contentId,
      triggerType,
      stages: stageIds
    });

    // Initialize stages
    const stages = new Map<string, PipelineStage>();
    for (const stageId of stageIds) {
      const definition = this.STAGE_DEFINITIONS[stageId as keyof typeof this.STAGE_DEFINITIONS];
      if (definition) {
        stages.set(stageId, {
          id: stageId,
          name: definition.name,
          status: 'pending',
          retryCount: 0,
          maxRetries: definition.maxRetries,
          dependencies: definition.dependencies,
          estimatedDuration: definition.estimatedDuration
        });
      }
    }

    const pipelineRun: PipelineRun = {
      id: runId,
      contentId,
      triggerType,
      status: 'initializing',
      startedAt: new Date().toISOString(),
      stages,
      checkpoints: new Map(),
      errorHistory: [],
      metadata
    };

    this.activeRuns.set(runId, pipelineRun);

    // Store initial state
    await this.persistPipelineRun(pipelineRun);

    // Mark as running and determine first stage
    pipelineRun.status = 'running';
    await this.advancePipeline(runId);

    return runId;
  }

  /**
   * Mark a stage as started
   */
  async startStage(runId: string, stageId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found`);
    }

    const stage = run.stages.get(stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found in run ${runId}`);
    }

    // Verify dependencies are completed
    const unmetDependencies = stage.dependencies.filter(depId => {
      const depStage = run.stages.get(depId);
      return !depStage || depStage.status !== 'completed';
    });

    if (unmetDependencies.length > 0) {
      throw new Error(`Cannot start ${stageId}: unmet dependencies ${unmetDependencies.join(', ')}`);
    }

    stage.status = 'running';
    stage.startedAt = new Date().toISOString();

    logger.info('EnhancedStateManager', 'Stage started', {
      runId,
      stageId,
      stageName: stage.name
    });

    await this.persistPipelineRun(run);
  }

  /**
   * Mark a stage as completed with optional checkpoint data
   */
  async completeStage(runId: string, stageId: string, checkpointData?: any): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found`);
    }

    const stage = run.stages.get(stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found in run ${runId}`);
    }

    stage.status = 'completed';
    stage.completedAt = new Date().toISOString();
    stage.checkpointData = checkpointData;

    if (checkpointData) {
      run.checkpoints.set(stageId, checkpointData);
    }

    logger.info('EnhancedStateManager', 'Stage completed', {
      runId,
      stageId,
      stageName: stage.name,
      hasCheckpoint: !!checkpointData
    });

    await this.persistPipelineRun(run);
    await this.advancePipeline(runId);
  }

  /**
   * Mark a stage as failed and handle recovery
   */
  async failStage(runId: string, stageId: string, error: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found`);
    }

    const stage = run.stages.get(stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found in run ${runId}`);
    }

    stage.status = 'failed';
    stage.error = error;
    stage.retryCount++;

    // Add to error history
    run.errorHistory.push({
      stageId,
      error,
      timestamp: new Date().toISOString(),
      recovered: false
    });

    logger.error('EnhancedStateManager', 'Stage failed', {
      runId,
      stageId,
      error,
      retryCount: stage.retryCount,
      maxRetries: stage.maxRetries
    });

    // Determine recovery strategy
    const recoveryStrategy = this.getRecoveryStrategy(stageId, stage, error);
    const recovered = await this.executeRecoveryStrategy(run, stage, recoveryStrategy, error);

    if (recovered) {
      // Mark error as recovered
      run.errorHistory[run.errorHistory.length - 1].recovered = true;
    } else {
      // Recovery failed, pause pipeline
      run.status = 'failed';
      await this.notifyPipelineFailure(run, stageId, error);
    }

    await this.persistPipelineRun(run);
  }

  /**
   * Get appropriate recovery strategy for failed stage
   */
  private getRecoveryStrategy(stageId: string, stage: PipelineStage, error: string): RecoveryStrategy {
    // Find specific recovery strategy
    let strategy = this.RECOVERY_STRATEGIES.find(s => s.stageId === stageId);
    
    if (!strategy) {
      // Default strategy based on stage characteristics
      if (stage.retryCount < stage.maxRetries) {
        return {
          stageId,
          strategy: 'retry',
          conditions: { maxRetries: stage.maxRetries },
          fallbackAction: 'notify_admin'
        };
      } else {
        return {
          stageId,
          strategy: 'manual_intervention',
          conditions: {},
          fallbackAction: 'emergency_stop'
        };
      }
    }

    // Check if strategy conditions are met
    if (strategy.conditions.maxRetries && stage.retryCount >= strategy.conditions.maxRetries) {
      return {
        ...strategy,
        strategy: 'manual_intervention'
      };
    }

    if (strategy.conditions.errorPattern) {
      const pattern = new RegExp(strategy.conditions.errorPattern, 'i');
      if (!pattern.test(error)) {
        return {
          ...strategy,
          strategy: 'manual_intervention'
        };
      }
    }

    return strategy;
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    run: PipelineRun,
    stage: PipelineStage,
    strategy: RecoveryStrategy,
    error: string
  ): Promise<boolean> {
    logger.info('EnhancedStateManager', 'Executing recovery strategy', {
      runId: run.id,
      stageId: stage.id,
      strategy: strategy.strategy
    });

    switch (strategy.strategy) {
      case 'retry':
        stage.status = 'pending';
        stage.error = undefined;
        logger.info('EnhancedStateManager', 'Stage queued for retry', {
          runId: run.id,
          stageId: stage.id,
          retryCount: stage.retryCount
        });
        return true;

      case 'skip':
        stage.status = 'skipped';
        logger.info('EnhancedStateManager', 'Stage skipped due to recovery strategy', {
          runId: run.id,
          stageId: stage.id
        });
        await this.advancePipeline(run.id);
        return true;

      case 'restart_from_checkpoint':
        const checkpointData = run.checkpoints.get(stage.id);
        if (checkpointData) {
          stage.status = 'pending';
          stage.error = undefined;
          stage.checkpointData = checkpointData;
          logger.info('EnhancedStateManager', 'Stage restarted from checkpoint', {
            runId: run.id,
            stageId: stage.id
          });
          return true;
        } else {
          // No checkpoint available, fall through to manual intervention
          logger.warn('EnhancedStateManager', 'No checkpoint available for restart', {
            runId: run.id,
            stageId: stage.id
          });
        }
        break;

      case 'graceful_degradation':
        await this.handleGracefulDegradation(run, stage);
        return true;

      case 'manual_intervention':
        await this.requestManualIntervention(run, stage, error);
        return false;
    }

    // Execute fallback action
    return await this.executeFallbackAction(run, strategy, error);
  }

  /**
   * Handle graceful degradation
   */
  private async handleGracefulDegradation(run: PipelineRun, stage: PipelineStage): Promise<void> {
    // Mark stage as skipped but continue pipeline
    stage.status = 'skipped';
    
    // Notify about degraded functionality
    await this.slack.sendMessage(
      `⚠️ *Pipeline Degraded Gracefully*\n\n` +
      `**Run ID:** ${run.id}\n` +
      `**Content:** ${run.metadata.contentTitle}\n` +
      `**Failed Stage:** ${stage.name}\n` +
      `**Action:** Continuing without this feature\n\n` +
      `The pipeline will complete with reduced functionality.`
    );

    await this.advancePipeline(run.id);
  }

  /**
   * Request manual intervention
   */
  private async requestManualIntervention(run: PipelineRun, stage: PipelineStage, error: string): Promise<void> {
    run.status = 'paused';
    
    await this.slack.sendMessage(
      `🚨 *Manual Intervention Required*\n\n` +
      `**Run ID:** ${run.id}\n` +
      `**Content:** ${run.metadata.contentTitle}\n` +
      `**Failed Stage:** ${stage.name}\n` +
      `**Error:** ${error}\n` +
      `**Retry Count:** ${stage.retryCount}/${stage.maxRetries}\n\n` +
      `**Actions Available:**\n` +
      `• React with 🔄 to retry stage\n` +
      `• React with ⏭️ to skip stage\n` +
      `• React with 🛑 to stop pipeline\n` +
      `• React with 🔧 for manual debug mode\n\n` +
      `Pipeline is **paused** waiting for your decision.`
    );
  }

  /**
   * Execute fallback action
   */
  private async executeFallbackAction(run: PipelineRun, strategy: RecoveryStrategy, error: string): Promise<boolean> {
    switch (strategy.fallbackAction) {
      case 'notify_admin':
        await this.slack.sendErrorNotification('Pipeline Stage Failure', error);
        return false;

      case 'graceful_degradation':
        const stage = run.stages.get(strategy.stageId);
        if (stage) {
          await this.handleGracefulDegradation(run, stage);
          return true;
        }
        return false;

      case 'emergency_stop':
        run.status = 'failed';
        await this.slack.sendMessage(
          `🆘 *Emergency Pipeline Stop*\n\n` +
          `**Run ID:** ${run.id}\n` +
          `**Critical Error:** ${error}\n\n` +
          `Pipeline has been emergency stopped to prevent further issues.`
        );
        return false;

      default:
        return false;
    }
  }

  /**
   * Advance pipeline to next available stage
   */
  private async advancePipeline(runId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run || run.status !== 'running') {
      return;
    }

    // Find next eligible stage
    const eligibleStages = Array.from(run.stages.values()).filter(stage => {
      if (stage.status !== 'pending') return false;
      
      // Check if all dependencies are completed or skipped
      return stage.dependencies.every(depId => {
        const depStage = run.stages.get(depId);
        return depStage && (depStage.status === 'completed' || depStage.status === 'skipped');
      });
    });

    if (eligibleStages.length === 0) {
      // Check if pipeline is complete
      const remainingStages = Array.from(run.stages.values()).filter(
        stage => stage.status === 'pending' || stage.status === 'running'
      );

      if (remainingStages.length === 0) {
        await this.completePipeline(runId);
      }
      
      return;
    }

    // Start first eligible stage (or multiple if they can run in parallel)
    for (const stage of eligibleStages) {
      await this.startStage(runId, stage.id);
      // For now, start one at a time. Could be enhanced for parallel execution
      break;
    }
  }

  /**
   * Complete pipeline run
   */
  private async completePipeline(runId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) return;

    run.status = 'completed';
    run.completedAt = new Date().toISOString();
    run.totalDuration = Math.round(
      (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000 / 60
    );

    const completedStages = Array.from(run.stages.values()).filter(s => s.status === 'completed').length;
    const skippedStages = Array.from(run.stages.values()).filter(s => s.status === 'skipped').length;
    const failedStages = Array.from(run.stages.values()).filter(s => s.status === 'failed').length;

    logger.info('EnhancedStateManager', 'Pipeline completed', {
      runId,
      duration: run.totalDuration,
      completedStages,
      skippedStages,
      failedStages
    });

    await this.slack.sendMessage(
      `✅ *Pipeline Completed*\n\n` +
      `**Content:** ${run.metadata.contentTitle}\n` +
      `**Duration:** ${run.totalDuration} minutes\n` +
      `**Stages Completed:** ${completedStages}\n` +
      `**Stages Skipped:** ${skippedStages}\n` +
      `**Errors Recovered:** ${run.errorHistory.filter(e => e.recovered).length}\n\n` +
      `Content is now fully processed and published.`
    );

    await this.persistPipelineRun(run);
    
    // Clean up from active runs after delay (keep for debugging)
    setTimeout(() => {
      this.activeRuns.delete(runId);
    }, 1000 * 60 * 60 * 24); // Keep for 24 hours
  }

  /**
   * Persist pipeline run to database
   */
  private async persistPipelineRun(run: PipelineRun): Promise<void> {
    try {
      // Convert to database-compatible format
      const dbRun = {
        id: run.id,
        trigger_type: run.triggerType === 'cron' ? 'cron' as const : 'manual' as const,
        pipeline_type: 'content_creation' as const,
        status: run.status === 'initializing' ? 'running' as const : 
               run.status === 'paused' ? 'paused' as const :
               run.status === 'completed' ? 'completed' as const :
               run.status === 'failed' ? 'failed' as const : 'running' as const,
        current_stage: undefined,
        stages_completed: [],
        stages_failed: [],
        logs: [],
        started_at: run.startedAt,
        completed_at: run.completedAt
      };

      await db.updatePipelineRun(run.id, dbRun);
    } catch (error) {
      logger.error('EnhancedStateManager', 'Failed to persist pipeline run', { 
        runId: run.id, 
        error 
      });
    }
  }

  /**
   * Persist all active runs
   */
  private async persistActiveRuns(): Promise<void> {
    const promises = Array.from(this.activeRuns.values()).map(run => 
      this.persistPipelineRun(run)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Load persisted runs on startup
   */
  private async loadPersistedRuns(): Promise<void> {
    try {
      const persistedRuns = await db.getPipelineRuns();
      
      // Filter only running/paused runs and convert to enhanced format
      const activeDbRuns = persistedRuns.filter(r => r.status === 'running' || r.status === 'paused');
      
      for (const dbRun of activeDbRuns) {
        // Convert database run to enhanced pipeline run format
        const run: PipelineRun = {
          id: dbRun.id,
          contentId: dbRun.id, // Use ID as content ID for simplicity
          triggerType: dbRun.trigger_type as 'cron' | 'manual',
          status: dbRun.status as 'running' | 'paused',
          startedAt: dbRun.started_at,
          completedAt: dbRun.completed_at,
          stages: new Map(), // Initialize empty, would need to rebuild from database
          checkpoints: new Map(),
          errorHistory: [],
          metadata: {
            priority: 'medium',
            source: 'enhanced_state_manager',
            contentTitle: 'Restored Pipeline Run'
          }
        };

        this.activeRuns.set(run.id, run);
      }

      logger.info('EnhancedStateManager', 'Loaded persisted pipeline runs', {
        count: activeDbRuns.length
      });
    } catch (error) {
      logger.error('EnhancedStateManager', 'Failed to load persisted runs', { error });
    }
  }

  /**
   * Get pipeline run status
   */
  getPipelineStatus(runId: string): PipelineRun | undefined {
    return this.activeRuns.get(runId);
  }

  /**
   * Get all active pipeline runs
   */
  getActivePipelines(): PipelineRun[] {
    return Array.from(this.activeRuns.values());
  }

  /**
   * Manually retry a failed stage
   */
  async retryStage(runId: string, stageId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found`);
    }

    const stage = run.stages.get(stageId);
    if (!stage || stage.status !== 'failed') {
      throw new Error(`Stage ${stageId} is not in failed state`);
    }

    stage.status = 'pending';
    stage.error = undefined;
    run.status = 'running';

    await this.persistPipelineRun(run);
    await this.advancePipeline(runId);

    logger.info('EnhancedStateManager', 'Stage manually retried', {
      runId,
      stageId
    });
  }

  /**
   * Manually skip a failed stage
   */
  async skipStage(runId: string, stageId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found`);
    }

    const stage = run.stages.get(stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }

    stage.status = 'skipped';
    run.status = 'running';

    await this.persistPipelineRun(run);
    await this.advancePipeline(runId);

    logger.info('EnhancedStateManager', 'Stage manually skipped', {
      runId,
      stageId
    });
  }

  /**
   * Stop pipeline run
   */
  async stopPipeline(runId: string, reason: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Pipeline run ${runId} not found`);
    }

    run.status = 'failed';
    run.completedAt = new Date().toISOString();

    // Mark running stages as failed
    Array.from(run.stages.values()).forEach(stage => {
      if (stage.status === 'running') {
        stage.status = 'failed';
        stage.error = `Pipeline stopped: ${reason}`;
      }
    });

    await this.persistPipelineRun(run);

    logger.info('EnhancedStateManager', 'Pipeline manually stopped', {
      runId,
      reason
    });
  }

  /**
   * Notify pipeline failure
   */
  private async notifyPipelineFailure(run: PipelineRun, stageId: string, error: string): Promise<void> {
    await this.slack.sendMessage(
      `❌ *Pipeline Failed*\n\n` +
      `**Content:** ${run.metadata.contentTitle}\n` +
      `**Run ID:** ${run.id}\n` +
      `**Failed Stage:** ${stageId}\n` +
      `**Error:** ${error}\n` +
      `**Total Duration:** ${Math.round(
        (Date.now() - new Date(run.startedAt).getTime()) / 1000 / 60
      )} minutes\n\n` +
      `Manual intervention may be required to resolve this issue.`
    );
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }
  }
}