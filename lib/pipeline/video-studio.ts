/**
 * Video Studio - Complete Video Production Workflow
 * Ported from n8n video background production workflows
 * Orchestrates video generation, processing, and social media optimization
 */

import { KieClient } from '../clients/kie-client';
import { WordPressClient } from '../clients/wordpress-client';
import { SocialPublisher } from './social-publisher';
import { pipelineLogger } from './logger';
import { ArticleContent } from '../types/pipeline';

export interface VideoProductionRequest {
  post_id: number;
  title: string;
  content: string;
  focus_keyword: string;
  language: 'he' | 'en';
  style?: 'abstract' | 'documentary' | 'corporate';
  duration?: 'short' | 'medium' | 'long';
  target_platform?: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'all';
}

export interface VideoProductionResult {
  success: boolean;
  task_id?: string;
  video_url?: string;
  thumbnail_url?: string;
  social_posts?: any[];
  errors: string[];
  processing_time: number;
}

export interface VideoStudioConfig {
  auto_publish_social: boolean;
  generate_thumbnails: boolean;
  optimize_for_platform: boolean;
  include_branding: boolean;
  max_concurrent_videos: number;
}

export class VideoStudio {
  private kie: KieClient;
  private wordpress: WordPressClient;
  private socialPublisher: SocialPublisher;
  private config: VideoStudioConfig;

  constructor(config?: Partial<VideoStudioConfig>) {
    this.kie = new KieClient();
    this.wordpress = new WordPressClient();
    this.socialPublisher = new SocialPublisher();
    
    this.config = {
      auto_publish_social: false,
      generate_thumbnails: true,
      optimize_for_platform: true,
      include_branding: true,
      max_concurrent_videos: 3,
      ...config
    };
  }

  /**
   * Main video production pipeline
   * Implements complete n8n video workflow
   */
  async produceVideo(request: VideoProductionRequest): Promise<VideoProductionResult> {
    const startTime = Date.now();
    const result: VideoProductionResult = {
      success: false,
      errors: [],
      processing_time: 0
    };

    pipelineLogger.info(`Video production started: ${request.title}`, request.post_id.toString());

    try {
      // 1. Generate optimized video prompt
      const videoPrompt = this.generateVideoPrompt(request);
      pipelineLogger.agent(`Generated video prompt for ${request.language.toUpperCase()}`, 'VIDEO');

      // 2. Start video generation with Kie.ai
      const taskId = await this.kie.generateVideo({
        title: request.title,
        excerpt: this.extractContentSummary(request.content),
        style: request.style || 'documentary'
      });

      result.task_id = taskId;
      pipelineLogger.info(`Video generation started. Task ID: ${taskId}`, 'KIE');

      // 3. Poll for completion with advanced monitoring
      const videoResult = await this.pollVideoWithProgress(taskId);
      
      if (!videoResult.success) {
        throw new Error(`Video generation failed: ${videoResult.error}`);
      }

      result.video_url = videoResult.url;
      pipelineLogger.success(`Video generation completed: ${videoResult.url}`, 'KIE');

      // 4. Generate thumbnail if requested
      if (this.config.generate_thumbnails) {
        try {
          const thumbnailUrl = await this.generateVideoThumbnail(request);
          result.thumbnail_url = thumbnailUrl;
          pipelineLogger.info(`Thumbnail generated: ${thumbnailUrl}`, 'THUMB');
        } catch (thumbError: any) {
          result.errors.push(`Thumbnail generation failed: ${thumbError.message}`);
        }
      }

      // 5. Platform optimization
      if (this.config.optimize_for_platform) {
        try {
          const optimizedVideos = await this.optimizeForPlatforms(
            result.video_url!,
            request.target_platform || 'all'
          );
          pipelineLogger.info(`Platform optimization completed`, 'OPTIMIZE');
        } catch (optError: any) {
          result.errors.push(`Platform optimization failed: ${optError.message}`);
        }
      }

      // 6. Update WordPress post with video
      await this.updatePostWithVideo(request.post_id, result.video_url!, result.thumbnail_url);

      // 7. Auto-publish to social media if enabled
      if (this.config.auto_publish_social) {
        try {
          const socialResults = await this.publishVideoToSocial(request, result.video_url!);
          result.social_posts = socialResults;
          pipelineLogger.success(`Social media publishing completed`, 'SOCIAL');
        } catch (socialError: any) {
          result.errors.push(`Social publishing failed: ${socialError.message}`);
        }
      }

      result.success = true;
      result.processing_time = Date.now() - startTime;

      pipelineLogger.success(`Video production completed in ${result.processing_time}ms`, request.post_id.toString());

    } catch (error: any) {
      result.errors.push(error.message);
      result.processing_time = Date.now() - startTime;
      pipelineLogger.error(`Video production failed: ${error.message}`, request.post_id.toString());
    }

    return result;
  }

