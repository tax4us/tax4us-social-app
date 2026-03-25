/**
 * Token Reminder System
 * Sends reminders at day 59 of 60-day token lifecycle
 */

import { linkedInPersistentAuth } from './linkedin-persistent-auth'
import { logger } from '../utils/logger'

export interface ReminderConfig {
  warningDays: number // Days before expiry to send reminder
  method: 'console' | 'file' | 'slack' | 'email'
  lastReminderSent?: string
}

class TokenReminderService {
  private readonly config: ReminderConfig

  constructor() {
    this.config = {
      warningDays: 1, // Remind 1 day before expiry (day 59 of 60)
      method: 'slack'  // Sends to Slack channel — Ben sees it and runs renewal
    }
  }

  /**
   * Check if reminders need to be sent
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      logger.info('TokenReminder', '🔔 Checking token expiration reminders...')

      // Check LinkedIn token
      const linkedinStatus = await linkedInPersistentAuth.getTokenStatus()
      
      if (linkedinStatus.hasToken && linkedinStatus.daysUntilExpiry !== undefined) {
        const daysLeft = linkedinStatus.daysUntilExpiry
        
        if (daysLeft <= this.config.warningDays && daysLeft > 0) {
          await this.sendLinkedInReminder(daysLeft, linkedinStatus.expiresAt!)
        } else if (daysLeft <= 0) {
          await this.sendLinkedInExpiredNotice()
        } else if (daysLeft <= 7) {
          logger.warn('TokenReminder', `⏰ LinkedIn token expires in ${daysLeft} days`)
        }
      }

      logger.info('TokenReminder', '✅ Reminder check completed')

    } catch (error) {
      logger.error('TokenReminder', '❌ Reminder check failed', error)
    }
  }

  /**
   * Send LinkedIn token reminder (day 59)
   */
  private async sendLinkedInReminder(daysLeft: number, expiresAt: string): Promise<void> {
    const message = this.generateLinkedInReminderMessage(daysLeft, expiresAt)
    
    switch (this.config.method) {
      case 'console':
        console.log('\n' + '='.repeat(60))
        logger.info('TokenReminder', '🚨 LINKEDIN TOKEN EXPIRY REMINDER')
        logger.info('TokenReminder', '='.repeat(60))
        logger.info('TokenReminder', message)
        logger.info('TokenReminder', '='.repeat(60) + '\n')
        break
        
      case 'file':
        await this.writeReminderToFile(message)
        break
        
      case 'slack':
        await this.sendSlackReminder(message)
        break
        
      case 'email':
        await this.sendEmailReminder(message)
        break
    }

    // Update last reminder sent time
    this.config.lastReminderSent = new Date().toISOString()
  }

  /**
   * Send expired token notice
   */
  private async sendLinkedInExpiredNotice(): Promise<void> {
    const message = `
🚨 URGENT: LINKEDIN TOKEN HAS EXPIRED

Your LinkedIn access token expired and social media publishing will fail.

IMMEDIATE ACTION REQUIRED:
1. Get new LinkedIn access token
2. Run: npm run get-linkedin-token -- --token=NEW_TOKEN
3. Test: npm run monitor-tokens

This will restore LinkedIn posting for another 60 days.
`

    logger.warn('TokenReminder', '\n' + '🚨'.repeat(20))
    logger.error('TokenReminder', 'LINKEDIN TOKEN EXPIRED - ACTION REQUIRED')
    logger.error('TokenReminder', '🚨'.repeat(20))
    console.log(message)
    logger.error('TokenReminder', '🚨'.repeat(20) + '\n')
  }

