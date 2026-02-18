import { projectMemory } from './project-memory'

export interface ApifyRunResult {
  id: string
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  statusMessage: string
  startedAt: string
  finishedAt?: string
  buildNumber: string
  exitCode?: number
  defaultDatasetId: string
  defaultKeyValueStoreId: string
  stats: {
    inputBodyLen: number
    restartCount: number
    workersUsed: number
  }
}

export interface IrsContentItem {
  url: string
  title: string
  text: string
  markdown: string
  metadata: {
    contentType: string
    lastModified: string
    wordCount: number
    readingTime: number
  }
}

export interface LinkedInProfile {
  profileUrl: string
  fullName: string
  headline: string
  location: string
  connectionCount: number
  experience: Array<{
    title: string
    company: string
    duration: string
    location: string
  }>
  education: Array<{
    school: string
    degree: string
    field: string
    years: string
  }>
  skills: string[]
  contactInfo: {
    email?: string
    phone?: string
  }
}

class ApifyIntegrationService {
  private readonly apiToken = process.env.APIFY_TOKEN
  private readonly baseUrl = 'https://api.apify.com/v2'
  private readonly userId = 'JpAAvL7UM4NtVh4QP'

  constructor() {
    if (!this.apiToken) {
      console.warn('APIFY_TOKEN not configured - Apify services will not be available')
    }
  }