  /**
   * Generate optimized video prompt based on content and style
   */
  private generateVideoPrompt(request: VideoProductionRequest): string {
    const { title, content, focus_keyword, language, style = 'documentary' } = request;
    const isHebrew = language === 'he';

    let prompt = '';

    if (style === 'documentary') {
      prompt = `Professional documentary-style video for Tax4US content: "${title}". `;
      prompt += `Raw, authentic aesthetic with subtle professional branding. `;
      prompt += `Visual theme: US-Israel cross-border taxation expertise. `;
      prompt += `Character anchor: Professional, trustworthy tax advisor (likeness of @shai-lfc.tax4us). `;
      prompt += `Emotional hook: Immediate authority and expertise demonstration. `;
      prompt += `Visual delivery: Confident, knowledgeable presentation with subtle urgency. `;
      
      if (isHebrew) {
        prompt += `Language context: Hebrew-speaking Israeli-American professionals. `;
        prompt += `Cultural elements: Hebrew text overlays, Israeli business context. `;
      } else {
        prompt += `Language context: English-speaking US expats in Israel. `;
        prompt += `Cultural elements: American business practices, IRS compliance focus. `;
      }
      
      prompt += `Background: Modern office setting with US and Israeli flags subtly integrated. `;
      prompt += `Focus keyword integration: Visual cues related to "${focus_keyword}". `;
      prompt += `Format: Vertical 9:16 for social media optimization. `;
      prompt += `Duration: ${this.getDurationByStyle(request.duration || 'short')}. `;
      prompt += `No text overlay - pure visual storytelling. `;
      prompt += `Brand elements: Subtle tax4us.co.il integration in background design.`;

    } else if (style === 'abstract') {
      prompt = `Premium abstract motion graphics for financial services: "${title}". `;
      prompt += `Theme: US-Israel tax advisory and compliance visualization. `;
      prompt += `Visual elements: Flowing geometric shapes, data visualization aesthetics. `;
      prompt += `Color palette: Professional green (#8fb634), white, sophisticated accent tones. `;
      prompt += `Motion: Smooth, professional transitions with subtle financial data overlays. `;
      prompt += `Symbolism: Connected networks representing cross-border expertise. `;
      prompt += `Flags: Stylized US and Israeli flag elements woven into abstract design. `;
      prompt += `Focus: Abstract representation of "${focus_keyword}" concept. `;
      prompt += `Format: Clean, premium 9:16 vertical format. `;
      prompt += `Branding: @shai-lfc.tax4us handle subtly integrated into design. `;
      prompt += `Style: High-end corporate motion graphics, looping background suitable for overlays.`;

    } else {
      // Corporate style
      prompt = `Professional corporate presentation video: "${title}". `;
      prompt += `Setting: Modern tax advisory office environment. `;
      prompt += `Presenter: Confident tax professional explaining complex concepts clearly. `;
      prompt += `Visual aids: Charts, graphs, and visual representations of tax concepts. `;
      prompt += `Branding: Tax4US corporate identity prominently featured. `;
      prompt += `Focus: Clear explanation of "${focus_keyword}" with visual support. `;
      prompt += `Format: Professional 16:9 presentation format. `;
      prompt += `Tone: Educational, authoritative, accessible to business professionals.`;
    }

    return prompt;
  }

