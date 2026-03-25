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
    const publisher = socialMediaPublisher as unknown as {
      generateFacebookPost: (contentPiece: unknown) => Promise<unknown>;
      generateLinkedInPost: (contentPiece: unknown) => Promise<unknown>;
    }
    
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
          content: (facebookPost as any)?.content || 'Preview unavailable',
          hashtags: (facebookPost as any)?.hashtags || [],
          mediaUrl: (facebookPost as any)?.mediaUrl || '',
          wordCount: ((facebookPost as any)?.content || '').split(/\s+/).length,
          characterCount: ((facebookPost as any)?.content || '').length
        },
        linkedin: {
          platform: 'linkedin', 
          content: (linkedinPost as any)?.content || 'Preview unavailable',
          hashtags: (linkedinPost as any)?.hashtags || [],
          mediaUrl: (linkedinPost as any)?.mediaUrl || '',
          wordCount: ((linkedinPost as any)?.content || '').split(/\s+/).length,
          characterCount: ((linkedinPost as any)?.content || '').length
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