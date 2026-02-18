---
name: api-integration-master
description: >-
  Advanced API integration patterns for external services including authentication,
  error handling, rate limiting, and data transformation. Covers WordPress REST API,
  NotebookLM MCP, Kie.ai, Apify, and social media APIs. Use when building or debugging
  API integrations. Example: "Help me implement robust WordPress API integration."
---

# API Integration Master

## Critical Principles
- **Never Trust External Services** - Always expect failures
- **Authentication Expires** - Implement refresh mechanisms
- **Rate Limits Exist** - Respect API quotas
- **Data Formats Change** - Validate and transform responses
- **Network Fails** - Implement retry logic with exponential backoff

## Core Integration Patterns

### 1. Robust API Client Pattern
```javascript
class APIClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL
    this.timeout = options.timeout || 30000
    this.retries = options.retries || 3
    this.rateLimitDelay = options.rateLimitDelay || 1000
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      timeout: this.timeout,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...await this.getAuthHeaders(),
        ...options.headers
      }
    }

    return this.executeWithRetry(url, config)
  }

  async executeWithRetry(url, config, attempt = 1) {
    try {
      const response = await fetch(url, config)
      
      if (response.status === 401) {
        await this.refreshAuth()
        config.headers = { ...config.headers, ...await this.getAuthHeaders() }
        return fetch(url, config)
      }
      
      if (response.status === 429) {
        await this.delay(this.rateLimitDelay * attempt)
        if (attempt < this.retries) {
          return this.executeWithRetry(url, config, attempt + 1)
        }
      }
      
      if (!response.ok) {
        throw new APIError(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      if (attempt < this.retries && this.isRetryableError(error)) {
        await this.delay(1000 * Math.pow(2, attempt))
        return this.executeWithRetry(url, config, attempt + 1)
      }
      throw error
    }
  }

  isRetryableError(error) {
    return error.name === 'TypeError' || // Network errors
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT'
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 2. Authentication Management
```javascript
class AuthManager {
  constructor() {
    this.tokens = new Map()
    this.refreshPromises = new Map()
  }

  async getToken(service) {
    const token = this.tokens.get(service)
    if (!token || this.isExpiringSoon(token)) {
      return this.refreshToken(service)
    }
    return token.access_token
  }

  async refreshToken(service) {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromises.has(service)) {
      return this.refreshPromises.get(service)
    }

    const refreshPromise = this.performTokenRefresh(service)
    this.refreshPromises.set(service, refreshPromise)

    try {
      const newToken = await refreshPromise
      this.tokens.set(service, {
        ...newToken,
        expires_at: Date.now() + (newToken.expires_in * 1000)
      })
      return newToken.access_token
    } finally {
      this.refreshPromises.delete(service)
    }
  }

  isExpiringSoon(token, bufferMs = 300000) { // 5 minute buffer
    return Date.now() + bufferMs > token.expires_at
  }
}
```

### 3. Data Transformation Pipeline
```javascript
class DataTransformer {
  static transform(data, schema) {
    const result = {}
    
    for (const [key, config] of Object.entries(schema)) {
      try {
        result[key] = this.extractValue(data, config)
      } catch (error) {
        if (config.required) {
          throw new TransformationError(`Required field ${key} missing`)
        }
        result[key] = config.default
      }
    }
    
    return result
  }

  static extractValue(data, config) {
    const value = this.getNestedValue(data, config.path)
    
    if (config.transform) {
      return config.transform(value)
    }
    
    return value
  }

  static getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        throw new Error(`Path not found: ${path}`)
      }
      return current[key]
    }, obj)
  }
}

// Usage example:
const wordPressSchema = {
  id: { path: 'id', required: true },
  title: { 
    path: 'title.rendered', 
    required: true,
    transform: (html) => html.replace(/<[^>]*>/g, '') 
  },
  content: { 
    path: 'content.rendered', 
    required: true,
    transform: (html) => html.substring(0, 500) 
  },
  date: { 
    path: 'date', 
    transform: (dateStr) => new Date(dateStr) 
  }
}
```

## Service-Specific Integrations

### WordPress REST API
```javascript
class WordPressClient extends APIClient {
  constructor(siteURL, username, password) {
    super(`${siteURL}/wp-json/wp/v2`)
    this.credentials = Buffer.from(`${username}:${password}`).toString('base64')
  }

  async getAuthHeaders() {
    return {
      'Authorization': `Basic ${this.credentials}`
    }
  }

  async getPosts(options = {}) {
    const queryParams = new URLSearchParams({
      per_page: options.limit || 10,
      page: options.page || 1,
      ...options.filters
    })

    const response = await this.request(`/posts?${queryParams}`)
    const posts = await response.json()

    return posts.map(post => DataTransformer.transform(post, wordPressSchema))
  }

  async createPost(postData) {
    const response = await this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    })
    return response.json()
  }
}
```

### NotebookLM MCP Integration
```javascript
class NotebookLMClient {
  constructor() {
    this.notebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID
  }

  async queryNotebook(query, options = {}) {
    try {
      // Use MCP tool directly
      const result = await mcp_notebooklm_notebook_query({
        notebook_id: this.notebookId,
        query: query,
        timeout: options.timeout || 120,
        source_ids: options.sourceIds
      })

      if (!result.success) {
        throw new APIError(`NotebookLM query failed: ${result.error}`)
      }

      return {
        content: result.answer,
        sources: result.sources,
        conversation_id: result.conversation_id
      }
    } catch (error) {
      if (error.message.includes('authentication')) {
        throw new AuthenticationError('NotebookLM authentication expired')
      }
      throw error
    }
  }

