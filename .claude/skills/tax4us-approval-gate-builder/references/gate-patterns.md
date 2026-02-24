# Existing Tax4US Approval Gate Patterns

## Pattern Analysis

All Tax4US approval gates follow a consistent 4-part structure:

```
┌─────────────────────────────────────┐
│  1. HEADER                          │  ← Gate name/icon
├─────────────────────────────────────┤
│  2. CONTEXT                         │  ← What's being approved
├─────────────────────────────────────┤
│  3. PREVIEW                         │  ← Content preview/links
├─────────────────────────────────────┤
│  4. ACTIONS                         │  ← Approve/Reject buttons
└─────────────────────────────────────┘
```

## Existing Gate Implementations

### Gate 1: Topic Proposal (IMPLEMENTED)

**Location**: `lib/clients/slack-client.ts` lines 260-333

**Structure**:
```typescript
async sendTopicApprovalRequest(params: {
  topic: string;
  audience: string;
  reasoning: string;
  draftId: number;
})
```

**Slack Blocks**:
```typescript
[
  // 1. HEADER
  {
    type: "header",
    text: { type: "plain_text", text: "🔔 Content Topic Proposal", emoji: true }
  },

  // 2. CONTEXT
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Proposed Topic:* ${params.topic}\n*Target Audience:* ${params.audience}\n\n*Reasoning:* ${params.reasoning}`
    }
  },

  // 3. PREVIEW
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*WordPress Draft:* <https://tax4us.co.il/wp-admin/post.php?post=${params.draftId}&action=edit|Review Draft (ID: ${params.draftId})>`
    }
  },

  // 4. ACTIONS
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Approve & Generate", emoji: true },
        value: JSON.stringify({ action: "approve_topic", topic: params.topic, draftId: params.draftId }),
        action_id: "approve_topic",
        style: "primary"
      },
      {
        type: "button",
        text: { type: "plain_text", text: "❌ Reject", emoji: true },
        value: JSON.stringify({ action: "reject_topic", draftId: params.draftId }),
        action_id: "reject_topic",
        style: "danger"
      },
      {
        type: "button",
        text: { type: "plain_text", text: "✍️ Give Feedback", emoji: true },
        action_id: "feedback_topic",
        value: JSON.stringify({ action: "feedback_topic", draftId: params.draftId })
      }
    ]
  }
]
```

**Webhook Handler** (`app/api/slack/interactions/route.ts` line 61):
```typescript
if (action.action_id === "approve_topic") {
  const { PipelineOrchestrator } = require("../../../../lib/pipeline/orchestrator");
  const orchestrator = new PipelineOrchestrator();
  await orchestrator.generatePost(value.draftId, value.topic);

  return NextResponse.json({
    text: `✅ *Topic Approved!* I've started generating the content for: "${value.topic}". Check WordPress in a few minutes.`,
    replace_original: false
  });
}
```

**Button Value Format**:
```json
{
  "action": "approve_topic",
  "topic": "FBAR Reporting Deadlines 2026",
  "draftId": 12345
}
```

**Trigger Location**: `lib/pipeline/orchestrator.ts` line 84

**Key Learnings**:
- ✅ 3-button layout (approve, reject, feedback)
- ✅ Uses `@<user_id>` mention in text (not shown in blocks above, but in line 170)
- ✅ Async handler with `.catch()` error handling
- ✅ Returns immediately to avoid Vercel timeout

---

### Gate 2: Podcast Episode (IMPLEMENTED)

**Location**: `lib/clients/slack-client.ts` lines 64-110

**Structure**:
```typescript
async sendApprovalRequest(
  title: string,
  episodeNumber: number,
  episodeId: string
)
```

**Slack Blocks**:
```typescript
[
  // 1. HEADER
  {
    type: "header",
    text: { type: "plain_text", text: "🚀 Ready to Publish?", emoji: true }
  },

  // 2. CONTEXT + PREVIEW (combined)
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Episode:* ${title} (#${episodeNumber})\n\nAudio is uploaded as a **Draft**. Approve to publish immediately?`
    }
  },

  // 3. ACTIONS
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Approve & Publish", emoji: true },
        value: JSON.stringify({ action: "publish", episodeId, title, episodeNumber }),
        action_id: "approve_publish",
        style: "primary"
      },
      {
        type: "button",
        text: { type: "plain_text", text: "❌ Cancel", emoji: true },
        value: JSON.stringify({ action: "cancel", episodeId }),
        action_id: "cancel_publish",
        style: "danger"
      }
    ]
  }
]
```

**Webhook Handler** (`app/api/slack/interactions/route.ts` line 28):
```typescript
if (action.action_id === "approve_publish" && value.action === "publish") {
  const producer = new PodcastProducer();
  producer.publishEpisode({
    episodeId: value.episodeId,
    title: value.title,
    episodeNumber: value.episodeNumber
  }).catch(e => console.error("Async Publish Failed:", e));

  return NextResponse.json({
    text: "✅ Approved! Publishing process started. You will receive a confirmation shortly.",
    replace_original: false
  });
}
```

**Button Value Format**:
```json
{
  "action": "publish",
  "episodeId": "captivate-abc-123",
  "title": "FBAR Episode",
  "episodeNumber": 47
}
```

**Trigger Location**: `lib/services/podcast-producer.ts` line 89

**Key Learnings**:
- ✅ Simpler 2-button layout (approve, cancel)
- ✅ Combined context + preview into single section
- ✅ Includes episode number in display
- ✅ Double-check: `action.action_id === "approve_publish" && value.action === "publish"`

---

### Gate 3: Social Media Combined (IMPLEMENTED)

**Location**: `lib/clients/slack-client.ts` lines 154-258

**Structure**:
```typescript
async sendSocialApprovalRequest(params: {
  hebrewHeadline: string;
  englishHeadline: string;
  hebrewTeaser: string;
  hebrewUrl: string;
  englishUrl: string;
  facebookPost: string;
  videoUrl?: string;
  videoTaskId?: string;
  topicId: string;
})
```

**Slack Blocks**:
```typescript
[
  // 0. MENTION (special - grabs attention)
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Hey <@${SlackClient.BEN_USER_ID}>, a new social post is ready for your review! 🚀`
    }
  },

  // 1. HEADER
  {
    type: "header",
    text: { type: "plain_text", text: "📢 Social Post Approval", emoji: true }
  },

  // 2. CONTEXT (multi-part)
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Hebrew Headline:* ${params.hebrewHeadline}\n*English Headline:* ${params.englishHeadline}\n\n*Teaser:* ${params.hebrewTeaser}`
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Links:*\n• Hebrew: ${params.hebrewUrl}\n• English: ${params.englishUrl}`
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Full Post Preview:*\n\`\`\`${params.facebookPost}\`\`\``
    }
  },

  // 3. PREVIEW (conditional video)
  params.videoUrl ? {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Video Generated:* <${params.videoUrl}|Watch Video> 🎥`
    }
  } : {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Video Status:* ⏳ Still generating the Sora video. You can approve the text now, and the video will be attached upon publication.`
    }
  },

  // 4. ACTIONS
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Approve & Post", emoji: true },
        value: JSON.stringify({
          action: "publish_social",
          topicId: params.topicId,
          platforms: ["facebook", "linkedin"],
          content: params.facebookPost,
          videoUrl: params.videoUrl,
          videoTaskId: params.videoTaskId
        }),
        action_id: "approve_social",
        style: "primary"
      },
      {
        type: "button",
        text: { type: "plain_text", text: "❌ Cancel", emoji: true },
        value: JSON.stringify({ action: "cancel_social", topicId: params.topicId }),
        action_id: "cancel_social",
        style: "danger"
      }
    ]
  }
]
```

**Webhook Handler** (`app/api/slack/interactions/route.ts` line 43):
```typescript
if (action.action_id === "approve_social" && value.action === "publish_social") {
  const { SocialPublisher } = require("../../../../lib/pipeline/social-publisher");
  const publisher = new SocialPublisher();
  publisher.publishSocialPosts(value).catch((e: any) =>
    console.error("Async Social Publish Failed:", e)
  );

  return NextResponse.json({
    text: "✅ Social posts approved! Publishing to linked accounts.",
    replace_original: false
  });
}
```

**Button Value Format**:
```json
{
  "action": "publish_social",
  "topicId": "12345",
  "platforms": ["facebook", "linkedin"],
  "content": "Full post text...",
  "videoUrl": "https://...",
  "videoTaskId": "kie-task-id"
}
```

**Trigger Location**: `lib/pipeline/social-publisher.ts` line 55

**Key Learnings**:
- ✅ Most complex gate (7 blocks total)
- ✅ Uses `@mention` for user attention
- ✅ Conditional blocks (video present vs pending)
- ✅ Code block for post preview (triple backticks)
- ✅ Multiple sections for organized info display
- ✅ Passes array in button value (`platforms`)

---

## Common Patterns Across All Gates

### 1. Block Structure Patterns

**Minimal Gate** (2-3 blocks):
```typescript
[header, context, actions]
```

**Standard Gate** (4 blocks):
```typescript
[header, context, preview, actions]
```

**Complex Gate** (5-7 blocks):
```typescript
[mention, header, context1, context2, preview, conditionalBlock, actions]
```

### 2. Action Button Patterns

**Binary Choice** (approve/reject):
```typescript
elements: [
  { text: "✅ Approve", action_id: "approve_X", style: "primary" },
  { text: "❌ Reject", action_id: "reject_X", style: "danger" }
]
```

**Tertiary Choice** (approve/edit/reject):
```typescript
elements: [
  { text: "✅ Approve", action_id: "approve_X", style: "primary" },
  { text: "✏️ Edit", action_id: "edit_X" },
  { text: "❌ Reject", action_id: "reject_X", style: "danger" }
]
```

### 3. Button Value Patterns

**Minimal Data**:
```json
{ "action": "approve_X", "resourceId": 12345 }
```

**Standard Data**:
```json
{
  "action": "approve_X",
  "resourceId": 12345,
  "resourceType": "article",
  "metadata": { "seoScore": 94 }
}
```

**Complex Data**:
```json
{
  "action": "publish_social",
  "topicId": "12345",
  "platforms": ["facebook", "linkedin"],
  "content": "Full text...",
  "videoUrl": "https://...",
  "videoTaskId": "task-id"
}
```

### 4. Webhook Handler Patterns

**Simple Handler**:
```typescript
if (action.action_id === "approve_X") {
  await doSomething(value.resourceId);
  return NextResponse.json({ text: "✅ Approved!" });
}
```

**Async Handler** (most common):
```typescript
if (action.action_id === "approve_X") {
  orchestrator.doSomething(value.resourceId).catch(e => console.error(e));
  return NextResponse.json({
    text: "✅ Approved! Processing started.",
    replace_original: false
  });
}
```

**Conditional Handler**:
```typescript
if (action.action_id === "approve_X" && value.action === "specific_action") {
  // Double-check ensures correct routing
  await doSomething();
  return NextResponse.json({ text: "✅ Done!" });
}
```

### 5. Error Handling Patterns

**Catch and Log** (don't throw):
```typescript
orchestrator.doSomething().catch(e => console.error("Failed:", e));
// Returns immediately, doesn't wait for completion
```

**Try-Catch for Critical**:
```typescript
try {
  await criticalOperation();
} catch (error) {
  return NextResponse.json({
    text: `❌ Error: ${error.message}`
  }, { status: 500 });
}
```

## Gate Naming Conventions

### Method Names
- `send[Type]ApprovalRequest()` - Main gate sender
- Example: `sendTopicApprovalRequest()`, `sendArticleApprovalRequest()`

### Action IDs
- `approve_[type]` - Approval action
- `reject_[type]` - Rejection action
- `cancel_[type]` - Cancel action (softer than reject)
- `feedback_[type]` - Request feedback/edit

### Button Value Actions
- `"action": "approve_[type]"` - Must match or extend action_id
- Can be more specific: `"action": "publish_social"` while `action_id: "approve_social"`

## Emoji Usage Patterns

### Headers
- 🔔 - Notifications, proposals
- 🚀 - Ready to launch, publish
- 📢 - Announcements, social media
- 📝 - Content, articles
- 🎥 - Video content
- 🎙️ - Audio, podcast

### Actions
- ✅ - Approve, confirm, success
- ❌ - Reject, cancel, error
- ✏️ - Edit, modify
- ✍️ - Feedback, write
- 🔄 - Regenerate, retry
- ⏭️ - Skip, proceed without

### Status
- ⏳ - In progress, pending
- 💡 - Tips, suggestions
- ⚠️ - Warnings
- 🔧 - Fix, repair

## Block Kit Best Practices

### Text Formatting
```typescript
// Bold
text: "*Bold Text*"

