---
name: tax4us-approval-gate-builder
description: >-
  Auto-generate Slack approval gates for Tax4US pipeline quality control.
  Analyzes existing gate patterns and creates new gates with proper Block Kit structure,
  webhook handlers, and test utilities. Ensures consistency across all 7 approval gates.
  Use when adding new approval gates or modifying existing ones.
  Not for general Slack integrations - this is Tax4US-specific.
version: 1.0.0
author: Claude Code (Sonnet 4.5)
created: 2026-02-23
tags: [tax4us, slack, approval-gates, code-generation, automation]
---

## Critical Requirements

**BEFORE GENERATING A GATE:**
- ✅ Identify what content needs approval (article, video, social post, etc.)
- ✅ Determine what data to show in the approval message (title, preview, metrics)
- ✅ Define approval actions (approve/reject, or approve/edit/reject)
- ✅ Know where approval triggers (which worker, which phase)
- ✅ Understand what happens after approval (next pipeline step)

**MANDATORY COMPONENTS:**
- 🔒 Slack Block Kit structure (header + context + preview + actions)
- 🔒 SlackClient method to send approval request
- 🔒 Webhook handler in `/api/slack/interactions/route.ts`
- 🔒 Button value data structure (JSON with action + metadata)
- 🔒 Test mock payload for validation

