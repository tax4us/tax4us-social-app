#!/usr/bin/env npx tsx
/**
 * CHECK VIDEO EMBEDDING in both posts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';

const hebrewPostId = 2706;
const englishPostId = 2712;

async function checkVideoEmbedding() {
    const wp = new WordPressClient();

    console.log('🔍 CHECKING VIDEO EMBEDDING\n');

    // Check Hebrew post
    console.log(`📋 Hebrew Post ${hebrewPostId}:`);
    const hebrewPost = await wp.getPost(hebrewPostId.toString());
    const hebrewContent = hebrewPost.content.rendered;
    
    const hebrewVideoMatches = hebrewContent.match(/<video[^>]*src="([^"]*)"[^>]*>/g);
    if (hebrewVideoMatches) {
        console.log('   Video tags found:');
        hebrewVideoMatches.forEach((match, i) => {
            const src = match.match(/src="([^"]*)"/)?.[1];
            console.log(`   ${i + 1}. ${src}`);
        });
    } else {
        console.log('   No video tags found');
    }

    // Check English post  
    console.log(`\n📋 English Post ${englishPostId}:`);
    const englishPost = await wp.getPost(englishPostId.toString());
    const englishContent = englishPost.content.rendered;
    
    const englishVideoMatches = englishContent.match(/<video[^>]*src="([^"]*)"[^>]*>/g);
    if (englishVideoMatches) {
        console.log('   Video tags found:');
        englishVideoMatches.forEach((match, i) => {
            const src = match.match(/src="([^"]*)"/)?.[1];
            console.log(`   ${i + 1}. ${src}`);
        });
    } else {
        console.log('   No video tags found');
    }

    console.log('\n🔍 Searching for any video-related content...');
    
    // Look for Kie.ai video URLs in meta or content
    const hebrewMeta = hebrewPost.meta || {};
    const englishMeta = englishPost.meta || {};
    
    console.log('\nHebrew post meta keys:', Object.keys(hebrewMeta));
    console.log('English post meta keys:', Object.keys(englishMeta));
    
    // Look for video URLs in meta
    Object.entries(hebrewMeta).forEach(([key, value]) => {
        if (typeof value === 'string' && value.includes('tempfile.aiquickdraw.com')) {
            console.log(`Hebrew meta ${key}: ${value}`);
        }
    });
    
    Object.entries(englishMeta).forEach(([key, value]) => {
        if (typeof value === 'string' && value.includes('tempfile.aiquickdraw.com')) {
            console.log(`English meta ${key}: ${value}`);
        }
    });
    
    // Look for video URLs in content
    if (hebrewContent.includes('tempfile.aiquickdraw.com')) {
        console.log('Hebrew content contains video URL');
    }
    if (englishContent.includes('tempfile.aiquickdraw.com')) {
        console.log('English content contains video URL');
    }
}

checkVideoEmbedding().catch(error => {
    console.error('❌ Video check failed:', error.message);
    process.exit(1);
});