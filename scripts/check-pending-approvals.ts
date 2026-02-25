#!/usr/bin/env npx tsx
/**
 * CHECK PENDING APPROVALS
 *
 * Fetches WordPress drafts and shows what's waiting for approval.
 * Analyzes content quality to help with approval decisions.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';

async function checkPendingApprovals() {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║  PENDING APPROVAL CHECKER                                  ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const wp = new WordPressClient();

    // Get draft ID from pipeline logs
    const draftId = 2699; // From latest pipeline run

    try {
        console.log(`📄 Fetching WordPress Draft #${draftId}...\n`);

        const post = await wp.getPost(draftId);

        console.log("─".repeat(60));
        console.log("📋 DRAFT DETAILS:");
        console.log("─".repeat(60));
        console.log(`Title: ${post.title.rendered}`);
        console.log(`Status: ${post.status}`);
        console.log(`Draft URL: ${post.link}`);
        console.log(`Edit URL: https://tax4us.co.il/wp-admin/post.php?post=${draftId}&action=edit`);
        console.log("");

        // Extract excerpt/content preview
        const content = post.content?.rendered || post.excerpt?.rendered || "";
        const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

        console.log("─".repeat(60));
        console.log("📝 CONTENT PREVIEW:");
        console.log("─".repeat(60));
        console.log(plainText.substring(0, 500) + "...");
        console.log("");

        // Analyze for approval criteria
        console.log("─".repeat(60));
        console.log("🔍 QUALITY ANALYSIS:");
        console.log("─".repeat(60));

        const criteria = {
            hasTitle: post.title.rendered.length > 10,
            titleRelevant: post.title.rendered.toLowerCase().includes('tax') ||
                          post.title.rendered.toLowerCase().includes('israel'),
            hasContent: plainText.length > 100,
            isDraft: post.status === 'draft',
            hasFeaturedImage: !!post.featured_media && post.featured_media > 0,
        };

        console.log(`✓ Has meaningful title: ${criteria.hasTitle ? '✅ YES' : '❌ NO'} (${post.title.rendered.length} chars)`);
        console.log(`✓ Tax/Israel relevant: ${criteria.titleRelevant ? '✅ YES' : '❌ NO'}`);
        console.log(`✓ Has content: ${criteria.hasContent ? '✅ YES' : '❌ NO'} (${plainText.length} chars)`);
        console.log(`✓ Status is draft: ${criteria.isDraft ? '✅ YES' : '❌ NO'}`);
        console.log(`✓ Has featured image: ${criteria.hasFeaturedImage ? '✅ YES' : '❌ NO'}`);

        const passCount = Object.values(criteria).filter(v => v).length;
        const totalCriteria = Object.keys(criteria).length;

        console.log("");
        console.log("─".repeat(60));
        console.log(`📊 QUALITY SCORE: ${passCount}/${totalCriteria} (${Math.round(passCount/totalCriteria*100)}%)`);
        console.log("─".repeat(60));

        if (passCount === totalCriteria) {
            console.log("✅ RECOMMENDATION: APPROVE");
            console.log("   All quality criteria met. Safe to approve.");
        } else if (passCount >= totalCriteria * 0.8) {
            console.log("⚠️  RECOMMENDATION: REVIEW CAREFULLY");
            console.log("   Most criteria met, but manual review recommended.");
        } else {
            console.log("❌ RECOMMENDATION: REJECT OR REGENERATE");
            console.log("   Quality issues detected. Consider requesting changes.");
        }

        console.log("");
        console.log("─".repeat(60));
        console.log("🎯 NEXT ACTIONS:");
        console.log("─".repeat(60));
        console.log("1. Review content in WordPress (see Edit URL above)");
        console.log("2. Check Slack DM for approval buttons");
        console.log("3. Click '✅ Approve & Generate' to trigger Gate 2");
        console.log("4. Or regenerate if quality issues found");
        console.log("");

    } catch (error: any) {
        console.error(`❌ Error fetching draft: ${error.message}`);
        process.exit(1);
    }
}

checkPendingApprovals();
