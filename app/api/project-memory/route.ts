import { NextRequest, NextResponse } from 'next/server'
import { projectMemory } from '@/lib/services/project-memory'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'progress-report':
        const report = await projectMemory.generateProgressReport()
        return NextResponse.json({ 
          success: true,
          report,
          timestamp: new Date().toISOString()
        })

      case 'timeline':
        const timeline = await projectMemory.getProjectTimeline()
        return NextResponse.json({
          success: true,
          timeline,
          timestamp: new Date().toISOString()
        })

      case 'api-status':
        await projectMemory.testAPIIntegrations()
        return NextResponse.json({
          success: true,
          message: 'API integration status updated',
          timestamp: new Date().toISOString()
        })

      default:
        const stats = await projectMemory.generateProgressReport()
        return NextResponse.json({
          success: true,
          data: {
            report: stats,
            timestamp: new Date().toISOString()
          }
        })
    }

  } catch (error) {
    console.error('Project memory API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'log-task':
        const taskId = await projectMemory.logTask(
          data.taskName,
          data.status,
          data.notes || '',
          data.dependencies || []
        )
        return NextResponse.json({
          success: true,
          taskId,
          timestamp: new Date().toISOString()
        })

      case 'update-task':
        await projectMemory.updateTask(data.taskId, data.updates)
        return NextResponse.json({
          success: true,
          message: 'Task updated successfully',
          timestamp: new Date().toISOString()
        })

      case 'log-decision':
        await projectMemory.logDecision(
          data.decision,
          data.context,
          data.alternatives,
          data.reasoning,
          data.implementationNotes,
          data.impact
        )
        return NextResponse.json({
          success: true,
          message: 'Technical decision logged',
          timestamp: new Date().toISOString()
        })

      case 'end-session':
        await projectMemory.endSession(
          data.summary,
          data.achievements,
          data.challenges,
          data.nextPriorities
        )
        return NextResponse.json({
          success: true,
          message: 'Session ended successfully',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Project memory POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}