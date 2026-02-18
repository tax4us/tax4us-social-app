import { NextRequest, NextResponse } from 'next/server'
import { socialMediaPublisher } from '@/lib/services/social-media-publisher'
import { db } from '@/lib/services/database'

/**
 * Generate and preview social media posts without publishing
 */
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

    // Access private methods through reflection to generate posts without publishing
    const publisher = socialMediaPublisher as any
    
    // Generate Facebook and LinkedIn posts
    const [facebookPost, linkedinPost] = await Promise.all([
      publisher.generateFacebookPost(contentPiece),
      publisher.generateLinkedInPost(contentPiece)
    ])

    return NextResponse.json({
      success: true,
      contentTitle: contentPiece.title_hebrew,
      posts: {
        facebook: {
          platform: 'facebook',
          content: facebookPost.content,
          hashtags: facebookPost.hashtags,
          mediaUrl: facebookPost.mediaUrl,
          wordCount: facebookPost.content.split(/\s+/).length,
          characterCount: facebookPost.content.length
        },
        linkedin: {
          platform: 'linkedin', 
          content: linkedinPost.content,
          hashtags: linkedinPost.hashtags,
          mediaUrl: linkedinPost.mediaUrl,
          wordCount: linkedinPost.content.split(/\s+/).length,
          characterCount: linkedinPost.content.length
        }
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Social media preview error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}