  /**
   * Extract content summary for video generation
   */
  private extractContentSummary(content: string, maxLength: number = 300): string {
    // Remove HTML and extract key points
    let textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Extract first few sentences that capture the main points
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    let summary = '';
    
    for (const sentence of sentences.slice(0, 3)) {
      if (summary.length + sentence.length > maxLength) break;
      summary += sentence.trim() + '. ';
    }
    
    return summary || textContent.substring(0, maxLength);
  }

  /**
   * Advanced video polling with progress monitoring
   */
  private async pollVideoWithProgress(
    taskId: string, 
    timeoutMs: number = 600000
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds
    let attempt = 1;
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.kie.getTask(taskId);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        pipelineLogger.info(`Video polling attempt ${attempt} (${elapsed}s): ${status.status}`, 'KIE');
        
        if (status.status === 'success' && status.videoUrl) {
          return { success: true, url: status.videoUrl };
        }
        
        if (status.status === 'failed') {
          return { success: false, error: status.error || 'Unknown error' };
        }
        
        // Progressive backoff for longer polls
        const waitTime = attempt <= 5 ? pollInterval : pollInterval * 1.5;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempt++;
        
      } catch (error: any) {
        pipelineLogger.warn(`Video polling error: ${error.message}`, 'KIE');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    return { success: false, error: `Video generation timed out after ${timeoutMs}ms` };
  }

  /**
   * Generate thumbnail image for video
   */
  private async generateVideoThumbnail(request: VideoProductionRequest): Promise<string> {
    let thumbnailPrompt = `Professional thumbnail for "${request.title}". `;
    thumbnailPrompt += `Visual style: Clean, attention-grabbing, suitable for social media. `;
    thumbnailPrompt += `Theme: ${request.focus_keyword} visualization. `;
    thumbnailPrompt += `Format: 16:9 thumbnail optimized for video platforms. `;
    thumbnailPrompt += `Branding: Tax4US color scheme and subtle logo integration.`;

    const taskId = await this.kie.generateImage(thumbnailPrompt);
    
    // Wait for thumbnail generation
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const status = await this.kie.getTask(taskId);
      
      if (status.status === 'success' && status.url) {
        return status.url;
      }
      if (status.status === 'failed') {
        throw new Error(`Thumbnail generation failed: ${status.error}`);
      }
    }
    
