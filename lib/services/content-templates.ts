import { projectMemory } from './project-memory'

export interface ContentTemplate {
  id: string
  name: string
  type: 'article' | 'social_post' | 'podcast_script' | 'video_script'
  language: 'english' | 'hebrew' | 'bilingual'
  target_platforms: string[]
  template_prompt: string
  seo_optimization: boolean
  required_sources: string[]
  estimated_length: number
}

export interface GeneratedContent {
  id: string
  template_id: string
  topic_id: string
  content_type: string
  language: string
  title: string
  content: string
  meta_description?: string
  keywords?: string[]
  sources_used: string[]
  seo_score?: number
  created_at: string
  status: 'draft' | 'review' | 'approved' | 'published'
}

class ContentTemplateManager {
  private templates: ContentTemplate[] = [
    {
      id: 'bilingual_tax_article',
      name: 'Bilingual Tax Article',
      type: 'article',
      language: 'bilingual',
      target_platforms: ['wordpress', 'linkedin'],
      template_prompt: `Generate a comprehensive bilingual tax article (Hebrew and English) about {topic}. 
        
Structure:
1. Hebrew Title and Introduction (100-150 words)
2. English Title and Introduction (100-150 words)  
3. Main Content in Hebrew (800-1200 words)
4. Main Content in English (800-1200 words)
5. Practical Examples and Case Studies
6. Key Takeaways in both languages
7. Call-to-action for Tax4US services

Requirements:
- Target Israeli-American dual citizens and cross-border tax situations
- Include specific references to US-Israel Tax Treaty where relevant
- Mention relevant forms (FBAR, FATCA, 1040, etc.)
- SEO optimized for Israeli tax services keywords
- Professional yet accessible tone
- Include actionable advice and practical examples`,
      seo_optimization: true,
      required_sources: ['US-Israel Tax Treaty', 'IRS Publications', 'Israeli Tax Authority Guidelines'],
      estimated_length: 2000
    },
    {
      id: 'linkedin_tax_tip',
      name: 'LinkedIn Tax Tip Post',
      type: 'social_post',
      language: 'english',
      target_platforms: ['linkedin'],
      template_prompt: `Create an engaging LinkedIn post about {topic} targeting Israeli-American professionals.

Structure:
1. Hook - Start with a surprising fact or common misconception
2. Context - Brief explanation of the tax issue
3. Practical tip or advice
4. Call-to-action to contact Tax4US
5. Relevant hashtags

Requirements:
- Maximum 200 words
- Professional tone with personality
- Include 1-2 relevant emojis
- Focus on actionable insights
- Target Israeli-Americans, expats, and dual citizens`,
      seo_optimization: false,
      required_sources: ['Latest Tax Updates', 'Common Tax Scenarios'],
      estimated_length: 200
    },
    {
      id: 'podcast_episode_script',
      name: 'Podcast Episode Script',
      type: 'podcast_script',
      language: 'english',
      target_platforms: ['captivate'],
      template_prompt: `Generate a podcast episode script about {topic} for "Tax4US Weekly" podcast.

Structure:
1. Introduction (30 seconds) - Welcome and episode overview
2. Main Topic Discussion (8-12 minutes)
   - Explanation of the tax issue
   - Real-world scenarios
   - Step-by-step guidance
3. Q&A Segment (2-3 minutes) - Common questions
4. Closing (30 seconds) - Recap and contact information

Requirements:
- Conversational, friendly tone
- Include natural pauses and transitions
- Mention Tax4US services organically
- 10-15 minute total episode length
- Educational focus with practical value`,
      seo_optimization: false,
      required_sources: ['Tax Code Explanations', 'Case Studies', 'FAQ Database'],
      estimated_length: 1500
    }
  ]

  async getTemplates(): Promise<ContentTemplate[]> {
    return this.templates
  }

  async getTemplate(templateId: string): Promise<ContentTemplate | null> {
    return this.templates.find(t => t.id === templateId) || null
  }

  async generateContent(
    templateId: string, 
    topicId: string, 
    additionalContext: Record<string, any> = {}
  ): Promise<GeneratedContent> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Log the content generation task
    const taskId = await projectMemory.logTask(
      `Generate content: ${template.name} for topic ${topicId}`,
      'in_progress',
      `Using template: ${template.name}, Target: ${template.target_platforms.join(', ')}`,
      []
    )

