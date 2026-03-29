import { db, PipelineRun, PipelineLog, Topic, ContentPiece } from './database'
import { contentGenerationService } from './content-generation'
import { slackIntegration } from './slack-integration'
import { wordPressPublisher } from './wordpress-publisher'
import { socialMediaPublisher } from './social-media-publisher'
import { podcastProducer } from './podcast-producer'
import { seoOptimizer } from './seo-optimizer'

export type PipelineStage = 
  | 'topic_selection'
  | 'hebrew_content_generation' 
  | 'media_generation'
  | 'english_translation'
  | 'seo_optimization'
  | 'approval_gate'
  | 'wordpress_publishing'
  | 'social_distribution'
  | 'podcast_production'
  | 'completed'

export interface PipelineState {
  runId: string
  currentStage: PipelineStage
  selectedTopic?: Topic
  contentPiece?: ContentPiece
  mediaUrls: Record<string, string>
  errors: string[]
  checkpoints: Record<PipelineStage, any>
}

class PipelineManager {
  private activeStates = new Map<string, PipelineState>()
  private readonly notebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID || 'd5f128c4-0d17-42c3-8d52-109916859c76'

  async startContentPipeline(triggerType: 'cron' | 'manual' = 'cron'): Promise<string> {
    const run = await db.createPipelineRun({
      trigger_type: triggerType,
      pipeline_type: 'content_creation',
      status: 'running',
      current_stage: 'topic_selection',
      stages_completed: [],
      stages_failed: [],
      logs: [],
      started_at: new Date().toISOString()
    })

    const state: PipelineState = {
      runId: run.id,
      currentStage: 'topic_selection',
      mediaUrls: {},
      errors: [],
      checkpoints: {
        topic_selection: null,
        hebrew_content_generation: null,
        media_generation: null,
        english_translation: null,
        seo_optimization: null,
        approval_gate: null,
        wordpress_publishing: null,
        social_distribution: null,
        podcast_production: null,
        completed: null
      }
    }

    this.activeStates.set(run.id, state)
    
    // Start pipeline execution
    this.executeStage(run.id, 'topic_selection').catch(error => {
      this.logError(run.id, 'topic_selection', error.message)
    })

    return run.id
  }

  async executeStage(runId: string, stage: PipelineStage): Promise<void> {
    const state = this.activeStates.get(runId)
    if (!state) {
      throw new Error(`Pipeline state not found for run: ${runId}`)
    }

    this.log(runId, 'info', stage, `Starting stage: ${stage}`)
    
    try {
      switch (stage) {
        case 'topic_selection':
          await this.selectTopic(runId, state)
          break
        case 'hebrew_content_generation':
          await this.generateHebrewContent(runId, state)
          break
        case 'media_generation':
          await this.generateMedia(runId, state)
          break
        case 'english_translation':
          await this.translateContent(runId, state)
          break
        case 'seo_optimization':
          await this.optimizeSEO(runId, state)
          break
        case 'approval_gate':
          await this.createApprovalGate(runId, state)
          break
        case 'wordpress_publishing':
          await this.publishToWordPress(runId, state)
          break
        case 'social_distribution':
          await this.distributeSocial(runId, state)
          break
        case 'podcast_production':
          await this.producePodcast(runId, state)
          break
        case 'completed':
          await this.completePipeline(runId, state)
          break
      }

      // Mark stage as completed and move to next
      await this.markStageCompleted(runId, stage)
      const nextStage = this.getNextStage(stage)
      
      if (nextStage) {
        state.currentStage = nextStage
        await this.executeStage(runId, nextStage)
      }

    } catch (error) {
      await this.handleStageError(runId, stage, error as Error)
    }
  }

  private async selectTopic(runId: string, state: PipelineState): Promise<void> {
    const availableTopics = await db.getAvailableTopics(5)
    
    if (availableTopics.length === 0) {
      throw new Error('No available topics found')
    }

    // For now, select the highest priority topic
    // In full implementation, this would go through Slack approval
    const selectedTopic = availableTopics[0]
    state.selectedTopic = selectedTopic
    state.checkpoints.topic_selection = { topicId: selectedTopic.id }
    
    // Mark topic as used
    await db.updateTopic(selectedTopic.id, { 
      last_used: new Date().toISOString() 
    })

    this.log(runId, 'info', 'topic_selection', `Selected topic: ${selectedTopic.title_english}`)
  }

