#!/usr/bin/env tsx
/**
 * PRODUCTION TEST - Monday/Thursday Content Pipeline
 *
 * This script runs the actual pipeline with real API calls to verify all 7 gates work.
 *
 * IMPORTANT: This will:
 * - Make real API calls to Claude, Kie.ai, WordPress, Slack
 * - Generate actual content and media
 * - Send real Slack approval messages
 * - Incur API costs
 *
 * Gates to be tested:
 * 1. Topic Proposal → Slack approval
 * 2. Article Approval → Slack approval
 * 3. Video Preview → Slack approval (Approve/Regenerate/Skip)
 * 4. Social Combined → Slack approval
 * 5. Facebook Post → Slack approval → Upload-Post API
 * 6. LinkedIn Post → Slack approval → Upload-Post API
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PipelineOrchestrator } from '../lib/pipeline/orchestrator';

async function runProductionTest() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  PRODUCTION TEST - Mon/Thu Content Pipeline               ║');
    console.log('║  WARNING: Real API calls will be made!                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const orchestrator = new PipelineOrchestrator();

    console.log('📋 Test Plan:');
    console.log('─'.repeat(60));
    console.log('1. Trigger Topic Proposal → Gate 1: Topic Approval');
    console.log('2. (Approve in Slack) → Trigger Article Generation');
    console.log('3. Wait for Article Generation → Gate 2: Article Approval');
    console.log('4. (Approve in Slack) → English Translation → Video Gen');
    console.log('5. Wait for Video Generation → Gate 3: Video Approval');
    console.log('6. (Approve/Skip in Slack) → Social Content Gen');
    console.log('7. Social Content Generated → Gate 4: Social Approval');
    console.log('8. (Approve in Slack) → Gates 5 & 6: Facebook + LinkedIn');
    console.log('─'.repeat(60));
    console.log('');

    try {
        console.log('🚀 Starting Production Test...\n');
        console.log('📍 STEP 1: Proposing New Topic');
        console.log('─'.repeat(60));

        const topicResult = await orchestrator.proposeNewTopic();

        console.log('\n✅ Topic Proposal Complete!');
        console.log(`   Draft ID: ${topicResult.draftId}`);
        console.log(`   Status: ${topicResult.status}`);

        if (topicResult.topic) {
            console.log(`   Topic: "${topicResult.topic}"`);
        }

        console.log('\n📬 GATE 1 TRIGGERED: Topic Approval Request');
        console.log('─'.repeat(60));
        console.log('🔔 Check your Slack DMs for the topic proposal approval message!');
        console.log('');
        console.log('👉 To continue testing:');
        console.log('   1. Approve the topic in Slack');
        console.log('   2. This will trigger Article Generation');
        console.log('   3. Article generation will pause at Gate 2 (Article Approval)');
        console.log('   4. Continue approving each gate to test the full flow');
        console.log('');
        console.log('📊 Pipeline Status:');
        console.log(`   • Topic Proposal: ✅ SENT (Draft ID: ${topicResult.draftId})`);
        console.log('   • Article Generation: ⏳ Waiting for approval');
        console.log('   • Video Generation: ⏳ Pending');
        console.log('   • Social Publishing: ⏳ Pending');
        console.log('   • Platform Publishing: ⏳ Pending');
        console.log('');
        console.log('🎯 Next Actions:');
        console.log('   1. Check Slack for approval message');
        console.log('   2. Click "✅ Approve & Generate" to continue');
        console.log('   3. Monitor subsequent gates in Slack');
        console.log('   4. Verify each gate pauses the pipeline correctly');
        console.log('');
        console.log('📝 WordPress Draft:');
        console.log(`   https://tax4us.co.il/wp-admin/post.php?post=${topicResult.draftId}&action=edit`);
        console.log('');

        return topicResult;

    } catch (error: any) {
        console.error('\n❌ Production Test Failed!');
        console.error('─'.repeat(60));
        console.error(`Error: ${error.message}`);

        if (error.stack) {
            console.error('\nStack Trace:');
            console.error(error.stack);
        }

        console.error('\n💡 Common Issues:');
        console.error('   • Missing API keys in .env.local');
        console.error('   • WordPress authentication failure');
        console.error('   • Slack bot token invalid');
        console.error('   • Network connectivity issues');
        console.error('');

        throw error;
    }
}

// Run the test
runProductionTest()
    .then(() => {
        console.log('✅ Production test initiated successfully!');
        console.log('⏳ Continue testing by approving gates in Slack.\n');
    })
    .catch((error) => {
        console.error('❌ Production test failed:', error.message);
        process.exit(1);
    });
