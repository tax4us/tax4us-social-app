import { NextRequest, NextResponse } from 'next/server'
import { pipelineManager } from '@/lib/services/pipeline'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    const status = await pipelineManager.getPipelineStatus(runId)
    
    return NextResponse.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pipeline run status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}