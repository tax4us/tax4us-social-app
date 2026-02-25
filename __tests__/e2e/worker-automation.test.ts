import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { Orchestrator } from '@/lib/pipeline/orchestrator'
import { setupAirtableMock, mockAirtableRecord } from '../mocks/airtable.mock'
import { setupElevenLabsMock, resetMocks } from '../mocks/elevenlabs.mock'
import { createMockContent } from '../mocks/content.mock'

describe('End-to-End Worker Automation Tests', () => {
  let orchestrator: Orchestrator
  
  beforeEach(() => {
    resetMocks()
    
    // Set up comprehensive environment
    process.env.NODE_ENV = 'test'
    process.env.AIRTABLE_API_KEY = 'test-airtable'
    process.env.AIRTABLE_BASE_ID = 'test-base'
    process.env.WORDPRESS_API_URL = 'https://test.tax4us.co.il/wp-json'
    process.env.CLAUDE_API_KEY = 'test-claude'
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs'
    process.env.KIE_API_KEY = 'test-kie'
    process.env.SLACK_BOT_TOKEN = 'test-slack'
    process.env.FACEBOOK_ACCESS_TOKEN = 'test-facebook'
    
    orchestrator = new Orchestrator()
  })

  afterEach(() => {
    resetMocks()
  })

  describe('Monday/Thursday Content Creation Pipeline', () => {
    it('should execute complete Monday pipeline: Topic → Content → Gutenberg → Translation → Media → Social', async () => {
      // Mock all required APIs
      setupCompleteMockEnvironment()
      
      // Track pipeline execution stages
      const executionLog: string[] = []
      
      // Mock pipeline logger to track execution
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        if (message.includes('Pipeline')) {
          executionLog.push(message)
        }
      })

      const result = await orchestrator.runContentPipeline({
        workers: ['topic-manager', 'content-generator', 'gutenberg-builder', 'translator', 'media-processor', 'social-publisher'],
        test_mode: true
      })

      expect(result.success).toBe(true)
      expect(result.completed_workers).toContain('topic-manager')
      expect(result.completed_workers).toContain('content-generator') 
      expect(result.completed_workers).toContain('gutenberg-builder')
      expect(result.completed_workers).toContain('translator')
      expect(result.completed_workers).toContain('media-processor')
      expect(result.completed_workers).toContain('social-publisher')
      expect(result.artifacts).toHaveProperty('hebrew_post_id')
      expect(result.artifacts).toHaveProperty('english_post_id')
      expect(result.artifacts).toHaveProperty('social_posts')
    })

    it('should handle worker failures and continue pipeline', async () => {
      setupMockEnvironmentWithFailures()
      
      const result = await orchestrator.runContentPipeline({
        workers: ['topic-manager', 'content-generator', 'gutenberg-builder'],
        test_mode: true,
        skip_failures: true
      })

      expect(result.failed_workers.length).toBeGreaterThan(0)
      expect(result.completed_workers.length).toBeGreaterThan(0)
      expect(result.success).toBe(false) // Overall failure due to some worker failures
    })

    it('should respect worker dependencies and execution order', async () => {
      setupCompleteMockEnvironment()
      
      const executionOrder: string[] = []
      
      // Mock each worker to track execution order
      jest.spyOn(orchestrator as any, 'executeWorker').mockImplementation(async (workerName: string) => {
        executionOrder.push(workerName)
        
        // Simulate realistic execution times
        await new Promise(resolve => setTimeout(resolve, 100))
        
        return {
          success: true,
          worker: workerName,
          artifacts: { [`${workerName}_result`]: true }
        }
      })

      await orchestrator.runContentPipeline({
        workers: ['topic-manager', 'content-generator', 'translator', 'social-publisher'],
        test_mode: true
      })

      // Verify correct execution order
      expect(executionOrder.indexOf('topic-manager')).toBeLessThan(
        executionOrder.indexOf('content-generator')
      )
      expect(executionOrder.indexOf('content-generator')).toBeLessThan(
        executionOrder.indexOf('translator')
      )
      expect(executionOrder.indexOf('translator')).toBeLessThan(
        executionOrder.indexOf('social-publisher')
      )
    })
  })

  describe('Wednesday Podcast Automation', () => {
    it('should process Monday content into podcast episode', async () => {
      setupCompleteMockEnvironment()
      setupElevenLabsMock(true)
      
      // Mock Monday content available for processing
      const mondayContent = createMockContent({
        title_english: "Remote Work Tax Obligations for Israeli-Americans",
        created_at: "2026-02-24T08:00:00Z" // Monday
      })
      
      // Mock content retrieval
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
              {
                id: 12345,
                title: { rendered: mondayContent.title_english },
                content: { rendered: '<p>Remote work taxation content...</p>' },
                date: mondayContent.created_at
              }
            ])
          })
        }
        
        if (url.includes('elevenlabs.io')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            arrayBuffer: () => Promise.resolve(Buffer.from('mock-audio'))
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })

      const result = await orchestrator.runPodcastAutoPilot()

      expect(result.success).toBe(true)
      expect(result.episode).toBeDefined()
      expect(result.episode.title).toContain('Tax4Us Weekly')
      expect(result.episode.audioUrl).toBeTruthy()
      expect(result.source_content_date).toContain('2026-02-24')
    })

    it('should handle no content available gracefully', async () => {
      setupCompleteMockEnvironment()
      
      // Mock empty content response
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]) // No posts
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })

      const result = await orchestrator.runPodcastAutoPilot()

      expect(result.success).toBe(false)
      expect(result.error).toContain('No recent content')
    })
  })

  describe('SEO Optimizer (Tuesday/Friday)', () => {
    it('should identify and optimize low-scoring content', async () => {
      setupCompleteMockEnvironment()
      
      // Mock low-scoring posts
      global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
        if (url.includes('wp-json/wp/v2/posts')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
              {
                id: 123,
                title: { rendered: 'Test Post' },
                content: { rendered: 'Short content without keywords' },
                meta: { rank_math_seo_score: 45 } // Low score
              }
            ])
          })
        }
        
        if (url.includes('anthropic.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              content: [{
                text: 'Optimized content with better SEO structure and keywords...'
              }]
            })
          })
        }
        
        if (options?.method === 'PATCH' && url.includes('wp-json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              id: 123,
              meta: { rank_math_seo_score: 85 } // Improved score
            })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })

      const result = await orchestrator.runSEOOptimizer({
        min_score_threshold: 60,
        max_posts_to_optimize: 5
      })

      expect(result.success).toBe(true)
      expect(result.optimized_posts).toBeGreaterThan(0)
      expect(result.average_score_improvement).toBeGreaterThan(0)
    })
  })

  describe('Data Auto-Healer (On-demand)', () => {
    it('should detect and heal data inconsistencies', async () => {
      setupCompleteMockEnvironment()
      
      // Mock inconsistent data
      const inconsistentRecord = {
        ...mockAirtableRecord,
        fields: {
          ...mockAirtableRecord.fields,
          status: 'completed',
          hebrew_post_id: 12345,
          english_post_id: null // Missing English post
        }
      }
      
      global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
        if (url.includes('airtable.com') && options?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              records: [inconsistentRecord]
            })
          })
        }
        
        if (url.includes('wp-json/wp/v2/posts/12345')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              id: 12345,
              title: { rendered: 'Hebrew Post' }
            })
          })
        }
        
        // Simulate healing by creating missing English post
        if (url.includes('wp-json/wp/v2/posts') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({
              id: 12346,
              title: { rendered: 'English Post' }
            })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })

      const result = await orchestrator.runDataHealer({
        check_all_records: true,
        auto_fix: true
      })

      expect(result.success).toBe(true)
      expect(result.issues_found).toBeGreaterThan(0)
      expect(result.issues_fixed).toBeGreaterThan(0)
      expect(result.healing_actions).toContain('created_missing_english_post')
    })
  })

  describe('Complete 9-Worker System Integration', () => {
    it('should execute full Monday-to-Wednesday workflow', async () => {
      setupCompleteMockEnvironment()
      setupElevenLabsMock(true)
      
      // Monday: Content Creation
      const mondayResult = await orchestrator.runContentPipeline({
        workers: ['topic-manager', 'content-generator', 'gutenberg-builder', 'translator', 'media-processor', 'social-publisher'],
        test_mode: true
      })
      
      expect(mondayResult.success).toBe(true)
      
      // Wednesday: Podcast Production (using Monday's content)
      const wednesdayResult = await orchestrator.runPodcastAutoPilot()
      
      expect(wednesdayResult.success).toBe(true)
      expect(wednesdayResult.episode).toBeDefined()
      
      // Verify end-to-end data flow
      expect(mondayResult.artifacts.hebrew_post_id).toBeDefined()
      expect(mondayResult.artifacts.english_post_id).toBeDefined()
      expect(wednesdayResult.source_content_id).toBe(mondayResult.artifacts.english_post_id)
    })

    it('should handle worker failures with proper recovery', async () => {
      setupMockEnvironmentWithFailures()
      
      const results = await Promise.allSettled([
        orchestrator.runContentPipeline({ workers: ['topic-manager', 'content-generator'], test_mode: true }),
        orchestrator.runSEOOptimizer({ min_score_threshold: 60 }),
        orchestrator.runDataHealer({ check_all_records: true })
      ])
      
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')
      
      // Some operations should succeed even if others fail
      expect(successful.length).toBeGreaterThan(0)
      
      // Failed operations should provide meaningful error information
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason).toBeDefined()
        }
      })
    })
  })

  // Helper functions
  function setupCompleteMockEnvironment() {
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      const method = options?.method || 'GET'
      
      // Airtable API
      if (url.includes('airtable.com')) {
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              records: [mockAirtableRecord]
            })
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: 'updated' })
        })
      }
      
      // WordPress API
      if (url.includes('wp-json')) {
        if (method === 'POST' && url.includes('/posts')) {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({
              id: Math.floor(Math.random() * 10000),
              status: 'publish'
            })
          })
        }
        
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([
              { id: 1, name: 'Tax Planning' },
              { id: 2, name: 'FBAR' }
            ])
          })
        }
      }
      
      // Claude API
      if (url.includes('anthropic.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            content: [{ text: 'Generated content with SEO optimization...' }]
          })
        })
      }
      
      // Kie.ai API
      if (url.includes('kie.ai')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: 'media-task',
            status: 'completed',
            result: { image_url: 'https://generated-image.jpg' }
          })
        })
      }
      
      // Default success response
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      })
    })
  }

  function setupMockEnvironmentWithFailures() {
    global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
      // Simulate random failures
      if (Math.random() < 0.3) { // 30% failure rate
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Simulated failure' })
        })
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          id: Math.floor(Math.random() * 1000)
        })
      })
    })
  }
})