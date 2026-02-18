import { NextRequest, NextResponse } from 'next/server'
import { apifyService } from '@/lib/services/apify-integration'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, urls, searchTerms, profileUrls } = body

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action parameter is required'
      }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'scrape-irs':
        if (!urls || !Array.isArray(urls)) {
          return NextResponse.json({
            success: false,
            error: 'urls array is required for IRS scraping'
          }, { status: 400 })
        }
        result = await apifyService.scrapeIrsContent(urls)
        break

      case 'build-knowledge-base':
        await apifyService.buildIrsKnowledgeBase()
        result = { message: 'IRS knowledge base build initiated' }
        break

      case 'scrape-linkedin':
        if (!profileUrls || !Array.isArray(profileUrls)) {
          return NextResponse.json({
            success: false,
            error: 'profileUrls array is required for LinkedIn scraping'
          }, { status: 400 })
        }
        result = await apifyService.scrapeLinkedInProfiles(profileUrls)
        break

      case 'scrape-facebook-ads':
        if (!searchTerms || !Array.isArray(searchTerms)) {
          return NextResponse.json({
            success: false,
            error: 'searchTerms array is required for Facebook ads scraping'
          }, { status: 400 })
        }
        result = await apifyService.scrapeFacebookAds(searchTerms)
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported: scrape-irs, build-knowledge-base, scrape-linkedin, scrape-facebook-ads'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Apify scraping error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}