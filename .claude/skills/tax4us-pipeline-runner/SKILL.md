---
name: tax4us-pipeline-runner
description: >-
  Execute Tax4US content automation pipeline with real-time progress tracking and error recovery.
  Handles Mon/Thu content creation, Wed podcast production, and Tue/Fri SEO audits.
  Use when triggering pipeline runs, monitoring progress, or debugging stalled workflows.
  Not for individual worker tasks - use tax4us-worker-trigger for that.
version: 1.0.0
author: Claude Code (Sonnet 4.5)
created: 2026-02-23
tags: [tax4us, automation, pipeline, content-generation, orchestration]
---

## Critical Requirements

**MANDATORY CHECKS BEFORE EXECUTION:**
- ✅ Environment variables loaded (.env.local must exist)
- ✅ WordPress API accessible (test with curl first)
- ✅ Slack webhook configured (approval gates depend on this)
- ✅ Check day-of-week to determine which workers run
- ✅ Verify no pipeline already in progress (check pipeline-logs.json)

**BLOCKING ISSUES:**
- 🚫 NEVER run multiple pipelines simultaneously - causes data corruption
- 🚫 NEVER skip Slack approvals - defeats quality control
- 🚫 NEVER bypass error handling - use heal() method instead
- 🚫 NEVER hardcode credentials - always use process.env

## Core Workflow

### Step 1: Pre-Flight Validation
```typescript
// Check environment readiness
const checks = {
  envLoaded: process.env.WORDPRESS_API_URL !== undefined,
  slackConfigured: process.env.SLACK_BOT_TOKEN !== undefined,
  noActiveRun: !existsSync('pipeline-logs.json') || isStale('pipeline-logs.json')
};

if (!Object.values(checks).every(Boolean)) {
  throw new Error('Pre-flight checks failed. Resolve issues before running.');
}
```

### Step 2: Determine Pipeline Mode
Based on current day:
- **Monday (1) or Thursday (4)**: Content Creation Pipeline
  - Topic Manager → Content Generator → Translator → Media Processor → Social Publisher
  - Expected duration: 5-8 minutes
  - Slack gates: Topic approval, Social approval

- **Wednesday (3)**: Podcast Production
  - Fetches today's published posts
  - Podcast Producer → ElevenLabs TTS → Captivate.fm upload
  - Expected duration: 3-5 minutes
  - Slack gate: Episode approval before publish

- **Tuesday (2) or Friday (5)**: SEO Audit
  - Scans WordPress for posts <90% score
  - Auto-enhances content using NotebookLM
  - Expected duration: 2-4 minutes per post
  - No Slack gate (auto-runs)

- **Other days**: Idle (no scheduled work)

### Step 3: Execute Pipeline with Progress Tracking

```typescript
import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator';
import { pipelineLogger } from '@/lib/pipeline/logger';

const orchestrator = new PipelineOrchestrator();

// Use TodoWrite to track major phases
TodoWrite({
  todos: [
    { content: "Initialize pipeline", status: "in_progress", activeForm: "Initializing pipeline" },
    { content: "Propose topic and get approval", status: "pending", activeForm: "Proposing topic" },
    { content: "Generate Hebrew article", status: "pending", activeForm: "Generating article" },
    { content: "Translate to English", status: "pending", activeForm: "Translating content" },
    { content: "Generate media assets", status: "pending", activeForm: "Generating media" },
    { content: "Publish to WordPress", status: "pending", activeForm: "Publishing to WordPress" },
    { content: "Prepare social posts", status: "pending", activeForm: "Preparing social posts" },
    { content: "Complete pipeline", status: "pending", activeForm: "Completing pipeline" }
  ]
});

// Run autopilot - it auto-detects day and routes appropriately
const result = await orchestrator.runAutoPilot();
```

### Step 4: Monitor Progress
```typescript
// Pipeline logger writes to console and can be parsed
// Key events to watch for:
// - "Starting Topic Proposal Phase..."
// - "Topic approval pending for: [topic]"
// - "Starting Generation for Draft [id]..."
// - "Generation Failed: [error]" ← triggers auto-heal

// Update TodoWrite as phases complete
// Mark current task as completed, next as in_progress
```

### Step 5: Handle Approval Wait States
```typescript
// When Slack approval required, pipeline pauses
// User must click approve in Slack
// System resumes via /api/slack/interactions webhook

// Detect approval wait state:
if (result.status === "awaiting_approval") {
  console.log(`⏸️  Pipeline paused. Awaiting Slack approval for: ${result.topic}`);
  console.log(`📋 Draft ID: ${result.postId}`);
  console.log(`Check Slack DM from Tax4US Bot for approval buttons.`);

  // Don't block - let user approve manually
  return {
    status: "paused_for_approval",
    nextStep: "User must approve in Slack to continue",
    draftId: result.postId
  };
}
```

