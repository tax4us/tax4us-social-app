import fs from 'fs/promises'
import path from 'path'

// Database Schema Types
export interface Topic {
  id: string
  title_english: string
  title_hebrew: string
  priority: 'high' | 'medium' | 'low'
  seasonal_relevance: string
  tags: string[]
  last_used?: string
  created_at: string
  updated_at: string
}

export interface ContentPiece {
  id: string
  topic_id: string
  title_english: string
  title_hebrew: string
  content_english?: string
  content_hebrew?: string
  gutenberg_json?: string
  seo_score?: number
  target_keywords: string[]
  wordpress_post_id?: number
  status: 'draft' | 'pending_approval' | 'approved' | 'published'
  media_urls: {
    featured_image?: string
    blog_video?: string
    social_video?: string
    podcast_audio?: string
  }
  created_at: string
  updated_at: string
}

export interface Approval {
  id: string
  type: 'topic_selection' | 'content_review' | 'media_approval' | 'pre_publish'
  related_id: string // topic_id or content_piece_id
  related_title?: string
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  slack_message_ts?: string
  slack_channel?: string
  response_user_id?: string
  response_timestamp?: string
  feedback?: string
  approver?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PipelineRun {
  id: string
  trigger_type: 'cron' | 'manual'
  pipeline_type: 'content_creation' | 'seo_optimization' | 'podcast_production'
  status: 'running' | 'completed' | 'failed' | 'paused'
  current_stage?: string
  stages_completed: string[]
  stages_failed: string[]
  total_cost_usd?: number
  ai_tokens_used?: number
  logs: PipelineLog[]
  started_at: string
  completed_at?: string
}

export interface PipelineLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  stage: string
  message: string
  data?: any
}

