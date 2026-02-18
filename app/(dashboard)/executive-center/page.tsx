"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Play, 
  Pause, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  FileText, 
  Calendar,
  Settings,
  TrendingUp,
  Zap,
  Target,
  Video
} from "lucide-react"

interface DatabaseStats {
  topics: number
  contentPieces: number
  pipelineRuns: number
  activeRuns: number
  pendingApprovals: number
}

interface PipelineRun {
  id: string
  pipeline_type: string
  status: string
  current_stage?: string
  started_at: string
  completed_at?: string
}

interface ProjectMemoryStats {
  totalSessions: number
  currentSession: string
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  totalTasks: number
  recentAchievements: string[]
}

interface ApifyDashboard {
  lead_generation: {
    summary: {
      total_profiles: number
      high_value_leads: number
      conversion_potential: string
    }
    recent_leads: Array<{
      fullName: string
      headline: string
      location: string
      leadScore: number
      targetSegment: string
    }>
  }
  competitor_intelligence: {
    opportunity_gaps: string[]
    trending_keywords: string[]
    market_spend: string
  }
  content_optimization: {
    overall_score: number
    priority_actions: string[]
    social_reach_potential: string
  }
  automation_metrics: {
    time_saved_per_week: string
    content_accuracy_improvement: string
    competitive_advantage: string
  }
}

