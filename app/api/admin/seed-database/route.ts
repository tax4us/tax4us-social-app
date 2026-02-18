import { NextRequest, NextResponse } from 'next/server'
import { topicSeeder } from '@/lib/services/topic-seeder'
import { db } from '@/lib/services/database'

export async function POST(request: NextRequest) {
  try {
    // Basic admin authentication check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    console.log('🚀 Starting Tax4US database initialization...')

    // Initialize database structure
    await db.init()
    
    // Seed the topic database with the 31 core tax topics
    await topicSeeder.seedDatabase()
    
    // Get current stats
    const topics = await db.getTopics()
    const contentPieces = await db.getContentPieces()
    const pipelineRuns = await db.getPipelineRuns()
    
    return NextResponse.json({
      success: true,
      message: 'Tax4US database initialized successfully',
      stats: {
        topics: topics.length,
        contentPieces: contentPieces.length,
        pipelineRuns: pipelineRuns.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database seeding error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET endpoint to check database status
export async function GET(request: NextRequest) {
  try {
    const topics = await db.getTopics()
    const contentPieces = await db.getContentPieces()
    const pipelineRuns = await db.getPipelineRuns()
    const activeRuns = await db.getActiveRuns()
    const pendingApprovals = await db.getPendingApprovals()
    
    return NextResponse.json({
      status: 'ready',
      stats: {
        topics: topics.length,
        contentPieces: contentPieces.length,
        pipelineRuns: pipelineRuns.length,
        activeRuns: activeRuns.length,
        pendingApprovals: pendingApprovals.length
      },
      lastUpdate: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}