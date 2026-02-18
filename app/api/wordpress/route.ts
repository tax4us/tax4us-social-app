import { NextRequest, NextResponse } from 'next/server'
import { wordpressPublisher } from '@/lib/services/wordpress-publisher'
import { db } from '@/lib/services/database'

export async function POST(request: NextRequest) {
  try {
    const { contentId, options } = await request.json()
    
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

    // Publish to WordPress
    const result = await wordpressPublisher.publishToWordPress(contentPiece, options)
    
    return NextResponse.json({
      success: true,
      post: result,
      publishedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('WordPress publishing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Test WordPress connection
 */
export async function GET() {
  try {
    const connectionTest = await wordpressPublisher.testConnection()
    
    return NextResponse.json({
      success: connectionTest.success,
      message: connectionTest.message,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('WordPress test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}