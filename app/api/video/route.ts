import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'
// import { remotionVideoService } from '@/lib/services/remotion-video-service' // Removed - file deleted

export async function POST(request: NextRequest) {
  try {
    const { contentId, videoType = 'wordpress' } = await request.json()
    
    if (!contentId) {
      return NextResponse.json({
        success: false,
        error: 'contentId is required'
      }, { status: 400 })
    }

    // Get content piece
    const contentPiece = await db.getContentPiece(contentId)
    if (!contentPiece) {
      return NextResponse.json({
        success: false,
        error: 'Content piece not found'
      }, { status: 404 })
    }

    // Remotion video service was removed - returning mock response
    return NextResponse.json({
      success: false,
      error: 'Video generation service temporarily disabled',
      message: 'Remotion video service has been removed from the codebase'
    }, { status: 503 });

  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}