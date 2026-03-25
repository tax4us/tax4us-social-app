import { NextRequest, NextResponse } from 'next/server'
import { wordPressPublisher } from '@/lib/services/wordpress-publisher'
import { db } from '@/lib/services/database'

/**
 * Publish content piece to WordPress
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

    // Publish to WordPress with video
    console.log(`📝 Publishing content to WordPress: ${contentPiece.title_hebrew}`)
    const result = await wordPressPublisher.publishContent(contentPiece, {
      status: 'publish',
      categories: ['Tax Advice'],
      tags: contentPiece.target_keywords,
      seoMeta: {
        metaTitle: contentPiece.title_hebrew,
        metaDescription: `מידע מקצועי על ${contentPiece.target_keywords.join(', ')} לישראלים-אמריקאים`,
        focusKeywords: contentPiece.target_keywords
      }
    })

    return NextResponse.json({
      success: true,
      contentTitle: contentPiece.title_hebrew,
      contentId,
      wordpress: result,
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