  /**
   * Generate reminder message
   */
  private generateLinkedInReminderMessage(daysLeft: number, expiresAt: string): string {
    return `
🔔 LINKEDIN TOKEN EXPIRY — ACTION REQUIRED IN ${daysLeft} DAY${daysLeft !== 1 ? 'S' : ''}

Expires: ${new Date(expiresAt).toLocaleString()}

EXACT STEPS (2 minutes):
1. Go to: https://www.linkedin.com/developers/tools/oauth/token-generator
2. Select app: "ai agent"
3. ✅ Check BOTH scopes: *w_member_social* + *r_liteprofile*
   (r_liteprofile is critical — it auto-stores your member ID permanently)
4. Click "Request access token" → copy it
5. On your Mac, run:
   npm run get-linkedin-token -- --token=PASTE_TOKEN_HERE

That's it. The system auto-stores everything and LinkedIn posts for another 60 days.

If you get an error finding member ID, run this in Chrome on linkedin.com:
  document.body.innerHTML.match(/urn:li:member:(\\d+)/)?.[1]
Then tell the system: npm run get-linkedin-token -- --token=TOKEN --member-id=ID
`
  }

  /**
   * Write reminder to file for cron jobs to pick up
   */
  private async writeReminderToFile(message: string): Promise<void> {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const reminderPath = path.join(process.cwd(), '.project-memory', 'token-reminders.log')
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] LINKEDIN TOKEN REMINDER\n${message}\n\n`
    
    try {
      await fs.appendFile(reminderPath, logEntry, 'utf-8')
      logger.info('TokenReminder', `📝 Reminder logged to: ${reminderPath}`)
    } catch (error) {
      logger.error('TokenReminder', 'Failed to write reminder file', error)
    }
  }

  /**
   * Send Slack reminder (if Slack integration is available)
   */
  private async sendSlackReminder(message: string): Promise<void> {
    try {
      // Check if Slack is configured
      const slackToken = process.env.SLACK_BOT_TOKEN
      const slackChannel = process.env.SLACK_CHANNEL_ID
      
      if (!slackToken || !slackChannel) {
        logger.warn('TokenReminder', '⚠️  Slack not configured, falling back to console')
        logger.info('TokenReminder', message)
        return
      }

      // Send to Slack
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: slackChannel,
          text: '🚨 LinkedIn Token Expiry Reminder',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message
              }
            }
          ]
        })
      })

      if (response.ok) {
        logger.info('TokenReminder', '✅ Slack reminder sent successfully')
      } else {
        logger.error('TokenReminder', '❌ Failed to send Slack reminder', await response.text())
        logger.info('TokenReminder', 'Falling back to console: ' + message)
      }

    } catch (error) {
      logger.error('TokenReminder', '❌ Slack reminder failed', error)
      logger.info('TokenReminder', 'Falling back to console: ' + message)
    }
  }

  /**
   * Send email reminder (placeholder for future implementation)
   */
  private async sendEmailReminder(message: string): Promise<void> {
    logger.warn('TokenReminder', '📧 Email reminders not implemented yet')
    logger.info('TokenReminder', 'Falling back to console: ' + message)
  }

  /**
   * Schedule daily reminder checks
   */
  async scheduleDailyCheck(): Promise<void> {
    logger.info('TokenReminder', '📅 Starting daily token reminder checks...')
    
    // Run immediately
    await this.checkAndSendReminders()
    
    // Schedule to run every 24 hours
    setInterval(async () => {
      await this.checkAndSendReminders()
    }, 24 * 60 * 60 * 1000) // 24 hours
    
    logger.info('TokenReminder', '✅ Daily reminder checks scheduled')
  }

  /**
   * Test reminder system
   */
  async testReminder(): Promise<void> {
    logger.info('TokenReminder', '🧪 Testing reminder system...\n')
    
    // Simulate token expiring in 1 day
    await this.sendLinkedInReminder(1, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
    
    logger.info('TokenReminder', '\n🧪 Testing expired token notice...\n')
    
    // Simulate expired token
    await this.sendLinkedInExpiredNotice()
    
    logger.info('TokenReminder', '✅ Reminder system test completed')
  }

  /**
   * Configure reminder method
   */
  configureReminders(method: 'console' | 'file' | 'slack' | 'email', warningDays: number = 1): void {
    this.config.method = method
    this.config.warningDays = warningDays
    
    logger.info('TokenReminder', `✅ Reminders configured: ${method}, ${warningDays} day(s) before expiry`)
  }

  /**
   * Get reminder status
   */
  getReminderStatus(): ReminderConfig {
    return { ...this.config }
  }
}

export const tokenReminder = new TokenReminderService()