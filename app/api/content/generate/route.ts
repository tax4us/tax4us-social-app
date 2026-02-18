import { NextRequest, NextResponse } from 'next/server'
import { contentGenerationService } from '@/lib/services/content-generation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, prompt, imageUrl, voice, language, targetKeywords, seoTitle } = body

    if (!type || !prompt) {
      return NextResponse.json(
        { error: 'Type and prompt are required' },
        { status: 400 }
      )
    }

    let result
    
    switch (type) {
      case 'article':
        result = await contentGenerationService.generateTaxArticle(
          prompt, 
          language as any, 
          targetKeywords, 
          seoTitle
        )
        break
      case 'social-post':
        result = await contentGenerationService.generateSocialPost(prompt, language as any)
        break
      case 'podcast':
      case 'text-to-speech':
        result = await contentGenerationService.generateTextToSpeech(prompt, voice)
        break
      case 'video':
        result = await contentGenerationService.generateVideo(prompt)
        break
      case 'image-to-video':
        if (!imageUrl) {
          return NextResponse.json(
            { error: 'Image URL is required for image-to-video generation' },
            { status: 400 }
          )
        }
        result = await contentGenerationService.generateVideo(prompt, imageUrl)
        break
      case 'image':
        result = await contentGenerationService.generateImage(prompt)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}