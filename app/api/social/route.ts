import { NextRequest, NextResponse } from 'next/server'
import { socialMediaPublisher } from '@/lib/services/social-media-publisher'
import { db } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    // Test social media connections
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, action = 'publish', schedule } = body

    if (!contentId) {
      return NextResponse.json({
        success: false,
        error: 'Content ID is required'
      }, { status: 400 })
    }

    // Get content piece from database
    const contentPieces = await db.getContentPieces()
    const contentPiece = contentPieces.find(piece => piece.id === contentId)

    if (!contentPiece) {
      return NextResponse.json({
        success: false,
        error: 'Content piece not found'
      }, { status: 404 })
    }

    let results
    
    if (action === 'schedule') {
      // Schedule posts for optimal times
      results = await socialMediaPublisher.scheduleOptimalPosts(contentPiece)
    } else {
      // Publish immediately
      results = await socialMediaPublisher.publishContentToSocial(contentPiece)
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: successful > 0,
      message: `Published to ${successful} platform(s), ${failed} failed`,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Social media publishing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}