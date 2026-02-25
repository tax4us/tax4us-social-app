#!/usr/bin/env npx tsx
/**
 * QUICK HEBREW REGENERATION
 * Generate shorter but complete Hebrew article that fits within token limits
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ClaudeClient } from '../lib/clients/claude-client';

const postId = parseInt(process.argv[2] || "2706");

async function quickRegeneration() {
    const wp = new WordPressClient();
    const claude = new ClaudeClient();

    console.log('🔄 QUICK HEBREW ARTICLE REGENERATION\n');
    console.log(`📋 Post ID: ${postId}\n`);

    // Simplified prompt for shorter article that fits in token limits
    const hebrewPrompt = `Create a high-quality Hebrew blog post about "The Impact of Remote Work on US-Israel Tax Compliance".

REQUIREMENTS:
- EXACTLY 1800-2000 words (not more, not less)
- Professional, descriptive title (NO numbers like "7 ways" or "10 tips")
- Ben's style: professional, authoritative, informative
- Perfect JSON format (parseable by JSON.parse())
- No HTML tags in content
- Focus keyword: "עבודה מרחוק מס"

OUTPUT FORMAT:
{
  "title": "Hebrew title (professional, descriptive)",
  "content": "Full article content in Hebrew (1800-2000 words, no HTML)",
  "excerpt": "Brief summary (150-160 characters)",
  "focusKeyword": "עבודה מרחוק מס",
  "seoTitle": "SEO title (50-60 characters, includes focus keyword)",
  "seoDescription": "SEO description (150-160 characters)"
}

CONTENT STRUCTURE:
- Clear introduction with focus keyword
- 4-5 main sections with H2 headers (mark with ##)
- 2-3 subsections with H3 headers (mark with ###)
- FAQ section with 5 questions at end
- Professional conclusion
- Max 120 words per paragraph
- Use focus keyword 8-12 times throughout

Return ONLY valid JSON, no markdown blocks or backticks.`;

    console.log('⏳ Generating Hebrew article (1800-2000 words)...\n');

    const hebrewResponse = await claude.generate(
        hebrewPrompt,
        undefined,  // Use default Haiku model
        'You are a professional Hebrew content writer for US-Israeli tax topics. Generate exactly 1800-2000 words in perfect JSON format.',
        4000  // Full Haiku token limit
    );

    console.log('Raw response preview:', hebrewResponse.substring(0, 200) + '...\n');

    // Extract JSON
    const jsonMatch = hebrewResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.log('Full response:', hebrewResponse);
        throw new Error('No JSON found in Claude response');
    }

    const article = JSON.parse(jsonMatch[0]);
    const wordCount = article.content.split(/\s+/).length;

    console.log(`✅ Hebrew Article Generated:`);
    console.log(`   Title: ${article.title}`);
    console.log(`   Word Count: ${wordCount} words`);
    console.log(`   SEO Title: ${article.seoTitle}`);
    console.log(`   Focus Keyword: ${article.focusKeyword}\n`);

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

quickRegeneration().catch(error => {
    console.error('❌ Quick regeneration failed:', error.message);
    process.exit(1);
});