import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    
    // WordPress REST API endpoint - using correct env var names
    const wpUrl = process.env.NEXT_PUBLIC_WP_API_URL?.replace('/wp-json/wp/v2', '') || 'https://tax4us.co.il'
    const wpUsername = process.env.WORDPRESS_APP_USERNAME
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD

    if (!wpUsername || !wpPassword) {
      return NextResponse.json({
        success: false,
        error: 'WordPress credentials not configured'
      }, { status: 500 })
    }

    // Fetch published posts from WordPress
    const wpResponse = await fetch(`${wpUrl}/wp-json/wp/v2/posts?per_page=${limit}&status=publish&_embed`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    if (!wpResponse.ok) {
      throw new Error(`WordPress API error: ${wpResponse.statusText}`)
    }

    const posts = await wpResponse.json()
    
    // Transform WordPress posts to our format
    const transformedPosts = posts.map((post: any) => ({
      id: post.id,
      title: post.title.rendered,
      content: post.content.rendered,
      excerpt: post.excerpt.rendered,
      status: post.status,
      published_date: post.date,
      modified_date: post.modified,
      slug: post.slug,
      permalink: post.link,
      author: post._embedded?.author?.[0]?.name || 'Unknown',
      featured_image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
      categories: post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.name) || [],
      tags: post._embedded?.['wp:term']?.[1]?.map((tag: any) => tag.name) || [],
      seo_data: {
        // This would come from Rank Math if available
        focus_keywords: extractKeywordsFromContent(post.content.rendered),
        estimated_reading_time: Math.ceil(post.content.rendered.split(' ').length / 200)
      }
    }))

    return NextResponse.json({
      success: true,
      posts: transformedPosts,
      total_posts: posts.length,
      source: 'WordPress API',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('WordPress posts fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function extractKeywordsFromContent(content: string): string[] {
  // Simple keyword extraction from content
  const taxKeywords = [
    'FBAR', 'FATCA', 'tax treaty', 'dual citizen', 'Israeli tax', 'American tax',
    'cross-border', 'IRS', 'Form 1040', 'foreign account', 'tax compliance'
  ]
  
  const foundKeywords: string[] = []
  const lowerContent = content.toLowerCase()
  
  taxKeywords.forEach(keyword => {
    if (lowerContent.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword)
    }
  })
  
  return foundKeywords.slice(0, 5) // Limit to 5 keywords
}