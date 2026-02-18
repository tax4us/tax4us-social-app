/**
 * SEO Optimization Service using AI
 * Analyzes and improves content for better search rankings using NotebookLM
 */

// Using internal API for NotebookLM queries
import { ContentPiece } from './database'
import { wordPressPublisher } from './wordpress-publisher'

export interface SEOAnalysis {
  currentScore: number
  targetScore: number
  issues: SEOIssue[]
  recommendations: SEORecommendation[]
  optimizedContent?: {
    title?: string
    metaDescription?: string
    content?: string
    headings?: string[]
    internalLinks?: string[]
  }
}

export interface SEOIssue {
  type: 'title' | 'meta_description' | 'headings' | 'keyword_density' | 'internal_links' | 'content_length' | 'readability'
  severity: 'critical' | 'warning' | 'suggestion'
  description: string
  currentValue?: string
  recommendedValue?: string
}

export interface SEORecommendation {
  category: string
  action: string
  impact: 'high' | 'medium' | 'low'
  implementation: string
}

class SEOOptimizer {
  private readonly notebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID || 'd5f128c4-0d17-42c3-8d52-109916859c76'

  /**
   * Analyze content piece for SEO issues and generate improvements
   */
  async analyzeAndOptimize(contentPiece: ContentPiece): Promise<SEOAnalysis> {
    try {
      // Get current WordPress post if it exists
      let currentWordPressContent = ''
      if (contentPiece.wordpress_post_id) {
        try {
          const wpPosts = await wordPressPublisher.getLowSEOPosts(100, 50)
          const wpPost = wpPosts.find(p => p.id === contentPiece.wordpress_post_id)
          if (wpPost) {
            currentWordPressContent = `Current WordPress URL: ${wpPost.url}\nCurrent SEO Score: ${wpPost.seoScore}`
          }
        } catch (error) {
          console.warn('Could not fetch WordPress content:', error)
        }
      }

      // Prepare comprehensive SEO analysis prompt
      const seoPrompt = `
        בצע ניתוח SEO מקצועי מלא עבור התוכן הבא ותן המלצות לשיפור:

        **פרטי התוכן:**
        - כותרת בעברית: ${contentPiece.title_hebrew}
        - כותרת באנגלית: ${contentPiece.title_english}
        - מילות מפתח יעד: ${contentPiece.target_keywords.join(', ')}
        - ציון SEO נוכחי: ${contentPiece.seo_score || 'לא זמין'}
        - תוכן עברית: ${contentPiece.content_hebrew || 'לא זמין'}
        - תוכן אנגלית: ${contentPiece.content_english || 'לא זמין'}
        ${currentWordPressContent}

        **אנא בצע ניתוח מקצועי של:**

        1. **כותרת SEO:** 
           - אורך אופטימלי (50-60 תווים)
           - הכלת מילת המפתח הראשית
           - משיכה וקריאות
           - התאמה לכוונת החיפוש

        2. **תיאור מטא:**
           - אורך 150-160 תווים
           - הכלת מילות מפתח טבעיות
           - קריאה לפעולה משיכה
           
        3. **מבנה תוכן:**
           - כותרות H2/H3 עם מילות מפתח
           - אורך תוכן מינימלי (2000+ מילים למאמר מקצועי)
           - פסקאות קצרות וקריאות
           
        4. **צפיפות מילות מפתח:**
           - 1-3% למילת המפתח הראשית
           - שימוש טבעי במילות מפתח משניות
           
        5. **קישורים פנימיים:**
           - הצעות לקישורים למאמרים רלוונטיים בתחום המס
           - טקסט אנקור מתאים
           
        6. **קריאות וחוויית משתמש:**
           - מבנה ברור עם נקודות מרכזיות
           - דוגמאות מעשיות
           - רשימות וטבלאות לבהירות

        **אנא ספק:**
        - ניקוד נוכחי ומוערך (0-100)
        - רשימת בעיות ודירוגן בחשיבות
        - כותרת מעודכנת ומותאמת SEO
        - תיאור מטא מותאם
        - הצעות לכותרות H2/H3
        - המלצות לקישורים פנימיים
        - תוכן משופר עם מילות מפתח טבעיות

        התמקד בתחום המס הישראלי-אמריקאי ובמילות מפתח רלוונטיות כמו FBAR, דו"ח נכסים, מס כפל, אזרחות כפולה.
      `

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/notebook-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notebookId: this.notebookId,
          query: seoPrompt
        })
      })

      if (!response.ok) {
        throw new Error(`Notebook query failed: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(`NotebookLM query failed: ${result.error}`)
      }

      // Parse AI response into structured SEO analysis
      const analysis = this.parseAIResponse(result.answer, contentPiece)
      
      return analysis

    } catch (error) {
      console.error('SEO analysis failed:', error)
      throw new Error(`SEO analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Apply SEO optimizations to content piece and update WordPress
   */
  async applyOptimizations(
    contentPiece: ContentPiece, 
    analysis: SEOAnalysis
  ): Promise<{ success: boolean; newScore: number; wordpressUrl?: string }> {
    try {
      let updatedScore = analysis.targetScore

      // Update content piece with optimized data
      const updates: Partial<ContentPiece> = {
        seo_score: updatedScore
      }

      if (analysis.optimizedContent?.title) {
        updates.title_hebrew = analysis.optimizedContent.title
      }

      if (analysis.optimizedContent?.content) {
        updates.content_hebrew = analysis.optimizedContent.content
      }

      // Apply updates to database
      await this.updateContentPiece(contentPiece.id, updates)

      // Update WordPress post if it exists
      let wordpressUrl: string | undefined
      if (contentPiece.wordpress_post_id) {
        try {
          const wpResult = await wordPressPublisher.updatePost(
            contentPiece.wordpress_post_id,
            { ...contentPiece, ...updates },
            {
              seoMeta: {
                metaTitle: analysis.optimizedContent?.title || contentPiece.title_hebrew,
                metaDescription: analysis.optimizedContent?.metaDescription || '',
                focusKeywords: contentPiece.target_keywords
              }
            }
          )
          wordpressUrl = wpResult.url
        } catch (wpError) {
          console.error('WordPress update failed during SEO optimization:', wpError)
          // Don't fail the entire operation if WordPress update fails
        }
      }

      return {
        success: true,
        newScore: updatedScore,
        wordpressUrl
      }

    } catch (error) {
      console.error('Failed to apply SEO optimizations:', error)
      return {
        success: false,
        newScore: contentPiece.seo_score || 0
      }
    }
  }

  /**
   * Get low performing content that needs SEO optimization
   */
  async getLowPerformingContent(threshold: number = 80, limit: number = 10): Promise<ContentPiece[]> {
    try {
      // This would query the database for low SEO scoring content
      // For now, return mock data structure that matches our database
      return []
    } catch (error) {
      console.error('Failed to get low performing content:', error)
      return []
    }
  }

  /**
   * Parse AI response into structured SEO analysis
   */
  private parseAIResponse(aiResponse: string, contentPiece: ContentPiece): SEOAnalysis {
    // Handle null or undefined responses
    if (!aiResponse || typeof aiResponse !== 'string') {
      console.warn('SEO analysis received null/invalid response, using defaults')
      return this.getDefaultSEOAnalysis(contentPiece)
    }

    // Extract key information from AI response using pattern matching
    const currentScoreMatch = aiResponse.match(/ציון נוכחי:?\s*(\d+)/i) || 
                             aiResponse.match(/נוכחי:?\s*(\d+)/i) ||
                             aiResponse.match(/(\d+)\/100/i)
    const currentScore = currentScoreMatch ? parseInt(currentScoreMatch[1]) : contentPiece.seo_score || 60

    const targetScoreMatch = aiResponse.match(/ציון מוערך:?\s*(\d+)/i) || 
                            aiResponse.match(/יעד:?\s*(\d+)/i)
    const targetScore = targetScoreMatch ? parseInt(targetScoreMatch[1]) : Math.min(currentScore + 20, 95)

    // Extract optimized title
    const titleMatch = aiResponse.match(/כותרת מעודכנת:?\s*([^\n]+)/i) ||
                       aiResponse.match(/כותרת מותאמת:?\s*([^\n]+)/i)
    const optimizedTitle = titleMatch ? titleMatch[1].trim() : undefined

    // Extract meta description
    const metaMatch = aiResponse.match(/תיאור מטא:?\s*([^\n]+)/i) ||
                      aiResponse.match(/מטא תיאור:?\s*([^\n]+)/i)
    const optimizedMeta = metaMatch ? metaMatch[1].trim() : undefined

    // Identify common SEO issues
    const issues: SEOIssue[] = []
    
    if (aiResponse.includes('כותרת קצרה') || aiResponse.includes('כותרת ארוכה')) {
      issues.push({
        type: 'title',
        severity: 'warning',
        description: 'אורך כותרת לא אופטימלי',
        currentValue: contentPiece.title_hebrew,
        recommendedValue: optimizedTitle
      })
    }

    if (aiResponse.includes('חסר תיאור מטא') || aiResponse.includes('תיאור קצר')) {
      issues.push({
        type: 'meta_description',
        severity: 'critical',
        description: 'תיאור מטא חסר או לא מותאם',
        recommendedValue: optimizedMeta
      })
    }

    if (aiResponse.includes('חסרות כותרות') || aiResponse.includes('מבנה כותרות')) {
      issues.push({
        type: 'headings',
        severity: 'warning',
        description: 'מבנה כותרות H2/H3 לא אופטימלי'
      })
    }

    // Generate recommendations
    const recommendations: SEORecommendation[] = [
      {
        category: 'כותרת',
        action: 'עדכן כותרת עם מילת המפתח הראשית',
        impact: 'high',
        implementation: optimizedTitle || 'הוסף את מילת המפתח לתחילת הכותרת'
      },
      {
        category: 'תיאור מטא',
        action: 'צור תיאור מטא משיכה עם מילות מפתח',
        impact: 'high',
        implementation: optimizedMeta || 'כתוב תיאור 150-160 תווים עם מילת המפתח'
      },
      {
        category: 'מבנה תוכן',
        action: 'הוסף כותרות H2/H3 עם מילות מפתח',
        impact: 'medium',
        implementation: 'פרק את התוכן לסעיפים ברורים עם כותרות'
      }
    ]

    return {
      currentScore,
      targetScore,
      issues,
      recommendations,
      optimizedContent: {
        title: optimizedTitle,
        metaDescription: optimizedMeta
      }
    }
  }

  private getDefaultSEOAnalysis(contentPiece: ContentPiece): SEOAnalysis {
    return {
      currentScore: contentPiece.seo_score || 60,
      targetScore: Math.min((contentPiece.seo_score || 60) + 20, 95),
      issues: [
        {
          type: 'content_length',
          severity: 'warning',
          description: 'NotebookLM API unavailable - using default analysis'
        },
        {
          type: 'readability',
          severity: 'suggestion',
          description: 'Consider manual SEO review'
        }
      ],
      recommendations: [
        {
          category: 'API Issue',
          action: 'Check NotebookLM connection',
          impact: 'high',
          implementation: 'Verify API credentials and connectivity'
        }
      ],
      optimizedContent: {
        title: contentPiece.title_english,
        metaDescription: 'Default meta description for ' + contentPiece.title_english
      }
    }
  }

  /**
   * Update content piece in database (placeholder - would use actual DB service)
   */
  private async updateContentPiece(contentId: string, updates: Partial<ContentPiece>): Promise<void> {
    // This would call the actual database service
    // For now, just log the update
    console.log(`Updating content piece ${contentId} with SEO optimizations:`, updates)
  }

  /**
   * Generate internal link suggestions based on Tax4US content
   */
  async generateInternalLinks(contentPiece: ContentPiece): Promise<Array<{
    anchor: string
    url: string
    relevance: number
  }>> {
    try {
      const linkPrompt = `
        הצע קישורים פנימיים רלוונטיים עבור תוכן על "${contentPiece.title_hebrew}".
        
        מילות מפתח: ${contentPiece.target_keywords.join(', ')}
        
        אנא הצע קישורים לנושאים קשורים בתחום המס הישראלי-אמריקאי כמו:
        - FBAR ודיווח על נכסים חוץ
        - מס כפל ואמנות מס
        - אזרחות כפולה והשלכות מס
        - דיווח על חשבונות בנק בחו"ל
        - קרנות השתלמות ופנסיה
        
        עבור כל קישור ספק:
        - טקסט האנקור המומלץ
        - URL יחסי (מתחיל ב-/)
        - רמת הרלוונטיות (1-10)
      `

      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notebook-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notebookId: this.notebookId,
          query: linkPrompt
        })
      })

      if (!response.ok) {
        throw new Error(`Notebook query failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return this.parseInternalLinksFromAI(result.answer)
      }

      return []

    } catch (error) {
      console.error('Failed to generate internal links:', error)
      return []
    }
  }

  private parseInternalLinksFromAI(response: string): Array<{anchor: string, url: string, relevance: number}> {
    const links: Array<{anchor: string, url: string, relevance: number}> = []
    
    // Simple parsing - in production would use more sophisticated NLP
    const linkPatterns = response.match(/(?:קישור|אנקור|URL)[\s\S]*?(?=\n\n|\n$|$)/gi) || []
    
    linkPatterns.forEach(pattern => {
      const anchorMatch = pattern.match(/אנקור[:\s]*([^\n]+)/i)
      const urlMatch = pattern.match(/URL[:\s]*([^\s\n]+)/i)
      const relevanceMatch = pattern.match(/רלוונטיות[:\s]*(\d+)/i)
      
      if (anchorMatch && urlMatch) {
        links.push({
          anchor: anchorMatch[1].trim(),
          url: urlMatch[1].trim(),
          relevance: relevanceMatch ? parseInt(relevanceMatch[1]) : 5
        })
      }
    })

    return links.slice(0, 5) // Limit to 5 links
  }
}

export const seoOptimizer = new SEOOptimizer()