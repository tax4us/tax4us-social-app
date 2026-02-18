import { NextRequest, NextResponse } from 'next/server'
import { contentGenerationService } from '@/lib/services/content-generation'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const content = formData.get('content') as string | File
    const title = formData.get('title') as string
    const user = formData.get('user') as string
    const platforms = formData.getAll('platform') as string[]

    if (!content || !title || !user || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Content, title, user, and at least one platform are required' },
        { status: 400 }
      )
    }

    const result = await contentGenerationService.uploadToSocialMedia({
      content,
      title,
      user,
      platforms
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Social media upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}