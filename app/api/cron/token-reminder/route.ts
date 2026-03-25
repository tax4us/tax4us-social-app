import { NextRequest, NextResponse } from 'next/server'
import { tokenReminder } from '@/lib/services/token-reminder'

// Runs daily at 9am — fires Slack alert on day 59 of LinkedIn token lifecycle
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

    await tokenReminder.checkAndSendReminders()

    return NextResponse.json({
      success: true,
      message: 'Token reminder check completed',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Token reminder cron error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
