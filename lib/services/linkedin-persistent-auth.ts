/**
 * LinkedIn Persistent Authentication Service
 * Maintains long-lived LinkedIn access without constant re-authorization
 *
 * Token resolution order (post Plan 78-02):
 *   1. SuperSeller API (social_tokens DB) — primary source
 *   2. File-based storage (legacy-token.json) — legacy fallback
 *      (will be removed after LinkedIn Community Management API review is approved
 *      and token is seeded via seed-tax4us-tokens.ts)
 */

import fs from 'fs/promises'
import path from 'path'
import { getSocialTokenViaApi } from './social-token-client'

export interface LinkedInPersistentToken {
  access_token: string
  expires_in: number
  scope: string
  obtained_at: string
  estimated_expiry: string
  member_id?: string  // LinkedIn member URN ID — stored once, reused across renewals
}

class LinkedInPersistentAuth {
  private readonly storePath: string
  private cachedToken: LinkedInPersistentToken | null = null

  constructor() {
    this.storePath = path.join(process.cwd(), '.project-memory', 'linkedin-token.json')
  }

  /**
   * Get a valid LinkedIn access token.
   *
   * Resolution order:
   *   1. SuperSeller API (primary — token in social_tokens DB, encrypted at rest)
   *   2. Persistent file storage (.project-memory/) — legacy fallback
   *   3. Environment variable LINKEDIN_ACCESS_TOKEN — backward-compat only
   */
  async getValidAccessToken(): Promise<string> {
    // 1. Try SuperSeller API (primary source post Plan 78-02)
    try {
      const apiToken = await getSocialTokenViaApi('tax4us', 'linkedin', 'long_lived')
      if (apiToken && apiToken.length > 20) {
        console.log('✅ Using LinkedIn token from SuperSeller API')
        return apiToken
      }
    } catch (_apiErr) {
      // Token not yet in DB (LinkedIn API review pending) — fall through to legacy sources
      console.log('⚠️  LinkedIn token not in SuperSeller API (review pending), trying legacy sources')
    }

    try {
      // 2. Try file-based storage (legacy fallback)
      await this.loadStoredToken()

      if (this.cachedToken) {
        const now = new Date()
        const expiry = new Date(this.cachedToken.estimated_expiry)

        if (now.getTime() < (expiry.getTime() - 24 * 60 * 60 * 1000)) {
          console.log('✅ Using stored LinkedIn token (valid until', this.cachedToken.estimated_expiry + ')')
          return this.cachedToken.access_token
        } else {
          console.log('⚠️  Stored LinkedIn token expired on', this.cachedToken.estimated_expiry)
        }
      }

      // No valid token available
      throw new Error('No valid LinkedIn access token available. LinkedIn API review pending — token will be seeded once approved.')

    } catch (error) {
      console.error('Failed to get LinkedIn access token:', error)
      throw error
    }
  }

  /**
   * Store a new LinkedIn access token for 60-day use.
   * Also attempts to fetch and store member_id via /v2/me (needs r_liteprofile scope).
   * If /v2/me fails, preserves any previously stored member_id so it survives renewals.
   */
  async storeAccessToken(accessToken: string, expiresIn: number = 5184000): Promise<void> {
    try {
      const obtainedAt = new Date()
      const estimatedExpiry = new Date(obtainedAt.getTime() + (expiresIn * 1000))

      // Preserve existing member_id across renewals
      let memberId: string | undefined
      try {
        await this.loadStoredToken()
        memberId = this.cachedToken?.member_id
      } catch { /* ignore */ }

      // Try to get member_id from API (works if token has r_liteprofile scope)
      if (!memberId) {
        try {
          const meResp = await fetch('https://api.linkedin.com/v2/me', {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' }
          })
          if (meResp.ok) {
            const meData = await meResp.json()
            if (meData.id) {
              memberId = meData.id
              console.log('✅ LinkedIn member ID obtained:', memberId)
            }
          }
        } catch { /* non-fatal */ }
      }

      const tokenData: LinkedInPersistentToken = {
        access_token: accessToken,
        expires_in: expiresIn,
        scope: 'w_member_social',
        obtained_at: obtainedAt.toISOString(),
        estimated_expiry: estimatedExpiry.toISOString(),
        ...(memberId && { member_id: memberId })
      }

      this.cachedToken = tokenData
      await this.ensureDirectoryExists()
      await fs.writeFile(this.storePath, JSON.stringify(tokenData, null, 2), 'utf-8')
      // Note: env var write removed — token storage is now via SuperSeller social_tokens DB
      if (memberId) process.env.LINKEDIN_MEMBER_ID = memberId

      console.log('✅ LinkedIn token stored successfully')
      console.log('   Expires:', estimatedExpiry.toISOString())
      console.log('   Member ID:', memberId || '⚠️  not set (renew token with r_liteprofile scope to auto-set)')

    } catch (error) {
      console.error('Failed to store LinkedIn access token:', error)
      throw error
    }
  }

