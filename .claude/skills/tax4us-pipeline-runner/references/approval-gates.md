# Tax4US Slack Approval Gates Reference

## Overview

Tax4US uses Slack approval gates for quality control. Ben must approve critical steps before content is published. This prevents AI from auto-publishing low-quality content.

## Current Implementation Status

✅ **IMPLEMENTED (3/7)**:
1. Topic Proposal
2. Podcast Episode
3. Social Media (Combined FB + LinkedIn)

❌ **MISSING (4/7)**:
4. Hebrew Article Preview
5. Video Preview (Kie.ai Sora)
6. Facebook Post (Separate)
7. LinkedIn Post (Separate)

## Gate Specifications

### Gate 1: Topic Proposal ✅
**Trigger**: After Claude generates topic suggestion
**Location**: `orchestrator.ts` line 84, `slack-client.ts` line 260
**Handler**: `/api/slack/interactions` line 61

**Slack Message Format**:
```typescript
{
  type: "header",
  text: "🔔 Content Topic Proposal"
},
{
  type: "section",
  text: "*Proposed Topic:* [topic]\n*Target Audience:* [audience]\n*Reasoning:* [reasoning]"
},
{
  type: "actions",
  elements: [
    { text: "✅ Approve & Generate", action_id: "approve_topic" },
    { text: "❌ Reject", action_id: "reject_topic" },
    { text: "✍️ Give Feedback", action_id: "feedback_topic" }
  ]
}
```

**Approval Actions**:
- ✅ **Approve**: Triggers `generatePost(draftId, topic)`
- ❌ **Reject**: Marks draft as rejected, stops pipeline
- ✍️ **Feedback**: Prompts user to reply (manual, not automated yet)

**Data Passed in Button Value**:
```json
{
  "action": "approve_topic",
  "topic": "FBAR Reporting Deadlines 2026",
  "draftId": 12345
}
```

### Gate 2: Hebrew Article Preview ❌ MISSING
**Should Trigger**: After content generation, before WordPress publish
**Should Show**:
- Hebrew headline
- Hebrew excerpt (first 200 chars)
- SEO score
- Focus keyword
- Preview link (WordPress draft URL)
- Estimated reading time

