/**
 * Token Monitoring Service
 * Monitors and automatically refreshes social media tokens before expiration
 */

import { linkedInPersistentAuth } from './linkedin-persistent-auth'
import { tokenReminder } from './token-reminder'

export interface TokenStatus {
  platform: string
  hasToken: boolean
  expiresAt?: string
  isValid: boolean
  daysUntilExpiry?: number
  needsRefresh: boolean
  lastChecked: string
}

export interface TokenMonitoringResult {
  facebook: TokenStatus
  linkedin: TokenStatus
  summary: {
    allValid: boolean
    needsAttention: string[]
    recommendations: string[]
  }
}

class TokenMonitorService {
  private readonly warningThresholdDays = 7 // Warn when token expires in 7 days
  private readonly refreshThresholdDays = 2 // Auto-refresh when token expires in 2 days

  /**
   * Check status of all social media tokens
   */
  async checkAllTokens(): Promise<TokenMonitoringResult> {
    const [facebookStatus, linkedinStatus] = await Promise.all([
      this.checkFacebookToken(),
      this.checkLinkedInToken()
    ])

    const needsAttention: string[] = []
    const recommendations: string[] = []

    // Analyze Facebook token
    if (!facebookStatus.hasToken) {
      needsAttention.push('Facebook: No token configured')
      recommendations.push('Set FACEBOOK_PAGE_ACCESS_TOKEN in .env.local')
    } else if (!facebookStatus.isValid) {
      needsAttention.push('Facebook: Token invalid or expired')
      recommendations.push('Generate new Facebook Page Access Token')
    } else if (facebookStatus.needsRefresh) {
      needsAttention.push(`Facebook: Token expires in ${facebookStatus.daysUntilExpiry} days`)
      recommendations.push('Consider refreshing Facebook token soon')
    }

    // Analyze LinkedIn token  
    if (!linkedinStatus.hasToken) {
      needsAttention.push('LinkedIn: No token configured')
      recommendations.push('Complete LinkedIn OAuth flow to get refresh tokens')
    } else if (!linkedinStatus.isValid) {
      needsAttention.push('LinkedIn: Token invalid or expired')
      recommendations.push('Re-authorize LinkedIn integration')
    } else if (linkedinStatus.needsRefresh) {
      needsAttention.push(`LinkedIn: Token expires in ${linkedinStatus.daysUntilExpiry} days`)
      recommendations.push('LinkedIn token will auto-refresh automatically')
    }

    return {
      facebook: facebookStatus,
      linkedin: linkedinStatus,
      summary: {
        allValid: facebookStatus.isValid && linkedinStatus.isValid,
        needsAttention,
        recommendations
      }
    }
  }

