import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'
import { seoOptimizer } from '@/lib/services/seo-optimizer'
import { wordPressPublisher } from '@/lib/services/wordpress-publisher'

// This endpoint is called by Vercel Cron on Tuesday and Friday at 10:00 AM
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting SEO Post Editor - Cron Job')
    
    // Start SEO optimization pipeline
    const run = await db.createPipelineRun({
      trigger_type: 'cron',
      pipeline_type: 'seo_optimization',
      status: 'running',
      current_stage: 'scanning_posts',
      stages_completed: [],
      stages_failed: [],
      logs: [],
      started_at: new Date().toISOString()
    })

    // Get published content pieces with low SEO scores
    const contentPieces = await db.getContentPieces()
    const lowSEOPosts = contentPieces.filter(piece => 
      piece.status === 'published' && 
      (piece.seo_score || 0) < 80
    )

    await db.addPipelineLog(run.id, {
      timestamp: new Date().toISOString(),
      level: 'info',
      stage: 'scanning_posts',
      message: `Found ${lowSEOPosts.length} posts with SEO score < 80`
    })

    // Process each low-scoring post
    for (const post of lowSEOPosts.slice(0, 5)) { // Limit to 5 posts per run
      try {
        await optimizePostSEO(run.id, post.id)
      } catch (error) {
        await db.addPipelineLog(run.id, {
          timestamp: new Date().toISOString(),
          level: 'error',
          stage: 'optimizing_post',
          message: `Failed to optimize post ${post.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    // Complete the run
    await db.updatePipelineRun(run.id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `SEO optimization completed. Processed ${Math.min(lowSEOPosts.length, 5)} posts`,
      runId: run.id,
      postsProcessed: Math.min(lowSEOPosts.length, 5),
      totalLowSEOPosts: lowSEOPosts.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('SEO optimizer cron error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function optimizePostSEO(runId: string, contentId: string): Promise<void> {
  const contentPiece = await db.getContentPiece(contentId)
  if (!contentPiece) return

  await db.addPipelineLog(runId, {
    timestamp: new Date().toISOString(),
    level: 'info',
    stage: 'optimizing_post',
    message: `Starting AI-powered SEO optimization for: ${contentPiece.title_english}`,
    data: { contentId, currentScore: contentPiece.seo_score }
  })

  try {
    // Real AI-powered SEO optimization using NotebookLM
    const analysis = await seoOptimizer.analyzeAndOptimize(contentPiece)
    
    await db.addPipelineLog(runId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      stage: 'optimizing_post',
      message: `SEO analysis completed. Found ${analysis.issues.length} issues. Target score: ${analysis.targetScore}`,
      data: { 
        contentId, 
        currentScore: analysis.currentScore,
        targetScore: analysis.targetScore,
        issuesFound: analysis.issues.length
      }
    })

    // Apply the optimizations
    const result = await seoOptimizer.applyOptimizations(contentPiece, analysis)
    
    if (result.success) {
      // Update content piece with new SEO score
      await db.updateContentPiece(contentId, {
        seo_score: result.newScore
      })

      await db.addPipelineLog(runId, {
        timestamp: new Date().toISOString(),
        level: 'info',
        stage: 'optimizing_post',
        message: `SEO optimization completed successfully. Score improved from ${analysis.currentScore} to ${result.newScore}`,
        data: { 
          contentId, 
          oldScore: analysis.currentScore,
          newScore: result.newScore,
          wordpressUrl: result.wordpressUrl,
          optimizationsApplied: analysis.recommendations.length
        }
      })
    } else {
      throw new Error('Failed to apply SEO optimizations')
    }

  } catch (error) {
    await db.addPipelineLog(runId, {
      timestamp: new Date().toISOString(),
      level: 'error',
      stage: 'optimizing_post',
      message: `SEO optimization failed for ${contentPiece.title_english}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: { contentId, error: error instanceof Error ? error.message : 'Unknown error' }
    })
    
    // Don't throw - continue with next post
    console.error(`SEO optimization failed for content ${contentId}:`, error)
  }
}