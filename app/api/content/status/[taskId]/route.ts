import { NextRequest, NextResponse } from 'next/server'
import { contentGenerationService } from '@/lib/services/content-generation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'text-to-speech' | 'video' | 'image'

    if (!type) {
      return NextResponse.json(
        { error: 'Type parameter is required' },
        { status: 400 }
      )
    }

    const result = await contentGenerationService.checkTaskStatus(taskId, type)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}