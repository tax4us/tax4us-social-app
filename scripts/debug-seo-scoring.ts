#!/usr/bin/env npx tsx
/**
 * DEBUG SEO SCORING 
 * Step through the scoring algorithm to find what broke
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { SEOScorer } from '../lib/clients/seo-scorer';

async function debugSEOScoring() {
    const wp = new WordPressClient();
    const scorer = new SEOScorer();

    console.log('🐛 DEBUG SEO SCORING\n');

    // Test with a recent failing post
    const postId = 2706;  // We know this one has issues
    const post = await wp.getPost(postId.toString());
    
    const title = post.title.rendered;
    const content = post.content.rendered;
    const focusKeyword = post.meta?.rank_math_focus_keyword || '';
    
    console.log(`📋 Debugging Post ${postId}:`);
    console.log(`Title: ${title}`);
    console.log(`Focus Keyword: "${focusKeyword}"`);
    console.log(`Content length: ${content.length} chars\n`);

    // Step through scoring algorithm manually
    console.log('🔍 STEP-BY-STEP SCORING:');
    
    let score = 0;
    const contentText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const contentLower = contentText.toLowerCase();
    const keywordLower = (focusKeyword || "").toLowerCase();
    const wordCount = contentText.split(/\s+/).filter(w => w.length > 1).length;

    console.log(`Clean text word count: ${wordCount}`);
    console.log(`Keyword (lowercase): "${keywordLower}"\n`);

    if (!focusKeyword) {
        console.log('❌ NO FOCUS KEYWORD - Score will be 0');
        return;
    }

    // 1. Keyword in Title (10 pts)
    const keywordInTitle = title.toLowerCase().includes(keywordLower);
    if (keywordInTitle) score += 10;
    console.log(`1. Keyword in title: ${keywordInTitle ? '✅ +10' : '❌ +0'} pts (Score: ${score})`);

    // 2. Keyword in Introduction (10 pts)
    const intro = contentLower.substring(0, 400);
    const keywordInIntro = intro.includes(keywordLower);
    if (keywordInIntro) score += 10;
    console.log(`2. Keyword in intro: ${keywordInIntro ? '✅ +10' : '❌ +0'} pts (Score: ${score})`);
    console.log(`   Intro text: "${intro.substring(0, 100)}..."`);

    // 3. Keyword in URL (always 10 pts)
    score += 10;
    console.log(`3. Keyword in URL: ✅ +10 pts (Score: ${score}) [assumed]`);

    // 4. Content Length (20 pts max)
    let lengthPoints = 0;
    if (wordCount >= 2500) lengthPoints = 20;
    else if (wordCount >= 2000) lengthPoints = 15;
    else if (wordCount >= 1000) lengthPoints = 10;
    else lengthPoints = 5;
    score += lengthPoints;
    console.log(`4. Content length: ${wordCount} words = +${lengthPoints} pts (Score: ${score})`);

    // 5. Keyword Density (10 pts)
    const matches = (contentLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
    const density = (matches / Math.max(wordCount, 1)) * 100;
    let densityPoints = 0;
    if (density >= 0.5 && density <= 2.5) densityPoints = 10;
    else if (density > 0) densityPoints = 5;
    score += densityPoints;
    console.log(`5. Keyword density: ${matches} matches = ${density.toFixed(2)}% = +${densityPoints} pts (Score: ${score})`);

    // 6. Keyword in Headings (10 pts)
    const headings = content.match(/<h[2-3].*?>.*?<\/h[2-3]>/gi) || [];
    const headingsText = headings.join(' ').toLowerCase();
    let headingPoints = 0;
    if (headingsText.includes(keywordLower)) headingPoints = 10;
    else if (headings.length >= 3) headingPoints = 5;
    score += headingPoints;
    console.log(`6. Headings: ${headings.length} headings, keyword in headings: ${headingsText.includes(keywordLower)} = +${headingPoints} pts (Score: ${score})`);
    if (headings.length > 0) {
        console.log(`   Headings: ${headings.map(h => h.replace(/<[^>]*>/g, '')).join(', ')}`);
    }

    // 7. Internal & External Links (10 pts)
    const internalLinks = (content.match(/href=["']https?:\/\/(www\.)?tax4us\.co\.il[^"']*/gi) || []).length;
    const allLinks = (content.match(/href=["']https?:\/\/[^"']*/gi) || []).length;
    const externalLinks = allLinks - internalLinks;
    let linkPoints = 0;
    if (internalLinks >= 2 && externalLinks >= 1) linkPoints = 10;
    else if (internalLinks >= 1 || externalLinks >= 1) linkPoints = 5;
    score += linkPoints;
    console.log(`7. Links: ${internalLinks} internal, ${externalLinks} external = +${linkPoints} pts (Score: ${score})`);

    // 8. Images (10 pts)
    const images = content.match(/<img/gi) || [];
    let imagePoints = images.length >= 1 ? 10 : 0;
    score += imagePoints;
    console.log(`8. Images: ${images.length} images = +${imagePoints} pts (Score: ${score})`);

    // 9. Meta & Power Words (10 pts max)
    const powerWords = ['ultimate', 'essential', 'proven', 'complete', 'guide', 'מדריך', 'מקיף', 'חיוני', 'מוכח', 'קריטי'];
    let metaPoints = 0;
    if (powerWords.some(pw => title.toLowerCase().includes(pw))) metaPoints += 5;
    if (/\d/.test(title)) metaPoints += 5;
    score += metaPoints;
    console.log(`9. Power words & numbers: +${metaPoints} pts (Score: ${score})`);
    console.log(`   Power words in title: ${powerWords.filter(pw => title.toLowerCase().includes(pw)).join(', ') || 'none'}`);
    console.log(`   Numbers in title: ${/\d/.test(title)}`);

    const finalScore = Math.min(score, 100);
    console.log(`\n🎯 FINAL SCORE: ${finalScore}/100`);
    
    // Compare with calculated score
    const calculatedScore = scorer.calculateScore(content, title, focusKeyword);
    console.log(`✅ Scorer.calculateScore(): ${calculatedScore}/100`);
    
    if (finalScore !== calculatedScore) {
        console.log(`⚠️  MISMATCH! Manual: ${finalScore} vs Calculated: ${calculatedScore}`);
    }

    // Show what needs fixing
    console.log(`\n🛠️  KEY ISSUES TO FIX:`);
    if (!keywordInTitle) console.log(`- Add "${focusKeyword}" to title`);
    if (!keywordInIntro) console.log(`- Add "${focusKeyword}" to first paragraph`);
    if (wordCount < 2000) console.log(`- Expand content by ${2000 - wordCount}+ words`);
    if (density < 0.5) console.log(`- Add keyword "${focusKeyword}" more naturally (current density: ${density.toFixed(2)}%)`);
    if (headings.length < 3) console.log(`- Add more H2/H3 headings (current: ${headings.length})`);
    if (!headingsText.includes(keywordLower)) console.log(`- Include "${focusKeyword}" in at least one heading`);
    if (internalLinks < 2) console.log(`- Add more internal links (current: ${internalLinks})`);
    if (externalLinks < 1) console.log(`- Add external links (current: ${externalLinks})`);
    if (images.length === 0) console.log(`- Add at least one image`);
}

debugSEOScoring().catch(error => {
    console.error('❌ SEO scoring debug failed:', error.message);
    process.exit(1);
});