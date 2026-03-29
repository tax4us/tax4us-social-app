/**
 * Social Media Publishing Service
 * Handles posting to Facebook and LinkedIn using Upload-Post API and platform APIs
 */

import { ContentPiece } from './database'
import { linkedInPersistentAuth } from './linkedin-persistent-auth'
import { getSocialTokenViaApi } from './social-token-client'
// Using internal API for NotebookLM queries
import { logger } from '../utils/logger'

export interface SocialPost {
  platform: 'facebook' | 'linkedin'
  content: string
  mediaUrl?: string
  hashtags: string[]
  scheduledTime?: string
}

export interface PostResult {
  platform: 'facebook' | 'linkedin'
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
  note?: string
}

interface FacebookPageData {
  id: string;
  access_token: string;
  name: string;
}

class SocialMediaPublisher {
  private readonly facebookPageId: string
  // Token loaded lazily via SuperSeller API on first publish call
  private facebookAccessToken: string = ''
  private tokenInitPromise: Promise<void> | null = null
  private readonly notebookId: string

  constructor() {
    this.facebookPageId = process.env.FACEBOOK_PAGE_ID || '844266372343077'
    // Do NOT read FACEBOOK_PAGE_ACCESS_TOKEN from env — token is now in SuperSeller social_tokens DB
    this.notebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID || 'd5f128c4-0d17-42c3-8d52-109916859c76'
  }

  /**
   * Lazy-init: fetches FB token from SuperSeller API on first call.
   * Falls back to env var if API is unavailable (backward compatibility).
   * Thread-safe: shares a single inflight promise.
   */
  private async ensureTokenLoaded(): Promise<void> {
    if (this.facebookAccessToken) return
    if (!this.tokenInitPromise) {
      this.tokenInitPromise = getSocialTokenViaApi('tax4us', 'facebook', 'page')
        .then(token => {
          this.facebookAccessToken = token
          logger.info('SocialMediaPublisher', 'FB token loaded from SuperSeller API')
        })
        .catch(err => {
          // Token API unavailable — FB posts will fail with a clear error message
          logger.error('SocialMediaPublisher', 'Failed to load FB token from SuperSeller API:', err.message)
          this.facebookAccessToken = ''
        })
    }
    await this.tokenInitPromise
  }


  /**
   * Generate and publish social media posts for content piece
   */
  async publishContentToSocial(contentPiece: ContentPiece): Promise<PostResult[]> {
    try {
      // Generate platform-specific posts using AI
      const [facebookPost, linkedinPost] = await Promise.all([
        this.generateFacebookPost(contentPiece),
        this.generateLinkedInPost(contentPiece)
      ])

      // Publish to both platforms
      const results = await Promise.all([
        this.publishToFacebook(facebookPost),
        this.publishToLinkedIn(linkedinPost)
      ])

      return results

    } catch (error) {
      logger.error('SocialMediaPublisher', 'Social media publishing failed', error)
      return [
        {
          platform: 'facebook',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        {
          platform: 'linkedin',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      ]
    }
  }

  /**
   * Generate Facebook post using AI
   */
  private async generateFacebookPost(contentPiece: ContentPiece): Promise<SocialPost> {
    try {
      const prompt = `
        צור פוסט פייסבוק מושך ומקצועי עבור התוכן הבא:
        
        כותרת: ${contentPiece.title_hebrew}
        מילות מפתח: ${contentPiece.target_keywords.join(', ')}
        
        הנחיות לפוסט פייסבוק:
        - אורך: 150-250 מילים
        - טון: נגיש ומקצועי
        - התחל עם שאלה או עובדה מעניינת
        - כלול 2-3 נקודות מרכזיות
        - סיים עם קריאה לפעולה
        - הוסף 3-5 האשטאגים רלוונטיים בעברית ואנגלית
        - התמקד בערך שהתוכן מספק לישראלים בארה"ב
        
        הקהל יעד: ישראלים החיים בארה"ב וצריכים ייעוץ מס
        
        דוגמה למבנה:
        "🤔 ידעתם ש...
        
        ✓ נקודה ראשונה
        ✓ נקודה שנייה 
        ✓ נקודה שלישית
        
        💡 קריאה לפעולה
        
        #FBAR #מסארהב #ישראליםבאמריקה"
      `

      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notebook-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notebookId: this.notebookId,
          query: prompt
        })
      })