// Italic
text: "_Italic Text_"

// Code inline
text: "`code`"

// Code block
text: "```\nMulti-line\ncode\n```"

// Link
text: "<https://url.com|Link Text>"

// User mention
text: "<@U09NNMEDNEQ>"

// Channel mention
text: "<#C09BZAFD5U7>"
```

### Section Types
```typescript
// Plain text section
{
  type: "section",
  text: { type: "plain_text", text: "Plain text here" }
}

// Markdown section (more common)
{
  type: "section",
  text: { type: "mrkdwn", text: "*Markdown* _supported_" }
}

// Section with accessory (image, button, etc.)
{
  type: "section",
  text: { type: "mrkdwn", text: "Text" },
  accessory: {
    type: "image",
    image_url: "https://...",
    alt_text: "Description"
  }
}
```

### Header Constraints
- Max 150 characters
- Plain text only (no markdown)
- Emojis allowed

### Section Constraints
- Max 3000 characters per text block
- Can have multiple sections
- Markdown text supports formatting

### Action Constraints
- Max 5 buttons per action block
- Max 25 action blocks per message
- Button text: max 75 characters

## Template for New Gates

```typescript
// 1. SlackClient Method
async send[Type]ApprovalRequest(params: {
  // Define required parameters
  field1: string;
  field2: number;
  resourceId: number;
}) {
  const blocks: any[] = [
    // HEADER
    {
      type: "header",
      text: { type: "plain_text", text: "🎯 [Gate Name]", emoji: true }
    },

    // CONTEXT
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Key Info:* ${params.field1}\n*Metrics:* ${params.field2}`
      }
    },

    // PREVIEW
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Preview:* <link|View>`
      }
    },

    // ACTIONS
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Approve", emoji: true },
          value: JSON.stringify({
            action: "approve_[type]",
            resourceId: params.resourceId,
            metadata: { /* additional data */ }
          }),
          action_id: "approve_[type]",
          style: "primary"
        },
        {
          type: "button",
          text: { type: "plain_text", text: "❌ Reject", emoji: true },
          value: JSON.stringify({
            action: "reject_[type]",
            resourceId: params.resourceId
          }),
          action_id: "reject_[type]",
          style: "danger"
        }
      ]
    }
  ];

  return this.sendMessage(`[Gate Name] Approval Needed`, blocks);
}

