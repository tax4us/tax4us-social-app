import fs from 'fs/promises'
import path from 'path'

export interface ProjectSession {
  id: string
  started_at: string
  ended_at?: string
  claude_version: string
  session_summary: string
  goals: string[]
  achievements: string[]
  challenges: string[]
  next_priorities: string[]
}

export interface TaskProgress {
  id: string
  session_id: string
  task_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  started_at: string
  completed_at?: string
  notes: string
  dependencies: string[]
  estimated_hours?: number
  actual_hours?: number
}

export interface ProjectMilestone {
  id: string
  name: string
  description: string
  target_date: string
  completed_date?: string
  status: 'planned' | 'in_progress' | 'completed' | 'delayed'
  tasks: string[] // Task IDs
  blockers: string[]
}

export interface TechnicalDecision {
  id: string
  decision: string
  context: string
  alternatives_considered: string[]
  reasoning: string
  implementation_notes: string
  made_at: string
  made_by: string
  impact: 'low' | 'medium' | 'high'
}

export interface SystemState {
  last_updated: string
  database_status: {
    topics_count: number
    content_pieces_count: number
    pipeline_runs_count: number
  }
  api_integrations: {
    [key: string]: {
      status: 'connected' | 'error' | 'not_configured'
      last_tested: string
      error_message?: string
    }
  }
  deployment_status: {
    environment: 'development' | 'staging' | 'production'
    last_deployment: string
    version: string
    health_check: boolean
  }
}

class ProjectMemoryManager {
  private memoryDir = path.join(process.cwd(), '.project-memory')
  private currentSessionId: string

  constructor() {
    this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async init() {
    await fs.mkdir(this.memoryDir, { recursive: true })
    await this.startSession()
  }

  private async readMemoryFile<T>(filename: string): Promise<T[]> {
    const filePath = path.join(this.memoryDir, filename)
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      return []
    }
  }

  private async writeMemoryFile<T>(filename: string, data: T[]): Promise<void> {
    const filePath = path.join(this.memoryDir, filename)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  }

  // Session Management
  async startSession(): Promise<void> {
    const sessions = await this.readMemoryFile<ProjectSession>('sessions.json')
    
    const session: ProjectSession = {
      id: this.currentSessionId,
      started_at: new Date().toISOString(),
      claude_version: 'Sonnet 4 (claude-sonnet-4-20250514)',
      session_summary: 'Tax4US Content Factory Development Session',
      goals: [
        'Complete autonomous content pipeline implementation',
        'Integrate all external APIs (WordPress, Slack, ElevenLabs, etc.)',
        'Build executive dashboard for pipeline monitoring',
        'Implement NotebookLM-powered content templates'
      ],
      achievements: [],
      challenges: [],
      next_priorities: []
    }

    sessions.push(session)
    await this.writeMemoryFile('sessions.json', sessions)
    
    console.log(`📝 Started project session: ${this.currentSessionId}`)
  }

