"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, Clock, TrendingUp, Volume2 } from "lucide-react"
import { useEffect, useState } from "react"

interface PodcastAnalytics {
  totalEpisodes: number
  weeklyEpisodes: number
  averageDuration: string
  listenerGrowth: number
  productionStatus: 'active' | 'scheduled' | 'idle'
  nextScheduled: string
  recentEpisodes: Array<{
    title: string
    duration: string
    status: 'published' | 'draft' | 'processing'
    publishedAt: string
  }>
}

export function PodcastAnalytics() {
  const [analytics, setAnalytics] = useState<PodcastAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPodcastAnalytics()
  }, [])

  const fetchPodcastAnalytics = async () => {
    try {
      // Mock data for now - in production would fetch from Captivate API
      const mockAnalytics: PodcastAnalytics = {
        totalEpisodes: 23,
        weeklyEpisodes: 2,
        averageDuration: "7:30",
        listenerGrowth: 15.3,
        productionStatus: 'active',
        nextScheduled: 'Wednesday 2:00 PM',
        recentEpisodes: [
          {
            title: "Remote Work Tax Obligations for Israeli-Americans",
            duration: "7:20",
            status: 'published',
            publishedAt: new Date().toISOString()
          },
          {
            title: "FBAR Filing Requirements Update 2026",
            duration: "8:45",
            status: 'published', 
            publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            title: "Tax4Us Wednesday Test Episode",
            duration: "5:12",
            status: 'draft',
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
      
      setAnalytics(mockAnalytics)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch podcast analytics:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Podcast Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Podcast Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load podcast analytics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Tax4Us Weekly Podcast
        </CardTitle>
        <CardDescription>
          Automated podcast production analytics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{analytics.totalEpisodes}</div>
            <div className="text-xs text-muted-foreground">Total Episodes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.weeklyEpisodes}</div>
            <div className="text-xs text-muted-foreground">Weekly Episodes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{analytics.averageDuration}</div>
            <div className="text-xs text-muted-foreground">Avg Duration</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">+{analytics.listenerGrowth}%</div>
            <div className="text-xs text-muted-foreground">Growth</div>
          </div>
        </div>

        {/* Production Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Production Status</span>
            <Badge 
              variant={analytics.productionStatus === 'active' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {analytics.productionStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Next scheduled: {analytics.nextScheduled}
          </div>
        </div>

        {/* Recent Episodes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Recent Episodes
          </h4>
          <div className="space-y-2">
            {analytics.recentEpisodes.map((episode, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{episode.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {episode.duration} • {new Date(episode.publishedAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge 
                  variant={
                    episode.status === 'published' ? 'default' : 
                    episode.status === 'processing' ? 'secondary' : 
                    'outline'
                  }
                  className="ml-2"
                >
                  {episode.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Automation Health */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Automation Health</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: '95%'}}></div>
            </div>
            <span className="text-xs font-medium text-green-600">95%</span>
          </div>
          <div className="text-xs text-muted-foreground">
            ElevenLabs: Connected • Captivate: Ready • Schedule: Active
          </div>
        </div>
      </CardContent>
    </Card>
  )
}