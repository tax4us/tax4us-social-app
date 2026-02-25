#!/usr/bin/env npx tsx
/**
 * DEEP SEO ANALYSIS 
 * Get more posts and examine actual content structure differences
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ContentGenerator } from '../lib/pipeline/content-generator';

async function deepSEOAnalysis() {
    const wp = new WordPressClient();
    const contentGenerator = new ContentGenerator();

    console.log('🔍 DEEP SEO ANALYSIS\n');
    
    // Get recent posts to find the pattern
    console.log('Fetching recent posts...');
    const posts = await wp.getPosts({ per_page: '30', status: 'publish' });
    
    const results: any[] = [];
    
    for (const post of posts.slice(0, 15)) {
        const postId = post.id;
        const title = post.title.rendered;
        const content = post.content.rendered;
        const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
        
        // Get stored SEO metadata
        const storedSeoScore = post.meta?.rank_math_seo_score || 'N/A';
        const focusKeyword = post.meta?.rank_math_focus_keyword || '';
        
        // Calculate fresh SEO score
        const calculatedScore = contentGenerator.calculateScore(content, title, focusKeyword);
        
        // Detailed content analysis
        const hasNumbers = /\d/.test(title);
        const hasHeadings = content.includes('<h2>') || content.includes('<h3>');
        const hasFAQ = content.toLowerCase().includes('שאלות נפוצות') || content.toLowerCase().includes('frequently asked');
        
        // Check specific SEO elements
        const keywordInTitle = focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase());
        const keywordInContent = focusKeyword && content.toLowerCase().includes(focusKeyword.toLowerCase());
        
        // Count keyword density
        const keywordCount = focusKeyword ? (content.toLowerCase().match(new RegExp(focusKeyword.toLowerCase(), 'g')) || []).length : 0;
        const keywordDensity = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(2) : '0';
        
        // Check paragraph structure
        const paragraphs = content.split(/<\/p>/).length - 1;
        const avgWordsPerParagraph = paragraphs > 0 ? Math.round(wordCount / paragraphs) : 0;
        
        // Publication date
        const pubDate = new Date(post.date).toISOString().split('T')[0];
        
        const analysis = {
            postId,
            title: title.substring(0, 80) + (title.length > 80 ? '...' : ''),
            wordCount,
            storedSeoScore,
            calculatedScore,
            focusKeyword: focusKeyword.substring(0, 20),
            hasNumbers,
            hasHeadings,
            hasFAQ,
            keywordInTitle,
            keywordInContent,
            keywordCount,
            keywordDensity,
            paragraphs,
            avgWordsPerParagraph,
            pubDate
        };
        
        results.push(analysis);
    }

    console.log('\n📊 COMPREHENSIVE SEO ANALYSIS:\n');
    
    // Sort by post ID to see chronological pattern
    results.sort((a, b) => b.postId - a.postId);
    
    // Print detailed table
    console.log('Post | Date     | Stored | Calc | Words | KW in Title | KW Count | Density | Avg Words/Para');
    console.log('-----|----------|--------|------|-------|-------------|----------|---------|---------------');
    
    results.forEach(r => {
        console.log(
            `${r.postId.toString().padEnd(4)} | ` +
            `${r.pubDate.substring(5)} | ` +
            `${r.storedSeoScore.toString().padEnd(6)} | ` +
            `${r.calculatedScore.toString().padEnd(4)} | ` +
            `${r.wordCount.toString().padEnd(5)} | ` +
            `${(r.keywordInTitle ? 'YES' : 'NO').padEnd(11)} | ` +
            `${r.keywordCount.toString().padEnd(8)} | ` +
            `${r.keywordDensity.toString().padEnd(7)} | ` +
            `${r.avgWordsPerParagraph.toString().padEnd(15)}`
        );
    });

    // Identify the break point
    const goodPosts = results.filter(r => typeof r.calculatedScore === 'number' && r.calculatedScore >= 70);
    const badPosts = results.filter(r => typeof r.calculatedScore === 'number' && r.calculatedScore < 50);
    
    console.log(`\n🎯 PATTERN ANALYSIS:`);
    console.log(`✅ Good SEO Posts (70+%): ${goodPosts.map(p => p.postId).join(', ')}`);
    console.log(`❌ Poor SEO Posts (<50%): ${badPosts.map(p => p.postId).join(', ')}`);
    
    // Find the exact transition
    const sortedByPostId = [...results].sort((a, b) => a.postId - b.postId);
    let transitionPoint = null;
    
    for (let i = 0; i < sortedByPostId.length - 1; i++) {
        const current = sortedByPostId[i];
        const next = sortedByPostId[i + 1];
        
        if (current.calculatedScore >= 70 && next.calculatedScore < 50) {
            transitionPoint = { good: current, bad: next };
            break;
        }
    }
    
    if (transitionPoint) {
        console.log(`\n🔍 EXACT TRANSITION POINT FOUND:`);
        console.log(`Last good: Post ${transitionPoint.good.postId} (${transitionPoint.good.calculatedScore}%)`);
        console.log(`First bad: Post ${transitionPoint.bad.postId} (${transitionPoint.bad.calculatedScore}%)`);
        
        console.log(`\n📋 CRITICAL DIFFERENCES:`);
        console.log(`Word count: ${transitionPoint.good.wordCount} → ${transitionPoint.bad.wordCount} (${transitionPoint.bad.wordCount - transitionPoint.good.wordCount})`);
        console.log(`Keyword in title: ${transitionPoint.good.keywordInTitle} → ${transitionPoint.bad.keywordInTitle}`);
        console.log(`Keyword count: ${transitionPoint.good.keywordCount} → ${transitionPoint.bad.keywordCount}`);
        console.log(`Focus keyword: "${transitionPoint.good.focusKeyword}" → "${transitionPoint.bad.focusKeyword}"`);
    }

    // Additional content inspection
    console.log(`\n🔬 CONTENT STRUCTURE ANALYSIS:`);
    
    if (results.length >= 2) {
        const recent = results[0];  // Most recent post
        const older = results.find(r => r.calculatedScore >= 70) || results[results.length - 1];
        
        console.log(`\nComparing Post ${recent.postId} vs Post ${older.postId}:`);
        
        // Get full content for detailed analysis
        const recentPost = await wp.getPost(recent.postId.toString());
        const olderPost = await wp.getPost(older.postId.toString());
        
        console.log(`\nRecent post ${recent.postId} content structure:`);
        console.log(`- Word count: ${recent.wordCount}`);
        console.log(`- Headings: ${recent.hasHeadings ? 'YES' : 'NO'}`);
        console.log(`- FAQ section: ${recent.hasFAQ ? 'YES' : 'NO'}`);
        console.log(`- Focus keyword: "${recent.focusKeyword}"`);
        console.log(`- Content preview: ${recentPost.content.rendered.replace(/<[^>]*>/g, ' ').substring(0, 200)}...`);
        
        console.log(`\nOlder post ${older.postId} content structure:`);
        console.log(`- Word count: ${older.wordCount}`);
        console.log(`- Headings: ${older.hasHeadings ? 'YES' : 'NO'}`);
        console.log(`- FAQ section: ${older.hasFAQ ? 'YES' : 'NO'}`);
        console.log(`- Focus keyword: "${older.focusKeyword}"`);
        console.log(`- Content preview: ${olderPost.content.rendered.replace(/<[^>]*>/g, ' ').substring(0, 200)}...`);
    }
}

deepSEOAnalysis().catch(error => {
    console.error('❌ Deep SEO analysis failed:', error.message);
    process.exit(1);
});