import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'
import { slackIntegration } from '@/lib/services/slack-integration'

export async function POST(request: NextRequest) {
  try {
    const { contentId } = await request.json()
    
    // Get the content piece
    const contentPiece = await db.getContentPiece(contentId || 'content_1771386780353_czqv3hor2')
    if (!contentPiece) {
      throw new Error('Content piece not found')
    }
    
    // Create approval request in database
    const approval = await db.createApproval({
      type: 'content_review',
      related_id: contentPiece.id,
      status: 'pending',
      related_title: contentPiece.title_english
    })

    // Send Slack approval request
    const slackRequest = {
      id: approval.id,
      type: 'content_review' as const,
      title: contentPiece.title_english,
      content: `Hebrew: ${contentPiece.title_hebrew}\nKeywords: ${contentPiece.target_keywords.join(', ')}\nSEO Score: ${contentPiece.seo_score}`,
      runId: 'test_run_approval',
      contentId: contentPiece.id,
      timestamp: new Date().toISOString()
    }

    console.log('Sending Slack approval request:', slackRequest)
    const messageTimestamp = await slackIntegration.sendApprovalRequest(slackRequest)
    console.log('Slack message timestamp:', messageTimestamp)
    
    // Store message timestamp for tracking responses
    await db.updateApproval(approval.id, {
      slack_message_ts: messageTimestamp,
      slack_channel: process.env.SLACK_APPROVAL_CHANNEL_ID
    })

    return NextResponse.json({
      success: true,
      approval: {
        id: approval.id,
        slackTimestamp: messageTimestamp,
        content: {
          id: contentPiece.id,
          title: contentPiece.title_english,
          hebrew: contentPiece.title_hebrew
        }
      },
      message: 'Approval request sent to Slack! Check your Slack workspace.',
      slackWorkspace: 'https://app.slack.com/client/T09BZAFBTBR/D09N3M1BHF1'
    })
    
  } catch (error) {
    console.error('Trigger approval error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}