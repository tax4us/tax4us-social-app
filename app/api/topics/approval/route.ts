import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    const topics = await db.getTopics()
    const approvals = await db.getPendingApprovals()
    
    // Add approval status to topics
    const topicsWithApproval = topics.map(topic => {
      const approval = approvals.find(a => a.related_id === topic.id && a.type === 'topic_selection')
      return {
        ...topic,
        approval_status: approval?.status || 'pending',
        approval_notes: approval?.notes,
        approver: approval?.approver,
        approval_date: approval?.updated_at
      }
    })
    
    return NextResponse.json({
      success: true,
      total: topics.length,
      topics: topicsWithApproval,
      approved: topicsWithApproval.filter(t => t.approval_status === 'approved').length,
      pending: topicsWithApproval.filter(t => t.approval_status === 'pending').length,
      rejected: topicsWithApproval.filter(t => t.approval_status === 'rejected').length,
      summary: {
        total: topics.length,
        approved: topicsWithApproval.filter(t => t.approval_status === 'approved').length,
        pending: topicsWithApproval.filter(t => t.approval_status === 'pending').length,
        rejected: topicsWithApproval.filter(t => t.approval_status === 'rejected').length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Topic approval fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic_id, status, notes = '', approver = 'Manual Review' } = body
    
    if (!topic_id || !status) {
      return NextResponse.json({
        success: false,
        error: 'topic_id and status are required'
      }, { status: 400 })
    }

    if (!['approved', 'rejected', 'changes_requested'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Status must be: approved, rejected, or changes_requested'
      }, { status: 400 })
    }

    // Create or update approval record
    const approvalId = await db.createApproval({
      type: 'topic_selection',
      related_id: topic_id,
      status,
      notes,
      approver
    })

    // If approved, update topic priority if needed
    if (status === 'approved') {
      const topics = await db.getTopics()
      const topic = topics.find(t => t.id === topic_id)
      if (topic && topic.priority !== 'high') {
        await db.updateTopic(topic_id, { 
          priority: 'high',
          last_used: new Date().toISOString() 
        })
      }
    }

    return NextResponse.json({
      success: true,
      approval_id: approvalId,
      topic_id,
      status,
      message: `Topic ${status} successfully`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Topic approval error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}