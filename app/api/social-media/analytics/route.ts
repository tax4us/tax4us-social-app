import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const platform = url.searchParams.get('platform') || 'all'
    const days = parseInt(url.searchParams.get('days') || '30')

    let analytics: any = {}

    // Facebook Analytics
    if (platform === 'all' || platform === 'facebook') {
      analytics.facebook = await getFacebookAnalytics(days)
    }

    // LinkedIn Analytics  
    if (platform === 'all' || platform === 'linkedin') {
      analytics.linkedin = await getLinkedInAnalytics(days)
    }

    // Calculate aggregated metrics for dashboard
    const aggregated = {
      reach: (analytics.facebook?.total_reach || 0) + (analytics.linkedin?.total_impressions || 0),
      engagement: ((analytics.facebook?.total_engagement || 0) + (analytics.linkedin?.total_engagement || 0)),
      leads: Math.floor(((analytics.facebook?.total_engagement || 0) + (analytics.linkedin?.total_engagement || 0)) * 0.08), // Estimate 8% conversion
      posts: (analytics.facebook?.posts || 0) + (analytics.linkedin?.posts || 0),
      engagementRate: analytics.linkedin?.engagement_rate || '5.2%'
    }

    return NextResponse.json({
      success: true,
      analytics: {
        ...analytics,
        ...aggregated // Include aggregated metrics for dashboard compatibility
      },
      period_days: days,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Social media analytics error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getFacebookAnalytics(days: number) {
  const pageId = process.env.FACEBOOK_PAGE_ID
  
  if (!pageId) {
    return {
      error: 'Facebook Page ID not configured',
      posts: 0,
      engagement: 0,
      reach: 0,
      recent_posts: []
    }
  }

  // Mock data for now - in production this would use Facebook Graph API
  return {
    page_id: pageId,
    posts: Math.floor(Math.random() * 20) + 5,
    total_engagement: Math.floor(Math.random() * 1000) + 100,
    total_reach: Math.floor(Math.random() * 5000) + 500,
    followers: Math.floor(Math.random() * 2000) + 800,
    recent_posts: [
      {
        id: 'fb_post_1',
        content: '🔍 Did you know? FBAR Filing Requirements...',
        posted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        likes: Math.floor(Math.random() * 50) + 5,
        shares: Math.floor(Math.random() * 20) + 1,
        comments: Math.floor(Math.random() * 15) + 1
      },
      {
        id: 'fb_post_2', 
        content: '💡 US-Israel Tax Treaty benefits you should know...',
        posted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        likes: Math.floor(Math.random() * 40) + 8,
        shares: Math.floor(Math.random() * 15) + 2,
        comments: Math.floor(Math.random() * 10) + 1
      }
    ],
    performance_score: Math.floor(Math.random() * 30) + 70 // 70-100 range
  }
}

async function getLinkedInAnalytics(days: number) {
  const orgUrn = process.env.LINKEDIN_ORG_URN
  
  if (!orgUrn) {
    return {
      error: 'LinkedIn Organization URN not configured',
      posts: 0,
      engagement: 0,
      impressions: 0,
      recent_posts: []
    }
  }

  // Mock data for now - in production this would use LinkedIn Marketing API
  return {
    organization_urn: orgUrn,
    posts: Math.floor(Math.random() * 15) + 8,
    total_impressions: Math.floor(Math.random() * 10000) + 2000,
    total_engagement: Math.floor(Math.random() * 500) + 100,
    followers: Math.floor(Math.random() * 3000) + 1200,
    recent_posts: [
      {
        id: 'li_post_1',
        content: 'Israeli-American tax compliance insights...',
        posted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        impressions: Math.floor(Math.random() * 2000) + 200,
        likes: Math.floor(Math.random() * 30) + 5,
        shares: Math.floor(Math.random() * 10) + 1,
        comments: Math.floor(Math.random() * 8) + 1
      },
      {
        id: 'li_post_2',
        content: 'Cross-border tax planning strategies for 2026...',
        posted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        impressions: Math.floor(Math.random() * 1500) + 300,
        likes: Math.floor(Math.random() * 25) + 8,
        shares: Math.floor(Math.random() * 8) + 2,
        comments: Math.floor(Math.random() * 6) + 1
      }
    ],
    engagement_rate: (Math.random() * 8 + 2).toFixed(2) + '%' // 2-10% range
  }
}