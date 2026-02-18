import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'

export async function POST(request: NextRequest) {
  try {
    const { contentId, action = 'approve' } = await request.json()
    
    // Get the content piece
    const contentPiece = await db.getContentPiece(contentId || 'content_1771386780353_czqv3hor2')
    if (!contentPiece) {
      throw new Error('Content piece not found')
    }
    
    // Create approval request (simulating what would happen in Slack)
    const approval = await db.createApproval({
      type: 'content_review',
      related_id: contentPiece.id,
      status: 'pending',
      related_title: contentPiece.title_english
    })

    // Simulate approval response (what would come from Slack reaction/reply)
    const mockApprovalResponse = {
      messageTimestamp: `slack_msg_${Date.now()}`,
      userId: 'U12345678',
      reaction: action === 'approve' ? 'white_check_mark' : 'x',
      replyText: action === 'approve' ? null : 'Please revise the content',
      approvalId: approval.id
    }

    // Process the approval response
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await db.updateApproval(approval.id, {
      status: newStatus,
      response_user_id: mockApprovalResponse.userId,
      response_timestamp: new Date().toISOString(),
      feedback: mockApprovalResponse.replyText
    })

    return NextResponse.json({
      success: true,
      demo: 'LOCAL APPROVAL WORKFLOW DEMONSTRATION',
      realSlackWorkspace: 'https://app.slack.com/client/T09BZAFBTBR/D09N3M1BHF1',
      slackStatus: 'account_inactive (requires workspace reactivation)',
      workflow: {
        step1_contentPiece: {
          id: contentPiece.id,
          title_english: contentPiece.title_english,
          title_hebrew: contentPiece.title_hebrew,
          seo_score: contentPiece.seo_score
        },
        step2_approvalCreated: {
          id: approval.id,
          type: 'content_review',
          status: 'pending',
          created_at: approval.created_at
        },
        step3_slackMessage: {
          would_send_to: 'https://app.slack.com/client/T09BZAFBTBR/D09N3M1BHF1',
          message_content: `📝 Content Review Required\n\nTitle: ${contentPiece.title_english}\nHebrew: ${contentPiece.title_hebrew}\nKeywords: ${contentPiece.target_keywords.join(', ')}\n\nReact with ✅ to approve or ❌ to reject`,
          status: 'BLOCKED: account_inactive'
        },
        step4_responseProcessed: {
          approval_id: approval.id,
          final_status: newStatus,
          user_response: mockApprovalResponse.reaction,
          feedback: mockApprovalResponse.replyText,
          next_action: action === 'approve' ? 'Continue to WordPress publishing' : 'Return to content generation'
        }
      },
      filesYouCanVerify: {
        approvals: '/Users/shaifriedman/TAX4US/data/approvals.json',
        content: '/Users/shaifriedman/TAX4US/data/content_pieces.json',
        slackIntegration: '/Users/shaifriedman/TAX4US/lib/services/slack-integration.ts',
        approvalHandler: '/Users/shaifriedman/TAX4US/app/api/slack/approval-response/route.ts'
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}