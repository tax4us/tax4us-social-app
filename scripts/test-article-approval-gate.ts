#!/usr/bin/env tsx
import { SlackClient } from '../lib/clients/slack-client';

async function testArticleApprovalGate() {
  const slack = new SlackClient();

  console.log("📝 Testing Article Approval Gate...");

  // Test sending approval request
  await slack.sendArticleApprovalRequest({
    title: "מדריך להגשת FBAR לשנת 2026",
    excerpt: "הגשת דוח FBAR היא חובה על כל אזרח אמריקאי המחזיק בחשבונות בנק זרים. במאמר זה נסקור את כל הדרישות, המועדים, והקנסות האפשריים.",
    seoScore: 94,
    focusKeyword: "FBAR 2026",
    draftUrl: "https://tax4us.co.il/wp-admin/post.php?post=12345&action=edit",
    wordCount: 1941,
    draftId: 12345
  });

  console.log("✅ Approval request sent to Slack");
  console.log("📱 Check your Slack DMs for the approval message");
}

async function testMockWebhookPayloads() {
  console.log("\n🧪 Mock Webhook Payloads for Testing:\n");

  const mockApprovePayload = {
    type: "block_actions",
    user: { id: "U09NNMEDNEQ", username: "ben" },
    actions: [{
      action_id: "approve_article",
      value: JSON.stringify({
        action: "approve_article",
        draftId: 12345,
        seoScore: 94
      })
    }]
  };

  console.log("✅ APPROVE Payload:");
  console.log(JSON.stringify(mockApprovePayload, null, 2));

  const mockRejectPayload = {
    type: "block_actions",
    user: { id: "U09NNMEDNEQ", username: "ben" },
    actions: [{
      action_id: "reject_article",
      value: JSON.stringify({
        action: "reject_article",
        draftId: 12345
      })
    }]
  };

  console.log("\n❌ REJECT Payload:");
  console.log(JSON.stringify(mockRejectPayload, null, 2));

  console.log("\n💡 Test these by sending POST to /api/slack/interactions");
  console.log("   with body: payload=" + encodeURIComponent(JSON.stringify(mockApprovePayload)));
}

testArticleApprovalGate().then(() => testMockWebhookPayloads());
