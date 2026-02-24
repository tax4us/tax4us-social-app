#!/usr/bin/env tsx
/**
 * Content Healer - Auto-diagnose and repair stuck Tax4US content
 *
 * Usage:
 *   npx tsx scripts/heal-post.ts <postId>           # Heal specific post
 *   npx tsx scripts/heal-post.ts scan               # Scan recent 10 posts
 *   npx tsx scripts/heal-post.ts scan 20            # Scan recent 20 posts
 *   npx tsx scripts/heal-post.ts missing-english    # Heal all missing translations
 *   npx tsx scripts/heal-post.ts low-seo            # Heal posts with SEO < 80%
 */

import { PipelineOrchestrator } from '../lib/pipeline/orchestrator';
import { WordPressClient } from '../lib/clients/wordpress-client';
import { SlackClient } from '../lib/clients/slack-client';

const wp = new WordPressClient();
const orchestrator = new PipelineOrchestrator();
const slack = new SlackClient();

// ============================================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================================

async function diagnosePost(postId: number) {
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
  const translations = post.translations || {};
  const englishId = translations.en;

  if (!englishId && post.status === 'publish') {
    diagnosis.issues.push("Missing English translation");
    diagnosis.healingSteps.push("Generate and publish English version");
  }

  // Check 3: Is featured media attached?
  if (!post.featured_media && post.status === 'publish') {
    diagnosis.issues.push("Missing featured image");
    diagnosis.healingSteps.push("Generate and upload featured image");
  }

  // Check 4: Is SEO metadata complete?
  const seoScore = post.meta?.rank_math_seo_score;
  if (!seoScore || seoScore < 70) {
    diagnosis.issues.push(`Low/missing SEO score: ${seoScore || 0}%`);
    diagnosis.healingSteps.push("Run SEO optimization");
  }

  return diagnosis;
}

// ============================================================================
// HEALING FUNCTIONS
// ============================================================================

