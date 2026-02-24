#!/usr/bin/env tsx
/**
 * Generate Hebrew Article Preview Approval Gate
 *
 * This script auto-generates code for the missing Hebrew Article approval gate.
 * Run this to create all necessary code snippets that need to be added to the codebase.
 *
 * Usage:
 *   npx tsx scripts/generate-hebrew-article-gate.ts
 *
 * Generates:
 * 1. SlackClient method code
 * 2. Webhook handler code
 * 3. Orchestrator callback code
 * 4. Pipeline integration code
 * 5. Test script
 */

console.log("🏗️  Generating Hebrew Article Preview Approval Gate...\n");

// ============================================================================
// 1. SLACK CLIENT METHOD
// ============================================================================
console.log("📝 1. ADD TO lib/clients/slack-client.ts (after line 333):\n");
console.log("```typescript");
console.log(`
async sendArticleApprovalRequest(params: {
  title: string;
  excerpt: string;
  seoScore: number;
  focusKeyword: string;
  draftUrl: string;
  wordCount: number;
  draftId: number;
}) {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📝 Hebrew Article Preview",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Title:* \${params.title}\\n*Word Count:* \${params.wordCount} words\\n*SEO Score:* \${params.seoScore}%\\n*Focus Keyword:* \${params.focusKeyword}\`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Preview:*\\n\${params.excerpt}...\`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*WordPress Draft:* <\${params.draftUrl}|Review Full Article>\`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✅ Approve & Publish",
            emoji: true,
          },
          value: JSON.stringify({
            action: "approve_article",
            draftId: params.draftId,
            seoScore: params.seoScore
          }),
          action_id: "approve_article",
          style: "primary",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "❌ Reject & Regenerate",
            emoji: true,
          },
          value: JSON.stringify({
            action: "reject_article",
            draftId: params.draftId
          }),
          action_id: "reject_article",
          style: "danger",
        },
      ],
    },
  ];

  return this.sendMessage(\`Article Preview: \${params.title}\`, blocks);
}
`.trim());
console.log("```\n");

// ============================================================================
// 2. WEBHOOK HANDLER
// ============================================================================
console.log("📝 2. ADD TO app/api/slack/interactions/route.ts (after line 96):\n");
console.log("```typescript");
console.log(`
if (action.action_id === "approve_article") {
  console.log("📝 Article Approval Received: Publishing...", value);

  const { PipelineOrchestrator } = require("../../../../lib/pipeline/orchestrator");
  const orchestrator = new PipelineOrchestrator();

  // Trigger publish workflow (async to avoid timeout)
  orchestrator.publishApprovedArticle(value.draftId).catch((e: any) =>
    console.error("Article publish failed:", e)
  );

  return NextResponse.json({
    text: \`✅ Article approved! Publishing to WordPress with SEO score: \${value.seoScore}%\`,
    replace_original: false
  });
}

if (action.action_id === "reject_article") {
  console.log("❌ Article Rejected: Marking for regeneration...", value);

  const { PipelineOrchestrator } = require("../../../../lib/pipeline/orchestrator");
  const orchestrator = new PipelineOrchestrator();

  // Mark for regeneration
  orchestrator.regenerateArticle(value.draftId).catch((e: any) =>
    console.error("Article regeneration failed:", e)
  );

  return NextResponse.json({
    text: "❌ Article rejected. Generating new version...",
    replace_original: true
  });
}
`.trim());
console.log("```\n");

