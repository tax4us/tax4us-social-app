import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator'
import { setupAirtableMock, mockAirtableRecord } from '../mocks/airtable.mock'
import { resetMocks } from '../mocks/elevenlabs.mock'

describe('Content Pipeline Integration Tests', () => {
  let orchestrator: PipelineOrchestrator

  beforeEach(() => {
    resetMocks()

    process.env.AIRTABLE_API_KEY = 'test-airtable-key'
    process.env.AIRTABLE_BASE_ID = 'test-base-id'
    process.env.WORDPRESS_URL = 'https://test.example.com'
    process.env.WORDPRESS_AUTH_TOKEN = 'test-token'
    process.env.ANTHROPIC_API_KEY = 'test-claude-key'
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'
    process.env.TAVILY_API_KEY = 'test-tavily-key'
    process.env.KIE_AI_API_KEY = 'test-kie-key'
    process.env.SLACK_BOT_TOKEN = 'test-slack-token'
    process.env.SLACK_CHANNEL_ID = 'test-channel'

    orchestrator = new PipelineOrchestrator()
  })

  afterEach(() => {
    resetMocks()
  })

  describe('Topic Proposal Workflow', () => {
    it('should propose a new topic and return awaiting_approval status', async () => {
      setupAirtableMock([mockAirtableRecord])

      ;(global as any).fetch = jest.fn().mockImplementation((url: any, options: any) => {
        // POST to /posts = create → return object with id
        if (url.includes('wp-json/wp/v2/posts') && !url.includes('/posts/') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true, status: 201,
            json: () => Promise.resolve({ id: 9999, title: { rendered: '[PROPOSAL] New Topic' }, status: 'draft', content: { rendered: '' }, link: 'https://tax4us.co.il/?p=9999' })
          })
        }
        // GET list of posts → array
        if (url.includes('wp-json/wp/v2/posts') && !url.includes('/posts/')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([{ id: 1, title: { rendered: 'Existing Post' } }])
          })
        }
        // Categories → empty array
        if (url.includes('/categories')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
        }
        if (url.includes('wp-json')) {
          return Promise.resolve({
            ok: true, status: 201,
            json: () => Promise.resolve({ id: 9999, title: { rendered: 'Draft' }, status: 'draft', content: { rendered: '' }, link: '' })
          })
        }
        if (url.includes('anthropic.com')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve({
              content: [{ text: '{"topic": "FBAR 2026 Deadlines", "audience": "Israeli-Americans", "reasoning": "Time-sensitive"}' }]
            })
          })
        }
        if (url.includes('slack.com')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      const result = await orchestrator.proposeNewTopic()

      expect(result).toHaveProperty('status', 'awaiting_approval')
      expect(result).toHaveProperty('postId')
      expect(result).toHaveProperty('topic')
      expect(result).toHaveProperty('message')
    })

    it('should throw when WordPress API is unavailable', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json')) {
          return Promise.resolve({
            ok: false, status: 500,
            json: () => Promise.resolve({ message: 'Internal Server Error' })
          })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      await expect(orchestrator.proposeNewTopic()).rejects.toThrow()
    })

    it('should generate a revised topic based on feedback', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any, options: any) => {
        // POST to /posts = create → return object with id
        if (url.includes('wp-json/wp/v2/posts') && !url.includes('/posts/') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true, status: 201,
            json: () => Promise.resolve({ id: 10000, title: { rendered: '[PROPOSAL-REVISED] Revised Topic' }, status: 'draft', content: { rendered: '' }, link: '' })
          })
        }
        // GET list of posts → array
        if (url.includes('wp-json/wp/v2/posts') && !url.includes('/posts/')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([{ id: 1, title: { rendered: 'Existing Post' } }])
          })
        }
        // Categories → empty array
        if (url.includes('/categories')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
        }
        if (url.includes('wp-json')) {
          return Promise.resolve({
            ok: true, status: 201,
            json: () => Promise.resolve({ id: 10000, title: { rendered: 'Draft' }, status: 'draft', content: { rendered: '' }, link: '' })
          })
        }
        if (url.includes('anthropic.com')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve({
              content: [{ text: '{"topic": "Revised FBAR Topic", "audience": "Israeli-Americans", "reasoning": "Based on feedback"}' }]
            })
          })
        }
        if (url.includes('slack.com')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      const result = await orchestrator.proposeNewTopicWithFeedback('Please focus on FATCA requirements')

      expect(result).toHaveProperty('status', 'awaiting_approval')
      expect(result.topic).toBeTruthy()
    })
  })

  describe('AutoPilot Schedule', () => {
    it('should return idle on unscheduled days (Sunday)', async () => {
      const daySpy = jest.spyOn(global.Date.prototype, 'getDay').mockReturnValue(0)
      const result = await orchestrator.runAutoPilot()
      expect(result).toHaveProperty('status', 'idle')
      daySpy.mockRestore()
    })

    it('should run podcast flow on Wednesday with no posts (skipped)', async () => {
      const daySpy = jest.spyOn(global.Date.prototype, 'getDay').mockReturnValue(3)

      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      const result = await orchestrator.runAutoPilot()
      expect(result).toHaveProperty('status', 'skipped')
      daySpy.mockRestore()
    })
  })

  describe('Podcast AutoPilot', () => {
    it('should skip when no recent posts found', async () => {
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

    it('should process recent posts and produce episodes', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([
              { id: 123, title: { rendered: 'FBAR 2026 Guide' }, content: { rendered: '<p>Guide content</p>' } }
            ])
          })
        }
        if (url.includes('notebook-query') || url.includes('localhost')) {
          return Promise.resolve({ ok: true, status: 200,
            json: () => Promise.resolve({ success: true, answer: '[EMMA] Welcome [EXPERT] Hello' }) })
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

  describe('Heal Stalled Items', () => {
    it('should return healed status for a valid post', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('wp-json/wp/v2/posts/')) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve({
              id: 12345,
              status: 'publish',
              title: { rendered: 'Test Post' },
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

    it('should throw when post is not found', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ message: 'Not Found' }) })
      )

      await expect(orchestrator.heal(99999)).rejects.toThrow()
    })
  })
})
