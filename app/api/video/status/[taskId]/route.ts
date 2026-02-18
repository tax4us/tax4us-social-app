import { NextRequest, NextResponse } from 'next/server'
import { KieClient } from '@/lib/clients/kie-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'Task ID is required'
      }, { status: 400 })
    }

    const kie = new KieClient()
    const status = await kie.getTask(taskId)

    return NextResponse.json({
      success: true,
      taskId,
      status: status.status,
      videoUrl: status.videoUrl || status.url,
      error: status.error,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check video status'
    }, { status: 500 })
  }
}