// ============================================================================
// 3. ORCHESTRATOR CALLBACKS
// ============================================================================
console.log("📝 3. ADD TO lib/pipeline/orchestrator.ts (end of class, before closing brace):\n");
console.log("```typescript");
console.log(`
/**
 * Publish article after approval (resumes pipeline from approval pause)
 */
async publishApprovedArticle(draftId: number) {
  pipelineLogger.info(\`Publishing approved article: \${draftId}\`);

  try {
    // Fetch the draft (content already generated)
    const draft = await this.wp.getPost(draftId);
    const content = draft.content.rendered;
    const title = draft.title.rendered.replace(/\\[AWAITING APPROVAL\\]/, "").trim();

    // Update title and publish
    await this.wp.updatePost(draftId, {
      title: title,
      status: "publish"
    });

    const hebrewLink = draft.link;
    pipelineLogger.success(\`Hebrew article published: \${hebrewLink}\`);

    // Continue to English translation
    pipelineLogger.agent("Translating to English...", draftId.toString());
    const englishContent = await this.translator.translateHeToEn(content);

    const englishSeoMeta = await this.contentGenerator.generateArticle({
      id: \`en-\${draftId}\`,
      topic: title,
      title: title,
      audience: "English Speaking Investors/Expats",
      language: "en",
      type: "blog_post",
      status: "ready"
    });

    const enCategoryIds = await this.wp.resolveCategories(englishSeoMeta.metadata.categories || ["Business Tax", "English"]);
    const enTagIds = await this.wp.resolveTags(englishSeoMeta.metadata.tags || []);

    const englishPost = await this.wp.createPost({
      title: englishSeoMeta.metadata.title,
      content: englishContent,
      status: "publish",
      excerpt: englishSeoMeta.metadata.excerpt,
      featured_media: draft.featured_media || 0,
      categories: enCategoryIds,
      tags: enTagIds,
      meta: {
        rank_math_focus_keyword: englishSeoMeta.metadata.focus_keyword,
        rank_math_title: englishSeoMeta.metadata.seo_title,
        rank_math_description: englishSeoMeta.metadata.seo_description,
        rank_math_seo_score: englishSeoMeta.seo_score
      }
    });

    // Link with Polylang
    await this.wp.updatePost(englishPost.id, {}, {
      lang: "en",
      "translations[he]": draftId.toString()
    });

    const englishLink = englishPost.link;
    pipelineLogger.success(\`English translation published: \${englishLink}\`);

    // Continue to social media prep
    await this.socialPublisher.prepareSocialPosts(
      content,
      title,
      hebrewLink,
      englishLink,
      draftId.toString()
    );

    pipelineLogger.info("Article pipeline resumed successfully");

  } catch (error: any) {
    pipelineLogger.error(\`Article publish failed: \${error.message}\`);
    await this.slack.sendErrorNotification("Article Publish", error);
    throw error;
  }
}

/**
 * Regenerate article after rejection
 */
async regenerateArticle(draftId: number) {
  pipelineLogger.info(\`Regenerating article: \${draftId}\`);

  try {
    const draft = await this.wp.getPost(draftId);
    const topic = draft.title.rendered.replace(/\\[.*?\\]/g, "").trim();

    // Update title to show regenerating
    await this.wp.updatePost(draftId, {
      title: \`[REGENERATING] \${topic}\`,
      content: "<!-- wp:paragraph --><p>AI is regenerating this article with improved content...</p><!-- /wp:paragraph -->"
    });

    // Re-run full content generation
    await this.generatePost(draftId, topic);

    pipelineLogger.info(\`Article \${draftId} regeneration started\`);
  } catch (error: any) {
    pipelineLogger.error(\`Article regeneration failed: \${error.message}\`);
    throw error;
  }
}
`.trim());
console.log("```\n");

