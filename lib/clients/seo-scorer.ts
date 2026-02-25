/**
 * SEO Scorer logic for Tax4Us
 * Ported from working n8n workflow "SEO Post Editor - Fix Low Score Posts (Optimized)"
 * Comprehensive analysis with 13+ SEO factors
 */

export interface SEOAnalysis {
  score: number
  issues: string[]
  improvements: string[]
  metrics: {
    wordCount: number
    keywordDensity: number
    h2Count: number
    h3Count: number
    internalLinks: number
    externalLinks: number
    titleLength: number
    descriptionLength: number
  }
  targetScore: number
}

export class SEOScorer {
  /**
   * Calculate comprehensive SEO score using proven n8n logic
   */
  calculateScore(content: string, title: string, focusKeyword: string, seoTitle?: string, seoDescription?: string): number {
    const analysis = this.analyzeContent(content, title, focusKeyword, seoTitle, seoDescription)
    return analysis.score
  }

  /**
   * Comprehensive SEO analysis matching n8n workflow logic
   */
  analyzeContent(
    content: string, 
    title: string, 
    focusKeyword: string, 
    seoTitle?: string, 
    seoDescription?: string
  ): SEOAnalysis {
    // Initialize analysis
    const issues: string[] = []
    const improvements: string[] = []
    let score = 0

    // Strip HTML for text analysis
    const contentText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const wordCount = contentText.split(/\s+/).filter(w => w.length > 1).length
    const contentLower = contentText.toLowerCase()
    const keywordLower = (focusKeyword || '').toLowerCase()
    const finalSeoTitle = seoTitle || title
    const finalSeoDescription = seoDescription || ''

    // Safety check for empty/stub posts
    if (!title.trim() && wordCount < 50) {
      return {
        score: 0,
        issues: ['Empty or stub post - insufficient content'],
        improvements: ['Add meaningful title and content'],
        metrics: {
          wordCount: 0,
          keywordDensity: 0,
          h2Count: 0,
          h3Count: 0,
          internalLinks: 0,
          externalLinks: 0,
          titleLength: 0,
          descriptionLength: 0
        },
        targetScore: 95
      }
    }

    // 1. Focus Keyword (Required) - 15 points
    if (!focusKeyword || focusKeyword.length < 2) {
      issues.push('❌ Missing focus keyword')
      improvements.push('Add a 2-4 word focus keyword')
    } else {
      score += 15
    }

    // 2. Keyword in Title - 10 points
    if (focusKeyword && !finalSeoTitle.toLowerCase().includes(keywordLower)) {
      issues.push('❌ Focus keyword not in SEO title')
      improvements.push('Include focus keyword at beginning of title')
    } else if (focusKeyword) {
      score += 10
    }

    // 3. Keyword in Meta Description - 8 points
    if (focusKeyword && !finalSeoDescription.toLowerCase().includes(keywordLower)) {
      issues.push('❌ Focus keyword not in meta description')
      improvements.push('Add focus keyword to meta description')
    } else if (focusKeyword) {
      score += 8
    }

    // 4. Content Length - 15 points
    if (wordCount < 2000) {
      issues.push(`❌ Content too short (${wordCount} words, need 2500+)`)
      improvements.push(`Expand content by ${2500 - wordCount}+ words`)
      score += Math.min(wordCount / 2000 * 10, 10) // Partial credit
    } else if (wordCount < 2500) {
      issues.push(`⚠️ Content slightly short (${wordCount} words)`)
      improvements.push('Add 300-500 more words')
      score += 12
    } else {
      score += 15
    }

    // 5. Keyword Density (1-1.5% optimal) - 10 points
    let keywordDensity = 0
    if (focusKeyword) {
      const keywordRegex = new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const keywordCount = (contentLower.match(keywordRegex) || []).length
      keywordDensity = (keywordCount / Math.max(wordCount, 1)) * 100
      
      if (keywordDensity < 0.5) {
        issues.push(`❌ Keyword density too low (${keywordDensity.toFixed(2)}%, need 1-1.5%)`)
        improvements.push('Add focus keyword more naturally throughout content')
        score += Math.min(keywordDensity * 10, 5) // Partial credit
      } else if (keywordDensity > 2.5) {
        issues.push(`⚠️ Keyword density too high (${keywordDensity.toFixed(2)}%)`)
        improvements.push('Reduce keyword stuffing')
        score += 5
      } else {
        score += 10
      }
    }

    // 6. Keyword in First Paragraph - 8 points
    if (focusKeyword && !contentLower.substring(0, 300).includes(keywordLower)) {
      issues.push('❌ Focus keyword not in introduction')
      improvements.push('Add focus keyword to first paragraph')
    } else if (focusKeyword) {
      score += 8
    }

    // 7. Heading Structure - 12 points
    const h2Count = (content.match(/<h2[^>]*>/gi) || []).length
    const h3Count = (content.match(/<h3[^>]*>/gi) || []).length
    
    if (h2Count < 3) {
      issues.push(`❌ Too few H2 headings (${h2Count}, need 4+)`)
      improvements.push('Add more H2 section headings')
      score += Math.min(h2Count * 3, 6) // Partial credit
    } else {
      score += 8
    }

    // Check keyword in headings
    if (focusKeyword) {
      const headings = content.match(/<h[2-6][^>]*>.*?<\/h[2-6]>/gi) || []
      const keywordInHeadings = headings.filter(h => h.toLowerCase().includes(keywordLower)).length
      if (keywordInHeadings === 0) {
        issues.push('❌ Focus keyword not in any heading')
        improvements.push('Include focus keyword in at least one H2/H3')
      } else {
        score += 4
      }
    }

    // 8. SEO Title Length - 5 points
    if (finalSeoTitle.length < 40 || finalSeoTitle.length > 65) {
      issues.push(`⚠️ SEO title length (${finalSeoTitle.length} chars, ideal: 50-60)`)
      improvements.push('Adjust SEO title to 50-60 characters')
      score += 2
    } else {
      score += 5
    }

    // 9. Meta Description Length - 5 points
    if (finalSeoDescription.length < 120 || finalSeoDescription.length > 160) {
      issues.push(`⚠️ Meta description length (${finalSeoDescription.length} chars, ideal: 150-160)`)
      improvements.push('Adjust meta description to 150-160 characters')
      score += 2
    } else {
      score += 5
    }

    // 10. Power Words - 3 points (Optional but recommended)
    const powerWords = ['ultimate', 'essential', 'proven', 'complete', 'guide', 'מדריך', 'מקיף', 'חיוני', 'מוכח', 'קריטי']
    if (!powerWords.some(pw => title.toLowerCase().includes(pw))) {
      issues.push('⚠️ No power word in title')
      improvements.push('Add power word (essential, proven, complete, guide)')
    } else {
      score += 3
    }

    // 11. Internal/External Links - 10 points
    const internalLinks = (content.match(/href=["']https?:\/\/(www\.)?tax4us\.co\.il[^"']*/gi) || []).length
    const allLinks = (content.match(/href=["']https?:\/\/[^"']*/gi) || []).length
    const externalLinks = allLinks - internalLinks

    if (internalLinks < 2) {
      issues.push(`❌ Too few internal links (${internalLinks}, need 3+)`)
      improvements.push('Add 2-3 internal links to other Tax4US articles')
      score += Math.min(internalLinks * 2, 4) // Partial credit
    } else {
      score += 6
    }

    if (externalLinks < 1) {
      issues.push(`⚠️ No external links`)
      improvements.push('Add 1-2 external links to authoritative sources (IRS, etc.)')
    } else {
      score += 4
    }

    // 12. Paragraph Length Check - 2 points
    const paragraphs = content.split(/<\/p>/i)
      .map(p => p.replace(/<[^>]*>/g, ' ').trim())
      .filter(p => p.length > 0)
    const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150).length
    
    if (longParagraphs > 2) {
      issues.push(`⚠️ ${longParagraphs} paragraphs are too long (>150 words)`)
      improvements.push('Break long paragraphs into shorter ones (max 120 words)')
    } else {
      score += 2
    }

    // 13. Image Alt Text (simulated) - 2 points
    const images = (content.match(/<img[^>]*>/gi) || []).length
    if (images > 0) {
      score += 2
    }

    return {
      score: Math.min(score, 100), // Cap at 100
      issues,
      improvements,
      metrics: {
        wordCount,
        keywordDensity,
        h2Count,
        h3Count,
        internalLinks,
        externalLinks,
        titleLength: finalSeoTitle.length,
        descriptionLength: finalSeoDescription.length
      },
      targetScore: 95
    }
  }

  /**
   * Get recommendations for improving SEO score
   */
  getRecommendations(analysis: SEOAnalysis): string[] {
    const recommendations: string[] = []

    if (analysis.score < 50) {
      recommendations.push('🚨 Critical SEO issues - immediate attention required')
    } else if (analysis.score < 75) {
      recommendations.push('⚠️ Several SEO improvements needed')
    } else if (analysis.score < 90) {
      recommendations.push('✅ Good SEO score - minor optimizations remain')
    } else {
      recommendations.push('🎯 Excellent SEO score!')
    }

    // Add top 3 improvements
    recommendations.push(...analysis.improvements.slice(0, 3))

    return recommendations
  }
}