import { NextRequest, NextResponse } from 'next/server'
import { AirtableClient } from '@/lib/clients/airtable-client'
import { WordPressClient } from '@/lib/clients/wordpress-client'
import { MediaProcessor } from '@/lib/pipeline/media-processor'
import { db } from '@/lib/services/database'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "tax4us_local_test_key"
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action = 'generate_and_publish', topic_title } = await request.json()
    
    // Create pipeline run for tracking
    const pipelineRun = await db.createPipelineRun({
      trigger_type: 'manual',
      pipeline_type: 'content_creation',
      status: 'running',
      current_stage: 'content_generation',
      stages_completed: [],
      stages_failed: [],
      started_at: new Date().toISOString(),
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Starting complete content publishing workflow for: ${topic_title || 'unspecified topic'}`,
        stage: 'initialization'
      }]
    })

    const wp = new WordPressClient()
    const airtable = new AirtableClient()
    const mediaProcessor = new MediaProcessor()
    
    try {
      // Step 1: Generate new content using the content generation API
      await db.addPipelineLog(pipelineRun.id, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Generating new content via NotebookLM...',
        stage: 'content_generation'
      })

      const contentResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content-generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic_title || 'Israeli-American Tax Planning Strategies',
          keywords: ['tax planning', 'Israeli Americans', 'dual taxation', 'IRS compliance'],
          language: 'hebrew',
          wordCount: 2000
        })
      })

      if (!contentResponse.ok) {
        throw new Error('Content generation failed')
      }

      const contentData = await contentResponse.json()
      
      if (!contentData.success) {
        throw new Error('Content generation returned unsuccessful result')
      }

      await db.updatePipelineRun(pipelineRun.id, {
        current_stage: 'wordpress_creation',
        stages_completed: ['initialization', 'content_generation']
      })

      // Step 2: Create WordPress post with generated content
      await db.addPipelineLog(pipelineRun.id, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Creating WordPress post (${contentData.metadata.actualWordCount} words)...`,
        stage: 'wordpress_creation'
      })

      const wordPressPost = await wp.createPost({
        title: contentData.content.title_hebrew,
        content: `<!-- wp:paragraph --><p>${contentData.content.content_hebrew.replace(/\\n/g, '</p><!-- /wp:paragraph --><!-- wp:paragraph --><p>')}</p><!-- /wp:paragraph -->`,
        status: 'draft',
        excerpt: contentData.content.content_hebrew.substring(0, 200) + '...',
        meta: {
          seo_title: contentData.content.title_hebrew,
          seo_description: contentData.content.content_hebrew.substring(0, 160),
          target_keywords: contentData.content.target_keywords?.join(', ') || ''
        }
      })

      if (!wordPressPost?.id) {
        throw new Error('WordPress post creation failed')
      }

      await db.updatePipelineRun(pipelineRun.id, {
        current_stage: 'media_generation',
        stages_completed: ['initialization', 'content_generation', 'wordpress_creation']
      })

      // Step 3: Generate and upload featured image (with Kie.ai bypass)
      await db.addPipelineLog(pipelineRun.id, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Generating featured image...',
        stage: 'media_generation'
      })

      let featuredImageId = null
      try {
        const mediaResult = await mediaProcessor.generateAndUploadImage(
          `Professional illustration for tax article: ${contentData.content.title_hebrew}`,
          contentData.content.title_hebrew
        )
        
        if (mediaResult?.wordpress_id) {
          featuredImageId = mediaResult.wordpress_id
          
          // Set featured image on post
          await wp.updatePost(wordPressPost.id, {
            featured_media: featuredImageId
          })
          
          await db.addPipelineLog(pipelineRun.id, {
            timestamp: new Date().toISOString(),
            level: 'success',
            message: `Featured image uploaded (ID: ${featuredImageId})`,
            stage: 'media_generation'
          })
        }
      } catch (mediaError) {
        await db.addPipelineLog(pipelineRun.id, {
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: `Media generation skipped: ${mediaError}`,
          stage: 'media_generation'
        })
      }

      await db.updatePipelineRun(pipelineRun.id, {
        current_stage: 'publishing',
        stages_completed: ['initialization', 'content_generation', 'wordpress_creation', 'media_generation']
      })

      // Step 4: Publish the post
      await db.addPipelineLog(pipelineRun.id, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Publishing WordPress post...',
        stage: 'publishing'
      })

      const publishedPost = await wp.updatePost(wordPressPost.id, {
        status: 'publish'
      })

      if (!publishedPost) {
        throw new Error('Failed to publish WordPress post')
      }

      // Step 5: Update Airtable if record exists
      if (contentData.content.airtable_record) {
        try {
          await airtable.updateRecord('content-pieces', contentData.content.airtable_record, {
            'status': 'published',
            'wordpress_post_id': wordPressPost.id.toString(),
            'updated_at': new Date().toISOString()
          })
        } catch (airtableError) {
          await db.addPipelineLog(pipelineRun.id, {
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: `Airtable update failed: ${airtableError}`,
            stage: 'publishing'
          })
        }
      }

      // Complete the pipeline
      await db.updatePipelineRun(pipelineRun.id, {
        status: 'completed',
        current_stage: 'completed',
        stages_completed: ['initialization', 'content_generation', 'wordpress_creation', 'media_generation', 'publishing'],
        completed_at: new Date().toISOString()
      })

      await db.addPipelineLog(pipelineRun.id, {
        timestamp: new Date().toISOString(),
        level: 'success',
        message: `Content published successfully! Post ID: ${wordPressPost.id}`,
        stage: 'completed'
      })

      return NextResponse.json({
        success: true,
        message: 'Complete content publishing workflow completed',
        wordpress_post: {
          id: wordPressPost.id,
          title: publishedPost.title?.rendered || contentData.content.title_hebrew,
          url: publishedPost.link,
          status: 'published'
        },
        content_details: {
          word_count: contentData.metadata.actualWordCount,
          featured_image_id: featuredImageId,
          content_id: contentData.content.id
        },
        pipeline_run_id: pipelineRun.id,
        execution_time: new Date().toISOString()
      })

    } catch (error) {
      // Mark pipeline as failed
      await db.updatePipelineRun(pipelineRun.id, {
        status: 'failed',
        current_stage: 'failed',
        stages_failed: [pipelineRun.current_stage || 'unknown'],
        completed_at: new Date().toISOString()
      })

      await db.addPipelineLog(pipelineRun.id, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Pipeline failed: ${error}`,
        stage: 'failed'
      })

      throw error
    }

  } catch (error) {
    console.error('Publishing workflow error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stage: 'unknown'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Return status of publishing capabilities
  return NextResponse.json({
    success: true,
    capabilities: {
      content_generation: true,
      wordpress_publishing: true,
      media_generation: true,
      pipeline_tracking: true,
      airtable_integration: true
    },
    message: 'Complete publishing workflow ready',
    usage: 'POST with {"topic_title": "Your Topic"} to trigger full content creation and publishing'
  })
}