import { NextRequest, NextResponse } from 'next/server'
import { socialMediaPublisher } from '@/lib/services/social-media-publisher'
import { db } from '@/lib/services/database'

export async function POST(request: NextRequest) {
  try {
    const { contentId, platforms = ['facebook', 'linkedin'] } = await request.json()
    
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

    // Generate and publish social media posts
    const results = await socialMediaPublisher.publishContentToSocial(contentPiece)
    
    return NextResponse.json({
      success: true,
      posts: results,
      contentTitle: contentPiece.title_hebrew,
      publishedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Social media publishing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Test social media connections
 */
export async function GET() {
  try {
    const connectionTest = await socialMediaPublisher.testConnections()
    
    return NextResponse.json({
      success: true,
      connections: connectionTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Social media test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}