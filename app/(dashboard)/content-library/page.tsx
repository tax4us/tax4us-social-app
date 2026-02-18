"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  Globe, 
  BarChart3, 
  ExternalLink,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Languages,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Tag
} from "lucide-react"

interface ContentPiece {
  id: string
  topic_id: string
  title_english: string
  title_hebrew: string
  content_english?: string
  content_hebrew?: string
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

interface Topic {
  id: string
  title_english: string
  title_hebrew: string
  priority: 'high' | 'medium' | 'low'
  tags: string[]
}

export default function ContentLibraryPage() {
  const [contentPieces, setContentPieces] = useState<ContentPiece[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [minSeoScore, setMinSeoScore] = useState<number>(0)
  const [selectedTag, setSelectedTag] = useState<string>('all')
  
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch content pieces
      const contentResponse = await fetch('/api/content/library')
      if (contentResponse.ok) {
        const contentData = await contentResponse.json()
        if (contentData.success) {
          setContentPieces(contentData.content_pieces || [])
        }
      }

      // Fetch topics for reference
      const topicsResponse = await fetch('/api/topics')
      if (topicsResponse.ok) {
        const topicsData = await topicsResponse.json()
        if (topicsData.success) {
          setTopics(topicsData.topics || [])
        }
      }
    } catch (error) {
      console.error('Failed to fetch content library data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter content pieces based on search criteria
  const filteredContent = contentPieces.filter(piece => {
    const matchesSearch = !searchTerm || 
      piece.title_english.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.title_hebrew.includes(searchTerm) ||
      piece.target_keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = selectedStatus === 'all' || piece.status === selectedStatus

    const matchesLanguage = selectedLanguage === 'all' || 
      (selectedLanguage === 'english' && piece.content_english) ||
      (selectedLanguage === 'hebrew' && piece.content_hebrew) ||
      (selectedLanguage === 'bilingual' && piece.content_english && piece.content_hebrew)

    const matchesSeoScore = !piece.seo_score || piece.seo_score >= minSeoScore

    const topicForPiece = topics.find(t => t.id === piece.topic_id)
    const matchesPriority = selectedPriority === 'all' || topicForPiece?.priority === selectedPriority

    const matchesTag = selectedTag === 'all' || 
      piece.target_keywords.some(keyword => keyword.toLowerCase().includes(selectedTag.toLowerCase())) ||
      topicForPiece?.tags.some(tag => tag.toLowerCase().includes(selectedTag.toLowerCase()))

    return matchesSearch && matchesStatus && matchesLanguage && matchesSeoScore && matchesPriority && matchesTag
  })

  // Get all unique tags for filter dropdown
  const allTags = Array.from(new Set([
    ...contentPieces.flatMap(piece => piece.target_keywords),
    ...topics.flatMap(topic => topic.tags)
  ])).filter(Boolean)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-blue-500" />
      case 'pending_approval': return <Clock className="w-4 h-4 text-orange-500" />
      case 'draft': return <AlertCircle className="w-4 h-4 text-gray-500" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'pending_approval': return 'bg-orange-100 text-orange-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeoScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800'
    if (score >= 90) return 'bg-green-100 text-green-800'
    if (score >= 80) return 'bg-blue-100 text-blue-800'
    if (score >= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const stats = {
    total: contentPieces.length,
    published: contentPieces.filter(p => p.status === 'published').length,
    avgSeoScore: contentPieces.length > 0 
      ? Math.round(contentPieces.reduce((sum, p) => sum + (p.seo_score || 0), 0) / contentPieces.length)
      : 0,
    withMedia: contentPieces.filter(p => 
      p.media_urls.featured_image || p.media_urls.blog_video || p.media_urls.social_video || p.media_urls.podcast_audio
    ).length
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Content Library</h2>
          <p className="text-muted-foreground">
            Search and manage all your generated content across languages and formats
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Content</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{stats.published}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg SEO Score</p>
                <p className="text-2xl font-bold">{stats.avgSeoScore}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Media</p>
                <p className="text-2xl font-bold">{stats.withMedia}</p>
              </div>
              <Globe className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Find specific content using search and filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search titles, keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="english">English Only</SelectItem>
                <SelectItem value="hebrew">Hebrew Only</SelectItem>
                <SelectItem value="bilingual">Bilingual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger>
                <SelectValue placeholder="Tag/Keyword" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.slice(0, 20).map(tag => (
                  <SelectItem key={tag} value={tag.toLowerCase()}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Min SEO Score: {minSeoScore}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={minSeoScore}
              onChange={(e) => setMinSeoScore(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {filteredContent.length} content pieces found
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading content library...</span>
          </div>
        ) : filteredContent.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No content found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredContent.map((piece) => {
              const relatedTopic = topics.find(t => t.id === piece.topic_id)
              
              return (
                <Card key={piece.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {piece.title_english}
                        </CardTitle>
                        {piece.title_hebrew && (
                          <p className="text-sm text-muted-foreground text-right" dir="rtl">
                            {piece.title_hebrew}
                          </p>
                        )}
                      </div>
                      {getStatusIcon(piece.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(piece.status)}>
                        {piece.status.replace('_', ' ')}
                      </Badge>
                      {piece.seo_score && (
                        <Badge className={getSeoScoreColor(piece.seo_score)}>
                          SEO: {piece.seo_score}
                        </Badge>
                      )}
                      {relatedTopic && (
                        <Badge variant="outline">
                          {relatedTopic.priority}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {/* Language indicators */}
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4 text-muted-foreground" />
                        <div className="flex gap-1">
                          {piece.content_english && <Badge variant="outline">EN</Badge>}
                          {piece.content_hebrew && <Badge variant="outline">עב</Badge>}
                        </div>
                      </div>

                      {/* Keywords */}
                      {piece.target_keywords.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Keywords</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {piece.target_keywords.slice(0, 3).map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {piece.target_keywords.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{piece.target_keywords.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Media indicators */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(piece.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Media URLs */}
                      {(piece.media_urls.featured_image || piece.media_urls.blog_video || 
                        piece.media_urls.social_video || piece.media_urls.podcast_audio) && (
                        <div className="flex gap-2 pt-2 border-t">
                          {piece.media_urls.featured_image && <Badge variant="outline">Image</Badge>}
                          {piece.media_urls.blog_video && <Badge variant="outline">Blog Video</Badge>}
                          {piece.media_urls.social_video && <Badge variant="outline">Social Video</Badge>}
                          {piece.media_urls.podcast_audio && <Badge variant="outline">Podcast</Badge>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {piece.wordpress_post_id && (
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}