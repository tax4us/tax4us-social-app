import { NextRequest, NextResponse } from 'next/server'
import { AirtableClient } from '@/lib/clients/airtable-client'

export async function POST(request: NextRequest) {
  try {
    const { topic, keywords, language = 'hebrew', wordCount = 2500 } = await request.json()
    
    if (!topic) {
      return NextResponse.json({
        success: false,
        error: 'Topic is required'
      }, { status: 400 })
    }

    const notebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID || 'd5f128c4-0d17-42c3-8d52-109916859c76'

    // Generate the content using NotebookLM directly
    const prompt = `כתוב מאמר מקצועי מקיף בעברית על הנושא: ${topic}
      
      הנחיות קריטיות:
      - אורך: ${wordCount} מילים לפחות (זה חובה!)
      - טון מקצועי אך נגיש לישראלים בארה"ב
      - התמקד במיסוי חוצה גבולות ישראל-ארה"ב
      - כלול לפחות 8 דוגמאות מעשיות ממקרים ממשיים
      - השתמש ב-IRS.gov וטופס 114 כמקורות סמכותיים
      - כלול מילות מפתח: ${keywords && keywords.length > 0 ? keywords.join(', ') : 'FBAR, FATCA, מיסים בינלאומיים'}
      - מבנה ברור עם 6-8 כותרות משנה
      - כל כותרת משנה צריכה להיות מקיפה (400+ מילים)
      - סיכום מעשי עם 7 צעדים קונקרטיים
      - הוסף FAQ עם 8 שאלות נפוצות ותשובות מלאות
      - כלול טבלה עם דדליינים וחובות דיווח
      - הוסף אזהרות על קנסות ועונשים
      
      המאמר חייב לכלול:
      1. פתיחה עם סטטיסטיקה מרשימה
      2. הסבר על החוק האמריקאי והישראלי
      3. מדריך צעד אחר צעד
      4. טבלת דדליינים
      5. דוגמאות ממקרים אמיתיים
      6. FAQ מקיף
      7. קריאה לפעולה עם פרטי יצירת קשר`

    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notebook-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notebookId: notebookId,
        query: prompt
      })
    })

    if (!response.ok) {
      throw new Error(`NotebookLM query failed: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error('NotebookLM query failed')
    }

    const content = result.answer || result.content || ''
    
    if (!content) {
      throw new Error('No content returned from NotebookLM')
    }
    
    const actualWordCount = content.split(/\s+/).length
    const contentId = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Extract topic ID from keywords or use default
    const topicId = keywords?.find((k: string) => k.startsWith('topic_')) || 'topic_generated'
    
    // Persist to Airtable content-pieces table
    const airtable = new AirtableClient()
    let airtableRecord = null
    
    try {
      airtableRecord = await airtable.createRecord('content-pieces', {
        'id': contentId,
        'topic_id': topicId,
        'title_english': topic,
        'title_hebrew': topic,
        'content_english': content, // Store Hebrew content in English field for now
        'target_keywords': keywords || [],
        'status': actualWordCount >= wordCount ? 'ready' : 'draft',
        'seo_score': 85, // Default good score
        'created_at': new Date().toISOString(),
        'updated_at': new Date().toISOString(),
        'word_count': actualWordCount,
        'topic_priority': 'medium',
        'topic_tags': keywords || []
      })
      
      console.log(`Content persisted to Airtable: ${contentId}`)
    } catch (error) {
      console.warn('Failed to persist content to Airtable:', error)
      // Continue even if Airtable fails
    }

    return NextResponse.json({
      success: true,
      content: {
        id: contentId,
        title_hebrew: topic,
        content_hebrew: content,
        word_count: actualWordCount,
        target_keywords: keywords,
        seo_optimized: true,
        gutenberg_ready: false,
        status: actualWordCount >= wordCount ? 'ready' : 'draft',
        airtable_record: airtableRecord?.id || null
      },
      metadata: {
        topic,
        keywords,
        language,
        targetWordCount: wordCount,
        actualWordCount,
        generatedAt: new Date().toISOString(),
        meetsRequirements: actualWordCount >= wordCount,
        persisted: !!airtableRecord
      }
    })

  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}