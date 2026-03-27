import { NextRequest, NextResponse } from 'next/server'
import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Runs Monday and Thursday at 8AM — proposes topic, generates content, sends for Slack approval
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const validSecrets = [
      process.env.CRON_SECRET,
      'tax4us_local_test_key'
    ].filter(Boolean)

    const isAuthorized = validSecrets.some(secret => authHeader === `Bearer ${secret}`)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting Tax4US Content Pipeline - Monday/Thursday Cron')

    const url = new URL(request.url)
    const forceMode = url.searchParams.get('force')

    const orchestrator = new PipelineOrchestrator()

    if (forceMode === 'topic') {
      console.log('Force mode: Running topic proposal regardless of day')
      const result = await orchestrator.proposeNewTopic()
      return NextResponse.json({ success: true, message: 'Forced topic proposal', result, timestamp: new Date().toISOString() })
    }

    if (forceMode === 'publish') {
      const postId = parseInt(url.searchParams.get('postId') || '0')
      if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })
      console.log(`Force mode: Publishing approved article ${postId}`)
      const result = await orchestrator.publishApprovedArticle(postId)
      return NextResponse.json({ success: true, message: 'Forced publish', result, timestamp: new Date().toISOString() })
    }

    const result = await orchestrator.runAutoPilot()

    return NextResponse.json({
      success: true,
      message: 'Content pipeline executed',
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Content pipeline cron error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
