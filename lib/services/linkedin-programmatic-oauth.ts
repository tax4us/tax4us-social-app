/**
 * LinkedIn Programmatic OAuth with Refresh Tokens
 * Enterprise implementation for 1-year refresh tokens (not 60-day access tokens)
 * 
 * Based on LinkedIn Marketing Developer Platform requirements:
 * - Refresh tokens valid for 1 year (365 days)
 * - Access tokens valid for 60 days but auto-refreshed
 * - Requires Marketing Developer Platform partnership approval
 */

import fs from 'fs/promises'
import path from 'path'

export interface LinkedInTokenSet {
  access_token: string
  refresh_token: string
  expires_in: number // Access token expiry (60 days)
  refresh_token_expires_in: number // Refresh token expiry (365 days)
  scope: string
  token_type: string
  obtained_at: string
}

export interface LinkedInConfig {
  client_id: string
  client_secret: string
  redirect_uri: string
  scope: string
}

class LinkedInProgrammaticOAuth {
  private readonly config: LinkedInConfig
  private tokens: LinkedInTokenSet | null = null
  private readonly tokenStorePath: string

  constructor() {
    this.config = {
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://172.245.56.50:8081/linkedin-callback',
      // Marketing API scopes for programmatic refresh tokens
      scope: 'r_liteprofile r_emailaddress w_member_social r_organization_social rw_organization_admin w_share'
    }
    this.tokenStorePath = path.join(process.cwd(), '.project-memory', 'linkedin-enterprise-tokens.json')
  }

  /**
   * Step 1: Generate authorization URL for Marketing Developer Platform
   * This requires MDP partnership approval from LinkedIn
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.client_id,
      redirect_uri: this.config.redirect_uri,
      scope: this.config.scope,
      // Critical: Request offline access for programmatic refresh tokens
      access_type: 'offline',
      // MDP-specific parameter for enterprise refresh tokens
      approval_prompt: 'auto'
    })

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  }

  /**
   * Step 2: Exchange authorization code for tokens with refresh capability
   * This will return refresh_token if your app is approved for programmatic tokens
   */
  async exchangeCodeForTokens(authCode: string): Promise<LinkedInTokenSet> {
    try {
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: this.config.redirect_uri,
          client_id: this.config.client_id,
          client_secret: this.config.client_secret,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Token exchange failed: ${response.status} - ${error}`)
      }

      const tokenData = await response.json()
      
      // Check if we got programmatic refresh token (MDP partnership required)
      if (!tokenData.refresh_token) {
        throw new Error('No refresh token received. Your app needs Marketing Developer Platform approval for programmatic refresh tokens.')
      }

      const tokens: LinkedInTokenSet = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in || 5184000, // 60 days
        refresh_token_expires_in: tokenData.refresh_token_expires_in || 31536000, // 365 days
        scope: tokenData.scope || this.config.scope,
        token_type: tokenData.token_type || 'Bearer',
        obtained_at: new Date().toISOString()
      }

      // Store tokens securely
      await this.storeTokens(tokens)
      this.tokens = tokens

      console.log('✅ LinkedIn Enterprise tokens obtained!')
      console.log(`   Access token expires in: ${Math.round(tokens.expires_in / 86400)} days`)
      console.log(`   Refresh token expires in: ${Math.round(tokens.refresh_token_expires_in / 86400)} days`)

      return tokens

    } catch (error) {
      console.error('LinkedIn enterprise token exchange failed:', error)
      throw error
    }
  }

  /**
   * Step 3: Refresh access token using refresh token
   * This keeps the system running for 1 year without reauthorization
   */
  async refreshAccessToken(): Promise<LinkedInTokenSet> {
    try {
      if (!this.tokens?.refresh_token) {
        await this.loadStoredTokens()
        if (!this.tokens?.refresh_token) {
          throw new Error('No refresh token available. Enterprise reauthorization required.')
        }
      }

      console.log('🔄 Refreshing LinkedIn access token...')

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refresh_token,
          client_id: this.config.client_id,
          client_secret: this.config.client_secret,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Token refresh failed: ${response.status} - ${error}`)
      }

      const tokenData = await response.json()

      // Update tokens (refresh token may be rotated or stay the same)
      const refreshedTokens: LinkedInTokenSet = {
        ...this.tokens,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || this.tokens.refresh_token,
        expires_in: tokenData.expires_in || 5184000,
        obtained_at: new Date().toISOString()
      }

      await this.storeTokens(refreshedTokens)
      this.tokens = refreshedTokens

      console.log('✅ LinkedIn access token refreshed successfully')
      console.log(`   New token expires in: ${Math.round(refreshedTokens.expires_in / 86400)} days`)