async function healPost(postId: number) {
  console.log(`\n🔍 Diagnosing post ${postId}...`);
  const diagnosis = await diagnosePost(postId);

  if (diagnosis.error) {
    console.log(`❌ ${diagnosis.error}`);
    return { status: "error", error: diagnosis.error };
  }

  if (!diagnosis.canHeal) {
    console.log(`❌ Cannot heal: ${diagnosis.issues[0]}`);
    return { status: "cannot_heal", reason: diagnosis.issues[0] };
  }

  if (diagnosis.issues.length === 0) {
    console.log(`✅ Post is healthy - no healing needed`);
    return { status: "healthy" };
  }

  console.log(`\n⚠️  Issues found:`);
  diagnosis.issues.forEach(issue => console.log(`   - ${issue}`));

  console.log(`\n🔧 Healing steps:`);
  diagnosis.healingSteps.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));

  console.log(`\n🚀 Starting healing process...\n`);

  const healingResults = [];
  const post = await wp.getPost(postId);

  // Execute each healing step
  for (const step of diagnosis.healingSteps) {
    try {
      if (step === "Publish draft to WordPress") {
        console.log("📝 Publishing draft...");
        await wp.updatePost(postId, { status: "publish" });
        healingResults.push({ step, success: true });
        console.log("   ✅ Published");
      }

      if (step === "Generate and publish English version") {
        console.log("🌐 Generating English translation...");

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

        const enCategoryIds = await wp.resolveCategories(
          englishSeoMeta.metadata.categories || ["Business Tax", "English"]
        );
        const enTagIds = await wp.resolveTags(
          englishSeoMeta.metadata.tags || []
        );

        const englishPost = await wp.createPost({
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
        await wp.updatePost(englishPost.id, {}, {
          lang: "en",
          "translations[he]": postId.toString()
        });

        healingResults.push({
          step,
          success: true,
          englishPostId: englishPost.id
        });
        console.log(`   ✅ English post created: ${englishPost.id}`);
      }

      if (step === "Generate and upload featured image") {
        console.log("🎨 Generating featured image...");

        const media = await orchestrator.mediaProcessor.generateAndUploadImage(
          `Professional illustration for tax article: ${post.title.rendered}`,
          post.title.rendered
        );

        await wp.updatePost(postId, {
          featured_media: media.id
        });

        healingResults.push({
          step,
          success: true,
          mediaId: media.id
        });
        console.log(`   ✅ Featured image uploaded: ${media.id}`);
      }

      if (step === "Run SEO optimization") {
        console.log("📊 Running SEO optimization...");

        const enhanced = await orchestrator.contentGenerator.enhanceArticle(
          post.content.rendered,
          post.title.rendered,
          post.meta?.rank_math_focus_keyword || "",
          ["Low SEO score detected during healing"],
          ["Optimize for target keywords and readability"]
        );

        const enhancedCatIds = await wp.resolveCategories(
          enhanced.metadata.categories || []
        );
        const enhancedTagIds = await wp.resolveTags(
          enhanced.metadata.tags || []
        );

        await wp.updatePost(postId, {
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
        console.log(`   ✅ SEO optimized: ${enhanced.seo_score}%`);
      }

    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      healingResults.push({
        step,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = healingResults.filter(r => r.success).length;
  const totalSteps = healingResults.length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Healing Complete: ${successCount}/${totalSteps} steps successful`);
  console.log(`${'='.repeat(60)}\n`);

  // Send Slack notification
  try {
    await slack.sendMessage(
      `🏥 *Content Healed*\n` +
      `*Post:* ${post.title.rendered}\n` +
      `*Post ID:* ${postId}\n` +
      `*Issues Fixed:* ${successCount}/${totalSteps}\n` +
      `*Link:* <https://tax4us.co.il/?p=${postId}|View Post>`
    );
  } catch (e) {
    console.log("(Slack notification skipped - dev mode)");
  }

  return {
    status: successCount === totalSteps ? "fully_healed" : "partially_healed",
    postId,
    issuesFound: diagnosis.issues.length,
    stepsExecuted: totalSteps,
    stepsSuccessful: successCount,
    results: healingResults
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

async function scanAndHeal(limit: number = 10) {
  console.log(`\n🔍 Scanning ${limit} recent posts for issues...\n`);

  const posts = await wp.getPosts({
    per_page: limit.toString(),
    status: 'publish'
  });

  const healingJobs = [];

  for (const post of posts) {
    const diagnosis = await diagnosePost(post.id);

    if (diagnosis.issues.length > 0 && diagnosis.canHeal) {
      console.log(`⚠️  Post ${post.id}: ${diagnosis.issues.join(", ")}`);
      healingJobs.push(post.id);
    }
  }

  if (healingJobs.length === 0) {
    console.log("✅ All posts are healthy!\n");
    return { status: "all_healthy", scanned: posts.length };
  }

  console.log(`\n🔧 Healing ${healingJobs.length} posts...\n`);

  const healingResults = [];
  for (const postId of healingJobs) {
    const result = await healPost(postId);
    healingResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause between heals
  }

  return {
    status: "batch_complete",
    scanned: posts.length,
    healed: healingResults.length,
    results: healingResults
  };
}

async function healMissingEnglish() {
  console.log("\n🔍 Finding posts without English translations...\n");

  const posts = await wp.getPosts({
    per_page: '50',
    status: 'publish'
  });

  const postsNeedingTranslation = posts.filter(post => {
    const translations = post.translations || {};
    return !translations.en;
  });

  console.log(`Found ${postsNeedingTranslation.length} posts without English\n`);

  for (const post of postsNeedingTranslation) {
    await healPost(post.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function healLowSEO(threshold: number = 80) {
  console.log(`\n🔍 Finding posts with SEO score < ${threshold}%...\n`);

  const posts = await wp.getPosts({
    per_page: '50',
    status: 'publish'
  });

  const lowScorePosts = posts.filter(post => {
    const score = post.meta?.rank_math_seo_score || 0;
    return score < threshold;
  });

  console.log(`Found ${lowScorePosts.length} posts with low SEO scores\n`);

  for (const post of lowScorePosts) {
    await healPost(post.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// ============================================================================
// CLI HANDLER
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Usage:
  npx tsx scripts/heal-post.ts <postId>           # Heal specific post
  npx tsx scripts/heal-post.ts scan               # Scan recent 10 posts
  npx tsx scripts/heal-post.ts scan 20            # Scan recent 20 posts
  npx tsx scripts/heal-post.ts missing-english    # Heal all missing translations
  npx tsx scripts/heal-post.ts low-seo            # Heal posts with SEO < 80%
    `);
    process.exit(1);
  }

  if (command === "scan") {
    const limit = parseInt(args[1]) || 10;
    await scanAndHeal(limit);
  } else if (command === "missing-english") {
    await healMissingEnglish();
  } else if (command === "low-seo") {
    const threshold = parseInt(args[1]) || 80;
    await healLowSEO(threshold);
  } else {
    const postId = parseInt(command);
    if (isNaN(postId)) {
      console.error("❌ Invalid post ID:", command);
      process.exit(1);
    }
    await healPost(postId);
  }
}

main().catch(error => {
  console.error("\n❌ Healing failed:", error);
  process.exit(1);
});
