#!/usr/bin/env npx tsx
/**
 * SMART GATE APPROVAL
 *
 * Analyzes pending approval content and auto-approves ONLY if quality is high.
 * Otherwise, shows issues and requires manual review.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { WordPressClient } from '../lib/clients/wordpress-client';
import { PipelineOrchestrator } from '../lib/pipeline/orchestrator';

interface QualityCheck {
    passed: boolean;
    score: number;
    reason: string;
}

class SmartGateApprover {
    private wp: WordPressClient;
    private orchestrator: PipelineOrchestrator;
    private readonly APPROVAL_THRESHOLD = 85; // Only auto-approve if 85%+ quality

    constructor() {
        this.wp = new WordPressClient();
        this.orchestrator = new PipelineOrchestrator();
    }

    /**
     * Analyze topic proposal quality
     */
    async analyzeTopicProposal(draftId: number): Promise<QualityCheck[]> {
        const post = await this.wp.getPost(draftId);
        const content = post.content?.rendered || post.excerpt?.rendered || "";
        const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

        const checks: QualityCheck[] = [];

        // Check 1: Title quality
        const titleLength = post.title.rendered.replace('[PROPOSAL]', '').trim().length;
        checks.push({
            passed: titleLength >= 30 && titleLength <= 120,
            score: titleLength >= 30 && titleLength <= 120 ? 20 : 0,
            reason: titleLength >= 30 && titleLength <= 120
                ? `Title length optimal (${titleLength} chars)`
                : `Title too ${titleLength < 30 ? 'short' : 'long'} (${titleLength} chars)`
        });

        // Check 2: Tax/Israel relevance
        const title = post.title.rendered.toLowerCase();
        const isTaxRelevant = title.includes('tax') || title.includes('irs') ||
                             title.includes('fbar') || title.includes('fatca');
        const isIsraelRelevant = title.includes('israel') || title.includes('us-israel') ||
                                title.includes('israeli');
        checks.push({
            passed: isTaxRelevant && isIsraelRelevant,
            score: (isTaxRelevant && isIsraelRelevant) ? 20 : (isTaxRelevant || isIsraelRelevant ? 10 : 0),
            reason: isTaxRelevant && isIsraelRelevant
                ? "Both tax and Israel topics covered"
                : isTaxRelevant ? "Tax relevant but missing Israel focus"
                : isIsraelRelevant ? "Israel relevant but missing tax focus"
                : "Missing both tax and Israel relevance"
        });

        // Check 3: Content structure (try to parse as JSON)
        let topicData: any = null;
        try {
            // The content is HTML-encoded JSON, need to decode
            const decoded = plainText
                .replace(/&#8220;/g, '"')
                .replace(/&#8221;/g, '"')
                .replace(/&#8217;/g, "'");
            topicData = JSON.parse(decoded);
        } catch (e) {
            // Not JSON, treat as plain text
        }

        if (topicData) {
            // Check 4: Has valid audience
            const hasAudience = topicData.audience && topicData.audience.length > 10;
            checks.push({
                passed: hasAudience,
                score: hasAudience ? 20 : 0,
                reason: hasAudience
                    ? `Valid audience defined: "${topicData.audience.substring(0, 50)}..."`
                    : "Missing or invalid audience"
            });

            // Check 5: Has reasoning
            const hasReasoning = topicData.reasoning && topicData.reasoning.length > 50;
            checks.push({
                passed: hasReasoning,
                score: hasReasoning ? 20 : 0,
                reason: hasReasoning
                    ? `Good reasoning provided (${topicData.reasoning.length} chars)`
                    : "Missing or weak reasoning"
            });

            // Check 6: Reasoning mentions specific tax concepts
            const taxConcepts = ['estate', 'gift', 'fbar', 'fatca', 'treaty', 'compliance',
                               'expat', 'dual citizen', 'cross-border', 'reporting'];
            const mentionedConcepts = taxConcepts.filter(c =>
                topicData.reasoning.toLowerCase().includes(c)
            );
            checks.push({
                passed: mentionedConcepts.length >= 2,
                score: Math.min(mentionedConcepts.length * 5, 20),
                reason: mentionedConcepts.length >= 2
                    ? `Mentions ${mentionedConcepts.length} tax concepts: ${mentionedConcepts.join(', ')}`
                    : `Only mentions ${mentionedConcepts.length} tax concept(s)`
            });
        } else {
            // Content is not structured JSON - likely an error
            checks.push({
                passed: false,
                score: 0,
                reason: "Content is not in expected JSON format"
            });
        }

        return checks;
    }

    /**
     * Determine if content should be auto-approved
     */
    async shouldApprove(draftId: number): Promise<{ approve: boolean; score: number; checks: QualityCheck[] }> {
        console.log(`🔍 Analyzing Draft #${draftId}...\n`);

        const checks = await this.analyzeTopicProposal(draftId);
        const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
        const maxScore = 100;
        const percentage = Math.round((totalScore / maxScore) * 100);

        console.log("─".repeat(60));
        console.log("📊 QUALITY CHECKS:");
        console.log("─".repeat(60));

        checks.forEach((check, i) => {
            const icon = check.passed ? '✅' : '❌';
            console.log(`${icon} Check ${i + 1}: ${check.reason} [${check.score} pts]`);
        });

        console.log("");
        console.log("─".repeat(60));
        console.log(`📈 TOTAL QUALITY SCORE: ${percentage}%`);
        console.log(`🎯 APPROVAL THRESHOLD: ${this.APPROVAL_THRESHOLD}%`);
        console.log("─".repeat(60));

        const approve = percentage >= this.APPROVAL_THRESHOLD;

        if (approve) {
            console.log("✅ DECISION: AUTO-APPROVE");
            console.log("   Quality score meets threshold. Safe to proceed.");
        } else {
            console.log("❌ DECISION: MANUAL REVIEW REQUIRED");
            console.log(`   Quality score (${percentage}%) below threshold (${this.APPROVAL_THRESHOLD}%)`);
            console.log("   Please review manually before approving.");
        }

        return { approve, score: percentage, checks };
    }

    /**
     * Auto-approve topic if quality is sufficient
     */
    async autoApprove(draftId: number, topic: string): Promise<boolean> {
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║  SMART GATE APPROVAL - Quality-Based Auto-Approval        ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");

        const post = await this.wp.getPost(draftId);
        console.log(`📄 Draft: ${post.title.rendered}`);
        console.log(`🆔 Draft ID: ${draftId}`);
        console.log("");

        const decision = await this.shouldApprove(draftId);

        if (decision.approve) {
            console.log("");
            console.log("─".repeat(60));
            console.log("🚀 TRIGGERING ARTICLE GENERATION...");
            console.log("─".repeat(60));

            try {
                const result = await this.orchestrator.generatePost(draftId, topic);

                console.log("");
                console.log("✅ SUCCESS! Article generation triggered.");
                console.log(`📍 Status: ${result.status}`);
                if (result.postId) {
                    console.log(`🆔 Post ID: ${result.postId}`);
                }
                console.log("");
                console.log("🚪 Next Gate: Gate 2 (Article Approval)");
                console.log("   Watch for article completion, then review for approval.");
                console.log("");

                return true;
            } catch (error: any) {
                console.error(`❌ Error triggering article generation: ${error.message}`);
                return false;
            }
        } else {
            console.log("");
            console.log("─".repeat(60));
            console.log("⚠️  MANUAL REVIEW NEEDED");
            console.log("─".repeat(60));
            console.log("Quality issues detected. Please:");
            console.log(`1. Review draft: https://tax4us.co.il/wp-admin/post.php?post=${draftId}&action=edit`);
            console.log("2. Either regenerate topic or approve manually in Slack");
            console.log("");

            // Show what needs improvement
            const failedChecks = decision.checks.filter(c => !c.passed);
            if (failedChecks.length > 0) {
                console.log("Issues to address:");
                failedChecks.forEach((check, i) => {
                    console.log(`  ${i + 1}. ${check.reason}`);
                });
                console.log("");
            }

            return false;
        }
    }
}

// Run smart approval
async function main() {
    const draftId = parseInt(process.argv[2] || "2699");
    const topic = process.argv[3] || "Navigating the Changing Landscape of US-Israel Estate and Gift Tax Planning";

    const approver = new SmartGateApprover();
    await approver.autoApprove(draftId, topic);
}

main().catch(error => {
    console.error("❌ Smart approval failed:", error.message);
    process.exit(1);
});