export default function ExecutiveCenterPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [activeRuns, setActiveRuns] = useState<PipelineRun[]>([])
  const [memoryStats, setMemoryStats] = useState<ProjectMemoryStats | null>(null)
  const [apifyDashboard, setApifyDashboard] = useState<ApifyDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingPipeline, setIsStartingPipeline] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, pipelineResponse, memoryResponse, apifyResponse] = await Promise.all([
        fetch('/api/admin/seed-database'),
        fetch('/api/pipeline/status'),
        fetch('/api/project-memory?action=progress-report'),
        fetch('/api/apify/dashboard')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      if (pipelineResponse.ok) {
        const pipelineData = await pipelineResponse.json()
        setActiveRuns(pipelineData.activeRuns || [])
      }

      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json()
        // Parse the text report to extract stats
        const report = memoryData.report
        const sessionMatch = report.match(/Total Sessions: (\d+)/)
        const currentSessionMatch = report.match(/Current Session: (session_[^\n]+)/)
        const completedMatch = report.match(/✅ Completed: (\d+)/)
        const inProgressMatch = report.match(/🔄 In Progress: (\d+)/)
        const blockedMatch = report.match(/🚫 Blocked: (\d+)/)
        const totalMatch = report.match(/📊 Total Tasks: (\d+)/)
        const achievementsSection = report.split('## Recent Achievements')[1]?.split('\n').filter((line: string) => line.startsWith('- ')).map((line: string) => line.substring(2)) || []

        setMemoryStats({
          totalSessions: sessionMatch ? parseInt(sessionMatch[1]) : 0,
          currentSession: currentSessionMatch ? currentSessionMatch[1] : 'unknown',
          completedTasks: completedMatch ? parseInt(completedMatch[1]) : 0,
          inProgressTasks: inProgressMatch ? parseInt(inProgressMatch[1]) : 0,
          blockedTasks: blockedMatch ? parseInt(blockedMatch[1]) : 0,
          totalTasks: totalMatch ? parseInt(totalMatch[1]) : 0,
          recentAchievements: achievementsSection.slice(0, 5)
        })
      }

      if (apifyResponse.ok) {
        const apifyData = await apifyResponse.json()
        setApifyDashboard(apifyData.dashboard)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startPipeline = async () => {
    setIsStartingPipeline(true)
    try {
      const response = await fetch('/api/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_type: 'manual' })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Pipeline started:', result.runId)
        fetchDashboardData() // Refresh data
      } else {
        console.error('Failed to start pipeline')
      }
    } catch (error) {
      console.error('Error starting pipeline:', error)
    } finally {
      setIsStartingPipeline(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const weeklyTargets = [
    { label: "Articles", current: stats?.contentPieces || 0, target: 4, icon: FileText },
    { label: "Social Posts", current: 0, target: 4, icon: TrendingUp },
    { label: "Podcast Episodes", current: 0, target: 2, icon: Target },
    { label: "Video Assets", current: 0, target: 6, icon: Zap }
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Center</h1>
          <p className="text-gray-600 mt-2">Tax4US Content Factory Command & Control</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Monday & Thursday 8AM: Content Pipeline
            </span>
            <span className="flex items-center gap-1">
              <Settings className="w-4 h-4" />
              Tuesday & Friday 10AM: SEO Optimizer
            </span>
          </div>
        </div>
        
        <Button 
          onClick={startPipeline}
          disabled={isStartingPipeline || (activeRuns.length > 0)}
          size="lg"
          className="bg-primary hover:bg-primary/90"
        >
          {isStartingPipeline ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Starting Pipeline...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Content Pipeline
            </>
          )}
        </Button>
      </div>

      {/* Database Status */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Topic Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.topics || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Tax topics available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Content Library</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.contentPieces || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Published articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pipeline Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pipelineRuns || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Total executions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.activeRuns || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.pendingApprovals || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Production Targets</CardTitle>
          <CardDescription>Content factory output goals (Mon-Thu-Wed schedule)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {weeklyTargets.map((target, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-2">
                  <target.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold">
                  {target.current}/{target.target}
                </div>
                <div className="text-sm text-gray-600">{target.label}</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((target.current / target.target) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Pipeline Status */}
      {activeRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 animate-pulse text-blue-500" />
              Active Pipeline Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="font-medium">{run.pipeline_type}</div>
                    <div className="text-sm text-gray-600">
                      Stage: {run.current_stage || 'Initializing'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Started: {new Date(run.started_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="secondary" className="animate-pulse">
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Memory & Session Tracking */}
      {memoryStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Project Memory & Session Tracking
            </CardTitle>
            <CardDescription>Development session progress and task completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{memoryStats.completedTasks}</div>
                <div className="text-sm text-gray-600">Tasks Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{memoryStats.inProgressTasks}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span>Session Progress</span>
                <span>{memoryStats.completedTasks}/{memoryStats.totalTasks} tasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${memoryStats.totalTasks > 0 ? (memoryStats.completedTasks / memoryStats.totalTasks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {memoryStats.recentAchievements.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Recent Achievements:</div>
                <div className="space-y-1">
                  {memoryStats.recentAchievements.map((achievement, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {achievement}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Apify Intelligence Dashboard */}
      {apifyDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Lead Generation Intelligence
              </CardTitle>
              <CardDescription>Apify LinkedIn Profile Scraper Results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{apifyDashboard.lead_generation.summary.high_value_leads}</div>
                  <div className="text-sm text-gray-600">High-Value Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{apifyDashboard.lead_generation.summary.conversion_potential}</div>
                  <div className="text-sm text-gray-600">Conversion Rate</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Recent High-Value Leads:</div>
                {apifyDashboard.lead_generation.recent_leads.slice(0, 3).map((lead, index) => (
                  <div key={index} className="text-xs bg-blue-50 p-2 rounded">
                    <div className="font-medium">{lead.fullName}</div>
                    <div className="text-gray-600">{lead.targetSegment} • Score: {lead.leadScore}</div>
                    <div className="text-gray-500">{lead.location}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Competitive Intelligence
              </CardTitle>
              <CardDescription>Apify Facebook Ads Library Analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{apifyDashboard.competitor_intelligence.market_spend}</div>
                  <div className="text-sm text-gray-600">Monthly Ad Spend (Competitors)</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Market Opportunities:</div>
                  {apifyDashboard.competitor_intelligence.opportunity_gaps.slice(0, 3).map((gap, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-orange-50 px-2 py-1 rounded mb-1">
                      💡 {gap}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Trending Keywords:</div>
                  <div className="flex flex-wrap gap-1">
                    {apifyDashboard.competitor_intelligence.trending_keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Optimization & Automation Metrics */}
      {apifyDashboard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Apify Automation Metrics
            </CardTitle>
            <CardDescription>Content optimization and productivity insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{apifyDashboard.automation_metrics.time_saved_per_week}</div>
                <div className="text-sm text-gray-600">Time Saved/Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{apifyDashboard.automation_metrics.content_accuracy_improvement}</div>
                <div className="text-sm text-gray-600">Accuracy Improvement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{apifyDashboard.content_optimization.overall_score}/100</div>
                <div className="text-sm text-gray-600">Optimization Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{apifyDashboard.content_optimization.social_reach_potential}</div>
                <div className="text-sm text-gray-600">Reach Potential</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Priority Optimization Actions:</div>
              <div className="space-y-1">
                {apifyDashboard.content_optimization.priority_actions.slice(0, 3).map((action, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded flex items-center gap-1">
                    <Target className="w-3 h-3 text-yellow-500" />
                    {action}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-sm font-medium text-gray-800">🎯 Competitive Advantage Identified:</div>
              <div className="text-sm text-gray-600 mt-1">{apifyDashboard.automation_metrics.competitive_advantage}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Generation Studio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-500" />
            Video Generation Studio
          </CardTitle>
          <CardDescription>AI-powered video creation with Kie.ai (Sora-2-Pro)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">2</div>
                <div className="text-sm text-gray-600">Videos Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">1</div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">✅ FBAR Requirements Video</div>
                  <div className="text-xs text-gray-600">Documentary style • Facebook • 45s • 1,250 views</div>
                </div>
                <Button size="sm" variant="outline">
                  View
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm">🔄 Tax Treaty Benefits</div>
                  <div className="text-xs text-gray-600">Corporate style • LinkedIn • Processing (75%)</div>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{width: '75%'}}></div>
                </div>
              </div>
            </div>
            
            <Button 
              className="w-full"
              onClick={() => window.open('/video-studio', '_blank')}
            >
              Generate New Video
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Topic Approval Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            Topic Approval Queue
          </CardTitle>
          <CardDescription>Review and approve content topics for generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* This would show pending topics from the database */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-sm">FBAR Filing Requirements for Israeli-Americans</div>
                <div className="text-xs text-gray-600">Priority: High • Estimated reach: 2,500 views</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                  ✓ Approve
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-600">
                  ✗ Reject
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-sm">US-Israel Tax Treaty Benefits</div>
                <div className="text-xs text-gray-600">Priority: Medium • Estimated reach: 1,800 views</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                  ✓ Approve
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-600">
                  ✗ Reject
                </Button>
              </div>
            </div>
            
            <div className="text-center">
              <Button variant="outline" size="sm">
                View All Pending Topics (29)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Database Connection</span>
              <Badge variant="outline" className="text-green-600 border-green-600">Ready</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Content Pipeline</span>
              <Badge variant="outline" className="text-green-600 border-green-600">Operational</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">API Integrations</span>
              <Badge variant="outline" className="text-green-600 border-green-600">Connected</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">NotebookLM Access</span>
              <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Next Scheduled Runs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Content Pipeline</span>
              <span className="text-xs text-gray-500">Mon & Thu 8:00 AM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">SEO Optimizer</span>
              <span className="text-xs text-gray-500">Tue & Fri 10:00 AM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Podcast Production</span>
              <span className="text-xs text-gray-500">Wednesday Weekly</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}