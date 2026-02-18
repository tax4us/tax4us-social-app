/**
 * WordPress Publishing Service
 * Handles publishing content to WordPress using REST API with robust error handling
 */

import { ContentPiece } from './database'

export interface WordPressPost {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  excerpt: { rendered: string }
  slug: string
  status: 'draft' | 'publish' | 'private'
  featured_media: number
  categories: number[]
  tags: number[]
  meta: Record<string, any>
  link: string
}

export interface WordPressPublishOptions {
  status?: 'draft' | 'publish'
  featuredImageUrl?: string
  categories?: string[]
  tags?: string[]
  customFields?: Record<string, any>
  seoMeta?: {
    metaTitle?: string
    metaDescription?: string
    focusKeywords?: string[]
  }
}

class WordPressPublisher {
  private readonly baseURL: string
  private readonly username: string
  private readonly password: string
  private readonly timeout = 30000

  constructor() {
    this.baseURL = process.env.WORDPRESS_API_URL || 'https://tax4us.co.il/wp-json/wp/v2'
    this.username = process.env.WORDPRESS_APP_USERNAME || 'Shai'
    this.password = process.env.WORDPRESS_APP_PASSWORD || '0nm7^1l&PEN5HAWE7LSamBRu'

    if (!this.username || !this.password) {
      throw new Error('WordPress credentials not configured')
    }
  }