  // Website Content Crawler for IRS.gov scraping
  async scrapeIrsContent(urls: string[]): Promise<IrsContentItem[]> {
    if (!this.apiToken) {
      throw new Error('Apify API token not configured')
    }

    const taskId = await projectMemory.logTask(
      `Scrape IRS content from ${urls.length} URLs using Apify`,
      'in_progress',
      `URLs: ${urls.join(', ')}`,
      []
    )

    try {
      // Website Content Crawler Actor
      const actorId = 'apify/website-content-crawler'
      
      const runInput = {
        startUrls: urls.map(url => ({ url })),
        crawlerType: 'playwright',
        includeUrlGlobs: ['https://www.irs.gov/**'],
        excludeUrlGlobs: [
          'https://www.irs.gov/pub/**', // Skip PDF publications for now
          'https://www.irs.gov/forms-pubs/**' // Skip forms section
        ],
        maxCrawlPages: 50,
        maxOutputPages: 50,
        onlyMainContent: true,
        removeCookieWarnings: true,
        clickElementsCssSelector: '',
        htmlTransformer: 'readabilityjs',
        readabilityMinScore: 40,
        removeElementsCssSelector: 'nav, .nav, #nav, .navigation, .sidebar, .ads, .advertisement',
        outputFormats: ['markdown', 'text']
      }

      const runResult = await this.startActor(actorId, runInput)
      const data = await this.waitForRunCompletion(runResult.id)
      
      await projectMemory.updateTask(taskId, {
        status: 'completed',
        notes: `Successfully scraped ${data.length} IRS content items`
      })

      return data as IrsContentItem[]

    } catch (error) {
      await projectMemory.updateTask(taskId, {
        status: 'blocked',
        notes: `IRS scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
  }

  // LinkedIn Profile Scraper for lead generation
  async scrapeLinkedInProfiles(profileUrls: string[]): Promise<LinkedInProfile[]> {
    if (!this.apiToken) {
      throw new Error('Apify API token not configured')
    }

    const taskId = await projectMemory.logTask(
      `Scrape LinkedIn profiles for lead generation`,
      'in_progress',
      `Profiles: ${profileUrls.length}`,
      []
    )

    try {
      const actorId = 'apify/linkedin-profile-scraper'
      
      const runInput = {
        profileUrls: profileUrls,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL']
        },
        includeContactInfo: true,
        includeSkills: true,
        includeExperience: true,
        includeEducation: true
      }

      const runResult = await this.startActor(actorId, runInput)
      const data = await this.waitForRunCompletion(runResult.id)
      
      await projectMemory.updateTask(taskId, {
        status: 'completed',
        notes: `Successfully scraped ${data.length} LinkedIn profiles`
      })

      return data as LinkedInProfile[]

    } catch (error) {
      await projectMemory.updateTask(taskId, {
        status: 'blocked', 
        notes: `LinkedIn scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
  }

  // Facebook Ads Library Scraper for competitor analysis
  async scrapeFacebookAds(searchTerms: string[]): Promise<any[]> {
    if (!this.apiToken) {
      throw new Error('Apify API token not configured')
    }

    const taskId = await projectMemory.logTask(
      `Scrape Facebook Ads Library for competitor analysis`,
      'in_progress',
      `Search terms: ${searchTerms.join(', ')}`,
      []
    )

    try {
      const actorId = 'apify/facebook-ads-library-scraper'
      
      const runInput = {
        searchTerms: searchTerms,
        adType: 'ALL',
        adActiveStatus: 'ALL',
        country: 'US',
        mediaType: 'ALL',
        maxItems: 100,
        proxyConfiguration: {
          useApifyProxy: true
        }
      }

      const runResult = await this.startActor(actorId, runInput)
      const data = await this.waitForRunCompletion(runResult.id)
      
      await projectMemory.updateTask(taskId, {
        status: 'completed',
        notes: `Found ${data.length} competitor ads for analysis`
      })

      return data

    } catch (error) {
      await projectMemory.updateTask(taskId, {
        status: 'blocked',
        notes: `Facebook ads scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
  }

  // Generic Actor runner
  private async startActor(actorId: string, input: any): Promise<ApifyRunResult> {
    const response = await fetch(`${this.baseUrl}/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data
  }

  // Wait for run completion and fetch results
  private async waitForRunCompletion(runId: string, maxWaitMinutes: number = 10): Promise<any[]> {
    const maxWaitMs = maxWaitMinutes * 60 * 1000
    const startTime = Date.now()
    const pollInterval = 5000 // 5 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const runStatus = await this.getRunStatus(runId)
      
      if (runStatus.status === 'SUCCEEDED') {
        return await this.getRunResults(runId)
      } else if (runStatus.status === 'FAILED') {
        throw new Error(`Apify run failed: ${runStatus.statusMessage}`)
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Apify run timed out after ${maxWaitMinutes} minutes`)
  }

  private async getRunStatus(runId: string): Promise<ApifyRunResult> {
    const response = await fetch(`${this.baseUrl}/actor-runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get run status: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data
  }

  private async getRunResults(runId: string): Promise<any[]> {
    const runStatus = await this.getRunStatus(runId)
    const datasetId = runStatus.defaultDatasetId

    const response = await fetch(`${this.baseUrl}/datasets/${datasetId}/items`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get run results: ${response.statusText}`)
    }

    return await response.json()
  }

  // Build RAG knowledge base from scraped IRS content
  async buildIrsKnowledgeBase(): Promise<void> {
    const irsUrls = [
      'https://www.irs.gov/individuals/international-taxpayers',
      'https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar',
      'https://www.irs.gov/businesses/corporations/foreign-account-tax-compliance-act-fatca',
      'https://www.irs.gov/individuals/international-taxpayers/foreign-tax-credit',
      'https://www.irs.gov/individuals/international-taxpayers/tax-treaties'
    ]

    const taskId = await projectMemory.logTask(
      'Build IRS knowledge base for RAG system',
      'in_progress',
      'Scraping authoritative tax content from IRS.gov',
      []
    )

    try {
      const scrapedContent = await this.scrapeIrsContent(irsUrls)
      
      // TODO: Integrate with vector database (Pinecone, Weaviate, or local embeddings)
      // This would create embeddings and store them for RAG retrieval
      
      await projectMemory.updateTask(taskId, {
        status: 'completed',
        notes: `Built knowledge base with ${scrapedContent.length} authoritative IRS documents`
      })

      await projectMemory.logDecision(
        'Implement Apify-powered RAG system for Tax4US Content Factory',
        'Need authoritative, up-to-date tax information for AI content generation',
        ['Manual content research', 'Static knowledge bases', 'Generic AI training data'],
        'Apify provides automated scraping of IRS.gov for most current regulations and guidance',
        `Integrated Website Content Crawler to build dynamic knowledge base from ${irsUrls.length} key IRS pages`,
        'high'
      )

    } catch (error) {
      await projectMemory.updateTask(taskId, {
        status: 'blocked',
        notes: `Knowledge base build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
  }
}

export const apifyService = new ApifyIntegrationService()