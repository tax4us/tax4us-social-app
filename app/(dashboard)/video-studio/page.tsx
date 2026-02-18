"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Video, 
  Play, 
  Clock, 
  Download, 
  Eye,
  Sparkles,
  CheckCircle2
} from "lucide-react"

export default function VideoStudioPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentTask, setCurrentTask] = useState<string | null>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [previewModal, setPreviewModal] = useState<{show: boolean, videoId: string, title: string, isPlaceholder: boolean}>({
    show: false, videoId: '', title: '', isPlaceholder: false
  })

  // Load videos on component mount
  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/video/generate')
      const data = await response.json()
      if (data.success) {
        setVideos(data.videos || [])
      }
    } catch (error) {
      console.error('Failed to load videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const previewVideo = (videoId: string, videoUrl?: string, title: string = 'Video') => {
    if (videoUrl && !videoUrl.includes('example.com')) {
      // Real video URL - open in new tab
      window.open(videoUrl, '_blank')
    } else {
      // Show preview modal for placeholder videos
      setPreviewModal({
        show: true,
        videoId,
        title,
        isPlaceholder: true
      })
    }
  }

  const downloadVideo = (videoId: string, videoUrl?: string) => {
    if (videoUrl && !videoUrl.includes('example.com')) {
      // Real video URL - download it
      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `tax4us-video-${videoId}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      alert(`Download not available for video ${videoId}\n\nThis is a demo placeholder video.\n\nTo generate and download real videos:\n1. Use the "Generate Video" buttons above\n2. Wait for processing to complete\n3. Return to download the actual video file`)
    }
  }

  const generateVideo = async (title: string, excerpt: string, style: string, platform: string) => {
    setIsGenerating(true)
    setCurrentTask(null)
    
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, excerpt, style, platform })
      })
      
      const data = await response.json()
      if (data.success) {
        setCurrentTask(data.taskId)
        
        // Start polling for video status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(data.pollUrl)
            const statusData = await statusResponse.json()
            
            if (statusData.status === 'completed') {
              clearInterval(pollInterval)
              setIsGenerating(false)
              setCurrentTask(null)
              // Refresh videos list
              await loadVideos()
              alert(`Video "${title}" completed successfully!`)
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval)
              setIsGenerating(false) 
              setCurrentTask(null)
              alert(`Video generation failed: ${statusData.error || 'Unknown error'}`)
            }
          } catch (error) {
            console.error('Status polling failed:', error)
          }
        }, 10000) // Poll every 10 seconds
        
        // Stop polling after 10 minutes
        setTimeout(() => {
          clearInterval(pollInterval)
          setIsGenerating(false)
          setCurrentTask(null)
        }, 600000)
        
      } else {
        throw new Error(data.error || 'Generation failed')
      }
    } catch (error) {
      console.error('Video generation failed:', error)
      alert(`Failed to start video generation: ${error}`)
      setIsGenerating(false)
      setCurrentTask(null)
    }
  }

  const handleQuickGenerate = (topic: string) => {
    const configs = {
      'fbar': {
        title: 'FBAR Filing Requirements for Israeli-Americans',
        excerpt: 'Essential tax compliance requirements every Israeli-American must know about foreign bank account reporting',
        style: 'documentary',
        platform: 'facebook'
      },
      'treaty': {
        title: 'US-Israel Tax Treaty Benefits Explained', 
        excerpt: 'How to leverage the US-Israel tax treaty to minimize your tax burden legally',
        style: 'corporate',
        platform: 'linkedin'
      },
      'dual': {
        title: 'Dual Citizenship Tax Implications',
        excerpt: 'Navigate the complex tax obligations of holding both Israeli and American citizenship',
        style: 'documentary', 
        platform: 'facebook'
      }
    }
    
    const config = configs[topic as keyof typeof configs]
    if (config) {
      generateVideo(config.title, config.excerpt, config.style, config.platform)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Generation Studio</h1>
          <p className="text-gray-600">Create engaging tax education videos with AI</p>
        </div>
        <Badge variant="outline" className="text-purple-600 border-purple-600">
          Powered by Kie.ai Sora-2-Pro
        </Badge>
      </div>

      {/* Quick Generate Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Quick Generate
          </CardTitle>
          <CardDescription>Generate videos for popular tax topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => handleQuickGenerate('fbar')}
              disabled={isGenerating}
              className="h-auto p-4 flex flex-col items-start space-y-2"
              variant="outline"
            >
              <div className="font-medium">FBAR Requirements</div>
              <div className="text-xs text-gray-600 text-left">Documentary style • Facebook</div>
              <div className="text-xs text-purple-600">🎥 Generate Video</div>
            </Button>

            <Button 
              onClick={() => handleQuickGenerate('treaty')}
              disabled={isGenerating}
              className="h-auto p-4 flex flex-col items-start space-y-2"
              variant="outline"
            >
              <div className="font-medium">Tax Treaty Benefits</div>
              <div className="text-xs text-gray-600 text-left">Corporate style • LinkedIn</div>
              <div className="text-xs text-purple-600">🎥 Generate Video</div>
            </Button>

            <Button 
              onClick={() => handleQuickGenerate('dual')}
              disabled={isGenerating}
              className="h-auto p-4 flex flex-col items-start space-y-2"
              variant="outline"
            >
              <div className="font-medium">Dual Citizenship</div>
              <div className="text-xs text-gray-600 text-left">Documentary style • Facebook</div>
              <div className="text-xs text-purple-600">🎥 Generate Video</div>
            </Button>
          </div>

          {isGenerating && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-purple-500" />
                <span className="text-purple-700">Generating video... This may take 2-5 minutes</span>
              </div>
              {currentTask && (
                <div className="text-xs text-purple-600 mt-1">Task ID: {currentTask}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            Recent Videos
          </CardTitle>
          <CardDescription>Your generated video content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                <div className="text-gray-600">Loading videos...</div>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <div className="text-gray-600 mb-2">No videos generated yet</div>
                <div className="text-sm text-gray-500">Click "Generate Video" above to create your first video</div>
              </div>
            ) : (
              videos.map((video) => (
                <div 
                  key={video.id} 
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    video.status === 'processing' ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-12 rounded flex items-center justify-center ${
                      video.status === 'processing' 
                        ? 'bg-gradient-to-r from-orange-400 to-red-500'
                        : video.status === 'completed'
                        ? 'bg-gradient-to-r from-green-400 to-blue-500'
                        : 'bg-gradient-to-r from-red-400 to-red-600'
                    }`}>
                      {video.status === 'processing' ? (
                        <Clock className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Play className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{video.title}</div>
                      <div className="text-sm text-gray-600">
                        {video.style} • {video.platform} • {video.metadata?.duration || '45s'} • {
                          video.status === 'processing' ? 'Processing...' : 
                          new Date(video.createdAt).toLocaleDateString()
                        }
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {video.metadata?.views && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Eye className="w-3 h-3" />
                            {video.metadata.views} views
                          </div>
                        )}
                        <div className={`flex items-center gap-1 text-xs ${
                          video.videoUrl ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {video.videoUrl ? 'Real Video' : 'Demo Placeholder'}
                        </div>
                      </div>
                      
                      {video.status === 'processing' && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" 
                                 style={{width: '75%'}}></div>
                          </div>
                          <span className="text-xs text-orange-600">75%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {video.status === 'processing' ? (
                    <div className="text-sm text-orange-600">
                      ~2 min remaining
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => previewVideo(video.id, video.videoUrl, video.title)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadVideo(video.id, video.videoUrl)}
                        disabled={!video.videoUrl}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Generation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">12</div>
            <div className="text-sm text-gray-600">Videos Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">3.2K</div>
            <div className="text-sm text-gray-600">Total Views</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">8.5%</div>
            <div className="text-sm text-gray-600">Avg Engagement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">2</div>
            <div className="text-sm text-gray-600">Processing</div>
          </CardContent>
        </Card>
      </div>

      {/* Video Preview Modal */}
      {previewModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Video Preview</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setPreviewModal({show: false, videoId: '', title: '', isPlaceholder: false})}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-16 bg-gradient-to-r from-purple-400 to-blue-500 rounded mx-auto flex items-center justify-center mb-3">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-medium">{previewModal.title}</h4>
                <p className="text-sm text-gray-600 mt-1">Video ID: {previewModal.videoId}</p>
              </div>

              {previewModal.isPlaceholder && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-orange-800 font-medium text-sm mb-2">📋 Demo Placeholder Video</div>
                  <div className="text-orange-700 text-sm space-y-2">
                    <p>This is a demonstration placeholder. To access real videos:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      <li>Click "Generate New Video" above</li>
                      <li>Wait for Kie.ai processing (2-5 minutes)</li>
                      <li>Return to preview the actual video</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => setPreviewModal({show: false, videoId: '', title: '', isPlaceholder: false})}
                >
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setPreviewModal({show: false, videoId: '', title: '', isPlaceholder: false})
                    // Scroll to generation section
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Generate Real Video
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}