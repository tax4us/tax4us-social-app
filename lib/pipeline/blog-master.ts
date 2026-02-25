/**
 * Blog Master Pipeline - Main Content Orchestrator
 * Ported from n8n "TAX4US - WF: Blog Master - AI Content Pipeline"
 * Orchestrates the complete content creation workflow with AI agents
 */

import { AirtableClient } from '../clients/airtable-client';
import { WordPressClient } from '../clients/wordpress-client';
import { ContentGenerator } from './content-generator';
import { Translator } from './translator';
import { MediaProcessor } from './media-processor';
import { SocialPublisher } from './social-publisher';
import { pipelineLogger } from './logger';
import { Topic, ArticleContent } from '../types/pipeline';

export interface BlogMasterConfig {
  topic_id?: string;
  test_mode?: boolean;
  skip_existing?: boolean;
  force_regenerate?: boolean;
}

export interface BlogMasterResult {
  success: boolean;
  topic_id: string;
  hebrew_post_id?: number;
  english_post_id?: number;
  errors: string[];
  media_generated?: any;
  social_published?: any;
}

export class BlogMaster {
  private airtable: AirtableClient;
  private wordpress: WordPressClient;
  private contentGenerator: ContentGenerator;
  private translator: Translator;
  private mediaProcessor: MediaProcessor;
  private socialPublisher: SocialPublisher;

  constructor() {
    this.airtable = new AirtableClient();
    this.wordpress = new WordPressClient();
    this.contentGenerator = new ContentGenerator();
    this.translator = new Translator();
    this.mediaProcessor = new MediaProcessor();
    this.socialPublisher = new SocialPublisher();
  }

  /**
   * Main Blog Master pipeline orchestration
   * Implements the n8n workflow logic for complete content creation
   */
  async execute(config: BlogMasterConfig = {}): Promise<BlogMasterResult> {
    const { topic_id, test_mode = false, skip_existing = true, force_regenerate = false } = config;

    pipelineLogger.info(`🚀 Blog Master Pipeline Started - Topic: ${topic_id}, Test: ${test_mode}, Skip: ${skip_existing}, Force: ${force_regenerate}`);

    const result: BlogMasterResult = {
      success: false,
      topic_id: topic_id || 'unknown',
      errors: []
    };

    try {
      // 1. Get topic specification from Airtable (AI Content Creator workflow)
      const topicSpec = await this.getTopicSpecification(topic_id);
      if (!topicSpec) {
        throw new Error(`Topic not found: ${topic_id}`);
      }

      pipelineLogger.agent(`Topic retrieved: "${topicSpec.topic}"`, topicSpec.id);

      // 2. Check for existing posts (skip if requested)
      if (skip_existing && !force_regenerate) {
        const existingCheck = await this.checkExistingPosts(topicSpec);
        if (existingCheck.exists) {
          pipelineLogger.info('Posts already exist, skipping', topicSpec.id);
          return {
            success: true,
            topic_id: topicSpec.id,
            hebrew_post_id: existingCheck.hebrew_post_id,
            english_post_id: existingCheck.english_post_id,
            errors: []
          };
        }
      }

      // 3. Generate Hebrew content (Primary Language)
      pipelineLogger.info('Hebrew Content Generation', topicSpec.id);
      const hebrewTopic: Topic = {
        ...topicSpec,
        language: 'he'
      };
      const hebrewContent = await this.contentGenerator.generateArticle(hebrewTopic);
      
      if (hebrewContent.seo_score < 80) {
        pipelineLogger.warn(`Hebrew SEO score low: ${hebrewContent.seo_score}`, topicSpec.id);
        // Auto-enhance if score is too low
        const analysis = this.contentGenerator.calculateScore(
          hebrewContent.content, 
          hebrewContent.metadata.title, 
          hebrewContent.metadata.focus_keyword
        );
        
        if (typeof analysis === 'object' && 'issues' in analysis && 'improvements' in analysis) {
          pipelineLogger.agent('Auto-enhancing Hebrew content for better SEO', topicSpec.id);
          const enhancedHebrew = await this.contentGenerator.enhanceArticle(
            hebrewContent.content,
            hebrewContent.metadata.title,
            hebrewContent.metadata.focus_keyword,
            analysis.issues,
            analysis.improvements
          );
          Object.assign(hebrewContent, enhancedHebrew);
        }
      }

      // 4. Translate to English (High-quality translation)
      pipelineLogger.info('English Translation', topicSpec.id);
      const englishTopic: Topic = {
        ...topicSpec,
        language: 'en'
      };
      const englishContent = await this.translator.translateContent(hebrewContent, englishTopic);

      // 5. Generate media assets (Kie.ai integration)
      pipelineLogger.info('Media Generation', topicSpec.id);
      const mediaResults = await this.mediaProcessor.generatePostMedia({
        hebrew_title: hebrewContent.metadata.title,
        english_title: englishContent.metadata.title,
        hebrew_content: hebrewContent.content,
        english_content: englishContent.content,
        focus_keyword: hebrewContent.metadata.focus_keyword
      });

      // 6. Publish to WordPress
      pipelineLogger.info('WordPress Publishing', topicSpec.id);
      const publishResults = await this.publishToWordPress(hebrewContent, englishContent, mediaResults);

      // 7. Social media publishing
      if (publishResults.hebrew_post_id && publishResults.english_post_id) {
        pipelineLogger.info('Social Media Publishing', topicSpec.id);
        const socialResults = await this.socialPublisher.publishBothLanguages({
          hebrew_post_id: publishResults.hebrew_post_id,
          english_post_id: publishResults.english_post_id,
          hebrew_title: hebrewContent.metadata.title,
          english_title: englishContent.metadata.title
        });
        result.social_published = socialResults;
      }

      // 8. Update Airtable with completion status
      await this.updateAirtableCompletion(topicSpec.id, {
        hebrew_post_id: publishResults.hebrew_post_id,
        english_post_id: publishResults.english_post_id,
        hebrew_seo_score: hebrewContent.seo_score,
        english_seo_score: englishContent.seo_score,
        media_generated: mediaResults.success,
        completion_date: new Date().toISOString()
      });

      result.success = true;
      result.hebrew_post_id = publishResults.hebrew_post_id;
      result.english_post_id = publishResults.english_post_id;
      result.media_generated = mediaResults;

      pipelineLogger.success(`Blog Master completed successfully`, topicSpec.id);

    } catch (error: any) {
      result.errors.push(error.message);
      pipelineLogger.error(`Blog Master failed: ${error.message}`, topic_id);
    }

    return result;
  }