### Step 6: Error Recovery with Auto-Heal
```typescript
// If pipeline fails mid-execution
try {
  await orchestrator.runAutoPilot();
} catch (error) {
  pipelineLogger.error(`Pipeline failed: ${error.message}`);

  // Attempt auto-heal if we have a post ID
  if (error.postId) {
    console.log(`🔧 Attempting auto-heal for post ${error.postId}...`);
    const healed = await orchestrator.heal(error.postId);

    if (healed.status === "healed") {
      console.log(`✅ Successfully healed post ${error.postId}`);
      return healed;
    }
  }

  throw error; // Re-throw if heal failed
}
```

### Step 7: Completion and Logging
```typescript
// Log completion to decisions.json
const decision = {
  id: `pipeline_run_${Date.now()}`,
  decision: `Executed ${getDayName()} pipeline`,
  context: `Day: ${new Date().getDay()}, Mode: ${result.task || 'content'}`,
  implementation_notes: `Status: ${result.status}, Post ID: ${result.postId || 'N/A'}`,
  impact: "high",
  made_at: new Date().toISOString(),
  made_by: "Claude Sonnet 4.5 via tax4us-pipeline-runner skill"
};

// Append to decisions.json
// Mark final TodoWrite task as completed
```

## Advanced Techniques

### On-Demand Pipeline Execution (Override Day Logic)
```typescript
// Force run specific pipeline regardless of day
const orchestrator = new PipelineOrchestrator();

// Force content creation
await orchestrator.proposeNewTopic();

// Force SEO audit
await orchestrator.runSEOAutoPilot();

// Force podcast production (requires today's posts)
const todayPosts = await orchestrator.wp.getPosts({
  after: new Date().toISOString().split('T')[0] + 'T00:00:00Z'
});
for (const post of todayPosts) {
  await orchestrator.podcastProducer.prepareEpisode(
    post.content.rendered,
    post.title.rendered,
    post.id
  );
}
```

### Resume Interrupted Pipeline
```typescript
// If pipeline was interrupted (Vercel timeout, crash, etc.)
// Find the last in-progress draft
const drafts = await wp.getPosts({ status: 'draft', per_page: 1 });
const stalledDraft = drafts.find(d => d.title.rendered.includes('[PROCESSING]'));

if (stalledDraft) {
  console.log(`Found stalled draft: ${stalledDraft.id}`);
  // Re-trigger generation from that point
  await orchestrator.generatePost(stalledDraft.id);
}
```

### Batch Process AITable Queue
```typescript
// Process multiple topics from AITable at once
await orchestrator.processAITableQueue();

// This handles all "Ready" status topics in Airtable
// Creates WordPress drafts and processes each through full pipeline
```

### Custom Progress Monitoring
```typescript
// For real-time progress in UI, poll WordPress draft status
async function monitorProgress(draftId: number) {
  const interval = setInterval(async () => {
    const draft = await wp.getPost(draftId);
    const title = draft.title.rendered;

    if (title.includes('[PROCESSING]')) {
      console.log('⏳ Still processing...');
    } else if (draft.status === 'publish') {
      console.log('✅ Published!');
      clearInterval(interval);
    }
  }, 5000); // Check every 5 seconds
}
```

## Troubleshooting

### Issue: Pipeline stuck in "awaiting_approval"
**Cause**: User hasn't clicked Slack approval button
**Solution**:
1. Check Slack DMs from Tax4US Bot
2. Click ✅ Approve button
3. Pipeline auto-resumes via webhook

### Issue: "Pre-flight checks failed"
**Cause**: Missing environment variables or services down
**Solution**:
```bash
# Test WordPress
curl -X GET "https://tax4us.co.il/wp-json/wp/v2/posts?per_page=1"

# Test Slack
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN"

# Reload .env.local
source .env.local
```

### Issue: Pipeline times out on Vercel
**Cause**: Vercel serverless functions have 10s limit (hobby) or 60s (pro)
**Solution**: Pipeline uses async execution pattern
- Initial request returns immediately with status: "processing"
- Background task continues via `runFullGeneration()`
- User can check status by polling WordPress draft

### Issue: Multiple pipelines running simultaneously
**Cause**: Cron triggered while manual run in progress
**Solution**: Implement lock file
```typescript
const LOCK_FILE = '/tmp/pipeline.lock';
if (existsSync(LOCK_FILE)) {
  throw new Error('Pipeline already running. Wait for completion.');
}
writeFileSync(LOCK_FILE, Date.now().toString());
// ... run pipeline ...
unlinkSync(LOCK_FILE);
```

### Issue: Content generated but not published
**Cause**: WordPress update failed (auth issue, network timeout)
**Solution**: Use heal() method
```typescript
await orchestrator.heal(draftId);
// Re-attempts failed steps without regenerating content
```

