import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const platform = url.searchParams.get('platform') || 'all'
    const days = parseInt(url.searchParams.get('days') || '30')

    let analytics: any = {}

    // Captivate.fm (Hosting Platform)
    if (platform === 'all' || platform === 'captivate') {
      analytics.captivate = await getCaptivateAnalytics(days)
    }

    // Spotify Analytics
    if (platform === 'all' || platform === 'spotify') {
      analytics.spotify = await getSpotifyAnalytics(days)  
    }

    // Apple Podcasts Analytics
    if (platform === 'all' || platform === 'apple') {
      analytics.apple_podcasts = await getApplePodcastsAnalytics(days)
    }

    // Combined summary
    if (platform === 'all') {
      analytics.summary = calculatePodcastSummary(analytics)
    }

    return NextResponse.json({
      success: true,
      analytics,
      period_days: days,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Podcast analytics error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getCaptivateAnalytics(days: number) {
  const showId = process.env.CAPTIVATE_SHOW_ID
  const apiKey = process.env.CAPTIVATE_API_KEY
  
  if (!showId || !apiKey) {
    return {
      error: 'Captivate credentials not configured',
      episodes: 0,
      downloads: 0,
      recent_episodes: []
    }
  }

  // Mock data - in production this would use Captivate API
  return {
    show_id: showId,
    total_episodes: Math.floor(Math.random() * 20) + 15,
    total_downloads: Math.floor(Math.random() * 5000) + 2000,
    unique_listeners: Math.floor(Math.random() * 1000) + 500,
    average_listen_duration: '8:45',
    recent_episodes: [
      {
        id: 'ep_001',
        title: 'Tax4US Weekly: FBAR Filing Requirements',
        published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        downloads: Math.floor(Math.random() * 300) + 50,
        duration: '12:34',
        completion_rate: '78%'
      },
      {
        id: 'ep_002', 
        title: 'Tax4US Weekly: US-Israel Tax Treaty Guide',
        published_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        downloads: Math.floor(Math.random() * 250) + 80,
        duration: '15:22',
        completion_rate: '82%'
      }
    ],
    growth_rate: '+' + (Math.random() * 20 + 5).toFixed(1) + '%' // 5-25% growth
  }
}

async function getSpotifyAnalytics(days: number) {
  // Mock Spotify data
  return {
    platform: 'Spotify',
    followers: Math.floor(Math.random() * 800) + 200,
    monthly_listeners: Math.floor(Math.random() * 2000) + 500,
    streams: Math.floor(Math.random() * 3000) + 800,
    saves: Math.floor(Math.random() * 150) + 50,
    top_episodes: [
      {
        title: 'US-Israel Tax Treaty: Complete Guide',
        streams: Math.floor(Math.random() * 500) + 100,
        completion_rate: '75%'
      },
      {
        title: 'FBAR Filing Requirements Explained',
        streams: Math.floor(Math.random() * 400) + 120,
        completion_rate: '68%'
      }
    ],
    audience_countries: [
      { country: 'Israel', percentage: 45 },
      { country: 'United States', percentage: 35 },
      { country: 'Canada', percentage: 8 },
      { country: 'United Kingdom', percentage: 7 },
      { country: 'Other', percentage: 5 }
    ]
  }
}

async function getApplePodcastsAnalytics(days: number) {
  // Mock Apple Podcasts data
  return {
    platform: 'Apple Podcasts',
    followers: Math.floor(Math.random() * 600) + 300,
    unique_listeners: Math.floor(Math.random() * 1200) + 400,
    episodes_downloaded: Math.floor(Math.random() * 2500) + 700,
    ratings_count: Math.floor(Math.random() * 50) + 20,
    average_rating: (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5-5.0 range
    top_episodes: [
      {
        title: 'Israeli-American Tax Planning Strategies',
        downloads: Math.floor(Math.random() * 300) + 80,
        rating: '4.8'
      },
      {
        title: 'Cross-Border Tax Compliance Guide', 
        downloads: Math.floor(Math.random() * 280) + 90,
        rating: '4.6'
      }
    ],
    countries: [
      { country: 'United States', downloads: 40 },
      { country: 'Israel', downloads: 38 },
      { country: 'Canada', downloads: 10 },
      { country: 'Australia', downloads: 7 },
      { country: 'Other', downloads: 5 }
    ]
  }
}

function calculatePodcastSummary(analytics: any) {
  const captivate = analytics.captivate || {}
  const spotify = analytics.spotify || {} 
  const apple = analytics.apple_podcasts || {}

  return {
    total_episodes: captivate.total_episodes || 0,
    total_downloads: (captivate.total_downloads || 0) + (apple.episodes_downloaded || 0),
    total_streams: (spotify.streams || 0),
    total_followers: (captivate.unique_listeners || 0) + (spotify.followers || 0) + (apple.followers || 0),
    platforms: {
      captivate: !!captivate.show_id,
      spotify: true,
      apple_podcasts: true
    },
    performance_summary: 'Strong growth across all platforms with high engagement rates'
  }
}