  /**
   * Get topic specification from Airtable
   * Implements AI Content Creator agent pattern from n8n
   */
  private async getTopicSpecification(topicId?: string): Promise<Topic | null> {
    try {
      if (topicId) {
        // Get specific topic by ID
        const records = await this.airtable.getRecords('Topics', {
          filterByFormula: `{record_id} = "${topicId}"`
        });
        
        if (records && records.length > 0) {
          return this.formatTopicFromAirtable(records[0]);
        }
      }

      // Get next pending topic (priority order from n8n workflow)
      const pendingRecords = await this.airtable.getRecords('Topics', {
        filterByFormula: `AND({status} = "approved", {hebrew_post_id} = BLANK())`,
        maxRecords: 1
      });

      if (pendingRecords && pendingRecords.length > 0) {
        return this.formatTopicFromAirtable(pendingRecords[0]);
      }

      return null;
    } catch (error) {
      pipelineLogger.error(`Failed to get topic specification: ${error}`);
      return null;
    }
  }

  /**
   * Format Airtable record to Topic object
   */
  private formatTopicFromAirtable(record: any): Topic {
    const fields = record.fields;
    return {
      id: record.id,
      topic: fields.topic || fields.title || '',
      audience: fields.audience || 'US citizens in Israel',
      keywords: fields.keywords ? fields.keywords.split(',').map((k: string) => k.trim()) : [],
      language: fields.language || 'he',
      title: fields.title || fields.topic,
      status: fields.status || 'pending',
      priority: fields.priority || 'medium',
      category: fields.category || 'Tax Planning',
      created_at: fields.created_at || new Date().toISOString()
    };
  }

  /**
   * Check if posts already exist for this topic
   */
  private async checkExistingPosts(topic: Topic): Promise<{
    exists: boolean;
    hebrew_post_id?: number;
    english_post_id?: number;
  }> {
    try {
      // Check Airtable for existing post IDs
      const records = await this.airtable.getRecords('Topics', {
        filterByFormula: `{record_id} = "${topic.id}"`
      });

      if (records && records.length > 0) {
        const fields = records[0].fields;
        const hebrew_post_id = fields.hebrew_post_id;
        const english_post_id = fields.english_post_id;

        if (hebrew_post_id && english_post_id) {
          // Verify posts still exist in WordPress
          try {
            await this.wordpress.getPost(hebrew_post_id);
            await this.wordpress.getPost(english_post_id);
            return {
              exists: true,
              hebrew_post_id,
              english_post_id
            };
          } catch (error) {
            // Posts don't exist in WordPress, consider as non-existent
            return { exists: false };
          }
        }
      }

      return { exists: false };
    } catch (error) {
      pipelineLogger.error(`Error checking existing posts: ${error}`, topic.id);
      return { exists: false };
    }
  }