// Database Manager Class
class DatabaseManager {
  private dataDir = path.join(process.cwd(), 'data')
  
  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true })
    } catch (error) {
      console.error('Failed to initialize database directory:', error)
    }
  }

  private async readFile<T>(filename: string): Promise<T[]> {
    const filePath = path.join(this.dataDir, filename)
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // If file doesn't exist, return empty array
      return []
    }
  }

  private async writeFile<T>(filename: string, data: T[]): Promise<void> {
    const filePath = path.join(this.dataDir, filename)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  }

  // Topics CRUD
  async getTopics(): Promise<Topic[]> {
    return this.readFile<Topic>('topics.json')
  }

  async getTopic(id: string): Promise<Topic | null> {
    const topics = await this.getTopics()
    return topics.find(t => t.id === id) || null
  }

  async createTopic(topicData: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<Topic> {
    const topics = await this.getTopics()
    const topic: Topic = {
      ...topicData,
      id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    topics.push(topic)
    await this.writeFile('topics.json', topics)
    return topic
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<Topic | null> {
    const topics = await this.getTopics()
    const index = topics.findIndex(t => t.id === id)
    if (index === -1) return null
    
    topics[index] = { ...topics[index], ...updates, updated_at: new Date().toISOString() }
    await this.writeFile('topics.json', topics)
    return topics[index]
  }

  // Content Pieces CRUD
  async getContentPieces(): Promise<ContentPiece[]> {
    return this.readFile<ContentPiece>('content_pieces.json')
  }

  async getContentPiece(id: string): Promise<ContentPiece | null> {
    const pieces = await this.getContentPieces()
    return pieces.find(p => p.id === id) || null
  }

  async createContentPiece(pieceData: Omit<ContentPiece, 'id' | 'created_at' | 'updated_at'>): Promise<ContentPiece> {
    const pieces = await this.getContentPieces()
    const piece: ContentPiece = {
      ...pieceData,
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    pieces.push(piece)
    await this.writeFile('content_pieces.json', pieces)
    return piece
  }

  async updateContentPiece(id: string, updates: Partial<ContentPiece>): Promise<ContentPiece | null> {
    const pieces = await this.getContentPieces()
    const index = pieces.findIndex(p => p.id === id)
    if (index === -1) return null
    
    pieces[index] = { ...pieces[index], ...updates, updated_at: new Date().toISOString() }
    await this.writeFile('content_pieces.json', pieces)
    return pieces[index]
  }

  // Approvals CRUD
  async getApprovals(): Promise<Approval[]> {
    return this.readFile<Approval>('approvals.json')
  }

  async createApproval(approvalData: Omit<Approval, 'id' | 'created_at' | 'updated_at'>): Promise<Approval> {
    const approvals = await this.getApprovals()
    const approval: Approval = {
      ...approvalData,
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    approvals.push(approval)
    await this.writeFile('approvals.json', approvals)
    return approval
  }

  async updateApproval(id: string, updates: Partial<Approval>): Promise<Approval | null> {
    const approvals = await this.getApprovals()
    const index = approvals.findIndex(a => a.id === id)
    if (index === -1) return null
    
    approvals[index] = { ...approvals[index], ...updates, updated_at: new Date().toISOString() }
    await this.writeFile('approvals.json', approvals)
    return approvals[index]
  }

  // Pipeline Runs CRUD
  async getPipelineRuns(): Promise<PipelineRun[]> {
    return this.readFile<PipelineRun>('pipeline_runs.json')
  }

  async getPipelineRun(id: string): Promise<PipelineRun | null> {
    const runs = await this.getPipelineRuns()
    return runs.find(r => r.id === id) || null
  }

  async createPipelineRun(runData: Omit<PipelineRun, 'id'>): Promise<PipelineRun> {
    const runs = await this.getPipelineRuns()
    const run: PipelineRun = {
      ...runData,
      id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    runs.push(run)
    await this.writeFile('pipeline_runs.json', runs)
    return run
  }

  async updatePipelineRun(id: string, updates: Partial<PipelineRun>): Promise<PipelineRun | null> {
    const runs = await this.getPipelineRuns()
    const index = runs.findIndex(r => r.id === id)
    if (index === -1) return null
    
    runs[index] = { ...runs[index], ...updates }
    await this.writeFile('pipeline_runs.json', runs)
    return runs[index]
  }

  async addPipelineLog(runId: string, log: PipelineLog): Promise<boolean> {
    const run = await this.getPipelineRun(runId)
    if (!run) return false
    
    run.logs.push(log)
    await this.updatePipelineRun(runId, { logs: run.logs })
    return true
  }

  // Utility Methods
  async getAvailableTopics(limit: number = 10): Promise<Topic[]> {
    const topics = await this.getTopics()
    return topics
      .filter(t => !t.last_used || new Date(t.last_used) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Not used in last 30 days
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
      .slice(0, limit)
  }

  async getPendingApprovals(): Promise<Approval[]> {
    const approvals = await this.getApprovals()
    return approvals.filter(a => a.status === 'pending')
  }

  async getActiveRuns(): Promise<PipelineRun[]> {
    const runs = await this.getPipelineRuns()
    return runs.filter(r => r.status === 'running' || r.status === 'paused')
  }

  // Additional approval methods for Slack integration
  async getApproval(id: string): Promise<Approval | null> {
    const approvals = await this.getApprovals()
    return approvals.find(a => a.id === id) || null
  }

  async getApprovalBySlackMessage(messageTimestamp: string): Promise<Approval | null> {
    const approvals = await this.getApprovals()
    return approvals.find(a => a.slack_message_ts === messageTimestamp) || null
  }

  async getApprovalsByRelatedId(relatedId: string): Promise<Approval[]> {
    const approvals = await this.getApprovals()
    return approvals.filter(a => a.related_id === relatedId)
  }

  async getPipelineRunByApproval(approvalId: string): Promise<PipelineRun | null> {
    const approval = await this.getApproval(approvalId)
    if (!approval) return null
    
    const runs = await this.getPipelineRuns()
    // Find run that's paused and related to this approval
    return runs.find(r => r.status === 'paused' && r.current_stage === 'approval_gate') || null
  }
}

export const db = new DatabaseManager()

// Initialize database on import
db.init().catch(console.error)