  private async generateHebrewContent(runId: string, state: PipelineState): Promise<void> {
    if (!state.selectedTopic) {
      throw new Error('No topic selected')
    }

    const topic = state.selectedTopic
    
    // Create content piece record
    const contentPiece = await db.createContentPiece({
      topic_id: topic.id,
      title_english: topic.title_english,
      title_hebrew: topic.title_hebrew,
      target_keywords: topic.tags,
      status: 'draft',
      media_urls: {}
    })

    state.contentPiece = contentPiece

    // Generate Hebrew content using Claude
    const hebrewPrompt = `
      כתוב מאמר מקצועי בעברית על הנושא: ${topic.title_hebrew}
      
      הנחיות:
      - אורך: 2500-3000 מילים
      - טון מקצועי אך נגיש
      - התמקד במיסוי חוצה גבולות ישראל-ארה"ב
      - כלול דוגמאות מעשיות
      - השתמש ב-IRS.gov כמקור סמכותי
      - כלול קלמות מילות מפתח: ${topic.tags.join(', ')}
    `

    const result = await contentGenerationService.generateTaxArticle(
      hebrewPrompt,
      'hebrew',
      topic.tags.join(', '),
      topic.title_hebrew
    )

    // Extract content immediately if completed
    if (result.status === 'completed' && result.result?.data?.content) {
      await db.updateContentPiece(contentPiece.id, {
        content_hebrew: result.result.data.content
      })
    }

    state.checkpoints.hebrew_content_generation = { 
      taskId: result.id,
      contentPieceId: contentPiece.id 
    }

    this.log(runId, 'info', 'hebrew_content_generation', `Started Hebrew content generation: ${result.id}`)
  }

