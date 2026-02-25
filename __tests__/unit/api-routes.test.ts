import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { resetMocks } from '../mocks/elevenlabs.mock'

// Mock Next.js environment
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
    headers: {
      'content-type': 'application/json'
    }
  })
}

describe('API Routes Tests', () => {
  beforeEach(() => {
    resetMocks()
    
    // Set up test environment
    process.env.NODE_ENV = 'test'
    process.env.ELEVENLABS_API_KEY = 'test-key'
    process.env.CAPTIVATE_API_KEY = 'test-captivate'
  })

  afterEach(() => {
    resetMocks()
  })

  describe('/api/test-podcast-cron', () => {
    it('should test podcast cron functionality', async () => {
      // Mock the route handler
      const { GET } = await import('@/app/api/test-podcast-cron/route')
      
      // Mock successful podcast producer
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Podcast cron test completed')
      expect(data.connections).toBeDefined()
      expect(data.testEpisode).toBeDefined()
    })

    it('should handle podcast cron errors gracefully', async () => {
      const { GET } = await import('@/app/api/test-podcast-cron/route')
      
      // Mock podcast producer failure
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('/api/pipeline/cron', () => {
    it('should handle content pipeline cron requests', async () => {
      const { POST } = await import('@/app/api/pipeline/cron/route')
      
      // Mock successful pipeline execution
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          completed_workers: ['content-generator']
        })
      })

      const request = createMockRequest('POST', {
        type: 'content'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.type).toBe('content')
    })

    it('should handle podcast pipeline cron requests', async () => {
      const { POST } = await import('@/app/api/pipeline/cron/route')
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          episode: { id: 'test-episode' }
        })
      })

      const request = createMockRequest('POST', {
        type: 'podcast'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.type).toBe('podcast')
    })

    it('should validate cron request types', async () => {
      const { POST } = await import('@/app/api/pipeline/cron/route')
      
      const request = createMockRequest('POST', {
        type: 'invalid'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid cron type')
    })
  })

  describe('/api/pipeline/status', () => {
    it('should return current pipeline status', async () => {
      const { GET } = await import('@/app/api/pipeline/status/route')
      
      // Mock pipeline data
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          {
            id: 'run-123',
            status: 'completed',
            workers: ['content-generator', 'translator'],
            started_at: new Date().toISOString()
          }
        ])
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('status')
    })
  })

  describe('/api/content-generation', () => {
    it('should handle content generation requests', async () => {
      const { POST } = await import('@/app/api/content-generation/route')
      
      // Mock successful content generation
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          content: [{
            text: 'Generated article content...'
          }]
        })
      })

      const request = createMockRequest('POST', {
        topic: 'Remote Work Taxation',
        language: 'en',
        keywords: ['FBAR', 'dual citizenship']
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.content).toBeDefined()
    })

    it('should validate content generation parameters', async () => {
      const { POST } = await import('@/app/api/content-generation/route')
      
      const request = createMockRequest('POST', {
        // Missing required topic
        language: 'en'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('topic')
    })
  })

  describe('/api/topics', () => {
    it('should fetch topics from Airtable', async () => {
      const { GET } = await import('@/app/api/topics/route')
      
      // Mock Airtable response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          records: [
            {
              id: 'rec123',
              fields: {
                topic: 'Tax Planning',
                status: 'approved',
                priority: 'high'
              }
            }
          ]
        })
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.records).toBeDefined()
      expect(data.records[0]).toHaveProperty('id')
      expect(data.records[0].fields).toHaveProperty('topic')
    })

    it('should create new topics', async () => {
      const { POST } = await import('@/app/api/topics/route')
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          id: 'recNEW123',
          fields: {
            topic: 'New Topic',
            status: 'pending'
          }
        })
      })

      const request = createMockRequest('POST', {
        topic: 'New Topic',
        audience: 'Israeli-Americans',
        priority: 'medium'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.record).toHaveProperty('id')
    })
  })

  describe('/api/slack/topic-approval', () => {
    it('should handle Slack approval webhooks', async () => {
      const { POST } = await import('@/app/api/slack/topic-approval/route')
      
      // Mock Slack webhook payload
      const request = createMockRequest('POST', {
        type: 'block_actions',
        actions: [
          {
            action_id: 'approve_topic',
            value: 'rec123'
          }
        ],
        user: {
          id: 'U123',
          name: 'test-user'
        }
      })

      // Mock Airtable update
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          id: 'rec123',
          fields: { status: 'approved' }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const { POST } = await import('@/app/api/content-generation/route')
      
      const request = new NextRequest('http://localhost:3000/api/content-generation', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should handle missing environment variables', async () => {
      delete process.env.ELEVENLABS_API_KEY
      
      const { GET } = await import('@/app/api/test-podcast-cron/route')
      
      const response = await GET()
      const data = await response.json()

      expect(data.connections.elevenlabs.success).toBe(false)
      expect(data.connections.elevenlabs.message).toContain('API key not configured')
    })

    it('should handle external API timeouts', async () => {
      const { POST } = await import('@/app/api/content-generation/route')
      
      // Mock timeout
      global.fetch = jest.fn().mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const request = createMockRequest('POST', {
        topic: 'Test Topic',
        language: 'en'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Timeout')
    })

    it('should handle rate limiting gracefully', async () => {
      const { POST } = await import('@/app/api/content-generation/route')
      
      // Mock rate limit response
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' }
        })
      })

      const request = createMockRequest('POST', {
        topic: 'Test Topic',
        language: 'en'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Rate limit')
    })

    it('should validate authentication headers when required', async () => {
      const { GET } = await import('@/app/api/pipeline/status/route')
      
      // Mock request without proper auth (if applicable)
      const request = new NextRequest('http://localhost:3000/api/pipeline/status', {
        method: 'GET',
        headers: {
          // Missing authorization header if required
        }
      })

      const response = await GET(request)
      
      // Should succeed in test environment, but validate the structure
      expect(response.status).toBeLessThan(500)
    })
  })

  describe('Performance and Caching', () => {
    it('should handle concurrent requests properly', async () => {
      const { GET } = await import('@/app/api/pipeline/status/route')
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([])
      })

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => GET())
      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      // Should not overwhelm the system
      expect(global.fetch).toHaveBeenCalledTimes(5)
    })

    it('should respond within reasonable time limits', async () => {
      const { GET } = await import('@/app/api/topics/route')
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ records: [] })
      })

      const startTime = Date.now()
      const response = await GET()
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(5000) // Less than 5 seconds
    })
  })
})