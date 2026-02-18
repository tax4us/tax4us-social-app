import { NextRequest, NextResponse } from 'next/server'
import { pipelineManager } from '@/lib/services/pipeline'

export async function POST(request: NextRequest) {
  try {
    const { runId, targetStage } = await request.json()
    
    // Manually advance pipeline to target stage
    await pipelineManager.executeStage(runId, targetStage)
    
    return NextResponse.json({
      success: true,
      message: `Pipeline advanced to ${targetStage}`,
      runId
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}