  async generateContent(templateId, topicId) {
    const query = `Generate ${templateId} content about ${topicId || 'FBAR requirements'}`
    return this.queryNotebook(query)
  }
}
```

### Kie.ai Video Generation
```javascript
class KieClient extends APIClient {
  constructor() {
    super('https://api.kie.ai', {
      timeout: 60000 // Video generation takes longer
    })
    this.apiKey = process.env.KIE_API_KEY
  }

  async getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`
    }
  }

  async generateVideo(prompt, options = {}) {
    const response = await this.request('/v1/video/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        model: options.model || 'sora-2-pro',
        duration: options.duration || 30,
        quality: options.quality || 'high'
      })
    })

    const result = await response.json()
    return {
      taskId: result.task_id,
      status: 'processing'
    }
  }

  async checkTaskStatus(taskId) {
    const response = await this.request(`/v1/video/status/${taskId}`)
    return response.json()
  }

  async waitForCompletion(taskId, maxWaitMs = 300000) {
    const startTime = Date.now()
    const pollInterval = 10000 // 10 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkTaskStatus(taskId)
      
      if (status.status === 'success') {
        return status
      }
      
      if (status.status === 'failed') {
        throw new APIError(`Video generation failed: ${status.error}`)
      }
      
      await this.delay(pollInterval)
    }
    
    throw new TimeoutError('Video generation timed out')
  }
}
```

## Error Handling Strategies

### Error Classification
```javascript
class APIError extends Error {
  constructor(message, code, retryable = false) {
    super(message)
    this.name = 'APIError'
    this.code = code
    this.retryable = retryable
  }
}

class AuthenticationError extends APIError {
  constructor(message) {
    super(message, 'AUTH_FAILED', false)
    this.name = 'AuthenticationError'
  }
}

class RateLimitError extends APIError {
  constructor(message, retryAfter = null) {
    super(message, 'RATE_LIMITED', true)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

class TimeoutError extends APIError {
  constructor(message) {
    super(message, 'TIMEOUT', true)
    this.name = 'TimeoutError'
  }
}
```

### Circuit Breaker Pattern
```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5
    this.recoveryTimeout = options.recoveryTimeout || 60000
    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0
    this.lastFailureTime = null
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
}
```

## Rate Limiting and Caching

### Rate Limiter
```javascript
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
    this.requests = []
  }

  async checkLimit() {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.timeWindow - (now - oldestRequest)
      await this.delay(waitTime)
    }
    
    this.requests.push(now)
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### Response Caching
```javascript
class ResponseCache {
  constructor(ttlMs = 300000) { // 5 minutes default
    this.cache = new Map()
    this.ttl = ttlMs
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }

  generateKey(endpoint, params) {
    return `${endpoint}:${JSON.stringify(params)}`
  }
}
```

## Integration Testing

### Comprehensive Test Suite
```javascript
class IntegrationTester {
  async testWordPress() {
    const client = new WordPressClient(
      process.env.WORDPRESS_URL,
      process.env.WORDPRESS_USERNAME,
      process.env.WORDPRESS_PASSWORD
    )

    try {
      const posts = await client.getPosts({ limit: 1 })
      console.assert(posts.length > 0, 'WordPress: No posts returned')
      console.assert(posts[0].title, 'WordPress: Post title missing')
      console.assert(!posts[0].title.includes('placeholder'), 'WordPress: Placeholder content detected')
      return { service: 'WordPress', status: 'success', posts: posts.length }
    } catch (error) {
      return { service: 'WordPress', status: 'failed', error: error.message }
    }
  }

  async testNotebookLM() {
    const client = new NotebookLMClient()
    
    try {
      const result = await client.queryNotebook('What are FBAR requirements?')
      console.assert(result.content.length > 50, 'NotebookLM: Response too short')
      console.assert(!result.content.includes('placeholder'), 'NotebookLM: Placeholder content')
      return { service: 'NotebookLM', status: 'success', length: result.content.length }
    } catch (error) {
      return { service: 'NotebookLM', status: 'failed', error: error.message }
    }
  }

  async testAllIntegrations() {
    const results = await Promise.all([
      this.testWordPress(),
      this.testNotebookLM(),
      // Add other service tests
    ])
    
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    }
    
    console.log(`Integration Test Summary: ${summary.passed}/${summary.total} passed`)
    return summary
  }
}
```

## Best Practices Checklist

### Before Implementation
- [ ] API documentation reviewed and understood
- [ ] Rate limits and quotas identified
- [ ] Authentication method chosen and implemented
- [ ] Error scenarios mapped and handled
- [ ] Data transformation requirements defined

### During Development
- [ ] Timeout values set appropriately
- [ ] Retry logic implemented with exponential backoff
- [ ] Authentication refresh mechanism included
- [ ] Response validation and transformation implemented
- [ ] Comprehensive error handling added

### Before Deployment
- [ ] All integration tests passing
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Monitoring and alerting configured
- [ ] Documentation updated

This skill provides battle-tested patterns for reliable API integrations that handle real-world failures gracefully.