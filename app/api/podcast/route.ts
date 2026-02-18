import { NextRequest, NextResponse } from 'next/server'
import { podcastProducer } from '@/lib/services/podcast-producer'
import { db } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    // Test podcast service connections
    const connectionTest = await podcastProducer.testConnections()
    
    return NextResponse.json({
      success: true,
      connections: connectionTest,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Podcast test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId } = body

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

    // Create podcast episode
    const episode = await podcastProducer.createPodcastEpisode(contentPiece)

    return NextResponse.json({
      success: episode.status !== 'failed',
      episode,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Podcast production error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}