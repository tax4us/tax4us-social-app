import { NextRequest, NextResponse } from 'next/server'
import { AirtableClient } from '@/lib/clients/airtable-client'
import { WordPressClient } from '@/lib/clients/wordpress-client'
import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator'

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || "tax4us_local_test_key"
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { contentId, action = 'process_all' } = await request.json()
    
    // Get draft content from Airtable
    const airtable = new AirtableClient()
    const wp = new WordPressClient()
    const orchestrator = new PipelineOrchestrator()
    
    let contentPieces = []
    
    if (contentId) {
      // Process specific content piece
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content/library`)
      const data = await response.json()
      
      if (data.success) {
        contentPieces = data.content_pieces.filter((piece: any) => 
          piece.id === contentId && piece.status === 'draft'
        )
      }
    } else {
      // Process all draft content
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content/library`)
      const data = await response.json()
      
      if (data.success) {
        contentPieces = data.content_pieces.filter((piece: any) => piece.status === 'draft')
      }
    }
    
    if (contentPieces.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No draft content pieces found to process',
        processed: 0
      })
    }
    
    const results = []
    
    // Process each draft content piece
    for (const piece of contentPieces.slice(0, 2)) { // Process max 2 at a time
      try {
        console.log(`Processing content piece: ${piece.title_english}`)
        
        // Check if content is substantial enough (not test content)
        if (!piece.content_english || piece.content_english.length < 100) {
          console.log(`Skipping ${piece.id}: Content too short or missing`)
          results.push({
            id: piece.id,
            status: 'skipped',
            reason: 'insufficient_content'
          })
          continue
        }
        
        // 1. Create WordPress draft
        const wordPressDraft = await wp.createPost({
          title: piece.title_english,
          content: `<!-- wp:paragraph --><p>${piece.content_english}</p><!-- /wp:paragraph -->`,
          status: 'draft',
          meta: {
            airtable_content_id: piece.id,
            airtable_topic_id: piece.topic_id,
            target_keywords: piece.target_keywords?.join(', ') || '',
            seo_score: piece.seo_score || 0
          }
        })
        
        if (!wordPressDraft?.id) {
          throw new Error('Failed to create WordPress draft')
        }
        
        console.log(`Created WordPress draft ${wordPressDraft.id} for content ${piece.id}`)
        
        // 2. Process through pipeline (this runs async)
        const pipelineResult = await orchestrator.generatePost(
          wordPressDraft.id,
          piece.title_english,
          piece.id
        )
        
        // 3. Update Airtable status to processing
        try {
          if (piece.airtable_record_id) {
            await airtable.updateRecord('content-pieces', piece.airtable_record_id, {
              'status': 'processing',
              'wordpress_post_id': wordPressDraft.id.toString(),
              'updated_at': new Date().toISOString()
            })
          }
        } catch (error) {
          console.warn('Failed to update Airtable record:', error)
        }
        
        results.push({
          id: piece.id,
          status: 'processing',
          wordpress_post_id: wordPressDraft.id,
          pipeline_result: pipelineResult
        })
        
        // Wait between processing to avoid overloading
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`Failed to process content ${piece.id}:`, error)
        results.push({
          id: piece.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} content pieces`,
      processed: results.length,
      results: results
    })
    
  } catch (error) {
    console.error('Draft processing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Simple status check - return draft content ready for processing
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content/library`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error('Failed to fetch content library')
    }
    
    const draftPieces = data.content_pieces.filter((piece: any) => piece.status === 'draft')
    const processableDrafts = draftPieces.filter((piece: any) => 
      piece.content_english && piece.content_english.length >= 100
    )
    
    return NextResponse.json({
      success: true,
      total_drafts: draftPieces.length,
      processable_drafts: processableDrafts.length,
      drafts: processableDrafts.map((piece: any) => ({
        id: piece.id,
        title: piece.title_english,
        content_length: piece.content_english?.length || 0,
        created_at: piece.created_at
      }))
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}