  async endSession(summary: string, achievements: string[], challenges: string[], nextPriorities: string[]): Promise<void> {
    const sessions = await this.readMemoryFile<ProjectSession>('sessions.json')
    const sessionIndex = sessions.findIndex(s => s.id === this.currentSessionId)
    
    if (sessionIndex !== -1) {
      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ended_at: new Date().toISOString(),
        session_summary: summary,
        achievements,
        challenges,
        next_priorities: nextPriorities
      }
      
      await this.writeMemoryFile('sessions.json', sessions)
      console.log(`✅ Ended project session: ${this.currentSessionId}`)
    }
  }

  // Task Management
  async logTask(taskName: string, status: TaskProgress['status'], notes: string = '', dependencies: string[] = []): Promise<string> {
    const tasks = await this.readMemoryFile<TaskProgress>('tasks.json')
    
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const task: TaskProgress = {
      id: taskId,
      session_id: this.currentSessionId,
      task_name: taskName,
      status,
      started_at: new Date().toISOString(),
      notes,
      dependencies
    }

    tasks.push(task)
    await this.writeMemoryFile('tasks.json', tasks)
    
    return taskId
  }

  async updateTask(taskId: string, updates: Partial<TaskProgress>): Promise<void> {
    const tasks = await this.readMemoryFile<TaskProgress>('tasks.json')
    const taskIndex = tasks.findIndex(t => t.id === taskId)
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updates,
        ...(updates.status === 'completed' && { completed_at: new Date().toISOString() })
      }
      
      await this.writeMemoryFile('tasks.json', tasks)
    }
  }

  // Technical Decisions
  async logDecision(
    decision: string,
    context: string,
    alternatives: string[],
    reasoning: string,
    implementationNotes: string,
    impact: TechnicalDecision['impact'] = 'medium'
  ): Promise<void> {
    const decisions = await this.readMemoryFile<TechnicalDecision>('decisions.json')
    
    const decisionRecord: TechnicalDecision = {
      id: `decision_${Date.now()}`,
      decision,
      context,
      alternatives_considered: alternatives,
      reasoning,
      implementation_notes: implementationNotes,
      made_at: new Date().toISOString(),
      made_by: 'Claude Sonnet 4',
      impact
    }

    decisions.push(decisionRecord)
    await this.writeMemoryFile('decisions.json', decisions)
  }

  // System State Tracking
  async updateSystemState(state: Partial<SystemState>): Promise<void> {
    const stateFile = path.join(this.memoryDir, 'system_state.json')
    let currentState: SystemState

    try {
      const data = await fs.readFile(stateFile, 'utf-8')
      currentState = JSON.parse(data)
    } catch (error) {
      currentState = {
        last_updated: new Date().toISOString(),
        database_status: { topics_count: 0, content_pieces_count: 0, pipeline_runs_count: 0 },
        api_integrations: {},
        deployment_status: {
          environment: 'development',
          last_deployment: new Date().toISOString(),
          version: '1.0.0',
          health_check: false
        }
      }
    }

    const updatedState = {
      ...currentState,
      ...state,
      last_updated: new Date().toISOString()
    }

    await fs.writeFile(stateFile, JSON.stringify(updatedState, null, 2))
  }

  // Analytics & Reporting
  async generateProgressReport(): Promise<string> {
    const sessions = await this.readMemoryFile<ProjectSession>('sessions.json')
    const tasks = await this.readMemoryFile<TaskProgress>('tasks.json')
    const decisions = await this.readMemoryFile<TechnicalDecision>('decisions.json')

    const completedTasks = tasks.filter(t => t.status === 'completed')
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
    const blockedTasks = tasks.filter(t => t.status === 'blocked')

    const report = `
# Tax4US Project Progress Report
Generated: ${new Date().toISOString()}

## Session Summary
- Total Sessions: ${sessions.length}
- Current Session: ${this.currentSessionId}
- Session Started: ${sessions[sessions.length - 1]?.started_at}

## Task Progress
- ✅ Completed: ${completedTasks.length}
- 🔄 In Progress: ${inProgressTasks.length}
- 🚫 Blocked: ${blockedTasks.length}
- 📊 Total Tasks: ${tasks.length}

## Recent Achievements
${completedTasks.slice(-5).map(task => `- ${task.task_name}`).join('\n')}

## Technical Decisions Made
${decisions.slice(-3).map(d => `- ${d.decision} (${d.impact} impact)`).join('\n')}

## Next Priorities
${inProgressTasks.slice(0, 3).map(task => `- ${task.task_name}`).join('\n')}
`

    return report
  }

  async getProjectTimeline(): Promise<{ date: string; events: string[] }[]> {
    const tasks = await this.readMemoryFile<TaskProgress>('tasks.json')
    const decisions = await this.readMemoryFile<TechnicalDecision>('decisions.json')

    const timeline: { [key: string]: string[] } = {}

    // Add completed tasks
    tasks.filter(t => t.completed_at).forEach(task => {
      const date = task.completed_at!.split('T')[0]
      if (!timeline[date]) timeline[date] = []
      timeline[date].push(`✅ Completed: ${task.task_name}`)
    })

    // Add decisions
    decisions.forEach(decision => {
      const date = decision.made_at.split('T')[0]
      if (!timeline[date]) timeline[date] = []
      timeline[date].push(`🎯 Decision: ${decision.decision}`)
    })

    return Object.entries(timeline)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, events]) => ({ date, events }))
  }

  // API Integration Status
  async testAPIIntegrations(): Promise<void> {
    const integrations = {
      wordpress: { endpoint: process.env.WP_URL, key: process.env.WP_APPLICATION_PASSWORD },
      slack: { endpoint: 'slack.com/api', key: process.env.SLACK_BOT_TOKEN },
      elevenlabs: { endpoint: 'api.elevenlabs.io', key: process.env.ELEVENLABS_API_KEY },
      anthropic: { endpoint: 'api.anthropic.com', key: process.env.ANTHROPIC_API_KEY },
      kie_ai: { endpoint: 'kie.ai', key: process.env.KIE_API_KEY }
    }

    const status: SystemState['api_integrations'] = {}

    for (const [name, config] of Object.entries(integrations)) {
      status[name] = {
        status: config.key ? 'connected' : 'not_configured',
        last_tested: new Date().toISOString(),
        error_message: !config.key ? 'API key not configured' : undefined
      }
    }

    await this.updateSystemState({ api_integrations: status })
  }

  /**
   * Get recent tasks filtered by type or category
   */
  async getRecentTasks(category?: string, limit: number = 10): Promise<TaskProgress[]> {
    const tasks = await this.readMemoryFile<TaskProgress>('tasks.json')
    
    let filteredTasks = tasks
    if (category) {
      filteredTasks = tasks.filter(task => 
        task.task_name.toLowerCase().includes(category.toLowerCase()) ||
        task.notes.toLowerCase().includes(category.toLowerCase())
      )
    }
    
    return filteredTasks
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit)
  }
}

export const projectMemory = new ProjectMemoryManager()

// Auto-initialize on import
projectMemory.init().catch(console.error)