  /**
   * Check Facebook token status
   */
  private async checkFacebookToken(): Promise<TokenStatus> {
    try {
      const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
      const pageId = process.env.FACEBOOK_PAGE_ID

      if (!token || !pageId) {
        return {
          platform: 'Facebook',
          hasToken: false,
          isValid: false,
          needsRefresh: false,
          lastChecked: new Date().toISOString()
        }
      }

      // Test token validity by making an API call
      const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=id,name,access_token&access_token=${token}`)
      
      if (!response.ok) {
        return {
          platform: 'Facebook',
          hasToken: true,
          isValid: false,
          needsRefresh: true,
          lastChecked: new Date().toISOString()
        }
      }

      const data = await response.json()
      
      // Facebook Page Access Tokens can be long-lived (60 days) or permanent
      // Try to get token info to check expiration
      let expiresAt: string | undefined
      let daysUntilExpiry: number | undefined
      let needsRefresh = false

      try {
        const tokenInfoResponse = await fetch(`https://graph.facebook.com/v18.0/debug_token?input_token=${token}&access_token=${token}`)
        if (tokenInfoResponse.ok) {
          const tokenInfo = await tokenInfoResponse.json()
          if (tokenInfo.data?.expires_at && tokenInfo.data.expires_at !== 0) {
            expiresAt = new Date(tokenInfo.data.expires_at * 1000).toISOString()
            const expiry = new Date(tokenInfo.data.expires_at * 1000)
            daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            needsRefresh = daysUntilExpiry <= this.warningThresholdDays
          }
        }
      } catch (error) {
        console.log('Could not get Facebook token expiration info:', error)
      }

      return {
        platform: 'Facebook',
        hasToken: true,
        isValid: true,
        expiresAt,
        daysUntilExpiry,
        needsRefresh,
        lastChecked: new Date().toISOString()
      }

    } catch (error) {
      console.error('Facebook token check failed:', error)
      return {
        platform: 'Facebook',
        hasToken: !!process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
        isValid: false,
        needsRefresh: true,
        lastChecked: new Date().toISOString()
      }
    }
  }

  /**
   * Check LinkedIn token status
   */
  private async checkLinkedInToken(): Promise<TokenStatus> {
    try {
      const tokenStatus = await linkedInPersistentAuth.getTokenStatus()
      const testResult = await linkedInPersistentAuth.testToken()

      let daysUntilExpiry: number | undefined
      let needsRefresh = false

      if (tokenStatus.expiresAt) {
        const expiry = new Date(tokenStatus.expiresAt)
        daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        needsRefresh = daysUntilExpiry <= this.warningThresholdDays
      }

      return {
        platform: 'LinkedIn',
        hasToken: tokenStatus.hasToken,
        isValid: testResult.valid,
        expiresAt: tokenStatus.expiresAt,
        daysUntilExpiry,
        needsRefresh,
        lastChecked: new Date().toISOString()
      }

    } catch (error) {
      console.error('LinkedIn token check failed:', error)
      return {
        platform: 'LinkedIn',
        hasToken: false,
        isValid: false,
        needsRefresh: false,
        lastChecked: new Date().toISOString()
      }
    }
  }

  /**
   * Auto-refresh tokens that are about to expire
   */
  async autoRefreshTokens(): Promise<{
    linkedin: { attempted: boolean; success: boolean; error?: string }
    facebook: { attempted: boolean; success: boolean; message: string }
  }> {
    const results = {
      linkedin: { attempted: false, success: false, error: undefined as string | undefined },
      facebook: { attempted: false, success: false, message: 'Facebook tokens must be refreshed manually' }
    }

    try {
      // Check LinkedIn token status
      const linkedinStatus = await this.checkLinkedInToken()
      if (linkedinStatus.needsRefresh && linkedinStatus.hasToken) {
        console.log('⚠️  LinkedIn token expires soon - manual token refresh needed')
        console.log('   Run: npm run get-linkedin-token')
        results.linkedin.attempted = false
        results.linkedin.success = false
        results.linkedin.error = 'Token expires soon - manual refresh required'
      }

      // Facebook tokens need manual refresh through Facebook Developers Console
      const facebookStatus = await this.checkFacebookToken()
      if (facebookStatus.needsRefresh) {
        console.log('⚠️  Facebook token needs manual refresh - generate new token in Facebook Developers Console')
      }

    } catch (error) {
      console.error('Auto-refresh process failed:', error)
    }

    return results
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport(): Promise<string> {
    const status = await this.checkAllTokens()
    
    let report = '# Social Media Token Monitoring Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`
    
    // Facebook Status
    report += '## Facebook\n'
    report += `- **Status**: ${status.facebook.isValid ? '✅ Valid' : '❌ Invalid/Expired'}\n`
    report += `- **Has Token**: ${status.facebook.hasToken ? 'Yes' : 'No'}\n`
    if (status.facebook.expiresAt) {
      report += `- **Expires**: ${status.facebook.expiresAt}\n`
      report += `- **Days Until Expiry**: ${status.facebook.daysUntilExpiry}\n`
    }
    report += `- **Needs Attention**: ${status.facebook.needsRefresh ? 'Yes' : 'No'}\n\n`
    
    // LinkedIn Status
    report += '## LinkedIn\n'
    report += `- **Status**: ${status.linkedin.isValid ? '✅ Valid' : '❌ Invalid/Expired'}\n`
    report += `- **Has Token**: ${status.linkedin.hasToken ? 'Yes' : 'No'}\n`
    if (status.linkedin.expiresAt) {
      report += `- **Expires**: ${status.linkedin.expiresAt}\n`
      report += `- **Days Until Expiry**: ${status.linkedin.daysUntilExpiry}\n`
    }
    report += `- **Auto-Refresh**: ${status.linkedin.hasToken ? 'Enabled' : 'Disabled'}\n`
    report += `- **Needs Attention**: ${status.linkedin.needsRefresh ? 'Yes' : 'No'}\n\n`
    
    // Summary
    report += '## Summary\n'
    report += `- **All Tokens Valid**: ${status.summary.allValid ? '✅ Yes' : '❌ No'}\n\n`
    
    if (status.summary.needsAttention.length > 0) {
      report += '### Issues Requiring Attention\n'
      for (const issue of status.summary.needsAttention) {
        report += `- ${issue}\n`
      }
      report += '\n'
    }
    
    if (status.summary.recommendations.length > 0) {
      report += '### Recommendations\n'
      for (const rec of status.summary.recommendations) {
        report += `- ${rec}\n`
      }
      report += '\n'
    }
    
    return report
  }

  /**
   * Run daily monitoring check (suitable for cron job)
   */
  async runDailyCheck(): Promise<void> {
    try {
      console.log('🔍 Starting daily token monitoring check...')
      
      const status = await this.checkAllTokens()
      
      if (!status.summary.allValid) {
        console.log('⚠️  Token issues detected:')
        for (const issue of status.summary.needsAttention) {
          console.log(`   - ${issue}`)
        }
      } else {
        console.log('✅ All social media tokens are valid')
      }
      
      // Check for expiry reminders (day 59 notifications)
      await tokenReminder.checkAndSendReminders()
      
      // Auto-refresh tokens if needed
      const refreshResults = await this.autoRefreshTokens()
      
      if (refreshResults.linkedin.attempted) {
        console.log(`LinkedIn refresh: ${refreshResults.linkedin.success ? '✅ Success' : '❌ Failed'}`)
        if (!refreshResults.linkedin.success && refreshResults.linkedin.error) {
          console.log(`   Error: ${refreshResults.linkedin.error}`)
        }
      }
      
      console.log('🔍 Daily token monitoring check completed')
      
    } catch (error) {
      console.error('Daily token monitoring check failed:', error)
    }
  }
}

export const tokenMonitor = new TokenMonitorService()