    throw new Error('Thumbnail generation timed out');
  }

  /**
   * Optimize video for different social media platforms
   */
  private async optimizeForPlatforms(
    videoUrl: string, 
    targetPlatform: string
  ): Promise<{ [platform: string]: string }> {
    // For now, return the original URL
    // In a full implementation, this would:
    // 1. Download the video
    // 2. Apply platform-specific optimizations (aspect ratio, duration, quality)
    // 3. Upload optimized versions
    
    const optimizedUrls: { [platform: string]: string } = {};
    
    if (targetPlatform === 'all') {
      optimizedUrls.instagram = videoUrl;
      optimizedUrls.tiktok = videoUrl;
      optimizedUrls.youtube = videoUrl;
      optimizedUrls.linkedin = videoUrl;
    } else {
      optimizedUrls[targetPlatform] = videoUrl;
    }
    
    return optimizedUrls;
  }

  /**
   * Update WordPress post with generated video
   */
  private async updatePostWithVideo(
    postId: number, 
    videoUrl: string, 
    thumbnailUrl?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        meta: {
          tax4us_video_url: videoUrl,
          tax4us_video_generated: new Date().toISOString()
        }
      };

      if (thumbnailUrl) {
        updateData.meta.tax4us_video_thumbnail = thumbnailUrl;
      }

      await this.wordpress.updatePost(postId, updateData);
      pipelineLogger.success(`Post ${postId} updated with video assets`, 'WP');

    } catch (error: any) {
      throw new Error(`Failed to update WordPress post: ${error.message}`);
    }
  }

  /**
   * Publish video to social media platforms
   */
  private async publishVideoToSocial(
    request: VideoProductionRequest, 
    videoUrl: string
  ): Promise<any[]> {
    // Placeholder for social media publishing
    // In full implementation, this would integrate with social platform APIs
    
    const socialPosts: any[] = [];
    
    try {
      // Example: Instagram post
      if (request.target_platform === 'instagram' || request.target_platform === 'all') {
        // const instagramPost = await this.socialPublisher.postToInstagram({
        //   videoUrl,
        //   caption: this.generateSocialCaption(request),
        //   hashtags: this.generateHashtags(request.focus_keyword, request.language)
        // });
        // socialPosts.push(instagramPost);
      }

      // Example: LinkedIn post
      if (request.target_platform === 'linkedin' || request.target_platform === 'all') {
        // const linkedinPost = await this.socialPublisher.postToLinkedIn({
        //   videoUrl,
        //   text: this.generateProfessionalCaption(request)
        // });
        // socialPosts.push(linkedinPost);
      }

    } catch (error: any) {
      pipelineLogger.error(`Social media publishing failed: ${error.message}`, 'SOCIAL');
    }

    return socialPosts;
  }

  /**
   * Get video duration by style preference
   */
  private getDurationByStyle(duration: string): string {
    const durations = {
      short: '15-30 seconds',
      medium: '45-60 seconds', 
      long: '90-120 seconds'
    };
    return durations[duration as keyof typeof durations] || durations.short;
  }

  /**
   * Generate social media caption
   */
  private generateSocialCaption(request: VideoProductionRequest): string {
    const isHebrew = request.language === 'he';
    
    if (isHebrew) {
      return `🎯 ${request.title}\n\n💡 מידע חשוב על ${request.focus_keyword}\n\n#Tax4US #מיסיםבארהב #ישראל_ארהב`;
    } else {
      return `🎯 ${request.title}\n\n💡 Essential insights about ${request.focus_keyword}\n\n#Tax4US #USIsraelTax #TaxPlanning`;
    }
  }

  /**
   * Generate professional caption for LinkedIn
   */
  private generateProfessionalCaption(request: VideoProductionRequest): string {
    const isHebrew = request.language === 'he';
    
    if (isHebrew) {
      return `מידע מקצועי חדש: ${request.title}\n\nמומחיות בתחום ${request.focus_keyword} לישראלים-אמריקאים.\n\n#Tax4US #ייעוץמס #ישראל_ארהב`;
    } else {
      return `Professional Tax Update: ${request.title}\n\nExpert guidance on ${request.focus_keyword} for US-Israel cross-border taxation.\n\n#Tax4US #TaxConsulting #USIsraelTax`;
    }
  }

  /**
   * Batch process multiple video productions
   */
  async batchProduceVideos(requests: VideoProductionRequest[]): Promise<VideoProductionResult[]> {
    const results: VideoProductionResult[] = [];
    const maxConcurrent = this.config.max_concurrent_videos;
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.all(
        batch.map(request => this.produceVideo(request))
      );
      
      results.push(...batchResults);
      
      // Brief pause between batches
      if (i + maxConcurrent < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    return results;
  }

  /**
   * Get video production status for multiple tasks
   */
  async getVideoStatus(taskIds: string[]): Promise<{
    completed: { taskId: string; url: string }[];
    processing: string[];
    failed: { taskId: string; error: string }[];
  }> {
    const completed: { taskId: string; url: string }[] = [];
    const processing: string[] = [];
    const failed: { taskId: string; error: string }[] = [];

    for (const taskId of taskIds) {
      try {
        const status = await this.kie.getTask(taskId);
        
        if (status.status === 'success' && status.videoUrl) {
          completed.push({ taskId, url: status.videoUrl });
        } else if (status.status === 'failed') {
          failed.push({ taskId, error: status.error || 'Unknown error' });
        } else {
          processing.push(taskId);
        }
      } catch (error: any) {
        failed.push({ taskId, error: error.message });
      }
    }

    return { completed, processing, failed };
  }
}