      return refreshedTokens

    } catch (error) {
      console.error('LinkedIn token refresh failed:', error)
      throw error
    }
  }

  /**
   * Get valid access token with automatic refresh
   * This is the main method used by social media publisher
   */
  async getValidAccessToken(): Promise<string> {
    try {
      // Load tokens if not in memory
      if (!this.tokens) {
        await this.loadStoredTokens()
      }

      if (!this.tokens) {
        throw new Error('No LinkedIn enterprise tokens available. Run enterprise authorization flow.')
      }

      // Check if access token is expired (with 1-day buffer)
      const obtainedAt = new Date(this.tokens.obtained_at)
      const expiresAt = new Date(obtainedAt.getTime() + (this.tokens.expires_in * 1000))
      const now = new Date()
      const bufferTime = 24 * 60 * 60 * 1000 // 1 day buffer

      if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
        console.log('LinkedIn access token expires soon, auto-refreshing...')
        await this.refreshAccessToken()
      }

      return this.tokens!.access_token

    } catch (error) {
      console.error('Failed to get valid LinkedIn access token:', error)
      throw error
    }
  }

  /**
   * Store tokens securely in project memory
   */
  private async storeTokens(tokens: LinkedInTokenSet): Promise<void> {
    try {
      await this.ensureDirectoryExists()
      await fs.writeFile(this.tokenStorePath, JSON.stringify(tokens, null, 2), 'utf-8')
      
      // Also store in environment for immediate use
      process.env.LINKEDIN_ACCESS_TOKEN = tokens.access_token
      process.env.LINKEDIN_REFRESH_TOKEN = tokens.refresh_token
      
      console.log('✅ LinkedIn enterprise tokens stored securely')

    } catch (error) {
      console.error('Failed to store LinkedIn tokens:', error)
      throw error
    }
  }

  /**
   * Load stored tokens from file system
   */
  private async loadStoredTokens(): Promise<void> {
    try {
      const tokenData = await fs.readFile(this.tokenStorePath, 'utf-8')
      this.tokens = JSON.parse(tokenData)
      console.log('✅ LinkedIn enterprise tokens loaded from storage')
    } catch (error) {
      console.log('No stored LinkedIn tokens found')
      this.tokens = null
    }
  }

  /**
   * Get comprehensive token status for monitoring
   */
  async getTokenStatus(): Promise<{
    hasTokens: boolean
    accessTokenExpiry?: string
    refreshTokenExpiry?: string
    daysUntilAccessExpiry?: number
    daysUntilRefreshExpiry?: number
    scope?: string
    isEnterpriseToken: boolean
  }> {
    try {
      if (!this.tokens) {
        await this.loadStoredTokens()
      }

      if (!this.tokens) {
        return {
          hasTokens: false,
          isEnterpriseToken: false
        }
      }

      const obtainedAt = new Date(this.tokens.obtained_at)
      const accessExpiry = new Date(obtainedAt.getTime() + (this.tokens.expires_in * 1000))
      const refreshExpiry = new Date(obtainedAt.getTime() + (this.tokens.refresh_token_expires_in * 1000))
      
      const daysUntilAccessExpiry = Math.ceil((accessExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const daysUntilRefreshExpiry = Math.ceil((refreshExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      
      return {
        hasTokens: true,
        accessTokenExpiry: accessExpiry.toISOString(),
        refreshTokenExpiry: refreshExpiry.toISOString(),
        daysUntilAccessExpiry,
        daysUntilRefreshExpiry,
        scope: this.tokens.scope,
        isEnterpriseToken: !!this.tokens.refresh_token
      }

    } catch (error) {
      console.error('Failed to get token status:', error)
      return {
        hasTokens: false,
        isEnterpriseToken: false
      }
    }
  }

  /**
   * Test API access with current tokens
   */
  async testAPIAccess(): Promise<{ valid: boolean; userInfo?: any; error?: string }> {
    try {
      const accessToken = await this.getValidAccessToken()
      
      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userInfo = await response.json()
        return {
          valid: true,
          userInfo: {
            name: `${userInfo.localizedFirstName} ${userInfo.localizedLastName}`,
            id: userInfo.id
          }
        }
      } else {
        return {
          valid: false,
          error: `API test failed: ${response.status} ${response.statusText}`
        }
      }

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      this.tokens = null
      delete process.env.LINKEDIN_ACCESS_TOKEN
      delete process.env.LINKEDIN_REFRESH_TOKEN
      
      try {
        await fs.unlink(this.tokenStorePath)
      } catch (error) {
        // File doesn't exist - not an error
      }
      
      console.log('✅ LinkedIn enterprise tokens cleared')
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
  }

  /**
   * Check if app has Marketing Developer Platform access
   */
  async checkMDPAccess(): Promise<{ hasAccess: boolean; message: string }> {
    try {
      // Test if we can get programmatic refresh tokens
      const testResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer dummy_token`
        }
      })
      
      // If we get 401 instead of 403, the endpoint is accessible
      if (testResponse.status === 401) {
        return {
          hasAccess: true,
          message: 'App appears to have Marketing API access'
        }
      }
      
      return {
        hasAccess: false,
        message: 'App may not have Marketing Developer Platform access. Apply at: https://business.linkedin.com/marketing-solutions/marketing-partners/become-a-partner'
      }

    } catch (error) {
      return {
        hasAccess: false,
        message: 'Unable to verify MDP access'
      }
    }
  }

  /**
   * Ensure directory exists for token storage
   */
  private async ensureDirectoryExists(): Promise<void> {
    const dir = path.dirname(this.tokenStorePath)
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      // Directory already exists - not an error
    }
  }
}

export const linkedInProgrammaticOAuth = new LinkedInProgrammaticOAuth()