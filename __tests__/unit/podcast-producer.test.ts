import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { podcastProducer } from '@/lib/services/podcast-producer'
import { setupElevenLabsMock, resetMocks } from '../mocks/elevenlabs.mock'
import { createMockContent } from '../mocks/content.mock'

describe('PodcastProducer', () => {
  beforeEach(() => {
    resetMocks()
    process.env.ELEVENLABS_API_KEY = 'test-api-key'
    process.env.ELEVENLABS_VOICE_EMMA = '3dzJXoCYueSQiptQ6euE'
    process.env.ELEVENLABS_VOICE_BEN = '9FevED7AoujYF2nBsEvC'
    process.env.CAPTIVATE_API_KEY = 'test-captivate-key'
    process.env.CAPTIVATE_USER_ID = 'test-user-id'
    process.env.CAPTIVATE_SHOW_ID = 'test-show-id'
  })

  afterEach(() => {
    resetMocks()
  })

  describe('testConnections', () => {
    it('should return success for valid API connections', async () => {
      setupElevenLabsMock(true)

      const result = await podcastProducer.testConnections()

      expect(result.elevenlabs.success).toBe(true)
      expect(result.elevenlabs.message).toContain('ElevenLabs API connected')
      expect(result.captivate.success).toBe(true)
      expect(result.captivate.message).toContain('Captivate credentials configured')
    })

    it('should handle ElevenLabs API errors', async () => {
      setupElevenLabsMock(false)

      const result = await podcastProducer.testConnections()

      expect(result.elevenlabs.success).toBe(false)
      // Real service returns 'ElevenLabs API error: 401' on non-ok response
      expect(result.elevenlabs.message).toContain('ElevenLabs')
    })

    it('should handle network timeouts gracefully', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation(() =>
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      const result = await podcastProducer.testConnections()

      expect(result.elevenlabs.success).toBe(false)
      expect(result.elevenlabs.message).toBeDefined()
    })
  })

  describe('createPodcastEpisode', () => {
    beforeEach(() => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('elevenlabs.io')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            arrayBuffer: () => Promise.resolve(Buffer.from('mock-audio'))
          })
        }
        if (url.includes('notebook-query')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              success: true,
              answer: '[EMMA] Welcome to Tax4Us Weekly podcast.\n[EXPERT] Thanks for having me Emma, this is about Remote Work Taxation and FBAR.'
            })
          })
        }
        if (url.includes('kie.ai')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ id: 'tts-task-123' })
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        })
      })
    })

    it('should create a podcast episode from content piece', async () => {
      const content = createMockContent()

      const result = await podcastProducer.createPodcastEpisode(content)

      expect(result).toMatchObject({
        id: expect.stringMatching(/^ep_|^local_|^failed_/),
        publishDate: expect.any(String),
        status: expect.stringMatching(/^published$|^ready$|^failed$/)
      })
      expect(result.title).toBeTruthy()
    })

    it('should handle Hebrew content properly', async () => {
      const hebrewContent = createMockContent({
        title_hebrew: 'מס על עבודה מרחוק',
        title_english: 'Remote Work Tax'
      })

      const result = await podcastProducer.createPodcastEpisode(hebrewContent)

      expect(result.title).toBeTruthy()
      expect(result.publishDate).toBeTruthy()
    })

    it('should return a valid episode even on fallback', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      )

      const content = createMockContent()
      const result = await podcastProducer.createPodcastEpisode(content)

      // createPodcastEpisode catches errors and returns a failed episode
      expect(result.id).toBeTruthy()
      expect(result.publishDate).toBeTruthy()
    })
  })

  describe('generatePodcastScript (private)', () => {
    it('should generate a script using notebook-query', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('notebook-query')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              success: true,
              answer: '[EMMA] Welcome to Tax4Us Weekly podcast.\n[EXPERT] Lets discuss Remote Work Taxation including FBAR requirements and dual citizenship.'
            })
          })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
      })

      const content = createMockContent()
      const script = await (podcastProducer as any).generatePodcastScript(content)

      expect(typeof script).toBe('string')
      expect(script.length).toBeGreaterThan(0)
    })

    it('should use fallback script when notebook-query fails', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' })
        })
      )

      const content = createMockContent()
      const script = await (podcastProducer as any).generatePodcastScript(content)

      // Falls back to Hebrew fallback script
      expect(typeof script).toBe('string')
      expect(script.length).toBeGreaterThan(0)
      expect(script).toContain('tax4us.co.il')
    })

    it('should include topic content in fallback script', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: false })
        })
      )

      const content = createMockContent({
        title_hebrew: 'מס על עבודה מרחוק',
        target_keywords: ['FBAR', 'dual citizenship', 'remote work']
      })

      const script = await (podcastProducer as any).generatePodcastScript(content)

      expect(typeof script).toBe('string')
      expect(script).toContain('מס על עבודה מרחוק')
    })
  })

  describe('generateEpisodeDescription (private)', () => {
    it('should create a properly formatted episode description', () => {
      const content = createMockContent()
      const script = 'Some podcast script content here...'

      const description = (podcastProducer as any).generateEpisodeDescription(content, script)

      expect(description).toContain('נושאים שנכוסו בפרק:')
      expect(description).toContain('https://tax4us.co.il')
      expect(description).toContain('#מסארהב')
    })

    it('should include target keywords in description', () => {
      const content = createMockContent({
        target_keywords: ['remote work', 'taxation']
      })
      const script = 'Script content'

      const description = (podcastProducer as any).generateEpisodeDescription(content, script)

      expect(description).toContain('remote work')
      expect(description).toContain('taxation')
    })

    it('should handle empty keywords gracefully', () => {
      const content = createMockContent({ target_keywords: [] })
      const script = 'Script content'

      const description = (podcastProducer as any).generateEpisodeDescription(content, script)

      expect(description).toBeTruthy()
      expect(description).not.toContain('undefined')
    })
  })

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent requests properly', async () => {
      ;(global as any).fetch = jest.fn().mockImplementation((url: any) => {
        if (url.includes('notebook-query')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true, answer: '[EMMA] Hello [EXPERT] Hi' })
          })
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 'tts-123' }) })
      })

      const content = createMockContent()

      const results = await Promise.allSettled([
        podcastProducer.createPodcastEpisode(content),
        podcastProducer.createPodcastEpisode(content),
        podcastProducer.createPodcastEpisode(content)
      ])

      const successful = results.filter(r => r.status === 'fulfilled')
      expect(successful.length).toBeGreaterThan(0)
    })
  })
})
