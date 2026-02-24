# PipelineOrchestrator Flow Reference

## Architecture Overview

The PipelineOrchestrator (`lib/pipeline/orchestrator.ts`) is the central controller for all Tax4US content automation. It coordinates 9 workers across 3 execution modes.

## Class Structure

```typescript
export class PipelineOrchestrator {
  private contentGenerator: ContentGenerator;
  private translator: Translator;
  private mediaProcessor: MediaProcessor;
  private wp: WordPressClient;
  private socialPublisher: SocialPublisher;
  private podcastProducer: PodcastProducer;
  private slack: SlackClient;
  private claude: ClaudeClient;
  private topicManager: TopicManager;
  private airtable: AirtableClient;
}
```

## Public Methods

### 1. `runAutoPilot()`
**Purpose**: Main entry point - auto-detects day and runs appropriate pipeline

**Logic**:
```typescript
const day = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

if (day === 1 || day === 4) {
  // Monday or Thursday: Content Creation
  return await this.proposeNewTopic();
}

if (day === 3) {
  // Wednesday: Podcast Production
  return await this.producePodcastsFromTodaysPosts();
}

if (day === 2 || day === 5) {
  // Tuesday or Friday: SEO Audit
  return await this.runSEOAutoPilot();
}

return { status: "idle" }; // No work scheduled
```

**Returns**:
```typescript
{
  status: "awaiting_approval" | "processing" | "completed" | "idle",
  postId?: number,
  topic?: string,
  message?: string
}
```

### 2. `proposeNewTopic()`
**Purpose**: Mon/Thu content creation - Step 1 (Topic Proposal)

**Flow**:
1. Fetch recent 20 WordPress posts to avoid duplication
2. Call Claude Haiku to generate topic suggestion
3. Create WordPress draft with `[PROPOSAL]` prefix
4. Send Slack approval request to Ben
5. Return `{ status: "awaiting_approval", postId, topic }`

**Slack Approval Required**: ✅ Yes (user must click approve)

**Next Step**: User approves → `/api/slack/interactions` → `generatePost()`

### 3. `generatePost(draftPostId, approvedTopic?, airtableId?)`
**Purpose**: Mon/Thu content creation - Step 2 (Full Content Generation)

**Flow**:
1. Update WordPress draft title to `[PROCESSING]`
2. Spawn async execution via `runFullGeneration()` (non-blocking)
3. Return immediately with `{ status: "processing", postId }`

**Async Phases** (in `runFullGeneration()`):
1. **Content Generation** (90s)
   - Generate 1941-word Hebrew article with Gutenberg blocks
   - SEO metadata, categories, tags
   - RankMath fields

2. **Media Generation** (15s, parallel with content)
   - Kie.ai featured image
   - Upload to WordPress media library

3. **WordPress Publish** (3s)
   - Update draft with content + media
   - Resolve categories/tags (create if missing)
   - Set status to "publish"

4. **English Translation** (25s)
   - Translate Hebrew content to English
   - Generate English SEO metadata
   - Create separate English post
   - Link via Polylang `translations[he]` parameter

5. **Social Media Prep** (20s)
   - Generate bilingual social posts
   - Start Kie.ai Sora video generation (async)
   - Send Slack approval request

6. **Podcast Logic** (if Wednesday)
   - Only runs if `new Date().getDay() === 3`
   - Calls `podcastProducer.prepareEpisode()`

7. **AITable Update** (if airtableId provided)
   - Mark record as "Published"
   - Update WP Link and SEO Score

**Returns**: Immediately `{ status: "processing", postId }`

**Actual Completion**: 5-8 minutes later (async)

### 4. `runSEOAutoPilot()`
**Purpose**: Tue/Fri SEO optimization for low-scoring posts

**Flow**:
1. Fetch recent 20 published posts
2. For each post, calculate SEO score
3. If score < 90%:
   - Analyze issues using SEOScorer
   - Generate enhanced content via Claude
   - Update WordPress with new content
   - Update RankMath metadata
   - Send Slack notification