**CRITICAL WARNINGS:**
- 🚫 NEVER hardcode sensitive data in blocks (use env vars)
- 🚫 NEVER skip button value validation (prevents injection)
- 🚫 NEVER create gates without async handlers (Vercel timeout)
- 🚫 NEVER forget to update the handler route (gate won't work)

## Core Workflow

### Step 1: Analyze Existing Gate Pattern

First, study the existing approval gates to understand the pattern:

```typescript
// Read existing gate implementation
const slackClient = await Read('lib/clients/slack-client.ts');
const interactionsRoute = await Read('app/api/slack/interactions/route.ts');

// Extract pattern from existing gates:
// 1. Topic Approval (lines 260-333 in slack-client.ts)
// 2. Podcast Approval (lines 64-110 in slack-client.ts)
// 3. Social Approval (lines 154-258 in slack-client.ts)

// Common structure:
const gatePattern = {
  slackClientMethod: 'send[Type]ApprovalRequest',
  blockStructure: [header, context, preview, actions],
  actionIds: ['approve_[type]', 'reject_[type]'],
  webhookHandler: 'if (action.action_id === "approve_[type]") {...}',
  buttonValue: { action, resourceType, resourceId, metadata }
};
```

### Step 2: Define New Gate Specification

Create specification for the new gate:

```typescript
// Example: Hebrew Article Preview Gate
const gateSpec = {
  name: 'article_preview',
  displayName: 'Hebrew Article Preview',
  trigger: 'After content generation, before WordPress publish',

  dataRequired: {
    title: 'string',           // Hebrew article title
    excerpt: 'string',         // First 200 chars
    seoScore: 'number',        // 0-100
    focusKeyword: 'string',    // SEO keyword
    draftUrl: 'string',        // WordPress draft URL
    wordCount: 'number',       // Article length
    draftId: 'number'          // WordPress post ID
  },

  actions: {
    approve: {
      actionId: 'approve_article',
      label: '✅ Approve & Publish',
      style: 'primary',
      nextStep: 'Continue to WordPress publish + translation'
    },
    reject: {
      actionId: 'reject_article',
      label: '❌ Reject & Regenerate',
      style: 'danger',
      nextStep: 'Mark draft as rejected, trigger regeneration'
    }
  },

  integration: {
    slackMethod: 'sendArticleApprovalRequest',
    handlerCondition: 'action.action_id === "approve_article"',
    orchestratorCallback: 'orchestrator.publishArticle(draftId)'
  }
};
```

### Step 3: Generate SlackClient Method

```typescript
// Auto-generate method in slack-client.ts
const slackMethodCode = `
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
        text: \`*Title:* \${params.title}\\n*Word Count:* \${params.wordCount}\\n*SEO Score:* \${params.seoScore}%\\n*Focus Keyword:* \${params.focusKeyword}\`,
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
`;

// Add this method to SlackClient class
```

### Step 4: Generate Webhook Handler

```typescript
// Auto-generate handler in /api/slack/interactions/route.ts
const handlerCode = `
// Add after existing handlers (around line 96)

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
`;

// Insert this code into the interactions route file
```

### Step 5: Create Orchestrator Integration

```typescript
// Add methods to PipelineOrchestrator for the new approval flow
const orchestratorMethods = `
// In lib/pipeline/orchestrator.ts

async publishApprovedArticle(draftId: number) {
  pipelineLogger.info(\`Publishing approved article: \${draftId}\`);

  try {
    // Fetch the draft
    const draft = await this.wp.getPost(draftId);

    // Continue from where approval paused
    // (Already has content, just needs publish + translation)
    await this.wp.updatePost(draftId, { status: "publish" });

    // Start English translation
    await this.translateAndLinkEnglish(draftId, draft.content.rendered);

    // Continue to social prep
    await this.socialPublisher.prepareSocialPosts(
      draft.content.rendered,
      draft.title.rendered,
      draft.link,
      "", // English link will be set after translation
      draftId.toString()
    );

    pipelineLogger.success(\`Article \${draftId} published successfully\`);
  } catch (error: any) {
    pipelineLogger.error(\`Article publish failed: \${error.message}\`);
    throw error;
  }
}

async regenerateArticle(draftId: number) {
  pipelineLogger.info(\`Regenerating article: \${draftId}\`);

  try {
    const draft = await this.wp.getPost(draftId);
    const topic = draft.title.rendered.replace(/\\[.*?\\]/g, "").trim();

    // Update title to show regenerating
    await this.wp.updatePost(draftId, {
      title: \`[REGENERATING] \${topic}\`
    });

    // Re-run content generation
    await this.generatePost(draftId, topic);

    pipelineLogger.info(\`Article \${draftId} regeneration started\`);
  } catch (error: any) {
    pipelineLogger.error(\`Article regeneration failed: \${error.message}\`);
    throw error;
  }
}
`;
```

### Step 6: Generate Test Mock

```typescript
// Create test file for the new gate
const testCode = `
// scripts/test-article-approval-gate.ts

import { SlackClient } from '../lib/clients/slack-client';

async function testArticleApprovalGate() {
  const slack = new SlackClient();

  // Test sending approval request
  console.log("Testing Article Approval Gate...");

  await slack.sendArticleApprovalRequest({
    title: "מדריך להגשת FBAR לשנת 2026",
    excerpt: "הגשת דוח FBAR היא חובה על כל אזרח אמריקאי המחזיק בחשבונות בנק זרים...",
    seoScore: 94,
    focusKeyword: "FBAR 2026",
    draftUrl: "https://tax4us.co.il/wp-admin/post.php?post=12345&action=edit",
    wordCount: 1941,
    draftId: 12345
  });

  console.log("✅ Approval request sent to Slack");
  console.log("Check your Slack DMs for the approval message");
}

// Test mock webhook payload
async function testWebhookHandler() {
  const mockApprovePayload = {
    type: "block_actions",
    actions: [{
      action_id: "approve_article",
      value: JSON.stringify({
        action: "approve_article",
        draftId: 12345,
        seoScore: 94
      })
    }]
  };

  console.log("Mock Approve Payload:", mockApprovePayload);

  const mockRejectPayload = {
    type: "block_actions",
    actions: [{
      action_id: "reject_article",
      value: JSON.stringify({
        action: "reject_article",
        draftId: 12345
      })
    }]
  };

  console.log("Mock Reject Payload:", mockRejectPayload);
}

testArticleApprovalGate().then(() => testWebhookHandler());
`;
```

### Step 7: Integrate Into Pipeline

```typescript
// Update the pipeline to call the new approval gate
const pipelineIntegration = `
// In lib/pipeline/orchestrator.ts - runFullGeneration() method

// After content generation (around line 222)
const article = await this.contentGenerator.generateArticle({...});

// NEW: Send for approval before publishing
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

// PAUSE: Wait for approval
// User clicks approve in Slack → webhook triggers publishApprovedArticle()
return { status: "awaiting_article_approval", draftId: draftPostId };

// OLD CODE (now moved to publishApprovedArticle):
// await this.wp.updatePost(draftPostId, {...});
`;
```

## Advanced Techniques

### Multi-Option Approval Gates

Create gates with 3+ options:

```typescript
// Example: SEO Optimization Gate
{
  type: "actions",
  elements: [
    { text: "✅ Auto-Optimize", action_id: "approve_seo_auto" },
    { text: "✏️ Manual Edit", action_id: "approve_seo_manual" },
    { text: "⏭️ Skip Optimization", action_id: "skip_seo" },
    { text: "❌ Reject Post", action_id: "reject_seo" }
  ]
}
```

### Conditional Gate Display

Show different gates based on content type:

```typescript
// In gate trigger logic
if (article.seo_score < 80) {
  // Low score → Require approval + show SEO issues
  await slack.sendArticleApprovalWithWarnings({...});
} else {
  // High score → Simple approval
  await slack.sendArticleApprovalRequest({...});
}
```

### Progressive Approval Chains

Link multiple gates together:

```
Article Approval → Video Approval → Social Approval → Publish
     ↓                  ↓                  ↓
  (if reject)        (if reject)       (if reject)
     ↓                  ↓                  ↓
  Regenerate      Regenerate Video    Edit Social Copy
```

### Gate Analytics

Track approval metrics:

```typescript
// Log approval decision
const approvalLog = {
  gate: 'article_preview',
  draftId: value.draftId,
  action: 'approved',
  approvedBy: payload.user.id,
  approvedAt: new Date().toISOString(),
  metadata: { seoScore: value.seoScore }
};

// Store in decisions.json or separate analytics DB
```

## Gate Templates

### Template 1: Content Preview Gate

**Use For**: Articles, videos, social posts - anything with content preview

```typescript
{
  header: "📝 [Content Type] Preview",
  preview: "[Title/Excerpt/Thumbnail]",
  metrics: "[SEO Score/Word Count/Duration]",
  actions: ["Approve & Publish", "Reject & Regenerate"]
}
```

### Template 2: Media Approval Gate

**Use For**: Images, videos, audio files

```typescript
{
  header: "🎥 [Media Type] Ready",
  preview: "[Embedded media or download link]",
  metrics: "[Duration/Size/Format]",
  actions: ["Approve & Attach", "Regenerate", "Skip Media"]
}
```

### Template 3: Scheduling Gate

**Use For**: Posts that can be scheduled for later

```typescript
{
  header: "⏰ Schedule Publication",
  preview: "[Content preview]",
  scheduling: "[Suggested times based on analytics]",
  actions: ["Publish Now", "Schedule for Later", "Cancel"]
}
```

### Template 4: A/B Testing Gate

**Use For**: Social posts with multiple variants

```typescript
{
  header: "🔀 Choose Variant",
  variants: "[Variant A preview] vs [Variant B preview]",
  predictions: "[Engagement predictions per variant]",
  actions: ["Use Variant A", "Use Variant B", "Test Both"]
}
```

## Troubleshooting

### Issue: Gate sent but buttons don't work
**Cause**: Webhook handler not added or action_id mismatch
**Solution**:
```typescript
// Verify action_id in slack-client.ts matches handler in route.ts
// SlackClient:
action_id: "approve_article"

// Route handler:
if (action.action_id === "approve_article") {...}

// Must match exactly (case-sensitive)
```

### Issue: Approval triggers but nothing happens
**Cause**: Orchestrator callback not implemented
**Solution**:
```typescript
// Ensure orchestrator has the callback method
// Route calls: orchestrator.publishApprovedArticle()
// Orchestrator must have: async publishApprovedArticle(draftId) {...}
```

### Issue: Gate blocks don't render properly in Slack
**Cause**: Invalid Block Kit JSON structure
**Solution**:
```bash
# Validate blocks using Slack's Block Kit Builder
# https://app.slack.com/block-kit-builder

# Copy your blocks array and paste into builder
# It will show validation errors
```

### Issue: Button value data truncated
**Cause**: Slack has 2000-char limit on button values
**Solution**:
```typescript
// Don't pass large content in button value
// BAD:
value: JSON.stringify({ content: article.full_content }) // Too large

// GOOD:
value: JSON.stringify({ draftId: 12345 }) // Fetch content server-side
```

### Issue: Multiple approvals for same content
**Cause**: Race condition - user clicks button multiple times
**Solution**:
```typescript
// Implement idempotency check
const PROCESSED_APPROVALS = new Set();

if (PROCESSED_APPROVALS.has(value.draftId)) {
  return NextResponse.json({ text: "Already processed" });
}

PROCESSED_APPROVALS.add(value.draftId);
// Process approval...
```

## Usage Examples

### Example 1: Generate Hebrew Article Approval Gate

```typescript
// User: "Create approval gate for Hebrew article preview"

// Step 1: Define specification
const spec = {
  name: 'article_preview',
  trigger: 'After content generation',
  data: ['title', 'excerpt', 'seoScore', 'focusKeyword', 'draftUrl', 'wordCount', 'draftId'],
  actions: ['approve', 'reject']
};

// Step 2: Generate SlackClient method (see Step 3 above)
// Step 3: Generate webhook handler (see Step 4 above)
// Step 4: Add orchestrator callbacks (see Step 5 above)
// Step 5: Integrate into pipeline (see Step 7 above)
// Step 6: Test with mock payload

// Result: Full approval gate implemented and tested
```

### Example 2: Generate Video Preview Approval Gate

```typescript
// User: "Create approval gate for Kie.ai video preview"

const spec = {
  name: 'video_preview',
  trigger: 'After Kie.ai video generation completes',
  data: {
    videoUrl: 'string',
    duration: 'number',
    thumbnailUrl: 'string',
    taskId: 'string',
    relatedPost: 'number'
  },
  actions: {
    approve: { label: '✅ Approve & Attach', nextStep: 'Attach to social posts' },
    regenerate: { label: '🔄 Regenerate', nextStep: 'Create new video with different prompt' },
    skip: { label: '⏭️ Skip Video', nextStep: 'Publish without video' }
  }
};

// Generate gate following same pattern...
```

### Example 3: Generate Platform-Specific Social Gates

```typescript
// User: "Create separate approval gates for Facebook and LinkedIn"

// Facebook Gate
const fbSpec = {
  name: 'facebook_approval',
  trigger: 'After Facebook post generation',
  data: {
    content: 'string',
    hashtags: 'string[]',
    mediaUrl: 'string',
    platform: 'facebook',
    topicId: 'string'
  },
  actions: ['approve', 'edit', 'reject']
};

// LinkedIn Gate
const liSpec = {
  name: 'linkedin_approval',
  trigger: 'After LinkedIn post generation',
  data: {
    content: 'string',
    hashtags: 'string[]',
    mediaUrl: 'string',
    platform: 'linkedin',
    topicId: 'string'
  },
  actions: ['approve', 'edit', 'reject']
};

// Generate both gates separately...
```

## Integration with Other Skills

### Works With:
- **tax4us-pipeline-runner**: Approval gates pause pipeline execution
- **tax4us-development**: Documents gate creation in decisions.json
- **api-integration-master**: Uses Slack API integration patterns

### Enables:
- Complete 7/7 approval gate coverage
- Platform-specific social post control
- Content quality control before publish
- Video preview before attachment

## Self-Improvement

### Learning Integration
This skill tracks:
- Common gate patterns across different content types
- Approval vs rejection rates per gate type
- Time to approve (user response time)
- Most common rejection reasons

### Improvement Opportunities
- Auto-generate gates from JSON spec file
- Create gate preview tool (shows how it will look in Slack)
- Add gate versioning (v1, v2 with migrations)
- Build gate analytics dashboard

### Version History
- v1.0.0 (2026-02-23): Initial creation with pattern analysis and code generation

## Quick Reference

### All 7 Tax4US Approval Gates

| Gate | Status | Trigger | Actions |
|------|--------|---------|---------|
| 1. Topic Proposal | ✅ Implemented | After Claude suggests topic | Approve, Reject, Feedback |
| 2. Article Preview | ❌ Missing | After content generation | Approve, Reject |
| 3. Video Preview | ❌ Missing | After Kie.ai video done | Approve, Regenerate, Skip |
| 4. Facebook Post | ❌ Missing | After FB post generation | Approve, Edit, Reject |
| 5. LinkedIn Post | ❌ Missing | After LI post generation | Approve, Edit, Reject |
| 6. Podcast Episode | ✅ Implemented | After Captivate upload | Approve, Cancel |
| 7. Social Combined | ✅ Implemented | After social prep | Approve, Cancel |

### Gate Generation Checklist

- [ ] Define gate specification (name, trigger, data, actions)
- [ ] Generate SlackClient method with Block Kit structure
- [ ] Generate webhook handler in interactions route
- [ ] Add orchestrator callback methods
- [ ] Integrate into pipeline flow
- [ ] Create test mock payload
- [ ] Test in development
- [ ] Document in decisions.json
- [ ] Deploy to production

## References

See `references/` directory for:
- `gate-patterns.md`: Analysis of existing gate implementations
- `block-kit-guide.md`: Slack Block Kit JSON reference
- `webhook-security.md`: Signature verification and security best practices