**Proposed Implementation**:
```typescript
await this.slack.sendArticleApprovalRequest({
  title: article.metadata.title,
  excerpt: article.metadata.excerpt,
  seoScore: article.seo_score,
  focusKeyword: article.metadata.focus_keyword,
  draftUrl: `https://tax4us.co.il/wp-admin/post.php?post=${draftId}&action=edit`,
  wordCount: 1941
});
```

**Handler Needed**: `action_id: "approve_article"`

### Gate 3: Video Preview (Kie.ai Sora) ❌ MISSING
**Should Trigger**: After Kie.ai video generation completes
**Should Show**:
- Video thumbnail
- Video duration
- Download link
- Embed preview (if possible in Slack)

**Proposed Implementation**:
```typescript
await this.slack.sendVideoApprovalRequest({
  videoUrl: status.videoUrl,
  duration: status.duration,
  taskId: taskId,
  relatedPost: draftId
});
```

**Handler Needed**: `action_id: "approve_video"`

### Gate 4: Podcast Episode ✅
**Trigger**: After ElevenLabs TTS + Captivate upload (as Draft)
**Location**: `podcast-producer.ts` line 89, `slack-client.ts` line 64
**Handler**: `/api/slack/interactions` line 28

**Slack Message Format**:
```typescript
{
  type: "header",
  text: "🚀 Ready to Publish?"
},
{
  type: "section",
  text: "*Episode:* [title] (#[episodeNumber])\nAudio uploaded as Draft. Approve to publish?"
},
{
  type: "actions",
  elements: [
    { text: "✅ Approve & Publish", action_id: "approve_publish" },
    { text: "❌ Cancel", action_id: "cancel_publish" }
  ]
}
```

**Approval Actions**:
- ✅ **Approve**: Calls `producer.publishEpisode()` → Captivate.fm status = "Published"
- ❌ **Cancel**: Leaves episode as Draft in Captivate

**Data Passed in Button Value**:
```json
{
  "action": "publish",
  "episodeId": "abc-123-captivate-id",
  "title": "FBAR Episode",
  "episodeNumber": 47
}
```

### Gate 5: Social Media (Combined) ✅
**Trigger**: After social post generation + video (or video pending)
**Location**: `social-publisher.ts` line 55, `slack-client.ts` line 154
**Handler**: `/api/slack/interactions` line 43

**Slack Message Format**:
```typescript
{
  type: "section",
  text: "Hey @Ben, new social post ready! 🚀"
},
{
  type: "header",
  text: "📢 Social Post Approval"
},
{
  type: "section",
  text: "*Hebrew Headline:* [hebrewHeadline]\n*English Headline:* [englishHeadline]\n*Teaser:* [teaser]"
},
{
  type: "section",
  text: "*Full Post Preview:*\n```[facebookPost]```"
},
{
  type: "section",
  text: "*Video:* [videoUrl] or ⏳ Still generating..."
},
{
  type: "actions",
  elements: [
    { text: "✅ Approve & Post", action_id: "approve_social" },
    { text: "❌ Cancel", action_id: "cancel_social" }
  ]
}
```

**Approval Actions**:
- ✅ **Approve**: Publishes to Facebook + LinkedIn via Upload-Post API
- ❌ **Cancel**: Discards social posts

**Data Passed in Button Value**:
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

### Gate 6: Facebook Post (Separate) ❌ MISSING
**Should Trigger**: After Facebook-specific post generation
**Should Show**:
- Platform: Facebook
- Post text (Hebrew/English mix)
- Hashtags
- Media (image or video)
- Engagement prediction (optional)

**Proposed Implementation**:
```typescript
await this.slack.sendPlatformApprovalRequest({
  platform: "facebook",
  content: facebookPost.content,
  mediaUrl: facebookPost.mediaUrl,
  hashtags: facebookPost.hashtags
});
```

**Handler Needed**: `action_id: "approve_facebook"`

### Gate 7: LinkedIn Post (Separate) ❌ MISSING
**Should Trigger**: After LinkedIn-specific post generation
**Should Show**:
- Platform: LinkedIn
- Post text (professional tone)
- Hashtags
- Media (image or video)
- Target audience

**Proposed Implementation**:
```typescript
await this.slack.sendPlatformApprovalRequest({
  platform: "linkedin",
  content: linkedinPost.content,
  mediaUrl: linkedinPost.mediaUrl,
  hashtags: linkedinPost.hashtags
});
```

**Handler Needed**: `action_id: "approve_linkedin"`

## Gate Architecture

### Slack Block Kit Structure
All approval gates follow this pattern:

```typescript
const blocks = [
  // 1. Header
  {
    type: "header",
    text: { type: "plain_text", text: "🎯 [Gate Name]", emoji: true }
  },

  // 2. Context (what's being approved)
  {
    type: "section",
    text: { type: "mrkdwn", text: "*Details:*\n[content]" }
  },

  // 3. Preview (links, images, etc.)
  {
    type: "section",
    text: { type: "mrkdwn", text: "*Preview:* <link|View>" }
  },

  // 4. Action Buttons
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ Approve", emoji: true },
        value: JSON.stringify({ action: "approve", data: {...} }),
        action_id: "approve_[gate_name]",
        style: "primary"
      },
      {
        type: "button",
        text: { type: "plain_text", text: "❌ Reject", emoji: true },
        value: JSON.stringify({ action: "reject", data: {...} }),
        action_id: "reject_[gate_name]",
        style: "danger"
      }
    ]
  }
];

await slack.sendMessage("[Gate Name] Approval Needed", blocks);
```

### Webhook Handler Pattern
All gates are handled by `/api/slack/interactions/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const payload = JSON.parse(formData.get("payload") as string);

  if (payload.type !== "block_actions") return NextResponse.json({ message: "Ignored" });

  const action = payload.actions?.[0];
  const value = JSON.parse(action.value || "{}");

  // Route to appropriate handler
  if (action.action_id === "approve_[gate_name]") {
    // Trigger next pipeline step
    // Return success message
  }

  if (action.action_id === "reject_[gate_name]") {
    // Mark as rejected
    // Stop pipeline
  }
}
```

### Button Value Data Format
All approval buttons pass data in this structure:

```json
{
  "action": "approve" | "reject" | "feedback",
  "resource_type": "topic" | "article" | "podcast" | "social" | "video",
  "resource_id": "12345",
  "metadata": {
    // Gate-specific data
  }
}
```

## Approval Gate Flow

```
┌─────────────┐
│  Worker     │
│  Completes  │
└──────┬──────┘
       │
       v