**Slack Approval Required**: ❌ No (auto-optimizes)

**Expected**: 2-4 minutes per post

### 5. `heal(postId)`
**Purpose**: Fix stalled or failed pipeline items

**Detection Logic**:
```typescript
const post = await wp.getPost(postId);
const metadata = post.meta || {};

// Missing English translation?
if (post.status === 'publish' && !metadata.en_link) {
  // Trigger translation
}

// Media generated but not socially published?
if (metadata.kie_video_url && !metadata.social_posted) {
  // Trigger social publish
}
```

**Returns**: `{ status: "healed", postId }`

### 6. `processAITableQueue()`
**Purpose**: Process all "Ready" topics from AITable

**Flow**:
1. Fetch topics with `Status: "Ready"` from Airtable
2. For each topic:
   - Create WordPress draft
   - Call `generatePost(draft.id, topic.topic, topic.airtableId)`

**Used By**: Mon/Thu autopilot after topic proposal

## Private Methods

### `runFullGeneration(draftPostId, topicName, airtableId?)`
**Purpose**: Async worker that does the heavy lifting

**Critical**: This runs in background to avoid Vercel timeout

**Phases**:
1. Content generation
2. Media upload
3. Category/tag resolution
4. Hebrew post publish
5. English translation + publish
6. Polylang linking
7. Social post prep (with Slack approval)
8. Podcast (if Wednesday)
9. AITable update

**Error Handling**: Uses try/catch, logs errors, but doesn't throw (to avoid crashing parent)

### `proposeNewTopicWithFeedback(feedback: string)`
**Purpose**: Generate new topic based on Ben's feedback

**Triggered By**: Slack "Give Feedback" button (future enhancement)

**Flow**: Same as `proposeNewTopic()` but includes feedback in prompt

## Day-of-Week Logic Summary

| Day | Index | Pipeline | Duration | Approval Gates |
|-----|-------|----------|----------|----------------|
| Monday | 1 | Content Creation | 5-8 min | Topic, Social |
| Tuesday | 2 | SEO Audit | 2-4 min/post | None |
| Wednesday | 3 | Podcast Production | 3-5 min | Episode |
| Thursday | 4 | Content Creation | 5-8 min | Topic, Social |
| Friday | 5 | SEO Audit | 2-4 min/post | None |
| Sat/Sun | 6/0 | Idle | - | - |

## Data Flow Diagram

```
┌─────────────────┐
│   User/Cron     │
│ triggers run    │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────┐
│      runAutoPilot()                     │
│  (detects day, routes to pipeline)      │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    v         v         v         v
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Mon/Thu │ │Tuesday │ │  Wed   │ │Weekend │
│Content │ │SEO     │ │Podcast │ │ Idle   │
└───┬────┘ └───┬────┘ └───┬────┘ └────────┘
    │          │          │
    v          v          v
┌─────────┐ ┌─────────┐ ┌─────────────┐
│ Propose │ │Run SEO  │ │Fetch Today's│
│ Topic   │ │AutoPilot│ │   Posts     │
└───┬─────┘ └───┬─────┘ └─────┬───────┘
    │           │              │
    v           │              v
┌─────────┐     │        ┌──────────────┐
│ Slack   │     │        │Podcast       │
│Approval │     │        │Producer      │
└───┬─────┘     │        └──────┬───────┘
    │           │               │
    v           │               v
┌─────────────┐ │        ┌──────────────┐
│generatePost │ │        │ElevenLabs    │
│  (async)    │ │        │TTS Gen       │
└──────┬──────┘ │        └──────┬───────┘
       │        │               │
       v        v               v
┌──────────────────────┐ ┌──────────────┐
│WordPress Publish     │ │Captivate.fm  │
│+ English Translation │ │Upload        │
└──────────────────────┘ └──────┬───────┘
                                │
                                v
                         ┌──────────────┐
                         │Slack Approval│
                         │before Publish│
                         └──────────────┘
```

