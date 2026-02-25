#!/usr/bin/env npx tsx
/**
 * REGENERATE ENGLISH TRANSLATION
 * Translate the updated Hebrew article to proper English
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ClaudeClient } from '../lib/clients/claude-client';

const hebrewPostId = 2706;
const englishPostId = 2712;

async function regenerateEnglish() {
    const wp = new WordPressClient();
    const claude = new ClaudeClient();

    console.log('🔄 REGENERATING ENGLISH TRANSLATION\n');
    console.log(`📋 Hebrew Post ID: ${hebrewPostId}`);
    console.log(`📋 English Post ID: ${englishPostId}\n`);

    // Get the updated Hebrew article
    console.log('📖 Fetching updated Hebrew article...');
    const hebrewPost = await wp.getPost(hebrewPostId.toString());
    const hebrewTitle = hebrewPost.title.rendered;
    const hebrewContent = hebrewPost.content.rendered;
    const hebrewExcerpt = hebrewPost.excerpt.rendered;

    console.log(`   Title: ${hebrewTitle}`);
    console.log(`   Word count: ${hebrewContent.split(/\s+/).length} words\n`);

    // Translate to English using ClaudeClient
    console.log('🔄 Translating Hebrew content to English...');

    const translationPrompt = `Translate this Hebrew tax article to professional English. Return ONLY valid JSON with this structure:

{
  "title": "Professional English title (descriptive, NO clickbait numbers)",
  "content": "Full English translation (maintain structure, no HTML)",
  "excerpt": "Brief English summary (150-160 characters)",
  "focusKeyword": "remote work tax",
  "seoTitle": "SEO-optimized English title (50-60 characters, focus keyword at beginning)",
  "seoDescription": "English meta description (150-160 characters, includes focus keyword)"
}

HEBREW ARTICLE TO TRANSLATE:
Title: ${hebrewTitle}

Content: ${hebrewContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').trim()}

Requirements:
- Professional business English
- Maintain paragraph structure 
- Keep all headings (## and ###)
- Translate focus keyword appropriately
- NO HTML tags in content field
- Return only valid JSON`;

    const englishResponse = await claude.generate(
        translationPrompt,
        undefined,  // Use default model
        'You are a professional Hebrew-to-English translator specializing in US-Israeli tax content. Produce high-quality business English translations.',
        4000
    );

    // Extract JSON and clean control characters
    let jsonMatch = englishResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        // Try to find the start of JSON more specifically
        jsonMatch = englishResponse.match(/\{[^{}]*"title"[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('Full translation response:', englishResponse);
            throw new Error('No JSON found in translation response');
        }
    }

    // Clean control characters from JSON string
    const cleanedJson = jsonMatch[0]
        .replace(/[\u0000-\u001F\u007F]/g, ' ')  // Remove control characters
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();

    const translation = JSON.parse(cleanedJson);
    const wordCount = translation.content.split(/\s+/).length;

    console.log(`✅ English Translation Generated:`);
    console.log(`   Title: ${translation.title}`);
    console.log(`   Word Count: ${wordCount} words`);
    console.log(`   SEO Title: ${translation.seoTitle}`);
    console.log(`   Focus Keyword: ${translation.focusKeyword}\n`);

    // Convert to Gutenberg blocks
    const gutenbergContent = translation.content
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

    console.log(`🔄 Updating English WordPress post ${englishPostId}...\n`);

    await wp.updatePost(englishPostId, {
        title: translation.title,
        content: gutenbergContent,
        excerpt: translation.excerpt,
        meta: {
            rank_math_title: translation.seoTitle,
            rank_math_description: translation.seoDescription,
            rank_math_focus_keyword: translation.focusKeyword
        }
    });

    console.log(`✅ English translation updated successfully!`);
    console.log(`🔗 Hebrew: https://www.tax4us.co.il/?p=${hebrewPostId}`);
    console.log(`🔗 English: https://www.tax4us.co.il/?p=${englishPostId}\n`);
}

regenerateEnglish().catch(error => {
    console.error('❌ English regeneration failed:', error.message);
    process.exit(1);
});