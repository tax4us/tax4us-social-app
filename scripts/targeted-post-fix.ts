#!/usr/bin/env npx tsx
/**
 * TARGETED POST FIX
 * Fix the worst performing posts systematically by worker type
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { ContentGenerator } from '../lib/pipeline/content-generator';
import { PipelineOrchestrator } from '../lib/pipeline/orchestrator';

async function targetedPostFix() {
    const wp = new WordPressClient();
    const contentGenerator = new ContentGenerator();
    const orchestrator = new PipelineOrchestrator();

    console.log('🛠️  TARGETED POST FIX - SYSTEMATIC REPAIR\n');
    
    try {
        // Get recent posts for analysis
        console.log('📊 Analyzing recent posts for issues...');
        const posts = await wp.getPosts({ status: 'publish', per_page: '30' });
        
        const issues = {
            poorSeo: [],      // <50 SEO score
            missingKeywords: [], // No focus keyword
            shortContent: [],    // <1000 words
            needsOptimization: [] // 50-89 SEO score
        };

        console.log(`Analyzing ${posts.length} recent posts...\n`);

        for (const post of posts) {
            const title = post.title.rendered;
            const content = post.content.rendered;
            const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
            const focusKeyword = post.meta?.rank_math_focus_keyword || '';
            
            let seoScore = 0;
            try {
                seoScore = contentGenerator.calculateScore(content, title, focusKeyword);
            } catch (error) {
                seoScore = 0;
            }

            const analysis = {
                id: post.id,
                title: title.substring(0, 50) + '...',
                wordCount,
                seoScore,
                focusKeyword: focusKeyword.substring(0, 20),
                date: post.date.split('T')[0]
            };

            // Categorize issues
            if (!focusKeyword) {
                issues.missingKeywords.push(analysis);
            } else if (seoScore < 50) {
                issues.poorSeo.push(analysis);
            } else if (seoScore < 90) {
                issues.needsOptimization.push(analysis);
            }

            if (wordCount < 1000) {
                issues.shortContent.push(analysis);
            }
        }

        console.log('🎯 ISSUES IDENTIFIED:');
        console.log(`   Poor SEO (<50): ${issues.poorSeo.length} posts`);
        console.log(`   Missing keywords: ${issues.missingKeywords.length} posts`);
        console.log(`   Short content (<1000w): ${issues.shortContent.length} posts`);
        console.log(`   Needs optimization (50-89): ${issues.needsOptimization.length} posts\n`);

        if (issues.poorSeo.length === 0 && issues.missingKeywords.length === 0 && issues.shortContent.length === 0) {
            console.log('✅ No critical issues found in recent posts!');
            
            if (issues.needsOptimization.length > 0) {
                console.log(`\n🔧 Running SEO optimization on ${issues.needsOptimization.length} posts...`);
                await orchestrator.runSEOAutoPilot();
                console.log('✅ SEO optimization completed');
            }
            
            return;
        }

        // Fix the worst issues first
        console.log('🚨 STARTING SYSTEMATIC REPAIRS:\n');

        // 1. Fix missing keywords first (critical)
        if (issues.missingKeywords.length > 0) {
            console.log(`1️⃣  FIXING ${issues.missingKeywords.length} POSTS WITH MISSING KEYWORDS:`);
            
            for (let i = 0; i < Math.min(issues.missingKeywords.length, 5); i++) {
                const post = issues.missingKeywords[i];
                console.log(`   📝 Post ${post.id}: ${post.title}`);
                
                try {
                    // Get full post data
                    const fullPost = await wp.getPost(post.id.toString());
                    const content = fullPost.content.rendered;
                    const title = fullPost.title.rendered;
                    
                    // Generate a focus keyword based on content
                    const keywordPrompt = `Based on this article title and content, suggest a 2-4 word focus keyword in the same language:
                    
Title: ${title}
Content preview: ${content.replace(/<[^>]*>/g, ' ').substring(0, 500)}

Return ONLY the keyword phrase, nothing else.`;

                    const suggestedKeyword = await contentGenerator.claude.generate(
                        keywordPrompt,
                        "claude-3-haiku-20240307",
                        "You are an SEO expert. Generate focus keywords for tax articles."
                    );

                    const cleanKeyword = suggestedKeyword.trim().replace(/['"]/g, '');
                    
                    // Update post with focus keyword
                    await wp.updatePost(post.id, {
                        meta: {
                            rank_math_focus_keyword: cleanKeyword,
                            rank_math_title: `${cleanKeyword}: ${title.substring(0, 40)}`,
                            rank_math_description: `מדריך מקיף על ${cleanKeyword} - עצות מקצועיות ודרישות ציות מס בין ישראל לארה"ב`
                        }
                    });

                    console.log(`      ✅ Added keyword: "${cleanKeyword}"`);
                    
                } catch (error: any) {
                    console.log(`      ❌ Failed: ${error.message}`);
                }
            }
        }

        // 2. Run SEO optimization on poor scoring posts
        if (issues.poorSeo.length > 0 || issues.needsOptimization.length > 0) {
            console.log(`\n2️⃣  RUNNING SEO OPTIMIZATION ON LOW-SCORING POSTS:`);
            await orchestrator.runSEOAutoPilot();
            console.log('   ✅ SEO optimization completed');
        }

        // 3. Check for translation pairs
        console.log(`\n3️⃣  CHECKING FOR MISSING TRANSLATION PAIRS:`);
        const hebrewPosts = posts.filter(p => /[\u0590-\u05FF]/.test(p.title.rendered));
        const englishPosts = posts.filter(p => !/[\u0590-\u05FF]/.test(p.title.rendered));
        
        console.log(`   Hebrew posts: ${hebrewPosts.length}`);
        console.log(`   English posts: ${englishPosts.length}`);
        
        if (Math.abs(hebrewPosts.length - englishPosts.length) > 10) {
            console.log(`   ⚠️  Translation imbalance detected - may need Translator worker`);
        } else {
            console.log(`   ✅ Translation balance looks good`);
        }

        console.log('\n🎉 SYSTEMATIC REPAIR COMPLETED!');
        console.log('\n📊 SUMMARY OF ACTIONS:');
        console.log(`   ✅ Fixed missing keywords on up to 5 posts`);
        console.log(`   ✅ Ran SEO optimization on low-scoring posts`);
        console.log(`   ✅ Checked translation pair balance`);
        console.log('\n💡 RECOMMENDATION: Run SEO Auditor (Tue/Fri worker) regularly to maintain 90+ scores');

    } catch (error: any) {
        console.error('❌ Targeted fix failed:', error.message);
    }
}

targetedPostFix().catch(error => {
    console.error('❌ Fix script failed:', error.message);
    process.exit(1);
});