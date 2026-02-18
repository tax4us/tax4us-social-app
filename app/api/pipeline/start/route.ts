import { NextRequest, NextResponse } from 'next/server'
import { pipelineManager } from '@/lib/services/pipeline'
import { projectMemory } from '@/lib/services/project-memory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trigger_type = 'manual' } = body
    
    // Use the singleton pipeline manager
    
    // Start the content pipeline
    const runId = await pipelineManager.startContentPipeline(trigger_type)

    // Log this task in project memory
    await projectMemory.logTask(
      `Manual content pipeline started (Run: ${runId})`,
      'in_progress',
      `Pipeline triggered via Executive Center dashboard. Run ID: ${runId}`,
      []
    )

    return NextResponse.json({
      success: true,
      runId,
      message: 'Content pipeline started successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pipeline start error:', error)
    
    // Log the error in project memory
    await projectMemory.logTask(
      'Failed to start content pipeline',
      'blocked',
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      []
    )

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}