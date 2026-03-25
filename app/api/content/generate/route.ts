import { NextRequest, NextResponse } from 'next/server'
import { contentGenerationService } from '@/lib/services/content-generation'
import { withErrorHandler, ValidationError } from '@/lib/utils/error-handler'
import { withAuth } from '@/lib/middleware/auth-middleware'
import { logger } from '@/lib/utils/logger'

export const POST = withAuth(withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { type, prompt, imageUrl, voice, language, targetKeywords, seoTitle } = body
    
    const validLanguage = language as 'english' | 'hebrew' | 'bilingual'

    if (!type || !prompt) {
      throw new ValidationError('Type and prompt are required', 'ContentGeneration')
    }

    let result
    
    switch (type) {
      case 'article':
        result = await contentGenerationService.generateTaxArticle(
          prompt, 
          validLanguage, 
          targetKeywords, 
          seoTitle
        )
        break
      case 'social-post':
        result = await contentGenerationService.generateSocialPost(prompt, validLanguage)
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
    logger.error('ContentGeneration', 'Content generation failed', error)
    throw error
  }
}, 'ContentGeneration'), 'api')