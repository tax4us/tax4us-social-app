import { NextRequest, NextResponse } from 'next/server'
import { pipelineManager } from '@/lib/services/pipeline'

// This endpoint is called by Vercel Cron on Monday and Thursday at 8:00 AM
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

    console.log('Starting Tax4US Content Pipeline - Cron Job')
    
    // Start the main content pipeline
    const runId = await pipelineManager.startContentPipeline('cron')
    
    return NextResponse.json({
      success: true,
      message: 'Content pipeline started successfully',
      runId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Content pipeline cron error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}