import { NextRequest, NextResponse } from 'next/server'
import { contentTemplateManager } from '@/lib/services/content-templates'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const templateId = url.searchParams.get('id')

    if (templateId) {
      const template = await contentTemplateManager.getTemplate(templateId)
      if (!template) {
        return NextResponse.json({
          success: false,
          error: 'Template not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        template,
        timestamp: new Date().toISOString()
      })
    }

    const templates = await contentTemplateManager.getTemplates()
    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Content templates GET error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, templateId, topicId, additionalContext = {} } = body

    switch (action) {
      case 'generate':
        if (!templateId) {
          return NextResponse.json({
            success: false,
            error: 'templateId is required for generation'
          }, { status: 400 })
        }

        // Use a default topic if not provided (for testing)
        const finalTopicId = topicId || 'topic_1771292761138_di8pznxnx' // First FBAR topic

        const generatedContent = await contentTemplateManager.generateContent(
          templateId,
          finalTopicId,
          additionalContext
        )

        // Save the generated content
        await contentTemplateManager.saveContent(generatedContent)

        return NextResponse.json({
          success: true,
          content: generatedContent,
          timestamp: new Date().toISOString()
        })

      case 'optimize-seo':
        const { contentId } = body
        if (!contentId) {
          return NextResponse.json({
            success: false,
            error: 'contentId is required for SEO optimization'
          }, { status: 400 })
        }

        const seoAnalysis = await contentTemplateManager.optimizeSEO(contentId)
        return NextResponse.json({
          success: true,
          seo: seoAnalysis,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: generate, optimize-seo'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Content templates POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}