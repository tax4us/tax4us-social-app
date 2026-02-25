import { describe, it, expect } from '@jest/globals'

describe('Basic Test Setup', () => {
  it('should run basic arithmetic test', () => {
    expect(2 + 2).toBe(4)
  })

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test')
    expect(result).toBe('test')
  })

  it('should have access to environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})