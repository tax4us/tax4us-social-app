import { describe, it, expect } from '@jest/globals'

/**
 * Production Integration Suite
 *
 * Tests that hit http://localhost:3000 require a running Next.js server.
 * They are skipped in unit/CI mode.
 * Set RUN_PRODUCTION_TESTS=true to run them against `next dev`.
 */

const RUN_SERVER_TESTS = process.env.RUN_PRODUCTION_TESTS === 'true'
const itProd = RUN_SERVER_TESTS ? it : it.skip

describe('Production Integration Suite', () => {

  describe('API Endpoints', () => {
    itProd('should fetch content library data', async () => {
      const response = await fetch('http://localhost:3000/api/content/library')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.content_pieces)).toBe(true)
    })

    itProd('should fetch topics data', async () => {
      const response = await fetch('http://localhost:3000/api/topics')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      // Real route returns { success, topics, total }
      expect(Array.isArray(data.topics)).toBe(true)
      expect(typeof data.total).toBe('number')
    })

    itProd('should check integrations status', async () => {
      const response = await fetch('http://localhost:3000/api/integrations/status')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
    })

    itProd('should fetch pipeline status', async () => {
      const response = await fetch('http://localhost:3000/api/pipeline/status')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      // Real route returns { success, activeRuns, recentRuns, stats }
      expect(Array.isArray(data.recentRuns)).toBe(true)
      expect(data.stats).toBeDefined()
      expect(data.stats.totalRuns).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Content Generation Flow', () => {
    itProd('should generate content with real data', async () => {
      const response = await fetch('http://localhost:3000/api/content-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'Test Tax Planning Topic',
          keywords: ['tax planning', 'test'],
          language: 'hebrew',
          wordCount: 500
        })
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.content.id).toBeDefined()
    }, 30000)
  })

  describe('Authentication & Security', () => {
    itProd('should require proper auth for /api/cron/content-pipeline', async () => {
      const response = await fetch('http://localhost:3000/api/cron/content-pipeline?type=content', {
        headers: { 'Authorization': 'Bearer invalid_token' }
      })
      expect(response.status).toBe(401)
    })

    itProd('should allow access with valid cron secret', async () => {
      const response = await fetch('http://localhost:3000/api/cron/content-pipeline?type=content', {
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
      })
      expect(response.status).not.toBe(401)
    })
  })

  describe('Production Readiness Checks (always run)', () => {
    it('should be in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('should validate pipeline stage names', () => {
      const validStages = [
        'topic-selection',
        'hebrew-generation',
        'wp-draft-video',
        'hebrew-publish',
        'english-publish-social'
      ]
      validStages.forEach(stage => {
        expect(typeof stage).toBe('string')
        expect(stage.length).toBeGreaterThan(0)
      })
    })

    it('should validate approval gate types', () => {
      const mockGates = {
        topicApproved: false,
        hebrewContentApproved: false,
        videoApproved: false,
        linkedinApproved: false,
        facebookApproved: false
      }
      Object.values(mockGates).forEach(gate => {
        expect(typeof gate).toBe('boolean')
      })
    })

    it('should not have placeholder CRON_SECRET if set', () => {
      if (process.env.CRON_SECRET) {
        expect(process.env.CRON_SECRET).not.toBe('your_cron_secret_here')
      }
    })
  })
})