      if (!response.ok) {
        throw new Error(`Notebook query failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const content = result.answer.trim()
        
        // If NotebookLM returned raw article content instead of a social post, use fallback
        if (content.length > 500 || content.includes('# ') || content.includes('## ')) {
          logger.info('SocialMediaPublisher', 'NotebookLM returned full article instead of social post, using fallback')
          return this.createFallbackFacebookPost(contentPiece)
        }
        
        const hashtags = this.extractHashtags(content)

        return {
          platform: 'facebook',
          content: content,
          hashtags,
          mediaUrl: contentPiece.media_urls.facebook_reel || contentPiece.media_urls.social_video || contentPiece.media_urls.featured_image
        }
      }

      // Fallback post if AI generation fails
      return this.createFallbackFacebookPost(contentPiece)

    } catch (error) {
      logger.error('SocialMediaPublisher', 'Facebook post generation failed', error)
      return this.createFallbackFacebookPost(contentPiece)
    }
  }

  /**
   * Generate LinkedIn post using AI
   */
  private async generateLinkedInPost(contentPiece: ContentPiece): Promise<SocialPost> {
    try {
      const prompt = `
        צור פוסט LinkedIn מקצועי עבור התוכן הבא:
        
        כותרת: ${contentPiece.title_hebrew}
        מילות מפתח: ${contentPiece.target_keywords.join(', ')}
        
        הנחיות לפוסט LinkedIn:
        - אורך: 200-400 מילים
        - טון: מקצועי ואקדמי
        - התחל עם תובנה או סטטיסטיקה
        - פרט על השלכות מעשיות
        - כלול דוגמה או מקרה בוחן
        - סיים עם שאלה לעידוד דיון
        - הוסף האשטאגים מקצועיים
        - השתמש באמוג'ים בצורה מתונה
        
        הקהל יעד: אנשי מקצוע ישראלים בארה"ב, רו"ח, עורכי דין
        
        דוגמה למבנה:
        "📊 על פי הנתונים האחרונים...
        
        הסברה מקצועית מפורטת
        
        💼 דוגמה מעשית
        
        ❓ מה הניסיון שלכם בנושא?
        
        #USIsraeliTax #FBAR #ProfessionalServices"
      `

      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notebook-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notebookId: this.notebookId,
          query: prompt
        })
      })

      if (!response.ok) {
        throw new Error(`Notebook query failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const content = result.answer.trim()
        
        // If NotebookLM returned generic English response instead of Hebrew LinkedIn post, use fallback
        if (content.length < 200 || content.includes('Based on') || !content.includes('Israeli-American')) {
          logger.info('SocialMediaPublisher', 'NotebookLM returned generic response instead of Hebrew LinkedIn post, using fallback')
          return this.createFallbackLinkedInPost(contentPiece)
        }
        
        const hashtags = this.extractHashtags(content)

        return {
          platform: 'linkedin',
          content: content,
          hashtags,
          mediaUrl: contentPiece.media_urls.linkedin_video || contentPiece.media_urls.social_video || contentPiece.media_urls.featured_image
        }
      }

      // Fallback post if AI generation fails
      return this.createFallbackLinkedInPost(contentPiece)

    } catch (error) {
      logger.error('SocialMediaPublisher', 'LinkedIn post generation failed', error)
      return this.createFallbackLinkedInPost(contentPiece)
    }
  }

  /**
   * Publish to Facebook using Graph API
   */
  async publishToFacebook(post: SocialPost): Promise<PostResult> {
    try {
      await this.ensureTokenLoaded()
      if (!this.facebookAccessToken) {
        throw new Error('Facebook access token not configured')
      }

      const message = post.content + (post.hashtags?.length > 0 ? '\n\n' + post.hashtags.join(' ') : '')

      // Video post — Kie.ai generates public URLs (R2/S3), no local filesystem needed
      if (post.mediaUrl) {
        const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('video') || post.mediaUrl.includes('kie.ai')

        logger.info('SocialMediaPublisher', `FB publish: mediaUrl=${post.mediaUrl}, isVideo=${isVideo}`)

        if (isVideo) {
          // Upload as reel via video_reels endpoint — video URL must be publicly accessible
          // Kie.ai videos are hosted on their CDN, so URL is already public
          const videoResponse = await fetch(post.mediaUrl)
          if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video from ${post.mediaUrl}: ${videoResponse.status}`)
          }
          const videoBlob = await videoResponse.blob()

          const formData = new FormData()
          formData.append('access_token', this.facebookAccessToken)
          formData.append('description', message)
          formData.append('source', videoBlob, 'video.mp4')

          const response = await fetch(`https://graph.facebook.com/v18.0/${this.facebookPageId}/video_reels`, {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(`Facebook reel upload error: ${error.error?.message || response.statusText}`)
          }

          const result = await response.json()
          logger.info('SocialMediaPublisher', `FB reel published: ${result.id}`)
          return {
            platform: 'facebook',
            success: true,
            postId: result.id,
            postUrl: `https://www.facebook.com/reel/${result.id}`
          }
        } else {
          // Image post via photos endpoint
          const response = await fetch(`https://graph.facebook.com/v18.0/${this.facebookPageId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              url: post.mediaUrl,
              access_token: this.facebookAccessToken
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(`Facebook photo upload error: ${error.error?.message || response.statusText}`)
          }

          const result = await response.json()
          return {
            platform: 'facebook',
            success: true,
            postId: result.id,
            postUrl: `https://www.facebook.com/${result.id}`
          }
        }
      }

      // Text-only post
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.facebookPageId}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Facebook API error: ${error.error?.message || response.statusText}`)
      }

      const result = await response.json()

      return {
        platform: 'facebook',
        success: true,
        postId: result.id,
        postUrl: `https://www.facebook.com/${result.id}`
      }

    } catch (error) {
      logger.error('SocialMediaPublisher', 'Facebook publishing failed', error)
      return {
        platform: 'facebook',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Upload video to LinkedIn using 3-step native video upload process.
   * LinkedIn does NOT accept video URLs — binary upload required.
   */
  private async uploadLinkedInVideo(videoUrl: string, accessToken: string, authorUrn: string): Promise<string> {
    // Step 1: Register upload to get upload URL + asset URN
    const registerResp = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
          owner: authorUrn,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      })
    })

    if (!registerResp.ok) {
      const err = await registerResp.json()
      throw new Error(`LinkedIn register upload failed: ${JSON.stringify(err).substring(0, 200)}`)
    }

    const registerData = await registerResp.json()
    const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
    const assetUrn = registerData.value?.asset

    if (!uploadUrl || !assetUrn) {
      throw new Error(`LinkedIn register upload: missing uploadUrl or asset URN. Response: ${JSON.stringify(registerData).substring(0, 300)}`)
    }

    // Step 2: Download video and upload binary to LinkedIn
    const videoResp = await fetch(videoUrl)
    if (!videoResp.ok) throw new Error(`Failed to fetch video for LinkedIn upload: ${videoUrl}`)
    const videoBuffer = await videoResp.arrayBuffer()

    const uploadResp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'video/mp4'
      },
      body: videoBuffer
    })

    if (!uploadResp.ok && uploadResp.status !== 201) {
      throw new Error(`LinkedIn video binary upload failed: ${uploadResp.status}`)
    }

    return assetUrn
  }

  /**
   * Publish to LinkedIn using UGC Posts API v2.
   * Member ID is managed by linkedInPersistentAuth — stored in linkedin-token.json,
   * fetched once via /v2/me when r_liteprofile scope is available, reused across renewals.
   * Videos require 3-step native upload (register → binary PUT → ugcPost with asset URN).
   */
  async publishToLinkedIn(post: SocialPost): Promise<PostResult> {
    try {

      // Fetch LinkedIn token from SuperSeller API (social_tokens DB)
      // Falls back to linkedInPersistentAuth if API token not yet available (e.g., LinkedIn API review pending)
      let accessToken: string
      try {
        accessToken = await getSocialTokenViaApi('tax4us', 'linkedin', 'long_lived')
      } catch (apiErr) {
        logger.warn('SocialMediaPublisher', 'LinkedIn token not in SuperSeller API, falling back to persistent auth:', (apiErr as Error).message)
        accessToken = await linkedInPersistentAuth.getValidAccessToken()
      }
      if (!accessToken) {
        throw new Error('LinkedIn access token not available')
      }
      
      const content = post.content + (post.hashtags && post.hashtags.length > 0 ? '\n\n' + post.hashtags.join(' ') : '')

      // Use numeric member ID approach - Company posting with numeric ID
      // TAX4US company ID is 17903965 (from working config)
      const authorUrn = `urn:li:company:17903965`
      let mediaCategory = 'NONE'
      let mediaArray: { status: string; media?: string; originalUrl?: string; title?: { text: string } }[] = []

      if (post.mediaUrl) {
        const isVideo = post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('video')
        if (isVideo) {
          logger.info('SocialMediaPublisher', '📹 Uploading video to LinkedIn natively (3-step)...')
          const assetUrn = await this.uploadLinkedInVideo(post.mediaUrl, accessToken, authorUrn)
          mediaCategory = 'VIDEO'
          mediaArray = [{ status: 'READY', media: assetUrn }]
        } else {
          mediaCategory = 'ARTICLE'
          mediaArray = [{ status: 'READY', originalUrl: post.mediaUrl, title: { text: 'TAX4US Content' } }]
        }
      }

      const payload: {
        author: string;
        lifecycleState: string;
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: string };
            shareMediaCategory: string;
            media?: unknown[];
          };
        };
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': string };
      } = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: mediaCategory,
            ...(mediaArray.length > 0 && { media: mediaArray })
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }

      // FORCE DEBUG: Log LinkedIn API call
      logger.info('SocialMediaPublisher', 'LI-API-CALL', {
        authorUrn,
        hasToken: !!accessToken,
        mediaCategory,
        mediaArray: mediaArray.length
      })
      
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202303'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`LinkedIn API error: ${JSON.stringify(error).substring(0, 200)}`)
      }

      const result = await response.json()

      return {
        platform: 'linkedin',
        success: true,
        postId: result.id,
        postUrl: `https://www.linkedin.com/feed/update/${result.id}/`
      }

    } catch (error) {
      logger.error('SocialMediaPublisher', 'LinkedIn publishing failed', error)

      return {
        platform: 'linkedin',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Schedule posts for optimal engagement times
   */
  async scheduleOptimalPosts(contentPiece: ContentPiece): Promise<PostResult[]> {
    try {
      // Generate posts
      const [facebookPost, linkedinPost] = await Promise.all([
        this.generateFacebookPost(contentPiece),
        this.generateLinkedInPost(contentPiece)
      ])

      // Set optimal posting times
      const now = new Date()

      // Facebook: Best times are 1-4 PM Tuesday-Thursday
      const facebookTime = new Date(now)
      facebookTime.setHours(14, 0, 0, 0) // 2 PM
      if (facebookTime <= now) {
        facebookTime.setDate(facebookTime.getDate() + 1) // Next day
      }

      // LinkedIn: Best times are 8-10 AM Tuesday-Thursday
      const linkedinTime = new Date(now)
      linkedinTime.setHours(9, 0, 0, 0) // 9 AM
      if (linkedinTime <= now) {
        linkedinTime.setDate(linkedinTime.getDate() + 1) // Next day
      }

      facebookPost.scheduledTime = facebookTime.toISOString()
      linkedinPost.scheduledTime = linkedinTime.toISOString()

      // Publish scheduled posts
      const results = await Promise.all([
        this.publishToFacebook(facebookPost),
        this.publishToLinkedIn(linkedinPost)
      ])

      return results

    } catch (error) {
      logger.error('SocialMediaPublisher', 'Scheduled posting failed', error)
      return []
    }
  }

  /**
   * Extract hashtags from post content
   */
  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\u05D0-\u05EAa-zA-Z0-9_]+/g
    const matches = content.match(hashtagRegex) || []
    return matches.map(tag => tag.substring(1)) // Remove # symbol
  }

  /**
   * Create fallback Facebook post if AI generation fails
   */
  private createFallbackFacebookPost(contentPiece: ContentPiece): SocialPost {
    const content = `🔍 ${contentPiece.title_hebrew}

💡 מידע חשוב לישראלים בארה"ב על ${contentPiece.target_keywords[0] || 'מיסוי'}

קראו את המאמר המלא באתר שלנו לפרטים נוספים.

#FBAR #מסארהב #ישראליםבאמריקה #מיסוי`

    return {
      platform: 'facebook',
      content,
      hashtags: ['FBAR', 'מסארהב', 'ישראליםבאמריקה', 'מיסוי'],
      mediaUrl: contentPiece.media_urls.featured_image
    }
  }

  /**
   * Create fallback LinkedIn post if AI generation fails
   */
  private createFallbackLinkedInPost(contentPiece: ContentPiece): SocialPost {
    const content = `📋 ${contentPiece.title_hebrew}

חשוב לדעת: מידע מקצועי עדכני בתחום המיסוי הישראלי-אמריקאי.

הנושא של ${contentPiece.target_keywords[0] || 'מיסוי'} דורש התייחסות מקצועית ומדויקת.

מה הניסיון שלכם בנושא?

#USIsraeliTax #FBAR #ProfessionalServices #TaxCompliance`

    return {
      platform: 'linkedin',
      content,
      hashtags: ['USIsraeliTax', 'FBAR', 'ProfessionalServices', 'TaxCompliance'],
      mediaUrl: contentPiece.media_urls.featured_image
    }
  }

  /**
   * Test social media connections using direct API access
   */
  async testConnections(): Promise<{
    facebook: { success: boolean; message: string }
    linkedin: { success: boolean; message: string }
  }> {
    const results = {
      facebook: { success: false, message: '' },
      linkedin: { success: false, message: '' }
    }

    try {
      // Test Facebook connection (UNIFIED APPROACH)
      if (this.facebookAccessToken && this.facebookPageId) {
        // Use token directly as PAGE token (matches integrations/status approach)
        const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${this.facebookPageId}?fields=id,name&access_token=${this.facebookAccessToken}`)
        if (fbResponse.ok) {
          const fbData = await fbResponse.json()
          results.facebook.success = true
          results.facebook.message = `Connected to Facebook Page: ${fbData.name} (direct page token)`
        } else {
          results.facebook.message = 'Facebook page access failed - token may be expired'
        }
      } else {
        results.facebook.message = 'Facebook credentials not configured'
      }

      // Test LinkedIn connection using persistent auth
      try {
        const testResult = await linkedInPersistentAuth.testToken()
        if (testResult.valid) {
          results.linkedin.success = true
          results.linkedin.message = `Connected to LinkedIn: ${testResult.userInfo?.name}`
        } else {
          results.linkedin.message = `LinkedIn token invalid: ${testResult.error}`
        }
      } catch (_error) {
        results.linkedin.message = 'LinkedIn not configured - run npm run get-linkedin-token'
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      if (!results.facebook.message) results.facebook.message = errorMsg
      if (!results.linkedin.message) results.linkedin.message = errorMsg
    }

    return results
  }

  /**
  // uploadFacebookReel() REMOVED 2026-03-29 — dead code, reel upload is now inline in publishToFacebook()
}

export const socialMediaPublisher = new SocialMediaPublisher()