// 2. Webhook Handler
if (action.action_id === "approve_[type]") {
  const orchestrator = new PipelineOrchestrator();
  orchestrator.[callbackMethod](value.resourceId).catch(e =>
    console.error("Approval callback failed:", e)
  );

  return NextResponse.json({
    text: "✅ Approved! Processing started.",
    replace_original: false
  });
}

// 3. Orchestrator Callback
async [callbackMethod](resourceId: number) {
  pipelineLogger.info(`Processing approved resource: ${resourceId}`);

  try {
    // Perform next pipeline step
    await this.nextStep(resourceId);

    pipelineLogger.success(`Resource ${resourceId} processed successfully`);
  } catch (error: any) {
    pipelineLogger.error(`Processing failed: ${error.message}`);
    throw error;
  }
}
```

## Testing Patterns

### Mock Payload Structure
```typescript
const mockPayload = {
  type: "block_actions",
  user: {
    id: "U09NNMEDNEQ",
    username: "ben"
  },
  actions: [{
    action_id: "approve_[type]",
    value: JSON.stringify({
      action: "approve_[type]",
      resourceId: 12345,
      metadata: {}
    })
  }],
  response_url: "https://hooks.slack.com/..."
};
```

### Test Script Template
```typescript
// scripts/test-[gate-name]-gate.ts
import { SlackClient } from '../lib/clients/slack-client';

async function testGate() {
  const slack = new SlackClient();

  await slack.send[Type]ApprovalRequest({
    // Test data
  });

  console.log("✅ Test gate sent to Slack");
}

testGate();
```
