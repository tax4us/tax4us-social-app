#!/usr/bin/env npx tsx
/**
 * COMPREHENSIVE POST AUDIT
 * Analyze all WordPress posts and categorize fixes needed by worker type
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ContentGenerator } from '../lib/pipeline/content-generator';

async function comprehensivePostAudit() {
    const wp = new WordPressClient();
    const contentGenerator = new ContentGenerator();

    console.log('🔍 COMPREHENSIVE WORDPRESS POST AUDIT\n');
    
    try {
        // Get all published posts
        console.log('📊 Fetching all published posts...');
        let allPosts: any[] = [];
        let page = 1;
        const perPage = 50;
        
        while (true) {
            const posts = await wp.getPosts({ 
                per_page: perPage.toString(), 
                status: 'publish',
                page: page.toString()
            });
            
            if (posts.length === 0) break;
            allPosts = allPosts.concat(posts);
            console.log(`   Fetched page ${page}: ${posts.length} posts (Total: ${allPosts.length})`);
            page++;
            
            // Safety limit
            if (page > 20) {
                console.log('   Reached safety limit of 1000 posts');
                break;
            }
        }

        console.log(`\n📋 TOTAL POSTS ANALYZED: ${allPosts.length}\n`);

        const auditResults = {
            total: allPosts.length,
            byWorker: {
                contentGenerator: [],   // Low SEO score, short content
                translator: [],         // Missing translations
                mediaProcessor: [],     // Missing images/videos  
                socialPublisher: [],    // Missing tags/categories/links
                seoAuditor: []         // Need SEO optimization
            },
            quality: {
                goodSeo: [],           // SEO 80+
                poorSeo: [],           // SEO <50
                missingKeywords: [],   // No focus keyword
                shortContent: [],      // <1500 words
                missingTranslations: [], // No Hebrew/English pair
                missingImages: [],     // No featured image
                missingCategories: [], // <2 categories
                missingTags: [],       // <3 tags
                missingLinks: []       // No internal/external links
            }
        };

        // Analyze each post
        for (let i = 0; i < Math.min(allPosts.length, 50); i++) { // Limit to first 50 for initial audit
            const post = allPosts[i];
            const postId = post.id;
            
            process.stdout.write(`\r🔍 Analyzing post ${i + 1}/${Math.min(allPosts.length, 50)}: ${postId}`);
            
            const title = post.title.rendered;
            const content = post.content.rendered;
            const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
            
            // Get metadata
            const focusKeyword = post.meta?.rank_math_focus_keyword || '';
            const seoScore = post.meta?.rank_math_seo_score || 0;
            const categories = post.categories || [];
            const tags = post.tags || [];
            const featuredMedia = post.featured_media || 0;
            
            // Calculate fresh SEO score
            let calculatedSeoScore = 0;
            try {
                calculatedSeoScore = contentGenerator.calculateScore(content, title, focusKeyword);
            } catch (error) {
                // Skip if calculation fails
            }
            
            // Check for images
            const hasImages = content.includes('<img') || featuredMedia > 0;
            
            // Check for links
            const internalLinks = (content.match(/href=["']https?:\/\/(www\.)?tax4us\.co\.il[^"']*/gi) || []).length;
            const allLinks = (content.match(/href=["']https?:\/\/[^"']*/gi) || []).length;
            const externalLinks = allLinks - internalLinks;
            
            // Check language (simple heuristic)
            const isHebrew = /[\u0590-\u05FF]/.test(title);
            
            const analysis = {
                postId,
                title: title.substring(0, 60) + '...',
                wordCount,
                seoScore: typeof seoScore === 'number' ? seoScore : parseInt(seoScore) || 0,
                calculatedSeoScore,
                focusKeyword: focusKeyword.substring(0, 20),
                categories: categories.length,
                tags: tags.length,
                hasImages,
                internalLinks,
                externalLinks,
                isHebrew,
                date: post.date.split('T')[0]
            };

            // Categorize by issues
            if (calculatedSeoScore < 50) {
                auditResults.quality.poorSeo.push(analysis);
            } else if (calculatedSeoScore >= 80) {
                auditResults.quality.goodSeo.push(analysis);
            }

            if (!focusKeyword) {
                auditResults.quality.missingKeywords.push(analysis);
            }

            if (wordCount < 1500) {
                auditResults.quality.shortContent.push(analysis);
            }

            if (!hasImages) {
                auditResults.quality.missingImages.push(analysis);
            }

            if (categories.length < 2) {
                auditResults.quality.missingCategories.push(analysis);
            }

            if (tags.length < 3) {
                auditResults.quality.missingTags.push(analysis);
            }

            if (internalLinks < 2 || externalLinks < 1) {
                auditResults.quality.missingLinks.push(analysis);
            }

            // Categorize by worker needed
            if (calculatedSeoScore < 70 || wordCount < 1500 || !focusKeyword) {
                auditResults.byWorker.contentGenerator.push(analysis);
            }

            if (!hasImages || featuredMedia === 0) {
                auditResults.byWorker.mediaProcessor.push(analysis);
            }

            if (categories.length < 2 || tags.length < 3 || internalLinks < 2) {
                auditResults.byWorker.socialPublisher.push(analysis);
            }

            if (calculatedSeoScore < 90) {
                auditResults.byWorker.seoAuditor.push(analysis);
            }
        }

        console.log('\n\n📊 AUDIT RESULTS SUMMARY:\n');

        console.log('🎯 QUALITY METRICS:');
        console.log(`   Good SEO (80+): ${auditResults.quality.goodSeo.length} posts`);
        console.log(`   Poor SEO (<50): ${auditResults.quality.poorSeo.length} posts`);
        console.log(`   Missing keywords: ${auditResults.quality.missingKeywords.length} posts`);
        console.log(`   Short content (<1500 words): ${auditResults.quality.shortContent.length} posts`);
        console.log(`   Missing images: ${auditResults.quality.missingImages.length} posts`);
        console.log(`   Missing categories: ${auditResults.quality.missingCategories.length} posts`);
        console.log(`   Missing tags: ${auditResults.quality.missingTags.length} posts`);
        console.log(`   Missing links: ${auditResults.quality.missingLinks.length} posts`);

        console.log('\n🔧 WORK NEEDED BY WORKER:');
        console.log(`   Content Generator: ${auditResults.byWorker.contentGenerator.length} posts (low SEO, short content)`);
        console.log(`   Translator: Check for translation pairs needed`);
        console.log(`   Media Processor: ${auditResults.byWorker.mediaProcessor.length} posts (missing images)`);
        console.log(`   Social Publisher: ${auditResults.byWorker.socialPublisher.length} posts (missing metadata)`);
        console.log(`   SEO Auditor: ${auditResults.byWorker.seoAuditor.length} posts (need optimization)`);

        console.log('\n📋 DETAILED BREAKDOWN:\n');

        // Show worst performing posts
        const worstPosts = auditResults.quality.poorSeo
            .sort((a, b) => a.calculatedSeoScore - b.calculatedSeoScore)
            .slice(0, 10);

        if (worstPosts.length > 0) {
            console.log('❌ WORST PERFORMING POSTS (Bottom 10):');
            console.log('ID   | Score | Words | Focus Keyword      | Title');
            console.log('-----|-------|-------|-------------------|-------');
            worstPosts.forEach(post => {
                console.log(`${post.postId.toString().padEnd(4)} | ${post.calculatedSeoScore.toString().padEnd(5)} | ${post.wordCount.toString().padEnd(5)} | ${post.focusKeyword.padEnd(18)} | ${post.title}`);
            });
        }

        // Show best performing posts
        const bestPosts = auditResults.quality.goodSeo
            .sort((a, b) => b.calculatedSeoScore - a.calculatedSeoScore)
            .slice(0, 5);

        if (bestPosts.length > 0) {
            console.log('\n✅ BEST PERFORMING POSTS (Top 5):');
            console.log('ID   | Score | Words | Focus Keyword      | Title');
            console.log('-----|-------|-------|-------------------|-------');
            bestPosts.forEach(post => {
                console.log(`${post.postId.toString().padEnd(4)} | ${post.calculatedSeoScore.toString().padEnd(5)} | ${post.wordCount.toString().padEnd(5)} | ${post.focusKeyword.padEnd(18)} | ${post.title}`);
            });
        }

        console.log('\n🎯 PRIORITY ACTIONS:');
        console.log(`1. Content Generator: Fix ${auditResults.byWorker.contentGenerator.length} posts with poor SEO/content`);
        console.log(`2. SEO Auditor: Optimize ${auditResults.byWorker.seoAuditor.length} posts to 90+ scores`);
        console.log(`3. Media Processor: Add images to ${auditResults.byWorker.mediaProcessor.length} posts`);
        console.log(`4. Social Publisher: Fix metadata for ${auditResults.byWorker.socialPublisher.length} posts`);
        console.log(`5. Translator: Check for missing translation pairs`);

        // Save detailed results
        const resultsPath = resolve(__dirname, '../audit-results.json');
        require('fs').writeFileSync(resultsPath, JSON.stringify(auditResults, null, 2));
        console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    } catch (error: any) {
        console.error('❌ Audit failed:', error.message);
    }
}

comprehensivePostAudit().catch(error => {
    console.error('❌ Audit script failed:', error.message);
    process.exit(1);
});