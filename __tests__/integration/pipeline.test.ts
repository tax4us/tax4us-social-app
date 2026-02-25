import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { BlogMaster } from '@/lib/pipeline/blog-master'
import { setupAirtableMock, mockAirtableRecord, mockPublishedRecord } from '../mocks/airtable.mock'
import { setupElevenLabsMock } from '../mocks/elevenlabs.mock'
import { resetMocks } from '../mocks/elevenlabs.mock'

describe('Content Pipeline Integration Tests', () => {
  let blogMaster: BlogMaster
  
  beforeEach(() => {
    // Reset all mocks
    resetMocks()
    
    // Set up environment variables
    process.env.AIRTABLE_API_KEY = 'test-airtable-key'
    process.env.AIRTABLE_BASE_ID = 'test-base-id'
    process.env.WORDPRESS_API_URL = 'https://test.example.com/wp-json'
    process.env.WORDPRESS_USERNAME = 'test-user'
    process.env.WORDPRESS_PASSWORD = 'test-pass'
    process.env.CLAUDE_API_KEY = 'test-claude-key'
    process.env.KIE_API_KEY = 'test-kie-key'
    
    // Initialize BlogMaster
    blogMaster = new BlogMaster()
  })

  afterEach(() => {
    resetMocks()
  })

  describe('BlogMaster Workflow', () => {
    it('should execute complete content creation workflow', async () => {
      // Mock successful Airtable response
      setupAirtableMock([mockAirtableRecord])
      
      // Mock successful WordPress API
      global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
        if (url.includes('airtable.com')) {
          return setupAirtableMock([mockAirtableRecord])
        }
        
        if (url.includes('wp-json')) {
          const method = options?.method || 'GET'
          
          if (method === 'POST' && url.includes('/posts')) {
            return Promise.resolve({
              ok: true,
              status: 201,
              json: () => Promise.resolve({
                id: Math.floor(Math.random() * 10000),
                title: { rendered: 'Test Post' },
                status: 'publish'
              })
            })
          }
          
          if (method === 'GET' && url.includes('/categories')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve([
                { id: 1, name: 'Tax Planning', slug: 'tax-planning' }
              ])
            })
          }
          
          if (method === 'GET' && url.includes('/tags')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve([
                { id: 2, name: 'Remote Work', slug: 'remote-work' }
              ])
            })
          }
        }
        
        // Mock Claude API
        if (url.includes('anthropic.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              content: [{
                text: 'Generated article content...'
              }]
            })
          })
        }
        
        // Mock Kie.ai API
        if (url.includes('kie.ai')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              id: 'task-123',
              status: 'completed',
              result: {
                image_url: 'https://kie.ai/generated-image.jpg'
              }
            })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })

      const result = await blogMaster.execute({
        topic_id: 'recABC123',
        test_mode: true,
        skip_existing: false
      })

      expect(result.success).toBe(true)
      expect(result.topic_id).toBe('recABC123')
      expect(result.hebrew_post_id).toBeDefined()
      expect(result.english_post_id).toBeDefined()
      expect(result.errors).toHaveLength(0)
    })

    it('should skip existing posts when configured', async () => {
      // Mock record with existing post IDs
      setupAirtableMock([mockPublishedRecord])
      
      const result = await blogMaster.execute({
        topic_id: 'recABC123',
        skip_existing: true
      })

      expect(result.success).toBe(true)
      expect(result.hebrew_post_id).toBe(12345)
      expect(result.english_post_id).toBe(12346)
    })

    it('should handle topic not found gracefully', async () => {
      setupAirtableMock([]) // No records
      
      const result = await blogMaster.execute({
        topic_id: 'nonexistent'
      })

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Topic not found: nonexistent')
    })

    it('should process multiple topics in batch', async () => {
      const multipleRecords = [
        mockAirtableRecord,
        { ...mockAirtableRecord, id: 'recDEF456', fields: { ...mockAirtableRecord.fields, topic: 'FBAR Requirements' } },
        { ...mockAirtableRecord, id: 'recGHI789', fields: { ...mockAirtableRecord.fields, topic: 'State Tax Issues' } }
      ]
      
      setupAirtableMock(multipleRecords)
      
      // Mock successful API responses for all requests
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          records: multipleRecords,
          id: Math.floor(Math.random() * 10000),
          content: [{ text: 'Generated content...' }]
        })
      })

      const results = await blogMaster.processBatch([
        { topic_id: 'recABC123' },
        { topic_id: 'recDEF456' },
        { topic_id: 'recGHI789' }
      ])

      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should process all pending topics', async () => {
      const pendingRecords = [
        mockAirtableRecord,
        { ...mockAirtableRecord, id: 'recPENDING1' }
      ]
      
      setupAirtableMock(pendingRecords)
      
      // Mock successful processing
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          records: pendingRecords,
          id: Math.floor(Math.random() * 10000)
        })
      })

      const results = await blogMaster.processAllPending()

      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.topic_id)).toBe(true)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle WordPress API failures gracefully', async () => {
      setupAirtableMock([mockAirtableRecord])
      
      // Mock WordPress API failure
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('airtable.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ records: [mockAirtableRecord] })
          })
        }
        
        if (url.includes('wp-json')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ message: 'Internal Server Error' })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })

      const result = await blogMaster.execute({
        topic_id: 'recABC123'
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('WordPress')
    })

    it('should handle content generation API failures', async () => {
      setupAirtableMock([mockAirtableRecord])
      
      // Mock Claude API failure
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('airtable.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ records: [mockAirtableRecord] })
          })
        }
        
        if (url.includes('anthropic.com')) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: 'Rate limit exceeded' })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })

      const result = await blogMaster.execute({
        topic_id: 'recABC123'
      })

      expect(result.success).toBe(false)
      expect(result.errors.some(error => error.includes('Rate limit'))).toBe(true)
    })

    it('should handle partial failures in batch processing', async () => {
      const mixedRecords = [
        mockAirtableRecord,
        { ...mockAirtableRecord, id: 'recFAIL1' },
        { ...mockAirtableRecord, id: 'recSUCCESS1' }
      ]
      
      setupAirtableMock(mixedRecords)
      
      // Mock mixed success/failure responses
      global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
        if (url.includes('airtable.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ records: mixedRecords })
          })
        }
        
        // Simulate failure for specific topic
        if (options?.body && options.body.includes('recFAIL1')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'Bad Request' })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: Math.floor(Math.random() * 10000)
          })
        })
      })

      const results = await blogMaster.processBatch([
        { topic_id: 'recABC123' },
        { topic_id: 'recFAIL1' },
        { topic_id: 'recSUCCESS1' }
      ])

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)
      
      expect(successful.length).toBeGreaterThan(0)
      expect(failed.length).toBeGreaterThan(0)
    })
  })

  describe('Data Validation and Integrity', () => {
    it('should validate topic data before processing', async () => {
      const invalidRecord = {
        ...mockAirtableRecord,
        fields: {
          ...mockAirtableRecord.fields,
          topic: '', // Empty topic
          status: 'draft' // Wrong status
        }
      }
      
      setupAirtableMock([invalidRecord])
      
      const result = await blogMaster.execute({
        topic_id: 'recABC123'
      })

      expect(result.success).toBe(false)
      expect(result.errors.some(error => 
        error.includes('approved') || error.includes('topic')
      )).toBe(true)
    })

    it('should maintain data consistency across operations', async () => {
      setupAirtableMock([mockAirtableRecord])
      
      let airtableUpdateCalled = false
      let postCreationCount = 0
      
      global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
        if (url.includes('airtable.com') && options?.method === 'PATCH') {
          airtableUpdateCalled = true
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockPublishedRecord)
          })
        }
        
        if (url.includes('wp-json/wp/v2/posts') && options?.method === 'POST') {
          postCreationCount++
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({
              id: 1000 + postCreationCount,
              status: 'publish'
            })
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            records: [mockAirtableRecord],
            id: Math.floor(Math.random() * 10000)
          })
        })
      })

      const result = await blogMaster.execute({
        topic_id: 'recABC123'
      })

      expect(result.success).toBe(true)
      expect(postCreationCount).toBe(2) // Hebrew + English posts
      expect(airtableUpdateCalled).toBe(true)
    })
  })
})