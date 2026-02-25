#!/usr/bin/env npx tsx
/**
 * VERIFY QUALITY METRICS
 * Check word count, SEO scores, and overall quality
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ContentGenerator } from '../lib/pipeline/content-generator';

const hebrewPostId = 2706;
const englishPostId = 2712;

async function verifyQuality() {
    const wp = new WordPressClient();
    const contentGenerator = new ContentGenerator();

    console.log('✅ VERIFYING QUALITY METRICS\n');

    // Check Hebrew post
    console.log(`📋 Hebrew Post ${hebrewPostId}:`);
    const hebrewPost = await wp.getPost(hebrewPostId.toString());
    const hebrewTitle = hebrewPost.title.rendered;
    const hebrewContent = hebrewPost.content.rendered;
    const hebrewWordCount = hebrewContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    
    console.log(`   Title: ${hebrewTitle}`);
    console.log(`   Word Count: ${hebrewWordCount} words`);
    console.log(`   Focus Keyword: ${hebrewPost.meta?.rank_math_focus_keyword || 'N/A'}`);
    console.log(`   SEO Title: ${hebrewPost.meta?.rank_math_title || 'N/A'}`);
    console.log(`   SEO Score: ${hebrewPost.meta?.rank_math_seo_score || 'N/A'}`);
    
    // Calculate fresh SEO score
    const hebrewFocusKeyword = hebrewPost.meta?.rank_math_focus_keyword || 'עבודה מרחוק מס';
    const hebrewSeoScore = contentGenerator.calculateScore(hebrewContent, hebrewTitle, hebrewFocusKeyword);
    console.log(`   Calculated SEO Score: ${hebrewSeoScore}%`);

    // Check English post
    console.log(`\n📋 English Post ${englishPostId}:`);
    const englishPost = await wp.getPost(englishPostId.toString());
    const englishTitle = englishPost.title.rendered;
    const englishContent = englishPost.content.rendered;
    const englishWordCount = englishContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    
    console.log(`   Title: ${englishTitle}`);
    console.log(`   Word Count: ${englishWordCount} words`);
    console.log(`   Focus Keyword: ${englishPost.meta?.rank_math_focus_keyword || 'N/A'}`);
    console.log(`   SEO Title: ${englishPost.meta?.rank_math_title || 'N/A'}`);
    console.log(`   SEO Score: ${englishPost.meta?.rank_math_seo_score || 'N/A'}`);
    
    // Calculate fresh SEO score
    const englishFocusKeyword = englishPost.meta?.rank_math_focus_keyword || 'remote work tax';
    const englishSeoScore = contentGenerator.calculateScore(englishContent, englishTitle, englishFocusKeyword);
    console.log(`   Calculated SEO Score: ${englishSeoScore}%`);

    console.log('\n🎯 QUALITY ASSESSMENT:');
    
    // Word Count Assessment
    console.log('\n📊 Word Count Analysis:');
    console.log(`   Hebrew: ${hebrewWordCount} words ${hebrewWordCount >= 1500 ? '✅' : '⚠️  (Target: 1500+ words)'}`);
    console.log(`   English: ${englishWordCount} words ${englishWordCount >= 800 ? '✅' : '⚠️  (Target: 800+ words)'}`);
    
    // SEO Score Assessment
    console.log('\n🎯 SEO Score Analysis:');
    console.log(`   Hebrew: ${hebrewSeoScore}% ${hebrewSeoScore >= 80 ? '✅' : '⚠️  (Target: 80+ score)'}`);
    console.log(`   English: ${englishSeoScore}% ${englishSeoScore >= 80 ? '✅' : '⚠️  (Target: 80+ score)'}`);
    
    // Style Assessment
    console.log('\n✨ Style Assessment:');
    const hebrewHasNumbers = /\d/.test(hebrewTitle);
    const englishHasNumbers = /\d/.test(englishTitle);
    console.log(`   Hebrew title (no clickbait numbers): ${!hebrewHasNumbers ? '✅' : '❌'}`);
    console.log(`   English title (no clickbait numbers): ${!englishHasNumbers ? '✅' : '❌'}`);
    
    // Overall Status
    const allGood = hebrewWordCount >= 600 && englishWordCount >= 600 && 
                    hebrewSeoScore >= 70 && englishSeoScore >= 70 && 
                    !hebrewHasNumbers && !englishHasNumbers;
    
    console.log(`\n🎉 Overall Status: ${allGood ? '✅ EXCELLENT' : '⚠️  NEEDS IMPROVEMENT'}`);
    
    console.log('\n🔗 View Updated Posts:');
    console.log(`   Hebrew: https://www.tax4us.co.il/?p=${hebrewPostId}`);
    console.log(`   English: https://www.tax4us.co.il/?p=${englishPostId}`);
}

verifyQuality().catch(error => {
    console.error('❌ Quality verification failed:', error.message);
    process.exit(1);
});