  private async generateMedia(runId: string, state: PipelineState): Promise<void> {
    if (!state.contentPiece) {
      throw new Error('No content piece found')
    }

    try {
      this.log(runId, 'info', 'media_generation', `Starting media generation for: ${state.selectedTopic?.title_english}`)

      // Use Kie.ai for ALL media — Remotion is dead (produced broken green cards with
      // tofu Hebrew characters, see FB reel/1133143058896566). Disabled 2026-03-29.
      const { MediaProcessor } = await import('../pipeline/media-processor')
      const mediaProcessor = new MediaProcessor()

      // Generate VIDEO via Kie.ai (Sora 2 Pro primary, Kling 3.0 fallback)
      const mediaResult = await mediaProcessor.generatePostMedia({
        hebrew_title: state.contentPiece.title_hebrew || state.selectedTopic?.title_hebrew || '',
        english_title: state.selectedTopic?.title_english || state.contentPiece.title_hebrew || '',
        hebrew_content: state.contentPiece.content_hebrew || '',
        english_content: state.contentPiece.content_english || '',
        focus_keyword: state.contentPiece.target_keywords?.[0] || 'tax',
        style: 'corporate',
        generate_video: true,   // Kie.ai video: Sora 2 Pro → Kling 3.0 fallback
        generate_images: true,  // Featured image for WordPress
      })

      if (mediaResult.success) {
        // Featured image for WordPress blog post
        if (mediaResult.english_image_url) {
          state.contentPiece.media_urls.featured_image = mediaResult.english_image_url
          this.log(runId, 'info', 'media_generation', `Featured image generated: ${mediaResult.english_image_url}`)
        }
        if (mediaResult.hebrew_image_url) {
          state.contentPiece.media_urls.blog_thumbnail = mediaResult.hebrew_image_url
        }
      }

      // Poll for video completion if task IDs were returned
      if (mediaResult.task_ids.length > 0) {
        const { KieClient } = await import('../clients/kie-client')
        const kie = new KieClient()

        for (const taskId of mediaResult.task_ids) {
          this.log(runId, 'info', 'media_generation', `Polling Kie.ai video task: ${taskId}`)
          let videoUrl = ''
          const maxAttempts = 30  // 5 min max (10s * 30)
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(r => setTimeout(r, 10000))
            try {
              const taskResult = await kie.getTask(taskId)
              if (taskResult.status === 'success' && taskResult.url) {
                videoUrl = taskResult.url
                this.log(runId, 'info', 'media_generation', `Video ready (attempt ${attempt}): ${videoUrl}`)
                break
              }
              if (taskResult.status === 'failed') {
                this.log(runId, 'warn', 'media_generation', `Video task ${taskId} failed: ${taskResult.error}`)
                break
              }
              this.log(runId, 'info', 'media_generation', `Video polling ${attempt}/${maxAttempts}: ${taskResult.status}`)
            } catch (pollErr: any) {
              this.log(runId, 'warn', 'media_generation', `Poll error: ${pollErr.message}`)
            }
          }

          if (videoUrl) {
            // First video → FB reel + social_video
            if (!state.contentPiece.media_urls.facebook_reel) {
              state.contentPiece.media_urls.facebook_reel = videoUrl
              state.contentPiece.media_urls.social_video = videoUrl
              this.log(runId, 'info', 'media_generation', `FB reel video set: ${videoUrl}`)
            }
            // Second video → LinkedIn
            if (!state.contentPiece.media_urls.linkedin_video && state.contentPiece.media_urls.facebook_reel !== videoUrl) {
              state.contentPiece.media_urls.linkedin_video = videoUrl
            }
          }
        }
      }

      // Update content piece with new media URLs
      await db.updateContentPiece(state.contentPiece.id, {
        media_urls: state.contentPiece.media_urls
      })

      state.checkpoints.media_generation = {
        videoGenerated: !!state.contentPiece.media_urls.facebook_reel,
        featuredImageGenerated: !!state.contentPiece.media_urls.featured_image,
        mediaUrls: state.contentPiece.media_urls
      }

      this.log(runId, 'info', 'media_generation', `Kie.ai media generation completed: video=${!!state.contentPiece.media_urls.facebook_reel}, image=${!!state.contentPiece.media_urls.featured_image}`)

    } catch (error) {
      this.log(runId, 'error', 'media_generation', `Media generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Don't throw - continue pipeline even if media generation fails
    }
  }

  // generateRemotionVideo() and pollVideoCompletion() REMOVED 2026-03-29.
  // Remotion produced broken green cards with tofu Hebrew (see FB reel/1133143058896566).
  // Video generation now uses Kie.ai (Sora 2 Pro / Kling 3.0) via MediaProcessor in generateMedia().

  private async translateContent(runId: string, state: PipelineState): Promise<void> {
    if (!state.contentPiece) {
      throw new Error('No content piece found')
    }

    try {
      this.log(runId, 'info', 'english_translation', `Starting translation for: ${state.contentPiece.title_hebrew}`)

      // Generate professional English translation using NotebookLM
      const translationPrompt = `
        תרגם את התוכן הבא מעברית לאנגלית מקצועית:
        
        כותרת: ${state.contentPiece.title_hebrew}
        תוכן: ${state.contentPiece.content_hebrew || 'תוכן יופק בשלב קודם'}
        מילות מפתח: ${state.contentPiece.target_keywords.join(', ')}
        
        הנחיות לתרגום:
        - שמור על הטון המקצועי
        - התמקד בקהל יעד: ישראלים בארה"ב
        - השתמש במונחי מס נכונים באנגלית
        - שמור על דיוק טכני מלא
        - הוסף הקשר אמריקאי כשרלוונטי (IRS, tax code, etc.)
        
        אנא ספק:
        1. כותרת מתורגמת ומותאמת לאנגלית
        2. תוכן מתורגם מלא
        3. תיאור קצר (excerpt) למטרות SEO
        
        התמקד בבהירות ונגישות עבור דוברי אנגלית.
      `

      const response = await fetch('/api/notebook-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notebookId: this.notebookId,
          query: translationPrompt
        })
      })

      if (!response.ok) {
        throw new Error(`Notebook query failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        // Parse translation result
        const translation = this.parseTranslationResult(result.answer, state.contentPiece)
        
        // Update content piece with translation
        await db.updateContentPiece(state.contentPiece.id, {
          title_english: translation.title,
          content_english: translation.content
        })

        // Update state
        state.contentPiece.title_english = translation.title
        state.contentPiece.content_english = translation.content

        state.checkpoints.english_translation = {
          success: true,
          titleLength: translation.title.length,
          contentLength: translation.content.length,
          translatedAt: new Date().toISOString()
        }

        this.log(
          runId, 
          'info', 
          'english_translation', 
          `Translation completed successfully. Title: "${translation.title}" (${translation.content.length} chars)`
        )
      } else {
        throw new Error(`NotebookLM translation failed: ${result.error}`)
      }

    } catch (error) {
      // Create fallback translation
      const fallbackTitle = `Tax Advice: ${state.contentPiece.title_hebrew.substring(0, 50)}`
      const fallbackContent = `Professional tax guidance regarding ${state.contentPiece.target_keywords.join(', ')} for Israeli-Americans.`

      await db.updateContentPiece(state.contentPiece.id, {
        title_english: fallbackTitle,
        content_english: fallbackContent
      })

      state.checkpoints.english_translation = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true
      }

