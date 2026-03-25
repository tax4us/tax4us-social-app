/**
 * LinkedIn OAuth Service with Refresh Token Support
 * Handles long-lived LinkedIn authentication with automatic token refresh
 */

import fs from 'fs/promises'
import path from 'path'

export interface LinkedInTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_token_expires_in: number
  scope: string
  token_type: string
  obtained_at: string
}

export interface LinkedInAuthConfig {
  client_id: string
  client_secret: string
  redirect_uri: string
  scope: string
}

class LinkedInOAuthService {
  private readonly config: LinkedInAuthConfig
  private tokens: LinkedInTokens | null = null
  private readonly envPath: string

  constructor() {
    this.config = {
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://172.245.56.50:8081/linkedin-callback',
      // Basic scopes that work with the current LinkedIn app (refresh tokens may not be available)
      scope: 'profile email w_member_social'
    }
    this.envPath = path.join(process.cwd(), '.env.local')
  }

  /**
   * Generate LinkedIn authorization URL with refresh token scope
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.client_id,
      redirect_uri: this.config.redirect_uri,
      scope: this.config.scope,
      // Request offline access for refresh tokens
      access_type: 'offline'
    })

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(authCode: string): Promise<LinkedInTokens> {
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
      
      // LinkedIn may not return refresh_token with current app setup
      const tokens: LinkedInTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        expires_in: tokenData.expires_in || 3600,
        refresh_token_expires_in: tokenData.refresh_token_expires_in || 0, // May not be available
        scope: tokenData.scope || this.config.scope,
        token_type: tokenData.token_type || 'Bearer',
        obtained_at: new Date().toISOString()
      }

      // Store tokens securely
      await this.storeTokens(tokens)
      this.tokens = tokens

      return tokens

    } catch (error) {
      console.error('LinkedIn token exchange failed:', error)
      throw error
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<LinkedInTokens> {
    try {
      if (!this.tokens?.refresh_token) {
        throw new Error('No refresh token available. Re-authorization required.')
      }

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

      // Update tokens with new access token (refresh token may or may not be renewed)
      const refreshedTokens: LinkedInTokens = {
        ...this.tokens,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || this.tokens.refresh_token,
        expires_in: tokenData.expires_in || 3600,
        obtained_at: new Date().toISOString()
      }

      await this.storeTokens(refreshedTokens)
      this.tokens = refreshedTokens

      console.log('✅ LinkedIn access token refreshed successfully')
      return refreshedTokens

    } catch (error) {
      console.error('LinkedIn token refresh failed:', error)
      throw error
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string> {
    try {
      // Load tokens if not in memory
      if (!this.tokens) {
        await this.loadTokens()
      }

      if (!this.tokens) {
        throw new Error('No LinkedIn tokens available. Authorization required.')
      }

      // Check if access token is expired (with 5-minute buffer)
      const obtainedAt = new Date(this.tokens.obtained_at)
      const expiresAt = new Date(obtainedAt.getTime() + (this.tokens.expires_in * 1000))
      const now = new Date()
      const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds

      if (now.getTime() >= (expiresAt.getTime() - bufferTime)) {
        console.log('LinkedIn access token expired, refreshing...')
        await this.refreshAccessToken()
      }

      return this.tokens!.access_token

    } catch (error) {
      console.error('Failed to get valid LinkedIn access token:', error)
      throw error
    }
  }

  /**
   * Store tokens securely in .env.local
   */
  private async storeTokens(tokens: LinkedInTokens): Promise<void> {
    try {
      // Read current .env.local content
      let envContent = ''
      try {
        envContent = await fs.readFile(this.envPath, 'utf-8')
      } catch (error) {
        // File doesn't exist, will be created
        console.log('.env.local not found, will create new file')
      }

      // Parse existing environment variables
      const envLines = envContent.split('\n')
      const envVars = new Map<string, string>()
      
      for (const line of envLines) {
        const trimmedLine = line.trim()
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const equalIndex = trimmedLine.indexOf('=')
          if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex)
            const value = trimmedLine.substring(equalIndex + 1)
            envVars.set(key, value)
          }
        } else if (trimmedLine) {
          // Preserve comments and empty lines
          envVars.set(`__comment_${Math.random()}`, trimmedLine)
        }
      }

      // Update LinkedIn token variables
      envVars.set('LINKEDIN_ACCESS_TOKEN', tokens.access_token)
      envVars.set('LINKEDIN_REFRESH_TOKEN', tokens.refresh_token)
      envVars.set('LINKEDIN_TOKEN_EXPIRES_AT', new Date(Date.now() + (tokens.expires_in * 1000)).toISOString())
      envVars.set('LINKEDIN_REFRESH_TOKEN_EXPIRES_AT', new Date(Date.now() + (tokens.refresh_token_expires_in * 1000)).toISOString())
      envVars.set('LINKEDIN_TOKEN_SCOPE', tokens.scope)

      // Reconstruct .env.local content
      const newEnvLines: string[] = []
      for (const [key, value] of envVars.entries()) {
        if (key.startsWith('__comment_')) {
          newEnvLines.push(value)
        } else {
          newEnvLines.push(`${key}=${value}`)
        }
      }

      await fs.writeFile(this.envPath, newEnvLines.join('\n') + '\n', 'utf-8')
      console.log('✅ LinkedIn tokens stored securely in .env.local')

    } catch (error) {
      console.error('Failed to store LinkedIn tokens:', error)
      throw error
    }
  }

  /**
   * Load tokens from .env.local
   */
  private async loadTokens(): Promise<void> {
    try {
      const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
      const refreshToken = process.env.LINKEDIN_REFRESH_TOKEN
      const expiresAt = process.env.LINKEDIN_TOKEN_EXPIRES_AT
      const refreshExpiresAt = process.env.LINKEDIN_REFRESH_TOKEN_EXPIRES_AT
      const scope = process.env.LINKEDIN_TOKEN_SCOPE

      if (!accessToken || !refreshToken || !expiresAt) {
        console.log('No LinkedIn tokens found in environment')
        return
      }

      const expiresAtDate = new Date(expiresAt)
      const obtainedAtDate = new Date(expiresAtDate.getTime() - (3600 * 1000)) // Assume 1-hour expiry
      
      this.tokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        refresh_token_expires_in: refreshExpiresAt ? 
          Math.floor((new Date(refreshExpiresAt).getTime() - Date.now()) / 1000) : 
          5184000,
        scope: scope || this.config.scope,
        token_type: 'Bearer',
        obtained_at: obtainedAtDate.toISOString()
      }

      console.log('✅ LinkedIn tokens loaded from environment')

    } catch (error) {
      console.error('Failed to load LinkedIn tokens:', error)
    }
  }

  /**
   * Check if tokens are valid and not expired
   */
  async isTokenValid(): Promise<boolean> {
    try {
      if (!this.tokens) {
        await this.loadTokens()
      }

      if (!this.tokens) {
        return false
      }

      // Check if refresh token is expired
      if (this.tokens.refresh_token_expires_in) {
        const obtainedAt = new Date(this.tokens.obtained_at)
        const refreshExpiresAt = new Date(obtainedAt.getTime() + (this.tokens.refresh_token_expires_in * 1000))
        if (new Date() >= refreshExpiresAt) {
          console.log('LinkedIn refresh token expired')
          return false
        }
      }

      // Test API access
      const accessToken = await this.getValidAccessToken()
      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      return response.ok

    } catch (error) {
      console.error('LinkedIn token validation failed:', error)
      return false
    }
  }

  /**
   * Clear stored tokens
   */
  async clearTokens(): Promise<void> {
    this.tokens = null
    
    try {
      const envContent = await fs.readFile(this.envPath, 'utf-8')
      const envLines = envContent.split('\n')
      
      const filteredLines = envLines.filter(line => 
        !line.startsWith('LINKEDIN_ACCESS_TOKEN=') &&
        !line.startsWith('LINKEDIN_REFRESH_TOKEN=') &&
        !line.startsWith('LINKEDIN_TOKEN_EXPIRES_AT=') &&
        !line.startsWith('LINKEDIN_REFRESH_TOKEN_EXPIRES_AT=') &&
        !line.startsWith('LINKEDIN_TOKEN_SCOPE=')
      )

      await fs.writeFile(this.envPath, filteredLines.join('\n'), 'utf-8')
      console.log('✅ LinkedIn tokens cleared from .env.local')

    } catch (error) {
      console.error('Failed to clear LinkedIn tokens:', error)
    }
  }

  /**
   * Get token status and expiration info
   */
  async getTokenStatus(): Promise<{
    hasTokens: boolean
    accessTokenExpiry?: string
    refreshTokenExpiry?: string
    scope?: string
    isValid: boolean
  }> {
    try {
      if (!this.tokens) {
        await this.loadTokens()
      }

      if (!this.tokens) {
        return { hasTokens: false, isValid: false }
      }

      const obtainedAt = new Date(this.tokens.obtained_at)
      const accessExpiry = new Date(obtainedAt.getTime() + (this.tokens.expires_in * 1000))
      const refreshExpiry = new Date(obtainedAt.getTime() + (this.tokens.refresh_token_expires_in * 1000))
      
      return {
        hasTokens: true,
        accessTokenExpiry: accessExpiry.toISOString(),
        refreshTokenExpiry: refreshExpiry.toISOString(),
        scope: this.tokens.scope,
        isValid: await this.isTokenValid()
      }

    } catch (error) {
      console.error('Failed to get token status:', error)
      return { hasTokens: false, isValid: false }
    }
  }
}

export const linkedInOAuth = new LinkedInOAuthService()