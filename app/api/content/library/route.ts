import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    // Get all content pieces with their related data
    const contentPieces = await db.getContentPieces()
    const topics = await db.getTopics()
    
    // Enrich content pieces with topic information for better filtering
    const enrichedContentPieces = contentPieces.map(piece => {
      const relatedTopic = topics.find(t => t.id === piece.topic_id)
      return {
        ...piece,
        topic_priority: relatedTopic?.priority || 'medium',
        topic_tags: relatedTopic?.tags || []
      }
    })

    // Sort by updated_at (most recent first)
    enrichedContentPieces.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    return NextResponse.json({
      success: true,
      content_pieces: enrichedContentPieces,
      total_count: enrichedContentPieces.length,
      statistics: {
        by_status: {
          draft: enrichedContentPieces.filter(p => p.status === 'draft').length,
          pending_approval: enrichedContentPieces.filter(p => p.status === 'pending_approval').length,
          approved: enrichedContentPieces.filter(p => p.status === 'approved').length,
          published: enrichedContentPieces.filter(p => p.status === 'published').length
        },
        by_language: {
          english_only: enrichedContentPieces.filter(p => p.content_english && !p.content_hebrew).length,
          hebrew_only: enrichedContentPieces.filter(p => p.content_hebrew && !p.content_english).length,
          bilingual: enrichedContentPieces.filter(p => p.content_english && p.content_hebrew).length,
          no_content: enrichedContentPieces.filter(p => !p.content_english && !p.content_hebrew).length
        },
        seo_scores: {
          high: enrichedContentPieces.filter(p => (p.seo_score || 0) >= 90).length,
          good: enrichedContentPieces.filter(p => (p.seo_score || 0) >= 80 && (p.seo_score || 0) < 90).length,
          fair: enrichedContentPieces.filter(p => (p.seo_score || 0) >= 70 && (p.seo_score || 0) < 80).length,
          poor: enrichedContentPieces.filter(p => (p.seo_score || 0) < 70).length,
          unscored: enrichedContentPieces.filter(p => !p.seo_score).length
        },
        with_media: {
          featured_image: enrichedContentPieces.filter(p => p.media_urls.featured_image).length,
          blog_video: enrichedContentPieces.filter(p => p.media_urls.blog_video).length,
          social_video: enrichedContentPieces.filter(p => p.media_urls.social_video).length,
          podcast_audio: enrichedContentPieces.filter(p => p.media_urls.podcast_audio).length,
          total_with_media: enrichedContentPieces.filter(p => 
            p.media_urls.featured_image || 
            p.media_urls.blog_video || 
            p.media_urls.social_video || 
            p.media_urls.podcast_audio
          ).length
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Content library API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      content_pieces: [],
      total_count: 0
    }, { status: 500 })
  }
}

// Optional: Add search endpoint with query parameters
export async function POST(request: NextRequest) {
  try {
    const { 
      search_term, 
      status_filter, 
      language_filter, 
      min_seo_score, 
      priority_filter,
      keyword_filter,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = await request.json()

    const contentPieces = await db.getContentPieces()
    const topics = await db.getTopics()
    
    // Apply filters
    let filteredPieces = contentPieces.map(piece => {
      const relatedTopic = topics.find(t => t.id === piece.topic_id)
      return {
        ...piece,
        topic_priority: relatedTopic?.priority || 'medium',
        topic_tags: relatedTopic?.tags || []
      }
    })

    // Search term filter
    if (search_term) {
      const searchLower = search_term.toLowerCase()
      filteredPieces = filteredPieces.filter(piece => 
        piece.title_english.toLowerCase().includes(searchLower) ||
        piece.title_hebrew.includes(search_term) ||
        piece.target_keywords.some(keyword => keyword.toLowerCase().includes(searchLower)) ||
        (piece.topic_tags && piece.topic_tags.some(tag => tag.toLowerCase().includes(searchLower)))
      )
    }

    // Status filter
    if (status_filter && status_filter !== 'all') {
      filteredPieces = filteredPieces.filter(piece => piece.status === status_filter)
    }

    // Language filter
    if (language_filter && language_filter !== 'all') {
      switch (language_filter) {
        case 'english':
          filteredPieces = filteredPieces.filter(piece => piece.content_english && !piece.content_hebrew)
          break
        case 'hebrew':
          filteredPieces = filteredPieces.filter(piece => piece.content_hebrew && !piece.content_english)
          break
        case 'bilingual':
          filteredPieces = filteredPieces.filter(piece => piece.content_english && piece.content_hebrew)
          break
      }
    }

    // SEO score filter
    if (min_seo_score && min_seo_score > 0) {
      filteredPieces = filteredPieces.filter(piece => (piece.seo_score || 0) >= min_seo_score)
    }

    // Priority filter
    if (priority_filter && priority_filter !== 'all') {
      filteredPieces = filteredPieces.filter(piece => piece.topic_priority === priority_filter)
    }

    // Keyword filter
    if (keyword_filter && keyword_filter !== 'all') {
      filteredPieces = filteredPieces.filter(piece => 
        piece.target_keywords.some(keyword => keyword.toLowerCase().includes(keyword_filter.toLowerCase())) ||
        (piece.topic_tags && piece.topic_tags.some(tag => tag.toLowerCase().includes(keyword_filter.toLowerCase())))
      )
    }

    // Date range filter
    if (date_from) {
      filteredPieces = filteredPieces.filter(piece => 
        new Date(piece.created_at) >= new Date(date_from)
      )
    }
    if (date_to) {
      filteredPieces = filteredPieces.filter(piece => 
        new Date(piece.created_at) <= new Date(date_to)
      )
    }

    // Sort by updated_at (most recent first)
    filteredPieces.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    // Apply pagination
    const total_count = filteredPieces.length
    const paginatedPieces = filteredPieces.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      content_pieces: paginatedPieces,
      total_count,
      filtered_count: filteredPieces.length,
      pagination: {
        limit,
        offset,
        has_more: offset + limit < total_count
      },
      filters_applied: {
        search_term,
        status_filter,
        language_filter,
        min_seo_score,
        priority_filter,
        keyword_filter,
        date_from,
        date_to
      }
    })

  } catch (error) {
    console.error('Content library search API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}