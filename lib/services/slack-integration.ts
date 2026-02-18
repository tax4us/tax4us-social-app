// Slack integration using direct API calls

export interface SlackApprovalRequest {
  id: string
  type: 'content_review' | 'topic_selection' | 'seo_optimization'
  title: string
  content?: string
  previewUrl?: string
  runId: string
  contentId: string
  timestamp: string
}

export interface SlackApprovalResponse {
  approved: boolean
  feedback?: string
  changes?: string[]
  timestamp: string
  userId: string
}

class SlackIntegrationService {
  private errorLogged = false;
  private readonly APPROVAL_CHANNEL_ID = process.env.SLACK_APPROVAL_CHANNEL_ID || 'C08EXAMPLE'
  private readonly NOTIFICATIONS_CHANNEL_ID = process.env.SLACK_NOTIFICATIONS_CHANNEL_ID || 'C08EXAMPLE'
  private readonly BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''

  /**
   * Send approval request to Slack channel
   * Creates interactive message with approve/reject buttons
   */
  async sendApprovalRequest(request: SlackApprovalRequest): Promise<string> {
    try {
      const message = this.formatApprovalMessage(request)
      
      const result = await this.postSlackMessage(this.APPROVAL_CHANNEL_ID, message)

      // Store the message timestamp for tracking responses
      await this.storeApprovalMessage(request.id, result.ts, request.runId)
      
      return result.ts
    } catch (error) {
      console.error('Failed to send Slack approval request:', error)
      throw new Error(`Slack approval request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send notification about pipeline status
   */
  async sendNotification(title: string, message: string, runId?: string): Promise<void> {
    try {
      const formattedMessage = `🔔 *${title}*\n${message}${runId ? `\n_Run ID: ${runId}_` : ''}`
      
      await this.postSlackMessage(this.NOTIFICATIONS_CHANNEL_ID, formattedMessage)
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
    }
  }

  /**
   * Handle approval response from Slack
   * Processes emoji reactions or thread replies
   */
  async processApprovalResponse(
    messageTimestamp: string, 
    userId: string, 
    reaction?: string,
    replyText?: string
  ): Promise<SlackApprovalResponse | null> {
    
    // Process emoji reactions
    if (reaction) {
      const approved = ['white_check_mark', 'heavy_check_mark', 'thumbsup', '+1'].includes(reaction)
      const rejected = ['x', 'no_entry', 'thumbsdown', '-1'].includes(reaction)
      
      if (approved || rejected) {
        return {
          approved,
          timestamp: new Date().toISOString(),
          userId
        }
      }
    }

    // Process text replies for feedback
    if (replyText) {
      const lowerText = replyText.toLowerCase()
      const approved = lowerText.includes('approve') || lowerText.includes('looks good') || lowerText.includes('lgtm')
      const rejected = lowerText.includes('reject') || lowerText.includes('needs changes') || lowerText.includes('revise')
      
      if (approved || rejected) {
        return {
          approved,
          feedback: replyText,
          timestamp: new Date().toISOString(),
          userId
        }
      }
    }

    return null
  }

  /**
   * Send feedback request for content revision
   */
  async sendRevisionRequest(
    originalRequestId: string, 
    feedback: string, 
    runId: string
  ): Promise<void> {
    try {
      const message = `🔄 *Content Revision Requested*\n\n` +
        `**Feedback:** ${feedback}\n\n` +
        `The content will be regenerated based on your feedback.\n` +
        `_Run ID: ${runId}_`

      await this.postSlackMessage(this.APPROVAL_CHANNEL_ID, message)
    } catch (error) {
      console.error('Failed to send revision request:', error)
    }
  }

  /**
   * Format approval request message with all necessary details
   */
  private formatApprovalMessage(request: SlackApprovalRequest): string {
    const { type, title, content, previewUrl, runId } = request
    
    const typeEmoji = {
      'content_review': '📝',
      'topic_selection': '🎯', 
      'seo_optimization': '🔍'
    }

    let message = `${typeEmoji[type]} *${this.getTypeTitle(type)} Approval Required*\n\n`
    message += `**Title:** ${title}\n`
    
    if (content) {
      const truncated = content.length > 300 ? content.substring(0, 300) + '...' : content
      message += `**Preview:**\n${truncated}\n\n`
    }
    
    if (previewUrl) {
      message += `**Preview:** ${previewUrl}\n\n`
    }
    
    message += `**Actions:**\n`
    message += `• React with ✅ to approve\n`
    message += `• React with ❌ to reject\n`
    message += `• Reply with specific feedback for revisions\n\n`
    message += `_Run ID: ${runId}_\n`
    message += `_Timestamp: ${new Date(request.timestamp).toLocaleString()}_`
    
    return message
  }

  private getTypeTitle(type: string): string {
    const titles = {
      'content_review': 'Content Review',
      'topic_selection': 'Topic Selection',
      'seo_optimization': 'SEO Optimization'
    }
    return titles[type as keyof typeof titles] || 'Approval'
  }

  /**
   * Store approval message details in database for tracking
   */
  private async storeApprovalMessage(
    approvalId: string, 
    messageTimestamp: string, 
    runId: string
  ): Promise<void> {
    // This would store in database for tracking responses
    // For now, we'll use in-memory storage or extend the database
    console.log(`Stored approval message: ${approvalId} -> ${messageTimestamp} (Run: ${runId})`)
  }

  /**
   * Post message to Slack channel using Web API
   */
  private async postSlackMessage(channelId: string, text: string): Promise<{ ts: string }> {
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channelId,
          text: text,
          parse: 'mrkdwn'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Slack API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      if (!result.ok) {
        throw new Error(`Slack error: ${result.error}`)
      }

      return { ts: result.ts }

    } catch (error) {
      if (!this.errorLogged) {
        console.error('Slack API call failed:', error)
        this.errorLogged = true
      }
      throw error
    }
  }

  /**
   * Check for pending approvals and their status
   */
  async checkPendingApprovals(): Promise<Array<{id: string, status: 'pending' | 'approved' | 'rejected', runId: string}>> {
    // This would query the database for pending approvals
    // and check their Slack message status
    return []
  }

  /**
   * Send success notification when pipeline completes
   */
  async sendCompletionNotification(runId: string, summary: {
    stagesCompleted: string[]
    timeElapsed: string
    contentUrl?: string
    socialPosts?: number
  }): Promise<void> {
    try {
      const message = `✅ *Content Pipeline Completed Successfully*\n\n` +
        `**Stages Completed:** ${summary.stagesCompleted.join(', ')}\n` +
        `**Time Elapsed:** ${summary.timeElapsed}\n` +
        (summary.contentUrl ? `**Published Content:** ${summary.contentUrl}\n` : '') +
        (summary.socialPosts ? `**Social Posts Created:** ${summary.socialPosts}\n` : '') +
        `\n_Run ID: ${runId}_`

      await this.sendNotification('Pipeline Complete', message, runId)
    } catch (error) {
      console.error('Failed to send completion notification:', error)
    }
  }

  /**
   * Send error notification when pipeline fails
   */
  async sendErrorNotification(runId: string, stage: string, error: string): Promise<void> {
    try {
      const message = `❌ *Pipeline Failed*\n\n` +
        `**Stage:** ${stage}\n` +
        `**Error:** ${error}\n` +
        `\nPlease check the pipeline logs for more details.`

      await this.sendNotification('Pipeline Error', message, runId)
    } catch (error) {
      console.error('Failed to send error notification:', error)
    }
  }
}

export const slackIntegration = new SlackIntegrationService()