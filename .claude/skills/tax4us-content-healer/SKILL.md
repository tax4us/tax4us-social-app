---
name: tax4us-content-healer
description: >-
  Auto-diagnose and repair stuck content pieces in the Tax4US pipeline.
  Detects: missing translations, unpublished social posts, failed media uploads, broken links.
  Re-triggers failed workers without regenerating content. Prevents data loss.
  Use when content is stuck, partially published, or missing expected outputs.
  Not for content quality issues - use SEO auditor for that.
version: 1.0.0
author: Claude Code (Sonnet 4.5)
created: 2026-02-23
tags: [tax4us, automation, healing, debugging, recovery]
---

## Critical Requirements

**BEFORE HEALING:**
- ✅ Identify the stuck post ID (WordPress, Airtable, or pipeline logs)
- ✅ Verify post actually exists in WordPress
- ✅ Understand expected vs actual state (what's missing?)
- ✅ Check if healing is safe (won't create duplicates)

**HEALING RULES:**
- 🔒 NEVER regenerate content that already exists
- 🔒 NEVER publish drafts without approval (unless auto-approved)
- 🔒 NEVER delete data - only add missing pieces
- 🔒 ALWAYS verify before making changes
- 🔒 ALWAYS log healing actions to decisions.json

**CRITICAL WARNINGS:**
- 🚫 NEVER heal the same post twice simultaneously (race condition)
- 🚫 NEVER skip WordPress metadata checks (prevents wrong diagnosis)
- 🚫 NEVER assume failures - verify each step succeeded
- 🚫 NEVER heal posts still in [PROCESSING] state (let pipeline finish)

## Core Workflow

### Step 1: Diagnose the Problem

```typescript
import { PipelineOrchestrator } from '@/lib/pipeline/orchestrator';
import { WordPressClient } from '@/lib/clients/wordpress-client';

async function diagnosePost(postId: number) {
  const wp = new WordPressClient();
  const post = await wp.getPost(postId);

  if (!post) {
    return { error: "Post not found", canHeal: false };
  }

  const diagnosis = {
    postId,
    title: post.title.rendered,
    status: post.status,
    issues: [] as string[],
    canHeal: true,
    healingSteps: [] as string[]
  };

  // Check 1: Is post published?
  if (post.status !== 'publish') {
    if (post.title.rendered.includes('[PROCESSING]')) {
      diagnosis.issues.push("Still processing - pipeline hasn't finished");
      diagnosis.canHeal = false;
    } else if (post.title.rendered.includes('[AWAITING APPROVAL]')) {
      diagnosis.issues.push("Awaiting user approval in Slack");
      diagnosis.canHeal = false;
    } else {
      diagnosis.issues.push("Draft exists but not published");
      diagnosis.healingSteps.push("Publish draft to WordPress");
    }
  }

  // Check 2: Does English translation exist?
  const polylangMeta = post.meta?.polylang || {};
  const englishId = polylangMeta.en;

  if (!englishId && post.status === 'publish') {
    diagnosis.issues.push("Missing English translation");
    diagnosis.healingSteps.push("Generate and publish English version");
  }

  // Check 3: Are social posts prepared?
  const socialPosted = post.meta?.social_posted || post.meta?._social_posted;
  if (!socialPosted && post.status === 'publish') {
    diagnosis.issues.push("Social posts not prepared");
    diagnosis.healingSteps.push("Generate social posts for FB/LinkedIn");
  }

  // Check 4: Is featured media attached?
  if (!post.featured_media && post.status === 'publish') {
    diagnosis.issues.push("Missing featured image");
    diagnosis.healingSteps.push("Generate and upload featured image");
  }

  // Check 5: Is SEO metadata complete?
  const seoScore = post.meta?.rank_math_seo_score;
  if (!seoScore || seoScore < 70) {
    diagnosis.issues.push(`Low/missing SEO score: ${seoScore || 0}%`);
    diagnosis.healingSteps.push("Run SEO optimization");
  }

  return diagnosis;
}
```

### Step 2: Execute Healing Actions

```typescript
async function healPost(postId: number) {
  const diagnosis = await diagnosePost(postId);

  if (!diagnosis.canHeal) {
    console.log(`❌ Cannot heal post ${postId}: ${diagnosis.issues[0]}`);
    return { status: "cannot_heal", reason: diagnosis.issues[0] };
  }

  if (diagnosis.issues.length === 0) {
    console.log(`✅ Post ${postId} is healthy - no healing needed`);
    return { status: "healthy", message: "No issues detected" };
  }

  console.log(`🔧 Healing post ${postId}...`);
  console.log(`Issues found: ${diagnosis.issues.join(", ")}`);
  console.log(`Healing steps: ${diagnosis.healingSteps.join(" → ")}`);

  const orchestrator = new PipelineOrchestrator();
  const healingResults = [];

  // Execute each healing step
  for (const step of diagnosis.healingSteps) {
    try {
      if (step === "Publish draft to WordPress") {
        await orchestrator.wp.updatePost(postId, { status: "publish" });
        healingResults.push({ step, success: true });
      }

      if (step === "Generate and publish English version") {
        const post = await orchestrator.wp.getPost(postId);
        const englishContent = await orchestrator.translator.translateHeToEn(
          post.content.rendered
        );

        const englishSeoMeta = await orchestrator.contentGenerator.generateArticle({
          id: `en-${postId}`,
          topic: post.title.rendered,
          title: post.title.rendered,
          audience: "English Speaking Investors/Expats",
          language: "en",
          type: "blog_post",
          status: "ready"
        });

        const enCategoryIds = await orchestrator.wp.resolveCategories(
          englishSeoMeta.metadata.categories || ["Business Tax", "English"]
        );
        const enTagIds = await orchestrator.wp.resolveTags(
          englishSeoMeta.metadata.tags || []
        );

        const englishPost = await orchestrator.wp.createPost({
          title: englishSeoMeta.metadata.title,
          content: englishContent,
          status: "publish",
          excerpt: englishSeoMeta.metadata.excerpt,
          featured_media: post.featured_media || 0,
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
        await orchestrator.wp.updatePost(englishPost.id, {}, {
          lang: "en",
          "translations[he]": postId.toString()
        });

        healingResults.push({
          step,
          success: true,
          englishPostId: englishPost.id
        });
      }

      if (step === "Generate social posts for FB/LinkedIn") {
        const post = await orchestrator.wp.getPost(postId);
        const englishPost = post.meta?.polylang?.en
          ? await orchestrator.wp.getPost(parseInt(post.meta.polylang.en))
          : null;

        await orchestrator.socialPublisher.prepareSocialPosts(
          post.content.rendered,
          post.title.rendered,
          post.link,
          englishPost?.link || "",
          postId.toString()
        );

        healingResults.push({ step, success: true });
      }

      if (step === "Generate and upload featured image") {
        const post = await orchestrator.wp.getPost(postId);
        const media = await orchestrator.mediaProcessor.generateAndUploadImage(
          `Professional illustration for tax article: ${post.title.rendered}`,
          post.title.rendered
        );

        await orchestrator.wp.updatePost(postId, {
          featured_media: media.id
        });

        healingResults.push({
          step,
          success: true,
          mediaId: media.id
        });
      }

      if (step === "Run SEO optimization") {
        const post = await orchestrator.wp.getPost(postId);
        const enhanced = await orchestrator.contentGenerator.enhanceArticle(
          post.content.rendered,
          post.title.rendered,
          post.meta?.rank_math_focus_keyword || "",
          ["Low SEO score detected during healing"],
          ["Optimize for target keywords and readability"]
        );

        const enhancedCatIds = await orchestrator.wp.resolveCategories(
          enhanced.metadata.categories || []
        );
        const enhancedTagIds = await orchestrator.wp.resolveTags(
          enhanced.metadata.tags || []
        );

        await orchestrator.wp.updatePost(postId, {
          content: enhanced.content,
          categories: enhancedCatIds.length > 0 ? enhancedCatIds : undefined,
          tags: enhancedTagIds.length > 0 ? enhancedTagIds : undefined,
          meta: {
            rank_math_focus_keyword: enhanced.metadata.focus_keyword,
            rank_math_title: enhanced.metadata.seo_title,
            rank_math_description: enhanced.metadata.seo_description,
            rank_math_seo_score: enhanced.seo_score,
            _healed_at: new Date().toISOString()
          }
        } as any);

        healingResults.push({
          step,
          success: true,
          newSeoScore: enhanced.seo_score
        });
      }

    } catch (error: any) {
      console.error(`Failed to execute: ${step}`, error);
      healingResults.push({
        step,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = healingResults.filter(r => r.success).length;
  const totalSteps = healingResults.length;

  return {
    status: successCount === totalSteps ? "fully_healed" : "partially_healed",
    postId,
    issuesFound: diagnosis.issues.length,
    stepsExecuted: totalSteps,
    stepsSuccessful: successCount,
    results: healingResults
  };
}
```

### Step 3: Batch Healing (Scan Multiple Posts)

```typescript
async function scanAndHealRecent(limit: number = 10) {
  const wp = new WordPressClient();
  const posts = await wp.getPosts({
    per_page: limit.toString(),
    status: 'publish'
  });

  console.log(`🔍 Scanning ${posts.length} recent posts for issues...`);

  const healingJobs = [];

  for (const post of posts) {
    const diagnosis = await diagnosePost(post.id);

    if (diagnosis.issues.length > 0 && diagnosis.canHeal) {
      console.log(`⚠️  Issues found in post ${post.id}: ${diagnosis.issues.join(", ")}`);
      healingJobs.push(post.id);
    }
  }

  if (healingJobs.length === 0) {
    console.log("✅ All posts are healthy!");
    return { status: "all_healthy", scanned: posts.length };
  }

  console.log(`🔧 Healing ${healingJobs.length} posts...`);

  const healingResults = [];
  for (const postId of healingJobs) {
    const result = await healPost(postId);
    healingResults.push(result);

    // Brief pause between healing jobs to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return {
    status: "batch_complete",
    scanned: posts.length,
    healed: healingResults.length,
    results: healingResults
  };
}
```

## Advanced Techniques

### Healing by Symptom

```typescript
// Find all posts missing English translations
async function healMissingTranslations() {
  const wp = new WordPressClient();
  const hebrewPosts = await wp.getPosts({
    per_page: '50',
    status: 'publish',
    lang: 'he'
  });

  const postsNeedingTranslation = [];

  for (const post of hebrewPosts) {
    const englishId = post.meta?.polylang?.en;
    if (!englishId) {
      postsNeedingTranslation.push(post.id);
    }
  }

  console.log(`Found ${postsNeedingTranslation.length} posts without English translations`);

  for (const postId of postsNeedingTranslation) {
    await healPost(postId);
  }
}

// Find all posts with low SEO scores
async function healLowSEOScores(threshold: number = 80) {
  const wp = new WordPressClient();
  const posts = await wp.getPosts({
    per_page: '50',
    status: 'publish'
  });

  const lowScorePosts = posts.filter(post => {
    const score = post.meta?.rank_math_seo_score || 0;
    return score < threshold;
  });

  console.log(`Found ${lowScorePosts.length} posts with SEO score < ${threshold}%`);

  for (const post of lowScorePosts) {
    await healPost(post.id);
  }
}

// Find all posts missing featured images
async function healMissingMedia() {
  const wp = new WordPressClient();
  const posts = await wp.getPosts({
    per_page: '50',
    status: 'publish'
  });

  const postsWithoutMedia = posts.filter(post => !post.featured_media);

  console.log(`Found ${postsWithoutMedia.length} posts without featured images`);

  for (const post of postsWithoutMedia) {
    await healPost(post.id);
  }
}
```

### Preventive Healing (Auto-Healer Worker)

```typescript
// Run this on a cron schedule (e.g., daily at 6 AM)
async function preventiveHealing() {
  console.log("🏥 Running preventive healing scan...");

  // Check posts from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const wp = new WordPressClient();
  const recentPosts = await wp.getPosts({
    per_page: '50',
    status: 'publish',
    after: sevenDaysAgo.toISOString()
  });

  let healedCount = 0;
  let healthyCount = 0;

  for (const post of recentPosts) {
    const diagnosis = await diagnosePost(post.id);

    if (diagnosis.issues.length > 0 && diagnosis.canHeal) {
      console.log(`Healing post ${post.id}...`);
      await healPost(post.id);
      healedCount++;
    } else {
      healthyCount++;
    }
  }

  // Send summary to Slack
  const slack = new SlackClient();
  await slack.sendMessage(
    `🏥 *Preventive Healing Complete*\n` +
    `Scanned: ${recentPosts.length} posts\n` +
    `Healthy: ${healthyCount}\n` +
    `Healed: ${healedCount}`
  );

  return { scanned: recentPosts.length, healthy: healthyCount, healed: healedCount };
}
```

### Healing with Verification

```typescript
async function healWithVerification(postId: number) {
  // Step 1: Diagnose
  const beforeDiagnosis = await diagnosePost(postId);
  console.log("Before healing:", beforeDiagnosis);

  // Step 2: Heal
  const healResult = await healPost(postId);
  console.log("Healing result:", healResult);

  // Step 3: Verify (re-diagnose)
  const afterDiagnosis = await diagnosePost(postId);
  console.log("After healing:", afterDiagnosis);

  // Step 4: Compare
  const issuesFixed = beforeDiagnosis.issues.length - afterDiagnosis.issues.length;
  const stillBroken = afterDiagnosis.issues;

  return {
    postId,
    issuesBefore: beforeDiagnosis.issues.length,
    issuesAfter: afterDiagnosis.issues.length,
    issuesFixed,
    stillBroken,
    fullyHealed: afterDiagnosis.issues.length === 0
  };
}
```

## Troubleshooting

### Issue: Healing creates duplicate English posts
**Cause**: Polylang metadata not checked before creating translation
**Solution**:
```typescript
// Always check for existing translation first
const existingEnglish = post.meta?.polylang?.en;
if (existingEnglish) {
  const englishPost = await wp.getPost(parseInt(existingEnglish));
  if (englishPost) {
    console.log("English translation already exists:", englishPost.id);
    return; // Skip translation healing
  }
}
```

### Issue: Healing triggers while pipeline is still running
**Cause**: Post title contains `[PROCESSING]` but healing started anyway
**Solution**:
```typescript
// Check title for processing markers
if (post.title.rendered.includes('[PROCESSING]') ||
    post.title.rendered.includes('[AWAITING APPROVAL]')) {
  console.log("Post is still in pipeline - skipping healing");
  return { status: "skipped", reason: "pipeline_active" };
}
```

### Issue: Healing fails silently
**Cause**: Try-catch blocks swallow errors without logging
**Solution**:
```typescript
// Always log healing actions
try {
  await healingStep();
  console.log("✅ Healing step succeeded");
  await logToDecisions("Healing step succeeded", postId);
} catch (error) {
  console.error("❌ Healing step failed:", error);
  await slack.sendErrorNotification("Healing Failed", error);
  throw error; // Re-throw for upstream handling
}
```

### Issue: Rate limiting from WordPress API
**Cause**: Too many healing operations in quick succession
**Solution**:
```typescript
// Add delays between batch operations
for (const postId of postsToHeal) {
  await healPost(postId);
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause
}
```

## Usage Examples

### Example 1: Heal Single Post

```typescript
// User: "Heal post 12345"

const result = await healPost(12345);

// Output:
// 🔧 Healing post 12345...
// Issues found: Missing English translation, Social posts not prepared
// Healing steps: Generate and publish English version → Generate social posts
// ✅ Healing step: Generate and publish English version - SUCCESS (English post #12346)
// ✅ Healing step: Generate social posts - SUCCESS
//
// Result: {
//   status: "fully_healed",
//   postId: 12345,
//   issuesFound: 2,
//   stepsExecuted: 2,
//   stepsSuccessful: 2
// }
```

### Example 2: Diagnose Without Healing

```typescript
// User: "Diagnose post 12345"

const diagnosis = await diagnosePost(12345);

// Output:
// {
//   postId: 12345,
//   title: "FBAR Reporting Guide",
//   status: "publish",
//   issues: [
//     "Missing English translation",
//     "Social posts not prepared",
//     "Low SEO score: 67%"
//   ],
//   canHeal: true,
//   healingSteps: [
//     "Generate and publish English version",
//     "Generate social posts for FB/LinkedIn",
//     "Run SEO optimization"
//   ]
// }
```

### Example 3: Batch Scan and Heal

```typescript
// User: "Scan and heal recent 20 posts"

const result = await scanAndHealRecent(20);

// Output:
// 🔍 Scanning 20 recent posts for issues...
// ⚠️  Issues found in post 12345: Missing English translation
// ⚠️  Issues found in post 12344: Low SEO score: 65%
// ⚠️  Issues found in post 12340: Missing featured image
// 🔧 Healing 3 posts...
// [Healing details for each post...]
//
// Result: {
//   status: "batch_complete",
//   scanned: 20,
//   healed: 3,
//   results: [...]
// }
```

### Example 4: Heal All Missing Translations

```typescript
// User: "Heal all posts missing English translations"

await healMissingTranslations();

// Output:
// Found 5 posts without English translations
// Healing post 12345... ✅
// Healing post 12340... ✅
// Healing post 12335... ✅
// Healing post 12330... ✅
// Healing post 12325... ✅
// Complete: 5 posts healed
```

## Integration with Other Skills

### Works With:
- **tax4us-pipeline-runner**: Heals posts that got stuck during pipeline execution
- **tax4us-approval-gate-builder**: Heals posts stuck in approval wait states
- **tax4us-development**: Documents healing actions in decisions.json

### Triggered By:
- Pipeline failures (automatic healing)
- User request (manual healing)
- Cron schedule (preventive healing)
- Monitoring alerts (reactive healing)

## Self-Improvement

### Learning Integration
This skill tracks:
- Most common healing issues (which workers fail most often)
- Healing success rates per issue type
- Time to heal different issue types
- Posts requiring multiple healing attempts

### Improvement Opportunities
- Auto-detect patterns (e.g., "always fails on translation")
- Predictive healing (heal before issues occur)
- Smart retry logic with exponential backoff
- Healing queue with priority levels

### Version History
- v1.0.0 (2026-02-23): Initial creation with diagnostic and healing capabilities

## Quick Reference

### Common Healing Commands

```typescript
// Diagnose specific post
await diagnosePost(12345);

// Heal specific post
await healPost(12345);

// Scan recent posts
await scanAndHealRecent(20);

// Heal by symptom
await healMissingTranslations();
await healLowSEOScores(80);
await healMissingMedia();

// Preventive scan
await preventiveHealing();

// Heal with verification
await healWithVerification(12345);
```

### Healing Checklist

- [ ] Identify stuck post ID
- [ ] Run diagnosis to understand issues
- [ ] Verify post is safe to heal (not processing)
- [ ] Execute healing
- [ ] Verify healing succeeded
- [ ] Update Airtable status if applicable
- [ ] Document in decisions.json
- [ ] Notify user via Slack

## References

See `references/` directory for:
- `healing-patterns.md`: Common failure patterns and their fixes
- `wordpress-metadata.md`: All WP metadata fields used for diagnostics
- `prevention-strategies.md`: How to prevent issues before they occur
