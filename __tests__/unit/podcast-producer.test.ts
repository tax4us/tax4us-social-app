import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { podcastProducer } from '@/lib/services/podcast-producer'
import { setupElevenLabsMock, resetMocks } from '../mocks/elevenlabs.mock'
import { mockContentPiece, createMockContent } from '../mocks/content.mock'

describe('PodcastProducer', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetMocks()
    
    // Mock environment variables
    process.env.ELEVENLABS_API_KEY = 'test-api-key'
    process.env.ELEVENLABS_VOICE_EMMA = '3dzJXoCYueSQiptQ6euE'
    process.env.ELEVENLABS_VOICE_BEN = '9FevED7AoujYF2nBsEvC'
    process.env.CAPTIVATE_API_KEY = 'test-captivate-key'
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
      expect(result.elevenlabs.message).toContain('ElevenLabs connection failed')
    })

    it('should handle missing API keys', async () => {
      delete process.env.ELEVENLABS_API_KEY
      delete process.env.CAPTIVATE_API_KEY
      
      const result = await podcastProducer.testConnections()
      
      expect(result.elevenlabs.success).toBe(false)
      expect(result.elevenlabs.message).toContain('API key not configured')
      expect(result.captivate.success).toBe(false)
      expect(result.captivate.message).toContain('API key not configured')
    })
  })

  describe('createPodcastEpisode', () => {
    beforeEach(() => {
      setupElevenLabsMock(true)
    })

    it('should create a podcast episode from content piece', async () => {
      const content = createMockContent()
      
      const result = await podcastProducer.createPodcastEpisode(content)
      
      expect(result).toMatchObject({
        id: expect.stringMatching(/^ep_/),
        title: expect.stringContaining('Tax4Us'),
        description: expect.stringContaining('Remote Work Taxation'),
        status: 'published'
      })
      expect(result.audioUrl).toBeTruthy()
      expect(result.publishDate).toBeTruthy()
    })

    it('should handle Hebrew content properly', async () => {
      const hebrewContent = createMockContent({
        title_hebrew: "מס על עבודה מרחוק",
        title_english: "Remote Work Tax"
      })
      
      const result = await podcastProducer.createPodcastEpisode(hebrewContent)
      
      expect(result.title).toContain('Tax4Us')
      expect(result.description).toContain('מס על עבודה מרחוק')
    })

    it('should include target keywords in episode description', async () => {
      const contentWithKeywords = createMockContent({
        target_keywords: ["FBAR", "dual citizenship", "remote work"]
      })
      
      const result = await podcastProducer.createPodcastEpisode(contentWithKeywords)
      
      expect(result.description).toContain('FBAR')
      expect(result.description).toContain('dual citizenship')
      expect(result.description).toContain('remote work')
    })

    it('should handle missing content gracefully', async () => {
      const emptyContent = createMockContent({
        title_hebrew: "",
        title_english: "",
        target_keywords: []
      })
      
      const result = await podcastProducer.createPodcastEpisode(emptyContent)
      
      expect(result.title).toContain('Tax4Us Weekly Episode')
      expect(result.description).toBeTruthy()
    })
  })

  describe('generatePodcastScript', () => {
    it('should generate a comprehensive podcast script', () => {
      const content = createMockContent()
      
      const script = (podcastProducer as any).generatePodcastScript(content)
      
      expect(script).toContain('EMMA:')
      expect(script).toContain('BEN:')
      expect(script).toContain('Welcome to Tax4Us Weekly')
      expect(script).toContain('Remote Work Taxation')
      expect(script).toContain('FBAR')
    })

    it('should include Hebrew content references', () => {
      const hebrewContent = createMockContent({
        title_hebrew: "מס על עבודה מרחוק"
      })
      
      const script = (podcastProducer as any).generatePodcastScript(hebrewContent)
      
      expect(script).toContain('Israeli-American')
      expect(script).toContain('Hebrew')
    })

    it('should handle multiple keywords', () => {
      const keywordContent = createMockContent({
        target_keywords: ["FBAR", "Form 8938", "dual citizenship", "tax treaty"]
      })
      
      const script = (podcastProducer as any).generatePodcastScript(keywordContent)
      
      expect(script).toContain('FBAR')
      expect(script).toContain('Form 8938')
      expect(script).toContain('dual citizenship')
      expect(script).toContain('tax treaty')
    })
  })

  describe('generateTTSAudio', () => {
    beforeEach(() => {
      setupElevenLabsMock(true)
    })

    it('should generate audio using Emma voice', async () => {
      const text = "Welcome to Tax4Us Weekly"
      
      const audioBuffer = await (podcastProducer as any).generateTTSAudio(text, 'emma')
      
      expect(audioBuffer).toBeInstanceOf(Buffer)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('3dzJXoCYueSQiptQ6euE'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'xi-api-key': 'test-api-key'
          })
        })
      )
    })

    it('should generate audio using Ben voice', async () => {
      const text = "Thanks for having me, Emma"
      
      const audioBuffer = await (podcastProducer as any).generateTTSAudio(text, 'ben')
      
      expect(audioBuffer).toBeInstanceOf(Buffer)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('9FevED7AoujYF2nBsEvC'),
        expect.any(Object)
      )
    })

    it('should handle TTS API errors', async () => {
      setupElevenLabsMock(false)
      
      await expect(
        (podcastProducer as any).generateTTSAudio("test text", 'emma')
      ).rejects.toThrow('ElevenLabs API error')
    })

    it('should validate voice parameters', async () => {
      await expect(
        (podcastProducer as any).generateTTSAudio("test text", 'invalid')
      ).rejects.toThrow('Invalid voice')
    })
  })

  describe('createEpisodeDescription', () => {
    it('should create a properly formatted episode description', () => {
      const content = createMockContent()
      
      const description = (podcastProducer as any).createEpisodeDescription(content)
      
      expect(description).toContain(content.title_english)
      expect(description).toContain('נושאים שנכוסו בפרק:')
      expect(description).toContain('remote work')
      expect(description).toContain('taxation')
      expect(description).toContain('https://tax4us.co.il')
      expect(description).toContain('#מסארהב')
    })

    it('should handle empty keywords gracefully', () => {
      const contentWithoutKeywords = createMockContent({
        target_keywords: []
      })
      
      const description = (podcastProducer as any).createEpisodeDescription(contentWithoutKeywords)
      
      expect(description).toContain('Tax4Us Weekly')
      expect(description).not.toContain('undefined')
    })

    it('should limit keywords to reasonable length', () => {
      const contentWithManyKeywords = createMockContent({
        target_keywords: Array.from({length: 20}, (_, i) => `keyword${i}`)
      })
      
      const description = (podcastProducer as any).createEpisodeDescription(contentWithManyKeywords)
      
      // Should not be excessively long
      expect(description.length).toBeLessThan(2000)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )
      
      const result = await podcastProducer.testConnections()
      
      expect(result.elevenlabs.success).toBe(false)
      expect(result.elevenlabs.message).toContain('timeout')
    })

    it('should validate content before processing', async () => {
      const invalidContent = null as any
      
      await expect(
        podcastProducer.createPodcastEpisode(invalidContent)
      ).rejects.toThrow('Invalid content')
    })

    it('should handle malformed API responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve('not a buffer'),
        headers: new Map()
      })
      
      await expect(
        (podcastProducer as any).generateTTSAudio("test", 'emma')
      ).rejects.toThrow()
    })
  })

  describe('Performance and Rate Limiting', () => {
    it('should respect rate limits', async () => {
      setupElevenLabsMock(true)
      
      const startTime = Date.now()
      const content = createMockContent()
      
      // Create multiple episodes in quick succession
      const promises = Array.from({length: 3}, () => 
        podcastProducer.createPodcastEpisode(content)
      )
      
      await Promise.all(promises)
      const endTime = Date.now()
      
      // Should take some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(100)
    })

    it('should handle concurrent requests properly', async () => {
      setupElevenLabsMock(true)
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