  /**
   * Publish both language versions to WordPress
   */
  private async publishToWordPress(
    hebrewContent: ArticleContent,
    englishContent: ArticleContent,
    mediaResults: any
  ): Promise<{
    hebrew_post_id?: number;
    english_post_id?: number;
    errors: string[];
  }> {
    const results = { errors: [] as string[] };

    try {
      // Resolve categories and tags
      const hebrewCategories = await this.wordpress.resolveCategories(hebrewContent.metadata.categories || []);
      const hebrewTags = await this.wordpress.resolveTags(hebrewContent.metadata.tags || []);
      
      const englishCategories = await this.wordpress.resolveCategories(englishContent.metadata.categories || []);
      const englishTags = await this.wordpress.resolveTags(englishContent.metadata.tags || []);

      // Publish Hebrew post
      const hebrewPost = await this.wordpress.createPost({
        title: hebrewContent.metadata.title,
        content: hebrewContent.content,
        excerpt: hebrewContent.metadata.excerpt,
        status: 'publish',
        categories: hebrewCategories,
        tags: hebrewTags,
        featured_media: mediaResults.hebrew_image_id || 0,
        meta: {
          rank_math_focus_keyword: hebrewContent.metadata.focus_keyword,
          rank_math_title: hebrewContent.metadata.seo_title,
          rank_math_description: hebrewContent.metadata.seo_description,
          rank_math_seo_score: hebrewContent.seo_score
        }
      });
      results.hebrew_post_id = hebrewPost.id;

      // Publish English post
      const englishPost = await this.wordpress.createPost({
        title: englishContent.metadata.title,
        content: englishContent.content,
        excerpt: englishContent.metadata.excerpt,
        status: 'publish',
        categories: englishCategories,
        tags: englishTags,
        featured_media: mediaResults.english_image_id || 0,
        meta: {
          rank_math_focus_keyword: englishContent.metadata.focus_keyword,
          rank_math_title: englishContent.metadata.seo_title,
          rank_math_description: englishContent.metadata.seo_description,
          rank_math_seo_score: englishContent.seo_score
        }
      });
      results.english_post_id = englishPost.id;

    } catch (error: any) {
      results.errors.push(`WordPress publishing failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Update Airtable with completion status
   */
  private async updateAirtableCompletion(topicId: string, completionData: any) {
    try {
      await this.airtable.updateRecord('Topics', topicId, {
        status: 'completed',
        hebrew_post_id: completionData.hebrew_post_id,
        english_post_id: completionData.english_post_id,
        hebrew_seo_score: completionData.hebrew_seo_score,
        english_seo_score: completionData.english_seo_score,
        media_generated: completionData.media_generated,
        completed_at: completionData.completion_date
      });
    } catch (error) {
      pipelineLogger.error(`Failed to update Airtable completion: ${error}`, topicId);
    }
  }

  /**
   * Process multiple topics in batch mode
   */
  async processBatch(configs: BlogMasterConfig[] = []): Promise<BlogMasterResult[]> {
    const results: BlogMasterResult[] = [];
    
    for (const config of configs) {
      const result = await this.execute(config);
      results.push(result);
      
      // Brief pause between topics to avoid overwhelming APIs
      if (configs.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Process all pending topics from Airtable
   */
  async processAllPending(): Promise<BlogMasterResult[]> {
    try {
      const pendingTopics = await this.airtable.getRecords('Topics', {
        filterByFormula: `AND({status} = "approved", {hebrew_post_id} = BLANK())`
      });

      if (!pendingTopics || pendingTopics.length === 0) {
        pipelineLogger.info('No pending topics found');
        return [];
      }

      pipelineLogger.info(`Processing ${pendingTopics.length} pending topics`);

      const configs: BlogMasterConfig[] = pendingTopics.map(record => ({
        topic_id: record.id,
        test_mode: false,
        skip_existing: true
      }));

      return await this.processBatch(configs);

    } catch (error: any) {
      pipelineLogger.error(`Failed to process pending topics: ${error.message}`);
      return [];
    }
  }
}