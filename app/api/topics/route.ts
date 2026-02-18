import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/services/database'

export async function GET(request: NextRequest) {
  try {
    const topics = await db.getTopics()
    
    return NextResponse.json({
      success: true,
      topics,
      total: topics.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Topics API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title_hebrew, title_english, target_keywords } = await request.json()
    
    if (!title_hebrew || !title_english || !target_keywords?.length) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: title_hebrew, title_english, target_keywords'
      }, { status: 400 })
    }

    const topic = await db.createTopic({
      title_hebrew,
      title_english,
      priority: 'medium',
      seasonal_relevance: 'year-round',
      tags: target_keywords || []
    })

    return NextResponse.json({
      success: true,
      topic,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Topic creation failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}