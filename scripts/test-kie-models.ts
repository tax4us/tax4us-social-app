#!/usr/bin/env npx tsx
/**
 * TEST KIE.AI MODELS
 * Verify the fixed model names work correctly
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { KieClient } from '../lib/clients/kie-client';

async function testKieModels() {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║  KIE.AI MODEL VERIFICATION TEST                            ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const kie = new KieClient();

    // Test 1: Image Generation (nano-banana-pro)
    console.log("📸 TEST 1: Image Generation (nano-banana-pro)");
    console.log("─".repeat(60));

    try {
        const imageTaskId = await kie.generateImage(
            "Professional illustration for tax article: Modern minimalist design showing US and Israeli flags, estate planning symbols"
        );

        console.log(`✅ Image generation started successfully!`);
        console.log(`   Task ID: ${imageTaskId}`);
        console.log(`   Model: nano-banana-pro`);
        console.log("");
    } catch (error: any) {
        console.log(`❌ Image generation failed: ${error.message}`);
        console.log("");
    }

    // Test 2: Video Generation (sora-2-pro-text-to-video)
    console.log("🎥 TEST 2: Video Generation (sora-2-pro-text-to-video)");
    console.log("─".repeat(60));

    try {
        const videoTaskId = await kie.generateVideo({
            title: "US-Israel Estate Tax Planning",
            excerpt: "Understanding the changing landscape of cross-border estate and gift tax planning",
            style: "documentary"
        });

        console.log(`✅ Video generation started successfully!`);
        console.log(`   Task ID: ${videoTaskId}`);
        console.log(`   Model: sora-2-pro-text-to-video`);
        console.log("");
    } catch (error: any) {
        console.log(`❌ Video generation failed: ${error.message}`);
        console.log("");
    }

    console.log("─".repeat(60));
    console.log("✅ Both models tested. Check results above.");
    console.log("");
    console.log("Note: Tasks are async and take minutes to complete.");
    console.log("Use waitForVideo() or getTask() to poll for completion.");
}

testKieModels();