┌─────────────────┐
│ Generate        │
│ Approval        │
│ Request Blocks  │
└──────┬──────────┘
       │
       v
┌─────────────────┐
│ Send to Slack   │
│ (Ben's DM)      │
└──────┬──────────┘
       │
       v
┌─────────────────┐
│ User Clicks     │
│ Approve/Reject  │
└──────┬──────────┘
       │
       v
┌──────────────────────┐
│ Slack sends POST to  │
│ /api/slack/interactions │
└──────┬───────────────┘
       │
       v
┌─────────────────┐
│ Parse payload   │
│ Extract action  │
└──────┬──────────┘
       │
   ┌───┴───┐
   v       v
┌─────┐ ┌─────┐
│Approve Reject│
└──┬──┘ └──┬──┘
   │       │
   v       v
┌─────┐ ┌─────┐
│Next │ │Stop │
│Step │ │Flow │
└─────┘ └─────┘
```

## Testing Approval Gates

### Mock Slack Payload
```typescript
// Test approve_topic gate
const mockPayload = {
  type: "block_actions",
  actions: [{
    action_id: "approve_topic",
    value: JSON.stringify({
      action: "approve_topic",
      topic: "Test Topic",
      draftId: 99999
    })
  }]
};

const response = await fetch('/api/slack/interactions', {
  method: 'POST',
  body: new URLSearchParams({ payload: JSON.stringify(mockPayload) })
});
```

### Slack Block Kit Builder
Use Slack's official tool to preview blocks:
https://app.slack.com/block-kit-builder

### Debug Mode
```typescript
// In slack-client.ts, add debug logging
async sendMessage(text: string, blocks?: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('SLACK MESSAGE:', { text, blocks: JSON.stringify(blocks, null, 2) });
  }
  // ... rest of method
}
```

## Rate Limiting

Slack has these limits:
- **Message posting**: 1 message/second per channel
- **Interaction response**: 3 seconds timeout
- **Block elements**: Max 50 blocks per message

Our gates stay well within limits:
- Max 6 blocks per approval gate
- Instant webhook response (<100ms)
- One approval per pipeline run (no spam)

## Error Handling

### Slack API Errors
```typescript
const data = await response.json();
if (!data.ok) {
  // Common errors:
  // - "invalid_auth": Token expired
  // - "channel_not_found": Invalid channel/user ID
  // - "not_in_channel": Bot not added to channel
  console.error(`Slack API error: ${data.error}`);

  // Fallback: Continue pipeline without approval (dev mode only)
  if (process.env.NODE_ENV === 'development') {
    return { autoApproved: true };
  }
}
```

### Webhook Timeout
```typescript
// Vercel has 10s timeout for serverless functions
// If action takes >10s, trigger async and return immediately
if (action.action_id === "approve_topic") {
  // Start generation async
  orchestrator.generatePost(value.draftId).catch(e => log(e));

  // Return immediately to avoid timeout
  return NextResponse.json({
    text: "✅ Approved! Generation started in background.",
    replace_original: false
  });
}
```

## Security Considerations

### Verify Slack Signature
```typescript
// Validate request is from Slack
import crypto from 'crypto';

const slackSignature = req.headers.get('x-slack-signature');
const slackTimestamp = req.headers.get('x-slack-request-timestamp');
const body = await req.text();

const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET!);
hmac.update(`v0:${slackTimestamp}:${body}`);
const computedSignature = `v0=${hmac.digest('hex')}`;

if (computedSignature !== slackSignature) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

### Prevent Replay Attacks
```typescript
// Reject old requests (>5 minutes)
const timestamp = parseInt(slackTimestamp || '0');
const now = Math.floor(Date.now() / 1000);
if (Math.abs(now - timestamp) > 300) {
  return NextResponse.json({ error: 'Request too old' }, { status: 401 });
}
```

## Future Enhancements

### Planned Features
1. **Inline Editing**: Edit content in Slack before approving
2. **A/B Testing**: Approve multiple variants, test performance
3. **Scheduled Publishing**: Approve now, publish at optimal time
4. **Approval History**: Track who approved what and when
5. **Approval Delegation**: Allow team members to approve
6. **Batch Approval**: Approve multiple items at once

### Optimization Ideas
1. Add preview images to blocks (Slack unfurls)
2. Show SEO score as colored emoji (🟢🟡🔴)
3. Add "Edit" button to modify before approving
4. Show estimated reach/engagement prediction
5. Integrate with analytics (show past performance)
