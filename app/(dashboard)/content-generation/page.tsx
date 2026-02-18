"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Video, Image, Mic, Upload, CheckCircle2, AlertCircle, FileText } from "lucide-react"
import { ContentGenerationResponse } from '@/lib/services/content-generation'

const CONTENT_TYPES = [
  { value: 'article', label: 'Tax Article (Bilingual)', icon: FileText },
  { value: 'social-post', label: 'Social Media Post', icon: Video },
  { value: 'video', label: 'Educational Video', icon: Video },
  { value: 'podcast', label: 'Podcast Episode', icon: Mic },
  { value: 'image-to-video', label: 'Visual Explanation', icon: Video },
  { value: 'text-to-speech', label: 'Voice Content', icon: Mic },
  { value: 'image', label: 'Infographic/Visual', icon: Image },
]

const SOCIAL_PLATFORMS = [
  'tiktok', 'instagram', 'youtube', 'twitter', 'facebook', 'linkedin'
]

export default function ContentGenerationPage() {
  const [contentType, setContentType] = useState('')
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [voice, setVoice] = useState('')
  const [language, setLanguage] = useState('english')
  const [targetKeywords, setTargetKeywords] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<ContentGenerationResponse | null>(null)
  
  // Social media upload state
  const [title, setTitle] = useState('')
  const [user, setUser] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<ContentGenerationResponse | null>(null)

  const handleGenerate = async () => {
    if (!contentType || !prompt) return

    setIsGenerating(true)
    setGenerationResult(null)

    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          prompt,
          language,
          targetKeywords,
          seoTitle,
          imageUrl: contentType === 'image-to-video' ? imageUrl : undefined,
          voice: contentType === 'text-to-speech' ? voice : undefined
        })
      })

      const result = await response.json()
      setGenerationResult(result)

      if (result.status === 'processing') {
        pollTaskStatus(result.id, contentType as any)
      }
    } catch (error) {
      console.error('Generation failed:', error)
      setGenerationResult({
        id: '',
        status: 'failed',
        error: 'Generation failed'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const pollTaskStatus = async (taskId: string, type: string) => {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setGenerationResult(prev => prev ? {...prev, status: 'failed', error: 'Timeout'} : null)
        return
      }

      try {
        const response = await fetch(`/api/content/status/${taskId}?type=${type}`)
        const result = await response.json()
        
        setGenerationResult(result)

        if (result.status === 'processing') {
          attempts++
          setTimeout(poll, 2000)
        }
      } catch (error) {
        console.error('Status check failed:', error)
        setGenerationResult(prev => prev ? {...prev, status: 'failed', error: 'Status check failed'} : null)
      }
    }

    poll()
  }

  const handleUpload = async () => {
    if (!generationResult?.result?.url || !title || !user || selectedPlatforms.length === 0) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('content', generationResult.result.url)
      formData.append('title', title)
      formData.append('user', user)
      selectedPlatforms.forEach(platform => {
        formData.append('platform', platform)
      })

      const response = await fetch('/api/social/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      setUploadResult(result)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadResult({
        id: '',
        status: 'failed',
        error: 'Upload failed'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tax4US Content Factory</h1>
        <p className="text-gray-600 mt-2">AI-powered bilingual content generation for cross-border tax education and client acquisition</p>
        <div className="flex gap-4 mt-3 text-sm text-gray-500">
          <span>📊 Target: 4 articles/week</span>
          <span>📱 4 social posts/week</span>
          <span>🎙️ 2 podcast episodes/week</span>
          <span>🎥 6+ video assets/week</span>
        </div>
      </div>

      {/* Content Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Generate Content
          </CardTitle>
          <CardDescription>
            Create videos, images, and audio content using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Content Type</label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">🇺🇸 English</SelectItem>
                  <SelectItem value="hebrew">🇮🇱 עברית</SelectItem>
                  <SelectItem value="bilingual">🌍 Bilingual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contentType === 'image-to-video' && (
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            )}

            {contentType === 'text-to-speech' && (
              <div>
                <label className="text-sm font-medium">Voice (optional)</label>
                <Input
                  placeholder="default"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Content Topic/Prompt</label>
            <Textarea
              placeholder="Describe the tax topic or content you want to generate... (e.g., 'FBAR filing requirements for dual citizens')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* SEO Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">SEO Title (Optional)</label>
              <Input
                placeholder="SEO-optimized title for articles"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Target Keywords</label>
              <Input
                placeholder="us tax israel, fbar, dual citizenship"
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={!contentType || !prompt || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Content'
            )}
          </Button>

          {/* Generation Result */}
          {generationResult && (
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {generationResult.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {generationResult.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {generationResult.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Badge variant={
                    generationResult.status === 'completed' ? 'default' :
                    generationResult.status === 'failed' ? 'destructive' : 'secondary'
                  }>
                    {generationResult.status}
                  </Badge>
                </div>
                {generationResult.error && (
                  <p className="text-sm text-red-600">{generationResult.error}</p>
                )}
                {generationResult.result?.url && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Generated content:</p>
                    <a 
                      href={generationResult.result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Content
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Social Media Upload Section */}
      {generationResult?.status === 'completed' && generationResult.result?.url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload to Social Media
            </CardTitle>
            <CardDescription>
              Share your generated content to social media platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Content title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">User</label>
                <Input
                  placeholder="Username"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_PLATFORMS.map(platform => (
                  <Badge
                    key={platform}
                    variant={selectedPlatforms.includes(platform) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleUpload}
              disabled={!title || !user || selectedPlatforms.length === 0 || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload to Social Media'
              )}
            </Button>

            {/* Upload Result */}
            {uploadResult && (
              <Card className="mt-4">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {uploadResult.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {uploadResult.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    <Badge variant={uploadResult.status === 'completed' ? 'default' : 'destructive'}>
                      {uploadResult.status}
                    </Badge>
                  </div>
                  {uploadResult.error && (
                    <p className="text-sm text-red-600">{uploadResult.error}</p>
                  )}
                  {uploadResult.status === 'completed' && (
                    <p className="text-sm text-green-600">Successfully uploaded to social media!</p>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}