  /**
   * Get LinkedIn member ID from stored token or environment.
   * Member ID is permanent — only needs to be fetched once via r_liteprofile scope.
   */
  async getMemberId(): Promise<string | undefined> {
    // Check env first (fastest)
    if (process.env.LINKEDIN_MEMBER_ID) return process.env.LINKEDIN_MEMBER_ID

    // Check stored token
    await this.loadStoredToken()
    if (this.cachedToken?.member_id) {
      process.env.LINKEDIN_MEMBER_ID = this.cachedToken.member_id
      return this.cachedToken.member_id
    }

    // Try to fetch from API (only works if token has r_liteprofile scope)
    try {
      const token = await this.getValidAccessToken()
      const meResp = await fetch('https://api.linkedin.com/v2/me', {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' }
      })
      if (meResp.ok) {
        const meData = await meResp.json()
        if (meData.id) {
          // Store it permanently
          if (this.cachedToken) {
            this.cachedToken.member_id = meData.id
            await fs.writeFile(this.storePath, JSON.stringify(this.cachedToken, null, 2), 'utf-8')
          }
          process.env.LINKEDIN_MEMBER_ID = meData.id
          return meData.id
        }
      }
    } catch { /* non-fatal */ }

    return undefined
  }

  /**
   * Load stored token from file system
   */
  private async loadStoredToken(): Promise<void> {
    try {
      const tokenData = await fs.readFile(this.storePath, 'utf-8')
      this.cachedToken = JSON.parse(tokenData)
    } catch (error) {
      // File doesn't exist or invalid - not an error
      this.cachedToken = null
    }
  }

  /**
   * Check if we have a valid stored token
   */
  async hasValidToken(): Promise<boolean> {
    try {
      const token = await this.getValidAccessToken()
      return !!token
    } catch (error) {
      return false
    }
  }

  /**
   * Get token status for monitoring
   */
  async getTokenStatus(): Promise<{
    hasToken: boolean
    expiresAt?: string
    daysUntilExpiry?: number
    source: 'api' | 'stored' | 'none'
  }> {
    try {
      // Check SuperSeller API first (primary source post Plan 78-02)
      try {
        const apiToken = await getSocialTokenViaApi('tax4us', 'linkedin', 'long_lived')
        if (apiToken && apiToken.length > 20) {
          return {
            hasToken: true,
            source: 'api'
          }
        }
      } catch { /* token not in DB yet */ }

      // Check stored token (legacy fallback)
      await this.loadStoredToken()
      if (this.cachedToken) {
        const expiry = new Date(this.cachedToken.estimated_expiry)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        return {
          hasToken: true,
          expiresAt: this.cachedToken.estimated_expiry,
          daysUntilExpiry,
          source: 'stored'
        }
      }

      return {
        hasToken: false,
        source: 'none'
      }

    } catch (error) {
      return {
        hasToken: false,
        source: 'none'
      }
    }
  }

  /**
   * Test if the current token is valid using token introspection.
   * Works with any scope (w_member_social, r_liteprofile, etc.)
   */
  async testToken(): Promise<{ valid: boolean; userInfo?: any; error?: string }> {
    try {
      const accessToken = await this.getValidAccessToken()
      const clientId = process.env.LINKEDIN_CLIENT_ID
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        // Fall back to expiry-based check if no client credentials
        await this.loadStoredToken()
        if (this.cachedToken) {
          const expiry = new Date(this.cachedToken.estimated_expiry)
          const valid = expiry.getTime() > Date.now()
          return { valid, error: valid ? undefined : 'Token expired' }
        }
        return { valid: false, error: 'No token data' }
      }

      // Use token introspect — works with any scope
      const resp = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: accessToken, client_id: clientId, client_secret: clientSecret })
      })

      if (!resp.ok) {
        return { valid: false, error: `Introspect failed: ${resp.status}` }
      }

      const data = await resp.json()
      const memberId = await this.getMemberId()

      return {
        valid: data.active === true,
        userInfo: { name: 'LinkedIn User', id: memberId },
        error: data.active ? undefined : 'Token inactive'
      }

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clear stored tokens (for testing or re-setup)
   */
  async clearTokens(): Promise<void> {
    try {
      this.cachedToken = null
      // Note: env var management removed — token is now in SuperSeller social_tokens DB
      // To clear from DB: deactivate via SuperSeller admin API

      try {
        await fs.unlink(this.storePath)
      } catch (error) {
        // File doesn't exist - not an error
      }

      console.log('✅ LinkedIn legacy tokens cleared (DB token managed via SuperSeller API)')
    } catch (error) {
      console.error('Failed to clear tokens:', error)
    }
  }

  /**
   * Ensure directory exists for token storage
   */
  private async ensureDirectoryExists(): Promise<void> {
    const dir = path.dirname(this.storePath)
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      // Directory already exists - not an error
    }
  }
}

export const linkedInPersistentAuth = new LinkedInPersistentAuth()