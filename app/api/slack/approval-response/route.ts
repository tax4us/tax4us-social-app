import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'
import { slackIntegration } from '@/lib/services/slack-integration'
import { pipelineManager } from '@/lib/services/pipeline'

/**
 * Handle Slack approval responses (reactions, replies)
 * This endpoint will be called by Slack webhooks or manually triggered
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageTimestamp, userId, reaction, replyText, approvalId } = body

    // Validate required fields
    if (!messageTimestamp || !userId) {
      return NextResponse.json({
        success: false,
        error: 'messageTimestamp and userId are required'
      }, { status: 400 })
    }

    // Process the approval response
    const response = await slackIntegration.processApprovalResponse(
      messageTimestamp,
      userId,
      reaction,
      replyText
    )

    if (!response) {
      return NextResponse.json({
        success: false,
        error: 'No valid approval/rejection found in the response'
      }, { status: 400 })
    }

    // Find the approval record
    let approval
    if (approvalId) {
      approval = await db.getApproval(approvalId)
    } else {
      // Find approval by Slack message timestamp
      approval = await db.getApprovalBySlackMessage(messageTimestamp)
    }

    if (!approval) {
      return NextResponse.json({
        success: false,
        error: 'Approval record not found'
      }, { status: 404 })
    }

    // Update approval status
    const newStatus = response.approved ? 'approved' : 'rejected'
    await db.updateApproval(approval.id, {
      status: newStatus,
      response_user_id: userId,
      response_timestamp: response.timestamp,
      feedback: response.feedback
    })

    // Find the pipeline run
    const run = await db.getPipelineRunByApproval(approval.id)
    if (!run) {
      return NextResponse.json({
        success: false,
        error: 'Associated pipeline run not found'
      }, { status: 404 })
    }

    if (response.approved) {
      // Resume the pipeline
      await slackIntegration.sendNotification(
        'Content Approved ✅',
        `Content "${approval.related_title || 'Untitled'}" has been approved and pipeline will continue.`,
        run.id
      )
      
      await pipelineManager.resumePipeline(run.id)
    } else {
      // Handle rejection
      if (response.feedback && response.feedback.toLowerCase().includes('revise')) {
        // Request revision - go back to content generation
        await slackIntegration.sendRevisionRequest(approval.id, response.feedback || 'Please revise', run.id)
        
        // Reset pipeline to content generation stage
        await db.updatePipelineRun(run.id, {
          status: 'running',
          current_stage: 'hebrew_content_generation'
        })
        
        await pipelineManager.resumePipeline(run.id)
      } else {
        // Complete rejection - stop pipeline
        await db.updatePipelineRun(run.id, {
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        
        await slackIntegration.sendNotification(
          'Content Rejected ❌',
          `Content "${approval.related_title || 'Untitled'}" has been rejected. Pipeline stopped.`,
          run.id
        )
      }
    }

    return NextResponse.json({
      success: true,
      approval: {
        id: approval.id,
        status: newStatus,
        feedback: response.feedback
      },
      pipeline: {
        runId: run.id,
        action: response.approved ? 'resumed' : (response.feedback?.includes('revise') ? 'revision_requested' : 'stopped')
      }
    })

  } catch (error) {
    console.error('Slack approval response error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Get pending approval status
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const runId = url.searchParams.get('runId')
    const approvalId = url.searchParams.get('approvalId')

    if (!runId && !approvalId) {
      return NextResponse.json({
        success: false,
        error: 'runId or approvalId parameter required'
      }, { status: 400 })
    }

    let approval
    if (approvalId) {
      approval = await db.getApproval(approvalId)
    } else if (runId) {
      const run = await db.getPipelineRun(runId)
      if (run && run.status === 'paused') {
        // Find approval for this run
        const approvals = await db.getApprovalsByRelatedId(run.current_stage || '')
        approval = approvals.find(a => a.status === 'pending')
      }
    }

    if (!approval) {
      return NextResponse.json({
        success: false,
        error: 'No pending approval found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      approval: {
        id: approval.id,
        type: approval.type,
        status: approval.status,
        relatedId: approval.related_id,
        createdAt: approval.created_at,
        slackMessageTs: approval.slack_message_ts,
        slackChannel: approval.slack_channel
      }
    })

  } catch (error) {
    console.error('Get approval status error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}