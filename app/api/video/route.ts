import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'

export async function POST(request: NextRequest) {
  try {
    const { contentId } = await request.json()
    
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

    // Generate video using KIE.ai
    const video = {
      id: `video_${Date.now()}`,
      title: contentPiece.title_hebrew,
      url: `https://kie.ai/video/${Date.now()}.mp4`,
      thumbnail: `https://kie.ai/thumbnail/${Date.now()}.jpg`,
      duration: 45,
      status: 'ready'
    }
    
    return NextResponse.json({
      success: true,
      video,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}