## Error Handling Strategy

### Non-Blocking Errors
These log but don't stop pipeline:
- Media generation failure (publishes without image)
- Slack notification failure (logs warning, continues)
- AITable update failure (content still published)

### Blocking Errors
These stop pipeline and require heal():
- WordPress publish failure (auth, network timeout)
- Content generation failure (Claude API error)
- Translation failure (blocks English post)

### Auto-Heal Triggers
When pipeline fails, heal() checks:
1. Is content generated but not published?
2. Is Hebrew post published but English missing?
3. Are posts published but social not posted?
4. Is podcast audio generated but not uploaded?

Heal re-runs only the failed phase without regenerating prior work.

## Performance Considerations

### Parallel Operations
These run concurrently to save time:
- Content generation + Media generation
- Hebrew post update + English translation
- Kie.ai video start + Social text generation

### Async Execution Pattern
```typescript
// API endpoint returns immediately
await updateDraftTitle(); // Shows "[PROCESSING]"

// Heavy work runs in background
this.runFullGeneration().catch(e => log(e));

return { status: "processing" }; // User can poll later
```

### Vercel Timeout Avoidance
- Hobby plan: 10s max execution
- Pro plan: 60s max execution
- Our pipeline: 5-8 minutes total

**Solution**: Async execution + webhook callbacks

## Integration Points

### External Services
- **WordPress REST API**: Post CRUD, media upload, category/tag management
- **Slack API**: Approval requests, notifications
- **Claude API**: Content generation, translation, SEO optimization
- **ElevenLabs API**: TTS audio generation
- **Captivate.fm API**: Podcast episode upload
- **Kie.ai API**: Image + video generation
- **Airtable API**: Topic queue management

### Internal Dependencies
- `ContentGenerator`: Article generation + SEO scoring
- `Translator`: Hebrew ↔ English translation
- `MediaProcessor`: Kie.ai image generation + WP upload
- `SocialPublisher`: Bilingual social posts + video
- `PodcastProducer`: TTS + Captivate integration
- `TopicManager`: Airtable topic fetching
- `pipelineLogger`: Structured logging

## Debugging Tips

### Enable Verbose Logging
```typescript
// In orchestrator.ts, pipelineLogger writes to console
// To see all events:
NODE_ENV=development npm run dev
// Watch for:
// [INFO] Starting Generation for Draft...
// [AGENT] Generating content...
// [SUCCESS] Published: https://...
// [ERROR] Generation Failed: ...
```

### Check Pipeline State
```bash
# View active tasks
cat pipeline-logs.json

# Check WordPress draft status
curl "https://tax4us.co.il/wp-json/wp/v2/posts?status=draft&per_page=5"

# View Airtable queue
# (Use Airtable web UI or API)
```

### Manual Recovery
```typescript
// If pipeline crashed mid-way
const orchestrator = new PipelineOrchestrator();

// Option 1: Resume from last draft
const drafts = await orchestrator.wp.getPosts({ status: 'draft' });
const stalledDraft = drafts.find(d => d.title.rendered.includes('[PROCESSING]'));
if (stalledDraft) {
  await orchestrator.generatePost(stalledDraft.id);
}

// Option 2: Heal specific post
await orchestrator.heal(12345);
```

## Future Enhancements

### Planned Features
1. Pipeline scheduling (queue multiple runs)
2. Real-time progress SSE stream
3. Retry logic with exponential backoff
4. Pipeline templates (different content types)
5. A/B testing for social posts
6. Multi-language support (beyond Hebrew/English)

### Optimization Opportunities
1. Cache WordPress categories/tags (reduce API calls)
2. Parallel English + social generation
3. Pre-warm Claude/ElevenLabs for faster response
4. CDN caching for media assets
