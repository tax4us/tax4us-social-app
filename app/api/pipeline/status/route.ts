import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    const activeRuns = await db.getActiveRuns()
    const allRuns = await db.getPipelineRuns()
    const recentRuns = allRuns
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      activeRuns,
      recentRuns,
      stats: {
        totalRuns: allRuns.length,
        activeRuns: activeRuns.length,
        completedRuns: allRuns.filter(r => r.status === 'completed').length,
        failedRuns: allRuns.filter(r => r.status === 'failed').length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pipeline status error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}