#!/usr/bin/env npx tsx
/**
 * REAL COMPREHENSIVE AUDIT
 * Actually check ALL WordPress posts, not just 30
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ContentGenerator } from '../lib/pipeline/content-generator';

async function realComprehensiveAudit() {
    const wp = new WordPressClient();
    const contentGenerator = new ContentGenerator();

    console.log('🔍 REAL COMPREHENSIVE WORDPRESS AUDIT\n');
    console.log('Fetching ALL posts systematically...\n');
    
    const allPosts: any[] = [];
    let page = 1;
    let totalPages = 1;
    
    // Get ALL posts using pagination with WordPressClient
    while (true) {
        try {
            console.log(`📄 Fetching page ${page}...`);
            
            const posts = await wp.getPosts({ 
                status: 'publish', 
                per_page: '100', 
                page: page.toString() 
            });
            
            if (!posts || posts.length === 0) {
                console.log('   No more posts');
                break;
            }
            
            // For first page, we can't get total pages easily, so just continue until empty
            if (page === 1) {
                console.log(`   Found ${posts.length} posts on first page`);
            }
            
            allPosts.push(...posts);
            console.log(`   Added ${posts.length} posts (Total: ${allPosts.length})`);
            page++;
            
            // Safety limit to prevent infinite loop
            if (page > 50) {
                console.log('   Reached safety limit of 50 pages (5000 posts)');
                break;
            }
            
        } catch (error: any) {
            console.log(`   Error on page ${page}: ${error.message}`);
            break;
        }
    }

    console.log(`\n📊 TOTAL POSTS FOUND: ${allPosts.length}\n`);

    const audit = {
        total: allPosts.length,
        byLanguage: { hebrew: 0, english: 0, mixed: 0 },
        seoScores: { excellent: 0, good: 0, poor: 0, missing: 0 },
        content: { long: 0, medium: 0, short: 0 },
        metadata: { 
            withCategories: 0, 
            withTags: 0, 
            withFocusKeyword: 0,
            withFeaturedImage: 0 
        },
        issues: {
            noFocusKeyword: [],
            lowSeoScore: [],
            shortContent: [],
            noCategories: [],
            noTags: [],
            noFeaturedImage: [],
            translationIssues: []
        }
    };

    console.log('📊 Analyzing all posts...\n');

    for (let i = 0; i < allPosts.length; i++) {
        const post = allPosts[i];
        
        // Progress indicator
        if (i % 10 === 0) {
            process.stdout.write(`\rProgress: ${i + 1}/${allPosts.length} (${Math.round(((i + 1) / allPosts.length) * 100)}%)`);
        }

        const title = post.title.rendered;
        const content = post.content.rendered;
        const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
        
        // Language detection
        const isHebrew = /[\u0590-\u05FF]/.test(title);
        const isEnglish = /[a-zA-Z]/.test(title) && !/[\u0590-\u05FF]/.test(title);
        
        if (isHebrew && !isEnglish) audit.byLanguage.hebrew++;
        else if (isEnglish && !isHebrew) audit.byLanguage.english++;
        else audit.byLanguage.mixed++;

        // Content length
        if (wordCount >= 2000) audit.content.long++;
        else if (wordCount >= 1000) audit.content.medium++;
        else audit.content.short++;

        // Metadata analysis
        const focusKeyword = post.meta?.rank_math_focus_keyword || '';
        const categories = post.categories || [];
        const tags = post.tags || [];
        const featuredMedia = post.featured_media || 0;
        const seoScore = post.meta?.rank_math_seo_score || 0;

        if (focusKeyword) audit.metadata.withFocusKeyword++;
        if (categories.length > 0) audit.metadata.withCategories++;
        if (tags.length > 0) audit.metadata.withTags++;
        if (featuredMedia > 0) audit.metadata.withFeaturedImage++;

        // SEO score analysis
        let calculatedScore = 0;
        try {
            calculatedScore = contentGenerator.calculateScore(content, title, focusKeyword);
        } catch (error) {
            calculatedScore = 0;
        }

        if (calculatedScore >= 80) audit.seoScores.excellent++;
        else if (calculatedScore >= 50) audit.seoScores.good++;
        else if (calculatedScore > 0) audit.seoScores.poor++;
        else audit.seoScores.missing++;

        // Track issues
        if (!focusKeyword) {
            audit.issues.noFocusKeyword.push({ id: post.id, title: title.substring(0, 50) });
        }
        if (calculatedScore < 50) {
            audit.issues.lowSeoScore.push({ id: post.id, title: title.substring(0, 50), score: calculatedScore });
        }
        if (wordCount < 1000) {
            audit.issues.shortContent.push({ id: post.id, title: title.substring(0, 50), words: wordCount });
        }
        if (categories.length === 0) {
            audit.issues.noCategories.push({ id: post.id, title: title.substring(0, 50) });
        }
        if (tags.length === 0) {
            audit.issues.noTags.push({ id: post.id, title: title.substring(0, 50) });
        }
        if (featuredMedia === 0) {
            audit.issues.noFeaturedImage.push({ id: post.id, title: title.substring(0, 50) });
        }
    }

    console.log('\n\n📋 COMPREHENSIVE AUDIT RESULTS:\n');

    console.log('🌐 LANGUAGE DISTRIBUTION:');
    console.log(`   Hebrew posts: ${audit.byLanguage.hebrew}`);
    console.log(`   English posts: ${audit.byLanguage.english}`);
    console.log(`   Mixed/Other: ${audit.byLanguage.mixed}`);
    console.log(`   Translation balance: ${Math.abs(audit.byLanguage.hebrew - audit.byLanguage.english)} gap\n`);

    console.log('📊 SEO SCORE DISTRIBUTION:');
    console.log(`   Excellent (80+): ${audit.seoScores.excellent} posts`);
    console.log(`   Good (50-79): ${audit.seoScores.good} posts`);
    console.log(`   Poor (<50): ${audit.seoScores.poor} posts`);
    console.log(`   Missing/Error: ${audit.seoScores.missing} posts\n`);

    console.log('📝 CONTENT LENGTH:');
    console.log(`   Long (2000+ words): ${audit.content.long} posts`);
    console.log(`   Medium (1000-1999): ${audit.content.medium} posts`);
    console.log(`   Short (<1000): ${audit.content.short} posts\n`);

    console.log('🔧 METADATA COMPLETENESS:');
    console.log(`   With focus keywords: ${audit.metadata.withFocusKeyword}/${audit.total} (${Math.round((audit.metadata.withFocusKeyword / audit.total) * 100)}%)`);
    console.log(`   With categories: ${audit.metadata.withCategories}/${audit.total} (${Math.round((audit.metadata.withCategories / audit.total) * 100)}%)`);
    console.log(`   With tags: ${audit.metadata.withTags}/${audit.total} (${Math.round((audit.metadata.withTags / audit.total) * 100)}%)`);
    console.log(`   With featured images: ${audit.metadata.withFeaturedImage}/${audit.total} (${Math.round((audit.metadata.withFeaturedImage / audit.total) * 100)}%)\n`);

    console.log('🚨 CRITICAL ISSUES:');
    console.log(`   No focus keyword: ${audit.issues.noFocusKeyword.length} posts`);
    console.log(`   Low SEO score: ${audit.issues.lowSeoScore.length} posts`);
    console.log(`   Short content: ${audit.issues.shortContent.length} posts`);
    console.log(`   No categories: ${audit.issues.noCategories.length} posts`);
    console.log(`   No tags: ${audit.issues.noTags.length} posts`);
    console.log(`   No featured image: ${audit.issues.noFeaturedImage.length} posts\n`);

    // Show worst offenders
    const worstSeo = audit.issues.lowSeoScore
        .sort((a, b) => a.score - b.score)
        .slice(0, 10);

    if (worstSeo.length > 0) {
        console.log('❌ WORST SEO SCORES (Bottom 10):');
        worstSeo.forEach(post => {
            console.log(`   ${post.id}: ${post.score}% - ${post.title}...`);
        });
        console.log('');
    }

    const shortestContent = audit.issues.shortContent
        .sort((a, b) => a.words - b.words)
        .slice(0, 10);

    if (shortestContent.length > 0) {
        console.log('📝 SHORTEST CONTENT (Bottom 10):');
        shortestContent.forEach(post => {
            console.log(`   ${post.id}: ${post.words} words - ${post.title}...`);
        });
        console.log('');
    }

    // Overall health assessment
    const healthScore = Math.round(
        (audit.seoScores.excellent + audit.seoScores.good) / audit.total * 100
    );

    console.log('🎯 OVERALL HEALTH ASSESSMENT:');
    console.log(`   Site Health Score: ${healthScore}% (posts with 50+ SEO scores)`);
    console.log(`   Translation Balance: ${Math.abs(audit.byLanguage.hebrew - audit.byLanguage.english) <= 10 ? '✅ Good' : '⚠️  Imbalanced'}`);
    console.log(`   Content Quality: ${audit.content.long + audit.content.medium}/${audit.total} posts have 1000+ words`);
    console.log(`   Metadata Completeness: ${Math.round((audit.metadata.withFocusKeyword + audit.metadata.withCategories + audit.metadata.withTags) / (audit.total * 3) * 100)}%`);

    console.log('\n💡 IMMEDIATE ACTIONS NEEDED:');
    if (audit.issues.noFocusKeyword.length > 10) console.log(`   - Add focus keywords to ${audit.issues.noFocusKeyword.length} posts`);
    if (audit.issues.lowSeoScore.length > 20) console.log(`   - Optimize SEO for ${audit.issues.lowSeoScore.length} posts`);
    if (audit.issues.shortContent.length > 20) console.log(`   - Expand content for ${audit.issues.shortContent.length} posts`);
    if (audit.issues.noCategories.length > 5) console.log(`   - Add categories to ${audit.issues.noCategories.length} posts`);
    if (audit.issues.noTags.length > 10) console.log(`   - Add tags to ${audit.issues.noTags.length} posts`);

    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(resolve(__dirname, '../real-audit-results.json'), JSON.stringify(audit, null, 2));
    console.log(`\n💾 Complete audit saved to: real-audit-results.json`);
}

realComprehensiveAudit().catch(error => {
    console.error('❌ Real audit failed:', error.message);
    process.exit(1);
});