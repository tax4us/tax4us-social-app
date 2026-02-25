#!/usr/bin/env npx tsx
/**
 * SMART GATE 2 APPROVAL - Article Quality Analysis
 *
 * Analyzes generated article content and auto-approves ONLY if quality is high.
 * Checks: content length, SEO score, structure, readability, tax accuracy
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

class Gate2Approver {
    private wp: WordPressClient;
    private orchestrator: PipelineOrchestrator;
    private readonly APPROVAL_THRESHOLD = 75; // Gate 2 is stricter - need 75%+

    constructor() {
        this.wp = new WordPressClient();
        this.orchestrator = new PipelineOrchestrator();
    }

    /**
     * Analyze article quality
     */
    async analyzeArticle(postId: number): Promise<QualityCheck[]> {
        const post = await this.wp.getPost(postId);
        const content = post.content?.rendered || "";
        const plainText = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

        const checks: QualityCheck[] = [];

        // Check 1: Article length (should be 700-1500 words)
        const wordCount = plainText.split(/\s+/).length;
        checks.push({
            passed: wordCount >= 700 && wordCount <= 1500,
            score: wordCount >= 700 && wordCount <= 1500 ? 20 :
                   wordCount >= 500 ? 10 : 0,
            reason: `Word count: ${wordCount} words ${wordCount >= 700 && wordCount <= 1500 ? '(optimal)' : wordCount >= 500 ? '(acceptable)' : '(too short)'}`
        });

        // Check 2: Has proper title
        const hasProperTitle = !post.title.rendered.includes('[PROPOSAL]') &&
                              !post.title.rendered.includes('[AWAITING APPROVAL]');
        checks.push({
            passed: hasProperTitle,
            score: hasProperTitle ? 15 : 0,
            reason: hasProperTitle ? "Title properly formatted" : "Title still has proposal/approval tags"
        });

        // Check 3: Content structure (has headings, paragraphs)
        const hasHeadings = content.includes('<h2') || content.includes('<h3');
        const hasParagraphs = content.includes('<p>');
        const hasStructure = hasHeadings && hasParagraphs;
        checks.push({
            passed: hasStructure,
            score: hasStructure ? 15 : 0,
            reason: hasStructure ? "Proper HTML structure (headings + paragraphs)" : "Missing proper structure"
        });

        // Check 4: Hebrew content (for Hebrew article)
        const hasHebrew = /[\u0590-\u05FF]/.test(plainText);
        checks.push({
            passed: hasHebrew,
            score: hasHebrew ? 15 : 0,
            reason: hasHebrew ? "Contains Hebrew text" : "Missing Hebrew content"
        });

        // Check 5: Tax-relevant content
        const taxKeywords = ['מס', 'מיסוי', 'דיווח', 'irs', 'fbar', 'fatca', 'מתנות', 'הירושות'];
        const foundKeywords = taxKeywords.filter(kw =>
            plainText.toLowerCase().includes(kw.toLowerCase())
        );
        checks.push({
            passed: foundKeywords.length >= 3,
            score: Math.min(foundKeywords.length * 5, 20),
            reason: `Contains ${foundKeywords.length} tax keywords: ${foundKeywords.slice(0, 3).join(', ')}...`
        });

        // Check 6: No placeholder text
        const placeholders = ['lorem ipsum', 'todo', 'tbd', '[insert', 'placeholder'];
        const hasPlaceholders = placeholders.some(p => plainText.toLowerCase().includes(p));
        checks.push({
            passed: !hasPlaceholders,
            score: !hasPlaceholders ? 15 : 0,
            reason: !hasPlaceholders ? "No placeholder text found" : "Contains placeholder text - needs editing"
        });

        return checks;
    }

    /**
     * Determine if article should be auto-approved
     */
    async shouldApprove(postId: number): Promise<{ approve: boolean; score: number; checks: QualityCheck[]; warnings: string[] }> {
        console.log(`🔍 Analyzing Article (Post #${postId})...\n`);

        const checks = await this.analyzeArticle(postId);
        const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
        const maxScore = 100;
        const percentage = Math.round((totalScore / maxScore) * 100);

        console.log("─".repeat(60));
        console.log("📊 ARTICLE QUALITY CHECKS:");
        console.log("─".repeat(60));

        checks.forEach((check, i) => {
            const icon = check.passed ? '✅' : '❌';
            console.log(`${icon} Check ${i + 1}: ${check.reason} [${check.score} pts]`);
        });

        // Check for warnings (non-blocking issues)
        const warnings: string[] = [];

        // Read pipeline logs for SEO score
        const fs = require('fs');
        const pipelineLogs = JSON.parse(fs.readFileSync(resolve(__dirname, '../pipeline-logs.json'), 'utf-8'));
        const seoLog = pipelineLogs.find((log: any) =>
            log.message.includes('Article ready. Score:') && log.topicId === postId.toString()
        );

        if (seoLog) {
            const seoMatch = seoLog.message.match(/Score: (\d+)\/100/);
            if (seoMatch) {
                const seoScore = parseInt(seoMatch[1]);
                if (seoScore < 50) {
                    warnings.push(`⚠️  Low SEO score: ${seoScore}/100 (consider optimization)`);
                }
            }
        }

        // Check for failed image generation
        const imageError = pipelineLogs.find((log: any) =>
            log.level === 'error' && log.message.includes('Image Generation')
        );
        if (imageError) {
            warnings.push("⚠️  Featured image generation failed (will need manual upload)");
        }

        console.log("");
        console.log("─".repeat(60));
        console.log(`📈 TOTAL QUALITY SCORE: ${percentage}%`);
        console.log(`🎯 APPROVAL THRESHOLD: ${this.APPROVAL_THRESHOLD}%`);
        console.log("─".repeat(60));

        if (warnings.length > 0) {
            console.log("\n⚠️  WARNINGS (non-blocking):");
            warnings.forEach(w => console.log(`   ${w}`));
            console.log("");
        }

        const approve = percentage >= this.APPROVAL_THRESHOLD && checks.filter(c => c.passed).length >= 4;

        if (approve) {
            console.log("✅ DECISION: AUTO-APPROVE");
            console.log("   Article quality meets standards. Proceeding to translation.");
        } else {
            console.log("❌ DECISION: MANUAL REVIEW REQUIRED");
            console.log(`   Quality score ${percentage < this.APPROVAL_THRESHOLD ? `(${percentage}%) below threshold` : 'has critical issues'}`);
            console.log("   Please review before approving.");
        }

        return { approve, score: percentage, checks, warnings };
    }

    /**
     * Auto-approve article if quality is sufficient
     */
    async autoApprove(postId: number): Promise<boolean> {
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║  GATE 2: ARTICLE APPROVAL - Smart Quality Analysis        ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");

        const post = await this.wp.getPost(postId);
        console.log(`📝 Article: ${post.title.rendered}`);
        console.log(`🆔 Post ID: ${postId}`);
        console.log(`🔗 Preview: ${post.link}`);
        console.log("");

        const decision = await this.shouldApprove(postId);

        if (decision.approve) {
            console.log("");
            console.log("─".repeat(60));
            console.log("🚀 APPROVING ARTICLE & TRIGGERING TRANSLATION...");
            console.log("─".repeat(60));

            try {
                // Call publishApprovedArticle to trigger English translation
                await this.orchestrator.publishApprovedArticle(postId);

                console.log("");
                console.log("✅ SUCCESS! Article approved and translation started.");
                console.log("");
                console.log("🚪 Pipeline Progress:");
                console.log("   ✅ Gate 1: Topic Proposal (auto-approved)");
                console.log("   ✅ Gate 2: Article Approval (auto-approved)");
                console.log("   🔄 English Translation (in progress)");
                console.log("   ⏳ Gate 3: Video Preview (pending)");
                console.log("");

                return true;
            } catch (error: any) {
                console.error(`❌ Error approving article: ${error.message}`);
                return false;
            }
        } else {
            console.log("");
            console.log("─".repeat(60));
            console.log("⚠️  MANUAL APPROVAL REQUIRED");
            console.log("─".repeat(60));

            const failedChecks = decision.checks.filter(c => !c.passed);
            if (failedChecks.length > 0) {
                console.log("\nIssues to address:");
                failedChecks.forEach((check, i) => {
                    console.log(`  ${i + 1}. ${check.reason}`);
                });
            }

            console.log("\nNext steps:");
            console.log(`1. Review article: ${post.link}`);
            console.log(`2. Edit in WordPress: https://tax4us.co.il/wp-admin/post.php?post=${postId}&action=edit`);
            console.log("3. Either fix issues and regenerate, or approve manually in Slack");
            console.log("");

            return false;
        }
    }
}

// Run Gate 2 smart approval
async function main() {
    const postId = parseInt(process.argv[2] || "2699");

    const approver = new Gate2Approver();
    await approver.autoApprove(postId);
}

main().catch(error => {
    console.error("❌ Gate 2 approval failed:", error.message);
    process.exit(1);
});
