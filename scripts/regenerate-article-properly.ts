#!/usr/bin/env npx tsx
/**
 * REGENERATE ARTICLE PROPERLY
 * Uses actual n8n template with Ben's style preferences (NO numbered titles)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ClaudeClient } from '../lib/clients/claude-client';

const postId = parseInt(process.argv[2] || "2706");
const topic = process.argv[3] || "The Impact of Remote Work on US-Israel Tax Compliance";

async function regenerateArticle() {
    const wp = new WordPressClient();
    const claude = new ClaudeClient();

    console.log('🔄 REGENERATING ARTICLE WITH PROPER SPECIFICATIONS\n');
    console.log(`📋 Post ID: ${postId}`);
    console.log(`📋 Topic: ${topic}\n`);

    // Skip fetching existing posts due to getPosts() API issue
    // TODO: Fix getPosts() in wordpress-client.ts 
    const existingTitles = ['Placeholder to avoid empty titles array'];

    // Use EXACT n8n template BUT with Ben's style preferences
    const hebrewPrompt = `**SPECIFIC TOPIC FOR THIS ARTICLE:**
${topic}

**EXISTING POST TITLES TO AVOID DUPLICATING (${existingTitles.length} posts):**
${existingTitles.slice(0, 50).map((title, i) => `${i + 1}. ${title}`).join('\n')}

**CRITICAL:** Your article title and content MUST be significantly different from ALL the above existing titles. Do NOT create content that overlaps with or duplicates these existing articles. Choose a unique angle, different focus, or different aspect of the topic.

**YOUR TASK:**
Create high-quality, COMPREHENSIVE, SEO-OPTIMIZED Hebrew blog post content targeting a Rank Math SEO score of 100/100.

**OUTPUT FORMAT - CRITICAL:**
Return ONLY a valid JSON object with NO markdown formatting, NO code blocks, NO backticks.
The response must start with { and end with }.

{
  "title": "Hebrew title for the blog post (professional, descriptive - NO CLICKBAIT NUMBERS)",
  "content": "Full article content in plain Hebrew text (NO HTML, just text with natural paragraphs separated by double newlines)",
  "excerpt": "Brief 1-2 sentence summary in Hebrew for SEO (150-160 characters)",
  "focusKeyword": "Primary focus keyword (2-3 words, max 50 characters)",
  "seoTitle": "SEO-optimized title (50-60 characters, includes focus keyword at beginning)",
  "seoDescription": "SEO meta description (150-160 characters, includes focus keyword)"
}

**CRITICAL RANK MATH 100/100 REQUIREMENTS:**

1. **CONTENT LENGTH - MINIMUM 2500 WORDS - ABSOLUTE REQUIREMENT:**
   - Target: EXACTLY 2500-3000 words for 100/100 score
   - This is NON-NEGOTIABLE - articles under 2500 words WILL BE REJECTED
   - Count every word carefully - aim for 2600+ words to be safe

2. **PARAGRAPH LENGTH - MAXIMUM 120 WORDS:**
   - NO paragraph can exceed 120 words
   - Separate paragraphs with double newlines (\\n\\n)

3. **TITLE REQUIREMENTS - BEN'S STYLE (CRITICAL):**
   - **NO CLICKBAIT NUMBERS** (NO "7 דרכים", NO "10 טיפים")
   - Professional, descriptive, informative style
   - MUST have sentiment (evoke curiosity, authority, urgency)
   - MUST include power words when natural (מהפכני, חיוני, קריטי, מדריך)

4. **Focus Keyword Optimization:**
   - Use focus keyword 10-15 times throughout (1-1.5% density)
   - Include in: title, first paragraph, at least one H2/H3, meta description

5. **SEO Title & Meta:**
   - SEO Title: 50-60 characters, focus keyword at beginning
   - Meta Description: 150-160 characters, include focus keyword

6. **Content Structure:**
   - Clear H2/H3 hierarchy (mark with ## and ### at start of line)
   - FAQ section with 5-7 questions at end
   - Use bullet points and lists where appropriate

**TOPIC FOCUS:**
US-Israeli tax topics: FBAR, FATCA, Form 8938, tax treaty, investments, business tax, real estate, retirement accounts (401k, IRA, Keren Hishtalmut), tax law changes, state taxes, estate/gift tax, tax planning, remote work compliance.

**CRITICAL:**
- Output ONLY valid JSON - no markdown, no code blocks
- NO HTML in content field - plain text only
- NO [IMAGE PLACEMENT] or placeholder text
- Content MUST be 2500+ words
- Response must be parseable by JSON.parse()`;

    console.log('⏳ Generating 2500+ word Hebrew article (Claude Sonnet 4.5)...\n');

    const hebrewResponse = await claude.generate(
        hebrewPrompt,
        undefined,  // Use default model from ClaudeClient
        'You are a professional Hebrew content writer specializing in US-Israeli tax topics. Generate high-quality, SEO-optimized content that follows Ben\'s professional style (NO clickbait numbered titles). CRITICAL: Article MUST be exactly 2500+ words - this is NON-NEGOTIABLE.',
        4000  // Use 4k tokens for Haiku model limit
    );

    // Extract JSON
    const jsonMatch = hebrewResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
    }

    const article = JSON.parse(jsonMatch[0]);
    const wordCount = article.content.split(/\s+/).length;

    console.log(`✅ Hebrew Article Generated:`);
    console.log(`   Title: ${article.title}`);
    console.log(`   Word Count: ${wordCount} words`);
    console.log(`   SEO Title: ${article.seoTitle}`);
    console.log(`   Focus Keyword: ${article.focusKeyword}\n`);

    if (wordCount < 2500) {
        console.log(`⚠️  WARNING: Word count (${wordCount}) below 2500!\n`);
    }

    // Convert to Gutenberg blocks
    const gutenbergContent = article.content
        .split('\n\n')
        .map((para: string) => {
            if (para.startsWith('##')) {
                const level = para.match(/^#+/)?.[0].length || 2;
                const text = para.replace(/^#+\s*/, '');
                return `<!-- wp:heading {"level":${level}} --><h${level}>${text}</h${level}><!-- /wp:heading -->`;
            }
            return `<!-- wp:paragraph --><p>${para}</p><!-- /wp:paragraph -->`;
        })
        .join('\n\n');

    console.log(`🔄 Updating WordPress post ${postId}...\n`);

    await wp.updatePost(postId, {
        title: article.title,
        content: gutenbergContent,
        excerpt: article.excerpt,
        meta: {
            rank_math_title: article.seoTitle,
            rank_math_description: article.seoDescription,
            rank_math_focus_keyword: article.focusKeyword
        }
    });

    console.log(`✅ Article updated successfully!`);
    console.log(`🔗 View: https://www.tax4us.co.il/?p=${postId}\n`);
}

regenerateArticle().catch(error => {
    console.error('❌ Regeneration failed:', error.message);
    process.exit(1);
});
