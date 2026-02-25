#!/usr/bin/env npx tsx
/**
 * TEST SEO-OPTIMIZED CONTENT GENERATION
 * Validate that the updated pipeline generates 90-100 SEO scores with Ben's style
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { ContentGenerator } from '../lib/pipeline/content-generator';

async function testSEOOptimizedGeneration() {
    const generator = new ContentGenerator();

    console.log('🧪 TESTING SEO-OPTIMIZED CONTENT GENERATION\n');

    const testTopic = {
        id: "test-123",
        topic: "השלכות עבודה מרחוק על ציות מס בין ארה\"ב וישראל",
        title: "השלכות עבודה מרחוק על ציות מס בין ארה\"ב וישראל",
        audience: "Israeli Taxpayers with US connections",
        language: "he" as const,
        type: "blog_post" as const,
        status: "processing" as const,
        keywords: ["עבודה מרחוק מס", "ציות מס", "ארה\"ב ישראל"]
    };

    console.log('📋 Test Topic:', testTopic.topic);
    console.log('🎯 Target: 90-100 SEO Score + Ben\'s Professional Style\n');

    try {
        console.log('⏳ Generating article with updated SEO optimization...');
        const result = await generator.generateArticle(testTopic);

        console.log('✅ Article generated successfully!\n');

        // Extract content metrics
        const contentText = result.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const wordCount = contentText.split(/\s+/).filter(w => w.length > 1).length;
        const focusKeyword = result.metadata.focus_keyword;
        
        console.log('📊 CONTENT METRICS:');
        console.log(`   Word Count: ${wordCount} (Target: 2000+)`);
        console.log(`   SEO Score: ${result.seo_score}/100 (Target: 90+)`);
        console.log(`   Focus Keyword: "${focusKeyword}"`);
        console.log(`   Title: ${result.metadata.title}`);
        console.log(`   SEO Title: ${result.metadata.seo_title}`);

        // Analyze keyword integration
        const contentLower = contentText.toLowerCase();
        const keywordLower = focusKeyword.toLowerCase();
        const keywordMatches = (contentLower.match(new RegExp(keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
        const keywordDensity = ((keywordMatches / wordCount) * 100).toFixed(2);

        console.log(`\n🔍 KEYWORD ANALYSIS:`);
        console.log(`   Keyword in title: ${result.metadata.title.toLowerCase().includes(keywordLower) ? '✅' : '❌'}`);
        console.log(`   Keyword occurrences: ${keywordMatches}`);
        console.log(`   Keyword density: ${keywordDensity}% (Target: 1-1.5%)`);

        // Check for clickbait numbers
        const hasNumbers = /\d/.test(result.metadata.title);
        console.log(`   Professional style (no clickbait numbers): ${!hasNumbers ? '✅' : '❌'}`);

        // Analyze content structure
        const headings = result.content.match(/<h[2-3].*?>.*?<\/h[2-3]>/gi) || [];
        const links = result.content.match(/href=["']https?:\/\/[^"']*/gi) || [];
        const internalLinks = links.filter(link => link.includes('tax4us.co.il')).length;
        const externalLinks = links.length - internalLinks;

        console.log(`\n🏗️  STRUCTURE ANALYSIS:`);
        console.log(`   Headings (H2/H3): ${headings.length} (Target: 6+)`);
        console.log(`   Internal links: ${internalLinks} (Target: 3+)`);
        console.log(`   External links: ${externalLinks} (Target: 2+)`);

        // Overall assessment
        const isGoodLength = wordCount >= 2000;
        const isGoodSeoScore = result.seo_score >= 90;
        const isGoodKeywordDensity = parseFloat(keywordDensity) >= 1.0 && parseFloat(keywordDensity) <= 1.5;
        const isGoodStructure = headings.length >= 6 && internalLinks >= 3 && externalLinks >= 2;
        const isProfessionalStyle = !hasNumbers;

        console.log(`\n🎯 OVERALL ASSESSMENT:`);
        console.log(`   Length: ${isGoodLength ? '✅' : '❌'} ${wordCount} words`);
        console.log(`   SEO Score: ${isGoodSeoScore ? '✅' : '❌'} ${result.seo_score}/100`);
        console.log(`   Keyword Integration: ${isGoodKeywordDensity ? '✅' : '❌'} ${keywordDensity}%`);
        console.log(`   Structure: ${isGoodStructure ? '✅' : '❌'} H:${headings.length} IL:${internalLinks} EL:${externalLinks}`);
        console.log(`   Ben's Style: ${isProfessionalStyle ? '✅' : '❌'} Professional titles`);

        const allPassing = isGoodLength && isGoodSeoScore && isGoodKeywordDensity && isGoodStructure && isProfessionalStyle;
        console.log(`\n🎉 RESULT: ${allPassing ? '✅ ALL TESTS PASSED' : '⚠️  NEEDS IMPROVEMENT'}`);

        if (!allPassing) {
            console.log(`\n🛠️  IMPROVEMENTS NEEDED:`);
            if (!isGoodLength) console.log(`   - Expand content to 2000+ words (current: ${wordCount})`);
            if (!isGoodSeoScore) console.log(`   - Improve SEO score (current: ${result.seo_score}/100)`);
            if (!isGoodKeywordDensity) console.log(`   - Adjust keyword density to 1-1.5% (current: ${keywordDensity}%)`);
            if (!isGoodStructure) console.log(`   - Add more headings and links`);
            if (!isProfessionalStyle) console.log(`   - Remove numbers from title for Ben's style`);
        }

        // Show content preview
        console.log(`\n📝 CONTENT PREVIEW:`);
        console.log(contentText.substring(0, 300) + '...\n');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    }
}

testSEOOptimizedGeneration().catch(error => {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
});