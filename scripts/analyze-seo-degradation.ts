#!/usr/bin/env npx tsx
/**
 * ANALYZE SEO DEGRADATION PATTERN
 * Compare posts 2520-2530 to identify what broke SEO scoring
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ContentGenerator } from '../lib/pipeline/content-generator';

async function analyzeSEODegradation() {
    const wp = new WordPressClient();
    const contentGenerator = new ContentGenerator();

    console.log('🔍 ANALYZING SEO DEGRADATION PATTERN\n');
    
    const postIds = [2520, 2521, 2522, 2523, 2524, 2525, 2526, 2527, 2528, 2529, 2530];
    const results: any[] = [];

    for (const postId of postIds) {
        try {
            console.log(`📊 Analyzing Post ${postId}...`);
            const post = await wp.getPost(postId.toString());
            
            const title = post.title.rendered;
            const content = post.content.rendered;
            const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
            
            // Get stored SEO metadata
            const storedSeoScore = post.meta?.rank_math_seo_score || 'N/A';
            const focusKeyword = post.meta?.rank_math_focus_keyword || '';
            const seoTitle = post.meta?.rank_math_title || '';
            const seoDescription = post.meta?.rank_math_description || '';
            
            // Calculate fresh SEO score
            const calculatedScore = contentGenerator.calculateScore(content, title, focusKeyword);
            
            // Check for numbers in title (old requirement)
            const hasNumbers = /\d/.test(title);
            
            // Check content structure
            const hasHeadings = content.includes('<h2>') || content.includes('<h3>');
            const hasFAQ = content.toLowerCase().includes('שאלות נפוצות') || content.toLowerCase().includes('frequently asked');
            
            // Publication date
            const pubDate = new Date(post.date).toISOString().split('T')[0];
            
            const analysis = {
                postId,
                title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
                wordCount,
                storedSeoScore,
                calculatedScore,
                focusKeyword,
                hasNumbers,
                hasHeadings,
                hasFAQ,
                pubDate,
                seoTitleLength: seoTitle.length,
                seoDescLength: seoDescription.length
            };
            
            results.push(analysis);
            
            console.log(`   Stored Score: ${storedSeoScore} | Calculated: ${calculatedScore}% | Words: ${wordCount} | Numbers: ${hasNumbers ? 'YES' : 'NO'}`);
            
        } catch (error: any) {
            console.log(`   ❌ Error fetching post ${postId}: ${error.message}`);
        }
    }

    console.log('\n📋 DETAILED ANALYSIS RESULTS:\n');
    
    // Print table header
    console.log('Post ID | Date       | Stored | Calc | Words | Numbers | Headings | FAQ | Focus KW');
    console.log('--------|------------|--------|------|-------|---------|----------|-----|----------');
    
    results.forEach(r => {
        console.log(
            `${r.postId.toString().padEnd(7)} | ` +
            `${r.pubDate} | ` +
            `${r.storedSeoScore.toString().padEnd(6)} | ` +
            `${r.calculatedScore.toString().padEnd(4)} | ` +
            `${r.wordCount.toString().padEnd(5)} | ` +
            `${(r.hasNumbers ? 'YES' : 'NO').padEnd(7)} | ` +
            `${(r.hasHeadings ? 'YES' : 'NO').padEnd(8)} | ` +
            `${(r.hasFAQ ? 'YES' : 'NO').padEnd(3)} | ` +
            `${r.focusKeyword.substring(0, 15)}`
        );
    });

    console.log('\n🎯 CRITICAL FINDINGS:\n');
    
    // Find the transition point
    const goodPosts = results.filter(r => r.calculatedScore >= 80);
    const badPosts = results.filter(r => r.calculatedScore < 50);
    
    console.log(`✅ Good SEO Posts (80+%): ${goodPosts.map(p => p.postId).join(', ')}`);
    console.log(`❌ Poor SEO Posts (<50%): ${badPosts.map(p => p.postId).join(', ')}`);
    
    // Analyze patterns
    if (goodPosts.length > 0 && badPosts.length > 0) {
        const lastGoodPost = goodPosts[goodPosts.length - 1];
        const firstBadPost = badPosts[0];
        
        console.log(`\n🔍 TRANSITION ANALYSIS:`);
        console.log(`Last good post: ${lastGoodPost.postId} (${lastGoodPost.calculatedScore}%) on ${lastGoodPost.pubDate}`);
        console.log(`First bad post: ${firstBadPost.postId} (${firstBadPost.calculatedScore}%) on ${firstBadPost.pubDate}`);
        
        console.log(`\n📊 PATTERN DIFFERENCES:`);
        
        // Compare characteristics
        const goodAvgWords = goodPosts.reduce((sum, p) => sum + p.wordCount, 0) / goodPosts.length;
        const badAvgWords = badPosts.reduce((sum, p) => sum + p.wordCount, 0) / badPosts.length;
        
        console.log(`Word count: Good avg ${Math.round(goodAvgWords)} vs Bad avg ${Math.round(badAvgWords)}`);
        
        const goodWithNumbers = goodPosts.filter(p => p.hasNumbers).length;
        const badWithNumbers = badPosts.filter(p => p.hasNumbers).length;
        
        console.log(`Numbers in title: Good ${goodWithNumbers}/${goodPosts.length} vs Bad ${badWithNumbers}/${badPosts.length}`);
        
        const goodWithHeadings = goodPosts.filter(p => p.hasHeadings).length;
        const badWithHeadings = badPosts.filter(p => p.hasHeadings).length;
        
        console.log(`Has headings: Good ${goodWithHeadings}/${goodPosts.length} vs Bad ${badWithHeadings}/${badPosts.length}`);
        
        const goodWithFAQ = goodPosts.filter(p => p.hasFAQ).length;
        const badWithFAQ = badPosts.filter(p => p.hasFAQ).length;
        
        console.log(`Has FAQ: Good ${goodWithFAQ}/${goodPosts.length} vs Bad ${badWithFAQ}/${badPosts.length}`);
    }

    // Look for specific changes that might have occurred
    console.log(`\n🔍 DETAILED CONTENT INSPECTION:`);
    
    // Check post 2524 vs 2527 specifically
    const post2524 = results.find(r => r.postId === 2524);
    const post2527 = results.find(r => r.postId === 2527);
    
    if (post2524 && post2527) {
        console.log(`\nPost 2524 (GOOD) vs Post 2527 (BAD) comparison:`);
        console.log(`2524: ${post2524.calculatedScore}% | Words: ${post2524.wordCount} | Focus: "${post2524.focusKeyword}"`);
        console.log(`2527: ${post2527.calculatedScore}% | Words: ${post2527.wordCount} | Focus: "${post2527.focusKeyword}"`);
    }
}

analyzeSEODegradation().catch(error => {
    console.error('❌ SEO degradation analysis failed:', error.message);
    process.exit(1);
});