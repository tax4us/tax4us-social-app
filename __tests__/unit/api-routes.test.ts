import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { resetMocks } from '../mocks/elevenlabs.mock'

const createMockRequest = (method: string, body?: any, searchParams?: Record<string, string>) => {
  const url = new URL('http://localhost:3000/api/test')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' }
  })
}

describe('API Routes Tests', () => {
  beforeEach(() => {
    resetMocks()
    ;(process.env as any).NODE_ENV = 'test'
    process.env.ELEVENLABS_API_KEY = 'test-key'
    process.env.CAPTIVATE_API_KEY = 'test-captivate'
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  afterEach(() => {
    resetMocks()
  })

  describe('/api/test-podcast-cron', () => {
    it('should test podcast cron functionality', async () => {
      const { GET } = await import('@/app/api/test-podcast-cron/route')

      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('elevenlabs.io')) {
          return Promise.resolve({ ok: true, status: 200,
            json: () => Promise.resolve({ voices: [] }) })
        }
        // notebook-query and kie.ai responses
        return Promise.resolve({ ok: true, status: 200,
          json: () => Promise.resolve({ success: true, answer: '[EMMA] Test script [EXPERT] Hello', id: 'tts-123' }) })
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Podcast cron test completed')
      expect(data.connections).toBeDefined()
      expect(data.testEpisode).toBeDefined()
    })

    it('should still return 200 when podcast episode fails internally', async () => {
      const { GET } = await import('@/app/api/test-podcast-cron/route')

      // All fetch calls fail → testConnections returns elevenlabs.success:false
      // createPodcastEpisode catches and returns status:'failed', not a 500
      ;(global as any).fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'API Error' }) })
      )

      const response = await GET()
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.testEpisode).toBeDefined()
    })
  })

  describe('/api/cron/content-pipeline (GET with Bearer token)', () => {
    it('should reject requests with wrong token', async () => {
      process.env.CRON_SECRET = 'real-secret'
      const { GET } = await import('@/app/api/cron/content-pipeline/route')

      const request = new NextRequest('http://localhost:3000/api/cron/content-pipeline', {
        method: 'GET',
        headers: { 'authorization': 'Bearer wrong-token' }
      })

      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should accept requests with valid cron secret', async () => {
      process.env.CRON_SECRET = 'test-cron-secret'
      const { GET } = await import('@/app/api/cron/content-pipeline/route')

      const request = new NextRequest('http://localhost:3000/api/cron/content-pipeline', {
        method: 'GET',
        headers: { 'authorization': 'Bearer test-cron-secret' }
      })

      const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response)
      ;(global as any).fetch = mockFetch

      const response = await GET(request)
      // Not 401 — may be 200 or 500 depending on orchestrator in test env
      expect(response.status).not.toBe(401)
    })
  })

  describe('/api/pipeline/status', () => {
    it('should return pipeline status with correct shape', async () => {
      const { GET } = await import('@/app/api/pipeline/status/route')

      const response = await GET(createMockRequest('GET'))
      const data = await response.json()

      // Real route returns { success, activeRuns, recentRuns, stats }
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.activeRuns)).toBe(true)
      expect(Array.isArray(data.recentRuns)).toBe(true)
      expect(data.stats).toHaveProperty('totalRuns')
    })
  })

  describe('/api/content-generation', () => {
    it('should handle content generation requests', async () => {
      const { POST } = await import('@/app/api/content-generation/route')

      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        // notebook-query (called internally by the route)
        if (url.includes('notebook-query') || url.includes('localhost')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve({
              success: true,
              answer: 'Generated article content about tax planning with sufficient length for testing purposes...'
            })
          })
        }
        // Airtable
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ id: 'recNEW', fields: {} })
        })
      })

      const request = createMockRequest('POST', {
        topic: 'Remote Work Taxation',
        language: 'hebrew',
        keywords: ['FBAR', 'dual citizenship']
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.content).toBeDefined()
      expect(data.content.id).toBeDefined()
      expect(data.metadata).toBeDefined()
    })

    it('should reject requests missing topic', async () => {
      const { POST } = await import('@/app/api/content-generation/route')

      const request = createMockRequest('POST', { language: 'hebrew' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      // Real route returns "Topic is required" (capital T) — case-insensitive check
      expect(data.error.toLowerCase()).toContain('topic')
    })
  })

  describe('/api/topics', () => {
    it('should return topics with correct shape', async () => {
      const { GET } = await import('@/app/api/topics/route')

      const response = await GET(createMockRequest('GET'))
      const data = await response.json()

      // Real route returns { success, topics, total, timestamp }
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.topics)).toBe(true)
      expect(typeof data.total).toBe('number')
    })

    it('should create a topic with the correct body shape', async () => {
      const { POST } = await import('@/app/api/topics/route')

      // Route expects { title_hebrew, title_english, target_keywords }
      const request = createMockRequest('POST', {
        title_hebrew: 'מס על עבודה מרחוק',
        title_english: 'Remote Work Tax',
        target_keywords: ['FBAR', 'taxation']
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.topic).toBeDefined()
    })

    it('should reject topic creation with missing required fields', async () => {
      const { POST } = await import('@/app/api/topics/route')

      const request = createMockRequest('POST', {
        title_hebrew: 'Only Hebrew Title'
        // missing title_english and target_keywords
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should respond quickly', async () => {
      const { GET } = await import('@/app/api/topics/route')

      const start = Date.now()
      const response = await GET(createMockRequest('GET'))
      expect(Date.now() - start).toBeLessThan(5000)
      expect(response.status).toBe(200)
    })

    it('should report elevenlabs failure when API key is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY

      const { GET } = await import('@/app/api/test-podcast-cron/route')

      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('elevenlabs.io')) {
          return Promise.resolve({
            ok: false, status: 401,
            json: () => Promise.resolve({ error: 'Unauthorized' })
          })
        }
        return Promise.resolve({ ok: true, status: 200,
          json: () => Promise.resolve({ success: true, answer: 'Script', id: 'tts-123' }) })
      })

      const response = await GET()
      const data = await response.json()

      expect(data.connections.elevenlabs.success).toBe(false)
    })
  })
})