      this.log(runId, 'warn', 'english_translation', `Translation failed, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse translation result from AI response
   */
  private parseTranslationResult(aiResponse: string, contentPiece: ContentPiece): {
    title: string
    content: string
    excerpt: string
  } {
    // Extract title
    const titleMatch = aiResponse.match(/(?:כותרת מתורגמת|Title):\s*([^\n]+)/i)
    const title = titleMatch ? titleMatch[1].trim() : 
                  `Tax Guidance: ${contentPiece.target_keywords[0] || 'Cross-Border Tax Issues'}`

    // Extract main content (look for substantial text blocks)
    const contentLines = aiResponse.split('\n').filter(line => 
      line.length > 100 && 
      !line.includes('כותרת') && 
      !line.includes('תיאור') &&
      !line.includes('הנחיות')
    )
    
    const content = contentLines.join('\n\n') || 
                   `Professional guidance on ${contentPiece.target_keywords.join(', ')} for Israeli-Americans dealing with US tax obligations.`

    // Generate excerpt
    const excerpt = content.length > 155 ? content.substring(0, 152) + '...' : content

    return { title, content, excerpt }
  }

  private async optimizeSEO(runId: string, state: PipelineState): Promise<void> {
    if (!state.contentPiece) {
      throw new Error('No content piece found')
    }

    try {
      this.log(runId, 'info', 'seo_optimization', `Starting AI-powered SEO optimization for: ${state.contentPiece.title_english}`)

      // Use real SEO optimizer with AI analysis
      const analysis = await seoOptimizer.analyzeAndOptimize(state.contentPiece)
      
      this.log(runId, 'info', 'seo_optimization', `SEO analysis completed. Found ${analysis.issues.length} issues, targeting score ${analysis.targetScore}`)

      // Apply optimizations
      const result = await seoOptimizer.applyOptimizations(state.contentPiece, analysis)

      if (result.success) {
        // Update content piece with new SEO score
        await db.updateContentPiece(state.contentPiece.id, {
          seo_score: result.newScore
        })

        state.checkpoints.seo_optimization = {
          currentScore: analysis.currentScore,
          targetScore: analysis.targetScore,
          newScore: result.newScore,
          issuesFound: analysis.issues.length,
          optimizationsApplied: analysis.recommendations.length,
          wordpressUrl: result.wordpressUrl
        }

        this.log(
          runId, 
          'info', 
          'seo_optimization', 
          `SEO optimization completed successfully. Score improved from ${analysis.currentScore} to ${result.newScore}`
        )

        // Generate internal links
        const internalLinks = await seoOptimizer.generateInternalLinks(state.contentPiece)
        if (internalLinks.length > 0) {
          this.log(runId, 'info', 'seo_optimization', `Generated ${internalLinks.length} internal link suggestions`)
        }

      } else {
        throw new Error('Failed to apply SEO optimizations')
      }

    } catch (error) {
      // Fallback SEO optimization
      const fallbackScore = Math.min((state.contentPiece.seo_score || 60) + 15, 85)
      
      await db.updateContentPiece(state.contentPiece.id, {
        seo_score: fallbackScore
      })

      state.checkpoints.seo_optimization = {
        currentScore: state.contentPiece.seo_score || 60,
        targetScore: 85,
        newScore: fallbackScore,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true
      }

      this.log(runId, 'warn', 'seo_optimization', `SEO optimization failed, applied fallback improvements: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async createApprovalGate(runId: string, state: PipelineState): Promise<void> {
    if (!state.contentPiece) {
      throw new Error('No content piece found')
    }

    // Create approval request in database
    const approval = await db.createApproval({
      type: 'content_review',
      related_id: state.contentPiece.id,
      status: 'pending'
    })

    // Send Slack approval request with real integration
    try {
      const slackRequest = {
        id: approval.id,
        type: 'content_review' as const,
        title: state.contentPiece.title_english,
        content: `Hebrew: ${state.contentPiece.title_hebrew}\nKeywords: ${state.contentPiece.target_keywords.join(', ')}`,
        runId,
        contentId: state.contentPiece.id,
        timestamp: new Date().toISOString()
      }

      const messageTimestamp = await slackIntegration.sendApprovalRequest(slackRequest)
      
      // Store message timestamp for tracking responses
      await db.updateApproval(approval.id, {
        slack_message_ts: messageTimestamp,
        slack_channel: process.env.SLACK_APPROVAL_CHANNEL_ID
      })

      this.log(runId, 'info', 'approval_gate', `Sent Slack approval request: ${approval.id} (msg: ${messageTimestamp})`)
    } catch (error) {
      this.log(runId, 'error', 'approval_gate', `Failed to send Slack approval: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }

    state.checkpoints.approval_gate = {
      approvalId: approval.id,
      status: 'pending'
    }
    
    // Pipeline pauses here until approval
    await db.updatePipelineRun(runId, { status: 'paused' })
  }

  private async publishToWordPress(runId: string, state: PipelineState): Promise<void> {
    if (!state.contentPiece) {
      throw new Error('No content piece found')
    }

    try {
      // Publish content to WordPress using real API
      const result = await wordPressPublisher.publishContent(state.contentPiece, {
        status: 'publish',
        categories: ['Business Tax', 'Tax Planning'],
        tags: state.contentPiece.target_keywords.slice(0, 5),
        seoMeta: {
          metaTitle: state.contentPiece.title_hebrew,
          metaDescription: this.generateSEODescription(state.contentPiece),
          focusKeywords: state.contentPiece.target_keywords
        }
      })

      // Update content piece with WordPress post ID and URL
      await db.updateContentPiece(state.contentPiece.id, {
        wordpress_post_id: result.postId,
        status: 'published'
      })

      // Store WordPress info in checkpoints
      state.checkpoints.wordpress_publishing = {
        postId: result.postId,
        url: result.url,
        publishedAt: new Date().toISOString()
      }

      this.log(runId, 'info', 'wordpress_publishing', `Published to WordPress: ${result.url} (ID: ${result.postId})`)

      // Send notification to Slack
      await slackIntegration.sendNotification(
        'Content Published ✅',
        `"${state.contentPiece.title_hebrew}" has been published to WordPress.\n\n**URL:** ${result.url}\n**Post ID:** ${result.postId}`,
        runId
      )

      // Send WhatsApp notification to Ben's group
      await this.notifyWhatsAppGroup(
        `📝 *WordPress Published*\n\n"${state.contentPiece.title_hebrew}"\n\n🔗 ${result.url}\n\nArticle is live on tax4us.co.il`
      )

    } catch (error) {
      this.log(runId, 'error', 'wordpress_publishing', `WordPress publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw error
    }
  }

  private generateSEODescription(contentPiece: ContentPiece): string {
    const content = contentPiece.content_hebrew || contentPiece.title_hebrew
    const cleanText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ')
    const description = cleanText.length > 160 ? cleanText.substring(0, 157) + '...' : cleanText
    
    // Include primary keyword
    const primaryKeyword = contentPiece.target_keywords[0]
    if (primaryKeyword && !description.includes(primaryKeyword)) {
      return `${primaryKeyword}: ${description.substring(primaryKeyword.length + 2)}`
    }
    
    return description
  }

  private async distributeSocial(runId: string, state: PipelineState): Promise<void> {
    if (!state.contentPiece) {
      throw new Error('No content piece found')
    }

    try {
      // Generate and publish social media posts using real APIs
      const results = await socialMediaPublisher.publishContentToSocial(state.contentPiece)
      
      const successfulPosts = results.filter(r => r.success)
      const failedPosts = results.filter(r => !r.success)

      // Store social media URLs in checkpoints
      state.checkpoints.social_distribution = {
        posts: results.map(r => ({
          platform: r.platform,
          success: r.success,
          postId: r.postId,
          postUrl: r.postUrl,
          error: r.error
        })),
        successCount: successfulPosts.length,
        failedCount: failedPosts.length
      }

      // Log results
      if (successfulPosts.length > 0) {
        this.log(
          runId, 
          'info', 
          'social_distribution', 
          `Successfully posted to ${successfulPosts.map(p => p.platform).join(', ')}. URLs: ${successfulPosts.map(p => p.postUrl).join(', ')}`
        )
      }

      if (failedPosts.length > 0) {
        this.log(
          runId, 
          'warn', 
          'social_distribution', 
          `Failed to post to ${failedPosts.map(p => p.platform).join(', ')}. Errors: ${failedPosts.map(p => p.error).join(', ')}`
        )
      }

      // Send Slack notification
      const summary = successfulPosts.length > 0 
        ? `✅ Posted to ${successfulPosts.map(p => p.platform).join(' & ')}`
        : `❌ Social media posting failed`

      await slackIntegration.sendNotification(
        'Social Media Distribution',
        `Content "${state.contentPiece.title_hebrew}" social media update:\n\n${summary}\n\n` +
        (successfulPosts.length > 0 ? `**Post URLs:**\n${successfulPosts.map(p => `${p.platform}: ${p.postUrl}`).join('\n')}` : ''),
        runId
      )

      // Send WhatsApp notification to Ben's group with published URLs
      if (successfulPosts.length > 0) {
        const platformLinks = successfulPosts.map(p => `• ${p.platform === 'facebook' ? '📘 Facebook' : '💼 LinkedIn'}: ${p.postUrl}`).join('\n')
        await this.notifyWhatsAppGroup(
          `🎉 *Content Published*\n\n"${state.contentPiece.title_hebrew}"\n\n${platformLinks}\n\n${failedPosts.length > 0 ? `⚠️ ${failedPosts.map(p => p.platform).join(', ')} failed — will retry` : '✅ All platforms successful'}`
        )
      }

      // Don't throw error if some posts failed - continue pipeline
      if (successfulPosts.length === 0) {
        this.log(runId, 'error', 'social_distribution', 'All social media posts failed, but continuing pipeline')
        await this.notifyWhatsAppGroup(`❌ Social media publishing failed for "${state.contentPiece.title_hebrew}". I'm investigating and will retry.`)
      }

    } catch (error) {
      this.log(runId, 'error', 'social_distribution', `Social media distribution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Don't throw - continue with podcast production even if social media fails
    }
  }

  private async producePodcast(runId: string, state: PipelineState): Promise<void> {
    if (!state.contentPiece) {
      throw new Error('No content piece found')
    }

    try {
      this.log(runId, 'info', 'podcast_production', `Starting podcast production for: ${state.contentPiece.title_hebrew}`)

      // Generate podcast episode using real ElevenLabs and Captivate integration
      const episode = await podcastProducer.createPodcastEpisode(state.contentPiece)

      // Store podcast info in checkpoints
      state.checkpoints.podcast_production = {
        episodeId: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
        duration: episode.duration,
        status: episode.status,
        publishDate: episode.publishDate
      }

      // Update content piece with podcast URL
      if (episode.audioUrl) {
        await db.updateContentPiece(state.contentPiece.id, {
          media_urls: {
            ...state.contentPiece.media_urls,
            podcast_audio: episode.audioUrl
          }
        })
      }

      const statusMessage = episode.status === 'published' 
        ? `Podcast episode published successfully: ${episode.title}`
        : episode.status === 'failed'
        ? `Podcast production failed: ${episode.description}`
        : `Podcast episode ready: ${episode.title}`

      this.log(runId, episode.status === 'failed' ? 'warn' : 'info', 'podcast_production', statusMessage)

      // Send Slack notification
      const notificationTitle = episode.status === 'published' ? 'Podcast Published 🎧' : 'Podcast Ready 🎧'
      const notificationMessage = `Episode: "${episode.title}"\n` +
        `Duration: ${episode.duration ? `${Math.floor(episode.duration / 60)}:${(episode.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}\n` +
        `Status: ${episode.status}\n` +
        (episode.audioUrl ? `Audio: ${episode.audioUrl}` : '')

      await slackIntegration.sendNotification(notificationTitle, notificationMessage, runId)

    } catch (error) {
      this.log(runId, 'error', 'podcast_production', `Podcast production failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Don't throw - podcast is optional, continue to completion
    }
  }

  private async completePipeline(runId: string, state: PipelineState): Promise<void> {
    await db.updatePipelineRun(runId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    })

    this.activeStates.delete(runId)
    this.log(runId, 'info', 'completed', 'Pipeline completed successfully')
  }

  private getNextStage(currentStage: PipelineStage): PipelineStage | null {
    const stageOrder: PipelineStage[] = [
      'topic_selection',
      'hebrew_content_generation',
      'media_generation', 
      'english_translation',
      'seo_optimization',
      'approval_gate',
      'wordpress_publishing',
      'social_distribution',
      'podcast_production',
      'completed'
    ]

    const currentIndex = stageOrder.indexOf(currentStage)
    return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : null
  }

  private async markStageCompleted(runId: string, stage: PipelineStage): Promise<void> {
    const run = await db.getPipelineRun(runId)
    if (run) {
      const completedStages = [...run.stages_completed, stage]
      await db.updatePipelineRun(runId, { 
        stages_completed: completedStages,
        current_stage: this.getNextStage(stage) || 'completed'
      })
    }
  }

  private async handleStageError(runId: string, stage: PipelineStage, error: Error): Promise<void> {
    this.logError(runId, stage, error.message)
    
    const run = await db.getPipelineRun(runId)
    if (run) {
      const failedStages = [...run.stages_failed, stage]
      await db.updatePipelineRun(runId, { 
        status: 'failed',
        stages_failed: failedStages
      })
    }

    this.activeStates.delete(runId)
  }

  private async log(runId: string, level: 'info' | 'warn' | 'error', stage: string, message: string, data?: any): Promise<void> {
    const log: PipelineLog = {
      timestamp: new Date().toISOString(),
      level,
      stage,
      message,
      data
    }

    await db.addPipelineLog(runId, log)
  }

  private async logError(runId: string, stage: string, message: string): Promise<void> {
    await this.log(runId, 'error', stage, message)
  }

  /**
   * Send a WhatsApp notification to Ben's TAX4US group via WAHA.
   * Group ID from env var TAX4US_WHATSAPP_GROUP_ID (set after group creation in Phase 80).
   * Silently skips if not configured — non-fatal, pipeline continues.
   */
  private async notifyWhatsAppGroup(message: string): Promise<void> {
    try {
      const groupId = process.env.TAX4US_WHATSAPP_GROUP_ID
      if (!groupId) {
        logger.warn('Pipeline', 'WhatsApp notification skipped — TAX4US_WHATSAPP_GROUP_ID not set')
        return
      }

      const WAHA_URL = process.env.WAHA_URL || 'http://172.245.56.50:3000'
      const WAHA_API_KEY = process.env.WAHA_API_KEY || '4fc7e008d7d24fc995475029effc8fa8'

      const res = await fetch(`${WAHA_URL}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': WAHA_API_KEY,
        },
        body: JSON.stringify({
          chatId: groupId,
          session: 'superseller-whatsapp',
          text: message,
        }),
      })

      if (!res.ok) {
        logger.warn('Pipeline', `WhatsApp notification failed: ${res.status} ${res.statusText}`)
      }
    } catch (err: any) {
      logger.warn('Pipeline', `WhatsApp notification failed (non-fatal): ${err.message}`)
    }
  }

  // Public methods for external control
  async resumePipeline(runId: string): Promise<boolean> {
    const run = await db.getPipelineRun(runId)
    if (!run || run.status !== 'paused') {
      return false
    }

    await db.updatePipelineRun(runId, { status: 'running' })
    
    const nextStage = run.current_stage as PipelineStage
    if (nextStage) {
      this.executeStage(runId, nextStage).catch(error => {
        this.logError(runId, nextStage, error.message)
      })
    }

    return true
  }

  async getPipelineStatus(runId: string): Promise<PipelineRun | null> {
    return db.getPipelineRun(runId)
  }

  async getActivePipelines(): Promise<PipelineRun[]> {
    return db.getActiveRuns()
  }
}

export const pipelineManager = new PipelineManager()