  /**
   * Publish content piece to WordPress
   */
  async publishContent(
    contentPiece: ContentPiece, 
    options: WordPressPublishOptions = {}
  ): Promise<{ postId: number; url: string; success: boolean }> {
    try {
      // First, upload featured image if provided
      let featuredMediaId: number | undefined
      if (options.featuredImageUrl || contentPiece.media_urls.featured_image) {
        const imageUrl = options.featuredImageUrl || contentPiece.media_urls.featured_image
        if (imageUrl && !imageUrl.includes('example.com')) {
          featuredMediaId = await this.uploadFeaturedImage(imageUrl, contentPiece.title_hebrew)
        }
      }

      // Prepare post data
      const postData = {
        title: contentPiece.title_hebrew,
        content: this.formatContentForWordPress(contentPiece),
        excerpt: this.generateExcerpt(contentPiece),
        status: options.status || 'publish',
        featured_media: featuredMediaId,
        categories: await this.getCategoryIds(options.categories || ['מס ארה"ב', 'ייעוץ מס']),
        tags: await this.getTagIds([...contentPiece.target_keywords, ...(options.tags || [])]),
        meta: {
          // Yoast SEO meta fields
          _yoast_wpseo_title: options.seoMeta?.metaTitle || contentPiece.title_hebrew,
          _yoast_wpseo_metadesc: options.seoMeta?.metaDescription || this.generateMetaDescription(contentPiece),
          _yoast_wpseo_focuskw: options.seoMeta?.focusKeywords?.[0] || contentPiece.target_keywords[0] || '',
          // Custom fields
          english_title: contentPiece.title_english,
          content_piece_id: contentPiece.id,
          topic_id: contentPiece.topic_id,
          seo_score: contentPiece.seo_score || 0,
          ...options.customFields
        }
      }

      const response = await this.apiRequest('/posts', {
        method: 'POST',
        body: JSON.stringify(postData)
      })

      const post: WordPressPost = await response.json()

      // Update post with additional media if available
      if (contentPiece.media_urls.blog_video && !contentPiece.media_urls.blog_video.includes('example.com')) {
        await this.addVideoToPost(post.id, contentPiece.media_urls.blog_video)
      }

      return {
        postId: post.id,
        url: post.link,
        success: true
      }

    } catch (error) {
      console.error('WordPress publishing failed:', error)
      throw new Error(`WordPress publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update existing WordPress post
   */
  async updatePost(
    postId: number, 
    contentPiece: ContentPiece, 
    options: WordPressPublishOptions = {}
  ): Promise<{ success: boolean; url: string }> {
    try {
      const updateData = {
        title: contentPiece.title_hebrew,
        content: this.formatContentForWordPress(contentPiece),
        excerpt: this.generateExcerpt(contentPiece),
        meta: {
          _yoast_wpseo_title: options.seoMeta?.metaTitle || contentPiece.title_hebrew,
          _yoast_wpseo_metadesc: options.seoMeta?.metaDescription || this.generateMetaDescription(contentPiece),
          seo_score: contentPiece.seo_score || 0,
          ...options.customFields
        }
      }

      const response = await this.apiRequest(`/posts/${postId}`, {
        method: 'POST',
        body: JSON.stringify(updateData)
      })

      const post: WordPressPost = await response.json()

      return {
        success: true,
        url: post.link
      }

    } catch (error) {
      console.error('WordPress update failed:', error)
      throw new Error(`WordPress update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get low SEO score posts for optimization
   */
  async getLowSEOPosts(threshold: number = 80, limit: number = 10): Promise<Array<{
    id: number
    title: string
    url: string
    seoScore: number
    contentPieceId?: string
  }>> {
    try {
      const response = await this.apiRequest(`/posts?per_page=${limit}&meta_key=seo_score&orderby=meta_value_num&order=asc`)
      const posts: WordPressPost[] = await response.json()

      return posts
        .filter(post => {
          const seoScore = parseInt(post.meta?.seo_score || '0')
          return seoScore < threshold
        })
        .map(post => ({
          id: post.id,
          title: post.title.rendered,
          url: post.link,
          seoScore: parseInt(post.meta?.seo_score || '0'),
          contentPieceId: post.meta?.content_piece_id
        }))

    } catch (error) {
      console.error('Failed to get low SEO posts:', error)
      return []
    }
  }

  /**
   * Upload featured image from URL
   */
  private async uploadFeaturedImage(imageUrl: string, title: string): Promise<number> {
    try {
      // First, fetch the image
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
      const extension = contentType.includes('png') ? 'png' : 'jpg'
      const filename = `${title.replace(/[^א-ת\w\s-]/g, '').substring(0, 50)}.${extension}`

      // Upload to WordPress Media Library
      const formData = new FormData()
      formData.append('file', new Blob([imageBuffer], { type: contentType }), filename)

      const uploadResponse = await this.apiRequest('/media', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set content-type for FormData
      })

      const media = await uploadResponse.json()
      return media.id

    } catch (error) {
      console.error('Featured image upload failed:', error)
      return 0 // Return 0 if upload fails, WordPress will handle gracefully
    }
  }

  /**
   * Get category IDs, creating categories if they don't exist
   */
  private async getCategoryIds(categoryNames: string[]): Promise<number[]> {
    try {
      const ids: number[] = []
      
      for (const name of categoryNames) {
        // Try to find existing category
        const searchResponse = await this.apiRequest(`/categories?search=${encodeURIComponent(name)}`)
        const categories = await searchResponse.json()
        
        let categoryId: number
        if (categories.length > 0) {
          categoryId = categories[0].id
        } else {
          // Create new category
          const createResponse = await this.apiRequest('/categories', {
            method: 'POST',
            body: JSON.stringify({ name, slug: name.replace(/[^\w\s-]/g, '').toLowerCase() })
          })
          const newCategory = await createResponse.json()
          categoryId = newCategory.id
        }
        
        ids.push(categoryId)
      }
      
      return ids
    } catch (error) {
      console.error('Failed to get category IDs:', error)
      return [1] // Return default "Uncategorized" category
    }
  }

  /**
   * Get tag IDs, creating tags if they don't exist
   */
  private async getTagIds(tagNames: string[]): Promise<number[]> {
    try {
      const ids: number[] = []
      
      for (const name of tagNames) {
        // Try to find existing tag
        const searchResponse = await this.apiRequest(`/tags?search=${encodeURIComponent(name)}`)
        const tags = await searchResponse.json()
        
        let tagId: number
        if (tags.length > 0) {
          tagId = tags[0].id
        } else {
          // Create new tag
          const createResponse = await this.apiRequest('/tags', {
            method: 'POST',
            body: JSON.stringify({ name, slug: name.replace(/[^\w\s-]/g, '').toLowerCase() })
          })
          const newTag = await createResponse.json()
          tagId = newTag.id
        }
        
        ids.push(tagId)
      }
      
      return ids
    } catch (error) {
      console.error('Failed to get tag IDs:', error)
      return []
    }
  }

  /**
   * Format content for WordPress with proper HTML structure
   */
  private formatContentForWordPress(contentPiece: ContentPiece): string {
    let content = contentPiece.content_hebrew || ''
    
    // If we have Gutenberg JSON, use that for rich formatting
    if (contentPiece.gutenberg_json) {
      try {
        const blocks = JSON.parse(contentPiece.gutenberg_json)
        // Convert Gutenberg blocks to HTML
        content = this.convertGutenbergToHTML(blocks)
      } catch (error) {
        console.error('Failed to parse Gutenberg JSON:', error)
      }
    }

    // Add video embed if available
    if (contentPiece.media_urls.blog_video && !contentPiece.media_urls.blog_video.includes('example.com')) {
      content = `<!-- wp:embed {"url":"${contentPiece.media_urls.blog_video}"} -->
<figure class="wp-block-embed"><div class="wp-block-embed__wrapper">
${contentPiece.media_urls.blog_video}
</div></figure>
<!-- /wp:embed -->\n\n${content}`
    }

    return content
  }

  /**
   * Convert Gutenberg blocks to HTML
   */
  private convertGutenbergToHTML(blocks: any[]): string {
    return blocks.map(block => {
      switch (block.blockName) {
        case 'core/paragraph':
          return `<p>${block.innerHTML || ''}</p>`
        case 'core/heading':
          const level = block.attrs?.level || 2
          return `<h${level}>${block.innerHTML || ''}</h${level}>`
        case 'core/list':
          const listType = block.attrs?.ordered ? 'ol' : 'ul'
          return `<${listType}>${block.innerHTML || ''}</${listType}>`
        default:
          return block.innerHTML || ''
      }
    }).join('\n\n')
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(contentPiece: ContentPiece): string {
    const content = contentPiece.content_hebrew || contentPiece.title_hebrew
    const cleanText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ')
    return cleanText.length > 155 ? cleanText.substring(0, 152) + '...' : cleanText
  }

  /**
   * Generate meta description for SEO
   */
  private generateMetaDescription(contentPiece: ContentPiece): string {
    const content = contentPiece.content_hebrew || contentPiece.title_hebrew
    const cleanText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ')
    const description = cleanText.length > 160 ? cleanText.substring(0, 157) + '...' : cleanText
    
    // Ensure it includes primary keyword
    const primaryKeyword = contentPiece.target_keywords[0]
    if (primaryKeyword && !description.includes(primaryKeyword)) {
      return `${primaryKeyword}: ${description.substring(primaryKeyword.length + 2)}`
    }
    
    return description
  }

  /**
   * Add video to existing post
   */
  private async addVideoToPost(postId: number, videoUrl: string): Promise<void> {
    try {
      // Get current post content
      const response = await this.apiRequest(`/posts/${postId}`)
      const post: WordPressPost = await response.json()
      
      // Add video embed block to the beginning
      const videoEmbed = `<!-- wp:embed {"url":"${videoUrl}"} -->
<figure class="wp-block-embed"><div class="wp-block-embed__wrapper">
${videoUrl}
</div></figure>
<!-- /wp:embed -->\n\n`

      const updatedContent = videoEmbed + post.content.rendered

      await this.apiRequest(`/posts/${postId}`, {
        method: 'POST',
        body: JSON.stringify({ content: updatedContent })
      })

    } catch (error) {
      console.error('Failed to add video to post:', error)
    }
  }

  /**
   * Make authenticated API request to WordPress
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64')

    const config: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`WordPress API error ${response.status}: ${errorText}`)
    }

    return response
  }

  /**
   * Test WordPress connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiRequest('/posts?per_page=1')
      const posts = await response.json()
      
      return {
        success: true,
        message: `Connected successfully. Found ${posts.length > 0 ? posts.length : 'no'} posts.`
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown connection error'
      }
    }
  }
}

export const wordPressPublisher = new WordPressPublisher()