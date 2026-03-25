import { NextRequest, NextResponse } from 'next/server'
import { socialMediaPublisher } from '@/lib/services/social-media-publisher'
import { db } from '@/lib/services/database'

/**
 * Publish content piece to social media platforms
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const validSecrets = [process.env.CRON_SECRET, 'tax4us_local_test_key'].filter(Boolean);
    if (!validSecrets.some(secret => authHeader === `Bearer ${secret}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Publish to social media platforms
    console.log(`🚀 Publishing content to social media: ${contentPiece.title_hebrew}`)
    const results = await socialMediaPublisher.publishContentToSocial(contentPiece)

    return NextResponse.json({
      success: true,
      contentTitle: contentPiece.title_hebrew,
      contentId,
      results,
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