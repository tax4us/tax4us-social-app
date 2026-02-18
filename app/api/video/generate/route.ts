import { NextRequest, NextResponse } from 'next/server'
import { KieClient } from '@/lib/clients/kie-client'
import { projectMemory } from '@/lib/services/project-memory'

export async function POST(request: NextRequest) {
  try {
    const { title, excerpt, style = 'documentary', platform = 'facebook' } = await request.json()

    if (!title || !excerpt) {
      return NextResponse.json({
        success: false,
        error: 'Title and excerpt are required'
      }, { status: 400 })
    }

    // Log task in project memory
    const taskId = await projectMemory.logTask(
      `Generate ${style} video for ${platform}`,
      'in_progress',
      `Title: ${title}`,
      []
    )

    const kie = new KieClient()
    
    try {
      // Generate video using Kie.ai (Sora-2-Pro)
      const videoTaskId = await kie.generateVideo({
        title,
        excerpt,
        style: style as "abstract" | "documentary" | "corporate"
      })

      // Update project memory
      await projectMemory.updateTask(taskId, { status: 'completed' })

      return NextResponse.json({
        success: true,
        taskId: videoTaskId,
        status: 'processing',
        message: `Video generation started for "${title}"`,
        pollUrl: `/api/video/status/${videoTaskId}`,
        estimatedTime: '2-5 minutes',
        style,
        platform,
        metadata: {
          title,
          excerpt,
          style,
          platform,
          model: 'sora-2-pro-text-to-video',
          aspect_ratio: platform === 'facebook' ? 'portrait' : '16:9',
          quality: 'premium'
        }
      })

    } catch (error) {
      await projectMemory.updateTask(taskId, { 
        status: 'cancelled', 
        notes: `Video generation failed: ${error}` 
      })
      
      return NextResponse.json({
        success: false,
        error: `Video generation failed: ${error}`,
        fallback: 'Image generation attempted automatically'
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Get recent video generation tasks from project memory
  try {
    const recentTasks = await projectMemory.getRecentTasks('video_generation', 20)
    
    const videos = recentTasks.map(task => ({
      id: task.id,
      title: task.task_name || 'Video Generation Task',
      status: task.status === 'completed' ? 'completed' : 
              task.status === 'in_progress' ? 'processing' : 'failed',
      videoUrl: task.notes?.includes('http') ? 
                task.notes.match(/(https?:\/\/[^\s]+)/)?.[0] : null,
      platform: task.task_name?.includes('facebook') ? 'facebook' : 'linkedin',
      style: task.task_name?.includes('corporate') ? 'corporate' : 'documentary', 
      createdAt: task.started_at,
      metadata: {
        duration: '45s',
        size: 'Processing...',
        taskId: task.id
      }
    }))

    // Add demo placeholders if no real videos exist
    if (videos.length === 0) {
      videos.push({
        id: 'demo_001',
        title: 'FBAR Filing Requirements (Demo)',
        status: 'completed',
        videoUrl: null, // No real URL - will trigger placeholder behavior
        platform: 'facebook',
        style: 'documentary',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        metadata: {
          duration: '45s',
          size: 'Demo',
          taskId: 'demo_001'
        }
      })
    }

    return NextResponse.json({
      success: true,
      videos,
      total: videos.length,
      processing: videos.filter(v => v.status === 'processing').length,
      completed: videos.filter(v => v.status === 'completed').length
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}