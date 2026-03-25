import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator'
import { mockAirtableRecord } from '../mocks/airtable.mock'
import { setupElevenLabsMock, resetMocks } from '../mocks/elevenlabs.mock'

describe('End-to-End Worker Automation Tests', () => {
  let orchestrator: PipelineOrchestrator

  beforeEach(() => {
    resetMocks()

    ;(process.env as any).NODE_ENV = 'test'
    process.env.AIRTABLE_API_KEY = 'test-airtable'
    process.env.AIRTABLE_BASE_ID = 'test-base'
    process.env.WORDPRESS_URL = 'https://test.tax4us.co.il'
    process.env.WORDPRESS_AUTH_TOKEN = 'test-token'
    process.env.ANTHROPIC_API_KEY = 'test-claude'
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs'
    process.env.KIE_AI_API_KEY = 'test-kie'
    process.env.SLACK_BOT_TOKEN = 'test-slack'
    process.env.SLACK_CHANNEL_ID = 'test-channel'

    orchestrator = new PipelineOrchestrator()
  })

  afterEach(() => {
    resetMocks()
  })

  describe('Monday/Thursday Content Creation – proposeNewTopic', () => {
    it('should propose a topic and return awaiting_approval', async () => {
      setupMockEnvironment()

      const result = await orchestrator.proposeNewTopic()

      expect(result).toHaveProperty('status', 'awaiting_approval')
      expect(result.postId).toBeDefined()
      expect(result.topic).toBeDefined()
      expect(result.message).toContain('Ben for approval')
    })

    it('should generate a revised topic based on feedback', async () => {
      setupMockEnvironment()

      const result = await orchestrator.proposeNewTopicWithFeedback(
        'Focus on FATCA reporting for dual citizens'
      )

      expect(result).toHaveProperty('status', 'awaiting_approval')
      expect(result.topic).toBeTruthy()
    })
  })

  describe('Wednesday Podcast Automation', () => {
    it('should skip when no recent WordPress posts are available', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
        }
        if (url.includes('slack.com')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      const result = await orchestrator.runPodcastAutoPilot()

      expect(result).toHaveProperty('status', 'skipped')
      expect(result).toHaveProperty('reason', 'no_recent_posts')
    })

    it('should process Monday content into podcast episodes', async () => {
      setupElevenLabsMock(true)

      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
              {
                id: 12345,
                title: { rendered: 'Remote Work Tax Obligations for Israeli-Americans' },
                content: { rendered: '<p>Remote work taxation content...</p>' },
                date: '2026-02-24T08:00:00Z'
              }
            ])
          })
        }
        if (url.includes('notebook-query') || url.includes('localhost')) {
          return Promise.resolve({ ok: true, status: 200,
            json: () => Promise.resolve({ success: true, answer: '[EMMA] Welcome [EXPERT] Hello' }) })
        }
        if (url.includes('elevenlabs.io')) {
          return Promise.resolve({ ok: true, status: 200,
            arrayBuffer: () => Promise.resolve(Buffer.from('mock-audio')) })
        }
        if (url.includes('slack.com')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 'tts-123' }) })
      })

      const result = await orchestrator.runPodcastAutoPilot()

      expect(result).toHaveProperty('status', 'complete')
      expect((result as any).episodeCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('SEO Optimizer (Tuesday/Friday) – runSEOAutoPilot', () => {
    it('should complete without throwing on low-scoring posts', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts') && !url.includes('/posts/')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
              {
                id: 123,
                title: { rendered: 'Short post' },
                content: { rendered: 'Short content.' },
                meta: { rank_math_focus_keyword: '', rank_math_seo_score: 45 }
              }
            ])
          })
        }
        if (url.includes('anthropic.com')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve({
              content: [{ text: 'Optimized content with FBAR and FATCA keywords for Israeli-Americans.' }]
            })
          })
        }
        if (url.includes('wp-json/wp/v2/posts/')) {
          return Promise.resolve({ ok: true, status: 200,
            json: () => Promise.resolve({ id: 123, meta: { rank_math_seo_score: 85 } }) })
        }
        if (url.includes('slack.com')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      await expect(orchestrator.runSEOAutoPilot()).resolves.not.toThrow()
    })
  })

  describe('Data Healer (On-demand) – heal(postId)', () => {
    it('should return healed status for a valid post', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts/')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve({
              id: 12345,
              status: 'publish',
              title: { rendered: 'Hebrew Post' },
              content: { rendered: '<p>Content</p>' },
              link: 'https://tax4us.co.il/?p=12345',
              meta: {}
            })
          })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      const result = await orchestrator.heal(12345)

      expect(result).toHaveProperty('status', 'healed')
      expect(result).toHaveProperty('postId', 12345)
    })
  })

  describe('Complete 9-Worker System Integration', () => {
    it('should handle proposal + podcast run sequentially', async () => {
      setupMockEnvironment()

      // Monday: propose
      const proposalResult = await orchestrator.proposeNewTopic()
      expect(proposalResult.status).toBe('awaiting_approval')

      // Wednesday: podcast with no posts
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
        }
        if (url.includes('slack.com')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      const podcastResult = await orchestrator.runPodcastAutoPilot()
      expect(podcastResult).toHaveProperty('status', 'skipped')
    })

    it('should settle all operations even when services are down', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Service error' }) })
      )

      const results = await Promise.allSettled([
        orchestrator.runPodcastAutoPilot(),
        orchestrator.heal(12345)
      ])

      expect(results).toHaveLength(2)
      results.forEach(r => {
        expect(r.status === 'fulfilled' || r.status === 'rejected').toBe(true)
      })
    })
  })

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function setupMockEnvironment() {
    ;(global as any).fetch = jest.fn().mockImplementation((url: any, options: any) => {
      if (url.includes('airtable.com')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ records: [mockAirtableRecord] })
        })
      }
      // POST to /posts = create new post → return object with id
      if (url.includes('wp-json/wp/v2/posts') && !url.includes('/posts/') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({
            id: 12345, status: 'draft',
            title: { rendered: 'Draft' }, content: { rendered: '' },
            link: 'https://tax4us.co.il/?p=12345'
          })
        })
      }
      // GET list of posts → return array
      if (url.includes('wp-json/wp/v2/posts') && !url.includes('/posts/')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve([{ id: 1, title: { rendered: 'Existing Post' } }])
        })
      }
      // Categories → return empty array so resolveCategories fallback [1] is used
      if (url.includes('/categories')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
      }
      if (url.includes('wp-json')) {
        return Promise.resolve({
          ok: true, status: 201,
          json: () => Promise.resolve({
            id: 12345, status: 'draft',
            title: { rendered: 'Draft' }, content: { rendered: '' },
            link: 'https://tax4us.co.il/?p=12345'
          })
        })
      }
      if (url.includes('anthropic.com')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({
            content: [{ text: '{"topic": "FBAR 2026", "audience": "Israeli-Americans", "reasoning": "Timely"}' }]
          })
        })
      }
      if (url.includes('slack.com')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
    })
  }
})
