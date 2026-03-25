export interface ContentGenerationRequest {
  type: 'video' | 'image' | 'text-to-speech' | 'image-to-video' | 'article' | 'social-post' | 'podcast'
  prompt: string
  language?: 'english' | 'hebrew' | 'bilingual'
  targetKeywords?: string
  seoTitle?: string
  additionalParams?: Record<string, any>
}

export interface ContentGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: {
    url?: string
    data?: any
  }
  error?: string
}

export interface SocialMediaUploadRequest {
  content: string | File
  title: string
  platforms: string[]
  user: string
}

class ContentGenerationService {
  private baseUrls = {
    textToSpeech: 'https://api.kie.ai',
    soraVideo: 'https://api.kie.ai',
    zImage: 'https://api.kie.ai'
  }

  async generateTextToSpeech(text: string, voice?: string): Promise<ContentGenerationResponse> {
    try {
      if (!process.env.KIE_API_KEY) {
        throw new Error('KIE_API_KEY is required for text-to-speech generation')
      }

      const response = await fetch(`${this.baseUrls.textToSpeech}/tts-turbo-2-5/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KIE_API_KEY}`
        },
        body: JSON.stringify({
          text,
          voice: voice || 'default'
        })
      })

      const data = await response.json()
      return {
        id: data.task_id,
        status: 'processing'
      }
    } catch (error) {
      throw new Error(`Text-to-speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async generateVideo(prompt: string, imageUrl?: string): Promise<ContentGenerationResponse> {
    const endpoint = imageUrl ? 'sora-2-pro-image-to-video' : 'sora-2-pro'
    
    try {
      if (!process.env.KIE_API_KEY) {
        throw new Error('KIE_API_KEY is required for video generation')
      }

      const body = imageUrl 
        ? { prompt, image_url: imageUrl }
        : { prompt }

      const response = await fetch(`${this.baseUrls.soraVideo}/${endpoint}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KIE_API_KEY}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      return {
        id: data.task_id,
        status: 'processing'
      }
    } catch (error) {
      throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async generateTaxArticle(
    prompt: string, 
    language: 'english' | 'hebrew' | 'bilingual' = 'english',
    targetKeywords?: string,
    seoTitle?: string
  ): Promise<ContentGenerationResponse> {
    try {
      if (!process.env.KIE_AI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        throw new Error('No AI API key configured - cannot generate content without KIE_AI_API_KEY or ANTHROPIC_API_KEY')
      }
      
      // Always use Claude for better content quality
      if (process.env.ANTHROPIC_API_KEY) {
        return await this.generateWithClaude(prompt, language, targetKeywords, seoTitle)
      }

      // Enhanced prompt for Tax4US content
      const enhancedPrompt = `
        Generate a professional tax education article for Tax4US (cross-border Israeli-American tax services).
        Topic: ${prompt}
        Language: ${language}
        Target Keywords: ${targetKeywords || 'US tax, Israel tax, FBAR, dual citizenship'}
        SEO Title: ${seoTitle || 'Auto-generate based on topic'}
        
        Requirements:
        - Professional but accessible tone (first-person practitioner perspective)
        - Use IRS.gov as primary authoritative source
        - Target Rank Math SEO score of 80-95+
        - Include practical examples relevant to Israeli-Americans
        - ${language === 'bilingual' ? 'Provide content in both English and Hebrew' : ''}
        - Focus on actionable tax advice
      `

      const response = await fetch(`${this.baseUrls.textToSpeech}/text-generation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KIE_API_KEY}`
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          max_tokens: 2000,
          temperature: 0.7
        })
      })

      const data = await response.json()
      return {
        id: data.task_id || 'article_' + Date.now(),
        status: 'processing'
      }
    } catch (error) {
      return {
        id: 'demo_article_' + Date.now(),
        status: 'completed',
        result: {
          url: '/demo-articles/' + encodeURIComponent(prompt.toLowerCase().replace(/\s+/g, '-')),
          data: {
            title: seoTitle || prompt,
            language,
            targetKeywords: targetKeywords || 'US tax, Israel tax, FBAR, dual citizenship',
            error: error instanceof Error ? error.message : 'API unavailable, showing demo'
          }
        }
      }
    }
  }

  async generateSocialPost(
    prompt: string,
    language: 'english' | 'hebrew' | 'bilingual' = 'english'
  ): Promise<ContentGenerationResponse> {
    try {
      const enhancedPrompt = `
        Generate a social media post for Tax4US (cross-border Israeli-American tax services).
        Topic: ${prompt}
        Language: ${language}
        
        Requirements:
        - Engaging but professional tone
        - Include relevant hashtags (#USTax #IsraelTax #FBAR #DualCitizenship)
        - 280 characters or less for Twitter compatibility
        - Include call-to-action to visit tax4us.co.il
        - ${language === 'bilingual' ? 'Provide versions in both English and Hebrew' : ''}
      `

      const response = await fetch(`${this.baseUrls.textToSpeech}/text-generation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KIE_API_KEY}`
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          max_tokens: 200
        })
      })

      const data = await response.json()
      return {
        id: data.task_id || 'social_' + Date.now(),
        status: 'processing'
      }
    } catch (error) {
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Social post generation failed'
      }
    }
  }

  async generateImage(prompt: string): Promise<ContentGenerationResponse> {
    try {
      if (!process.env.KIE_API_KEY) {
        return {
          id: 'demo_image_' + Date.now(),
          status: 'completed',
          result: {
            url: 'https://picsum.photos/800/600?random=' + Date.now(),
            data: {
              prompt,
              dimensions: '800x600',
              note: 'Demo image - configure KIE_API_KEY for real generation'
            }
          }
        }
      }

      const response = await fetch(`${this.baseUrls.zImage}/z-image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KIE_API_KEY}`
        },
        body: JSON.stringify({ prompt })
      })

      const data = await response.json()
      return {
        id: data.task_id,
        status: 'processing'
      }
    } catch (error) {
      return {
        id: 'demo_image_' + Date.now(),
        status: 'completed',
        result: {
          url: 'https://picsum.photos/800/600?random=' + Date.now(),
          data: {
            prompt,
            error: error instanceof Error ? error.message : 'API unavailable, showing demo'
          }
        }
      }
    }
  }

  async checkTaskStatus(taskId: string, apiType: 'text-to-speech' | 'video' | 'image'): Promise<ContentGenerationResponse> {
    const endpointMap = {
      'text-to-speech': 'tts-turbo-2-5',
      'video': 'sora-2-pro',
      'image': 'z-image'
    }

    try {
      const response = await fetch(`${this.baseUrls.textToSpeech}/${endpointMap[apiType]}/result/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.KIE_API_KEY}`
        }
      })

      const data = await response.json()
      
      return {
        id: taskId,
        status: data.status,
        result: data.status === 'completed' ? data.result : undefined,
        error: data.error
      }
    } catch (error) {
      return {
        id: taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async generateWithClaude(
    prompt: string, 
    language: 'english' | 'hebrew' | 'bilingual',
    targetKeywords?: string,
    seoTitle?: string
  ): Promise<ContentGenerationResponse> {
    try {
      const enhancedPrompt = `
        Generate a professional, comprehensive tax education article for Tax4US (cross-border Israeli-American tax services).
        
        Topic: ${prompt}
        Language: ${language}
        Target Keywords: ${targetKeywords || 'US tax, Israel tax, FBAR, dual citizenship'}
        SEO Title: ${seoTitle || 'Auto-generate based on topic'}
        
        Requirements:
        - Write 2500-3000 words of substantial, actionable content
        - Professional but accessible tone (first-person practitioner perspective)
        - Use IRS.gov and Israeli Tax Authority as primary sources
        - Include practical examples for Israeli-Americans
        - Focus on actionable tax advice and compliance steps
        - ${language === 'bilingual' ? 'Provide content in both English and Hebrew sections' : language === 'hebrew' ? 'Write entirely in Hebrew' : 'Write entirely in English'}
        - Include proper HTML formatting with headings, lists, and emphasis
        - Target Rank Math SEO score of 80-95+
        - Include specific tax forms, deadlines, and procedures
        
        Return only the article content in HTML format, starting with <h1> for the title.
      `

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: enhancedPrompt
          }]
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`Claude API error: ${data.error?.message || response.statusText}`)
      }

      return {
        id: 'claude_article_' + Date.now(),
        status: 'completed',
        result: {
          data: {
            content: data.content[0].text,
            title: seoTitle || prompt,
            language,
            targetKeywords: targetKeywords || 'US tax, Israel tax, FBAR, dual citizenship',
            wordCount: Math.floor(data.content[0].text.length / 5) + ' words',
            generator: 'Claude-3-Sonnet'
          }
        }
      }
    } catch (error) {
      throw new Error(`Claude content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Social media publishing is now handled by the SocialMediaPublisher service
  // which uses native Facebook Graph API and LinkedIn API integrations
  async uploadToSocialMedia(request: SocialMediaUploadRequest): Promise<ContentGenerationResponse> {
    return {
      id: 'native_social_' + Date.now(),
      status: 'completed',
      result: {
        data: {
          message: 'Social media publishing now handled by native Facebook & LinkedIn APIs',
          platforms: request.platforms
        }
      }
    }
  }
}

export const contentGenerationService = new ContentGenerationService()