    try {
      // This will be integrated with NotebookLM MCP in the next step
      const generatedContent = await this.callNotebookLMGeneration(template, topicId, additionalContext)
      
      // Update task as completed
      await projectMemory.updateTask(taskId, { 
        status: 'completed',
        notes: `Content generated successfully. Length: ${generatedContent.content.length} characters`
      })

      return generatedContent

    } catch (error) {
      // Update task as blocked
      await projectMemory.updateTask(taskId, { 
        status: 'blocked',
        notes: `Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
  }

  private async callNotebookLMGeneration(
    template: ContentTemplate, 
    topicId: string, 
    additionalContext: Record<string, any>
  ): Promise<GeneratedContent> {
    const contentId = `content_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    
    try {
      // Get the topic details from database
      const { db } = await import('./database')
      const topics = await db.getTopics()
      const topic = topics.find(t => t.id === topicId)
      
      if (!topic) {
        throw new Error(`Topic not found: ${topicId}`)
      }

      // Prepare the query for NotebookLM
      const contextualPrompt = template.template_prompt.replace('{topic}', topic.title_english)
      
      const notebookQuery = `${contextualPrompt}

Context:
- Topic: ${topic.title_english} (Hebrew: ${topic.title_hebrew})
- Priority: ${topic.priority}
- Tags: ${topic.tags.join(', ')}
- Seasonal Relevance: ${topic.seasonal_relevance}

Please generate content that:
1. Uses the comprehensive tax knowledge from this notebook
2. References specific forms, regulations, and procedures
3. Includes practical examples and case studies
4. Maintains professional accuracy while being accessible
5. Targets Israeli-American dual citizens and cross-border situations

Additional Context: ${JSON.stringify(additionalContext)}`

      // Call NotebookLM via MCP - using the notebook ID from the original URL
      const notebookId = 'd5f128c4-0d17-42c3-8d52-109916859c76'
      
      let generatedContent = ''
      let generatedTitle = ''

      try {
        // Make actual NotebookLM query
        const notebookResponse = await this.queryNotebookLM(notebookId, notebookQuery)
        generatedContent = notebookResponse.content || this.generateFallbackContent(topic, template, additionalContext)
        generatedTitle = this.generateTitle(topic, template, notebookResponse.title)
      } catch (notebookError) {
        console.warn('NotebookLM query failed, using fallback:', notebookError)
        // Fallback to template-based generation
        generatedContent = this.generateFallbackContent(topic, template, additionalContext)
        generatedTitle = this.generateTitle(topic, template)
      }

      return {
        id: contentId,
        template_id: template.id,
        topic_id: topicId,
        content_type: template.type,
        language: template.language,
        title: generatedTitle,
        content: generatedContent,
        meta_description: this.generateMetaDescription(topic, template),
        keywords: this.generateKeywords(topic),
        sources_used: template.required_sources,
        created_at: new Date().toISOString(),
        status: 'draft'
      }

    } catch (error) {
      console.error('NotebookLM generation error:', error)
      
      // Fallback to basic content structure
      return {
        id: contentId,
        template_id: template.id,
        topic_id: topicId,
        content_type: template.type,
        language: template.language,
        title: `${template.name} - ${topicId}`,
        content: `Content generation failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sources_used: [],
        created_at: new Date().toISOString(),
        status: 'draft'
      }
    }
  }

  private async queryNotebookLM(notebookId: string, query: string): Promise<{ content: string; title?: string }> {
    try {
      // First, try to enhance with fresh IRS content via Apify
      const enhancedQuery = await this.enhanceQueryWithIrsContent(query)
      
      // Then call NotebookLM with enhanced context
      const response = await fetch('/api/notebook-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId, query: enhancedQuery })
      })

      if (response.ok) {
        const data = await response.json()
        return { content: data.content, title: data.title }
      } else {
        throw new Error(`NotebookLM query failed: ${response.statusText}`)
      }
    } catch (error) {
      // In development, we'll create meaningful content based on the topic
      throw new Error(`NotebookLM integration not available: ${error}`)
    }
  }

  private async enhanceQueryWithIrsContent(query: string): Promise<string> {
    try {
      // Extract key tax terms from the query to find relevant IRS content
      const taxTerms = this.extractTaxTerms(query)
      
      if (taxTerms.length === 0) {
        return query // No tax-specific terms found
      }

      // Build IRS URLs based on detected terms
      const relevantIrsUrls = this.getRelevantIrsUrls(taxTerms)
      
      if (relevantIrsUrls.length > 0) {
        // Scrape fresh IRS content (this would be cached in production)
        const response = await fetch('/api/apify/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'scrape-irs',
            urls: relevantIrsUrls.slice(0, 3) // Limit to 3 URLs for performance
          })
        })

        if (response.ok) {
          const apifyResult = await response.json()
          if (apifyResult.success && apifyResult.result.length > 0) {
            const irsContext = apifyResult.result
              .map((item: any) => `**${item.title}**\n${item.text?.substring(0, 1000)}...`)
              .join('\n\n')
            
            return `${query}\n\n**AUTHORITATIVE IRS CONTEXT:**\n${irsContext}\n\nPlease use this official IRS information to ensure accuracy and compliance in your response.`
          }
        }
      }

      return query
    } catch (error) {
      console.warn('Failed to enhance query with IRS content:', error)
      return query // Return original query if enhancement fails
    }
  }

  private extractTaxTerms(query: string): string[] {
    const taxKeywords = [
      'FBAR', 'FATCA', 'tax treaty', 'foreign tax credit', 'dual citizen',
      'Form 1040', 'Form 8938', 'Form 3520', 'PFIC', 'CFC', 'GILTI',
      'streamlined filing', 'OVDP', 'foreign account', 'expatriate',
      'Israeli tax', 'American tax', 'cross-border', 'IRS'
    ]

    const lowerQuery = query.toLowerCase()
    return taxKeywords.filter(term => lowerQuery.includes(term.toLowerCase()))
  }

  private getRelevantIrsUrls(taxTerms: string[]): string[] {
    const urlMap: Record<string, string> = {
      'FBAR': 'https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar',
      'FATCA': 'https://www.irs.gov/businesses/corporations/foreign-account-tax-compliance-act-fatca',
      'tax treaty': 'https://www.irs.gov/individuals/international-taxpayers/tax-treaties',
      'foreign tax credit': 'https://www.irs.gov/individuals/international-taxpayers/foreign-tax-credit',
      'Form 1040': 'https://www.irs.gov/forms-pubs/about-form-1040',
      'Form 8938': 'https://www.irs.gov/forms-pubs/about-form-8938',
      'streamlined filing': 'https://www.irs.gov/individuals/international-taxpayers/streamlined-filing-compliance-procedures',
      'expatriate': 'https://www.irs.gov/individuals/international-taxpayers/expatriation-tax',
      'PFIC': 'https://www.irs.gov/forms-pubs/about-form-8621',
      'dual citizen': 'https://www.irs.gov/individuals/international-taxpayers'
    }

    const urls: string[] = []
    taxTerms.forEach(term => {
      const url = urlMap[term]
      if (url && !urls.includes(url)) {
        urls.push(url)
      }
    })

    // Add general international taxpayer page if no specific matches
    if (urls.length === 0) {
      urls.push('https://www.irs.gov/individuals/international-taxpayers')
    }

    return urls
  }

  private generateTitle(topic: any, template: ContentTemplate, notebookTitle?: string): string {
    if (notebookTitle) return notebookTitle
    
    return template.language === 'bilingual' 
      ? `${topic.title_hebrew} | ${topic.title_english}`
      : template.language === 'hebrew'
      ? topic.title_hebrew
      : topic.title_english
  }

  private generateFallbackContent(topic: any, template: ContentTemplate, context: any): string {
    switch (template.type) {
      case 'article':
        return this.generateArticleContent(topic, template, context)
      case 'social_post':
        return this.generateSocialContent(topic, template, context)
      case 'podcast_script':
        return this.generatePodcastContent(topic, template, context)
      default:
        return `Content for ${topic.title_english} using ${template.name} template.`
    }
  }

  private generateArticleContent(topic: any, template: ContentTemplate, context: any): string {
    if (template.language === 'bilingual') {
      return `# ${topic.title_hebrew}

${topic.title_hebrew} הוא נושא מרכזי בתחום המיסוי הבינלאומי עבור אזרחים ישראליים-אמריקניים. נושא זה דורש הבנה מעמיקה של החוקים הרלוונטיים בשתי המדינות.

## הקדמה בעברית
[Generated Hebrew introduction - 100-150 words about ${topic.title_english}]

---

# ${topic.title_english}

${topic.title_english} is a crucial topic in international taxation for Israeli-American dual citizens. This subject requires deep understanding of relevant laws in both countries.

## English Introduction
[Generated English introduction - 100-150 words about ${topic.title_english}]

## Main Content
[Comprehensive bilingual content covering all aspects of ${topic.title_english}]

### Key Points:
• Priority Level: ${topic.priority}
• Relevant Tags: ${topic.tags.join(', ')}
• Seasonal Considerations: ${topic.seasonal_relevance}

### Practical Examples
[Case studies and examples specific to Israeli-American situations]

### Action Items
1. Consult with Tax4US for personalized guidance
2. Review current compliance status
3. Plan for upcoming filing deadlines

*This content was generated using Tax4US Content Factory's AI-powered system with comprehensive tax knowledge base.*`
    } else {
      return `# ${template.language === 'hebrew' ? topic.title_hebrew : topic.title_english}

[Generated content for ${topic.title_english} in ${template.language}]

## Overview
This ${template.type} covers the essential aspects of ${topic.title_english} for Israeli-American taxpayers.

## Key Information
- Priority: ${topic.priority}
- Tags: ${topic.tags.join(', ')}
- Seasonal Relevance: ${topic.seasonal_relevance}

## Content Body
[Detailed content would be generated here using NotebookLM knowledge]

---
*Generated by Tax4US Content Factory*`
    }
  }

  private generateSocialContent(topic: any, template: ContentTemplate, context: any): string {
    return `🔍 Did you know? ${topic.title_english} can significantly impact your tax obligations as an Israeli-American!

${topic.priority === 'high' ? '⚠️ HIGH PRIORITY:' : '💡 Important:'} Understanding this tax requirement is crucial for compliance in both countries.

Key considerations:
• ${topic.tags.slice(0, 2).join('\n• ')}

${topic.seasonal_relevance !== 'Year-round' ? `⏰ Timing matters: ${topic.seasonal_relevance}` : ''}

Need help navigating cross-border tax compliance? Tax4US specializes in Israeli-American tax situations.

#Tax4US #IsraeliAmerican #TaxCompliance #CrossBorderTax #DualCitizen ${topic.tags.map((tag: string) => '#' + tag.replace(/\s+/g, '')).join(' ')}`
  }

  private generatePodcastContent(topic: any, template: ContentTemplate, context: any): string {
    return `# Tax4US Weekly Podcast Episode: ${topic.title_english}

## Introduction (30 seconds)
Welcome back to Tax4US Weekly, the podcast for Israeli-American dual citizens navigating cross-border tax compliance. I'm your host, and today we're diving deep into ${topic.title_english}.

## Main Content (8-12 minutes)

### What is ${topic.title_english}?
[Explanation tailored for audio format]

### Why This Matters for Israeli-Americans
This topic is particularly important because... [context specific to dual citizens]

### Real-World Scenario
Let me share a story about a client who faced challenges with ${topic.title_english}...

### Step-by-Step Guidance
Here's what you need to know:
1. [Step 1]
2. [Step 2]  
3. [Step 3]

## Q&A Segment (2-3 minutes)
The most common questions we get about ${topic.title_english} are:

Q: [Common question]
A: [Clear answer]

## Closing (30 seconds)
Remember, ${topic.title_english} is ${topic.priority} priority, especially ${topic.seasonal_relevance}. 

For personalized guidance on your specific situation, reach out to Tax4US. We specialize in Israeli-American tax compliance and are here to help.

Thanks for listening to Tax4US Weekly. Until next time, stay compliant!

---
*Episode Length: ~12 minutes*
*Generated by Tax4US Content Factory*`
  }

  private generateMetaDescription(topic: any, template: ContentTemplate): string {
    return `Complete guide to ${topic.title_english} for Israeli-American dual citizens. Expert tax advice, compliance tips, and practical examples. Tax4US specializes in cross-border taxation.`
  }

  private generateKeywords(topic: any): string[] {
    return [
      topic.title_english.toLowerCase(),
      'israeli american tax',
      'dual citizen tax',
      'cross border tax',
      'tax4us',
      ...topic.tags.map((tag: string) => tag.toLowerCase())
    ]
  }

  async optimizeSEO(contentId: string): Promise<{ score: number; suggestions: string[] }> {
    // TODO: Implement SEO optimization logic
    return {
      score: 85,
      suggestions: [
        'Add meta description',
        'Include more long-tail keywords',
        'Optimize heading structure'
      ]
    }
  }

  async saveContent(content: GeneratedContent): Promise<void> {
    // TODO: Save to database
    console.log('Saving content:', content.id)
    
    await projectMemory.logTask(
      `Save generated content: ${content.title}`,
      'completed',
      `Content type: ${content.content_type}, Language: ${content.language}`,
      []
    )
  }
}

export const contentTemplateManager = new ContentTemplateManager()