## Performance Optimization

### Expected Timings (Baseline)
- **Topic Proposal**: 5-10 seconds (Claude Haiku)
- **Content Generation**: 45-90 seconds (Claude Sonnet, 1941 words)
- **Translation**: 20-30 seconds (Claude Sonnet)
- **Media Generation**: 10-15 seconds (Kie.ai)
- **WordPress Publish**: 2-3 seconds
- **Social Post Prep**: 15-20 seconds (Claude Haiku + Kie.ai video start)
- **Total Mon/Thu Pipeline**: 5-8 minutes

### Optimization Strategies
1. **Parallel Operations**: Media generation + content generation run concurrently
2. **Model Selection**: Haiku for simple tasks, Sonnet for content quality
3. **Caching**: WordPress categories/tags resolved once and reused
4. **Async Execution**: Long-running tasks don't block API responses

## Usage Examples

### Example 1: Standard Monday Content Run
```typescript
// User: "Run today's content pipeline"

const orchestrator = new PipelineOrchestrator();
const result = await orchestrator.runAutoPilot();

// Output:
// Starting Topic Proposal Phase...
// Topic Proposed: "FBAR Reporting Deadlines for 2026"
// Topic approval pending. Waiting for Ben's response...
// ⏸️  Pipeline paused. Check Slack to approve.

// [User clicks approve in Slack]
// [Webhook triggers generatePost()]

// Starting Generation for Draft 12345...
// Generating content... (90 seconds)
// ✓ Hebrew article generated (1941 words, SEO score: 94%)
// Translating to English... (25 seconds)
// ✓ English version created
// Generating media... (12 seconds)
// ✓ Featured image uploaded
// Publishing to WordPress...
// ✓ Published: https://tax4us.co.il/fbar-reporting-2026
// Preparing social posts...
// Social approval request sent to Slack
// ✅ Pipeline complete
```

### Example 2: Wednesday Podcast Production
```typescript
// User: "Run Wednesday podcast flow"

// System auto-detects it's Wednesday
const result = await orchestrator.runAutoPilot();

// Output:
// Wednesday Worker: Running Podcast production flow.
// Fetching today's published posts...
// Found 1 post: "FBAR Reporting Deadlines for 2026"
// Synthesizing podcast episode...
// Generating Emma dialogue... (30 seconds)
// Generating Ben dialogue... (30 seconds)
// Merging audio tracks... (5 seconds)
// Uploading to Captivate.fm... (15 seconds)
// ✓ Episode created as Draft (Episode #47)
// Slack approval request sent
// ⏸️  Awaiting approval to publish
```

### Example 3: Force SEO Audit (Any Day)
```typescript
// User: "Run SEO audit now"

const orchestrator = new PipelineOrchestrator();
await orchestrator.runSEOAutoPilot();

// Output:
// Running SEO AutoPilot: scanning WordPress...
// Analyzing 20 recent posts...
// Low score detected: "Tax Planning Strategies" (67%)
// Enhancing content... (45 seconds)
// ✓ Optimized: New score 92%
// Slack notification sent
// Fixed 1 post
```

### Example 4: Heal Stalled Pipeline
```typescript
// User: "Fix stuck post 12345"

const orchestrator = new PipelineOrchestrator();
const healed = await orchestrator.heal(12345);

// Output:
// Healing requested for Post 12345
// Detected: Published Hebrew version exists
// Missing: English translation
// Healing Translation for 12345...
// ✓ English version created and linked
// Detected: Social posts not published
// Healing Social Publish for 12345...
// ✓ Social posts sent to approval
// ✅ Heal diagnostics complete
```

## Integration with Other Skills

### Works With:
- **tax4us-development**: Uses its progress tracking and documentation patterns
- **api-integration-master**: Leverages its WordPress/Slack/Captivate patterns
- **superpowers**: Uses systematic problem-solving for error recovery

### Triggers:
- **tax4us-approval-gate-builder**: When new approval gate needed
- **tax4us-content-healer**: On pipeline errors
- **tax4us-worker-trigger**: For individual worker execution

## Self-Improvement

### Learning Integration
This skill tracks:
- Average execution times per phase
- Common failure points
- Approval wait times
- Healing success rates

### Improvement Opportunities
- Add pipeline visualization (text-based progress bar)
- Implement smart retries with exponential backoff
- Add pipeline scheduling (queue multiple runs)
- Create pipeline templates (different content types)

### Version History
- v1.0.0 (2026-02-23): Initial creation with core workflow support

## References

See `references/` directory for:
- `orchestrator-flow.md`: Detailed PipelineOrchestrator architecture
- `approval-gates.md`: All 7 Slack approval gate specifications
- `error-recovery.md`: Comprehensive healing strategies
- `performance-benchmarks.md`: Timing data and optimization tips
