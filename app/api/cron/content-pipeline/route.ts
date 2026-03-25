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

    const orchestrator = new PipelineOrchestrator()
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