// ============================================================================
// 4. PIPELINE INTEGRATION
// ============================================================================
console.log("📝 4. MODIFY lib/pipeline/orchestrator.ts - runFullGeneration() method:\n");
console.log("Find this section (around line 222):");
console.log("```typescript");
console.log(`const article = await this.contentGenerator.generateArticle({...});`);
console.log("```\n");
console.log("REPLACE with:");
console.log("```typescript");
console.log(`
const article = await this.contentGenerator.generateArticle({
  id: draftPostId.toString(),
  topic: topicName,
  title: topicName,
  audience: "Israeli Taxpayers",
  language: "he",
  type: "blog_post",
  status: "processing"
});

// Generate media (still runs in parallel)
pipelineLogger.agent("Generating visual assets...", draftPostId.toString());
let imageUrl = "";
let mediaId = 0;
try {
  const media = await this.mediaProcessor.generateAndUploadImage(
    \`Professional illustration for tax article: \${topicName}\`,
    topicName
  );
  imageUrl = media.url;
  mediaId = media.id;
  article.featured_media = mediaId;
} catch (mediaError: any) {
  pipelineLogger.error(\`Media Generation Failed (Non-blocking): \${mediaError.message}\`, draftPostId.toString());
}

// Resolve categories and tags
const categoryIds = await this.wp.resolveCategories(article.metadata.categories || []);
const tagIds = await this.wp.resolveTags(article.metadata.tags || []);

// Update draft with generated content (but don't publish yet)
await this.wp.updatePost(draftPostId, {
  title: \`[AWAITING APPROVAL] \${article.metadata.title}\`,
  content: article.content,
  status: "draft", // Keep as draft until approved
  featured_media: mediaId,
  excerpt: article.metadata.excerpt,
  categories: categoryIds,
  tags: tagIds,
  meta: {
    rank_math_focus_keyword: article.metadata.focus_keyword,
    rank_math_title: article.metadata.seo_title,
    rank_math_description: article.metadata.seo_description,
    rank_math_seo_score: article.seo_score
  }
} as any);

// Send for approval
pipelineLogger.info("Sending article for approval...", draftPostId.toString());
await this.slack.sendArticleApprovalRequest({
  title: article.metadata.title,
  excerpt: article.metadata.excerpt,
  seoScore: article.seo_score,
  focusKeyword: article.metadata.focus_keyword,
  draftUrl: \`https://tax4us.co.il/wp-admin/post.php?post=\${draftPostId}&action=edit\`,
  wordCount: article.content.split(/\\s+/).length,
  draftId: draftPostId
});

// PAUSE HERE - Wait for approval
// User clicks approve → webhook triggers publishApprovedArticle()
pipelineLogger.info("Pipeline paused. Awaiting article approval...", draftPostId.toString());
return { status: "awaiting_article_approval", postId: draftPostId };

// IMPORTANT: Remove or comment out the old code that published immediately:
// OLD CODE BELOW THIS LINE IS NOW IN publishApprovedArticle():
// await this.wp.updatePost(draftPostId, { status: "publish", ... });
// const englishContent = await this.translator.translateHeToEn(...);
// ... etc
`.trim());
console.log("```\n");

// ============================================================================
// 5. TEST SCRIPT
// ============================================================================
console.log("📝 5. CREATE scripts/test-article-approval-gate.ts:\n");
console.log("```typescript");
console.log(`
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
  console.log("\\n🧪 Mock Webhook Payloads for Testing:\\n");

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

  console.log("\\n❌ REJECT Payload:");
  console.log(JSON.stringify(mockRejectPayload, null, 2));

  console.log("\\n💡 Test these by sending POST to /api/slack/interactions");
  console.log("   with body: payload=" + encodeURIComponent(JSON.stringify(mockApprovePayload)));
}

testArticleApprovalGate().then(() => testMockWebhookPayloads());
`.trim());
console.log("```\n");

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n" + "=".repeat(80));
console.log("✅ GENERATION COMPLETE");
console.log("=".repeat(80));
console.log("\n📋 IMPLEMENTATION CHECKLIST:\n");
console.log("  [ ] 1. Add sendArticleApprovalRequest() to SlackClient");
console.log("  [ ] 2. Add approve/reject handlers to interactions route");
console.log("  [ ] 3. Add publishApprovedArticle() + regenerateArticle() to Orchestrator");
console.log("  [ ] 4. Modify runFullGeneration() to pause for approval");
console.log("  [ ] 5. Create test script and run it");
console.log("  [ ] 6. Test in development environment");
console.log("  [ ] 7. Document in .project-memory/decisions.json");
console.log("  [ ] 8. Deploy to production");
console.log("\n🚀 After implementation, run:");
console.log("   npx tsx scripts/test-article-approval-gate.ts\n");
